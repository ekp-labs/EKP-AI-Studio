import React, { useState } from 'react';
import {
  BrainCircuit,
  Send,
  ShieldAlert,
  ShieldCheck,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  FileCheck,
  Sparkles,
  ArrowRight,
  Terminal,
  Clock,
  Layers,
  ChevronDown,
} from 'lucide-react';
import {
  ReasoningIntention,
  RetrievalContext,
  IntentionStatus,
  ProposedAction,
} from '../core/types';

interface ReasoningWorkbenchProps {
  onReason: (prompt: string, domain?: string) => Promise<void>;
  onApproveAction: (actionId: string, notes?: string) => Promise<void>;
  onRejectAction: (actionId: string, reason?: string) => Promise<void>;
  currentIntention: ReasoningIntention | null;
  currentContext: RetrievalContext | null;
  providerUsed: string | null;
  isProcessing: boolean;
  domains: string[];
}

export const ReasoningWorkbench: React.FC<ReasoningWorkbenchProps> = ({
  onReason,
  onApproveAction,
  onRejectAction,
  currentIntention,
  currentContext,
  providerUsed,
  isProcessing,
  domains,
}) => {
  const [prompt, setPrompt] = useState<string>('');
  const [selectedDomain, setSelectedDomain] = useState<string>('Embroidery');
  const [approvalNotes, setApprovalNotes] = useState<string>('');

  const quickPrompts = [
    {
      label: 'Industrial Tension Calibration',
      domain: 'Embroidery',
      prompt: 'Calibrate top thread tension for Rayon 40wt on industrial Tajima machine.',
    },
    {
      label: 'Aero-Structural Flutter Limits',
      domain: 'Aerospace Engineering',
      prompt: 'Verify flutter margin and maximum dynamic pressure limits for wing spar.',
    },
    {
      label: 'Autonomous Collision Avoidance',
      domain: 'Autonomous Systems',
      prompt: 'Check LiDAR safety boundary and trigger emergency deceleration if obstacle is detected.',
    },
  ];

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!prompt.trim() || isProcessing) return;
    onReason(prompt, selectedDomain);
  };

  const getStatusBadge = (status: IntentionStatus) => {
    switch (status) {
      case IntentionStatus.AWAITING_APPROVAL:
        return (
          <span className="inline-flex items-center space-x-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-950 text-amber-300 border border-amber-800 animate-pulse">
            <ShieldAlert className="w-3.5 h-3.5" />
            <span>Awaiting Human Approval</span>
          </span>
        );
      case IntentionStatus.COMPLETED:
        return (
          <span className="inline-flex items-center space-x-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-950 text-emerald-300 border border-emerald-800">
            <CheckCircle2 className="w-3.5 h-3.5" />
            <span>Executed & Completed</span>
          </span>
        );
      case IntentionStatus.REJECTED:
        return (
          <span className="inline-flex items-center space-x-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-rose-950 text-rose-300 border border-rose-800">
            <XCircle className="w-3.5 h-3.5" />
            <span>Rejected by Supervisor</span>
          </span>
        );
      case IntentionStatus.EXECUTING:
        return (
          <span className="inline-flex items-center space-x-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-blue-950 text-blue-300 border border-blue-800">
            <Clock className="w-3.5 h-3.5 animate-spin" />
            <span>Governed Execution...</span>
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center space-x-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-slate-800 text-slate-300 border border-slate-700">
            {status}
          </span>
        );
    }
  };

  return (
    <div className="space-y-6">
      {/* Task Input Section */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-sm">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center space-x-2">
            <BrainCircuit className="w-5 h-5 text-indigo-400" />
            <h2 className="text-sm font-semibold text-slate-100 uppercase tracking-wider">
              Epistemic Task Formulation
            </h2>
          </div>
          <div className="flex items-center space-x-2">
            <span className="text-xs text-slate-400">Target Domain:</span>
            <select
              value={selectedDomain}
              onChange={(e) => setSelectedDomain(e.target.value)}
              className="bg-slate-950 border border-slate-800 rounded-lg px-2.5 py-1 text-xs text-slate-200 focus:outline-none focus:border-indigo-500 font-mono"
            >
              {domains.map((dom) => (
                <option key={dom} value={dom}>
                  {dom}
                </option>
              ))}
            </select>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-3">
          <div className="relative">
            <textarea
              rows={3}
              placeholder="Enter instruction, diagnostic task, or calibration prompt..."
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              className="w-full bg-slate-950/80 border border-slate-800 rounded-xl p-3 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-indigo-500 font-sans"
            />
          </div>

          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex flex-wrap gap-1.5 items-center">
              <span className="text-[11px] text-slate-400 mr-1">Quick Scenarios:</span>
              {quickPrompts.map((qp) => (
                <button
                  key={qp.label}
                  type="button"
                  onClick={() => {
                    setPrompt(qp.prompt);
                    setSelectedDomain(qp.domain);
                  }}
                  className="px-2.5 py-1 rounded-md text-[11px] bg-slate-800/80 hover:bg-slate-800 text-slate-300 border border-slate-700/60 transition font-sans"
                >
                  {qp.label}
                </button>
              ))}
            </div>

            <button
              id="btn-submit-task"
              type="submit"
              disabled={isProcessing || !prompt.trim()}
              className="flex items-center space-x-2 px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white text-xs font-semibold transition shadow-sm"
            >
              <span>{isProcessing ? 'Reasoning...' : 'Execute Epistemic Task'}</span>
              <Send className="w-3.5 h-3.5" />
            </button>
          </div>
        </form>
      </div>

      {/* Intention & Governance Results */}
      {currentIntention && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Left Column: Intention Structure & Grounding */}
          <div className="lg:col-span-7 space-y-4">
            <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 space-y-4">
              <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                <div className="flex items-center space-x-2">
                  <FileCheck className="w-4 h-4 text-indigo-400" />
                  <h3 className="text-xs font-semibold text-slate-200 uppercase tracking-wider">
                    Structured Reasoning Intention
                  </h3>
                </div>
                {getStatusBadge(currentIntention.status)}
              </div>

              {/* Problem Decomposition */}
              <div>
                <span className="text-xs font-medium text-slate-400 block mb-1.5 uppercase tracking-wide text-[10px]">
                  Problem Decomposition & Logical Derivation
                </span>
                <div className="bg-slate-950/60 p-3 rounded-lg border border-slate-800/80 space-y-1.5 font-mono text-xs text-slate-300">
                  {currentIntention.cognitiveAnalysis.problemDecomposition.map((step, idx) => (
                    <div key={idx} className="flex items-start space-x-2">
                      <span className="text-indigo-400 select-none">›</span>
                      <span>{step}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Conclusion / Reasoning Output */}
              <div>
                <span className="text-xs font-medium text-slate-400 block mb-1.5 uppercase tracking-wide text-[10px]">
                  Epistemic Conclusion
                </span>
                <div className="bg-indigo-950/20 border border-indigo-500/20 p-3 rounded-lg text-xs text-indigo-200 leading-relaxed">
                  {currentIntention.conclusion}
                </div>
              </div>

              {/* Grounded ADU References */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-xs font-medium text-slate-400 uppercase tracking-wide text-[10px]">
                    Epistemic Grounding (ADU References)
                  </span>
                  <span className="text-[10px] text-slate-400 font-mono">
                    {currentIntention.cognitiveAnalysis.epistemicGrounding.length} ADUs Justifying Intention
                  </span>
                </div>
                <div className="space-y-1.5 max-h-48 overflow-y-auto">
                  {currentContext &&
                    currentContext.items.map((item) => (
                      <div
                        key={item.adu.id}
                        className="bg-slate-950/40 border border-slate-800/60 p-2.5 rounded-lg text-xs space-y-1"
                      >
                        <div className="flex items-center justify-between text-[10px]">
                          <span className="font-mono text-indigo-400">{item.adu.type}</span>
                          <span className="text-slate-400 font-mono">
                            Relevance: {(item.relevanceScore * 100).toFixed(0)}%
                          </span>
                        </div>
                        <p className="text-slate-300 text-[11px] leading-snug">{item.adu.content}</p>
                      </div>
                    ))}
                </div>
              </div>
            </div>
          </div>

          {/* Right Column: Proposed Actions & Governance Decider */}
          <div className="lg:col-span-5 space-y-4">
            <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 space-y-4">
              <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                <div className="flex items-center space-x-2">
                  <Terminal className="w-4 h-4 text-indigo-400" />
                  <h3 className="text-xs font-semibold text-slate-200 uppercase tracking-wider">
                    Governed Action Dispatcher
                  </h3>
                </div>
                <span className="text-[10px] text-slate-400 font-mono">
                  Engine: {providerUsed || 'Deterministic'}
                </span>
              </div>

              {currentIntention.proposedActions.length === 0 ? (
                <div className="p-6 text-center text-xs text-slate-500">
                  No state mutations proposed. Reasoning task was purely analytical.
                </div>
              ) : (
                <div className="space-y-3">
                  {currentIntention.proposedActions.map((act) => {
                    const isPending =
                      currentIntention.status === IntentionStatus.AWAITING_APPROVAL &&
                      act.consequential;

                    return (
                      <div
                        key={act.id}
                        className={`p-3.5 rounded-xl border space-y-2.5 ${
                          act.consequential
                            ? 'bg-amber-950/10 border-amber-500/30'
                            : 'bg-slate-950/50 border-slate-800'
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <span className="font-mono text-xs font-semibold text-slate-200">
                            {act.toolName}
                          </span>
                          {act.consequential ? (
                            <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-950 text-amber-400 border border-amber-800 uppercase">
                              CONSEQUENTIAL
                            </span>
                          ) : (
                            <span className="px-2 py-0.5 rounded text-[10px] font-medium bg-slate-800 text-slate-300">
                              SAFE
                            </span>
                          )}
                        </div>

                        <p className="text-xs text-slate-300 font-sans">{act.actionSummary}</p>

                        {/* Safety Analysis */}
                        <div className="text-[11px] bg-slate-900/80 p-2 rounded border border-slate-800 space-y-1">
                          <span className="text-[10px] text-slate-400 font-mono block">
                            Safety Assessment:
                          </span>
                          <span className="text-slate-300">{act.safetyAnalysis}</span>
                        </div>

                        {/* Action Parameters */}
                        <div className="text-[10px] font-mono bg-slate-950 p-2 rounded text-slate-400 overflow-x-auto">
                          <pre>{JSON.stringify(act.parameters, null, 2)}</pre>
                        </div>

                        {/* Approval Controls for Consequential Actions */}
                        {isPending && (
                          <div className="pt-2 border-t border-amber-500/20 space-y-2">
                            <div className="text-xs font-semibold text-amber-300 flex items-center space-x-1.5">
                              <AlertTriangle className="w-3.5 h-3.5" />
                              <span>Human Supervisor Authorization Required</span>
                            </div>
                            <input
                              type="text"
                              placeholder="Supervisor rationale / notes (optional)..."
                              value={approvalNotes}
                              onChange={(e) => setApprovalNotes(e.target.value)}
                              className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2 text-xs text-slate-200 placeholder-slate-500 focus:outline-none"
                            />
                            <div className="flex items-center space-x-2">
                              <button
                                id={`btn-approve-${act.id}`}
                                onClick={() => onApproveAction(act.id, approvalNotes)}
                                className="flex-1 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-medium text-xs flex items-center justify-center space-x-1.5 transition"
                              >
                                <CheckCircle2 className="w-3.5 h-3.5" />
                                <span>Authorize & Execute</span>
                              </button>
                              <button
                                id={`btn-reject-${act.id}`}
                                onClick={() => onRejectAction(act.id, approvalNotes)}
                                className="flex-1 py-1.5 rounded-lg bg-rose-900/80 hover:bg-rose-800 text-rose-200 font-medium text-xs flex items-center justify-center space-x-1.5 transition"
                              >
                                <XCircle className="w-3.5 h-3.5" />
                                <span>Reject Action</span>
                              </button>
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}

              {/* Execution Results Feedback */}
              {currentIntention.executionResults && currentIntention.executionResults.length > 0 && (
                <div className="mt-4 pt-3 border-t border-slate-800 space-y-2">
                  <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block">
                    Execution Telemetry & Graph Mutation
                  </span>
                  {currentIntention.executionResults.map((res, i) => (
                    <div
                      key={i}
                      className="bg-slate-950 p-2.5 rounded-lg border border-slate-800 text-xs font-mono space-y-1"
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-indigo-300 font-bold">{res.toolName}</span>
                        <span
                          className={`text-[10px] font-bold ${
                            res.status === 'SUCCESS' ? 'text-emerald-400' : 'text-rose-400'
                          }`}
                        >
                          {res.status} ({res.durationMs}ms)
                        </span>
                      </div>
                      <div className="text-slate-400 text-[11px] overflow-x-auto">
                        <pre>{JSON.stringify(res.output, null, 2)}</pre>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
