import { FileStorageAdapter, IPersistenceAdapter } from './FileStorageAdapter.js';
import { IRuntimeGraphRepository, IKnowledgeRepository, ICognitiveMemoryRepository, IAgentAuditRepository } from './Repositories.js';
import { GraphNode, GraphEdge, DocumentRecord, ADU } from '../types.js';
import { CognitiveMemoryUnit } from '../memory/CognitiveMemory.js';
import { AuditLogRecord } from '../agent/AgentEngine.js';

export class PersistenceManager implements IRuntimeGraphRepository, IKnowledgeRepository, ICognitiveMemoryRepository, IAgentAuditRepository {
  private adapter: IPersistenceAdapter;

  constructor(adapter?: IPersistenceAdapter) {
    this.adapter = adapter || new FileStorageAdapter();
  }

  // Graph
  public async getNodes(): Promise<GraphNode[]> {
    return (await this.adapter.readJson<GraphNode[]>('graph_nodes')) || [];
  }

  public async getEdges(): Promise<GraphEdge[]> {
    return (await this.adapter.readJson<GraphEdge[]>('graph_edges')) || [];
  }

  public async saveGraph(nodes: GraphNode[], edges: GraphEdge[]): Promise<void> {
    await this.adapter.writeJson('graph_nodes', nodes);
    await this.adapter.writeJson('graph_edges', edges);
  }

  // Knowledge
  public async getDocuments(): Promise<DocumentRecord[]> {
    return (await this.adapter.readJson<DocumentRecord[]>('knowledge_documents')) || [];
  }

  public async getADUs(): Promise<ADU[]> {
    return (await this.adapter.readJson<ADU[]>('knowledge_adus')) || [];
  }

  public async saveKnowledge(documents: DocumentRecord[], adus: ADU[]): Promise<void> {
    await this.adapter.writeJson('knowledge_documents', documents);
    await this.adapter.writeJson('knowledge_adus', adus);
  }

  // Cognitive Memory
  public async getMemoryUnits(): Promise<CognitiveMemoryUnit[]> {
    return (await this.adapter.readJson<CognitiveMemoryUnit[]>('memory_units')) || [];
  }

  public async saveMemoryUnits(units: CognitiveMemoryUnit[]): Promise<void> {
    await this.adapter.writeJson('memory_units', units);
  }

  // Audit Logs
  public async getAuditLogs(): Promise<AuditLogRecord[]> {
    return (await this.adapter.readJson<AuditLogRecord[]>('audit_logs')) || [];
  }

  public async saveAuditLogs(logs: AuditLogRecord[]): Promise<void> {
    await this.adapter.writeJson('audit_logs', logs);
  }
}
