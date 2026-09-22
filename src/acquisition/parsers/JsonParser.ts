import { IFormatParser } from './IFormatParser.js';
import { FileMetadata, ParsedContent } from '../types.js';

export class JsonParser implements IFormatParser {
  public parserName = 'JsonParser';

  public canParse(extension: string): boolean {
    return extension.toLowerCase() === '.json';
  }

  public async parse(filePath: string, contentBuffer: Buffer, metadata: FileMetadata): Promise<ParsedContent> {
    const rawText = contentBuffer.toString('utf8');
    let parsedJson: any;

    try {
      parsedJson = JSON.parse(rawText);
    } catch (err: any) {
      throw new Error(`[JsonParser] Invalid JSON format in ${metadata.filename}: ${err.message}`);
    }

    const title = metadata.filename.replace(/\.json$/i, '');
    const formatted = JSON.stringify(parsedJson, null, 2);

    const sections: { title?: string; content: string; startLine?: number; endLine?: number }[] = [];

    if (Array.isArray(parsedJson)) {
      parsedJson.forEach((item, index) => {
        sections.push({
          title: `Item [${index}]`,
          content: typeof item === 'object' ? JSON.stringify(item, null, 2) : String(item),
        });
      });
    } else if (typeof parsedJson === 'object' && parsedJson !== null) {
      Object.keys(parsedJson).forEach((key) => {
        const value = parsedJson[key];
        sections.push({
          title: `Key: ${key}`,
          content: typeof value === 'object' ? JSON.stringify(value, null, 2) : String(value),
        });
      });
    } else {
      sections.push({
        title: 'Value',
        content: String(parsedJson),
      });
    }

    return {
      title,
      content: formatted,
      format: 'json',
      parser: this.parserName,
      sections,
      metadata: {
        isJSONArray: Array.isArray(parsedJson),
        topLevelKeys: typeof parsedJson === 'object' && parsedJson !== null ? Object.keys(parsedJson) : [],
      },
    };
  }
}
