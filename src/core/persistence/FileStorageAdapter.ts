import fs from 'fs';
import path from 'path';

export interface IPersistenceAdapter {
  readJson<T>(key: string): Promise<T | null>;
  writeJson<T>(key: string, data: T): Promise<void>;
}

export class FileStorageAdapter implements IPersistenceAdapter {
  private dataDir: string;

  constructor(dataDir = './data') {
    this.dataDir = path.resolve(process.cwd(), dataDir);
    if (!fs.existsSync(this.dataDir)) {
      fs.mkdirSync(this.dataDir, { recursive: true });
    }
  }

  public async readJson<T>(key: string): Promise<T | null> {
    const filePath = path.join(this.dataDir, `${key}.json`);
    if (!fs.existsSync(filePath)) {
      return null;
    }
    try {
      const raw = fs.readFileSync(filePath, 'utf-8');
      return JSON.parse(raw) as T;
    } catch (err) {
      console.error(`[FileStorageAdapter] Failed to read file ${filePath}:`, err);
      return null;
    }
  }

  public async writeJson<T>(key: string, data: T): Promise<void> {
    const filePath = path.join(this.dataDir, `${key}.json`);
    const tempPath = `${filePath}.tmp_${Date.now()}`;
    try {
      fs.writeFileSync(tempPath, JSON.stringify(data, null, 2), 'utf-8');
      fs.renameSync(tempPath, filePath);
    } catch (err) {
      if (fs.existsSync(tempPath)) {
        fs.unlinkSync(tempPath);
      }
      throw err;
    }
  }
}
