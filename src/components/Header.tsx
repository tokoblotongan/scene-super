import React from 'react';
import {
  Sparkles,
  Play,
  Square,
  Download,
  Film,
  Plus,
  RefreshCw,
  SlidersHorizontal,
  FileText,
} from 'lucide-react';
import { SceneItem } from '../types/storyboard';

interface HeaderProps {
  scenes: SceneItem[];
  isGeneratingBatch: boolean;
  onBatchGenerate: () => void;
  onStopBatchGenerate: () => void;
  onOpenAiStoryModal: () => void;
  onOpenSlideshow: () => void;
  onOpenBulkModal: () => void;
  onDownloadZip: () => void;
  onAddScene: () => void;
  showControls: boolean;
  setShowControls: (show: boolean) => void;
}

export const Header: React.FC<HeaderProps> = ({
  scenes,
  isGeneratingBatch,
  onBatchGenerate,
  onStopBatchGenerate,
  onOpenAiStoryModal,
  onOpenSlideshow,
  onOpenBulkModal,
  onDownloadZip,
  onAddScene,
  showControls,
  setShowControls,
}) => {
  const completedCount = scenes.filter((s) => s.status === 'success' && s.imageUrl).length;
  const generatingCount = scenes.filter((s) => s.status === 'generating' || s.status === 'queued').length;
  const totalCount = scenes.length;
  const progressPercent = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0;

  return (
    <header className="sticky top-0 z-40 bg-slate-950/90 backdrop-blur-md border-b border-slate-800 shadow-xl">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
          {/* Logo & Title */}
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-amber-500 via-rose-500 to-indigo-600 flex items-center justify-center shadow-lg shadow-rose-500/20 text-white font-bold text-lg ring-1 ring-white/20">
              <Film className="w-5 h-5 text-white" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-lg font-bold text-slate-100 tracking-tight">
                  Multi-Scene Batch Studio
                </h1>
                <span className="text-xs px-2 py-0.5 rounded-full bg-indigo-500/20 text-indigo-300 font-medium border border-indigo-500/30">
                  Scene 1 s/d {totalCount}
                </span>
              </div>
              <p className="text-xs text-slate-400">
                Generator batch gambar multi-scene dengan konsistensi gaya & prompt unik
              </p>
            </div>
          </div>

          {/* Quick Stats & Main Action Buttons */}
          <div className="flex flex-wrap items-center gap-2 sm:gap-2.5">
            {/* Progress pill */}
            <div className="flex items-center gap-2 bg-slate-900 border border-slate-800 px-3 py-1.5 rounded-lg text-xs">
              <div className="w-20 bg-slate-800 rounded-full h-2 overflow-hidden">
                <div
                  className="bg-gradient-to-r from-emerald-500 to-indigo-500 h-full transition-all duration-300"
                  style={{ width: `${progressPercent}%` }}
                />
              </div>
              <span className="font-semibold text-slate-200">
                {completedCount}/{totalCount}
              </span>
              <span className="text-slate-400 text-[11px]">Selesai</span>
            </div>

            {/* AI Story Button */}
            <button
              onClick={onOpenAiStoryModal}
              disabled={isGeneratingBatch}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 text-white shadow-md shadow-indigo-600/20 transition-all disabled:opacity-50 cursor-pointer"
              title="Buat alur cerita 10 scene otomatis menggunakan AI"
            >
              <Sparkles className="w-3.5 h-3.5 text-amber-300" />
              <span>AI Story Expander</span>
            </button>

            {/* Batch Generate / Stop Button */}
            {isGeneratingBatch ? (
              <button
                onClick={onStopBatchGenerate}
                className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-bold bg-rose-600 hover:bg-rose-500 text-white shadow-lg shadow-rose-600/30 transition-all animate-pulse cursor-pointer"
              >
                <Square className="w-3.5 h-3.5 fill-current" />
                <span>Hentikan Batch ({generatingCount})</span>
              </button>
            ) : (
              <button
                onClick={onBatchGenerate}
                className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-bold bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-400 hover:to-teal-500 text-white shadow-lg shadow-emerald-500/25 transition-all cursor-pointer"
              >
                <Play className="w-3.5 h-3.5 fill-current" />
                <span>Generate Semua (1 s/d {totalCount})</span>
              </button>
            )}

            {/* Slideshow Player */}
            {completedCount > 0 && (
              <button
                onClick={onOpenSlideshow}
                className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 transition cursor-pointer"
                title="Putar hasil scene dalam mode presentasi sinematik"
              >
                <Film className="w-3.5 h-3.5 text-rose-400" />
                <span className="hidden sm:inline">Slideshow</span>
              </button>
            )}

            {/* Download ZIP */}
            {completedCount > 0 && (
              <button
                onClick={onDownloadZip}
                className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 transition cursor-pointer"
                title="Download semua gambar hasil generate sebagai file ZIP"
              >
                <Download className="w-3.5 h-3.5 text-emerald-400" />
                <span className="hidden sm:inline">Download ZIP</span>
              </button>
            )}

            {/* Bulk Prompts / Add scene */}
            <button
              onClick={onOpenBulkModal}
              className="p-1.5 rounded-lg text-slate-300 hover:text-white bg-slate-900 hover:bg-slate-800 border border-slate-800 transition cursor-pointer"
              title="Import / Export Prompt Masal"
            >
              <FileText className="w-4 h-4 text-slate-400" />
            </button>

            <button
              onClick={onAddScene}
              className="p-1.5 rounded-lg text-slate-300 hover:text-white bg-slate-900 hover:bg-slate-800 border border-slate-800 transition cursor-pointer"
              title="Tambah Scene Baru"
            >
              <Plus className="w-4 h-4 text-emerald-400" />
            </button>

            {/* Toggle Global Settings Bar */}
            <button
              onClick={() => setShowControls(!showControls)}
              className={`p-1.5 rounded-lg border transition cursor-pointer ${
                showControls
                  ? 'bg-indigo-600/20 text-indigo-300 border-indigo-500/40'
                  : 'bg-slate-900 text-slate-400 hover:text-white border-slate-800'
              }`}
              title="Pengaturan Gaya & Konsistensi"
            >
              <SlidersHorizontal className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    </header>
  );
};
