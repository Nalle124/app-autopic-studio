import { SceneMetadata } from '@/types/scene';

// IMPORTANT: Update these URLs with your actual Supabase Storage URLs
// after uploading the scene images to Storage -> processed-cars -> scenes/
const STORAGE_BASE = 'https://cfsyxrokdemwkklqflnb.supabase.co/storage/v1/object/public/processed-cars/scenes';

export const SCENES: SceneMetadata[] = [
  {
    id: 'dark-studio',
    name: 'Grå Studio',
    description: 'Mörk studiomiljö med träpanel och reflektion',
    thumbnailUrl: `${STORAGE_BASE}/dark-studio.png`,
    fullResUrl: `${STORAGE_BASE}/dark-studio.png`,
    horizonY: 52,
    baselineY: 73,
    defaultScale: 0.65,
    shadowPreset: {
      enabled: false,
      strength: 0,
      blur: 0,
      offsetX: 0,
      offsetY: 0,
    },
    reflectionPreset: {
      enabled: true,
      opacity: 0.575,
      fade: 0.75,
    },
  },
  {
    id: 'ljus-marmor',
    name: 'Ljus Marmor',
    description: 'Ljust marmorgolv med reflektion',
    thumbnailUrl: `${STORAGE_BASE}/marmorljus.jpg`,
    fullResUrl: `${STORAGE_BASE}/marmorljus.jpg`,
    horizonY: 52,
    baselineY: 70,
    defaultScale: 0.65,
    shadowPreset: {
      enabled: false,
      strength: 0,
      blur: 0,
      offsetX: 0,
      offsetY: 0,
    },
    reflectionPreset: {
      enabled: true,
      opacity: 0.6,
      fade: 0.7,
    },
  },
  {
    id: 'outdoor-park',
    name: 'Park',
    description: 'Utomhusmiljö med träd och skugga',
    thumbnailUrl: `${STORAGE_BASE}/outdoor-park.png`,
    fullResUrl: `${STORAGE_BASE}/outdoor-park.png`,
    horizonY: 48,
    baselineY: 70,
    defaultScale: 0.6,
    shadowPreset: {
      enabled: true,
      strength: 0.4,
      blur: 30,
      offsetX: 2,
      offsetY: 3,
    },
    reflectionPreset: {
      enabled: false,
      opacity: 0,
      fade: 0,
    },
  },
];
