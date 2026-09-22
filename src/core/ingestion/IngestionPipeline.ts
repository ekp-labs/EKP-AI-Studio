/**
 * EKP Ingestion Pipeline Subsystem
 * Orchestrates:
 * Markdown -> Tokenize -> ADU Segmentation -> Provenance Attachment ->
 * Graph Mutation -> KnowledgeLibrary Indexing -> CognitiveMemory -> EventBus.
 */

import {
  IngestedDocument,
  Provenance,
  GraphNodeType,
  GraphEdgeType,
  EventTopic,
} from '../types';
import { MarkdownParser } from './MarkdownParser';
import { ADUSegmenter } from './ADUSegmenter';
import { KnowledgeLibrary } from '../library/KnowledgeLibrary';
import { RuntimeGraph } from '../graph/RuntimeGraph';
import { CognitiveMemory } from '../memory/CognitiveMemory';
import { EventBus } from '../kernel/EventBus';

export interface IngestionOptions {
  title?: string;
  domain?: string;
  sourceUri?: string;
  autoConsolidate?: boolean;
}

export class IngestionPipeline {
  private parser: MarkdownParser;
  private segmenter: ADUSegmenter;
  private library: KnowledgeLibrary;
  private graph: RuntimeGraph;
  private memory?: CognitiveMemory;
  private eventBus?: EventBus;

  constructor(
    library: KnowledgeLibrary,
    graph: RuntimeGraph,
    memory?: CognitiveMemory,
    eventBus?: EventBus
  ) {
    this.parser = new MarkdownParser();
    this.segmenter = new ADUSegmenter();
    this.library = library;
    this.graph = graph;
    this.memory = memory;
    this.eventBus = eventBus;
  }

  public setEventBus(eventBus: EventBus): void {
    this.eventBus = eventBus;
  }

  /**
   * Ingest a raw markdown document into the canonical EKP state model
   */
  public async ingestMarkdown(
    rawMarkdown: string,
    options: IngestionOptions = {}
  ): Promise<IngestedDocument> {
    const docId = `doc_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const domain = options.domain || 'General';
    const sourceUri = options.sourceUri || `doc://${docId}`;

    await this.eventBus?.publish(EventTopic.INGESTION_STARTED, 'IngestionPipeline', {
      documentId: docId,
      domain,
      sourceUri,
      charLength: rawMarkdown.length,
    });

    // Step 1: Parse Markdown blocks
    const parsedDoc = this.parser.parse(rawMarkdown, options.title || 'Untitled Knowledge Document');
    const docTitle = options.title || parsedDoc.title;

    // Step 2: Segment into Atomic Discourse Units (ADUs)
    const adus = this.segmenter.segmentDocument(parsedDoc, docId, sourceUri);

    // Document Provenance
    const docProvenance: Provenance = {
      sourceId: docId,
      sourceType: 'DOCUMENT',
      sourceUri,
      sourceTitle: docTitle,
      extractionStage: 'INGESTION_PIPELINE',
      timestamp: new Date().toISOString(),
      agentOrModel: 'EKP-Canonical-Ingestor-v1',
    };

    const ingestedDoc: IngestedDocument = {
      id: docId,
      title: docTitle,
      sourceUri,
      domain,
      rawContent: rawMarkdown,
      ingestedAt: new Date().toISOString(),
      metadata: {
        totalLines: parsedDoc.totalLines,
        blockCount: parsedDoc.blocks.length,
        domain,
      },
      adus,
      totalADUs: adus.length,
    };

    // Step 3: Mutate RuntimeGraph
    // 3a. Add Document Node
    this.graph.addNode(
      docId,
      GraphNodeType.SOURCE_DOCUMENT,
      docTitle,
      {
        domain,
        sourceUri,
        aduCount: adus.length,
        ingestedAt: ingestedDoc.ingestedAt,
      },
      docProvenance
    );

    // 3b. Add ADU Nodes and EXTRACTED_FROM Edges
    for (const adu of adus) {
      this.graph.addNode(
        adu.id,
        GraphNodeType.ADU,
        `[${adu.type}] ${adu.summary || adu.content.slice(0, 40)}`,
        {
          aduType: adu.type,
          content: adu.content,
          confidence: adu.confidence,
          tags: adu.tags,
          entities: adu.entities,
          lineRange: adu.metadata.lineRange,
        },
        adu.provenance
      );

      this.graph.addEdge(
        adu.id,
        docId,
        GraphEdgeType.EXTRACTED_FROM,
        adu.provenance,
        {
          label: 'Extracted From Source',
        }
      );

      // Connect Concept or Entity nodes if applicable
      for (const entity of adu.entities) {
        const entityNodeId = `entity_${entity.toLowerCase().replace(/[^a-z0-9]/g, '_')}`;
        if (!this.graph.hasNode(entityNodeId)) {
          this.graph.addNode(
            entityNodeId,
            GraphNodeType.ENTITY,
            entity,
            { entityName: entity, domain },
            adu.provenance
          );
        }

        this.graph.addEdge(
          adu.id,
          entityNodeId,
          GraphEdgeType.REFERENCES,
          adu.provenance,
          { label: 'Mentions Entity' }
        );
      }

      await this.eventBus?.publish(EventTopic.INGESTION_ADU_CREATED, 'IngestionPipeline', {
        documentId: docId,
        aduId: adu.id,
        type: adu.type,
        provenance: adu.provenance,
      });
    }

    // Step 4: Index into KnowledgeLibrary
    this.library.storeDocument(ingestedDoc);

    // Step 5: Consolidate high-level concept in CognitiveMemory if requested
    if (options.autoConsolidate !== false && this.memory && adus.length > 0) {
      const topConcepts = adus.filter((a) => a.entities.length > 0);
      if (topConcepts.length > 0) {
        const mainConcept = topConcepts[0].entities[0] || docTitle;
        await this.memory.consolidateADUs(
          mainConcept,
          `Consolidated knowledge regarding ${mainConcept} from ${docTitle}`,
          adus.slice(0, 5),
          domain,
          docProvenance
        );
      }
    }

    await this.eventBus?.publish(EventTopic.INGESTION_COMPLETED, 'IngestionPipeline', {
      documentId: docId,
      title: docTitle,
      totalADUs: adus.length,
      domain,
      provenance: docProvenance,
    });

    return ingestedDoc;
  }
}
