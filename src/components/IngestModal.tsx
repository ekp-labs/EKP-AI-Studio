import React, { useState } from 'react';
import { X, FileText, Upload, Sparkles, Check } from 'lucide-react';

interface IngestModalProps {
  isOpen: boolean;
  onClose: () => void;
  onIngest: (doc: { title: string; domain: string; content: string; sourceUri?: string }) => Promise<void>;
  isProcessing: boolean;
}

export const IngestModal: React.FC<IngestModalProps> = ({
  isOpen,
  onClose,
  onIngest,
  isProcessing,
}) => {
  const [title, setTitle] = useState('');
  const [domain, setDomain] = useState('Embroidery');
  const [sourceUri, setSourceUri] = useState('spec://custom/doc-v1.md');
  const [content, setContent] = useState('');

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!content.trim() || isProcessing) return;

    await onIngest({
      title: title || 'Custom Epistemic Document',
      domain: domain || 'General',
      sourceUri,
      content,
    });

    setTitle('');
    setContent('');
    onClose();
  };

  const loadSample = () => {
    setTitle('Optics Laser Alignment Specification');
    setDomain('Photonics');
    setSourceUri('spec://photonics/laser-align-v2.md');
    setContent(`# Photonics Laser Alignment Standard

## 1. Beam Collimation
The diode pump laser beam must maintain a divergence angle less than 0.5 mrad.

## 2. Objective Focal Tolerances
All doublet achromatic lenses require focal distance calibration within ±0.05mm.

## 3. Power Density Constraint
Surface power density must never exceed 250 W/cm² on uncoated optical flats.`);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-2xl w-full p-6 space-y-4 shadow-2xl relative">
        <div className="flex items-center justify-between border-b border-slate-800 pb-3">
          <div className="flex items-center space-x-2">
            <FileText className="w-5 h-5 text-indigo-400" />
            <h3 className="text-sm font-semibold text-slate-100 uppercase tracking-wider">
              Ingest Knowledge Document
            </h3>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-slate-200 hover:bg-slate-800"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="text-[11px] font-medium text-slate-400 block mb-1">
                Document Title
              </label>
              <input
                type="text"
                placeholder="e.g. Tension Specification"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2 text-xs text-slate-200 focus:outline-none focus:border-indigo-500"
              />
            </div>
            <div>
              <label className="text-[11px] font-medium text-slate-400 block mb-1">
                Domain Name
              </label>
              <input
                type="text"
                placeholder="e.g. Embroidery / Photonics"
                value={domain}
                onChange={(e) => setDomain(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2 text-xs text-slate-200 focus:outline-none focus:border-indigo-500"
              />
            </div>
          </div>

          <div>
            <label className="text-[11px] font-medium text-slate-400 block mb-1">
              Source URI / Identifier
            </label>
            <input
              type="text"
              placeholder="e.g. file://spec.md"
              value={sourceUri}
              onChange={(e) => setSourceUri(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2 text-xs text-slate-200 font-mono focus:outline-none focus:border-indigo-500"
            />
          </div>

          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="text-[11px] font-medium text-slate-400">
                Markdown Content
              </label>
              <button
                type="button"
                onClick={loadSample}
                className="text-[10px] text-indigo-400 hover:text-indigo-300 underline"
              >
                Insert Sample Document
              </button>
            </div>
            <textarea
              rows={8}
              placeholder="# Markdown Specification&#10;&#10;## Section&#10;Claim or constraint..."
              value={content}
              onChange={(e) => setContent(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-xs text-slate-200 font-mono placeholder-slate-600 focus:outline-none focus:border-indigo-500"
            />
          </div>

          <div className="flex items-center justify-end space-x-2 pt-2 border-t border-slate-800">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl text-xs font-medium text-slate-400 hover:text-slate-200 hover:bg-slate-800 transition"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isProcessing || !content.trim()}
              className="px-4 py-2 rounded-xl text-xs font-semibold bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white flex items-center space-x-1.5 transition"
            >
              <Upload className="w-3.5 h-3.5" />
              <span>{isProcessing ? 'Ingesting...' : 'Ingest & Segment ADUs'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
