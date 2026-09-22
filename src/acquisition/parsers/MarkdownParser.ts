import { IFormatParser } from './IFormatParser.js';
import { FileMetadata, ParsedContent } from '../types.js';
import { MarkdownAST } from '../../core/ingestion/MarkdownAST.js';

export class MarkdownParser implements IFormatParser {
  public parserName = 'MarkdownParser';

  public canParse(extension: string): boolean {
    const ext = extension.toLowerCase();
    return ext === '.md' || ext === '.markdown';
  }

  public async parse(filePath: string, contentBuffer: Buffer, metadata: FileMetadata): Promise<ParsedContent> {
    const text = contentBuffer.toString('utf8');
    const blocks = MarkdownAST.parse(text);

    const title = metadata.filename.replace(/\.(md|markdown)$/i, '');
    const sections = blocks.map((b) => ({
      title: b.type === 'heading' ? b.content : undefined,
      content: b.content,
      startLine: b.startLine,
      endLine: b.endLine,
    }));

    return {
      title,
      content: text,
      format: 'markdown',
      parser: this.parserName,
      sections,
    };
  }
}
