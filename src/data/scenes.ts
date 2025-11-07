import { SceneMetadata } from '@/types/scene';
import studioClean from '@/assets/scenes/studio-clean.jpg';
import asphaltEdge from '@/assets/scenes/asphalt-edge.jpg';
import scandinavianAutumn from '@/assets/scenes/scandinavian-autumn.jpg';
import showroomWhite from '@/assets/scenes/showroom-white.jpg';
import midnightSlate from '@/assets/scenes/midnight-slate.jpg';

export const SCENES: SceneMetadata[] = [
  {
    id: 'studio-clean',
    name: 'Studio Clean',
    description: 'Ren studiomiljö med perfekt belysning',
    thumbnailUrl: studioClean,
    fullResUrl: studioClean,
    horizonY: 50, // %
    baselineY: 65, // %
    defaultScale: 0.7,
    shadowPreset: {
      enabled: true,
      strength: 0.3,
      blur: 30,
      offsetX: 0,
      offsetY: 20,
    },
    reflectionPreset: {
      enabled: false,
      opacity: 0,
      fade: 0,
    },
  },
  {
    id: 'asphalt-edge',
    name: 'Asphalt Edge',
    description: 'Urban asfaltmiljö med dramatisk stämning',
    thumbnailUrl: asphaltEdge,
    fullResUrl: asphaltEdge,
    horizonY: 45,
    baselineY: 70,
    defaultScale: 0.75,
    shadowPreset: {
      enabled: true,
      strength: 0.5,
      blur: 40,
      offsetX: -10,
      offsetY: 15,
    },
    reflectionPreset: {
      enabled: true,
      opacity: 0.25,
      fade: 0.8,
    },
  },
  {
    id: 'scandinavian-autumn',
    name: 'Scandinavian Autumn',
    description: 'Svensk höstlandskap med naturlig känsla',
    thumbnailUrl: scandinavianAutumn,
    fullResUrl: scandinavianAutumn,
    horizonY: 40,
    baselineY: 68,
    defaultScale: 0.65,
    shadowPreset: {
      enabled: true,
      strength: 0.4,
      blur: 35,
      offsetX: 5,
      offsetY: 18,
    },
    reflectionPreset: {
      enabled: false,
      opacity: 0,
      fade: 0,
    },
  },
  {
    id: 'showroom-white',
    name: 'Showroom White',
    description: 'Premium showroom med reflekterande golv',
    thumbnailUrl: showroomWhite,
    fullResUrl: showroomWhite,
    horizonY: 48,
    baselineY: 72,
    defaultScale: 0.68,
    shadowPreset: {
      enabled: true,
      strength: 0.2,
      blur: 25,
      offsetX: 0,
      offsetY: 12,
    },
    reflectionPreset: {
      enabled: true,
      opacity: 0.35,
      fade: 0.9,
    },
  },
  {
    id: 'midnight-slate',
    name: 'Midnight Slate',
    description: 'Mörk dramatisk bakgrund för lyxbilar',
    thumbnailUrl: midnightSlate,
    fullResUrl: midnightSlate,
    horizonY: 50,
    baselineY: 66,
    defaultScale: 0.72,
    shadowPreset: {
      enabled: true,
      strength: 0.6,
      blur: 45,
      offsetX: 0,
      offsetY: 25,
    },
    reflectionPreset: {
      enabled: true,
      opacity: 0.2,
      fade: 0.85,
    },
  },
];
