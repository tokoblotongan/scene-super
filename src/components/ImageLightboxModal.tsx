import React from 'react';
import { X, Download, Copy, Check, Camera, Sun, Info } from 'lucide-react';
import { SceneItem } from '../types/storyboard';

interface ImageLightboxModalProps {
  scene: SceneItem | null;
  onClose: () => void;
}

export const ImageLightboxModal: React.FC<ImageLightboxModalProps> = ({ scene, onClose }) => {
  const [copied, setCopied] = React.useState(false);

  if (!scene || !scene.imageUrl) return null;

  const handleCopy = () => {
    navigator.clipboard.writeText(scene.prompt);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownload = () => {
    if (!scene.imageUrl) return;
    const a = document.createElement('a');
    a.href = scene.imageUrl;
    const cleanTitle = (scene.title || `scene_${scene.sceneNumber}`)
      .toLowerCase()
      .replace(/[^a-z0-9]/g, '_');
    a.download = `scene_${String(scene.sceneNumber).padStart(2, '0')}_${cleanTitle}.png`;
    a.click();
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/90 backdrop-blur-md flex items-center justify-center p-3 sm:p-6 overflow-y-auto">
      <div className="relative bg-slate-900 border border-slate-800 rounded-2xl max-w-4xl w-full overflow-hidden shadow-2xl flex flex-col md:flex-row my-auto">
        <button
          onClick={onClose}
          className="absolute top-3 right-3 z-10 p-2 rounded-full bg-slate-950/80 text-white/80 hover:text-white hover:bg-slate-800 border border-white/10 transition cursor-pointer"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Big Image View */}
        <div className="flex-1 bg-black flex items-center justify-center p-2 min-h-[350px] max-h-[70vh]">
          <img
            src={scene.imageUrl}
            alt={`Scene ${scene.sceneNumber}`}
            className="w-full h-full object-contain max-h-[70vh] rounded-lg"
            referrerPolicy="no-referrer"
          />
        </div>

        {/* Sidebar Info */}
        <div className="w-full md:w-80 p-5 bg-slate-900 flex flex-col justify-between border-t md:border-t-0 md:border-l border-slate-800 space-y-4">
          <div className="space-y-3">
            <div>
              <span className="text-xs font-bold text-indigo-400 uppercase tracking-wider">
                Scene {scene.sceneNumber}
              </span>
              <h3 className="text-base font-bold text-white mt-0.5">{scene.title}</h3>
            </div>

            {scene.sceneDescriptionId && (
              <div className="p-2.5 rounded-lg bg-slate-950 border border-slate-800 text-xs text-slate-300">
                <span className="font-semibold text-slate-400 block mb-0.5">Konteks Cerita:</span>
                {scene.sceneDescriptionId}
              </div>
            )}

            <div className="space-y-1.5">
              <span className="text-xs font-semibold text-slate-400">Prompt Visual:</span>
              <div className="p-3 rounded-lg bg-slate-950 border border-slate-800 text-xs text-slate-200 font-mono leading-relaxed max-h-40 overflow-y-auto">
                {scene.prompt}
              </div>
            </div>

            {/* Tags */}
            <div className="space-y-1">
              <span className="text-xs font-semibold text-slate-400">Atribut Visual:</span>
              <div className="flex flex-wrap gap-1.5 text-[11px]">
                {scene.cameraAngle && (
                  <span className="px-2 py-0.5 rounded bg-slate-800 text-amber-300 border border-slate-700 flex items-center gap-1">
                    <Camera className="w-3 h-3" />
                    {scene.cameraAngle}
                  </span>
                )}
                {scene.lighting && (
                  <span className="px-2 py-0.5 rounded bg-slate-800 text-cyan-300 border border-slate-700 flex items-center gap-1">
                    <Sun className="w-3 h-3" />
                    {scene.lighting}
                  </span>
                )}
              </div>
            </div>
          </div>

          <div className="pt-3 border-t border-slate-800 flex flex-col gap-2">
            <button
              onClick={handleCopy}
              className="flex items-center justify-center gap-1.5 w-full py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold border border-slate-700 transition cursor-pointer"
            >
              {copied ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
              <span>{copied ? 'Prompt Tersalin!' : 'Salin Prompt'}</span>
            </button>
            <button
              onClick={handleDownload}
              className="flex items-center justify-center gap-1.5 w-full py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold shadow-md shadow-emerald-600/20 transition cursor-pointer"
            >
              <Download className="w-4 h-4" />
              <span>Download Gambar PNG</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
