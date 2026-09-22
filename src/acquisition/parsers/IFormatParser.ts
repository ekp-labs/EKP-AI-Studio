import { FileMetadata, ParsedContent } from '../types.js';

export interface IFormatParser {
  parserName: string;
  canParse(extension: string): boolean;
  parse(filePath: string, contentBuffer: Buffer, metadata: FileMetadata): Promise<ParsedContent>;
}
