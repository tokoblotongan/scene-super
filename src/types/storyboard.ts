export type GenerationStatus = 'idle' | 'queued' | 'generating' | 'success' | 'error';

export interface SceneItem {
  id: string;
  sceneNumber: number;
  title: string;
  prompt: string;
  enhancedPrompt?: string;
  sceneDescriptionId?: string; // Indonesian summary
  cameraAngle?: string;
  lighting?: string;
  status: GenerationStatus;
  imageUrl?: string;
  referenceImage?: string; // base64 or data URL for scene-specific reference face/image
  error?: string;
  aspectRatio?: string;
  generatedAt?: string;
}

export type AspectRatioType = '16:9' | '9:16' | '1:1' | '4:3' | '3:4';

export interface StoryboardSettings {
  stylePreset: string;
  customStylePrompt: string;
  characterConsistency: string;
  applyCharacterToAll: boolean;
  globalReferenceImage?: string; // Global face/character reference image (data URL)
  applyGlobalReferenceToAll: boolean;
  aspectRatio: AspectRatioType;
  model: 'gemini-3.1-flash-lite-image' | 'gemini-nano-banana-2.1';
  concurrency: number; // 1, 2, or 3
}

export interface StylePresetOption {
  id: string;
  name: string;
  category: string;
  description: string;
  promptModifier: string;
  badgeColor: string;
  icon: string;
}
