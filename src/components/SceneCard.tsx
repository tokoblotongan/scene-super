import React, { useState, useRef } from 'react';
import {
  Sparkles,
  Play,
  RotateCcw,
  Download,
  Copy,
  Maximize2,
  Trash2,
  CopyPlus,
  ArrowUp,
  ArrowDown,
  Camera,
  Sun,
  AlertCircle,
  CheckCircle2,
  Loader2,
  Check,
  Upload,
  Image as ImageIcon,
  X,
} from 'lucide-react';
import { SceneItem, AspectRatioType } from '../types/storyboard';
import { CAMERA_ANGLES, LIGHTING_PRESETS } from '../data/storyboardPresets';

interface SceneCardProps {
  scene: SceneItem;
  totalScenes: number;
  globalAspectRatio: AspectRatioType;
  globalReferenceImage?: string;
  isGeneratingBatch: boolean;
  onUpdateScene: (id: string, updates: Partial<SceneItem>) => void;
  onGenerateSingle: (id: string) => void;
  onEnhancePrompt: (id: string) => void;
  onDeleteScene: (id: string) => void;
  onDuplicateScene: (id: string) => void;
  onMoveScene: (id: string, direction: 'up' | 'down') => void;
  onOpenLightbox: (scene: SceneItem) => void;
}

