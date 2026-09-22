/**
 * EKP Markdown Parser
 * Parses markdown into structured AST blocks with line locations and semantic section headings.
 */

export interface ParsedMarkdownBlock {
  type: 'heading' | 'paragraph' | 'list_item' | 'code_block' | 'blockquote' | 'table';
  content: string;
  level?: number; // For headings (1-6)
  startLine: number;
  endLine: number;
  sectionHeading: string;
}

export interface ParsedMarkdownDocument {
  title: string;
  blocks: ParsedMarkdownBlock[];
  rawContent: string;
  totalLines: number;
}

export class MarkdownParser {
  /**
   * Parse a raw Markdown string into structured blocks with precise line numbers and section context
   */
  public parse(content: string, fallbackTitle = 'Untitled Document'): ParsedMarkdownDocument {
    const lines = content.split(/\r?\n/);
    const blocks: ParsedMarkdownBlock[] = [];
    let currentHeading = 'Document Root';
    let docTitle = fallbackTitle;

    let inCodeBlock = false;
    let codeBlockStart = 0;
    let codeBlockContent: string[] = [];

    for (let i = 0; i < lines.length; i++) {
      const lineNum = i + 1;
      const line = lines[i];
      const trimmed = line.trim();

      // Handle Code blocks
      if (trimmed.startsWith('```')) {
        if (!inCodeBlock) {
          inCodeBlock = true;
          codeBlockStart = lineNum;
          codeBlockContent = [];
        } else {
          inCodeBlock = false;
          blocks.push({
            type: 'code_block',
            content: codeBlockContent.join('\n'),
            startLine: codeBlockStart,
            endLine: lineNum,
            sectionHeading: currentHeading,
          });
        }
        continue;
      }

      if (inCodeBlock) {
        codeBlockContent.push(line);
        continue;
      }

      if (!trimmed) {
        continue;
      }

      // Check Heading
      const headingMatch = trimmed.match(/^(#{1,6})\s+(.+)$/);
      if (headingMatch) {
        const level = headingMatch[1].length;
        const text = headingMatch[2].trim();
        currentHeading = text;

        if (level === 1 && docTitle === fallbackTitle) {
          docTitle = text;
        }

        blocks.push({
          type: 'heading',
          content: text,
          level,
          startLine: lineNum,
          endLine: lineNum,
          sectionHeading: currentHeading,
        });
        continue;
      }

      // Check List items
      const listMatch = trimmed.match(/^[-*+]\s+(.+)$/) || trimmed.match(/^\d+\.\s+(.+)$/);
      if (listMatch) {
        blocks.push({
          type: 'list_item',
          content: listMatch[1].trim(),
          startLine: lineNum,
          endLine: lineNum,
          sectionHeading: currentHeading,
        });
        continue;
      }

      // Check Blockquote
      if (trimmed.startsWith('>')) {
        blocks.push({
          type: 'blockquote',
          content: trimmed.replace(/^>\s*/, '').trim(),
          startLine: lineNum,
          endLine: lineNum,
          sectionHeading: currentHeading,
        });
        continue;
      }

      // General Paragraph
      blocks.push({
        type: 'paragraph',
        content: trimmed,
        startLine: lineNum,
        endLine: lineNum,
        sectionHeading: currentHeading,
      });
    }

    return {
      title: docTitle,
      blocks,
      rawContent: content,
      totalLines: lines.length,
    };
  }
}
