import fs from 'node:fs';
import path from 'node:path';
import { DirectoryConfig, FileMetadata, ScanSummary } from './types.js';
import { FileClassifier } from './FileClassifier.js';
import { ContentHasher } from './ContentHasher.js';

export class DirectoryScanner {
  public static isRootDrivePath(targetPath: string): boolean {
    const raw = targetPath.trim();
    if (/^[a-zA-Z]:[\\/]*$/.test(raw)) return true;
    if (raw === '/' || raw === '\\') return true;
    const normalized = path.normalize(path.resolve(targetPath));
    const parsed = path.parse(normalized);
    return normalized === parsed.root;
  }

  public static validateAuthorizedPath(targetPath: string, rootPath: string): { valid: boolean; realPath?: string; reason?: string } {
    try {
      const resolvedRoot = path.resolve(rootPath);
      const resolvedTarget = path.resolve(targetPath);

      if (this.isRootDrivePath(rootPath) || this.isRootDrivePath(targetPath) || this.isRootDrivePath(resolvedRoot) || this.isRootDrivePath(resolvedTarget)) {
        return { valid: false, reason: 'Scanning root drive is strictly prohibited for security reasons' };
      }

      // Check relative traversal
      const relative = path.relative(resolvedRoot, resolvedTarget);
      if (relative.startsWith('..') || path.isAbsolute(relative)) {
        return { valid: false, reason: 'Path traverses outside authorized root boundary' };
      }

      // Symlink escape validation
      if (fs.existsSync(resolvedRoot) && fs.existsSync(resolvedTarget)) {
        const realRoot = fs.realpathSync(resolvedRoot);
        const realTarget = fs.realpathSync(resolvedTarget);
        const realRelative = path.relative(realRoot, realTarget);
        if (realRelative.startsWith('..') || path.isAbsolute(realRelative)) {
          return { valid: false, reason: 'Path escapes authorized root via symbolic link' };
        }
        return { valid: true, realPath: realTarget };
      }

      return { valid: true, realPath: resolvedTarget };
    } catch (err: any) {
      return { valid: false, reason: `Path resolution error: ${err.message}` };
    }
  }

  public static async scanDirectory(
    dirConfig: DirectoryConfig,
    onFileDiscovered?: (meta: FileMetadata) => Promise<void> | void
  ): Promise<{ metadataList: FileMetadata[]; summary: ScanSummary }> {
    const startTime = Date.now();
    const metadataList: FileMetadata[] = [];
    const errors: { path: string; error: string }[] = [];

    let totalDiscovered = 0;
    let totalSupported = 0;
    let totalUnsupported = 0;
    let totalFailed = 0;

    const authCheck = this.validateAuthorizedPath(dirConfig.path, dirConfig.path);
    if (!authCheck.valid) {
      throw new Error(`[DirectoryScanner] Invalid authorized directory '${dirConfig.path}': ${authCheck.reason}`);
    }

    const rootPath = path.resolve(dirConfig.path);

    const crawl = async (currentDir: string) => {
      let entries: fs.Dirent[] = [];
      try {
        entries = fs.readdirSync(currentDir, { withFileTypes: true });
      } catch (err: any) {
        errors.push({ path: currentDir, error: `Failed to read directory: ${err.message}` });
        totalFailed++;
        return;
      }

      for (const entry of entries) {
        const fullPath = path.join(currentDir, entry.name);

        // Security check for entry
        const entryCheck = this.validateAuthorizedPath(fullPath, rootPath);
        if (!entryCheck.valid) {
          errors.push({ path: fullPath, error: entryCheck.reason || 'Security validation failed' });
          totalFailed++;
          continue;
        }

        if (entry.isDirectory()) {
          if (dirConfig.recursive && !FileClassifier.isIgnoredPath(entry.name)) {
            await crawl(fullPath);
          }
        } else if (entry.isFile()) {
          totalDiscovered++;
          const meta = FileClassifier.classify(fullPath, rootPath, dirConfig.namespace);

          if (meta.classification === 'SUPPORTED' || meta.classification === 'UNSUPPORTED' || meta.classification === 'EMPTY') {
            try {
              if (meta.classification === 'SUPPORTED') {
                meta.hash = await ContentHasher.hashFile(fullPath);
                totalSupported++;
              } else if (meta.classification === 'UNSUPPORTED') {
                totalUnsupported++;
              }

              metadataList.push(meta);

              if (onFileDiscovered) {
                await onFileDiscovered(meta);
              }
            } catch (err: any) {
              meta.classification = 'INACCESSIBLE';
              errors.push({ path: fullPath, error: `Error hashing or reading file: ${err.message}` });
              totalFailed++;
              metadataList.push(meta);
            }
          } else {
            if (meta.classification === 'INACCESSIBLE') totalFailed++;
            metadataList.push(meta);
          }
        }
      }
    };

    try {
      await crawl(rootPath);
    } catch (err: any) {
      errors.push({ path: rootPath, error: `Directory scan failed: ${err.message}` });
    }

    const endTime = Date.now();

    const summary: ScanSummary = {
      totalDiscovered,
      totalSupported,
      totalIngested: 0,
      totalUnchanged: 0,
      totalDuplicated: 0,
      totalFailed,
      totalUnsupported,
      startTime,
      endTime,
      errors,
    };

    return { metadataList, summary };
  }
}
