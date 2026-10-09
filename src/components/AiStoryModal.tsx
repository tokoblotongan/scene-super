import React, { useState } from 'react';
import {
  Sparkles,
  X,
  Layers,
  Wand2,
  Check,
  AlertCircle,
  Loader2,
  ArrowRight,
  ChevronRight,
  BookOpen,
} from 'lucide-react';
import { STYLE_PRESETS } from '../data/storyboardPresets';
import { SceneItem } from '../types/storyboard';

interface AiStoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  onApplyScenes: (scenes: Array<Omit<SceneItem, 'id' | 'status'>>) => void;
  currentStyleId: string;
  currentCharacter: string;
}

export const AiStoryModal: React.FC<AiStoryModalProps> = ({
  isOpen,
  onClose,
  onApplyScenes,
  currentStyleId,
  currentCharacter,
}) => {
  const [storyInput, setStoryInput] = useState('');
  const [sceneCount, setSceneCount] = useState(10);
  const [stylePreset, setStylePreset] = useState(currentStyleId || 'cinematic');
  const [characterDetails, setCharacterDetails] = useState(currentCharacter || '');
  const [lighting, setLighting] = useState('Cinematic dynamic lighting');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [generatedResult, setGeneratedResult] = useState<{
    storySummary: string;
    scenes: Array<{
      sceneNumber: number;
      title: string;
      prompt: string;
      sceneDescriptionId: string;
      cameraAngle: string;
      lighting: string;
    }>;
  } | null>(null);

  if (!isOpen) return null;

  const sampleIdeas = [
    'Petualangan rubah kecil penyihir mencari bintang jatuh di hutan kristal',
    'Perjalanan kereta uap ajaib menembus awan menuju kota melayang',
    'Koki muda yang mengikuti kompetisi memasak ramen terhebat di dunia',
    'Robot pembersih gurun yang menemukan bunga terakhir di bumi masa depan',
  ];

  const handleGenerateStory = async () => {
    if (!storyInput.trim()) {
      setError('Silakan masukkan ide cerita atau ringkasan skrip.');
      return;
    }

    setLoading(true);
    setError(null);
    setGeneratedResult(null);

    try {
      const selectedStyle = STYLE_PRESETS.find((s) => s.id === stylePreset)?.name || stylePreset;
      const res = await fetch('/api/ai-script-to-scenes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          story: storyInput,
          sceneCount,
          stylePreset: selectedStyle,
          characterDetails,
          lighting,
        }),
      });

      const text = await res.text();
      let data: any;
      try {
        data = JSON.parse(text);
      } catch {
        if (text.includes('<!DOCTYPE') || text.includes('<html')) {
          throw new Error('Server mengembalikan halaman web HTML bukannya data JSON. Pastikan GEMINI_API_KEY sudah disetel di Vercel Environment Variables.');
        }
        throw new Error(`Respon server tidak valid: ${text.slice(0, 80)}`);
      }

      if (!res.ok) {
        throw new Error(data.error || 'Gagal memproses cerita dengan AI.');
      }

      setGeneratedResult(data);
    } catch (err: any) {
      console.error(err);
      setError(err?.message || 'Terjadi kesalahan saat menghubungkan ke server.');
    } finally {
      setLoading(false);
    }
  };

  const handleApply = () => {
    if (!generatedResult?.scenes?.length) return;
    const formattedScenes = generatedResult.scenes.map((s) => ({
      sceneNumber: s.sceneNumber,
      title: s.title,
      prompt: s.prompt,
      sceneDescriptionId: s.sceneDescriptionId,
      cameraAngle: s.cameraAngle,
      lighting: s.lighting,
    }));
    onApplyScenes(formattedScenes);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-3 sm:p-5 overflow-y-auto">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-3xl shadow-2xl overflow-hidden my-auto max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 bg-slate-950 border-b border-slate-800">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-indigo-600 to-rose-600 flex items-center justify-center text-white shadow">
              <Wand2 className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white">AI Story to Scene Generator</h2>
              <p className="text-xs text-slate-400">
                Ubah ide cerita atau skrip menjadi Scene 1 s/d {sceneCount} dengan visual prompt runtut
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-5 overflow-y-auto space-y-4 flex-1">
          {error && (
            <div className="p-3 rounded-lg bg-rose-950/50 border border-rose-800 text-rose-300 text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {!generatedResult ? (
            <div className="space-y-4">
              {/* Story Prompt Input */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-200 flex items-center justify-between">
                  <span>Tuliskan Ide Cerita / Sinopsis / Skrip Video:</span>
                  <span className="text-slate-500 font-normal text-[11px]">Bisa Bahasa Indonesia atau Inggris</span>
                </label>
                <textarea
                  rows={4}
                  value={storyInput}
                  onChange={(e) => setStoryInput(e.target.value)}
                  placeholder="Contoh: Seekor kucing astronot pemberani bernama Luna yang meluncur ke luar angkasa untuk mencari bintang ikan ajaib, menghadapi badai asteroid, dan menemukan nebula pelangi..."
                  className="w-full text-xs text-slate-100 bg-slate-950 border border-slate-800 rounded-xl p-3 focus:outline-none focus:border-indigo-500 transition resize-none leading-relaxed"
                />

                {/* Quick Ideas */}
                <div className="flex flex-wrap items-center gap-1.5 pt-1">
                  <span className="text-[11px] text-slate-500">Inspirasi cepat:</span>
                  {sampleIdeas.map((idea, idx) => (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => setStoryInput(idea)}
                      className="text-[11px] text-indigo-400 hover:text-indigo-300 bg-indigo-950/40 hover:bg-indigo-950/70 border border-indigo-900/50 rounded px-2 py-0.5 transition cursor-pointer"
                    >
                      {idea.slice(0, 35)}...
                    </button>
                  ))}
                </div>
              </div>

              {/* Configuration Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2">
                {/* Scene count */}
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-300 flex items-center justify-between">
                    <span>Jumlah Scene:</span>
                    <span className="text-indigo-400 font-bold">{sceneCount} Scene</span>
                  </label>
                  <input
                    type="range"
                    min={3}
                    max={12}
                    value={sceneCount}
                    onChange={(e) => setSceneCount(Number(e.target.value))}
                    className="w-full accent-indigo-500 bg-slate-950 cursor-pointer"
                  />
                  <div className="flex justify-between text-[10px] text-slate-500">
                    <span>3 Scene</span>
                    <span className="font-semibold text-indigo-300">10 Scene (Ideal)</span>
                    <span>12 Scene</span>
                  </div>
                </div>

                {/* Style */}
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-300">Gaya Visual:</label>
                  <select
                    value={stylePreset}
                    onChange={(e) => setStylePreset(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-2.5 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-indigo-500"
                  >
                    {STYLE_PRESETS.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.name}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Character consistency */}
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-300">Ciri Karakter Utama:</label>
                  <input
                    type="text"
                    value={characterDetails}
                    onChange={(e) => setCharacterDetails(e.target.value)}
                    placeholder="Contoh: Kucing oren dengan helm astronot..."
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-2.5 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-indigo-500"
                  />
                </div>
              </div>
            </div>
          ) : (
            /* Results preview */
            <div className="space-y-3">
              <div className="p-3 rounded-xl bg-indigo-950/30 border border-indigo-900/60">
                <span className="text-xs font-bold text-indigo-300 block mb-0.5">
                  Ringkasan Alur Cerita:
                </span>
                <p className="text-xs text-slate-300 leading-relaxed">
                  {generatedResult.storySummary}
                </p>
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-300">
                    Daftar {generatedResult.scenes.length} Scene yang Dihasilkan:
                  </span>
                  <button
                    onClick={() => setGeneratedResult(null)}
                    className="text-xs text-indigo-400 hover:text-indigo-300 cursor-pointer"
                  >
                    Ubah Ide Cerita
                  </button>
                </div>

                <div className="space-y-2 max-h-80 overflow-y-auto pr-1">
                  {generatedResult.scenes.map((scene) => (
                    <div
                      key={scene.sceneNumber}
                      className="p-3 rounded-lg bg-slate-950 border border-slate-800 text-xs space-y-1.5"
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span className="px-1.5 py-0.5 rounded font-bold text-[10px] bg-indigo-500/20 text-indigo-300">
                            Scene {scene.sceneNumber}
                          </span>
                          <span className="font-semibold text-slate-200">{scene.title}</span>
                        </div>
                        <div className="flex items-center gap-1 text-[10px] text-slate-400">
                          <span className="bg-slate-900 px-1.5 py-0.5 rounded border border-slate-800">
                            {scene.cameraAngle}
                          </span>
                        </div>
                      </div>
                      <p className="text-slate-400 text-[11px] leading-relaxed">
                        <span className="text-slate-500 font-medium">Alur:</span> {scene.sceneDescriptionId}
                      </p>
                      <p className="text-slate-300 text-[11px] font-mono bg-slate-900/80 p-2 rounded border border-slate-800/80 leading-relaxed">
                        {scene.prompt}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-5 py-3.5 bg-slate-950 border-t border-slate-800 flex items-center justify-between">
          <button
            onClick={onClose}
            className="px-3.5 py-1.5 rounded-lg text-xs font-semibold text-slate-400 hover:text-white transition cursor-pointer"
          >
            Batal
          </button>

          {!generatedResult ? (
            <button
              onClick={handleGenerateStory}
              disabled={loading || !storyInput.trim()}
              className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold bg-gradient-to-r from-indigo-600 to-rose-600 hover:from-indigo-500 hover:to-rose-500 text-white shadow-lg shadow-indigo-600/20 transition cursor-pointer disabled:opacity-40"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Membuat {sceneCount} Scene dengan AI...</span>
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4 text-amber-300" />
                  <span>Generate {sceneCount} Scene Sekarang</span>
                </>
              )}
            </button>
          ) : (
            <button
              onClick={handleApply}
              className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold bg-emerald-600 hover:bg-emerald-500 text-white shadow-lg shadow-emerald-600/20 transition cursor-pointer"
            >
              <Check className="w-4 h-4" />
              <span>Terapkan {generatedResult.scenes.length} Scene ke Storyboard</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
