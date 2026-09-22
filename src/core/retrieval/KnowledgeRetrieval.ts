import { KnowledgeLibrary } from '../ingestion/KnowledgeLibrary.js';
import { ADU, ProvenanceRecord } from '../types.js';

export interface RetrievedContextItem {
  adu: ADU;
  relevanceScore: number;
}

export interface RetrievedContext {
  query: string;
  domain?: string;
  items: RetrievedContextItem[];
}

export class KnowledgeRetrieval {
  private library: KnowledgeLibrary;

  constructor(library: KnowledgeLibrary) {
    this.library = library;
  }

  public retrieve(query: string, domain?: string, maxResults = 5): RetrievedContext {
    const adus = this.library.getAllADUs();
    const queryTerms = query.toLowerCase().split(/\s+/).filter((t) => t.length > 2);

    const scored: RetrievedContextItem[] = adus.map((adu) => {
      let score = 0;
      const contentLower = adu.content.toLowerCase();

      for (const term of queryTerms) {
        if (contentLower.includes(term)) {
          score += 0.3;
        }
      }

      if (domain && adu.provenance.sourceTitle.toLowerCase().includes(domain.toLowerCase())) {
        score += 0.2;
      }

      score += adu.confidence * 0.2;

      return {
        adu,
        relevanceScore: Math.min(1.0, score),
      };
    });

    scored.sort((a, b) => b.relevanceScore - a.relevanceScore);
    const topItems = scored.filter((item) => item.relevanceScore > 0.1).slice(0, maxResults);

    return {
      query,
      domain,
      items: topItems.length > 0 ? topItems : scored.slice(0, Math.min(2, scored.length)),
    };
  }
}
