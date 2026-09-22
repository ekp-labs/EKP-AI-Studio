export enum GraphNodeType {
  DOCUMENT = 'DOCUMENT',
  ADU = 'ADU',
  CONCEPT = 'CONCEPT',
  INTENTION = 'INTENTION',
  ACTION = 'ACTION',
  RESULT = 'RESULT',
}

export enum GraphEdgeType {
  EXTRACTED_FROM = 'EXTRACTED_FROM',
  SUBSTANTIATES = 'SUBSTANTIATES',
  CONTRADICTS = 'CONTRADICTS',
  SUPERSEDES = 'SUPERSEDES',
  PROPOSES = 'PROPOSES',
  EXECUTES = 'EXECUTES',
  PRODUCES = 'PRODUCES',
}

export enum EpistemicStatus {
  UNSUBSTANTIATED = 'UNSUBSTANTIATED',
  CORROBORATED = 'CORROBORATED',
  CONTRADICTED = 'CONTRADICTED',
  SUPERSEDED = 'SUPERSEDED',
}

export enum IntentionStatus {
  DRAFT = 'DRAFT',
  VALIDATED = 'VALIDATED',
  AWAITING_APPROVAL = 'AWAITING_APPROVAL',
  APPROVED = 'APPROVED',
  REJECTED = 'REJECTED',
  EXECUTED = 'EXECUTED',
  FAILED = 'FAILED',
}

export enum EventTopic {
  DOCUMENT_INGESTED = 'DOCUMENT_INGESTED',
  ADU_EXTRACTED = 'ADU_EXTRACTED',
  NODE_CREATED = 'NODE_CREATED',
  EDGE_CREATED = 'EDGE_CREATED',
  INTENTION_FORMULATED = 'INTENTION_FORMULATED',
  ACTION_PROPOSED = 'ACTION_PROPOSED',
  ACTION_APPROVED = 'ACTION_APPROVED',
  ACTION_EXECUTED = 'ACTION_EXECUTED',
  EPISTEMIC_STATUS_CHANGED = 'EPISTEMIC_STATUS_CHANGED',
  FILE_DISCOVERED = 'FILE_DISCOVERED',
  FILE_CHANGED = 'FILE_CHANGED',
  FILE_HASHED = 'FILE_HASHED',
  FILE_DUPLICATE = 'FILE_DUPLICATE',
  FILE_INGESTED = 'FILE_INGESTED',
  FILE_REJECTED = 'FILE_REJECTED',
  FILE_DELETED = 'FILE_DELETED',
  INGESTION_FAILED = 'INGESTION_FAILED',
}

export interface ProvenanceRecord {
  sourceUri: string;
  sourceTitle: string;
  extractedAt: number;
  extractionStage: string;
  startLine?: number;
  endLine?: number;
}

export interface GraphNode {
  id: string;
  label: string;
  type: GraphNodeType;
  properties: Record<string, any>;
  version: number;
  createdAt: number;
  updatedAt: number;
  provenance?: ProvenanceRecord;
  epistemicStatus?: EpistemicStatus;
}

export interface GraphEdge {
  id: string;
  sourceId: string;
  targetId: string;
  type: GraphEdgeType;
  weight: number;
  properties: Record<string, any>;
  createdAt: number;
  provenance?: ProvenanceRecord;
}

export interface ADU {
  id: string;
  documentId: string;
  content: string;
  type: string;
  confidence: number;
  startLine: number;
  endLine: number;
  provenance: ProvenanceRecord;
}

export interface DocumentRecord {
  id: string;
  title: string;
  domain: string;
  sourceUri: string;
  content: string;
  ingestedAt: number;
}

export interface ProposedAction {
  id: string;
  toolName: string;
  parameters: Record<string, any>;
  safetyAnalysis: string;
  isConsequential: boolean;
  justification: string;
}

export interface CognitiveAnalysis {
  problemDecomposition: string[];
  epistemicGrounding: string[];
  assumptions: string[];
  confidenceAssessment: number;
  conclusion: string;
}

export interface Intention {
  id: string;
  taskId: string;
  domain: string;
  cognitiveAnalysis: CognitiveAnalysis;
  proposedActions: ProposedAction[];
  status: IntentionStatus;
  createdAt: number;
  updatedAt: number;
}

export interface ActionApprovalRequest {
  intentionId: string;
  actionId: string;
  approved: boolean;
  reviewerNotes?: string;
}

export interface SystemStatus {
  domainsCount: number;
  documentsCount: number;
  adusCount: number;
  nodesCount: number;
  edgesCount: number;
  intentionsCount: number;
  auditLogsCount: number;
  lastUpdated: number;
}
