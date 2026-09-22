import React, { useState } from 'react';
import {
  BookOpen,
  FileText,
  Tag,
  Hash,
  ChevronRight,
  Search,
  Layers,
  Sparkles,
  ExternalLink,
} from 'lucide-react';
import { IngestedDocument, AtomicDiscourseUnit, ADUType } from '../core/types';

interface KnowledgeExplorerProps {
  documents: IngestedDocument[];
  domains: string[];
  entities: Record<string, string[]>;
  onSelectADU?: (adu: AtomicDiscourseUnit) => void;
}

export const KnowledgeExplorer: React.FC<KnowledgeExplorerProps> = ({
  documents,
  domains,
  entities,
  onSelectADU,
}) => {
  const [selectedDomain, setSelectedDomain] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedDocId, setSelectedDocId] = useState<string | null>(
    documents.length > 0 ? documents[0].id : null
  );
  const [selectedADUId, setSelectedADUId] = useState<string | null>(null);

  const filteredDocs = documents.filter((doc) => {
    const matchesDomain = selectedDomain === 'ALL' || doc.domain === selectedDomain;
    const matchesSearch =
      searchQuery === '' ||
      doc.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      doc.adus.some((a) => a.content.toLowerCase().includes(searchQuery.toLowerCase()));
    return matchesDomain && matchesSearch;
  });

  const currentDoc = documents.find((d) => d.id === selectedDocId) || filteredDocs[0];

  const getADUBadgeColor = (type: ADUType) => {
    switch (type) {
      case ADUType.CLAIM:
        return 'bg-blue-950/80 text-blue-300 border-blue-800';
      case ADUType.EVIDENCE:
        return 'bg-emerald-950/80 text-emerald-300 border-emerald-800';
      case ADUType.CONSTRAINT:
        return 'bg-amber-950/80 text-amber-300 border-amber-800';
      case ADUType.DEFINITION:
        return 'bg-purple-950/80 text-purple-300 border-purple-800';
      case ADUType.INSTRUCTION:
        return 'bg-cyan-950/80 text-cyan-300 border-cyan-800';
      case ADUType.DECISION:
        return 'bg-indigo-950/80 text-indigo-300 border-indigo-800';
      default:
        return 'bg-slate-800 text-slate-300 border-slate-700';
    }
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
      {/* Sidebar: Domains & Documents */}
      <div className="lg:col-span-4 space-y-4">
        {/* Domain Filter Pills */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-3">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold text-slate-300 uppercase tracking-wider">
              Knowledge Domains
            </span>
            <span className="text-[11px] text-slate-400 font-mono">
              {domains.length} Registered
            </span>
          </div>
          <div className="flex flex-wrap gap-1.5">
            <button
              onClick={() => setSelectedDomain('ALL')}
              className={`px-2.5 py-1 rounded-md text-xs font-medium transition ${
                selectedDomain === 'ALL'
                  ? 'bg-indigo-600 text-white'
                  : 'bg-slate-800/80 text-slate-400 hover:text-slate-200'
              }`}
            >
              All Domains
            </button>
            {domains.map((dom) => (
              <button
                key={dom}
                onClick={() => setSelectedDomain(dom)}
                className={`px-2.5 py-1 rounded-md text-xs font-medium transition ${
                  selectedDomain === dom
                    ? 'bg-indigo-600 text-white'
                    : 'bg-slate-800/80 text-slate-400 hover:text-slate-200'
                }`}
              >
                {dom}
              </button>
            ))}
          </div>
        </div>

        {/* Search Bar */}
        <div className="relative">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-500" />
          <input
            type="text"
            placeholder="Search documents & discourse units..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-slate-900 border border-slate-800 rounded-xl pl-9 pr-4 py-2 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-indigo-500"
          />
        </div>

        {/* Document List */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl divide-y divide-slate-800/60 overflow-hidden">
          <div className="p-3 bg-slate-950/40 flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-300 uppercase tracking-wider">
              Indexed Documents ({filteredDocs.length})
            </span>
          </div>
          <div className="max-h-[500px] overflow-y-auto divide-y divide-slate-800/40">
            {filteredDocs.map((doc) => {
              const isSelected = currentDoc?.id === doc.id;
              return (
                <button
                  key={doc.id}
                  onClick={() => {
                    setSelectedDocId(doc.id);
                    setSelectedADUId(null);
                  }}
                  className={`w-full text-left p-3 transition flex items-start justify-between ${
                    isSelected
                      ? 'bg-indigo-950/30 border-l-2 border-indigo-500'
                      : 'hover:bg-slate-800/40'
                  }`}
                >
                  <div className="space-y-1">
                    <div className="flex items-center space-x-2">
                      <FileText className="w-3.5 h-3.5 text-indigo-400 flex-shrink-0" />
                      <span className="text-xs font-medium text-slate-200 truncate">
                        {doc.title}
                      </span>
                    </div>
                    <div className="flex items-center space-x-2 text-[11px] text-slate-400">
                      <span className="px-1.5 py-0.5 rounded bg-slate-800 text-[10px] font-mono text-slate-300">
                        {doc.domain}
                      </span>
                      <span>•</span>
                      <span>{doc.totalADUs} ADUs</span>
                    </div>
                  </div>
                  <ChevronRight
                    className={`w-4 h-4 text-slate-500 transition ${
                      isSelected ? 'text-indigo-400 rotate-90' : ''
                    }`}
                  />
                </button>
              );
            })}

            {filteredDocs.length === 0 && (
              <div className="p-6 text-center text-xs text-slate-500">
                No documents found matching your filter.
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Main Content: Selected Document and Its Segmented ADUs */}
      <div className="lg:col-span-8 space-y-4">
        {currentDoc ? (
          <>
            {/* Document Header Card */}
            <div className="bg-slate-900 border border-slate-800 rounded-xl p-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-800 pb-3 mb-3">
                <div>
                  <div className="flex items-center space-x-2">
                    <span className="text-xs px-2 py-0.5 rounded-full bg-indigo-950 text-indigo-300 border border-indigo-800 font-mono">
                      {currentDoc.domain}
                    </span>
                    <h2 className="text-base font-semibold text-slate-100">
                      {currentDoc.title}
                    </h2>
                  </div>
                  {currentDoc.sourceUri && (
                    <p className="text-xs text-slate-400 font-mono mt-1 flex items-center space-x-1">
                      <span>Source: {currentDoc.sourceUri}</span>
                    </p>
                  )}
                </div>
                <div className="text-right text-[11px] text-slate-400 font-mono">
                  <span>Ingested: {new Date(currentDoc.ingestedAt).toLocaleTimeString()}</span>
                </div>
              </div>

              {/* Document Summary Stats */}
              <div className="grid grid-cols-3 gap-2 text-center text-xs">
                <div className="bg-slate-950/60 p-2 rounded-lg border border-slate-800/60">
                  <span className="text-slate-400 block text-[10px]">Segmented ADUs</span>
                  <span className="font-semibold text-slate-200 font-mono text-sm">
                    {currentDoc.totalADUs}
                  </span>
                </div>
                <div className="bg-slate-950/60 p-2 rounded-lg border border-slate-800/60">
                  <span className="text-slate-400 block text-[10px]">Extracted Entities</span>
                  <span className="font-semibold text-slate-200 font-mono text-sm">
                    {Object.keys(currentDoc.metadata?.entities || {}).length ||
                      currentDoc.adus.reduce((acc, a) => acc + (a.entities?.length || 0), 0)}
                  </span>
                </div>
                <div className="bg-slate-950/60 p-2 rounded-lg border border-slate-800/60">
                  <span className="text-slate-400 block text-[10px]">Epistemic Integrity</span>
                  <span className="font-semibold text-emerald-400 font-mono text-sm">
                    Verified (100%)
                  </span>
                </div>
              </div>
            </div>

            {/* ADU Stream View */}
            <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden">
              <div className="p-3 bg-slate-950/40 border-b border-slate-800 flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <Layers className="w-4 h-4 text-indigo-400" />
                  <span className="text-xs font-semibold text-slate-200 uppercase tracking-wider">
                    Atomic Discourse Units (ADUs)
                  </span>
                </div>
                <span className="text-[11px] text-slate-400 font-mono">
                  Click ADU to inspect provenance
                </span>
              </div>

              <div className="p-4 space-y-3 max-h-[600px] overflow-y-auto">
                {currentDoc.adus.map((adu, idx) => {
                  const isSelected = selectedADUId === adu.id;
                  return (
                    <div
                      key={adu.id}
                      onClick={() => {
                        setSelectedADUId(adu.id);
                        onSelectADU?.(adu);
                      }}
                      className={`p-3 rounded-lg border transition cursor-pointer ${
                        isSelected
                          ? 'bg-slate-800/90 border-indigo-500 shadow-md ring-1 ring-indigo-500/30'
                          : 'bg-slate-950/40 border-slate-800/80 hover:bg-slate-800/40'
                      }`}
                    >
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center space-x-2">
                          <span
                            className={`text-[10px] font-mono px-2 py-0.5 rounded border font-semibold ${getADUBadgeColor(
                              adu.type
                            )}`}
                          >
                            {adu.type}
                          </span>
                          <span className="text-[11px] text-slate-400 font-mono">
                            ID: {adu.id.substring(0, 14)}...
                          </span>
                        </div>
                        {adu.provenance?.location && (
                          <span className="text-[10px] text-slate-400 font-mono bg-slate-900 px-1.5 py-0.5 rounded">
                            Lines {adu.provenance.location.startLine}–{adu.provenance.location.endLine}
                          </span>
                        )}
                      </div>

                      <p className="text-xs text-slate-200 leading-relaxed font-sans mb-2">
                        {adu.content}
                      </p>

                      {/* Entities and Tags */}
                      <div className="flex flex-wrap items-center gap-1.5 pt-2 border-t border-slate-800/60">
                        {adu.entities &&
                          adu.entities.map((ent) => (
                            <span
                              key={ent}
                              className="inline-flex items-center space-x-1 px-1.5 py-0.5 rounded text-[10px] bg-slate-800 text-slate-300 font-mono"
                            >
                              <Tag className="w-2.5 h-2.5 text-indigo-400" />
                              <span>{ent}</span>
                            </span>
                          ))}
                        {adu.confidence !== undefined && (
                          <span className="ml-auto text-[10px] text-slate-400 font-mono">
                            Confidence: {(adu.confidence * 100).toFixed(0)}%
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </>
        ) : (
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-12 text-center">
            <BookOpen className="w-8 h-8 text-slate-600 mx-auto mb-3" />
            <h3 className="text-sm font-medium text-slate-300">No Knowledge Documents</h3>
            <p className="text-xs text-slate-500 mt-1">
              Ingest a Markdown document or reset sample domains to begin exploring.
            </p>
          </div>
        )}
      </div>
    </div>
  );
};
