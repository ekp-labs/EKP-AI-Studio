export interface MarkdownBlock {
  type: 'heading' | 'paragraph' | 'list_item' | 'code_block';
  level?: number;
  content: string;
  startLine: number;
  endLine: number;
}

export class MarkdownAST {
  public static parse(content: string): MarkdownBlock[] {
    const lines = content.split('\n');
    const blocks: MarkdownBlock[] = [];
    let currentBlock: MarkdownBlock | null = null;

    for (let index = 0; index < lines.length; index++) {
      const line = lines[index];
      const lineNum = index + 1;
      const trimmed = line.trim();

      if (!trimmed) {
        if (currentBlock) {
          blocks.push(currentBlock);
          currentBlock = null;
        }
        continue;
      }

      if (trimmed.startsWith('#')) {
        if (currentBlock) {
          blocks.push(currentBlock);
        }
        const level = (trimmed.match(/^#+/) || ['#'])[0].length;
        blocks.push({
          type: 'heading',
          level,
          content: trimmed.replace(/^#+\s*/, ''),
          startLine: lineNum,
          endLine: lineNum,
        });
        currentBlock = null;
      } else if (trimmed.startsWith('- ') || trimmed.startsWith('* ') || /^\d+\.\s/.test(trimmed)) {
        if (currentBlock) {
          blocks.push(currentBlock);
        }
        blocks.push({
          type: 'list_item',
          content: trimmed.replace(/^[-*]\s+|\d+\.\s+/, ''),
          startLine: lineNum,
          endLine: lineNum,
        });
        currentBlock = null;
      } else {
        if (!currentBlock) {
          currentBlock = {
            type: 'paragraph',
            content: trimmed,
            startLine: lineNum,
            endLine: lineNum,
          };
        } else {
          currentBlock.content += ' ' + trimmed;
          currentBlock.endLine = lineNum;
        }
      }
    }

    if (currentBlock) {
      blocks.push(currentBlock);
    }

    return blocks;
  }
}
