import React, { useState } from 'react';
import {
  Activity,
  ShieldCheck,
  ShieldAlert,
  Clock,
  Radio,
  FileText,
  Filter,
  CheckCircle,
  XCircle,
} from 'lucide-react';
import { EKPEvent, AuditLogEntry, EventTopic } from '../core/types';

interface ObservabilityFeedProps {
  events: EKPEvent[];
  auditLogs: AuditLogEntry[];
}

export const ObservabilityFeed: React.FC<ObservabilityFeedProps> = ({ events, auditLogs }) => {
  const [activeSubTab, setActiveSubTab] = useState<'events' | 'audit'>('events');
  const [selectedTopic, setSelectedTopic] = useState<string>('ALL');

  const filteredEvents = events.filter((e) => {
    return selectedTopic === 'ALL' || e.topic === selectedTopic;
  });

  return (
    <div className="space-y-6">
      {/* Subtab Toggle */}
      <div className="flex items-center justify-between border-b border-slate-800 pb-3">
        <div className="flex items-center space-x-2">
          <button
            onClick={() => setActiveSubTab('events')}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold flex items-center space-x-2 transition ${
              activeSubTab === 'events'
                ? 'bg-indigo-600 text-white shadow-sm'
                : 'text-slate-400 hover:text-slate-200 bg-slate-900'
            }`}
          >
            <Radio className="w-3.5 h-3.5" />
            <span>EventBus Stream ({events.length})</span>
          </button>
          <button
            onClick={() => setActiveSubTab('audit')}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold flex items-center space-x-2 transition ${
              activeSubTab === 'audit'
                ? 'bg-indigo-600 text-white shadow-sm'
                : 'text-slate-400 hover:text-slate-200 bg-slate-900'
            }`}
          >
            <ShieldCheck className="w-3.5 h-3.5" />
            <span>Audit Trail & Governance ({auditLogs.length})</span>
          </button>
        </div>

        {activeSubTab === 'events' && (
          <div className="flex items-center space-x-2">
            <Filter className="w-3.5 h-3.5 text-slate-500" />
            <select
              value={selectedTopic}
              onChange={(e) => setSelectedTopic(e.target.value)}
              className="bg-slate-950 border border-slate-800 rounded-lg px-2.5 py-1 text-xs text-slate-200 focus:outline-none font-mono"
            >
              <option value="ALL">All Event Topics</option>
              {Object.values(EventTopic).map((t) => (
                <option key={t} value={t}>
                  {t}
                </option>
              ))}
            </select>
          </div>
        )}
      </div>

      {/* Events Stream */}
      {activeSubTab === 'events' ? (
        <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden">
          <div className="p-3 bg-slate-950/40 border-b border-slate-800 flex items-center justify-between text-xs text-slate-400">
            <span className="font-semibold uppercase tracking-wider text-slate-200">
              Live Core Event Feed
            </span>
            <span className="font-mono">Real-time asynchronous dispatch</span>
          </div>

          <div className="divide-y divide-slate-800/60 max-h-[600px] overflow-y-auto">
            {filteredEvents.map((evt) => (
              <div key={evt.id} className="p-3.5 hover:bg-slate-800/30 transition space-y-1.5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <span className="px-2 py-0.5 rounded text-[10px] font-mono font-semibold bg-indigo-950 text-indigo-300 border border-indigo-800">
                      {evt.topic}
                    </span>
                    <span className="text-xs font-medium text-slate-300">
                      Source: {evt.source}
                    </span>
                  </div>
                  <span className="text-[10px] text-slate-400 font-mono">
                    {new Date(evt.timestamp).toLocaleTimeString()}
                  </span>
                </div>

                <div className="bg-slate-950 p-2.5 rounded-lg border border-slate-800 text-[11px] font-mono text-slate-300 overflow-x-auto">
                  <pre>{JSON.stringify(evt.payload, null, 2)}</pre>
                </div>
              </div>
            ))}

            {filteredEvents.length === 0 && (
              <div className="p-8 text-center text-xs text-slate-500">
                No events recorded yet for this filter.
              </div>
            )}
          </div>
        </div>
      ) : (
        /* Audit Trail */
        <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden">
          <div className="p-3 bg-slate-950/40 border-b border-slate-800 flex items-center justify-between text-xs text-slate-400">
            <span className="font-semibold uppercase tracking-wider text-slate-200">
              Governed Action Audit Log
            </span>
            <span className="font-mono">Immutable execution records</span>
          </div>

          <div className="divide-y divide-slate-800/60 max-h-[600px] overflow-y-auto">
            {auditLogs.map((log) => (
              <div key={log.id} className="p-4 hover:bg-slate-800/30 transition space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    {log.status === 'SUCCESS' ? (
                      <CheckCircle className="w-4 h-4 text-emerald-400" />
                    ) : (
                      <XCircle className="w-4 h-4 text-rose-400" />
                    )}
                    <span className="text-xs font-semibold text-slate-200 font-mono">
                      {log.action}
                    </span>
                    {log.consequential && (
                      <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-amber-950 text-amber-400 border border-amber-800">
                        CONSEQUENTIAL
                      </span>
                    )}
                  </div>
                  <span className="text-[10px] text-slate-400 font-mono">
                    {new Date(log.timestamp).toLocaleString()}
                  </span>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-[11px] text-slate-400 bg-slate-950/60 p-2 rounded border border-slate-800/80">
                  <div>
                    <span className="text-[9px] block text-slate-400">Actor:</span>
                    <span className="text-slate-200 font-mono">{log.actor}</span>
                  </div>
                  <div>
                    <span className="text-[9px] block text-slate-400">Approved:</span>
                    <span className="text-slate-200 font-mono">{log.approved ? 'YES' : 'NO'}</span>
                  </div>
                  <div>
                    <span className="text-[9px] block text-slate-400">Status:</span>
                    <span
                      className={`font-mono font-semibold ${
                        log.status === 'SUCCESS' ? 'text-emerald-400' : 'text-rose-400'
                      }`}
                    >
                      {log.status}
                    </span>
                  </div>
                  <div>
                    <span className="text-[9px] block text-slate-400">Intention ID:</span>
                    <span className="text-slate-200 font-mono truncate block">
                      {log.intentionId.substring(0, 12)}...
                    </span>
                  </div>
                </div>

                {log.details && (
                  <div className="bg-slate-950 p-2 rounded text-[10px] font-mono text-slate-400 overflow-x-auto">
                    <pre>{JSON.stringify(log.details, null, 2)}</pre>
                  </div>
                )}
              </div>
            ))}

            {auditLogs.length === 0 && (
              <div className="p-8 text-center text-xs text-slate-500">
                No governed actions have been executed yet.
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
