import React, { useState, useEffect } from 'react';
import { GraphViewer } from './components/GraphViewer';
import { KnowledgeSearchModal } from './components/KnowledgeSearchModal';
import { 
  ShieldAlert, 
  BrainCircuit, 
  Database, 
  Network, 
  CheckCircle2, 
  XCircle, 
  Clock, 
  Plus, 
  RefreshCw, 
  FileText, 
  Terminal,
  Activity,
  Layers,
  FolderPlus,
  Folder,
  Play,
  Square,
  FileCheck,
  AlertTriangle
} from 'lucide-react';

interface SystemStatus {
  domainsCount: number;
  documentsCount: number;
  adusCount: number;
  nodesCount: number;
  edgesCount: number;
  intentionsCount: number;
  auditLogsCount: number;
  lastUpdated: number;
}

interface IngestionAggregateStatus {
  enabled: boolean;
  authorizedDirectoriesCount: number;
  authorizedDirectories: {
    id: string;
    path: string;
    enabled: boolean;
    recursive: boolean;
    namespace: string;
  }[];
  totalRecordsCount: number;
  counts: {
    ingested: number;
    duplicate: number;
    unchanged: number;
    unsupported: number;
    failed: number;
    sourceDeleted: number;
  };
  watcherStatus: {
    active: boolean;
    watchedRoots: string[];
    pendingEventsCount: number;
  };
}

