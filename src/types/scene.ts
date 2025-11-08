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

export interface UploadedImage {
  id: string;
  file: File;
  preview: string;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  segmentedUrl?: string;
  finalUrl?: string;
  sceneId?: string;
  carAnalysis?: CarAnalysis;
}

export interface ExportSettings {
  format: 'png' | 'jpg' | 'webp';
  aspectRatio: '1:1' | '4:5' | '16:9' | 'original';
  quality: number; // 0-100
  includeTransparency: boolean;
}
