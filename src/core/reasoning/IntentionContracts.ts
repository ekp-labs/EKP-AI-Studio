import { Intention, IntentionStatus, ProposedAction } from '../types.js';

export class IntentionValidator {
  public static validateAndFormulate(rawOutput: any, taskId: string, domain: string): Intention {
    if (!rawOutput || typeof rawOutput !== 'object') {
      throw new Error('[IntentionValidator] Raw output must be a valid non-null object');
    }

    const problemDecomposition = Array.isArray(rawOutput.problemDecomposition)
      ? rawOutput.problemDecomposition.map(String)
      : [String(rawOutput.problemDecomposition || 'Decompose task')];

    const epistemicGrounding = Array.isArray(rawOutput.epistemicGrounding)
      ? rawOutput.epistemicGrounding.map(String)
      : [];

    const assumptions = Array.isArray(rawOutput.assumptions)
      ? rawOutput.assumptions.map(String)
      : [];

    const confidenceAssessment = typeof rawOutput.confidenceAssessment === 'number'
      ? Math.max(0, Math.min(1.0, rawOutput.confidenceAssessment))
      : 0.85;

    const conclusion = String(rawOutput.conclusion || 'Analysis completed');

    const proposedActions: ProposedAction[] = Array.isArray(rawOutput.proposedActions)
      ? rawOutput.proposedActions.map((act: any, idx: number) => ({
          id: act.id || `act_${Date.now()}_${idx + 1}`,
          toolName: String(act.toolName || 'system_notice'),
          parameters: typeof act.parameters === 'object' && act.parameters ? act.parameters : {},
          safetyAnalysis: String(act.safetyAnalysis || 'No safety issues detected.'),
          isConsequential: Boolean(act.isConsequential ?? true),
          justification: String(act.justification || 'Required for task completion.'),
        }))
      : [];

    const hasConsequentialAction = proposedActions.some((a) => a.isConsequential);
    const initialStatus = hasConsequentialAction
      ? IntentionStatus.AWAITING_APPROVAL
      : IntentionStatus.VALIDATED;

    return {
      id: `int_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      taskId,
      domain,
      cognitiveAnalysis: {
        problemDecomposition,
        epistemicGrounding,
        assumptions,
        confidenceAssessment,
        conclusion,
      },
      proposedActions,
      status: initialStatus,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };
  }
}
