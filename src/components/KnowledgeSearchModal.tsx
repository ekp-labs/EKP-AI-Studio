import React, { useState } from 'react';
import {
  Search,
  BookOpen,
  FileText,
  Filter,
  Sparkles,
  ExternalLink,
  ChevronRight,
  Database,
  Hash,
  Tag,
  CheckCircle2,
  Clock
} from 'lucide-react';

interface SearchResultItem {
  adu: {
    id: string;
    documentId: string;
    content: string;
    type: string;
    confidence: number;
    startLine: number;
    endLine: number;
    entities?: string[];
    provenance: {
      sourceUri: string;
      sourceTitle: string;
    };
  };
  documentTitle: string;
  domain: string;
  sourceUri: string;
}

export const KnowledgeSearchModal: React.FC = () => {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResultItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!query.trim()) return;

    setLoading(true);
    try {
      const res = await fetch(`/api/search?q=${encodeURIComponent(query)}`);
      const data = await res.json();
      if (data.success) {
        setResults(data.results);
        setHasSearched(true);
      }
    } catch (err) {
      console.error('Search query error:', err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <div className="p-2 bg-indigo-600/20 border border-indigo-500/30 rounded-lg text-indigo-400">
            <Search className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-base font-bold text-white">Semantic Knowledge Search Engine</h2>
            <p className="text-xs text-slate-400">Query atomic discourse units (ADUs) across all local ingested sources</p>
          </div>
        </div>
      </div>

      {/* Search Input Form */}
      <form onSubmit={handleSearch} className="flex gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3.5 top-3 h-4 w-4 text-slate-500" />
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="e.g. pressure limit, calibration procedure, or safety checks..."
            className="w-full bg-slate-950 border border-slate-800 rounded-lg pl-10 pr-4 py-2.5 text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:border-indigo-500 font-sans"
          />
        </div>
        <button
          type="submit"
          disabled={loading || !query.trim()}
          className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-500 disabled:bg-slate-800 text-white rounded-lg text-xs font-medium transition flex items-center space-x-2"
        >
          {loading ? (
            <span>Searching...</span>
          ) : (
            <>
              <Sparkles className="w-4 h-4" />
              <span>Execute Search</span>
            </>
          )}
        </button>
      </form>

      {/* Results View */}
      <div className="space-y-3">
        {hasSearched && (
          <div className="flex items-center justify-between text-xs text-slate-400 border-b border-slate-800 pb-2 font-mono">
            <span>Found <strong className="text-indigo-400">{results.length}</strong> matching ADU fragments</span>
            <span>Query: "{query}"</span>
          </div>
        )}

        {loading ? (
          <div className="py-12 text-center text-xs text-slate-500 font-mono animate-pulse">
            Scanning local KnowledgeLibrary and graph indices...
          </div>
        ) : results.length > 0 ? (
          <div className="space-y-3 max-h-[480px] overflow-y-auto pr-1">
            {results.map((item, idx) => (
              <div
                key={item.adu.id || idx}
                className="bg-slate-950 border border-slate-800/90 rounded-lg p-4 space-y-2 hover:border-indigo-500/50 transition"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <span className="text-xs font-semibold text-indigo-300">
                      {item.documentTitle}
                    </span>
                    <span className="px-2 py-0.5 bg-slate-900 border border-slate-800 text-slate-400 text-[10px] rounded font-mono">
                      {item.domain}
                    </span>
                  </div>
                  <span className="text-[10px] font-mono text-slate-500">
                    Lines {item.adu.startLine}–{item.adu.endLine}
                  </span>
                </div>

                <p className="text-xs text-slate-200 font-mono leading-relaxed bg-slate-900/60 p-2.5 rounded border border-slate-800/40">
                  "{item.adu.content}"
                </p>

                <div className="flex items-center justify-between pt-1 text-[10px] font-mono text-slate-500">
                  <div className="flex items-center space-x-2 truncate pr-4">
                    <ExternalLink className="w-3 h-3 text-slate-600" />
                    <span className="truncate">{item.sourceUri}</span>
                  </div>
                  <span className="px-2 py-0.5 bg-indigo-950/60 border border-indigo-800/60 text-indigo-300 rounded uppercase">
                    {item.adu.type}
                  </span>
                </div>
              </div>
            ))}
          </div>
        ) : hasSearched ? (
          <div className="py-12 text-center space-y-2">
            <Database className="w-8 h-8 text-slate-600 mx-auto" />
            <p className="text-xs text-slate-400">No matching discourse units found for this query.</p>
            <p className="text-[11px] text-slate-500">Try ingesting more documents or broadening your search terms.</p>
          </div>
        ) : (
          <div className="py-12 text-center text-xs text-slate-500">
            Enter a search term above to perform a fast local query across all ingested knowledge units.
          </div>
        )}
      </div>
    </div>
  );
};
