import { IFormatParser } from './IFormatParser.js';
import { MarkdownParser } from './MarkdownParser.js';
import { PdfParser } from './PdfParser.js';
import { JsonParser } from './JsonParser.js';
import { SourceCodeParser } from './SourceCodeParser.js';
import { FileMetadata, ParsedContent } from '../types.js';

export class FormatParserRegistry {
  private parsers: IFormatParser[] = [];

  constructor() {
    // Register canonical parsers in priority order
    this.parsers.push(new MarkdownParser());
    this.parsers.push(new PdfParser());
    this.parsers.push(new JsonParser());
    this.parsers.push(new SourceCodeParser());
  }

  public registerParser(parser: IFormatParser): void {
    this.parsers.unshift(parser); // New parsers take priority
  }

  public getParserForExtension(extension: string): IFormatParser | undefined {
    return this.parsers.find((p) => p.canParse(extension));
  }

  public async parseFile(filePath: string, contentBuffer: Buffer, metadata: FileMetadata): Promise<ParsedContent> {
    const parser = this.getParserForExtension(metadata.extension);
    if (!parser) {
      throw new Error(`[FormatParserRegistry] No supported parser registered for extension ${metadata.extension}`);
    }
    return parser.parse(filePath, contentBuffer, metadata);
  }
}
