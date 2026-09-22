import { GraphNode, GraphEdge, DocumentRecord, ADU } from '../types.js';
import { CognitiveMemoryUnit } from '../memory/CognitiveMemory.js';
import { AuditLogRecord } from '../agent/AgentEngine.js';

export interface IRuntimeGraphRepository {
  getNodes(): Promise<GraphNode[]>;
  getEdges(): Promise<GraphEdge[]>;
  saveGraph(nodes: GraphNode[], edges: GraphEdge[]): Promise<void>;
}

export interface IKnowledgeRepository {
  getDocuments(): Promise<DocumentRecord[]>;
  getADUs(): Promise<ADU[]>;
  saveKnowledge(documents: DocumentRecord[], adus: ADU[]): Promise<void>;
}

export interface ICognitiveMemoryRepository {
  getMemoryUnits(): Promise<CognitiveMemoryUnit[]>;
  saveMemoryUnits(units: CognitiveMemoryUnit[]): Promise<void>;
}

export interface IAgentAuditRepository {
  getAuditLogs(): Promise<AuditLogRecord[]>;
  saveAuditLogs(logs: AuditLogRecord[]): Promise<void>;
}
