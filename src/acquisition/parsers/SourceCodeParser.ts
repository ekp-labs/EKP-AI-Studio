import { IFormatParser } from './IFormatParser.js';
import { FileMetadata, ParsedContent } from '../types.js';

export class SourceCodeParser implements IFormatParser {
  public parserName = 'SourceCodeParser';

  private static readonly CODE_EXTENSIONS = new Set([
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

  public canParse(extension: string): boolean {
    return SourceCodeParser.CODE_EXTENSIONS.has(extension.toLowerCase());
  }

  public async parse(filePath: string, contentBuffer: Buffer, metadata: FileMetadata): Promise<ParsedContent> {
    const text = contentBuffer.toString('utf8');
    const lines = text.split('\n');
    const title = metadata.filename;
    const ext = metadata.extension.toLowerCase();

    const sections: { title?: string; content: string; startLine: number; endLine: number }[] = [];

    // Language-aware block extraction
    let currentBlockLines: string[] = [];
    let currentStartLine = 1;
    let currentHeader: string | undefined = undefined;

    for (let i = 0; i < lines.length; i++) {
      const lineNum = i + 1;
      const line = lines[i];
      const trimmed = line.trim();

      // Detect logical boundaries (functions, classes, exports, headers)
      const isFunctionOrClass =
        /^(export\s+)?(async\s+)?(function|class|interface|type|enum|def|pub\s+fn|fn|struct|impl)\s+\w+/.test(trimmed) ||
        /^(public|private|protected)\s+(static\s+)?\w+\s+\w+\(/.test(trimmed) ||
        /^(const|let|var)\s+\w+\s*=\s*(async\s*)?\([^)]*\)\s*=>/.test(trimmed);

      if (isFunctionOrClass && currentBlockLines.length > 0) {
        sections.push({
          title: currentHeader || `Block lines ${currentStartLine}-${lineNum - 1}`,
          content: currentBlockLines.join('\n'),
          startLine: currentStartLine,
          endLine: lineNum - 1,
        });
        currentBlockLines = [];
        currentStartLine = lineNum;
        currentHeader = trimmed.substring(0, 60);
      }

      currentBlockLines.push(line);
    }

    if (currentBlockLines.length > 0) {
      sections.push({
        title: currentHeader || `Block lines ${currentStartLine}-${lines.length}`,
        content: currentBlockLines.join('\n'),
        startLine: currentStartLine,
        endLine: lines.length,
      });
    }

    return {
      title,
      content: text,
      format: ext.replace('.', ''),
      parser: this.parserName,
      sections,
      metadata: {
        totalLines: lines.length,
        extension: ext,
      },
    };
  }
}
