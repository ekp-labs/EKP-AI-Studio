import fs from 'node:fs';
import path from 'node:path';
import { IngestionConfig, DirectoryConfig, IngestionRecord } from './types.js';

export class IngestionStore {
  private config: IngestionConfig;
  private records: Map<string, IngestionRecord> = new Map(); // path -> record
  private recordsByHash: Map<string, IngestionRecord[]> = new Map(); // hash -> records
  private configPath: string;
  private recordsPath: string;

  constructor(storageDir: string = './data') {
    this.configPath = path.join(storageDir, 'ingestion-config.json');
    this.recordsPath = path.join(storageDir, 'ingestion-records.json');

    this.config = {
      enabled: true,
      directories: [],
      debounceMs: 300,
    };

    this.loadState();
  }

  public loadState(): void {
    try {
      if (fs.existsSync(this.configPath)) {
        const raw = fs.readFileSync(this.configPath, 'utf8');
        this.config = JSON.parse(raw);
      }
    } catch (err: any) {
      console.warn('[IngestionStore] Failed to load config:', err.message);
    }

    try {
      if (fs.existsSync(this.recordsPath)) {
        const raw = fs.readFileSync(this.recordsPath, 'utf8');
        const list: IngestionRecord[] = JSON.parse(raw);
        this.records.clear();
        this.recordsByHash.clear();

        for (const record of list) {
          this.records.set(record.path, record);
          if (record.hash) {
            const arr = this.recordsByHash.get(record.hash) || [];
            arr.push(record);
            this.recordsByHash.set(record.hash, arr);
          }
        }
      }
    } catch (err: any) {
      console.warn('[IngestionStore] Failed to load records:', err.message);
    }
  }

  public saveState(): void {
    try {
      const storageDir = path.dirname(this.configPath);
      if (!fs.existsSync(storageDir)) {
        fs.mkdirSync(storageDir, { recursive: true });
      }

      fs.writeFileSync(this.configPath, JSON.stringify(this.config, null, 2), 'utf8');
      fs.writeFileSync(this.recordsPath, JSON.stringify(Array.from(this.records.values()), null, 2), 'utf8');
    } catch (err: any) {
      console.error('[IngestionStore] Failed to save state:', err.message);
    }
  }

  public getConfig(): IngestionConfig {
    return { ...this.config };
  }

  public updateConfig(newConfig: Partial<IngestionConfig>): IngestionConfig {
    if (newConfig.enabled !== undefined) this.config.enabled = newConfig.enabled;
    if (newConfig.directories !== undefined) this.config.directories = newConfig.directories;
    if (newConfig.debounceMs !== undefined) this.config.debounceMs = newConfig.debounceMs;

    this.saveState();
    return this.getConfig();
  }

  public addAuthorizedDirectory(dir: Omit<DirectoryConfig, 'id'>): DirectoryConfig {
    const id = `dir_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
    const fullPath = fs.existsSync(dir.path) ? fs.realpathSync(dir.path) : path.resolve(dir.path);
    const newDir: DirectoryConfig = {
      id,
      path: fullPath,
      enabled: dir.enabled ?? true,
      recursive: dir.recursive ?? true,
      namespace: dir.namespace || path.basename(fullPath) || 'Default',
    };

    // Replace if already configured for same path
    const existingIdx = this.config.directories.findIndex((d) => d.path === fullPath);
    if (existingIdx >= 0) {
      this.config.directories[existingIdx] = newDir;
    } else {
      this.config.directories.push(newDir);
    }

    this.saveState();
    return newDir;
  }

  public removeAuthorizedDirectory(idOrPath: string): boolean {
    const initialLen = this.config.directories.length;
    this.config.directories = this.config.directories.filter(
      (d) => d.id !== idOrPath && d.path !== path.resolve(idOrPath)
    );
    const removed = this.config.directories.length < initialLen;
    if (removed) {
      this.saveState();
    }
    return removed;
  }

  public saveRecord(record: IngestionRecord): void {
    this.records.set(record.path, record);
    if (record.hash) {
      const arr = this.recordsByHash.get(record.hash) || [];
      const idx = arr.findIndex((r) => r.path === record.path);
      if (idx >= 0) {
        arr[idx] = record;
      } else {
        arr.push(record);
      }
      this.recordsByHash.set(record.hash, arr);
    }
    this.saveState();
  }

  public getRecordByPath(filePath: string): IngestionRecord | undefined {
    return this.records.get(filePath);
  }

  public getRecordsByHash(hash: string): IngestionRecord[] {
    return this.recordsByHash.get(hash) || [];
  }

  public getAllRecords(): IngestionRecord[] {
    return Array.from(this.records.values());
  }

  public clearRecords(): void {
    this.records.clear();
    this.recordsByHash.clear();
    this.saveState();
  }
}
