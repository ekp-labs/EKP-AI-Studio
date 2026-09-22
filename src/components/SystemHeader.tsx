import React from 'react';
import {
  Activity,
  BookOpen,
  BrainCircuit,
  Network,
  ShieldCheck,
  PlusCircle,
  RefreshCw,
  Cpu,
} from 'lucide-react';
import { SystemStatusResponse } from '../core/types';

interface SystemHeaderProps {
  status: SystemStatusResponse | null;
  activeTab: 'reasoning' | 'knowledge' | 'graph' | 'observability';
  setActiveTab: (tab: 'reasoning' | 'knowledge' | 'graph' | 'observability') => void;
  onOpenIngest: () => void;
  onReset: () => void;
  isLoading: boolean;
}

export const SystemHeader: React.FC<SystemHeaderProps> = ({
  status,
  activeTab,
  setActiveTab,
  onOpenIngest,
  onReset,
  isLoading,
}) => {
  return (
    <header className="border-b border-slate-800 bg-slate-900/90 backdrop-blur sticky top-0 z-40">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo & Identity */}
          <div className="flex items-center space-x-3">
            <div className="h-9 w-9 rounded-lg bg-indigo-600/20 border border-indigo-500/30 flex items-center justify-center text-indigo-400 font-mono font-bold text-sm">
              EKP
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <span className="font-semibold tracking-tight text-white text-base">
                  EKP Canonical Core
                </span>
                <span className="text-xs px-2 py-0.5 rounded-full bg-emerald-950 text-emerald-400 border border-emerald-800 font-mono">
                  {status?.state || 'READY'}
                </span>
              </div>
              <p className="text-xs text-slate-400 hidden sm:block">
                Epistemic Knowledge Management & Governed Reasoning
              </p>
            </div>
          </div>

          {/* Navigation Tabs */}
          <nav className="flex space-x-1 bg-slate-950/60 p-1 rounded-xl border border-slate-800/80">
            <button
              id="nav-reasoning"
              onClick={() => setActiveTab('reasoning')}
              className={`flex items-center space-x-2 px-3.5 py-1.5 rounded-lg text-xs font-medium transition-all ${
                activeTab === 'reasoning'
                  ? 'bg-indigo-600 text-white shadow-sm'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
              }`}
            >
              <BrainCircuit className="w-3.5 h-3.5" />
              <span>Reasoning Workbench</span>
              {status && status.pendingApprovalsCount > 0 && (
                <span className="ml-1 px-1.5 py-0.2 rounded-full bg-amber-500 text-slate-950 font-bold text-[10px]">
                  {status.pendingApprovalsCount}
                </span>
              )}
            </button>

            <button
              id="nav-knowledge"
              onClick={() => setActiveTab('knowledge')}
              className={`flex items-center space-x-2 px-3.5 py-1.5 rounded-lg text-xs font-medium transition-all ${
                activeTab === 'knowledge'
                  ? 'bg-indigo-600 text-white shadow-sm'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
              }`}
            >
              <BookOpen className="w-3.5 h-3.5" />
              <span>Knowledge Library</span>
              <span className="text-slate-400 text-[10px] font-mono">({status?.aduCount || 0})</span>
            </button>

            <button
              id="nav-graph"
              onClick={() => setActiveTab('graph')}
              className={`flex items-center space-x-2 px-3.5 py-1.5 rounded-lg text-xs font-medium transition-all ${
                activeTab === 'graph'
                  ? 'bg-indigo-600 text-white shadow-sm'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
              }`}
            >
              <Network className="w-3.5 h-3.5" />
              <span>RuntimeGraph</span>
              <span className="text-slate-400 text-[10px] font-mono">({status?.nodeCount || 0})</span>
            </button>

            <button
              id="nav-observability"
              onClick={() => setActiveTab('observability')}
              className={`flex items-center space-x-2 px-3.5 py-1.5 rounded-lg text-xs font-medium transition-all ${
                activeTab === 'observability'
                  ? 'bg-indigo-600 text-white shadow-sm'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
              }`}
            >
              <Activity className="w-3.5 h-3.5" />
              <span>Observability</span>
            </button>
          </nav>

          {/* Quick Actions */}
          <div className="flex items-center space-x-2">
            <button
              id="btn-open-ingest"
              onClick={onOpenIngest}
              className="flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-slate-800 hover:bg-slate-700 text-slate-100 border border-slate-700 transition"
            >
              <PlusCircle className="w-3.5 h-3.5 text-indigo-400" />
              <span>Ingest Markdown</span>
            </button>

            <button
              id="btn-reset-state"
              onClick={onReset}
              disabled={isLoading}
              title="Reset state to canonical sample seed"
              className="p-1.5 rounded-lg text-slate-400 hover:text-slate-200 hover:bg-slate-800 border border-slate-800 transition"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
            </button>
          </div>
        </div>
      </div>
    </header>
  );
};