export const SceneCard: React.FC<SceneCardProps> = ({
  scene,
  totalScenes,
  globalAspectRatio,
  globalReferenceImage,
  isGeneratingBatch,
  onUpdateScene,
  onGenerateSingle,
  onEnhancePrompt,
  onDeleteScene,
  onDuplicateScene,
  onMoveScene,
  onOpenLightbox,
}) => {
  const [copied, setCopied] = useState(false);
  const [isPolishing, setIsPolishing] = useState(false);
  const [showTags, setShowTags] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      const dataUrl = event.target?.result as string;
      if (dataUrl) {
        onUpdateScene(scene.id, { referenceImage: dataUrl });
      }
    };
    reader.readAsDataURL(file);
    e.target.value = '';
  };

  const handleRemoveSceneRef = () => {
    onUpdateScene(scene.id, { referenceImage: undefined });
  };

  // Aspect ratio css styles for preview box
  const getAspectRatioClass = (ar: AspectRatioType) => {
    switch (ar) {
      case '16:9':
        return 'aspect-video';
      case '9:16':
        return 'aspect-[9/16] max-h-72';
      case '1:1':
        return 'aspect-square';
      case '4:3':
        return 'aspect-[4/3]';
      case '3:4':
        return 'aspect-[3/4] max-h-72';
      default:
        return 'aspect-video';
    }
  };

  const handleCopyPrompt = () => {
    navigator.clipboard.writeText(scene.prompt);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownloadImage = () => {
    if (!scene.imageUrl) return;
    const link = document.createElement('a');
    link.href = scene.imageUrl;
    const cleanTitle = (scene.title || `scene_${scene.sceneNumber}`)
      .toLowerCase()
      .replace(/[^a-z0-9]/g, '_');
    link.download = `scene_${String(scene.sceneNumber).padStart(2, '0')}_${cleanTitle}.png`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handlePolish = async () => {
    setIsPolishing(true);
    try {
      await onEnhancePrompt(scene.id);
    } finally {
      setIsPolishing(false);
    }
  };

  const isWorking = scene.status === 'generating';
  const isQueued = scene.status === 'queued';

  return (
    <div
      className={`flex flex-col bg-slate-900/95 border rounded-xl overflow-hidden transition-all duration-200 shadow-md ${
        isWorking
          ? 'border-indigo-500 shadow-lg shadow-indigo-500/10 ring-1 ring-indigo-500/30'
          : scene.status === 'success'
          ? 'border-slate-800 hover:border-slate-700'
          : scene.status === 'error'
          ? 'border-rose-900/80 shadow-rose-950/20'
          : 'border-slate-800'
      }`}
    >
      {/* Header bar */}
      <div className="flex items-center justify-between px-3.5 py-2.5 bg-slate-950/60 border-b border-slate-800/80">
        <div className="flex items-center gap-2 flex-1 min-w-0">
          <span className="flex-shrink-0 px-2 py-0.5 rounded text-xs font-bold bg-indigo-500/15 text-indigo-300 border border-indigo-500/30">
            Scene {scene.sceneNumber}
          </span>
          <input
            type="text"
            value={scene.title}
            onChange={(e) => onUpdateScene(scene.id, { title: e.target.value })}
            placeholder={`Judul Scene ${scene.sceneNumber}...`}
            className="text-xs font-semibold text-slate-200 bg-transparent border-b border-transparent hover:border-slate-700 focus:border-indigo-500 focus:outline-none px-1 py-0.5 truncate flex-1"
          />
        </div>

        {/* Status indicator & card reordering */}
        <div className="flex items-center gap-1.5 flex-shrink-0">
          {scene.status === 'success' && (
            <span className="flex items-center gap-1 text-[11px] font-medium text-emerald-400 bg-emerald-950/40 border border-emerald-800/50 px-2 py-0.5 rounded-full">
              <CheckCircle2 className="w-3 h-3" />
              Selesai
            </span>
          )}
          {isWorking && (
            <span className="flex items-center gap-1 text-[11px] font-medium text-indigo-300 bg-indigo-950/50 border border-indigo-700/50 px-2 py-0.5 rounded-full animate-pulse">
              <Loader2 className="w-3 h-3 animate-spin" />
              Memproses...
            </span>
          )}
          {isQueued && (
            <span className="flex items-center gap-1 text-[11px] font-medium text-amber-300 bg-amber-950/40 border border-amber-800/40 px-2 py-0.5 rounded-full">
              Antrean
            </span>
          )}
          {scene.status === 'error' && (
            <span className="flex items-center gap-1 text-[11px] font-medium text-rose-400 bg-rose-950/40 border border-rose-800/50 px-2 py-0.5 rounded-full">
              <AlertCircle className="w-3 h-3" />
              Gagal
            </span>
          )}

          {/* Quick scene move */}
          <div className="flex items-center ml-1 border-l border-slate-800 pl-1.5 space-x-0.5">
            <button
              onClick={() => onMoveScene(scene.id, 'up')}
              disabled={scene.sceneNumber <= 1}
              className="p-1 text-slate-400 hover:text-white disabled:opacity-30 rounded hover:bg-slate-800 transition cursor-pointer"
              title="Pindahkan Scene ke Atas"
            >
              <ArrowUp className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => onMoveScene(scene.id, 'down')}
              disabled={scene.sceneNumber >= totalScenes}
              className="p-1 text-slate-400 hover:text-white disabled:opacity-30 rounded hover:bg-slate-800 transition cursor-pointer"
              title="Pindahkan Scene ke Bawah"
            >
              <ArrowDown className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>

      {/* Visual Canvas / Preview Area */}
      <div
        className={`relative w-full bg-slate-950 flex items-center justify-center overflow-hidden group ${getAspectRatioClass(
          globalAspectRatio
        )}`}
      >
        {scene.imageUrl ? (
          <>
            <img
              src={scene.imageUrl}
              alt={`Scene ${scene.sceneNumber} - ${scene.title}`}
              className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-[1.02] cursor-pointer"
              onClick={() => onOpenLightbox(scene)}
              referrerPolicy="no-referrer"
            />
            {/* Hover overlay with action buttons */}
            <div className="absolute inset-0 bg-gradient-to-t from-slate-950/90 via-slate-950/30 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-200 flex flex-col justify-between p-3">
              <div className="flex justify-end gap-1.5">
                <button
                  onClick={() => onOpenLightbox(scene)}
                  className="p-1.5 rounded-lg bg-slate-900/80 text-white hover:bg-slate-800 backdrop-blur border border-white/10 transition cursor-pointer"
                  title="Lihat Gambar Ukuran Penuh"
                >
                  <Maximize2 className="w-4 h-4" />
                </button>
                <button
                  onClick={handleDownloadImage}
                  className="p-1.5 rounded-lg bg-slate-900/80 text-emerald-400 hover:bg-slate-800 backdrop-blur border border-white/10 transition cursor-pointer"
                  title="Download Gambar Ini (.PNG)"
                >
                  <Download className="w-4 h-4" />
                </button>
              </div>

              <div className="flex items-center justify-between text-xs text-slate-300">
                <span className="truncate max-w-[70%] font-medium text-white drop-shadow">
                  {scene.title || `Scene ${scene.sceneNumber}`}
                </span>
                <button
                  onClick={() => onGenerateSingle(scene.id)}
                  disabled={isWorking || isGeneratingBatch}
                  className="flex items-center gap-1 px-2.5 py-1 rounded bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold shadow transition cursor-pointer disabled:opacity-50"
                  title="Generate ulang gambar scene ini saja"
                >
                  <RotateCcw className="w-3 h-3" />
                  Regenerate
                </button>
              </div>
            </div>
          </>
        ) : isWorking ? (
          <div className="flex flex-col items-center justify-center p-6 text-center space-y-3">
            <div className="relative">
              <div className="w-12 h-12 rounded-full border-2 border-indigo-500/20 border-t-indigo-500 animate-spin" />
              <div className="absolute inset-0 flex items-center justify-center">
                <Sparkles className="w-5 h-5 text-indigo-400 animate-pulse" />
              </div>
            </div>
            <div>
              <p className="text-xs font-bold text-slate-200">
                Menghasilkan Gambar Scene {scene.sceneNumber}...
              </p>
              <p className="text-[11px] text-slate-400 mt-0.5">
                Model AI sedang merender prompt visual
              </p>
            </div>
          </div>
        ) : scene.status === 'error' ? (
          <div className="flex flex-col items-center justify-center p-6 text-center space-y-2.5">
            <div className="w-10 h-10 rounded-full bg-rose-500/10 border border-rose-500/30 flex items-center justify-center text-rose-400">
              <AlertCircle className="w-5 h-5" />
            </div>
            <div>
              <p className="text-xs font-bold text-rose-300">Gagal Menghasilkan Gambar</p>
              <p className="text-[11px] text-rose-400/80 max-w-xs mt-0.5 line-clamp-2" title={scene.error}>
                {scene.error || 'Terjadi kesalahan saat memproses prompt.'}
              </p>
            </div>
            <button
              onClick={() => onGenerateSingle(scene.id)}
              className="mt-1 px-3 py-1 text-xs font-semibold bg-rose-600 hover:bg-rose-500 text-white rounded-lg transition cursor-pointer"
            >
              Coba Lagi
            </button>
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center p-6 text-center space-y-2 text-slate-500">
            <div className="w-12 h-12 rounded-xl border border-dashed border-slate-800 flex items-center justify-center">
              <span className="text-base font-bold text-slate-600">{scene.sceneNumber}</span>
            </div>
            <p className="text-xs font-medium text-slate-400">Belum di-generate</p>
            <button
              onClick={() => onGenerateSingle(scene.id)}
              disabled={isGeneratingBatch || !scene.prompt.trim()}
              className="px-3 py-1 rounded text-xs font-semibold bg-slate-800 hover:bg-slate-700 text-slate-200 hover:text-white border border-slate-700 transition cursor-pointer disabled:opacity-40"
            >
              Generate Sekarang
            </button>
          </div>
        )}
      </div>

      {/* Scene Description & Prompt Area */}
      <div className="p-3.5 space-y-3 flex-1 flex flex-col justify-between bg-slate-900/60">
        <div className="space-y-2">
          {/* Indonesian context note if available */}
          {scene.sceneDescriptionId && (
            <div className="text-[11px] text-indigo-300/90 bg-indigo-950/30 border border-indigo-900/40 rounded px-2.5 py-1">
              <span className="font-semibold">Alur Cerita:</span> {scene.sceneDescriptionId}
            </div>
          )}

          {/* Prompt textarea */}
          <div className="space-y-1">
            <div className="flex items-center justify-between text-[11px] font-semibold text-slate-400">
              <span>Prompt Scene (Visual Detail):</span>
              <div className="flex items-center gap-1.5">
                <button
                  onClick={handleCopyPrompt}
                  className="flex items-center gap-1 text-slate-400 hover:text-slate-200 transition cursor-pointer"
                  title="Salin Prompt"
                >
                  {copied ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                  <span>{copied ? 'Tersalin' : 'Salin'}</span>
                </button>
                <button
                  onClick={handlePolish}
                  disabled={isPolishing || !scene.prompt.trim()}
                  className="flex items-center gap-1 text-indigo-400 hover:text-indigo-300 disabled:opacity-40 transition cursor-pointer ml-1"
                  title="Poles dan perindah prompt ini menggunakan AI"
                >
                  <Sparkles className="w-3 h-3" />
                  <span>{isPolishing ? 'Memoles...' : 'Poles AI'}</span>
                </button>
              </div>
            </div>

            <textarea
              rows={3}
              value={scene.prompt}
              onChange={(e) => onUpdateScene(scene.id, { prompt: e.target.value })}
              placeholder={`Deskripsikan gambar untuk Scene ${scene.sceneNumber}... (Contoh: Karakter sedang berjalan di jalanan kota saat senja, pencahayaan sinematik...)`}
              className="w-full text-xs text-slate-200 bg-slate-950 border border-slate-800 rounded-lg p-2.5 focus:outline-none focus:border-indigo-500 transition resize-none leading-relaxed placeholder:text-slate-600"
            />

            {/* Reference Image for this scene */}
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleFileUpload}
              accept="image/*"
              className="hidden"
            />

            <div className="flex items-center justify-between text-[11px] bg-slate-950/70 p-2 rounded-lg border border-slate-800/80">
              {scene.referenceImage ? (
                <div className="flex items-center gap-2 flex-1 min-w-0">
                  <div className="relative group w-7 h-7 rounded border border-indigo-500 overflow-hidden flex-shrink-0 bg-black">
                    <img
                      src={scene.referenceImage}
                      alt="Referensi Scene"
                      className="w-full h-full object-cover"
                      referrerPolicy="no-referrer"
                    />
                  </div>
                  <span className="text-[11px] text-indigo-300 font-medium truncate">
                    Foto Referensi Khusus Scene Ini
                  </span>
                  <button
                    type="button"
                    onClick={handleRemoveSceneRef}
                    className="p-1 text-slate-400 hover:text-rose-400 rounded transition cursor-pointer ml-auto"
                    title="Hapus referensi khusus scene ini"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              ) : globalReferenceImage ? (
                <div className="flex items-center gap-2 flex-1 min-w-0">
                  <div className="w-6 h-6 rounded border border-emerald-500 overflow-hidden flex-shrink-0 bg-black">
                    <img
                      src={globalReferenceImage}
                      alt="Referensi Global"
                      className="w-full h-full object-cover"
                      referrerPolicy="no-referrer"
                    />
                  </div>
                  <span className="text-[11px] text-emerald-300 font-medium truncate">
                    Pakai Foto Referensi Wajah Utama
                  </span>
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="text-[10px] text-slate-400 hover:text-white underline cursor-pointer ml-auto flex-shrink-0"
                    title="Ganti dengan foto lain khusus scene ini"
                  >
                    Ganti
                  </button>
                </div>
              ) : (
                <div className="flex items-center justify-between w-full">
                  <span className="text-slate-400 text-[11px] flex items-center gap-1">
                    <ImageIcon className="w-3 h-3 text-slate-400" />
                    <span>Referensi Wajah / Objek Scene:</span>
                  </span>
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="flex items-center gap-1 text-[10px] text-indigo-400 hover:text-indigo-300 hover:underline cursor-pointer font-medium"
                  >
                    <Upload className="w-2.5 h-2.5" />
                    <span>+ Upload Foto</span>
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* Camera & Lighting Quick Pills Selector */}
          <div className="space-y-1.5">
            <button
              type="button"
              onClick={() => setShowTags(!showTags)}
              className="text-[11px] text-slate-400 hover:text-slate-300 flex items-center gap-1 cursor-pointer font-medium"
            >
              <Camera className="w-3 h-3 text-amber-400" />
              <span>Sudut Kamera & Pencahayaan:</span>
              <span className="text-slate-500 underline ml-1">
                {showTags ? 'Tutup Pilihan' : 'Ubah Pengaturan'}
              </span>
            </button>

            {/* Display active tags */}
            <div className="flex flex-wrap gap-1.5 text-[10px]">
              {scene.cameraAngle && (
                <span className="px-2 py-0.5 rounded bg-slate-800 text-amber-300 border border-slate-700 flex items-center gap-1">
                  <Camera className="w-2.5 h-2.5" />
                  {scene.cameraAngle}
                </span>
              )}
              {scene.lighting && (
                <span className="px-2 py-0.5 rounded bg-slate-800 text-cyan-300 border border-slate-700 flex items-center gap-1">
                  <Sun className="w-2.5 h-2.5" />
                  {scene.lighting}
                </span>
              )}
            </div>

            {/* Collapsible tags selection */}
            {showTags && (
              <div className="p-2.5 rounded-lg bg-slate-950 border border-slate-800 space-y-2 mt-1">
                <div>
                  <span className="text-[10px] font-semibold text-slate-400 block mb-1">
                    Sudut Kamera (Camera Angle):
                  </span>
                  <div className="flex flex-wrap gap-1">
                    {CAMERA_ANGLES.map((cam) => (
                      <button
                        key={cam}
                        type="button"
                        onClick={() =>
                          onUpdateScene(scene.id, {
                            cameraAngle: scene.cameraAngle === cam ? '' : cam,
                          })
                        }
                        className={`px-1.5 py-0.5 text-[10px] rounded border transition cursor-pointer ${
                          scene.cameraAngle === cam
                            ? 'bg-amber-500/20 border-amber-500/50 text-amber-300'
                            : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-slate-200'
                        }`}
                      >
                        {cam}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <span className="text-[10px] font-semibold text-slate-400 block mb-1">
                    Pencahayaan & Suasana (Lighting):
                  </span>
                  <div className="flex flex-wrap gap-1">
                    {LIGHTING_PRESETS.map((light) => (
                      <button
                        key={light}
                        type="button"
                        onClick={() =>
                          onUpdateScene(scene.id, {
                            lighting: scene.lighting === light ? '' : light,
                          })
                        }
                        className={`px-1.5 py-0.5 text-[10px] rounded border transition cursor-pointer ${
                          scene.lighting === light
                            ? 'bg-cyan-500/20 border-cyan-500/50 text-cyan-300'
                            : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-slate-200'
                        }`}
                      >
                        {light}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Footer actions */}
        <div className="pt-2 border-t border-slate-800/80 flex items-center justify-between gap-2">
          <div className="flex items-center gap-1">
            <button
              onClick={() => onDuplicateScene(scene.id)}
              className="p-1.5 text-slate-400 hover:text-slate-200 hover:bg-slate-800 rounded transition cursor-pointer"
              title="Duplikat Scene Ini"
            >
              <CopyPlus className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => onDeleteScene(scene.id)}
              disabled={totalScenes <= 1}
              className="p-1.5 text-slate-400 hover:text-rose-400 hover:bg-rose-950/30 rounded transition cursor-pointer disabled:opacity-30"
              title="Hapus Scene Ini"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          </div>

          <button
            onClick={() => onGenerateSingle(scene.id)}
            disabled={isWorking || isGeneratingBatch || !scene.prompt.trim()}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-indigo-600 hover:bg-indigo-500 text-white shadow-sm transition cursor-pointer disabled:opacity-40"
          >
            {scene.imageUrl ? <RotateCcw className="w-3 h-3" /> : <Play className="w-3 h-3 fill-current" />}
            <span>{scene.imageUrl ? 'Regenerate' : 'Generate'}</span>
          </button>
        </div>
      </div>
    </div>
  );
};
