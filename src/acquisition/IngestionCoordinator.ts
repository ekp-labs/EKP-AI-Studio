import fs from 'node:fs';
import path from 'node:path';
import { ClientGateway } from '../core/gateway/ClientGateway.js';
import { EventTopic } from '../core/types.js';
import { DirectoryConfig, IngestionRecord, ScanSummary, WatcherStatus, FileMetadata } from './types.js';
import { DirectoryScanner } from './DirectoryScanner.js';
import { FileWatcher, FileWatcherEvent } from './FileWatcher.js';
import { IngestionStore } from './IngestionStore.js';
import { FormatParserRegistry } from './parsers/FormatParserRegistry.js';
import { ContentHasher } from './ContentHasher.js';
import { FileClassifier } from './FileClassifier.js';

export class IngestionCoordinator {
  private gateway: ClientGateway;
  private store: IngestionStore;
  private parserRegistry: FormatParserRegistry;
  private watcher: FileWatcher;

  constructor(gateway: ClientGateway, storageDir?: string) {
    this.gateway = gateway;
    this.store = new IngestionStore(storageDir);
    this.parserRegistry = new FormatParserRegistry();
    this.watcher = new FileWatcher(this.store.getConfig().debounceMs);

    this.watcher.setCallback(async (event) => {
      await this.handleWatcherEvent(event);
    });
  }

  public getStore(): IngestionStore {
    return this.store;
  }

  public getWatcherStatus(): WatcherStatus {
    return this.watcher.getStatus();
  }

  public async startScan(): Promise<ScanSummary> {
    const config = this.store.getConfig();
    const startTime = Date.now();

    const summary: ScanSummary = {
      totalDiscovered: 0,
      totalSupported: 0,
      totalIngested: 0,
      totalUnchanged: 0,
      totalDuplicated: 0,
      totalFailed: 0,
      totalUnsupported: 0,
      startTime,
      endTime: Date.now(),
      errors: [],
    };

    if (!config.enabled) {
      summary.endTime = Date.now();
      return summary;
    }

    for (const dirConfig of config.directories) {
      if (!dirConfig.enabled || !fs.existsSync(dirConfig.path)) continue;

      try {
        const { metadataList, summary: dirSummary } = await DirectoryScanner.scanDirectory(dirConfig);

        summary.totalDiscovered += dirSummary.totalDiscovered;
        summary.totalSupported += dirSummary.totalSupported;
        summary.totalUnsupported += dirSummary.totalUnsupported;
        summary.totalFailed += dirSummary.totalFailed;
        summary.errors.push(...dirSummary.errors);

        const scannedPaths = new Set<string>();
        for (const meta of metadataList) {
          scannedPaths.add(meta.absolutePath);
          if (meta.classification === 'SUPPORTED') {
            const result = await this.processFile(meta);
            if (result === 'INGESTED') summary.totalIngested++;
            else if (result === 'UNCHANGED') summary.totalUnchanged++;
            else if (result === 'DUPLICATE') summary.totalDuplicated++;
            else if (result === 'FAILED') summary.totalFailed++;
          } else if (meta.classification === 'UNSUPPORTED' || meta.classification === 'EMPTY') {
            this.recordRejectedFile(meta);
          }
        }

        // Detect deleted files previously tracked in this directory root
        const dirRoot = path.resolve(dirConfig.path);
        const existingRecords = this.store
          .getAllRecords()
          .filter((r) => r.rootPath === dirRoot && r.status !== 'SOURCE_DELETED');

        for (const record of existingRecords) {
          if (!scannedPaths.has(record.path) && !fs.existsSync(record.path)) {
            record.status = 'SOURCE_DELETED';
            this.store.saveRecord(record);
            this.gateway.eventBus.publish(EventTopic.FILE_DELETED, record);
          }
        }
      } catch (err: any) {
        summary.errors.push({ path: dirConfig.path, error: err.message });
        summary.totalFailed++;
      }
    }

    summary.endTime = Date.now();
    return summary;
  }

