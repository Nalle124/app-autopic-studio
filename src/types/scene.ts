export interface SceneMetadata {
  id: string;
  name: string;
  description: string;
  thumbnailUrl: string;
  fullResUrl: string;
  // Positioning metadata
  horizonY: number; // Y position of horizon in pixels or percentage
  baselineY: number; // Where vehicle tires should "land"
  defaultScale: number; // Default vehicle scale (0.0 - 1.0)
  // Visual effects
  shadowPreset: {
    enabled: boolean;
    strength: number; // 0.0 - 1.0
    blur: number; // pixels
    offsetX: number;
    offsetY: number;
  };
  reflectionPreset: {
    enabled: boolean;
    opacity: number; // 0.0 - 1.0
    fade: number; // 0.0 - 1.0
  };
  aiPrompt?: string; // Optional AI prompt for specific scene requirements
  category?: string; // Category for organizing scenes
  photoroomShadowMode?: 'none' | 'ai.soft' | 'ai.hard' | 'ai.floating'; // PhotoRoom AI shadow type
  referenceScale?: number; // How closely to match reference image (0.0-1.0, default 1.0)
}

export interface CarAnalysis {
  tireBottomPercent: number;
  carHeightPercent: number;
  recommendedScale: number;
  shadowAngle: number;
  shadowLength: number;
  shadowBlur: number;
  shadowOpacity: number;
  lightingMatch?: string;
  perspectiveNotes?: string;
}

export interface CarAdjustments {
  brightness: number; // -100 to 100
  contrast: number; // -100 to 100
  warmth: number; // -100 to 100 (temperature)
  shadows: number; // -100 to 100 (crush blacks)
  saturation: number; // -100 to 100
}

export interface UploadedImage {
  id: string;
  file: File;
  preview: string;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  segmentedUrl?: string;
  finalUrl?: string;
  croppedUrl?: string;
  sceneId?: string;
  carAnalysis?: CarAnalysis;
  carAdjustments?: CarAdjustments;
  isOriginal?: boolean; // Flag to distinguish original uploads from generated results
  originalWidth?: number; // Original image width for quality calculation
  originalHeight?: number; // Original image height for quality calculation
}

export interface ExportSettings {
  format: 'png' | 'jpg' | 'webp';
  aspectRatio: '1:1' | '4:5' | '16:9' | 'original';
  quality: number; // 0-100
  includeTransparency: boolean;
}
