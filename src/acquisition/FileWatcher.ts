import fs from 'node:fs';
import path from 'node:path';
import { DirectoryConfig, WatcherStatus } from './types.js';
import { DirectoryScanner } from './DirectoryScanner.js';
import { FileClassifier } from './FileClassifier.js';

export type FileWatcherEventType = 'add' | 'change' | 'delete';

export interface FileWatcherEvent {
  type: FileWatcherEventType;
  filePath: string;
  rootPath: string;
  namespace: string;
}

export class FileWatcher {
  private active = false;
  private watchers: Map<string, fs.FSWatcher> = new Map();
  private pendingEvents: Map<string, { timer: NodeJS.Timeout; event: FileWatcherEvent }> = new Map();
  private debounceMs: number;
  private callback?: (event: FileWatcherEvent) => Promise<void> | void;
  private watchedConfigs: DirectoryConfig[] = [];

  constructor(debounceMs = 300) {
    this.debounceMs = debounceMs;
  }

  public setCallback(cb: (event: FileWatcherEvent) => Promise<void> | void): void {
    this.callback = cb;
  }

  public start(configs: DirectoryConfig[]): void {
    this.stop();
    this.watchedConfigs = configs.filter((c) => c.enabled);
    this.active = true;

    for (const config of this.watchedConfigs) {
      if (!fs.existsSync(config.path)) continue;

      const authCheck = DirectoryScanner.validateAuthorizedPath(config.path, config.path);
      if (!authCheck.valid) {
        console.warn(`[FileWatcher] Skipping unauthorized path '${config.path}': ${authCheck.reason}`);
        continue;
      }

      try {
        const watcher = fs.watch(
          config.path,
          { recursive: config.recursive },
          (eventType, filename) => {
            if (!this.active || !filename) return;

            const fullPath = path.join(config.path, filename.toString());

            // Skip ignored files
            if (FileClassifier.isIgnoredPath(filename.toString())) {
              return;
            }

            // Security check
            const pathCheck = DirectoryScanner.validateAuthorizedPath(fullPath, config.path);
            if (!pathCheck.valid) return;

            const exists = fs.existsSync(fullPath);
            const type: FileWatcherEventType = exists ? 'change' : 'delete';

            this.enqueueEvent({
              type,
              filePath: fullPath,
              rootPath: config.path,
              namespace: config.namespace,
            });
          }
        );

        this.watchers.set(config.path, watcher);
      } catch (err: any) {
        console.error(`[FileWatcher] Error starting watcher on ${config.path}:`, err.message);
      }
    }
  }

  private enqueueEvent(event: FileWatcherEvent): void {
    const key = event.filePath;
    if (this.pendingEvents.has(key)) {
      clearTimeout(this.pendingEvents.get(key)!.timer);
    }

    const timer = setTimeout(async () => {
      this.pendingEvents.delete(key);
      await this.processDebouncedEvent(event);
    }, this.debounceMs);

    this.pendingEvents.set(key, { timer, event });
  }

  private async processDebouncedEvent(event: FileWatcherEvent): Promise<void> {
    if (event.type !== 'delete') {
      // Stability check: ensure file is done being written
      const stable = await this.checkFileStability(event.filePath);
      if (!stable) return;
    }

    if (this.callback) {
      try {
        await this.callback(event);
      } catch (err: any) {
        console.error(`[FileWatcher] Error in watcher callback for ${event.filePath}:`, err.message);
      }
    }
  }

  private async checkFileStability(filePath: string, maxRetries = 3, intervalMs = 100): Promise<boolean> {
    let lastSize = -1;
    let lastMtime = -1;

    for (let i = 0; i < maxRetries; i++) {
      try {
        if (!fs.existsSync(filePath)) return false;
        const stats = fs.statSync(filePath);
        if (stats.size === lastSize && stats.mtimeMs === lastMtime) {
          return true;
        }
        lastSize = stats.size;
        lastMtime = stats.mtimeMs;
        await new Promise((r) => setTimeout(r, intervalMs));
      } catch (err) {
        return false;
      }
    }
    return true;
  }

  public stop(): void {
    this.active = false;
    for (const watcher of this.watchers.values()) {
      watcher.close();
    }
    this.watchers.clear();

    for (const pending of this.pendingEvents.values()) {
      clearTimeout(pending.timer);
    }
    this.pendingEvents.clear();
  }

  public pause(): void {
    this.active = false;
  }

  public resume(): void {
    this.active = true;
  }

  public getStatus(): WatcherStatus {
    return {
      active: this.active,
      watchedRoots: Array.from(this.watchers.keys()),
      pendingEventsCount: this.pendingEvents.size,
    };
  }
}
