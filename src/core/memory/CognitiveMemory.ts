import { EpistemicStatus, EventTopic } from '../types.js';
import { EventBus } from '../kernel/EventBus.js';

export interface CognitiveMemoryUnit {
  id: string;
  concept: string;
  status: EpistemicStatus;
  supportingAduIds: string[];
  contradictingAduIds: string[];
  confidence: number;
  lastAssessedAt: number;
}

export class CognitiveMemory {
  private units: Map<string, CognitiveMemoryUnit> = new Map();
  private eventBus?: EventBus;

  constructor(eventBus?: EventBus) {
    this.eventBus = eventBus;
  }

  public registerUnit(concept: string, supportingAduIds: string[] = []): CognitiveMemoryUnit {
    const id = `mem_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const unit: CognitiveMemoryUnit = {
      id,
      concept,
      status: supportingAduIds.length > 0 ? EpistemicStatus.CORROBORATED : EpistemicStatus.UNSUBSTANTIATED,
      supportingAduIds,
      contradictingAduIds: [],
      confidence: supportingAduIds.length > 0 ? 0.85 : 0.5,
      lastAssessedAt: Date.now(),
    };

    this.units.set(id, unit);
    return unit;
  }

  public updateEpistemicStatus(id: string, newStatus: EpistemicStatus): CognitiveMemoryUnit {
    const existing = this.units.get(id);
    if (!existing) {
      throw new Error(`[CognitiveMemory] Memory unit ${id} not found`);
    }

    const updated: CognitiveMemoryUnit = {
      ...existing,
      status: newStatus,
      lastAssessedAt: Date.now(),
    };

    this.units.set(id, updated);
    if (this.eventBus) {
      this.eventBus.publish(EventTopic.EPISTEMIC_STATUS_CHANGED, updated);
    }
    return updated;
  }

  public getAllUnits(): CognitiveMemoryUnit[] {
    return Array.from(this.units.values());
  }

  public clear(): void {
    this.units.clear();
  }

  public loadState(units: CognitiveMemoryUnit[]): void {
    this.clear();
    for (const unit of units) {
      this.units.set(unit.id, unit);
    }
  }
}
