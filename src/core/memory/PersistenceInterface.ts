/**
 * EKP Persistence Interfaces
 * Abstracts state and memory persistence behind swappable storage adapters.
 */

import { IngestedDocument, ConsolidatedKnowledgeUnit, GraphSnapshot, AuditLogEntry } from '../types';

export interface EKPStorageAdapter {
  saveDocument(doc: IngestedDocument): Promise<void>;
  getDocument(id: string): Promise<IngestedDocument | null>;
  getAllDocuments(): Promise<IngestedDocument[]>;

  saveConsolidatedUnit(unit: ConsolidatedKnowledgeUnit): Promise<void>;
  getConsolidatedUnit(id: string): Promise<ConsolidatedKnowledgeUnit | null>;
  getAllConsolidatedUnits(): Promise<ConsolidatedKnowledgeUnit[]>;

  saveSnapshot(snapshot: GraphSnapshot): Promise<void>;
  getAllSnapshots(): Promise<GraphSnapshot[]>;

  saveAuditEntry(entry: AuditLogEntry): Promise<void>;
  getAuditLogs(limit?: number): Promise<AuditLogEntry[]>;
}

/**
 * In-Memory default storage adapter for the canonical MVP
 */
export class InMemoryStorageAdapter implements EKPStorageAdapter {
  private documents: Map<string, IngestedDocument> = new Map();
  private consolidatedUnits: Map<string, ConsolidatedKnowledgeUnit> = new Map();
  private snapshots: GraphSnapshot[] = [];
  private auditLogs: AuditLogEntry[] = [];

  public async saveDocument(doc: IngestedDocument): Promise<void> {
    this.documents.set(doc.id, doc);
  }

  public async getDocument(id: string): Promise<IngestedDocument | null> {
    return this.documents.get(id) || null;
  }

  public async getAllDocuments(): Promise<IngestedDocument[]> {
    return Array.from(this.documents.values());
  }

  public async saveConsolidatedUnit(unit: ConsolidatedKnowledgeUnit): Promise<void> {
    this.consolidatedUnits.set(unit.id, unit);
  }

  public async getConsolidatedUnit(id: string): Promise<ConsolidatedKnowledgeUnit | null> {
    return this.consolidatedUnits.get(id) || null;
  }

  public async getAllConsolidatedUnits(): Promise<ConsolidatedKnowledgeUnit[]> {
    return Array.from(this.consolidatedUnits.values());
  }

  public async saveSnapshot(snapshot: GraphSnapshot): Promise<void> {
    this.snapshots.push(snapshot);
  }

  public async getAllSnapshots(): Promise<GraphSnapshot[]> {
    return [...this.snapshots];
  }

  public async saveAuditEntry(entry: AuditLogEntry): Promise<void> {
    this.auditLogs.unshift(entry);
    if (this.auditLogs.length > 1000) {
      this.auditLogs.pop();
    }
  }

  public async getAuditLogs(limit = 100): Promise<AuditLogEntry[]> {
    return this.auditLogs.slice(0, limit);
  }
}

import { IPersistenceAdapter } from '../persistence/IPersistenceAdapter';

export class PersistentEKPStorageAdapter implements EKPStorageAdapter {
  private adapter: IPersistenceAdapter;
  private documents: Map<string, IngestedDocument> = new Map();
  private consolidatedUnits: Map<string, ConsolidatedKnowledgeUnit> = new Map();
  private snapshots: GraphSnapshot[] = [];
  private auditLogs: AuditLogEntry[] = [];
  private initialized = false;

  constructor(adapter: IPersistenceAdapter) {
    this.adapter = adapter;
  }

  public async init(): Promise<void> {
    if (this.initialized) return;
    const docs = await this.adapter.read<IngestedDocument[]>('memory_documents');
    if (docs) {
      for (const d of docs) this.documents.set(d.id, d);
    }
    const units = await this.adapter.read<ConsolidatedKnowledgeUnit[]>('cognitive_memory');
    if (units) {
      for (const u of units) this.consolidatedUnits.set(u.id, u);
    }
    const snaps = await this.adapter.read<GraphSnapshot[]>('snapshots');
    if (snaps) this.snapshots = snaps;
    const audits = await this.adapter.read<AuditLogEntry[]>('audit_logs');
    if (audits) this.auditLogs = audits;
    this.initialized = true;
  }

  public async saveDocument(doc: IngestedDocument): Promise<void> {
    await this.init();
    this.documents.set(doc.id, doc);
    await this.adapter.write('memory_documents', Array.from(this.documents.values()));
  }

  public async getDocument(id: string): Promise<IngestedDocument | null> {
    await this.init();
    return this.documents.get(id) || null;
  }

  public async getAllDocuments(): Promise<IngestedDocument[]> {
    await this.init();
    return Array.from(this.documents.values());
  }

  public async saveConsolidatedUnit(unit: ConsolidatedKnowledgeUnit): Promise<void> {
    await this.init();
    this.consolidatedUnits.set(unit.id, unit);
    await this.adapter.write('cognitive_memory', Array.from(this.consolidatedUnits.values()));
  }

  public async getConsolidatedUnit(id: string): Promise<ConsolidatedKnowledgeUnit | null> {
    await this.init();
    return this.consolidatedUnits.get(id) || null;
  }

  public async getAllConsolidatedUnits(): Promise<ConsolidatedKnowledgeUnit[]> {
    await this.init();
    return Array.from(this.consolidatedUnits.values());
  }

  public async saveSnapshot(snapshot: GraphSnapshot): Promise<void> {
    await this.init();
    this.snapshots.push(snapshot);
    await this.adapter.write('snapshots', this.snapshots);
  }

  public async getAllSnapshots(): Promise<GraphSnapshot[]> {
    await this.init();
    return [...this.snapshots];
  }

  public async saveAuditEntry(entry: AuditLogEntry): Promise<void> {
    await this.init();
    this.auditLogs.unshift(entry);
    if (this.auditLogs.length > 1000) this.auditLogs.pop();
    await this.adapter.write('audit_logs', this.auditLogs);
  }

  public async getAuditLogs(limit = 100): Promise<AuditLogEntry[]> {
    await this.init();
    return this.auditLogs.slice(0, limit);
  }
}