export default function App() {
  const [activeTab, setActiveTab] = useState<'overview' | 'knowledge' | 'search' | 'local-ingestion' | 'reasoning' | 'graph'>('overview');
  const [status, setStatus] = useState<SystemStatus | null>(null);
  const [loading, setLoading] = useState(true);

  // Ingestion form state
  const [docTitle, setDocTitle] = useState('');
  const [docDomain, setDocDomain] = useState('Aerospace');
  const [docContent, setDocContent] = useState('');
  const [ingestStatus, setIngestStatus] = useState('');

  // Local Ingestion state
  const [localDirConfig, setLocalDirConfig] = useState<IngestionAggregateStatus | null>(null);
  const [newDirPath, setNewDirPath] = useState('');
  const [newDirNamespace, setNewDirNamespace] = useState('Aerospace');
  const [newDirRecursive, setNewDirRecursive] = useState(true);
  const [scanMessage, setScanMessage] = useState('');
  const [scanLoading, setScanLoading] = useState(false);

  // Reasoning form state
  const [prompt, setPrompt] = useState('');
  const [reasoningDomain, setReasoningDomain] = useState('Aerospace');
  const [reasoningResult, setReasoningResult] = useState<any>(null);
  const [reasoningLoading, setReasoningLoading] = useState(false);

  // Knowledge & Graph state
  const [knowledgeData, setKnowledgeData] = useState<{ documents: any[]; adus: any[] }>({ documents: [], adus: [] });
  const [graphData, setGraphData] = useState<{ nodes: any[]; edges: any[] }>({ nodes: [], edges: [] });

  const fetchStatus = async () => {
    try {
      const res = await fetch('/api/status');
      const data = await res.json();
      if (data.success) {
        setStatus(data.status);
      }
    } catch (err) {
      console.error('Failed to fetch status:', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchLocalIngestionStatus = async () => {
    try {
      const res = await fetch('/api/ingestion/status');
      const data = await res.json();
      if (data.success) {
        setLocalDirConfig(data.status);
      }
    } catch (err) {
      console.error('Failed to fetch ingestion status:', err);
    }
  };

  const fetchKnowledge = async () => {
    try {
      const res = await fetch('/api/knowledge');
      const data = await res.json();
      if (data.success) {
        setKnowledgeData({ documents: data.documents, adus: data.adus });
      }
    } catch (err) {
      console.error('Failed to fetch knowledge:', err);
    }
  };

  const fetchGraph = async () => {
    try {
      const res = await fetch('/api/graph');
      const data = await res.json();
      if (data.success) {
        setGraphData({ nodes: data.nodes, edges: data.edges });
      }
    } catch (err) {
      console.error('Failed to fetch graph:', err);
    }
  };

  useEffect(() => {
    fetchStatus();
    fetchKnowledge();
    fetchGraph();
    fetchLocalIngestionStatus();
  }, []);

  const handleAddAuthorizedDir = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newDirPath) return;

    try {
      const res = await fetch('/api/ingestion/config/add', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          path: newDirPath,
          namespace: newDirNamespace,
          recursive: newDirRecursive,
        }),
      });
      const data = await res.json();
      if (data.success) {
        setNewDirPath('');
        setScanMessage(`Authorized directory added: ${data.directory.path}`);
        fetchLocalIngestionStatus();
      } else {
        setScanMessage(`Error authorizing directory: ${data.error}`);
      }
    } catch (err: any) {
      setScanMessage(`Error: ${err.message}`);
    }
  };

  const handleRemoveAuthorizedDir = async (idOrPath: string) => {
    try {
      const res = await fetch('/api/ingestion/config/remove', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ idOrPath }),
      });
      const data = await res.json();
      if (data.success) {
        fetchLocalIngestionStatus();
      }
    } catch (err: any) {
      console.error('Remove directory error:', err);
    }
  };

  const handleStartScan = async () => {
    setScanLoading(true);
    setScanMessage('Scanning authorized local directories...');
    try {
      const res = await fetch('/api/ingestion/scan', { method: 'POST' });
      const data = await res.json();
      if (data.success) {
        const s = data.summary;
        setScanMessage(
          `Scan Complete! Discovered: ${s.totalDiscovered}, Ingested: ${s.totalIngested}, Duplicated: ${s.totalDuplicated}, Unchanged: ${s.totalUnchanged}, Failed: ${s.totalFailed}`
        );
        fetchLocalIngestionStatus();
        fetchStatus();
        fetchKnowledge();
        fetchGraph();
      } else {
        setScanMessage(`Scan Failed: ${data.error}`);
      }
    } catch (err: any) {
      setScanMessage(`Scan error: ${err.message}`);
    } finally {
      setScanLoading(false);
    }
  };

  const handleWatcherAction = async (action: 'start' | 'stop') => {
    try {
      const res = await fetch('/api/ingestion/watcher', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action }),
      });
      const data = await res.json();
      if (data.success) {
        fetchLocalIngestionStatus();
      }
    } catch (err: any) {
      console.error('Watcher action error:', err);
    }
  };

  const handleIngest = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!docTitle || !docContent) return;

    setIngestStatus('Ingesting document and extracting ADUs...');
    try {
      const res = await fetch('/api/ingest', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: docTitle,
          domain: docDomain,
          content: docContent,
        }),
      });
      const data = await res.json();
      if (data.success) {
        setIngestStatus(`Success! Created document ${data.document.id}`);
        setDocTitle('');
        setDocContent('');
        fetchStatus();
        fetchKnowledge();
        fetchGraph();
      } else {
        setIngestStatus(`Error: ${data.error}`);
      }
    } catch (err: any) {
      setIngestStatus(`Error: ${err.message}`);
    }
  };

  const handleReasoning = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!prompt) return;

    setReasoningLoading(true);
    setReasoningResult(null);

    try {
      const res = await fetch('/api/reasoning', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt, domain: reasoningDomain }),
      });
      const data = await res.json();
      if (data.success) {
        setReasoningResult(data);
        fetchStatus();
        fetchGraph();
      }
    } catch (err: any) {
      console.error('Reasoning error:', err);
    } finally {
      setReasoningLoading(false);
    }
  };

  const handleApproval = async (intentionId: string, actionId: string, approved: boolean) => {
    try {
      const res = await fetch('/api/approval', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          intentionId,
          actionId,
          approved,
          reviewerNotes: approved ? 'Approved by operator via EKP UI' : 'Rejected by operator via EKP UI',
        }),
      });
      const data = await res.json();
      if (data.success) {
        setReasoningResult((prev: any) => {
          if (!prev) return prev;
          return {
            ...prev,
            intention: {
              ...prev.intention,
              status: data.actionResult.status,
            },
          };
        });
        fetchStatus();
        fetchGraph();
      }
    } catch (err: any) {
      console.error('Approval error:', err);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans">
      {/* Header */}
      <header className="border-b border-slate-800 bg-slate-900/80 backdrop-blur px-6 py-4 flex items-center justify-between sticky top-0 z-50">
        <div className="flex items-center space-x-3">
          <div className="p-2 bg-indigo-600/20 rounded-lg border border-indigo-500/30 text-indigo-400">
            <BrainCircuit className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-lg font-bold text-white tracking-wide">Epistemic Knowledge Platform</h1>
            <p className="text-xs text-slate-400">Governed Epistemic Reasoning Engine • Phase 5.2 Hardened</p>
          </div>
        </div>

        <div className="flex items-center space-x-2 bg-slate-900 border border-slate-800 rounded-lg p-1">
          <button
            onClick={() => setActiveTab('overview')}
            className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${
              activeTab === 'overview' ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            System Status
          </button>
          <button
            onClick={() => setActiveTab('knowledge')}
            className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${
              activeTab === 'knowledge' ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Knowledge Ingestion
          </button>
          <button
            onClick={() => setActiveTab('search')}
            className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${
              activeTab === 'search' ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Semantic Search
          </button>
          <button
            onClick={() => setActiveTab('local-ingestion')}
            className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${
              activeTab === 'local-ingestion' ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Local Filesystem (Phase 6A)
          </button>
          <button
            onClick={() => setActiveTab('reasoning')}
            className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${
              activeTab === 'reasoning' ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Epistemic Reasoning
          </button>
          <button
            onClick={() => setActiveTab('graph')}
            className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${
              activeTab === 'graph' ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Runtime Graph
          </button>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 p-6 max-w-7xl w-full mx-auto space-y-6">
        {/* System Status Banner */}
        {activeTab === 'overview' && (
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="bg-slate-900 border border-slate-800 rounded-xl p-5">
                <div className="flex items-center justify-between text-slate-400 mb-2">
                  <span className="text-xs font-semibold uppercase tracking-wider">Documents</span>
                  <FileText className="w-4 h-4 text-indigo-400" />
                </div>
                <div className="text-2xl font-bold text-white">{status?.documentsCount ?? 0}</div>
                <p className="text-xs text-slate-500 mt-1">{status?.adusCount ?? 0} Extracted ADUs</p>
              </div>

              <div className="bg-slate-900 border border-slate-800 rounded-xl p-5">
                <div className="flex items-center justify-between text-slate-400 mb-2">
                  <span className="text-xs font-semibold uppercase tracking-wider">Graph Nodes</span>
                  <Network className="w-4 h-4 text-emerald-400" />
                </div>
                <div className="text-2xl font-bold text-white">{status?.nodesCount ?? 0}</div>
                <p className="text-xs text-slate-500 mt-1">{status?.edgesCount ?? 0} Provenance Edges</p>
              </div>

              <div className="bg-slate-900 border border-slate-800 rounded-xl p-5">
                <div className="flex items-center justify-between text-slate-400 mb-2">
                  <span className="text-xs font-semibold uppercase tracking-wider">Intentions</span>
                  <BrainCircuit className="w-4 h-4 text-amber-400" />
                </div>
                <div className="text-2xl font-bold text-white">{status?.intentionsCount ?? 0}</div>
                <p className="text-xs text-slate-500 mt-1">Formulated Intentions</p>
              </div>

              <div className="bg-slate-900 border border-slate-800 rounded-xl p-5">
                <div className="flex items-center justify-between text-slate-400 mb-2">
                  <span className="text-xs font-semibold uppercase tracking-wider">Governance Audits</span>
                  <ShieldAlert className="w-4 h-4 text-rose-400" />
                </div>
                <div className="text-2xl font-bold text-white">{status?.auditLogsCount ?? 0}</div>
                <p className="text-xs text-slate-500 mt-1">Consequential Executions</p>
              </div>
            </div>

            <div className="bg-slate-900 border border-slate-800 rounded-xl p-6">
              <h2 className="text-base font-semibold text-white mb-4 flex items-center space-x-2">
                <ShieldAlert className="w-5 h-5 text-indigo-400" />
                <span>Verified System Invariants (Phase 5.2 Hardened)</span>
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="p-4 bg-slate-950 border border-slate-800 rounded-lg space-y-1">
                  <div className="text-sm font-semibold text-slate-200">1. Strict Human Governance</div>
                  <p className="text-xs text-slate-400">All consequential tool actions are held in AWAITING_APPROVAL until human operator confirms authorization.</p>
                </div>
                <div className="p-4 bg-slate-950 border border-slate-800 rounded-lg space-y-1">
                  <div className="text-sm font-semibold text-slate-200">2. Complete Provenance Traceability</div>
                  <p className="text-xs text-slate-400">Every node, edge, and ADU explicitly traces to source document URI and line ranges.</p>
                </div>
                <div className="p-4 bg-slate-950 border border-slate-800 rounded-lg space-y-1">
                  <div className="text-sm font-semibold text-slate-200">3. 5000ms Gemini Deadline & Fallback</div>
                  <p className="text-xs text-slate-400">Requests enforce an explicit 5000ms timeout with clean fallback to Deterministic Epistemic Engine.</p>
                </div>
                <div className="p-4 bg-slate-950 border border-slate-800 rounded-lg space-y-1">
                  <div className="text-sm font-semibold text-slate-200">4. Separate-Process Atomic Persistence</div>
                  <p className="text-xs text-slate-400">State survives full operating system process restart via clean atomic repository persistence adapters.</p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Knowledge Ingestion Tab */}
        {activeTab === 'knowledge' && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-1 bg-slate-900 border border-slate-800 rounded-xl p-6 space-y-4">
              <h2 className="text-base font-semibold text-white flex items-center space-x-2">
                <Plus className="w-5 h-5 text-indigo-400" />
                <span>Ingest Document</span>
              </h2>

              <form onSubmit={handleIngest} className="space-y-4">
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">Document Title</label>
                  <input
                    type="text"
                    value={docTitle}
                    onChange={(e) => setDocTitle(e.target.value)}
                    placeholder="e.g. Pressure Calibration Specs"
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-sm text-slate-100 focus:outline-none focus:border-indigo-500"
                    required
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">Domain</label>
                  <select
                    value={docDomain}
                    onChange={(e) => setDocDomain(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-sm text-slate-100 focus:outline-none focus:border-indigo-500"
                  >
                    <option value="Aerospace">Aerospace</option>
                    <option value="Embroidery">Embroidery</option>
                    <option value="Medical">Medical</option>
                    <option value="Security">Security</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">Document Content (Markdown)</label>
                  <textarea
                    rows={6}
                    value={docContent}
                    onChange={(e) => setDocContent(e.target.value)}
                    placeholder="# System Rules&#10;- Pressure must be kept under 100Hz&#10;- Require manual safety valve check"
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-sm text-slate-100 focus:outline-none focus:border-indigo-500 font-mono text-xs"
                    required
                  />
                </div>

                <button
                  type="submit"
                  className="w-full py-2 px-4 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-sm font-medium transition-colors"
                >
                  Parse AST & Ingest
                </button>

                {ingestStatus && (
                  <div className="p-3 bg-slate-950 border border-slate-800 rounded-lg text-xs text-slate-300 font-mono">
                    {ingestStatus}
                  </div>
                )}
              </form>
            </div>

            <div className="lg:col-span-2 bg-slate-900 border border-slate-800 rounded-xl p-6 space-y-4">
              <h2 className="text-base font-semibold text-white flex items-center justify-between">
                <span className="flex items-center space-x-2">
                  <Database className="w-5 h-5 text-indigo-400" />
                  <span>Ingested Documents & Extracted ADUs</span>
                </span>
                <button
                  onClick={fetchKnowledge}
                  className="p-1.5 text-slate-400 hover:text-white bg-slate-800 rounded-lg text-xs flex items-center space-x-1"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                  <span>Refresh</span>
                </button>
              </h2>

              <div className="space-y-4 max-h-[500px] overflow-y-auto pr-2">
                {knowledgeData.documents.length === 0 ? (
                  <p className="text-xs text-slate-500 italic py-8 text-center">No documents ingested yet.</p>
                ) : (
                  knowledgeData.documents.map((doc) => {
                    const docAdus = knowledgeData.adus.filter((a) => a.documentId === doc.id);
                    return (
                      <div key={doc.id} className="bg-slate-950 border border-slate-800 rounded-lg p-4 space-y-3">
                        <div className="flex items-center justify-between">
                          <h3 className="text-sm font-semibold text-indigo-300">{doc.title}</h3>
                          <span className="px-2 py-0.5 bg-indigo-950 border border-indigo-800 text-indigo-400 text-[10px] rounded-full font-mono">
                            {doc.domain}
                          </span>
                        </div>
                        <p className="text-xs text-slate-400 font-mono whitespace-pre-wrap">{doc.content}</p>

                        <div className="border-t border-slate-800/80 pt-3 space-y-2">
                          <span className="text-[11px] font-medium text-slate-400">Extracted Atomic Discourse Units (ADUs):</span>
                          <div className="space-y-1.5">
                            {docAdus.map((adu) => (
                              <div key={adu.id} className="bg-slate-900/60 p-2 rounded border border-slate-800/50 text-xs flex items-start justify-between">
                                <div className="space-y-1">
                                  <span className="text-slate-200">"{adu.content}"</span>
                                  <div className="text-[10px] text-slate-500 font-mono">
                                    Lines {adu.startLine}-{adu.endLine} • Type: {adu.type} • Conf: {adu.confidence}
                                  </div>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          </div>
        )}

        {/* Knowledge Search Tab */}
        {activeTab === 'search' && (
          <div className="space-y-6">
            <KnowledgeSearchModal />
          </div>
        )}
        {activeTab === 'local-ingestion' && (
          <div className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Authorize Directory Form */}
              <div className="lg:col-span-1 bg-slate-900 border border-slate-800 rounded-xl p-6 space-y-4">
                <h2 className="text-base font-semibold text-white flex items-center space-x-2">
                  <FolderPlus className="w-5 h-5 text-indigo-400" />
                  <span>Authorize Local Directory</span>
                </h2>

                <form onSubmit={handleAddAuthorizedDir} className="space-y-4">
                  <div>
                    <label className="block text-xs font-medium text-slate-300 mb-1">Directory Absolute Path</label>
                    <input
                      type="text"
                      value={newDirPath}
                      onChange={(e) => setNewDirPath(e.target.value)}
                      placeholder="/path/to/docs or ./test-knowledge"
                      className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-sm text-slate-100 focus:outline-none focus:border-indigo-500 font-mono text-xs"
                      required
                    />
                    <p className="text-[10px] text-slate-500 mt-1">
                      Must be explicitly authorized. Full drive roots (e.g. C:\ or /) are strictly rejected.
                    </p>
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-slate-300 mb-1">Target Knowledge Namespace</label>
                    <input
                      type="text"
                      value={newDirNamespace}
                      onChange={(e) => setNewDirNamespace(e.target.value)}
                      placeholder="e.g. Aerospace, Embroidery, Codebase"
                      className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-sm text-slate-100 focus:outline-none focus:border-indigo-500 text-xs"
                      required
                    />
                  </div>

                  <div className="flex items-center space-x-2 pt-1">
                    <input
                      type="checkbox"
                      id="recursive"
                      checked={newDirRecursive}
                      onChange={(e) => setNewDirRecursive(e.target.checked)}
                      className="rounded border-slate-800 bg-slate-950 text-indigo-600 focus:ring-0"
                    />
                    <label htmlFor="recursive" className="text-xs text-slate-300">
                      Recursive Subdirectory Scan
                    </label>
                  </div>

                  <button
                    type="submit"
                    className="w-full py-2 px-4 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-sm font-medium transition-colors flex items-center justify-center space-x-2"
                  >
                    <FolderPlus className="w-4 h-4" />
                    <span>Authorize Directory</span>
                  </button>
                </form>

                {scanMessage && (
                  <div className="p-3 bg-slate-950 border border-slate-800 rounded-lg text-xs text-slate-300 font-mono">
                    {scanMessage}
                  </div>
                )}
              </div>

              {/* Authorized Roots & Controls */}
              <div className="lg:col-span-2 bg-slate-900 border border-slate-800 rounded-xl p-6 space-y-4">
                <div className="flex items-center justify-between">
                  <h2 className="text-base font-semibold text-white flex items-center space-x-2">
                    <Folder className="w-5 h-5 text-indigo-400" />
                    <span>Authorized Directories & Controls</span>
                  </h2>

                  <div className="flex items-center space-x-2">
                    <button
                      onClick={handleStartScan}
                      disabled={scanLoading}
                      className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-500 disabled:bg-slate-800 text-white rounded-lg text-xs font-medium flex items-center space-x-1 transition-colors"
                    >
                      <Play className="w-3.5 h-3.5" />
                      <span>{scanLoading ? 'Scanning...' : 'Start Manual Scan'}</span>
                    </button>

                    {localDirConfig?.watcherStatus?.active ? (
                      <button
                        onClick={() => handleWatcherAction('stop')}
                        className="px-3 py-1.5 bg-rose-600/80 hover:bg-rose-500 text-white rounded-lg text-xs font-medium flex items-center space-x-1 transition-colors"
                      >
                        <Square className="w-3.5 h-3.5" />
                        <span>Stop Watcher</span>
                      </button>
                    ) : (
                      <button
                        onClick={() => handleWatcherAction('start')}
                        className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-medium flex items-center space-x-1 transition-colors"
                      >
                        <Play className="w-3.5 h-3.5" />
                        <span>Start File Watcher</span>
                      </button>
                    )}
                  </div>
                </div>

                {/* Aggregate Status Cards */}
                <div className="grid grid-cols-2 md:grid-cols-6 gap-3 pt-2">
                  <div className="bg-slate-950 p-3 rounded-lg border border-slate-800 text-center">
                    <div className="text-xs text-slate-400 font-medium">Roots</div>
                    <div className="text-lg font-bold text-white mt-1">
                      {localDirConfig?.authorizedDirectoriesCount ?? 0}
                    </div>
                  </div>
                  <div className="bg-slate-950 p-3 rounded-lg border border-slate-800 text-center">
                    <div className="text-xs text-emerald-400 font-medium">Ingested</div>
                    <div className="text-lg font-bold text-white mt-1">
                      {localDirConfig?.counts?.ingested ?? 0}
                    </div>
                  </div>
                  <div className="bg-slate-950 p-3 rounded-lg border border-slate-800 text-center">
                    <div className="text-xs text-amber-400 font-medium">Duplicate</div>
                    <div className="text-lg font-bold text-white mt-1">
                      {localDirConfig?.counts?.duplicate ?? 0}
                    </div>
                  </div>
                  <div className="bg-slate-950 p-3 rounded-lg border border-slate-800 text-center">
                    <div className="text-xs text-slate-400 font-medium">Unchanged</div>
                    <div className="text-lg font-bold text-white mt-1">
                      {localDirConfig?.counts?.unchanged ?? 0}
                    </div>
                  </div>
                  <div className="bg-slate-950 p-3 rounded-lg border border-slate-800 text-center">
                    <div className="text-xs text-sky-400 font-medium">Deleted</div>
                    <div className="text-lg font-bold text-white mt-1">
                      {localDirConfig?.counts?.sourceDeleted ?? 0}
                    </div>
                  </div>
                  <div className="bg-slate-950 p-3 rounded-lg border border-slate-800 text-center">
                    <div className="text-xs text-rose-400 font-medium">Failed</div>
                    <div className="text-lg font-bold text-white mt-1">
                      {localDirConfig?.counts?.failed ?? 0}
                    </div>
                  </div>
                </div>

                {/* List of Authorized Directories */}
                <div className="space-y-2 pt-2">
                  <h3 className="text-xs font-semibold text-slate-300">Authorized Roots Boundary</h3>
                  {!localDirConfig?.authorizedDirectories || localDirConfig.authorizedDirectories.length === 0 ? (
                    <p className="text-xs text-slate-500 italic py-4 text-center">No authorized local directories configured yet.</p>
                  ) : (
                    localDirConfig.authorizedDirectories.map((dir) => (
                      <div key={dir.id} className="bg-slate-950 p-3 rounded-lg border border-slate-800 flex items-center justify-between text-xs">
                        <div className="space-y-0.5">
                          <div className="font-mono text-indigo-300 font-semibold">{dir.path}</div>
                          <div className="text-[10px] text-slate-400">
                            Namespace: <span className="text-amber-400 font-mono">{dir.namespace}</span> • Recursive: {dir.recursive ? 'Yes' : 'No'}
                          </div>
                        </div>
                        <button
                          onClick={() => handleRemoveAuthorizedDir(dir.id)}
                          className="px-2 py-1 bg-rose-950/80 hover:bg-rose-900 border border-rose-800 text-rose-300 text-[10px] rounded transition-colors"
                        >
                          Revoke Access
                        </button>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Epistemic Reasoning Tab */}
        {activeTab === 'reasoning' && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-1 bg-slate-900 border border-slate-800 rounded-xl p-6 space-y-4">
              <h2 className="text-base font-semibold text-white flex items-center space-x-2">
                <BrainCircuit className="w-5 h-5 text-amber-400" />
                <span>Formulate Epistemic Intention</span>
              </h2>

              <form onSubmit={handleReasoning} className="space-y-4">
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">Task Prompt</label>
                  <textarea
                    rows={4}
                    value={prompt}
                    onChange={(e) => setPrompt(e.target.value)}
                    placeholder="e.g. Calibrate pressure regulator to 100Hz according to specs"
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-sm text-slate-100 focus:outline-none focus:border-amber-500 text-xs"
                    required
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">Target Domain</label>
                  <select
                    value={reasoningDomain}
                    onChange={(e) => setReasoningDomain(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-sm text-slate-100 focus:outline-none focus:border-amber-500 text-xs"
                  >
                    <option value="Aerospace">Aerospace</option>
                    <option value="Embroidery">Embroidery</option>
                    <option value="Medical">Medical</option>
                    <option value="Security">Security</option>
                  </select>
                </div>

                <button
                  type="submit"
                  disabled={reasoningLoading}
                  className="w-full py-2 px-4 bg-amber-600 hover:bg-amber-500 disabled:bg-slate-800 text-white rounded-lg text-sm font-medium transition-colors flex items-center justify-center space-x-2"
                >
                  {reasoningLoading ? (
                    <>
                      <RefreshCw className="w-4 h-4 animate-spin" />
                      <span>Reasoning & Validating...</span>
                    </>
                  ) : (
                    <span>Execute Epistemic Reasoning</span>
                  )}
                </button>
              </form>
            </div>

            <div className="lg:col-span-2 bg-slate-900 border border-slate-800 rounded-xl p-6 space-y-4">
              <h2 className="text-base font-semibold text-white flex items-center space-x-2">
                <ShieldAlert className="w-5 h-5 text-indigo-400" />
                <span>Formulated Intention & Governance Review</span>
              </h2>

              {!reasoningResult ? (
                <p className="text-xs text-slate-500 italic py-12 text-center">Submit a reasoning task to formulate an intention.</p>
              ) : (
                <div className="bg-slate-950 border border-slate-800 rounded-lg p-5 space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <span className="text-xs text-slate-400">Provider Used: </span>
                      <span className="text-xs font-semibold text-amber-400">{reasoningResult.providerUsed}</span>
                    </div>
                    <span className={`px-2 py-0.5 text-[10px] rounded-full font-mono font-bold ${
                      reasoningResult.intention.status === 'AWAITING_APPROVAL'
                        ? 'bg-amber-950 text-amber-400 border border-amber-800'
                        : reasoningResult.intention.status === 'EXECUTED'
                        ? 'bg-emerald-950 text-emerald-400 border border-emerald-800'
                        : 'bg-rose-950 text-rose-400 border border-rose-800'
                    }`}>
                      {reasoningResult.intention.status}
                    </span>
                  </div>

                  <div className="space-y-2">
                    <h4 className="text-xs font-semibold text-slate-300">Problem Decomposition:</h4>
                    <ul className="list-disc list-inside text-xs text-slate-400 space-y-1">
                      {reasoningResult.intention.cognitiveAnalysis.problemDecomposition.map((step: string, idx: number) => (
                        <li key={idx}>{step}</li>
                      ))}
                    </ul>
                  </div>

                  <div className="space-y-2">
                    <h4 className="text-xs font-semibold text-slate-300">Proposed Consequential Actions:</h4>
                    {reasoningResult.intention.proposedActions.map((act: any) => (
                      <div key={act.id} className="bg-slate-900 p-3 rounded-lg border border-slate-800 space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-mono text-indigo-300">{act.toolName}</span>
                          <span className="text-[10px] text-rose-400 bg-rose-950/80 border border-rose-800 px-2 py-0.5 rounded">
                            Consequential Action
                          </span>
                        </div>
                        <p className="text-xs text-slate-400">{act.justification}</p>

                        {reasoningResult.intention.status === 'AWAITING_APPROVAL' && (
                          <div className="flex items-center space-x-2 pt-2">
                            <button
                              onClick={() => handleApproval(reasoningResult.intention.id, act.id, true)}
                              className="px-3 py-1 bg-emerald-600 hover:bg-emerald-500 text-white rounded text-xs font-medium flex items-center space-x-1"
                            >
                              <CheckCircle2 className="w-3.5 h-3.5" />
                              <span>Approve Execution</span>
                            </button>
                            <button
                              onClick={() => handleApproval(reasoningResult.intention.id, act.id, false)}
                              className="px-3 py-1 bg-rose-600 hover:bg-rose-500 text-white rounded text-xs font-medium flex items-center space-x-1"
                            >
                              <XCircle className="w-3.5 h-3.5" />
                              <span>Reject Execution</span>
                            </button>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Runtime Graph Tab */}
        {activeTab === 'graph' && (
          <div className="space-y-4">
            <GraphViewer
              nodes={graphData.nodes}
              edges={graphData.edges}
              onRefresh={fetchGraph}
            />
          </div>
        )}
      </main>
    </div>
  );
}
