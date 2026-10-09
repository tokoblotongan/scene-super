import React, { useState, useEffect } from 'react';
import {
  X,
  ChevronLeft,
  ChevronRight,
  Play,
  Pause,
  Maximize,
  Download,
  Film,
  Camera,
  Sun,
} from 'lucide-react';
import { SceneItem } from '../types/storyboard';

interface SlideshowModalProps {
  isOpen: boolean;
  onClose: () => void;
  scenes: SceneItem[];
}

export const SlideshowModal: React.FC<SlideshowModalProps> = ({ isOpen, onClose, scenes }) => {
  const validScenes = scenes.filter((s) => !!s.imageUrl);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);

  useEffect(() => {
    if (!isOpen) {
      setIsPlaying(false);
      setCurrentIndex(0);
    }
  }, [isOpen]);

  useEffect(() => {
    let interval: any;
    if (isPlaying && validScenes.length > 1) {
      interval = setInterval(() => {
        setCurrentIndex((prev) => (prev + 1) % validScenes.length);
      }, 3500);
    }
    return () => clearInterval(interval);
  }, [isPlaying, validScenes.length]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!isOpen) return;
      if (e.key === 'ArrowRight') {
        setCurrentIndex((prev) => (prev + 1) % validScenes.length);
      } else if (e.key === 'ArrowLeft') {
        setCurrentIndex((prev) => (prev - 1 + validScenes.length) % validScenes.length);
      } else if (e.key === ' ') {
        e.preventDefault();
        setIsPlaying((prev) => !prev);
      } else if (e.key === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, validScenes.length, onClose]);

  if (!isOpen || validScenes.length === 0) return null;

  const currentScene = validScenes[currentIndex];

  const handleDownload = () => {
    if (!currentScene.imageUrl) return;
    const a = document.createElement('a');
    a.href = currentScene.imageUrl;
    a.download = `scene_${String(currentScene.sceneNumber).padStart(2, '0')}.png`;
    a.click();
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/95 backdrop-blur-lg flex flex-col justify-between p-4 sm:p-6 select-none animate-in fade-in duration-200">
      {/* Top Navbar */}
      <div className="flex items-center justify-between text-white pb-3 border-b border-white/10">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-indigo-600 flex items-center justify-center">
            <Film className="w-4 h-4 text-white" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              <span>Storyboard Cinema</span>
              <span className="text-xs px-2 py-0.5 rounded bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                Scene {currentScene.sceneNumber} dari {validScenes.length}
              </span>
            </h3>
            <p className="text-xs text-white/60">{currentScene.title}</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setIsPlaying(!isPlaying)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-xs font-semibold text-white transition cursor-pointer"
          >
            {isPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4 fill-current" />}
            <span>{isPlaying ? 'Jeda' : 'Putar Otomatis'}</span>
          </button>
          <button
            onClick={handleDownload}
            className="p-2 rounded-lg bg-white/10 hover:bg-white/20 text-white transition cursor-pointer"
            title="Download Gambar"
          >
            <Download className="w-4 h-4" />
          </button>
          <button
            onClick={onClose}
            className="p-2 rounded-lg bg-white/10 hover:bg-white/20 text-white transition cursor-pointer"
            title="Tutup (Esc)"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Main Canvas Area */}
      <div className="relative flex-1 flex items-center justify-center my-4 overflow-hidden">
        {/* Navigation arrows */}
        <button
          onClick={() =>
            setCurrentIndex((prev) => (prev - 1 + validScenes.length) % validScenes.length)
          }
          className="absolute left-2 sm:left-6 z-10 p-3 rounded-full bg-black/60 hover:bg-black/80 text-white/70 hover:text-white transition backdrop-blur border border-white/10 cursor-pointer"
          title="Scene Sebelumnya (Panah Kiri)"
        >
          <ChevronLeft className="w-6 h-6" />
        </button>

        <button
          onClick={() => setCurrentIndex((prev) => (prev + 1) % validScenes.length)}
          className="absolute right-2 sm:right-6 z-10 p-3 rounded-full bg-black/60 hover:bg-black/80 text-white/70 hover:text-white transition backdrop-blur border border-white/10 cursor-pointer"
          title="Scene Selanjutnya (Panah Kanan)"
        >
          <ChevronRight className="w-6 h-6" />
        </button>

        {/* Cinematic Image Frame */}
        <div className="max-w-5xl max-h-full flex flex-col items-center justify-center">
          <img
            src={currentScene.imageUrl}
            alt={`Scene ${currentScene.sceneNumber} - ${currentScene.title}`}
            className="max-h-[65vh] w-auto max-w-full object-contain rounded-xl shadow-2xl border border-white/10 drop-shadow-[0_10px_25px_rgba(0,0,0,0.8)]"
            referrerPolicy="no-referrer"
          />

          {/* Subtitle / Caption bar */}
          <div className="mt-4 max-w-3xl text-center px-4 py-2.5 rounded-xl bg-slate-900/80 backdrop-blur border border-white/10 text-xs">
            <p className="text-white font-medium leading-relaxed">
              <span className="font-bold text-indigo-400 mr-2">Scene {currentScene.sceneNumber}:</span>
              {currentScene.sceneDescriptionId || currentScene.title}
            </p>
            <p className="text-[11px] text-white/60 font-mono mt-1 line-clamp-2">
              "{currentScene.prompt}"
            </p>
          </div>
        </div>
      </div>

      {/* Bottom Thumbnail Scrubber */}
      <div className="pt-3 border-t border-white/10 flex items-center justify-center gap-2 overflow-x-auto py-1">
        {validScenes.map((sc, idx) => (
          <button
            key={sc.id}
            onClick={() => {
              setCurrentIndex(idx);
              setIsPlaying(false);
            }}
            className={`relative flex-shrink-0 w-16 h-11 rounded-lg overflow-hidden border-2 transition cursor-pointer ${
              idx === currentIndex
                ? 'border-indigo-500 ring-2 ring-indigo-500/50 scale-105'
                : 'border-white/20 opacity-60 hover:opacity-100'
            }`}
          >
            <img
              src={sc.imageUrl}
              alt={`Scene ${sc.sceneNumber}`}
              className="w-full h-full object-cover"
              referrerPolicy="no-referrer"
            />
            <span className="absolute bottom-0 right-0 px-1 text-[9px] font-bold bg-black/80 text-white rounded-tl">
              {sc.sceneNumber}
            </span>
          </button>
        ))}
      </div>
    </div>
  );
};
