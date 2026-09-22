import { RetrievedContext } from '../retrieval/KnowledgeRetrieval.js';

export interface LLMReasoningPrompt {
  task: string;
  domain?: string;
  context: RetrievedContext;
  availableTools: any[];
}

export interface RawReasoningOutput {
  problemDecomposition: string[];
  epistemicGrounding: string[];
  assumptions: string[];
  confidenceAssessment: number;
  conclusion: string;
  proposedActions: {
    toolName: string;
    parameters: Record<string, any>;
    safetyAnalysis: string;
    isConsequential: boolean;
    justification: string;
  }[];
}

export interface LLMProvider {
  name: string;
  isAvailable(): boolean;
  generateReasoning(prompt: LLMReasoningPrompt): Promise<RawReasoningOutput>;
}

export class DeterministicEpistemicProvider implements LLMProvider {
  public readonly name = 'EKP Deterministic Epistemic Engine';

  public isAvailable(): boolean {
    return true;
  }

  public async generateReasoning(prompt: LLMReasoningPrompt): Promise<RawReasoningOutput> {
    const groundedSources = prompt.context.items.map((it) => `${it.adu.provenance.sourceTitle} (Line ${it.adu.startLine})`);

    return {
      problemDecomposition: [
        `Analyze task requirements for: ${prompt.task}`,
        `Cross-reference retrieved epistemic facts from ${groundedSources.length} sources`,
        `Synthesize action plan adhering to safety and governance invariants`,
      ],
      epistemicGrounding: groundedSources,
      assumptions: [
        'Retrieved ADU evidence is accurate and up-to-date',
        'System governance holds for all external side-effects',
      ],
      confidenceAssessment: 0.92,
      conclusion: `Formulated governed action plan for task "${prompt.task}" based on ${groundedSources.length} grounded source ADUs.`,
      proposedActions: [
        {
          toolName: 'execute_calibrated_task',
          parameters: { task: prompt.task, domain: prompt.domain || 'General' },
          safetyAnalysis: 'Action modifies system state; requires explicit human governance review.',
          isConsequential: true,
          justification: `Execute operational procedure derived from task specification "${prompt.task}".`,
        },
      ],
    };
  }
}

export class GeminiProvider implements LLMProvider {
  public readonly name = 'Google Gemini (gemini-3.7-flash)';
  private apiKey?: string;
  private mockHandler?: (prompt: LLMReasoningPrompt) => Promise<RawReasoningOutput>;

  constructor() {
    this.apiKey = process.env.GEMINI_API_KEY;
  }

  public setApiKey(key: string | undefined): void {
    this.apiKey = key;
  }

  public setMockHandler(fn: ((prompt: LLMReasoningPrompt) => Promise<RawReasoningOutput>) | undefined): void {
    this.mockHandler = fn;
  }

  public isAvailable(): boolean {
    return Boolean(this.apiKey && this.apiKey.trim().length > 0);
  }

  public async generateReasoning(prompt: LLMReasoningPrompt): Promise<RawReasoningOutput> {
    if (!this.apiKey || this.apiKey.trim().length === 0) {
      throw new Error('[GeminiProvider] GEMINI_API_KEY is not configured on server.');
    }

    const controller = new AbortController();
    const timeoutId = setTimeout(() => {
      controller.abort(new Error('Gemini API call timed out after 5000ms'));
    }, 5000);

    try {
      if (this.mockHandler) {
        const mockPromise = this.mockHandler(prompt);
        const timeoutPromise = new Promise<never>((_, reject) => {
          controller.signal.addEventListener('abort', () => {
            reject(controller.signal.reason || new Error('Gemini API call timed out after 5000ms'));
          });
        });
        const res = await Promise.race([mockPromise, timeoutPromise]);
        clearTimeout(timeoutId);
        return res;
      }

      const { GoogleGenAI } = await import('@google/genai');

      const ai = new GoogleGenAI({
        apiKey: this.apiKey,
        httpOptions: {
          headers: {
            'User-Agent': 'aistudio-build',
          },
        },
      });

      const contextText = prompt.context.items
        .map(
          (it, idx) =>
            `[Source ${idx + 1}] ID: ${it.adu.id} (${it.adu.type}) Confidence: ${it.adu.confidence}\nSource: ${it.adu.provenance.sourceTitle}\nContent: "${it.adu.content}"\n`
        )
        .join('\n');

      const toolsDescription = JSON.stringify(prompt.availableTools, null, 2);

      const systemInstruction = `You are the EKP Canonical Epistemic Reasoning Engine.
You must analyze the user task based STRICTLY on the retrieved context items.
You must adhere to the EKP architectural invariants:
1. Do not hallucinate facts not present in or deduced from the retrieved context.
2. Formulate explicit, structured reasoning steps.
3. Identify all epistemic assumptions.
4. Output structured JSON matching raw reasoning schema.`;

      const userContent = `TASK: ${prompt.task}
DOMAIN: ${prompt.domain || 'Domain-Agnostic'}

RETRIEVED EPISTEMIC CONTEXT:
${contextText || 'No direct context retrieved.'}

AVAILABLE TOOLS:
${toolsDescription}

Generate your structured reasoning and proposed actions as JSON.`;

      const timeoutPromise = new Promise<never>((_, reject) => {
        controller.signal.addEventListener('abort', () => {
          reject(controller.signal.reason || new Error('Gemini API call timed out after 5000ms'));
        });
      });

      const generatePromise = ai.models.generateContent({
        model: 'gemini-3.7-flash',
        contents: userContent,
        config: {
          systemInstruction,
          responseMimeType: 'application/json',
        },
      });

      const response = await Promise.race([generatePromise, timeoutPromise]);
      clearTimeout(timeoutId);

      const jsonStr = response.text?.trim() || '{}';
      const parsed = JSON.parse(jsonStr);

      return {
        problemDecomposition: Array.isArray(parsed.problemDecomposition) ? parsed.problemDecomposition : [parsed.problemDecomposition || 'Analyze input'],
        epistemicGrounding: Array.isArray(parsed.epistemicGrounding) ? parsed.epistemicGrounding : [],
        assumptions: Array.isArray(parsed.assumptions) ? parsed.assumptions : [],
        confidenceAssessment: typeof parsed.confidenceAssessment === 'number' ? parsed.confidenceAssessment : 0.85,
        conclusion: parsed.conclusion || 'Analysis completed.',
        proposedActions: Array.isArray(parsed.proposedActions) ? parsed.proposedActions : [],
      };
    } catch (err) {
      clearTimeout(timeoutId);
      throw err;
    }
  }
}
