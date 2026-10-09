import React, { useRef } from 'react';
import {
  Palette,
  UserCheck,
  Ratio,
  Cpu,
  Layers,
  BookOpen,
  Trash2,
  Check,
  ChevronDown,
  Info,
  Upload,
  Image as ImageIcon,
  X,
} from 'lucide-react';
import { StoryboardSettings, AspectRatioType } from '../types/storyboard';
import { STYLE_PRESETS, PRESET_STORIES, PresetStory } from '../data/storyboardPresets';

interface GlobalControlsProps {
  settings: StoryboardSettings;
  onUpdateSettings: (newSettings: Partial<StoryboardSettings>) => void;
  onLoadPresetStory: (preset: PresetStory) => void;
  onClearAllScenes: () => void;
  sceneCount: number;
}

export const GlobalControls: React.FC<GlobalControlsProps> = ({
  settings,
  onUpdateSettings,
  onLoadPresetStory,
  onClearAllScenes,
  sceneCount,
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const currentPreset = STYLE_PRESETS.find((p) => p.id === settings.stylePreset) || STYLE_PRESETS[0];

  const aspectRatios: { value: AspectRatioType; label: string; desc: string; iconClass: string }[] = [
    { value: '16:9', label: '16:9', desc: 'YouTube / Bioskop (Landscape)', iconClass: 'w-6 h-3.5' },
    { value: '9:16', label: '9:16', desc: 'TikTok / Reels / Shorts (Vertikal)', iconClass: 'w-3.5 h-6' },
    { value: '1:1', label: '1:1', desc: 'Instagram / Feed Persegi', iconClass: 'w-4 h-4' },
    { value: '4:3', label: '4:3', desc: 'Format Standar Klasik', iconClass: 'w-5 h-4' },
    { value: '3:4', label: '3:4', desc: 'Format Potret Klasik', iconClass: 'w-4 h-5' },
  ];

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      alert('Silakan pilih file gambar (JPG, PNG, atau WEBP).');
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      const dataUrl = event.target?.result as string;
      if (dataUrl) {
        onUpdateSettings({
          globalReferenceImage: dataUrl,
          applyGlobalReferenceToAll: true,
        });
      }
    };
    reader.readAsDataURL(file);
    e.target.value = '';
  };

  const handleRemoveImage = () => {
    onUpdateSettings({
      globalReferenceImage: undefined,
      applyGlobalReferenceToAll: false,
    });
  };

  return (
    <div className="bg-slate-900/90 border-b border-slate-800 p-4 sm:p-5 text-slate-200">
      <div className="max-w-7xl mx-auto space-y-4">
        {/* Top bar: Presets & Templates */}
        <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-slate-800/80">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs font-semibold text-slate-400 flex items-center gap-1.5">
              <BookOpen className="w-3.5 h-3.5 text-indigo-400" />
              Contoh Cerita Siap Pakai (10 Scene):
            </span>
            <div className="flex flex-wrap gap-1.5">
              {PRESET_STORIES.map((preset) => (
                <button
                  key={preset.id}
                  onClick={() => onLoadPresetStory(preset)}
                  className="px-2.5 py-1 text-xs rounded-md bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 hover:border-indigo-500/50 transition cursor-pointer font-medium"
                >
                  {preset.title}
                </button>
              ))}
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={onClearAllScenes}
              className="text-xs text-rose-400 hover:text-rose-300 hover:bg-rose-950/40 px-2 py-1 rounded border border-rose-900/50 transition cursor-pointer flex items-center gap-1"
              title="Kosongkan semua scene untuk mulai dari awal"
            >
              <Trash2 className="w-3 h-3" />
              Reset Scene
            </button>
          </div>
        </div>

        {/* Core Controls Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* 1. Style Preset Selector */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-slate-300 flex items-center justify-between">
              <span className="flex items-center gap-1.5">
                <Palette className="w-3.5 h-3.5 text-rose-400" />
                Gaya Seni (Style Preset)
              </span>
              <span className="text-[11px] text-slate-400">{currentPreset.category}</span>
            </label>
            <div className="relative">
              <select
                value={settings.stylePreset}
                onChange={(e) => onUpdateSettings({ stylePreset: e.target.value })}
                className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs font-medium text-slate-200 focus:outline-none focus:border-indigo-500 transition appearance-none cursor-pointer pr-8"
              >
                {STYLE_PRESETS.map((preset) => (
                  <option key={preset.id} value={preset.id}>
                    {preset.name}
                  </option>
                ))}
              </select>
              <ChevronDown className="w-4 h-4 text-slate-400 absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            </div>
            <p className="text-[11px] text-slate-400 truncate" title={currentPreset.description}>
              {currentPreset.description}
            </p>
          </div>

          {/* 2. Character & Subject Consistency Lock & Face Reference Upload */}
          <div className="space-y-1.5 md:col-span-1 lg:col-span-2">
            <div className="flex items-center justify-between">
              <label className="text-xs font-semibold text-slate-300 flex items-center gap-1.5">
                <UserCheck className="w-3.5 h-3.5 text-emerald-400" />
                Konsistensi Karakter & Foto Referensi Wajah
              </label>
              <label className="flex items-center gap-1 text-[11px] text-slate-400 cursor-pointer">
                <input
                  type="checkbox"
                  checked={settings.applyCharacterToAll}
                  onChange={(e) => onUpdateSettings({ applyCharacterToAll: e.target.checked })}
                  className="rounded border-slate-700 text-indigo-600 focus:ring-0 w-3 h-3 bg-slate-950"
                />
                Sisipkan teks ke semua scene
              </label>
            </div>

            <div className="flex gap-2 items-center">
              {/* Reference image preview / upload button */}
              <input
                type="file"
                ref={fileInputRef}
                onChange={handleFileUpload}
                accept="image/*"
                className="hidden"
              />

              {settings.globalReferenceImage ? (
                <div className="relative group flex-shrink-0 w-11 h-11 rounded-lg overflow-hidden border-2 border-emerald-500 shadow-md shadow-emerald-500/20 bg-black">
                  <img
                    src={settings.globalReferenceImage}
                    alt="Foto Referensi Wajah"
                    className="w-full h-full object-cover"
                    referrerPolicy="no-referrer"
                  />
                  <button
                    type="button"
                    onClick={handleRemoveImage}
                    className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 flex items-center justify-center text-rose-400 transition cursor-pointer"
                    title="Hapus Foto Referensi"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="flex-shrink-0 w-11 h-11 rounded-lg border border-dashed border-slate-700 hover:border-emerald-500/60 bg-slate-950 hover:bg-slate-800 flex flex-col items-center justify-center text-slate-400 hover:text-emerald-300 transition cursor-pointer"
                  title="Upload Foto Muka / Karakter sebagai Referensi Visual"
                >
                  <Upload className="w-3.5 h-3.5" />
                  <span className="text-[9px] mt-0.5 font-bold">Foto</span>
                </button>
              )}

              <input
                type="text"
                value={settings.characterConsistency}
                onChange={(e) => onUpdateSettings({ characterConsistency: e.target.value })}
                placeholder="Deskripsi karakter (misal: Pria usia 30-an berkacamata bulat, berambut hitam ikal...)"
                className="flex-1 bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-slate-200 placeholder:text-slate-500 focus:outline-none focus:border-emerald-500 transition"
              />
            </div>

            <div className="flex items-center justify-between text-[11px] text-slate-400">
              <span className="flex items-center gap-1">
                {settings.globalReferenceImage ? (
                  <span className="text-emerald-400 font-semibold flex items-center gap-1">
                    <Check className="w-3 h-3" /> Foto referensi aktif (AI akan meniru wajah & karakter ini di tiap scene)
                  </span>
                ) : (
                  <span>Upload foto muka untuk menjaga kemiripan wajah orang/karakter di semua scene.</span>
                )}
              </span>
              {settings.globalReferenceImage && (
                <label className="flex items-center gap-1 text-[11px] text-emerald-300 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={settings.applyGlobalReferenceToAll}
                    onChange={(e) => onUpdateSettings({ applyGlobalReferenceToAll: e.target.checked })}
                    className="rounded border-slate-700 text-emerald-600 focus:ring-0 w-3 h-3 bg-slate-950"
                  />
                  Gunakan di semua scene
                </label>
              )}
            </div>
          </div>

          {/* 3. Aspect Ratio Selector */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-slate-300 flex items-center gap-1.5">
              <Ratio className="w-3.5 h-3.5 text-amber-400" />
              Aspek Rasio Gambar
            </label>
            <div className="grid grid-cols-5 gap-1">
              {aspectRatios.map((ar) => (
                <button
                  key={ar.value}
                  type="button"
                  onClick={() => onUpdateSettings({ aspectRatio: ar.value })}
                  className={`flex flex-col items-center justify-center p-1.5 rounded-lg border text-xs transition cursor-pointer ${
                    settings.aspectRatio === ar.value
                      ? 'bg-amber-500/15 border-amber-500 text-amber-300 font-bold'
                      : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-slate-200 hover:bg-slate-800'
                  }`}
                  title={ar.desc}
                >
                  <span className="text-[11px]">{ar.label}</span>
                </button>
              ))}
            </div>
            <p className="text-[11px] text-slate-400 truncate">
              {aspectRatios.find((a) => a.value === settings.aspectRatio)?.desc}
            </p>
          </div>
        </div>

        {/* Secondary options row */}
        <div className="flex flex-wrap items-center justify-between gap-3 pt-2 text-xs text-slate-400 border-t border-slate-800/60">
          <div className="flex flex-wrap items-center gap-4">
            {/* AI Model */}
            <div className="flex items-center gap-2">
              <span className="flex items-center gap-1 text-slate-300">
                <Cpu className="w-3 h-3 text-indigo-400" />
                Model AI:
              </span>
              <select
                value={settings.model}
                onChange={(e) => onUpdateSettings({ model: e.target.value as any })}
                className="bg-slate-950 border border-slate-800 rounded px-2 py-1 text-xs text-slate-200 focus:outline-none focus:border-indigo-500"
              >
                <option value="gemini-3.1-flash-lite-image">gemini-3.1-flash-lite-image (Cepat & Tajam)</option>
                <option value="gemini-nano-banana-2.1">gemini-nano-banana-2.1 (Ultra Detail 1K/2K)</option>
              </select>
            </div>

            {/* Batch Concurrency */}
            <div className="flex items-center gap-2">
              <span className="flex items-center gap-1 text-slate-300">
                <Layers className="w-3 h-3 text-cyan-400" />
                Kecepatan Antrean:
              </span>
              <div className="flex rounded border border-slate-800 bg-slate-950 overflow-hidden">
                <button
                  type="button"
                  onClick={() => onUpdateSettings({ concurrency: 1 })}
                  className={`px-2 py-0.5 text-xs font-medium cursor-pointer ${
                    settings.concurrency === 1
                      ? 'bg-indigo-600 text-white'
                      : 'text-slate-400 hover:text-white'
                  }`}
                  title="Generate 1 scene per waktu secara berurutan (paling stabil)"
                >
                  1 per 1 (Stabil)
                </button>
                <button
                  type="button"
                  onClick={() => onUpdateSettings({ concurrency: 2 })}
                  className={`px-2 py-0.5 text-xs font-medium cursor-pointer ${
                    settings.concurrency === 2
                      ? 'bg-indigo-600 text-white'
                      : 'text-slate-400 hover:text-white'
                  }`}
                  title="Generate 2 scene bersamaan secara paralel (lebih cepat)"
                >
                  2 Paralel (Cepat)
                </button>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-1 text-[11px] text-slate-500">
            <Info className="w-3 h-3 text-slate-400" />
            Setiap scene tetap memiliki prompt unik yang bisa diedit bebas kapan saja.
          </div>
        </div>
      </div>
    </div>
  );
};
