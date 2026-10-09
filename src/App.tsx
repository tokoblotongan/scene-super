import React, { useState, useEffect, useRef } from 'react';
import JSZip from 'jszip';
import {
  Sparkles,
  Layers,
  Plus,
  Play,
  RotateCcw,
  Download,
  AlertCircle,
  CheckCircle,
  HelpCircle,
  Lightbulb,
  Palette,
  Film,
  Camera,
} from 'lucide-react';
import { SceneItem, StoryboardSettings, AspectRatioType } from './types/storyboard';
import { STYLE_PRESETS, PRESET_STORIES, PresetStory } from './data/storyboardPresets';
import { Header } from './components/Header';
import { GlobalControls } from './components/GlobalControls';
import { SceneCard } from './components/SceneCard';
import { AiStoryModal } from './components/AiStoryModal';
import { BulkPromptModal } from './components/BulkPromptModal';
import { SlideshowModal } from './components/SlideshowModal';
import { ImageLightboxModal } from './components/ImageLightboxModal';

const DEFAULT_SETTINGS: StoryboardSettings = {
  stylePreset: 'pixar',
  customStylePrompt: '',
  characterConsistency: 'Chubby orange tabby cat named Luna in a high-tech white astronaut spacesuit with a glowing clear visor and blue LED collar',
  applyCharacterToAll: true,
  globalReferenceImage: undefined,
  applyGlobalReferenceToAll: true,
  aspectRatio: '16:9',
  model: 'gemini-3.1-flash-lite-image',
  concurrency: 1,
};

