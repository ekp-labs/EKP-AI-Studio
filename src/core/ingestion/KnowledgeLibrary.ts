import { DocumentRecord, ADU, EventTopic, GraphNodeType, GraphEdgeType } from '../types.js';
import { ADUExtractor } from './ADUExtractor.js';
import { EventBus } from '../kernel/EventBus.js';
import { RuntimeGraph } from '../graph/RuntimeGraph.js';

export class KnowledgeLibrary {
  private documents: Map<string, DocumentRecord> = new Map();
  private adus: Map<string, ADU> = new Map();
  private eventBus?: EventBus;
  private graph?: RuntimeGraph;

  constructor(eventBus?: EventBus, graph?: RuntimeGraph) {
    this.eventBus = eventBus;
    this.graph = graph;
  }

  public async addDocument(input: {
    title: string;
    domain: string;
    content: string;
    sourceUri?: string;
  }): Promise<DocumentRecord> {
    // Check if document with same sourceUri already exists
    if (input.sourceUri) {
      const existing = Array.from(this.documents.values()).find((d) => d.sourceUri === input.sourceUri);
      if (existing) {
        existing.title = input.title;
        existing.domain = input.domain;
        existing.content = input.content;
        existing.ingestedAt = Date.now();

        // Update node in graph if present
        if (this.graph) {
          this.graph.updateNode(existing.id, {
            label: existing.title,
            properties: { domain: existing.domain, sourceUri: existing.sourceUri },
          });
        }

        const extractedADUs = ADUExtractor.extractFromDocument(existing);
        for (const adu of extractedADUs) {
          this.adus.set(adu.id, adu);
        }
        return existing;
      }
    }

    const id = `doc_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const doc: DocumentRecord = {
      id,
      title: input.title,
      domain: input.domain,
      content: input.content,
      sourceUri: input.sourceUri || `doc://${input.title.toLowerCase().replace(/\s+/g, '-')}`,
      ingestedAt: Date.now(),
    };

    this.documents.set(doc.id, doc);

    if (this.graph) {
      this.graph.addNode({
        id: doc.id,
        label: doc.title,
        type: GraphNodeType.DOCUMENT,
        properties: { domain: doc.domain, sourceUri: doc.sourceUri },
        provenance: {
          sourceUri: doc.sourceUri,
          sourceTitle: doc.title,
          extractedAt: doc.ingestedAt,
          extractionStage: 'DOCUMENT_INGESTION',
        },
      });
    }

    if (this.eventBus) {
      this.eventBus.publish(EventTopic.DOCUMENT_INGESTED, doc);
    }

    const extractedADUs = ADUExtractor.extractFromDocument(doc);
    for (const adu of extractedADUs) {
      this.adus.set(adu.id, adu);

      if (this.graph) {
        this.graph.addNode({
          id: adu.id,
          label: adu.content.substring(0, 40) + '...',
          type: GraphNodeType.ADU,
          properties: { type: adu.type, confidence: adu.confidence },
          provenance: adu.provenance,
        });

        this.graph.addEdge({
          id: `edge_${adu.id}_${doc.id}`,
          sourceId: adu.id,
          targetId: doc.id,
          type: GraphEdgeType.EXTRACTED_FROM,
          weight: 1.0,
          properties: {},
          provenance: adu.provenance,
        });
      }

      if (this.eventBus) {
        this.eventBus.publish(EventTopic.ADU_EXTRACTED, adu);
      }
    }

    return doc;
  }

  public getDocument(id: string): DocumentRecord | undefined {
    return this.documents.get(id);
  }

  public getAllDocuments(): DocumentRecord[] {
    return Array.from(this.documents.values());
  }

  public getADU(id: string): ADU | undefined {
    return this.adus.get(id);
  }

  public getAllADUs(): ADU[] {
    return Array.from(this.adus.values());
  }

  public clear(): void {
    this.documents.clear();
    this.adus.clear();
  }

  public loadState(documents: DocumentRecord[], adus: ADU[]): void {
    this.clear();
    for (const doc of documents) {
      this.documents.set(doc.id, doc);
    }
    for (const adu of adus) {
      this.adus.set(adu.id, adu);
    }
  }
}
