import React, { useState } from 'react';
import {
  Network,
  GitCommit,
  Layers,
  ArrowRight,
  Filter,
  Search,
  ExternalLink,
  Shield,
  Activity,
  Maximize2,
} from 'lucide-react';
import {
  GraphNode,
  GraphEdge,
  GraphNodeType,
  GraphEdgeType,
  LineageResult,
} from '../core/types';

interface GraphViewerProps {
  nodes: GraphNode[];
  edges: GraphEdge[];
  onTraceLineage: (nodeId: string) => Promise<LineageResult | null>;
}

export const GraphViewer: React.FC<GraphViewerProps> = ({ nodes, edges, onTraceLineage }) => {
  const [selectedNode, setSelectedNode] = useState<GraphNode | null>(nodes[0] || null);
  const [lineage, setLineage] = useState<LineageResult | null>(null);
  const [filterType, setFilterType] = useState<string>('ALL');
  const [search, setSearch] = useState<string>('');

  const filteredNodes = nodes.filter((n) => {
    const matchesType = filterType === 'ALL' || n.type === filterType;
    const matchesSearch =
      search === '' ||
      n.label.toLowerCase().includes(search.toLowerCase()) ||
      n.id.toLowerCase().includes(search.toLowerCase());
    return matchesType && matchesSearch;
  });

  const handleSelectNode = async (node: GraphNode) => {
    setSelectedNode(node);
    const lin = await onTraceLineage(node.id);
    setLineage(lin);
  };

  const getNodeColor = (type: GraphNodeType) => {
    switch (type) {
      case GraphNodeType.ADU:
        return 'bg-blue-950/80 text-blue-300 border-blue-600';
      case GraphNodeType.CONCEPT:
        return 'bg-purple-950/80 text-purple-300 border-purple-600';
      case GraphNodeType.ENTITY:
        return 'bg-indigo-950/80 text-indigo-300 border-indigo-600';
      case GraphNodeType.DECISION:
        return 'bg-amber-950/80 text-amber-300 border-amber-600';
      case GraphNodeType.ACTION:
        return 'bg-rose-950/80 text-rose-300 border-rose-600';
      case GraphNodeType.EXECUTION_RESULT:
        return 'bg-emerald-950/80 text-emerald-300 border-emerald-600';
      case GraphNodeType.SOURCE_DOCUMENT:
        return 'bg-slate-800 text-slate-200 border-slate-600';
      default:
        return 'bg-slate-900 text-slate-300 border-slate-700';
    }
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
      {/* Node Catalog & Interactive Filter */}
      <div className="lg:col-span-4 space-y-4">
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-200 uppercase tracking-wider">
              RuntimeGraph Nodes ({filteredNodes.length})
            </span>
            <span className="text-xs text-slate-400 font-mono">
              {edges.length} Edges
            </span>
          </div>

          {/* Filter Types */}
          <div className="flex items-center space-x-2">
            <Filter className="w-3.5 h-3.5 text-slate-500" />
            <select
              value={filterType}
              onChange={(e) => setFilterType(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded-lg p-1.5 text-xs text-slate-200 focus:outline-none font-mono"
            >
              <option value="ALL">All Node Types</option>
              {Object.values(GraphNodeType).map((t) => (
                <option key={t} value={t}>
                  {t}
                </option>
              ))}
            </select>
          </div>

          <input
            type="text"
            placeholder="Search nodes..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2 text-xs text-slate-200 placeholder-slate-500 focus:outline-none"
          />
        </div>

        {/* Node Stream */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl divide-y divide-slate-800/60 max-h-[550px] overflow-y-auto">
          {filteredNodes.map((n) => {
            const isSelected = selectedNode?.id === n.id;
            return (
              <button
                key={n.id}
                onClick={() => handleSelectNode(n)}
                className={`w-full text-left p-3 transition flex items-start justify-between ${
                  isSelected
                    ? 'bg-indigo-950/40 border-l-2 border-indigo-500'
                    : 'hover:bg-slate-800/40'
                }`}
              >
                <div className="space-y-1 overflow-hidden pr-2">
                  <div className="flex items-center space-x-2">
                    <span
                      className={`text-[9px] font-mono px-1.5 py-0.2 rounded border font-semibold ${getNodeColor(
                        n.type
                      )}`}
                    >
                      {n.type}
                    </span>
                    <span className="text-xs font-medium text-slate-200 truncate block">
                      {n.label}
                    </span>
                  </div>
                  <span className="text-[10px] text-slate-400 font-mono block">
                    ID: {n.id} (v{n.version})
                  </span>
                </div>
              </button>
            );
          })}

          {filteredNodes.length === 0 && (
            <div className="p-8 text-center text-xs text-slate-500">
              No nodes matching filter.
            </div>
          )}
        </div>
      </div>

      {/* Main Panel: Node Details & Lineage Trace */}
      <div className="lg:col-span-8 space-y-4">
        {selectedNode ? (
          <>
            {/* Node Inspector Card */}
            <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 space-y-4">
              <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                <div className="flex items-center space-x-2.5">
                  <span
                    className={`text-xs font-mono px-2.5 py-0.5 rounded-full border font-bold ${getNodeColor(
                      selectedNode.type
                    )}`}
                  >
                    {selectedNode.type}
                  </span>
                  <h2 className="text-base font-semibold text-slate-100">
                    {selectedNode.label}
                  </h2>
                </div>
                <div className="text-right text-xs text-slate-400 font-mono">
                  <span>Version: {selectedNode.version}</span>
                </div>
              </div>

              {/* Node Properties */}
              <div>
                <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider block mb-2 text-[10px]">
                  Node Properties & Epistemic Payload
                </span>
                <div className="bg-slate-950 p-3 rounded-lg border border-slate-800 text-xs font-mono text-slate-300 overflow-x-auto">
                  <pre>{JSON.stringify(selectedNode.properties, null, 2)}</pre>
                </div>
              </div>

              {/* Strict Provenance Attribution */}
              <div>
                <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider block mb-2 text-[10px]">
                  Provenance & Epistemic Source Lineage
                </span>
                <div className="bg-slate-950/60 p-3 rounded-lg border border-slate-800/80 space-y-2 text-xs">
                  <div className="grid grid-cols-2 gap-2 text-slate-300">
                    <div>
                      <span className="text-slate-400 text-[10px] block">Source ID:</span>
                      <span className="font-mono">{selectedNode.provenance.sourceId}</span>
                    </div>
                    <div>
                      <span className="text-slate-400 text-[10px] block">Source Type:</span>
                      <span className="font-mono">{selectedNode.provenance.sourceType}</span>
                    </div>
                    <div>
                      <span className="text-slate-400 text-[10px] block">Extraction Stage:</span>
                      <span className="font-mono">{selectedNode.provenance.extractionStage}</span>
                    </div>
                    <div>
                      <span className="text-slate-400 text-[10px] block">Timestamp:</span>
                      <span className="font-mono text-[11px]">
                        {new Date(selectedNode.provenance.timestamp).toLocaleString()}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Lineage Trace (Ancestors & Descendants) */}
            <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 space-y-4">
              <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                <div className="flex items-center space-x-2">
                  <GitCommit className="w-4 h-4 text-indigo-400" />
                  <h3 className="text-xs font-semibold text-slate-200 uppercase tracking-wider">
                    Full Graph Lineage Trace
                  </h3>
                </div>
                <span className="text-[11px] text-slate-400 font-mono">
                  {lineage?.ancestors.length || 0} Ancestors • {lineage?.descendants.length || 0}{' '}
                  Descendants
                </span>
              </div>

              {lineage && lineage.ancestors.length > 0 ? (
                <div className="space-y-2">
                  <span className="text-[10px] text-slate-400 font-semibold uppercase block">
                    Preceding Ancestors (Derivations / Supports):
                  </span>
                  <div className="space-y-1.5">
                    {lineage.ancestors.map((anc) => (
                      <div
                        key={anc.id}
                        onClick={() => handleSelectNode(anc)}
                        className="p-2.5 rounded-lg bg-slate-950 border border-slate-800/80 hover:bg-slate-800/50 cursor-pointer flex items-center justify-between transition"
                      >
                        <div className="flex items-center space-x-2">
                          <span
                            className={`text-[9px] font-mono px-1.5 py-0.2 rounded border ${getNodeColor(
                              anc.type
                            )}`}
                          >
                            {anc.type}
                          </span>
                          <span className="text-xs text-slate-200 font-medium">{anc.label}</span>
                        </div>
                        <ArrowRight className="w-3.5 h-3.5 text-slate-500" />
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="p-4 text-center text-xs text-slate-500 bg-slate-950/40 rounded-lg">
                  No upstream ancestor nodes for this entity.
                </div>
              )}
            </div>
          </>
        ) : (
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-12 text-center">
            <Network className="w-8 h-8 text-slate-600 mx-auto mb-3" />
            <h3 className="text-sm font-medium text-slate-300">Select a Graph Node</h3>
            <p className="text-xs text-slate-500 mt-1">
              Select any node from the catalog to inspect properties and trace epistemic lineage.
            </p>
          </div>
        )}
      </div>
    </div>
  );
};