  public async processFile(meta: FileMetadata): Promise<'INGESTED' | 'UNCHANGED' | 'DUPLICATE' | 'FAILED'> {
    this.gateway.eventBus.publish(EventTopic.FILE_DISCOVERED, meta);

    try {
      if (!fs.existsSync(meta.absolutePath)) {
        return 'FAILED';
      }

      const hash = meta.hash || (await ContentHasher.hashFile(meta.absolutePath));
      meta.hash = hash;
      this.gateway.eventBus.publish(EventTopic.FILE_HASHED, { path: meta.absolutePath, hash });

      const existingRecord = this.store.getRecordByPath(meta.absolutePath);

      // 1. Check if Unchanged
      if (
        existingRecord &&
        existingRecord.hash === hash &&
        existingRecord.mtime === meta.mtime &&
        (existingRecord.status === 'INGESTED' || existingRecord.status === 'DUPLICATE')
      ) {
        return 'UNCHANGED';
      }

      // 2. Content Deduplication Check
      const hashMatches = this.store.getRecordsByHash(hash).filter((r) => r.status === 'INGESTED' && r.path !== meta.absolutePath);
      if (hashMatches.length > 0) {
        const primaryRecord = hashMatches[0];
        const record: IngestionRecord = {
          path: meta.absolutePath,
          rootPath: meta.rootPath,
          relativePath: meta.relativePath,
          filename: meta.filename,
          extension: meta.extension,
          hash,
          size: meta.size,
          mtime: meta.mtime,
          classification: meta.classification,
          status: 'DUPLICATE',
          ingestedAt: Date.now(),
          documentId: primaryRecord.documentId,
          duplicateOfPath: primaryRecord.path,
          namespace: meta.namespace,
        };

        this.store.saveRecord(record);
        this.gateway.eventBus.publish(EventTopic.FILE_DUPLICATE, record);
        return 'DUPLICATE';
      }

      // 3. New or Modified Content Ingestion
      const buffer = fs.readFileSync(meta.absolutePath);
      const parsed = await this.parserRegistry.parseFile(meta.absolutePath, buffer, meta);

      const sourceUri = `file://${meta.absolutePath}`;
      const docRecord = await this.gateway.ingestDocument({
        title: parsed.title,
        domain: meta.namespace,
        content: parsed.content,
        sourceUri,
      });

      const record: IngestionRecord = {
        path: meta.absolutePath,
        rootPath: meta.rootPath,
        relativePath: meta.relativePath,
        filename: meta.filename,
        extension: meta.extension,
        hash,
        size: meta.size,
        mtime: meta.mtime,
        classification: meta.classification,
        status: 'INGESTED',
        parserUsed: parsed.parser,
        ingestedAt: Date.now(),
        documentId: docRecord.id,
        namespace: meta.namespace,
      };

      this.store.saveRecord(record);
      this.gateway.eventBus.publish(EventTopic.FILE_INGESTED, record);
      return 'INGESTED';
    } catch (err: any) {
      const record: IngestionRecord = {
        path: meta.absolutePath,
        rootPath: meta.rootPath,
        relativePath: meta.relativePath,
        filename: meta.filename,
        extension: meta.extension,
        hash: meta.hash || '',
        size: meta.size,
        mtime: meta.mtime,
        classification: 'MALFORMED',
        status: 'FAILED',
        ingestedAt: Date.now(),
        errorMessage: err.message,
        namespace: meta.namespace,
      };

      this.store.saveRecord(record);
      this.gateway.eventBus.publish(EventTopic.INGESTION_FAILED, record);
      return 'FAILED';
    }
  }

  private recordRejectedFile(meta: FileMetadata): void {
    const record: IngestionRecord = {
      path: meta.absolutePath,
      rootPath: meta.rootPath,
      relativePath: meta.relativePath,
      filename: meta.filename,
      extension: meta.extension,
      hash: '',
      size: meta.size,
      mtime: meta.mtime,
      classification: meta.classification,
      status: 'UNSUPPORTED',
      ingestedAt: Date.now(),
      namespace: meta.namespace,
    };
    this.store.saveRecord(record);
    this.gateway.eventBus.publish(EventTopic.FILE_REJECTED, record);
  }

  private async handleWatcherEvent(event: FileWatcherEvent): Promise<void> {
    if (event.type === 'delete') {
      const existing = this.store.getRecordByPath(event.filePath);
      if (existing) {
        existing.status = 'SOURCE_DELETED';
        this.store.saveRecord(existing);
        this.gateway.eventBus.publish(EventTopic.FILE_DELETED, existing);
      }
    } else {
      const meta = FileClassifier.classify(event.filePath, event.rootPath, event.namespace);
      if (meta.classification === 'SUPPORTED') {
        await this.processFile(meta);
      }
    }
  }

  public startWatcher(): void {
    const config = this.store.getConfig();
    this.watcher.start(config.directories);
  }

  public stopWatcher(): void {
    this.watcher.stop();
  }

  public pauseWatcher(): void {
    this.watcher.pause();
  }

  public resumeWatcher(): void {
    this.watcher.resume();
  }

  public getAggregateStatus() {
    const records = this.store.getAllRecords();
    const config = this.store.getConfig();
    const watcherStatus = this.watcher.getStatus();

    let ingested = 0;
    let duplicate = 0;
    let unchanged = 0;
    let unsupported = 0;
    let failed = 0;
    let sourceDeleted = 0;

    for (const r of records) {
      if (r.status === 'INGESTED') ingested++;
      else if (r.status === 'DUPLICATE') duplicate++;
      else if (r.status === 'UNCHANGED') unchanged++;
      else if (r.status === 'UNSUPPORTED') unsupported++;
      else if (r.status === 'FAILED') failed++;
      else if (r.status === 'SOURCE_DELETED') sourceDeleted++;
    }

    return {
      enabled: config.enabled,
      authorizedDirectoriesCount: config.directories.length,
      authorizedDirectories: config.directories.map((d) => ({
        id: d.id,
        path: d.path,
        enabled: d.enabled,
        recursive: d.recursive,
        namespace: d.namespace,
      })),
      totalRecordsCount: records.length,
      counts: {
        ingested,
        duplicate,
        unchanged,
        unsupported,
        failed,
        sourceDeleted,
      },
      watcherStatus,
    };
  }
}
