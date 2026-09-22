import { LLMProvider, GeminiProvider, DeterministicEpistemicProvider } from './LLMProvider.js';
import { KnowledgeRetrieval } from '../retrieval/KnowledgeRetrieval.js';
import { IntentionValidator } from './IntentionContracts.js';
import { Intention, EventTopic, IntentionStatus } from '../types.js';
import { EventBus } from '../kernel/EventBus.js';

export interface ReasoningResult {
  intention: Intention;
  providerUsed: string;
}

export class LLMReasoning {
  private geminiProvider: GeminiProvider;
  private deterministicProvider: DeterministicEpistemicProvider;
  private activeProvider: LLMProvider;
  private retrieval: KnowledgeRetrieval;
  private eventBus?: EventBus;

  constructor(retrieval: KnowledgeRetrieval, eventBus?: EventBus) {
    this.retrieval = retrieval;
    this.geminiProvider = new GeminiProvider();
    this.deterministicProvider = new DeterministicEpistemicProvider();
    this.activeProvider = this.geminiProvider.isAvailable()
      ? this.geminiProvider
      : this.deterministicProvider;
    this.eventBus = eventBus;
  }

  public getGeminiProvider(): GeminiProvider {
    return this.geminiProvider;
  }

  public setActiveProvider(providerType: 'gemini' | 'deterministic'): void {
    if (providerType === 'gemini' && this.geminiProvider.isAvailable()) {
      this.activeProvider = this.geminiProvider;
    } else {
      this.activeProvider = this.deterministicProvider;
    }
  }

  public async reason(task: string, domain?: string): Promise<ReasoningResult> {
    const context = this.retrieval.retrieve(task, domain);
    const availableTools = [
      {
        name: 'execute_calibrated_task',
        description: 'Executes a calibrated domain task',
        parameters: { task: 'string', domain: 'string' },
      },
    ];

    let providerUsed = this.activeProvider.name;
    let rawOutput;

    try {
      rawOutput = await this.activeProvider.generateReasoning({
        task,
        domain,
        context,
        availableTools,
      });
    } catch (err: any) {
      console.warn(`[LLMReasoning] Provider ${this.activeProvider.name} failed. Falling back to deterministic engine:`, err.message || err);
      this.activeProvider = this.deterministicProvider;
      providerUsed = `${this.deterministicProvider.name} (Fallback)`;
      rawOutput = await this.deterministicProvider.generateReasoning({
        task,
        domain,
        context,
        availableTools,
      });
    }

    const intention = IntentionValidator.validateAndFormulate(
      rawOutput,
      `task_${Date.now()}`,
      domain || 'General'
    );

    if (this.eventBus) {
      this.eventBus.publish(EventTopic.INTENTION_FORMULATED, intention);
    }

    return {
      intention,
      providerUsed,
    };
  }
}
