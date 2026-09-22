import { EventBus } from '../kernel/EventBus.js';
import { RuntimeGraph } from '../graph/RuntimeGraph.js';
import { GraphQueries } from '../graph/GraphQueries.js';
import { KnowledgeLibrary } from '../ingestion/KnowledgeLibrary.js';
import { KnowledgeRetrieval } from '../retrieval/KnowledgeRetrieval.js';
import { CognitiveMemory } from '../memory/CognitiveMemory.js';
import { LLMReasoning } from '../reasoning/LLMReasoning.js';
import { AgentEngine } from '../agent/AgentEngine.js';
import { PersistenceManager } from '../persistence/PersistenceManager.js';
import { IPersistenceAdapter } from '../persistence/FileStorageAdapter.js';
import { SystemStatus, Intention, DocumentRecord } from '../types.js';
import { IngestionCoordinator } from '../../acquisition/IngestionCoordinator.js';

export interface ClientGatewayConfig {
  persistenceAdapter?: IPersistenceAdapter;
  autoPersist?: boolean;
  storageDir?: string;
}

export class ClientGateway {
  public readonly eventBus: EventBus;
  public readonly graph: RuntimeGraph;
  public readonly queries: GraphQueries;
  public readonly library: KnowledgeLibrary;
  public readonly retrieval: KnowledgeRetrieval;
  public readonly memory: CognitiveMemory;
  public readonly reasoning: LLMReasoning;
  public readonly agent: AgentEngine;
  public readonly persistence: PersistenceManager;
  public readonly acquisition: IngestionCoordinator;

  private autoPersist: boolean;
  private currentIntentions: Map<string, Intention> = new Map();

  constructor(config: ClientGatewayConfig = {}) {
    this.eventBus = new EventBus();
    this.graph = new RuntimeGraph(this.eventBus);
    this.queries = new GraphQueries(this.graph);
    this.library = new KnowledgeLibrary(this.eventBus, this.graph);
    this.retrieval = new KnowledgeRetrieval(this.library);
    this.memory = new CognitiveMemory(this.eventBus);
    this.reasoning = new LLMReasoning(this.retrieval, this.eventBus);
    this.agent = new AgentEngine(this.graph, this.eventBus);
    this.persistence = new PersistenceManager(config.persistenceAdapter);
    this.autoPersist = config.autoPersist ?? true;
    this.acquisition = new IngestionCoordinator(this, config.storageDir);
  }

  public async ingestDocument(input: {
    title: string;
    domain: string;
    content: string;
    sourceUri?: string;
  }): Promise<DocumentRecord> {
    const doc = await this.library.addDocument(input);
    if (this.autoPersist) {
      await this.saveToPersistence();
    }
    return doc;
  }

  public async submitReasoningTask(input: {
    prompt: string;
    domain?: string;
  }) {
    const result = await this.reasoning.reason(input.prompt, input.domain);
    this.currentIntentions.set(result.intention.id, result.intention);
    if (this.autoPersist) {
      await this.saveToPersistence();
    }
    return result;
  }

  public async processActionApproval(input: {
    intentionId: string;
    actionId: string;
    approved: boolean;
    reviewerNotes?: string;
  }) {
    const intention = this.currentIntentions.get(input.intentionId);
    if (!intention) {
      throw new Error(`[ClientGateway] Intention ${input.intentionId} not found`);
    }

    const actionResult = await this.agent.processApproval(
      intention,
      input.actionId,
      input.approved,
      input.reviewerNotes
    );

    if (this.autoPersist) {
      await this.saveToPersistence();
    }

    return actionResult;
  }

  public async saveToPersistence(): Promise<void> {
    await this.persistence.saveGraph(this.graph.getAllNodes(), this.graph.getAllEdges());
    await this.persistence.saveKnowledge(this.library.getAllDocuments(), this.library.getAllADUs());
    await this.persistence.saveMemoryUnits(this.memory.getAllUnits());
    await this.persistence.saveAuditLogs(this.agent.getAuditLogs());
  }

  public async loadFromPersistence(): Promise<void> {
    const nodes = await this.persistence.getNodes();
    const edges = await this.persistence.getEdges();
    this.graph.loadState(nodes, edges);

    const docs = await this.persistence.getDocuments();
    const adus = await this.persistence.getADUs();
    this.library.loadState(docs, adus);

    const units = await this.persistence.getMemoryUnits();
    this.memory.loadState(units);

    const logs = await this.persistence.getAuditLogs();
    this.agent.loadState(logs);
  }

  public getSystemStatus(): SystemStatus {
    const docs = this.library.getAllDocuments();
    const domains = new Set(docs.map((d) => d.domain));

    return {
      domainsCount: domains.size,
      documentsCount: docs.length,
      adusCount: this.library.getAllADUs().length,
      nodesCount: this.graph.getAllNodes().length,
      edgesCount: this.graph.getAllEdges().length,
      intentionsCount: this.currentIntentions.size,
      auditLogsCount: this.agent.getAuditLogs().length,
      lastUpdated: Date.now(),
    };
  }
}
