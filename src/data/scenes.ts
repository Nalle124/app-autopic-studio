import { SceneMetadata } from '@/types/scene';

// Supabase storage base URL for scene images
const STORAGE_BASE = 'https://cfsyxrokdemwkklqflnb.supabase.co/storage/v1/object/public/processed-cars/scenes';

// NOTE: Scenes are now primarily loaded from the database.
// This file is kept as a fallback/reference only.
// The SceneSelector component fetches scenes from Supabase.

export const SCENES: SceneMetadata[] = [
  // This array is intentionally minimal - scenes are managed in the database
];
