import React, { useState, useEffect, useRef, useMemo } from 'react';
import {
  Network,
  GitCommit,
  Layers,
  ArrowRight,
  Filter,
  Search,
  Maximize2,
  Minimize2,
  RotateCcw,
  ZoomIn,
  ZoomOut,
  FileText,
  Brain,
  ShieldCheck,
  CheckCircle2,
  X,
  ExternalLink,
  Table,
  Eye,
  Activity,
  ChevronRight,
  Zap
} from 'lucide-react';
import {
  GraphNode,
  GraphEdge,
  GraphNodeType,
  GraphEdgeType,
} from '../core/types';

export interface LineageResult {
  nodeId: string;
  ancestors: GraphNode[];
  descendants: GraphNode[];
}

interface GraphViewerProps {
  nodes: GraphNode[];
  edges: GraphEdge[];
  onTraceLineage?: (nodeId: string) => Promise<LineageResult | null>;
  onRefresh?: () => void;
}

interface NodePosition {
  x: number;
  y: number;
  vx: number;
  vy: number;
}

export const GraphViewer: React.FC<GraphViewerProps> = ({
  nodes,
  edges,
  onTraceLineage,
  onRefresh
}) => {
  const [viewMode, setViewMode] = useState<'canvas' | 'table'>('canvas');
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(
    nodes.length > 0 ? nodes[0].id : null
  );
  const [filterType, setFilterType] = useState<string>('ALL');
  const [search, setSearch] = useState<string>('');
  const [lineage, setLineage] = useState<LineageResult | null>(null);
  const [loadingLineage, setLoadingLineage] = useState<boolean>(false);

  // SVG Pan & Zoom State
  const [zoom, setZoom] = useState<number>(1);
  const [pan, setPan] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [isPanning, setIsPanning] = useState<boolean>(false);
  const [startPan, setStartPan] = useState<{ x: number; y: number }>({ x: 0, y: 0 });

  // Node Dragging State
  const [draggedNodeId, setDraggedNodeId] = useState<string | null>(null);

  // Physics Simulation Node Positions
  const [positions, setPositions] = useState<Record<string, NodePosition>>({});

  const containerRef = useRef<HTMLDivElement>(null);

  // Filtered nodes based on type and search
  const filteredNodes = useMemo(() => {
    return nodes.filter((n) => {
      const matchesType = filterType === 'ALL' || n.type === filterType;
      const matchesSearch =
        search === '' ||
        n.label.toLowerCase().includes(search.toLowerCase()) ||
        n.id.toLowerCase().includes(search.toLowerCase());
      return matchesType && matchesSearch;
    });
  }, [nodes, filterType, search]);

  const filteredNodeIds = useMemo(() => {
    return new Set(filteredNodes.map((n) => n.id));
  }, [filteredNodes]);

  const filteredEdges = useMemo(() => {
    return edges.filter(
      (e) => filteredNodeIds.has(e.sourceId) && filteredNodeIds.has(e.targetId)
    );
  }, [edges, filteredNodeIds]);

  // Selected Node
  const selectedNode = useMemo(() => {
    return nodes.find((n) => n.id === selectedNodeId) || null;
  }, [nodes, selectedNodeId]);

  // Direct Connections for Selected Node
  const connectedEdgeIds = useMemo(() => {
    if (!selectedNodeId) return new Set<string>();
    const set = new Set<string>();
    edges.forEach((e) => {
      if (e.sourceId === selectedNodeId || e.targetId === selectedNodeId) {
        set.add(e.id);
      }
    });
    return set;
  }, [edges, selectedNodeId]);

  const connectedNodeIds = useMemo(() => {
    if (!selectedNodeId) return new Set<string>();
    const set = new Set<string>([selectedNodeId]);
    edges.forEach((e) => {
      if (e.sourceId === selectedNodeId) set.add(e.targetId);
      if (e.targetId === selectedNodeId) set.add(e.sourceId);
    });
    return set;
  }, [edges, selectedNodeId]);

  // Initialize Force Layout Positions
  useEffect(() => {
    if (nodes.length === 0) return;

    const newPositions: Record<string, NodePosition> = {};
    const width = 800;
    const height = 500;
    const radius = Math.min(width, height) * 0.35;

    nodes.forEach((node, idx) => {
      if (positions[node.id]) {
        newPositions[node.id] = positions[node.id];
      } else {
        // Arrange initially in circular or tiered clusters
        const angle = (idx / nodes.length) * 2 * Math.PI;
        const jitterX = (Math.random() - 0.5) * 40;
        const jitterY = (Math.random() - 0.5) * 40;
        newPositions[node.id] = {
          x: width / 2 + Math.cos(angle) * radius + jitterX,
          y: height / 2 + Math.sin(angle) * radius + jitterY,
          vx: 0,
          vy: 0,
        };
      }
    });

    setPositions(newPositions);
  }, [nodes]);

  // Simple Spring Force Layout Simulation Tick
  useEffect(() => {
    if (Object.keys(positions).length === 0) return;

    let animId: number;
    let iteration = 0;
    const maxIterations = 80;

    const step = () => {
      if (iteration >= maxIterations) return;
      iteration++;

      setPositions((prev) => {
        const next = { ...prev };
        const kRepulsion = 12000;
        const kAttraction = 0.05;
        const damping = 0.85;

        // Repulsion between all nodes
        const keys = Object.keys(next);
        for (let i = 0; i < keys.length; i++) {
          const idA = keys[i];
          const posA = next[idA];
          if (!posA) continue;

          for (let j = i + 1; j < keys.length; j++) {
            const idB = keys[j];
            const posB = next[idB];
            if (!posB) continue;

            const dx = posB.x - posA.x;
            const dy = posB.y - posA.y;
            const distSq = dx * dx + dy * dy + 10;
            const dist = Math.sqrt(distSq);

            const force = kRepulsion / distSq;
            const fx = (dx / dist) * force;
            const fy = (dy / dist) * force;

            if (idA !== draggedNodeId) {
              posA.vx -= fx;
              posA.vy -= fy;
            }
            if (idB !== draggedNodeId) {
              posB.vx += fx;
              posB.vy += fy;
            }
          }
        }

        // Attraction along edges
        edges.forEach((edge) => {
          const posA = next[edge.sourceId];
          const posB = next[edge.targetId];
          if (!posA || !posB) return;

          const dx = posB.x - posA.x;
          const dy = posB.y - posA.y;
          const dist = Math.sqrt(dx * dx + dy * dy) || 1;

          const force = (dist - 120) * kAttraction;
          const fx = (dx / dist) * force;
          const fy = (dy / dist) * force;

          if (edge.sourceId !== draggedNodeId) {
            posA.vx += fx;
            posA.vy += fy;
          }
          if (edge.targetId !== draggedNodeId) {
            posB.vx -= fx;
            posB.vy -= fy;
          }
        });

        // Center gravity and update position
        keys.forEach((id) => {
          if (id === draggedNodeId) return;
          const pos = next[id];
          if (!pos) return;

          // Pull to center
          pos.vx += (400 - pos.x) * 0.005;
          pos.vy += (250 - pos.y) * 0.005;

          pos.vx *= damping;
          pos.vy *= damping;

          pos.x += pos.vx;
          pos.y += pos.vy;

          // Bounding box
          pos.x = Math.max(60, Math.min(740, pos.x));
          pos.y = Math.max(60, Math.min(440, pos.y));
        });

        return next;
      });

      animId = requestAnimationFrame(step);
    };

    step();

    return () => cancelAnimationFrame(animId);
  }, [edges, draggedNodeId]);

  // Load Lineage when node selected
  useEffect(() => {
    if (!selectedNodeId) {
      setLineage(null);
      return;
    }

    if (onTraceLineage) {
      setLoadingLineage(true);
      onTraceLineage(selectedNodeId)
        .then((res) => {
          setLineage(res);
        })
        .catch((err) => {
          console.error('Failed to trace lineage:', err);
          setLineage(null);
        })
        .finally(() => setLoadingLineage(false));
    } else {
      // Local fallback calculation for lineage
      const ancestors: GraphNode[] = [];
      const descendants: GraphNode[] = [];

      const getUpstream = (id: string, visited = new Set<string>()) => {
        edges.forEach((e) => {
          if (e.targetId === id && !visited.has(e.sourceId)) {
            visited.add(e.sourceId);
            const parent = nodes.find((n) => n.id === e.sourceId);
            if (parent) {
              ancestors.push(parent);
              getUpstream(parent.id, visited);
            }
          }
        });
      };

      const getDownstream = (id: string, visited = new Set<string>()) => {
        edges.forEach((e) => {
          if (e.sourceId === id && !visited.has(e.targetId)) {
            visited.add(e.targetId);
            const child = nodes.find((n) => n.id === e.targetId);
            if (child) {
              descendants.push(child);
              getDownstream(child.id, visited);
            }
          }
        });
      };

      getUpstream(selectedNodeId);
      getDownstream(selectedNodeId);

      setLineage({
        nodeId: selectedNodeId,
        ancestors,
        descendants,
      });
    }
  }, [selectedNodeId, nodes, edges, onTraceLineage]);

  // Handle Pan Canvas
  const handleMouseDownCanvas = (e: React.MouseEvent) => {
    if ((e.target as HTMLElement).tagName === 'svg' || (e.target as HTMLElement).id === 'graph-bg') {
      setIsPanning(true);
      setStartPan({ x: e.clientX - pan.x, y: e.clientY - pan.y });
    }
  };

  const handleMouseMoveCanvas = (e: React.MouseEvent) => {
    if (isPanning) {
      setPan({ x: e.clientX - startPan.x, y: e.clientY - startPan.y });
    } else if (draggedNodeId && containerRef.current) {
      const rect = containerRef.current.getBoundingClientRect();
      const rawX = (e.clientX - rect.left - pan.x) / zoom;
      const rawY = (e.clientY - rect.top - pan.y) / zoom;

      setPositions((prev) => ({
        ...prev,
        [draggedNodeId]: {
          ...prev[draggedNodeId],
          x: Math.max(30, Math.min(770, rawX)),
          y: Math.max(30, Math.min(470, rawY)),
          vx: 0,
          vy: 0,
        },
      }));
    }
  };

  const handleMouseUpCanvas = () => {
    setIsPanning(false);
    setDraggedNodeId(null);
  };

  // Node Color Helper
  const getNodeColorConfig = (type: GraphNodeType) => {
    switch (type) {
      case GraphNodeType.DOCUMENT:
        return {
          bg: '#1e293b',
          stroke: '#64748b',
          text: '#f8fafc',
          badge: 'bg-slate-800 text-slate-300 border-slate-700',
          fill: '#334155'
        };
      case GraphNodeType.ADU:
        return {
          bg: '#1e3a8a',
          stroke: '#3b82f6',
          text: '#93c5fd',
          badge: 'bg-blue-950 text-blue-300 border-blue-800',
          fill: '#2563eb'
        };
      case GraphNodeType.CONCEPT:
        return {
          bg: '#581c87',
          stroke: '#a855f7',
          text: '#e9d5ff',
          badge: 'bg-purple-950 text-purple-300 border-purple-800',
          fill: '#9333ea'
        };
      case GraphNodeType.INTENTION:
        return {
          bg: '#78350f',
          stroke: '#f59e0b',
          text: '#fde68a',
          badge: 'bg-amber-950 text-amber-300 border-amber-800',
          fill: '#d97706'
        };
      case GraphNodeType.ACTION:
        return {
          bg: '#881337',
          stroke: '#f43f5e',
          text: '#fecdd3',
          badge: 'bg-rose-950 text-rose-300 border-rose-800',
          fill: '#e11d48'
        };
      case GraphNodeType.RESULT:
        return {
          bg: '#064e3b',
          stroke: '#10b981',
          text: '#a7f3d0',
          badge: 'bg-emerald-950 text-emerald-300 border-emerald-800',
          fill: '#059669'
        };
      default:
        return {
          bg: '#0f172a',
          stroke: '#475569',
          text: '#cbd5e1',
          badge: 'bg-slate-900 text-slate-400 border-slate-800',
          fill: '#475569'
        };
    }
  };

  return (
    <div className="space-y-4">
      {/* Header Toolbar */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 flex flex-col md:flex-row md:items-center justify-between gap-4">
        {/* Search & Filter */}
        <div className="flex flex-wrap items-center gap-3">
          <div className="relative">
            <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-slate-500" />
            <input
              type="text"
              placeholder="Search graph nodes..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="bg-slate-950 border border-slate-800 rounded-lg pl-8 pr-3 py-1.5 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-indigo-500 w-48"
            />
          </div>

          <div className="flex items-center space-x-1.5 bg-slate-950 border border-slate-800 rounded-lg px-2 py-1">
            <Filter className="w-3.5 h-3.5 text-slate-500" />
            <select
              value={filterType}
              onChange={(e) => setFilterType(e.target.value)}
              className="bg-transparent text-xs text-slate-300 focus:outline-none font-mono"
            >
              <option value="ALL">All Types</option>
              {Object.values(GraphNodeType).map((type) => (
                <option key={type} value={type}>
                  {type}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* View Mode & Zoom Controls */}
        <div className="flex items-center space-x-2">
          {viewMode === 'canvas' && (
            <div className="flex items-center space-x-1 bg-slate-950 border border-slate-800 rounded-lg p-1">
              <button
                onClick={() => setZoom((z) => Math.min(z + 0.2, 2.5))}
                className="p-1 text-slate-400 hover:text-white transition"
                title="Zoom In"
              >
                <ZoomIn className="w-3.5 h-3.5" />
              </button>
              <span className="text-[10px] text-slate-500 font-mono px-1">
                {Math.round(zoom * 100)}%
              </span>
              <button
                onClick={() => setZoom((z) => Math.max(z - 0.2, 0.4))}
                className="p-1 text-slate-400 hover:text-white transition"
                title="Zoom Out"
              >
                <ZoomOut className="w-3.5 h-3.5" />
              </button>
              <button
                onClick={() => {
                  setZoom(1);
                  setPan({ x: 0, y: 0 });
                }}
                className="p-1 text-slate-400 hover:text-white transition"
                title="Reset View"
              >
                <RotateCcw className="w-3.5 h-3.5" />
              </button>
            </div>
          )}

          {/* Toggle View Mode */}
          <div className="flex items-center p-1 bg-slate-950 border border-slate-800 rounded-lg">
            <button
              onClick={() => setViewMode('canvas')}
              className={`px-2.5 py-1 text-xs font-medium rounded transition flex items-center space-x-1 ${
                viewMode === 'canvas'
                  ? 'bg-indigo-600 text-white'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Network className="w-3.5 h-3.5" />
              <span>Interactive Graph</span>
            </button>
            <button
              onClick={() => setViewMode('table')}
              className={`px-2.5 py-1 text-xs font-medium rounded transition flex items-center space-x-1 ${
                viewMode === 'table'
                  ? 'bg-indigo-600 text-white'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Table className="w-3.5 h-3.5" />
              <span>Data Catalog</span>
            </button>
          </div>
        </div>
      </div>

      {/* Main View Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Interactive Canvas or Table View */}
        <div className="lg:col-span-8 bg-slate-900 border border-slate-800 rounded-xl overflow-hidden relative min-h-[520px] flex flex-col">
          {viewMode === 'canvas' ? (
            <div
              ref={containerRef}
              className="relative flex-1 bg-slate-950 overflow-hidden cursor-grab active:cursor-grabbing select-none"
              onMouseDown={handleMouseDownCanvas}
              onMouseMove={handleMouseMoveCanvas}
              onMouseUp={handleMouseUpCanvas}
            >
              {/* SVG Canvas */}
              <svg
                id="graph-bg"
                className="w-full h-full absolute inset-0"
                style={{
                  backgroundImage:
                    'radial-gradient(circle, rgba(51, 65, 85, 0.25) 1px, transparent 1px)',
                  backgroundSize: '24px 24px',
                }}
              >
                <g
                  transform={`translate(${pan.x}, ${pan.y}) scale(${zoom})`}
                  className="transition-transform duration-75"
                >
                  {/* Arrow Marker Definitions */}
                  <defs>
                    <marker
                      id="arrow"
                      viewBox="0 0 10 10"
                      refX="22"
                      refY="5"
                      markerWidth="6"
                      markerHeight="6"
                      orient="auto-start-reverse"
                    >
                      <path d="M 0 0 L 10 5 L 0 10 z" fill="#64748b" />
                    </marker>
                    <marker
                      id="arrow-active"
                      viewBox="0 0 10 10"
                      refX="22"
                      refY="5"
                      markerWidth="6"
                      markerHeight="6"
                      orient="auto-start-reverse"
                    >
                      <path d="M 0 0 L 10 5 L 0 10 z" fill="#818cf8" />
                    </marker>
                  </defs>

                  {/* Edges */}
                  {filteredEdges.map((edge) => {
                    const posSource = positions[edge.sourceId];
                    const posTarget = positions[edge.targetId];
                    if (!posSource || !posTarget) return null;

                    const isConnected =
                      connectedEdgeIds.has(edge.id) ||
                      edge.sourceId === selectedNodeId ||
                      edge.targetId === selectedNodeId;

                    return (
                      <g key={edge.id} className="group">
                        <line
                          x1={posSource.x}
                          y1={posSource.y}
                          x2={posTarget.x}
                          y2={posTarget.y}
                          stroke={isConnected ? '#818cf8' : '#334155'}
                          strokeWidth={isConnected ? 2 : 1}
                          strokeDasharray={
                            edge.type === GraphEdgeType.CONTRADICTS ? '4,4' : undefined
                          }
                          markerEnd={isConnected ? 'url(#arrow-active)' : 'url(#arrow)'}
                          className="transition-all"
                        />
                        {/* Edge Label on hover / connected */}
                        {isConnected && (
                          <text
                            x={(posSource.x + posTarget.x) / 2}
                            y={(posSource.y + posTarget.y) / 2 - 6}
                            fill="#a5b4fc"
                            fontSize="9"
                            fontFamily="monospace"
                            textAnchor="middle"
                            className="pointer-events-none select-none bg-slate-900"
                          >
                            {edge.type}
                          </text>
                        )}
                      </g>
                    );
                  })}

                  {/* Nodes */}
                  {filteredNodes.map((node) => {
                    const pos = positions[node.id];
                    if (!pos) return null;

                    const isSelected = selectedNodeId === node.id;
                    const isConnected = connectedNodeIds.has(node.id);
                    const isDimmed = selectedNodeId && !isConnected;

                    const colors = getNodeColorConfig(node.type);

                    return (
                      <g
                        key={node.id}
                        transform={`translate(${pos.x}, ${pos.y})`}
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedNodeId(node.id);
                        }}
                        onMouseDown={(e) => {
                          e.stopPropagation();
                          setDraggedNodeId(node.id);
                        }}
                        className="cursor-pointer transition-opacity duration-200"
                        style={{ opacity: isDimmed ? 0.35 : 1 }}
                      >
                        {/* Selected Glowing Ring */}
                        {isSelected && (
                          <circle
                            r="26"
                            fill="none"
                            stroke="#818cf8"
                            strokeWidth="2.5"
                            className="animate-pulse"
                          />
                        )}

                        {/* Outer Circle */}
                        <circle
                          r="18"
                          fill={colors.bg}
                          stroke={isSelected ? '#a5b4fc' : colors.stroke}
                          strokeWidth={isSelected ? '2.5' : '1.5'}
                          className="hover:scale-110 transition-transform"
                        />

                        {/* Center Icon Indicator */}
                        <circle r="6" fill={colors.fill} />

                        {/* Node Label Text */}
                        <text
                          y="32"
                          fill={isSelected ? '#ffffff' : colors.text}
                          fontSize="11"
                          fontWeight={isSelected ? '700' : '500'}
                          textAnchor="middle"
                          className="pointer-events-none select-none font-sans drop-shadow-sm"
                        >
                          {node.label.length > 20
                            ? `${node.label.substring(0, 18)}...`
                            : node.label}
                        </text>

                        {/* Type Badge */}
                        <text
                          y="43"
                          fill="#64748b"
                          fontSize="8"
                          fontFamily="monospace"
                          textAnchor="middle"
                          className="pointer-events-none select-none uppercase"
                        >
                          {node.type}
                        </text>
                      </g>
                    );
                  })}
                </g>
              </svg>

              {/* Quick Canvas Overlay Info */}
              <div className="absolute bottom-3 left-3 bg-slate-900/90 backdrop-blur border border-slate-800 rounded-lg px-3 py-1.5 text-[11px] text-slate-400 font-mono flex items-center space-x-3">
                <span>
                  Nodes: <strong className="text-slate-200">{filteredNodes.length}</strong>
                </span>
                <span>•</span>
                <span>
                  Edges: <strong className="text-slate-200">{filteredEdges.length}</strong>
                </span>
                <span>•</span>
                <span className="text-indigo-400">Click node to inspect</span>
              </div>
            </div>
          ) : (
            /* Data Catalog Table View */
            <div className="p-4 flex-1 overflow-y-auto max-h-[520px]">
              <div className="border border-slate-800 rounded-lg overflow-hidden">
                <table className="w-full text-left text-xs font-sans">
                  <thead className="bg-slate-950 text-slate-400 border-b border-slate-800 uppercase text-[10px] tracking-wider">
                    <tr>
                      <th className="p-3">Type</th>
                      <th className="p-3">Node Label</th>
                      <th className="p-3">ID</th>
                      <th className="p-3">Provenance Source</th>
                      <th className="p-3 text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60 bg-slate-900">
                    {filteredNodes.map((node) => {
                      const colors = getNodeColorConfig(node.type);
                      const isSelected = selectedNodeId === node.id;
                      return (
                        <tr
                          key={node.id}
                          className={`hover:bg-slate-800/40 transition ${
                            isSelected ? 'bg-indigo-950/30' : ''
                          }`}
                        >
                          <td className="p-3">
                            <span
                              className={`text-[9px] font-mono px-2 py-0.5 rounded border font-semibold ${colors.badge}`}
                            >
                              {node.type}
                            </span>
                          </td>
                          <td className="p-3 font-medium text-slate-200">{node.label}</td>
                          <td className="p-3 font-mono text-[10px] text-slate-500">{node.id}</td>
                          <td className="p-3 text-slate-400 font-mono text-[11px]">
                            {node.provenance?.sourceTitle || node.provenance?.sourceUri || 'Engine'}
                          </td>
                          <td className="p-3 text-right">
                            <button
                              onClick={() => setSelectedNodeId(node.id)}
                              className="px-2 py-1 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded text-[10px] font-mono transition"
                            >
                              Inspect
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>

        {/* Right Sidebar: Selected Node Inspector & Lineage Trace */}
        <div className="lg:col-span-4 space-y-4">
          {selectedNode ? (
            <>
              {/* Node Properties Card */}
              <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 space-y-4">
                <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                  <div className="space-y-1">
                    <span
                      className={`text-[10px] font-mono px-2 py-0.5 rounded border font-semibold ${
                        getNodeColorConfig(selectedNode.type).badge
                      }`}
                    >
                      {selectedNode.type}
                    </span>
                    <h3 className="text-sm font-bold text-slate-100">{selectedNode.label}</h3>
                  </div>
                  <button
                    onClick={() => setSelectedNodeId(null)}
                    className="p-1 text-slate-500 hover:text-slate-300 rounded"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>

                {/* Node ID & Version */}
                <div className="text-[11px] font-mono text-slate-400 space-y-1 bg-slate-950 p-2.5 rounded-lg border border-slate-800/80">
                  <div className="flex justify-between">
                    <span className="text-slate-500">Node ID:</span>
                    <span className="text-slate-300">{selectedNode.id}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">Version:</span>
                    <span className="text-amber-400">v{selectedNode.version}</span>
                  </div>
                </div>

                {/* Payload Properties */}
                <div className="space-y-1.5">
                  <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider block">
                    Epistemic Properties Payload
                  </span>
                  <div className="bg-slate-950 p-3 rounded-lg border border-slate-800 text-[11px] font-mono text-slate-300 max-h-36 overflow-y-auto">
                    <pre className="whitespace-pre-wrap">
                      {JSON.stringify(selectedNode.properties, null, 2)}
                    </pre>
                  </div>
                </div>

                {/* Provenance Record */}
                {selectedNode.provenance && (
                  <div className="space-y-1.5 pt-2 border-t border-slate-800">
                    <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider block">
                      Source Lineage & Provenance
                    </span>
                    <div className="bg-slate-950/60 p-3 rounded-lg border border-slate-800/80 space-y-1.5 text-xs">
                      <div className="text-indigo-300 font-semibold truncate">
                        {selectedNode.provenance.sourceTitle || 'Local Source Document'}
                      </div>
                      <div className="text-[11px] text-slate-400 font-mono truncate">
                        URI: {selectedNode.provenance.sourceUri}
                      </div>
                      {selectedNode.provenance.startLine !== undefined && (
                        <div className="text-[10px] text-slate-500 font-mono">
                          Lines {selectedNode.provenance.startLine}–{selectedNode.provenance.endLine}
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>

              {/* Lineage Trace (Upstream & Downstream Connections) */}
              <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 space-y-3">
                <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                  <div className="flex items-center space-x-2">
                    <GitCommit className="w-4 h-4 text-indigo-400" />
                    <span className="text-xs font-semibold text-slate-200 uppercase tracking-wider">
                      Graph Lineage Trace
                    </span>
                  </div>
                  <span className="text-[10px] text-slate-400 font-mono">
                    {lineage ? lineage.ancestors.length : 0} Preceding • {lineage ? lineage.descendants.length : 0} Descendants
                  </span>
                </div>

                {loadingLineage ? (
                  <div className="p-4 text-center text-xs text-slate-500 font-mono animate-pulse">
                    Tracing epistemic lineage graph...
                  </div>
                ) : lineage && lineage.ancestors.length > 0 ? (
                  <div className="space-y-2">
                    <span className="text-[10px] text-slate-400 font-semibold uppercase block">
                      Upstream Ancestors (Grounding & Supports):
                    </span>
                    <div className="space-y-1.5 max-h-40 overflow-y-auto pr-1">
                      {lineage.ancestors.map((anc) => (
                        <button
                          key={anc.id}
                          onClick={() => setSelectedNodeId(anc.id)}
                          className="w-full text-left p-2 rounded-lg bg-slate-950 border border-slate-800/80 hover:bg-slate-800/50 transition flex items-center justify-between text-xs"
                        >
                          <div className="flex items-center space-x-2 truncate pr-2">
                            <span
                              className={`text-[8px] font-mono px-1.5 py-0.2 rounded border ${
                                getNodeColorConfig(anc.type).badge
                              }`}
                            >
                              {anc.type}
                            </span>
                            <span className="text-slate-200 truncate">{anc.label}</span>
                          </div>
                          <ChevronRight className="w-3.5 h-3.5 text-slate-500 flex-shrink-0" />
                        </button>
                      ))}
                    </div>
                  </div>
                ) : (
                  <div className="p-3 text-center text-xs text-slate-500 bg-slate-950/40 rounded-lg">
                    No upstream ancestor nodes for this entity.
                  </div>
                )}
              </div>
            </>
          ) : (
            <div className="bg-slate-900 border border-slate-800 rounded-xl p-8 text-center space-y-3">
              <Network className="w-8 h-8 text-slate-600 mx-auto" />
              <div className="space-y-1">
                <h4 className="text-xs font-semibold text-slate-300">Select a Graph Node</h4>
                <p className="text-[11px] text-slate-500">
                  Click any node in the interactive canvas to inspect its properties payload and trace epistemic provenance.
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