export default function App() {
  // Initialize with the 10-scene Space Cat preset
  const [scenes, setScenes] = useState<SceneItem[]>(() => {
    const saved = localStorage.getItem('storyboard_scenes');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {
        // fallback
      }
    }
    const defaultStory = PRESET_STORIES[0];
    return defaultStory.scenes.map((s, index) => ({
      ...s,
      id: `scene-${index + 1}-${Date.now()}`,
      status: 'idle',
    }));
  });

  const [settings, setSettings] = useState<StoryboardSettings>(() => {
    const saved = localStorage.getItem('storyboard_settings');
    if (saved) {
      try {
        return { ...DEFAULT_SETTINGS, ...JSON.parse(saved) };
      } catch (e) {
        // fallback
      }
    }
    return DEFAULT_SETTINGS;
  });

  const [isGeneratingBatch, setIsGeneratingBatch] = useState(false);
  const [showControls, setShowControls] = useState(true);
  const [isAiModalOpen, setIsAiModalOpen] = useState(false);
  const [isBulkModalOpen, setIsBulkModalOpen] = useState(false);
  const [isSlideshowOpen, setIsSlideshowOpen] = useState(false);
  const [lightboxScene, setLightboxScene] = useState<SceneItem | null>(null);
  const [toastMessage, setToastMessage] = useState<{ text: string; type: 'info' | 'success' | 'error' } | null>(null);

  const stopBatchRef = useRef(false);

  // Save to localStorage
  useEffect(() => {
    localStorage.setItem('storyboard_scenes', JSON.stringify(scenes));
  }, [scenes]);

  useEffect(() => {
    localStorage.setItem('storyboard_settings', JSON.stringify(settings));
  }, [settings]);

  const showToast = (text: string, type: 'info' | 'success' | 'error' = 'info') => {
    setToastMessage({ text, type });
    setTimeout(() => setToastMessage(null), 4000);
  };

  // Construct complete prompt including style, character consistency, and tags
  const buildFullPrompt = (scene: SceneItem): string => {
    const parts: string[] = [];

    // Core scene prompt
    parts.push(scene.prompt.trim());

    // Character consistency if enabled
    if (settings.applyCharacterToAll && settings.characterConsistency.trim()) {
      parts.push(`Subject character details: ${settings.characterConsistency.trim()}`);
    }

    // Camera angle & lighting
    if (scene.cameraAngle) {
      parts.push(`Camera angle: ${scene.cameraAngle}`);
    }
    if (scene.lighting) {
      parts.push(`Lighting: ${scene.lighting}`);
    }

    // Style preset modifier
    const currentStyle = STYLE_PRESETS.find((p) => p.id === settings.stylePreset);
    if (currentStyle && currentStyle.promptModifier) {
      parts.push(`Art Style: ${currentStyle.promptModifier}`);
    }

    return parts.join(', ');
  };

  // Generate a single scene
  const generateSingleScene = async (sceneId: string) => {
    const targetScene = scenes.find((s) => s.id === sceneId);
    if (!targetScene) return;

    setScenes((prev) =>
      prev.map((s) => (s.id === sceneId ? { ...s, status: 'generating', error: undefined } : s))
    );

    try {
      const fullPrompt = buildFullPrompt(targetScene);
      const refImages: any[] = [];
      if (targetScene.referenceImage) {
        refImages.push({ data: targetScene.referenceImage });
      } else if (settings.applyGlobalReferenceToAll && settings.globalReferenceImage) {
        refImages.push({ data: settings.globalReferenceImage });
      }

      const res = await fetch('/api/generate-image', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt: fullPrompt,
          aspectRatio: settings.aspectRatio,
          model: settings.model,
          referenceImages: refImages,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Gagal menghasilkan gambar.');
      }

      setScenes((prev) =>
        prev.map((s) =>
          s.id === sceneId
            ? {
                ...s,
                status: 'success',
                imageUrl: data.imageUrl,
                generatedAt: new Date().toISOString(),
                error: undefined,
              }
            : s
        )
      );
      showToast(`Scene ${targetScene.sceneNumber} selesai di-generate!`, 'success');
    } catch (err: any) {
      console.error(err);
      setScenes((prev) =>
        prev.map((s) =>
          s.id === sceneId
            ? {
                ...s,
                status: 'error',
                error: err?.message || 'Gagal memproses gambar.',
              }
            : s
        )
      );
      showToast(`Scene ${targetScene.sceneNumber} gagal: ${err?.message}`, 'error');
    }
  };

  // Batch Generation Engine (Scene 1 s/d 10)
  const startBatchGenerate = async () => {
    if (isGeneratingBatch) return;

    // Filter scenes that need generation
    const pendingScenes = scenes.filter((s) => s.prompt.trim().length > 0);
    if (pendingScenes.length === 0) {
      showToast('Tidak ada scene dengan prompt untuk di-generate.', 'error');
      return;
    }

    setIsGeneratingBatch(true);
    stopBatchRef.current = false;

    // Set all pending to queued
    setScenes((prev) =>
      prev.map((s) => (s.prompt.trim() ? { ...s, status: 'queued', error: undefined } : s))
    );

    const concurrency = settings.concurrency || 1;
    const queue = [...pendingScenes];

    const worker = async () => {
      while (queue.length > 0) {
        if (stopBatchRef.current) break;
        const current = queue.shift();
        if (!current) break;

        // Set generating
        setScenes((prev) =>
          prev.map((s) => (s.id === current.id ? { ...s, status: 'generating' } : s))
        );

        try {
          const fullPrompt = buildFullPrompt(current);
          const refImages: any[] = [];
          if (current.referenceImage) {
            refImages.push({ data: current.referenceImage });
          } else if (settings.applyGlobalReferenceToAll && settings.globalReferenceImage) {
            refImages.push({ data: settings.globalReferenceImage });
          }

          const res = await fetch('/api/generate-image', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              prompt: fullPrompt,
              aspectRatio: settings.aspectRatio,
              model: settings.model,
              referenceImages: refImages,
            }),
          });

          const data = await res.json();
          if (!res.ok) {
            throw new Error(data.error || 'Gagal memproses gambar.');
          }

          setScenes((prev) =>
            prev.map((s) =>
              s.id === current.id
                ? {
                    ...s,
                    status: 'success',
                    imageUrl: data.imageUrl,
                    generatedAt: new Date().toISOString(),
                    error: undefined,
                  }
                : s
            )
          );
        } catch (err: any) {
          console.error(`Error on Scene ${current.sceneNumber}:`, err);
          setScenes((prev) =>
            prev.map((s) =>
              s.id === current.id
                ? {
                    ...s,
                    status: 'error',
                    error: err?.message || 'Gagal menghasilkan gambar.',
                  }
                : s
            )
          );
        }

        // small pause between calls
        await new Promise((resolve) => setTimeout(resolve, 300));
      }
    };

    const workers = Array.from({ length: concurrency }).map(() => worker());
    await Promise.all(workers);

    setIsGeneratingBatch(false);
    if (stopBatchRef.current) {
      showToast('Proses batch generate dihentikan.', 'info');
    } else {
      showToast(`Batch generate selesai untuk semua scene!`, 'success');
    }
  };

  const stopBatchGenerate = () => {
    stopBatchRef.current = true;
    setIsGeneratingBatch(false);
    // Reset any still-queued items to idle
    setScenes((prev) =>
      prev.map((s) => (s.status === 'queued' ? { ...s, status: 'idle' } : s))
    );
  };

  // Enhance prompt with AI
  const enhancePrompt = async (sceneId: string) => {
    const targetScene = scenes.find((s) => s.id === sceneId);
    if (!targetScene) return;

    try {
      const selectedStyle = STYLE_PRESETS.find((p) => p.id === settings.stylePreset)?.name;
      const res = await fetch('/api/enhance-prompt', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt: targetScene.prompt,
          style: selectedStyle,
          characterConsistency: settings.characterConsistency,
          cameraAngle: targetScene.cameraAngle,
          lighting: targetScene.lighting,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Gagal memoles prompt.');
      }

      setScenes((prev) =>
        prev.map((s) =>
          s.id === sceneId ? { ...s, prompt: data.enhancedPrompt } : s
        )
      );
      showToast(`Prompt Scene ${targetScene.sceneNumber} berhasil dipoles!`, 'success');
    } catch (err: any) {
      showToast(err?.message || 'Gagal memoles prompt.', 'error');
    }
  };

  // Download all generated images as a single ZIP
  const downloadAllZip = async () => {
    const validScenes = scenes.filter((s) => !!s.imageUrl);
    if (validScenes.length === 0) {
      showToast('Belum ada gambar yang selesai di-generate.', 'error');
      return;
    }

    showToast('Sedang menyiapkan file ZIP...', 'info');
    const zip = new JSZip();

    // Prompts readme inside zip
    let manifestText = `MULTI-SCENE BATCH AI STORYBOARD\n`;
    manifestText += `Tanggal: ${new Date().toLocaleString()}\n`;
    manifestText += `Total Scene: ${scenes.length}\n`;
    manifestText += `Gaya: ${settings.stylePreset}\n`;
    manifestText += `Karakter: ${settings.characterConsistency}\n\n`;
    manifestText += `DAFTAR SCENE & PROMPT:\n`;
    manifestText += `=====================================\n\n`;

    validScenes.forEach((scene) => {
      const numStr = String(scene.sceneNumber).padStart(2, '0');
      const cleanTitle = (scene.title || `scene_${scene.sceneNumber}`)
        .toLowerCase()
        .replace(/[^a-z0-9]/g, '_');
      const fileName = `scene_${numStr}_${cleanTitle}.png`;

      manifestText += `[Scene ${scene.sceneNumber}] ${scene.title}\n`;
      manifestText += `Prompt: ${scene.prompt}\n`;
      if (scene.cameraAngle) manifestText += `Camera: ${scene.cameraAngle}\n`;
      if (scene.lighting) manifestText += `Lighting: ${scene.lighting}\n`;
      manifestText += `File: ${fileName}\n\n`;

      if (scene.imageUrl) {
        // base64 data extraction
        const base64Data = scene.imageUrl.split(',')[1];
        if (base64Data) {
          zip.file(fileName, base64Data, { base64: true });
        }
      }
    });

    zip.file('storyboard_info.txt', manifestText);

    try {
      const content = await zip.generateAsync({ type: 'blob' });
      const url = URL.createObjectURL(content);
      const link = document.createElement('a');
      link.href = url;
      link.download = `storyboard_scenes_1_${scenes.length}.zip`;
      link.click();
      URL.revokeObjectURL(url);
      showToast('Download ZIP berhasil!', 'success');
    } catch (err: any) {
      showToast('Gagal membuat file ZIP: ' + err?.message, 'error');
    }
  };

  // Scene management helpers
  const updateScene = (id: string, updates: Partial<SceneItem>) => {
    setScenes((prev) => prev.map((s) => (s.id === id ? { ...s, ...updates } : s)));
  };

  const addScene = () => {
    const nextNumber = scenes.length + 1;
    const newScene: SceneItem = {
      id: `scene-${nextNumber}-${Date.now()}`,
      sceneNumber: nextNumber,
      title: `Scene ${nextNumber}`,
      prompt: '',
      status: 'idle',
    };
    setScenes((prev) => [...prev, newScene]);
    showToast(`Scene ${nextNumber} ditambahkan!`, 'info');
  };

  const duplicateScene = (id: string) => {
    const index = scenes.findIndex((s) => s.id === id);
    if (index === -1) return;
    const source = scenes[index];
    const newScene: SceneItem = {
      ...source,
      id: `scene-dup-${Date.now()}`,
      title: `${source.title} (Salinan)`,
      imageUrl: undefined,
      status: 'idle',
    };
    const updated = [...scenes];
    updated.splice(index + 1, 0, newScene);
    // renumber
    const renumbered = updated.map((s, i) => ({ ...s, sceneNumber: i + 1 }));
    setScenes(renumbered);
    showToast(`Scene berhasil diduplikat!`, 'info');
  };

  const deleteScene = (id: string) => {
    if (scenes.length <= 1) return;
    const filtered = scenes.filter((s) => s.id !== id);
    const renumbered = filtered.map((s, i) => ({ ...s, sceneNumber: i + 1 }));
    setScenes(renumbered);
    showToast('Scene dihapus.', 'info');
  };

  const moveScene = (id: string, direction: 'up' | 'down') => {
    const index = scenes.findIndex((s) => s.id === id);
    if (index === -1) return;
    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= scenes.length) return;

    const copy = [...scenes];
    const temp = copy[index];
    copy[index] = copy[targetIndex];
    copy[targetIndex] = temp;

    const renumbered = copy.map((s, i) => ({ ...s, sceneNumber: i + 1 }));
    setScenes(renumbered);
  };

  const loadPresetStory = (preset: PresetStory) => {
    setSettings((prev) => ({
      ...prev,
      stylePreset: preset.styleId || prev.stylePreset,
      characterConsistency: preset.characterConsistency || prev.characterConsistency,
    }));
    const newScenes: SceneItem[] = preset.scenes.map((s, index) => ({
      ...s,
      id: `scene-${index + 1}-${Date.now()}`,
      status: 'idle',
      imageUrl: undefined,
    }));
    setScenes(newScenes);
    showToast(`Preset "${preset.title}" diterapkan (10 Scene)!`, 'success');
  };

  const [isResetConfirming, setIsResetConfirming] = useState(false);

  const clearAllScenes = () => {
    if (!isResetConfirming) {
      setIsResetConfirming(true);
      showToast('Klik "Reset Scene" sekali lagi untuk konfirmasi pengosongan.', 'info');
      setTimeout(() => setIsResetConfirming(false), 4000);
      return;
    }

    setIsResetConfirming(false);
    const emptyScenes: SceneItem[] = Array.from({ length: 10 }).map((_, i) => ({
      id: `scene-${i + 1}-${Date.now()}`,
      sceneNumber: i + 1,
      title: `Scene ${i + 1}`,
      prompt: '',
      status: 'idle',
    }));
    setScenes(emptyScenes);
    showToast('Semua scene berhasil dikosongkan.', 'info');
  };

  const handleApplyAiScenes = (newAiScenes: Array<Omit<SceneItem, 'id' | 'status'>>) => {
    const formatted: SceneItem[] = newAiScenes.map((s, idx) => ({
      ...s,
      id: `scene-${idx + 1}-${Date.now()}`,
      status: 'idle',
    }));
    setScenes(formatted);
    showToast(`${formatted.length} Scene dari AI berhasil diterapkan!`, 'success');
  };

  const handleImportBulkPrompts = (prompts: string[]) => {
    const newScenes: SceneItem[] = prompts.map((promptText, idx) => ({
      id: `scene-${idx + 1}-${Date.now()}`,
      sceneNumber: idx + 1,
      title: `Scene ${idx + 1}`,
      prompt: promptText,
      status: 'idle',
    }));
    setScenes(newScenes);
    showToast(`${newScenes.length} Scene berhasil diimpor!`, 'success');
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans selection:bg-indigo-500 selection:text-white">
      {/* Toast Alert Notification */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 animate-in slide-in-from-bottom-5 duration-200">
          <div
            className={`flex items-center gap-2.5 px-4 py-3 rounded-xl shadow-2xl text-xs font-semibold border backdrop-blur-md ${
              toastMessage.type === 'success'
                ? 'bg-emerald-950/90 text-emerald-200 border-emerald-800'
                : toastMessage.type === 'error'
                ? 'bg-rose-950/90 text-rose-200 border-rose-800'
                : 'bg-indigo-950/90 text-indigo-200 border-indigo-800'
            }`}
          >
            {toastMessage.type === 'success' ? (
              <CheckCircle className="w-4 h-4 text-emerald-400" />
            ) : toastMessage.type === 'error' ? (
              <AlertCircle className="w-4 h-4 text-rose-400" />
            ) : (
              <Lightbulb className="w-4 h-4 text-indigo-400" />
            )}
            <span>{toastMessage.text}</span>
          </div>
        </div>
      )}

      {/* Header */}
      <Header
        scenes={scenes}
        isGeneratingBatch={isGeneratingBatch}
        onBatchGenerate={startBatchGenerate}
        onStopBatchGenerate={stopBatchGenerate}
        onOpenAiStoryModal={() => setIsAiModalOpen(true)}
        onOpenSlideshow={() => setIsSlideshowOpen(true)}
        onOpenBulkModal={() => setIsBulkModalOpen(true)}
        onDownloadZip={downloadAllZip}
        onAddScene={addScene}
        showControls={showControls}
        setShowControls={setShowControls}
      />

      {/* Global Controls & Consistency Panel */}
      {showControls && (
        <GlobalControls
          settings={settings}
          onUpdateSettings={(newSettings) => setSettings((prev) => ({ ...prev, ...newSettings }))}
          onLoadPresetStory={loadPresetStory}
          onClearAllScenes={clearAllScenes}
          sceneCount={scenes.length}
        />
      )}

      {/* Main Content Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
        {/* Intro banner / answer note */}
        <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-indigo-950/60 via-slate-900 to-slate-900 border border-indigo-900/40 p-4 sm:p-5 shadow-lg">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <span className="flex h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
                <h2 className="text-sm font-bold text-white tracking-wide">
                  Ya, Bisa Sekali! Studio Multi-Scene Batch (Scene 1 s/d {scenes.length})
                </h2>
              </div>
              <p className="text-xs text-slate-300 max-w-3xl leading-relaxed">
                Anda dapat mengisi setiap scene dengan prompt yang berbeda-beda, menjaga konsistensi karakter secara otomatis, serta mengklik <strong>"Generate Semua"</strong> untuk memproses seluruh scene sekaligus.
              </p>
            </div>

            <div className="flex items-center gap-2 flex-shrink-0">
              <button
                onClick={() => setIsAiModalOpen(true)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold bg-indigo-600/30 hover:bg-indigo-600/50 text-indigo-200 border border-indigo-500/40 transition cursor-pointer"
              >
                <Sparkles className="w-3.5 h-3.5 text-amber-300" />
                <span>Buat 10 Scene dari Skrip</span>
              </button>
              <button
                onClick={addScene}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 transition cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5 text-emerald-400" />
                <span>Tambah Scene Baru</span>
              </button>
            </div>
          </div>
        </div>

        {/* Scene Cards Grid (2 columns on tablet, 3 columns on large screens) */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {scenes.map((scene) => (
            <SceneCard
              key={scene.id}
              scene={scene}
              totalScenes={scenes.length}
              globalAspectRatio={settings.aspectRatio}
              globalReferenceImage={settings.applyGlobalReferenceToAll ? settings.globalReferenceImage : undefined}
              isGeneratingBatch={isGeneratingBatch}
              onUpdateScene={updateScene}
              onGenerateSingle={generateSingleScene}
              onEnhancePrompt={enhancePrompt}
              onDeleteScene={deleteScene}
              onDuplicateScene={duplicateScene}
              onMoveScene={moveScene}
              onOpenLightbox={(sc) => setLightboxScene(sc)}
            />
          ))}

          {/* Add Scene Card Placeholder at the end of grid */}
          <button
            onClick={addScene}
            className="flex flex-col items-center justify-center p-8 rounded-xl border-2 border-dashed border-slate-800 hover:border-indigo-500/60 bg-slate-900/30 hover:bg-indigo-950/20 text-slate-400 hover:text-indigo-300 transition-all duration-200 group cursor-pointer min-h-[300px] space-y-3"
          >
            <div className="w-12 h-12 rounded-full bg-slate-900 group-hover:bg-indigo-600/20 border border-slate-800 group-hover:border-indigo-500/40 flex items-center justify-center transition">
              <Plus className="w-6 h-6 text-slate-400 group-hover:text-indigo-400" />
            </div>
            <div className="text-center">
              <span className="text-xs font-bold block text-slate-300 group-hover:text-white">
                Tambah Scene {scenes.length + 1}
              </span>
              <span className="text-[11px] text-slate-500 block mt-0.5">
                Tambahkan scene berikutnya ke dalam rangkaian storyboard
              </span>
            </div>
          </button>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-900 bg-slate-950 py-5 text-center text-xs text-slate-500">
        <div className="max-w-7xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-2">
          <span>Multi-Scene Batch AI Image Studio • Ditenagai Gemini Image & Imagen Engine</span>
          <div className="flex items-center gap-3">
            <span className="text-slate-400">Total Scene: {scenes.length}</span>
            <span>•</span>
            <span className="text-emerald-400">
              Selesai: {scenes.filter((s) => s.status === 'success' && s.imageUrl).length}
            </span>
          </div>
        </div>
      </footer>

      {/* Modals */}
      <AiStoryModal
        isOpen={isAiModalOpen}
        onClose={() => setIsAiModalOpen(false)}
        onApplyScenes={handleApplyAiScenes}
        currentStyleId={settings.stylePreset}
        currentCharacter={settings.characterConsistency}
      />

      <BulkPromptModal
        isOpen={isBulkModalOpen}
        onClose={() => setIsBulkModalOpen(false)}
        scenes={scenes}
        onImportPrompts={handleImportBulkPrompts}
      />

      <SlideshowModal
        isOpen={isSlideshowOpen}
        onClose={() => setIsSlideshowOpen(false)}
        scenes={scenes}
      />

      <ImageLightboxModal
        scene={lightboxScene}
        onClose={() => setLightboxScene(null)}
      />
    </div>
  );
}
