import path from 'node:path';
import fs from 'node:fs';
import { FileClassification, FileMetadata } from './types.js';

export class FileClassifier {
  private static readonly SUPPORTED_EXTENSIONS = new Set([
    '.md',
    '.markdown',
    '.pdf',
    '.json',
    '.ts',
    '.js',
    '.py',
    '.java',
    '.c',
    '.cpp',
    '.cs',
    '.go',
    '.rs',
    '.html',
    '.css',
    '.sh',
    '.txt',
    '.yaml',
    '.yml',
  ]);

  private static readonly IGNORED_NAMES = new Set([
    'node_modules',
    '.git',
    '.ds_store',
    'dist',
    'build',
    '.next',
    'coverage',
  ]);

  public static isIgnoredPath(targetPath: string): boolean {
    const parts = targetPath.split(path.sep);
    for (const part of parts) {
      if (this.IGNORED_NAMES.has(part.toLowerCase())) {
        return true;
      }
      if (part.startsWith('.') && part !== '.' && part !== '..') {
        return true;
      }
    }
    return false;
  }

  public static classify(filePath: string, rootPath: string, namespace: string): FileMetadata {
    const filename = path.basename(filePath);
    const extension = path.extname(filePath).toLowerCase();
    const relativePath = path.relative(rootPath, filePath);

    if (this.isIgnoredPath(filename) || this.isIgnoredPath(relativePath)) {
      return {
        absolutePath: filePath,
        relativePath,
        rootPath,
        filename,
        extension,
        size: 0,
        mtime: 0,
        classification: 'IGNORED',
        namespace,
      };
    }

    try {
      const stats = fs.statSync(filePath);
      if (!stats.isFile()) {
        return {
          absolutePath: filePath,
          relativePath,
          rootPath,
          filename,
          extension,
          size: stats.size,
          mtime: stats.mtimeMs,
          classification: 'IGNORED',
          namespace,
        };
      }

      if (stats.size === 0) {
        return {
          absolutePath: filePath,
          relativePath,
          rootPath,
          filename,
          extension,
          size: 0,
          mtime: stats.mtimeMs,
          classification: 'EMPTY',
          namespace,
        };
      }

      if (!this.SUPPORTED_EXTENSIONS.has(extension)) {
        return {
          absolutePath: filePath,
          relativePath,
          rootPath,
          filename,
          extension,
          size: stats.size,
          mtime: stats.mtimeMs,
          classification: 'UNSUPPORTED',
          namespace,
        };
      }

      return {
        absolutePath: filePath,
        relativePath,
        rootPath,
        filename,
        extension,
        size: stats.size,
        mtime: stats.mtimeMs,
        classification: 'SUPPORTED',
        namespace,
      };
    } catch (err) {
      return {
        absolutePath: filePath,
        relativePath,
        rootPath,
        filename,
        extension,
        size: 0,
        mtime: 0,
        classification: 'INACCESSIBLE',
        namespace,
      };
    }
  }

  public static isSupportedExtension(ext: string): boolean {
    return this.SUPPORTED_EXTENSIONS.has(ext.toLowerCase());
  }
}
