import React, { useState } from 'react';
import { FileText, X, Check, Copy, Download, Upload } from 'lucide-react';
import { SceneItem } from '../types/storyboard';

interface BulkPromptModalProps {
  isOpen: boolean;
  onClose: () => void;
  scenes: SceneItem[];
  onImportPrompts: (prompts: string[]) => void;
}

export const BulkPromptModal: React.FC<BulkPromptModalProps> = ({
  isOpen,
  onClose,
  scenes,
  onImportPrompts,
}) => {
  const [activeTab, setActiveTab] = useState<'import' | 'export'>('import');
  const [pasteContent, setPasteContent] = useState('');
  const [copied, setCopied] = useState(false);

  if (!isOpen) return null;

  const exportText = scenes
    .map(
      (s) =>
        `Scene ${s.sceneNumber}: ${s.title || 'Untitled'}\nPrompt: ${s.prompt}\n${
          s.cameraAngle ? `Camera: ${s.cameraAngle}\n` : ''
        }${s.lighting ? `Lighting: ${s.lighting}\n` : ''}`
    )
    .join('\n---\n\n');

  const exportJson = JSON.stringify(
    scenes.map((s) => ({
      sceneNumber: s.sceneNumber,
      title: s.title,
      prompt: s.prompt,
      cameraAngle: s.cameraAngle,
      lighting: s.lighting,
      hasImage: !!s.imageUrl,
    })),
    null,
    2
  );

  const handleImport = () => {
    if (!pasteContent.trim()) return;
    const lines = pasteContent
      .split('\n')
      .map((l) => l.trim())
      .filter((l) => l.length > 0);

    onImportPrompts(lines);
    onClose();
  };

  const handleCopyExport = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownloadTxt = () => {
    const blob = new Blob([exportText], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `storyboard_prompts_scenes_1_${scenes.length}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-3 sm:p-5">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-2xl shadow-2xl overflow-hidden flex flex-col max-h-[85vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 bg-slate-950 border-b border-slate-800">
          <div className="flex items-center gap-2">
            <FileText className="w-5 h-5 text-indigo-400" />
            <h2 className="text-sm font-bold text-white">Import / Export Prompt Masal</h2>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-slate-800 bg-slate-950/50 px-5 pt-2">
          <button
            onClick={() => setActiveTab('import')}
            className={`px-4 py-2 text-xs font-semibold border-b-2 transition cursor-pointer ${
              activeTab === 'import'
                ? 'border-indigo-500 text-indigo-400'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            Import Prompts (Tempel Baris demi Baris)
          </button>
          <button
            onClick={() => setActiveTab('export')}
            className={`px-4 py-2 text-xs font-semibold border-b-2 transition cursor-pointer ${
              activeTab === 'export'
                ? 'border-indigo-500 text-indigo-400'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            Export Prompts ({scenes.length} Scene)
          </button>
        </div>

        {/* Body */}
        <div className="p-5 overflow-y-auto space-y-3 flex-1 text-xs">
          {activeTab === 'import' ? (
            <div className="space-y-3">
              <p className="text-slate-400 leading-relaxed">
                Tempelkan daftar prompt di bawah ini. Setiap baris baru akan otomatis menjadi{' '}
                <strong className="text-slate-200">Scene 1, Scene 2, dst.</strong>
              </p>
              <textarea
                rows={10}
                value={pasteContent}
                onChange={(e) => setPasteContent(e.target.value)}
                placeholder={`Contoh:\nPrompt untuk Scene 1: Kucing astronot menekan tombol kokpit\nPrompt untuk Scene 2: Roket meluncur ke langit biru\nPrompt untuk Scene 3: Kapal antariksa melintasi cincin Saturnus\n...`}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-slate-200 focus:outline-none focus:border-indigo-500 resize-none font-mono text-xs leading-relaxed"
              />
            </div>
          ) : (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-slate-400">Pratinjau Teks Storyboard:</span>
                <div className="flex gap-2">
                  <button
                    onClick={() => handleCopyExport(exportText)}
                    className="flex items-center gap-1 px-2.5 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 transition cursor-pointer"
                  >
                    {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                    <span>{copied ? 'Tersalin' : 'Salin Semua'}</span>
                  </button>
                  <button
                    onClick={handleDownloadTxt}
                    className="flex items-center gap-1 px-2.5 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 transition cursor-pointer"
                  >
                    <Download className="w-3.5 h-3.5 text-emerald-400" />
                    <span>Download TXT</span>
                  </button>
                </div>
              </div>
              <pre className="bg-slate-950 border border-slate-800 rounded-xl p-3 text-slate-300 font-mono text-[11px] max-h-72 overflow-y-auto leading-relaxed whitespace-pre-wrap">
                {exportText}
              </pre>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-5 py-3.5 bg-slate-950 border-t border-slate-800 flex items-center justify-end gap-2">
          <button
            onClick={onClose}
            className="px-3.5 py-1.5 rounded-lg text-xs font-semibold text-slate-400 hover:text-white transition cursor-pointer"
          >
            Tutup
          </button>
          {activeTab === 'import' && (
            <button
              onClick={handleImport}
              disabled={!pasteContent.trim()}
              className="flex items-center gap-1.5 px-4 py-1.5 rounded-lg text-xs font-bold bg-indigo-600 hover:bg-indigo-500 text-white transition cursor-pointer disabled:opacity-40"
            >
              <Upload className="w-3.5 h-3.5" />
              <span>Import ke Storyboard</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
