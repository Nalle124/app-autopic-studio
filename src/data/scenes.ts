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
    thumbnailUrl: whiteStudio,
    fullResUrl: whiteStudio,
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
    thumbnailUrl: outdoorPark,
    fullResUrl: outdoorPark,
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
