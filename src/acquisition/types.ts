export type FileClassification =
  | 'SUPPORTED'
  | 'UNSUPPORTED'
  | 'BINARY'
  | 'EMPTY'
  | 'MALFORMED'
  | 'INACCESSIBLE'
  | 'IGNORED';

export type IngestionStatus =
  | 'DISCOVERED'
  | 'INGESTED'
  | 'DUPLICATE'
  | 'UNCHANGED'
  | 'UNSUPPORTED'
  | 'FAILED'
  | 'SOURCE_DELETED';

export interface DirectoryConfig {
  id: string;
  path: string;
  enabled: boolean;
  recursive: boolean;
  namespace: string;
}

export interface IngestionConfig {
  enabled: boolean;
  directories: DirectoryConfig[];
  debounceMs: number;
}

export interface FileMetadata {
  absolutePath: string;
  relativePath: string;
  rootPath: string;
  filename: string;
  extension: string;
  size: number;
  mtime: number;
  classification: FileClassification;
  hash?: string;
  mimeType?: string;
  namespace: string;
}

export interface IngestionRecord {
  path: string;
  rootPath: string;
  relativePath: string;
  filename: string;
  extension: string;
  hash: string;
  size: number;
  mtime: number;
  classification: FileClassification;
  status: IngestionStatus;
  parserUsed?: string;
  ingestedAt: number;
  documentId?: string;
  namespace: string;
  errorMessage?: string;
  duplicateOfPath?: string;
}

export interface ParsedSection {
  title?: string;
  content: string;
  startLine?: number;
  endLine?: number;
  pageNumber?: number;
}

export interface ParsedContent {
  title: string;
  content: string;
  format: string;
  parser: string;
  pageCount?: number;
  sections?: ParsedSection[];
  metadata?: Record<string, any>;
}

export interface ScanSummary {
  totalDiscovered: number;
  totalSupported: number;
  totalIngested: number;
  totalUnchanged: number;
  totalDuplicated: number;
  totalFailed: number;
  totalUnsupported: number;
  startTime: number;
  endTime: number;
  errors: { path: string; error: string }[];
}

export interface WatcherStatus {
  active: boolean;
  watchedRoots: string[];
  pendingEventsCount: number;
  lastEventTime?: number;
}
