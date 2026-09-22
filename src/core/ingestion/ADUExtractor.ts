import { ADU, DocumentRecord, ProvenanceRecord } from '../types.js';
import { MarkdownAST, MarkdownBlock } from './MarkdownAST.js';

export class ADUExtractor {
  public static extractFromDocument(doc: DocumentRecord): ADU[] {
    const blocks = MarkdownAST.parse(doc.content);
    const adus: ADU[] = [];

    blocks.forEach((block, idx) => {
      if (!block.content || block.content.length < 5) return;

      const aduId = `adu_${doc.id}_${idx + 1}`;
      const provenance: ProvenanceRecord = {
        sourceUri: doc.sourceUri,
        sourceTitle: doc.title,
        extractedAt: Date.now(),
        extractionStage: 'ADU_EXTRACTION',
        startLine: block.startLine,
        endLine: block.endLine,
      };

      let aduType = 'CLAIM';
      if (block.type === 'heading') aduType = 'PREMISE_HEADING';
      else if (block.content.includes('must') || block.content.includes('should') || block.content.includes('required')) {
        aduType = 'REQUIREMENT';
      } else if (block.content.includes('because') || block.content.includes('therefore')) {
        aduType = 'REASONING';
      }

      adus.push({
        id: aduId,
        documentId: doc.id,
        content: block.content,
        type: aduType,
        confidence: 0.9,
        startLine: block.startLine,
        endLine: block.endLine,
        provenance,
      });
    });

    return adus;
  }
}
