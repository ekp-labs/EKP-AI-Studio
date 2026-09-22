/**
 * EKP KnowledgeLibrary Subsystem
 * Domain-agnostic repository for ingested documents, structured ADUs, and entity indices.
 */

import { IngestedDocument, ADU, ADUType } from '../types';

export class KnowledgeLibrary {
  private documents: Map<string, IngestedDocument> = new Map();
  private adus: Map<string, ADU> = new Map();
  private entityIndex: Map<string, Set<string>> = new Map(); // entity.toLowerCase() -> Set<aduId>
  private domainIndex: Map<string, Set<string>> = new Map(); // domain -> Set<documentId>

  /**
   * Register an ingested document with all its associated ADUs
   */
  public storeDocument(doc: IngestedDocument): void {
    this.documents.set(doc.id, doc);

    // Update domain index
    const domainKey = doc.domain.toLowerCase();
    if (!this.domainIndex.has(domainKey)) {
      this.domainIndex.set(domainKey, new Set());
    }
    this.domainIndex.get(domainKey)!.add(doc.id);

    // Index ADUs and entities
    for (const adu of doc.adus) {
      this.adus.set(adu.id, adu);

      for (const entity of adu.entities) {
        const entityKey = entity.toLowerCase();
        if (!this.entityIndex.has(entityKey)) {
          this.entityIndex.set(entityKey, new Set());
        }
        this.entityIndex.get(entityKey)!.add(adu.id);
      }
    }
  }

  public getDocument(id: string): IngestedDocument | undefined {
    return this.documents.get(id);
  }

  public getAllDocuments(): IngestedDocument[] {
    return Array.from(this.documents.values());
  }

  public getADU(id: string): ADU | undefined {
    return this.adus.get(id);
  }

  public getAllADUs(): ADU[] {
    return Array.from(this.adus.values());
  }

  public getADUsByType(type: ADUType): ADU[] {
    return Array.from(this.adus.values()).filter((a) => a.type === type);
  }

  public getADUsByDomain(domain: string): ADU[] {
    const docIds = this.domainIndex.get(domain.toLowerCase()) || new Set();
    const result: ADU[] = [];
    for (const docId of docIds) {
      const doc = this.documents.get(docId);
      if (doc) result.push(...doc.adus);
    }
    return result;
  }

  public findADUsByEntity(entity: string): ADU[] {
    const aduIds = this.entityIndex.get(entity.toLowerCase()) || new Set();
    return Array.from(aduIds)
      .map((id) => this.adus.get(id))
      .filter((a): a is ADU => Boolean(a));
  }

  public getEntityCatalog(): Array<{ entity: string; count: number }> {
    const catalog: Array<{ entity: string; count: number }> = [];
    for (const [entity, set] of this.entityIndex.entries()) {
      catalog.push({ entity, count: set.size });
    }
    return catalog.sort((a, b) => b.count - a.count);
  }

  public getDomains(): string[] {
    return Array.from(this.domainIndex.keys());
  }

  public getStats() {
    return {
      documentCount: this.documents.size,
      aduCount: this.adus.size,
      entityCount: this.entityIndex.size,
      domains: this.getDomains(),
    };
  }

  public clear(): void {
    this.documents.clear();
    this.adus.clear();
    this.entityIndex.clear();
    this.domainIndex.clear();
  }

  public exportState() {
    return {
      documents: this.getAllDocuments(),
    };
  }

  public importState(state: { documents?: IngestedDocument[] }): void {
    this.clear();
    if (state.documents) {
      for (const doc of state.documents) {
        this.storeDocument(doc);
      }
    }
  }
}
