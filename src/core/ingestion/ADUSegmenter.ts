/**
 * EKP ADU Segmenter
 * Deconstructs parsed markdown blocks into Atomic Discourse Units (ADUs).
 * Maintains provenance and applies heuristic and semantic discourse categorization.
 */

import { ADU, ADUType, Provenance } from '../types';
import { ParsedMarkdownBlock, ParsedMarkdownDocument } from './MarkdownParser';

export class ADUSegmenter {
  /**
   * Segment a parsed markdown document into individual Atomic Discourse Units
   */
  public segmentDocument(
    doc: ParsedMarkdownDocument,
    sourceId: string,
    sourceUri?: string
  ): ADU[] {
    const adus: ADU[] = [];
    let sequence = 0;

    for (const block of doc.blocks) {
      sequence++;
      const aduType = this.classifyBlock(block);
      const entities = this.extractEntities(block.content);
      const tags = this.generateTags(block, aduType);

      const provenance: Provenance = {
        sourceId,
        sourceType: 'DOCUMENT',
        sourceUri: sourceUri || `doc://${sourceId}`,
        sourceTitle: doc.title,
        location: {
          startLine: block.startLine,
          endLine: block.endLine,
          sectionHeading: block.sectionHeading,
        },
        extractionStage: 'ADU_SEGMENTATION',
        timestamp: new Date().toISOString(),
        agentOrModel: 'EKP-Canonical-Segmenter-v1',
      };

      const adu: ADU = {
        id: `adu_${sourceId}_${sequence.toString().padStart(3, '0')}`,
        type: aduType,
        content: block.content,
        summary: block.content.length > 90 ? block.content.substring(0, 87) + '...' : block.content,
        confidence: this.calculateConfidence(block, aduType),
        tags,
        provenance,
        entities,
        metadata: {
          blockType: block.type,
          headingLevel: block.level,
          lineRange: `${block.startLine}-${block.endLine}`,
        },
        temporal: {
          observedAt: new Date().toISOString(),
        },
      };

      adus.push(adu);
    }

    return adus;
  }

  /**
   * Heuristic discourse unit classification
   */
  private classifyBlock(block: ParsedMarkdownBlock): ADUType {
    const text = block.content.toLowerCase();

    if (
      text.includes('adr-') ||
      text.includes('architecture decision') ||
      text.includes('decision record') ||
      text.includes('status: accepted') ||
      text.includes('we have decided to')
    ) {
      return ADUType.ADR;
    }

    if (
      text.startsWith('must ') ||
      text.startsWith('shall ') ||
      text.startsWith('cannot ') ||
      text.startsWith('never ') ||
      text.includes('strictly required') ||
      text.includes('invariant') ||
      text.includes('constraint:')
    ) {
      return ADUType.CONSTRAINT;
    }

    if (
      text.startsWith('is defined as') ||
      text.includes(' refers to ') ||
      text.includes(' is a ') ||
      text.includes(' definition:') ||
      (block.type === 'heading' && block.level && block.level >= 3)
    ) {
      return ADUType.DEFINITION;
    }

    if (
      text.startsWith('decided to') ||
      text.startsWith('we chose') ||
      text.startsWith('decision:') ||
      text.includes('resolution:')
    ) {
      return ADUType.DECISION;
    }

    if (
      block.type === 'list_item' &&
      (text.startsWith('step ') ||
        text.startsWith('to ') ||
        text.startsWith('first') ||
        text.startsWith('then') ||
        text.startsWith('run ') ||
        text.startsWith('configure ') ||
        text.startsWith('install ') ||
        text.startsWith('set '))
    ) {
      return ADUType.INSTRUCTION;
    }

    if (
      text.includes('because ') ||
      text.includes('benchmarks show') ||
      text.includes('tested on') ||
      text.includes('data indicates') ||
      text.includes('proof:') ||
      text.includes('evidence:')
    ) {
      return ADUType.EVIDENCE;
    }

    if (block.type === 'heading' && block.level === 1) {
      return ADUType.CONCEPT;
    }

    // Default epistemic statement is a CLAIM
    return ADUType.CLAIM;
  }

  /**
   * Domain-agnostic Entity Extractor (detects Capitalized Phrases, Acronyms, Quoted Terms, and Backticked Code identifiers)
   */
  private extractEntities(text: string): string[] {
    const entities = new Set<string>();

    // Backticked terms e.g. `RuntimeGraph`
    const backticked = text.match(/`([^`]+)`/g);
    if (backticked) {
      backticked.forEach((b) => {
        const cleaned = b.replace(/`/g, '').trim();
        if (cleaned.length > 2) entities.add(cleaned);
      });
    }

    // Quoted terms
    const quoted = text.match(/"([^"]+)"|'([^']+)'/g);
    if (quoted) {
      quoted.forEach((q) => {
        const cleaned = q.replace(/["']/g, '').trim();
        if (cleaned.length > 2 && cleaned.length < 40) entities.add(cleaned);
      });
    }

    // Capitalized terms / Acronyms (e.g., EKP, EventBus, Satin Stitch, Tension)
    const capTerms = text.match(/\b[A-Z][a-zA-Z0-9_-]{2,}\b/g);
    if (capTerms) {
      capTerms.forEach((t) => {
        // Exclude common markdown words
        if (!['The', 'This', 'That', 'When', 'What', 'Where', 'Then', 'From', 'With', 'Under', 'Every'].includes(t)) {
          entities.add(t);
        }
      });
    }

    return Array.from(entities);
  }

  private generateTags(block: ParsedMarkdownBlock, type: ADUType): string[] {
    const tags = new Set<string>([type.toLowerCase(), block.type]);
    if (block.sectionHeading && block.sectionHeading !== 'Document Root') {
      tags.add(block.sectionHeading.toLowerCase().replace(/\s+/g, '-').slice(0, 30));
    }
    return Array.from(tags);
  }

  private calculateConfidence(block: ParsedMarkdownBlock, type: ADUType): number {
    let conf = 0.85;
    if (type === ADUType.ADR || type === ADUType.CONSTRAINT) conf = 0.95;
    if (type === ADUType.DEFINITION) conf = 0.9;
    if (block.content.length < 20) conf = 0.75;
    return conf;
  }
}
