import { SceneMetadata } from '@/types/scene';
import darkStudio from '@/assets/scenes/dark-studio.png';
import whiteStudio from '@/assets/scenes/white-studio.png';
import outdoorPark from '@/assets/scenes/outdoor-park.png';

export const SCENES: SceneMetadata[] = [
  {
    id: 'dark-studio',
    name: 'Dark Studio',
    description: 'Mörk studiomiljö med kaklad yta',
    thumbnailUrl: darkStudio,
    fullResUrl: darkStudio,
    horizonY: 52,
    baselineY: 68,
    defaultScale: 0.7,
    shadowPreset: {
      enabled: true,
      strength: 0.4,
      blur: 70,
      offsetX: 0,
      offsetY: 3,
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
    thumbnailUrl: whiteStudio,
    fullResUrl: whiteStudio,
    horizonY: 55,
    baselineY: 72,
    defaultScale: 0.68,
    shadowPreset: {
      enabled: true,
      strength: 0.25,
      blur: 60,
      offsetX: 0,
      offsetY: 3,
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
    thumbnailUrl: outdoorPark,
    fullResUrl: outdoorPark,
    horizonY: 48,
    baselineY: 65,
    defaultScale: 0.65,
    shadowPreset: {
      enabled: true,
      strength: 0.5,
      blur: 65,
      offsetX: 2,
      offsetY: 5,
    },
    reflectionPreset: {
      enabled: false,
      opacity: 0,
      fade: 0,
    },
  },
];
