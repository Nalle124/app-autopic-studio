import { SceneMetadata } from '@/types/scene';

// IMPORTANT: Update these URLs with your actual Supabase Storage URLs
// after uploading the scene images to Storage -> processed-cars -> scenes/
const STORAGE_BASE = 'https://cfsyxrokdemwkklqflnb.supabase.co/storage/v1/object/public/processed-cars/scenes';

export const SCENES: SceneMetadata[] = [
  {
    id: 'dark-studio',
    name: 'Dark Studio',
    description: 'Mörk studiomiljö med kaklad yta',
    thumbnailUrl: `${STORAGE_BASE}/dark-studio.png`,
    fullResUrl: `${STORAGE_BASE}/dark-studio.png`,
    horizonY: 52,
    baselineY: 73,
    defaultScale: 0.65,
    shadowPreset: {
      enabled: true,
      strength: 0.35,
      blur: 25,
      offsetX: 0,
      offsetY: 2,
    },
    reflectionPreset: {
      enabled: true,
      opacity: 0.3,
      fade: 0.85,
    },
  },
  {
    id: 'white-studio',
    name: 'White Studio',
    description: 'Ljus minimal showroom',
    thumbnailUrl: `${STORAGE_BASE}/white-studio.png`,
    fullResUrl: `${STORAGE_BASE}/white-studio.png`,
    horizonY: 55,
    baselineY: 75,
    defaultScale: 0.62,
    shadowPreset: {
      enabled: true,
      strength: 0.2,
      blur: 20,
      offsetX: 0,
      offsetY: 2,
    },
    reflectionPreset: {
      enabled: true,
      opacity: 0.35,
      fade: 0.9,
    },
  },
  {
    id: 'outdoor-park',
    name: 'Outdoor Park',
    description: 'Utomhusmiljö med träd och gatsten',
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
