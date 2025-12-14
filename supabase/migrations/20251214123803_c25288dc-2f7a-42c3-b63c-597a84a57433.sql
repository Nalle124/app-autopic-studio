INSERT INTO public.scenes (
  id, name, description, category, 
  thumbnail_url, full_res_url,
  horizon_y, baseline_y, default_scale,
  shadow_enabled, shadow_strength, shadow_blur, shadow_offset_x, shadow_offset_y,
  reflection_enabled, reflection_opacity, reflection_fade,
  ai_prompt, photoroom_shadow_mode, reference_scale, sort_order
) VALUES (
  'grusplan-svensk-gard',
  'Grusplan Svensk Gård',
  'Klassisk svensk gårdsplan med röda träbyggnader, grusuppfart och lummiga ekar i sommarljus',
  'outdoor',
  'https://cfsyxrokdemwkklqflnb.supabase.co/storage/v1/object/public/processed-cars/scenes/grusplan-svensk-gard.png',
  'https://cfsyxrokdemwkklqflnb.supabase.co/storage/v1/object/public/processed-cars/scenes/grusplan-svensk-gard.png',
  52, 70, 0.65,
  false, 0, 0, 0, 0,
  false, 0, 0,
  'Place the vehicle on the gravel driveway of a traditional Swedish countryside farm. Classic Falu red painted wooden buildings with white window frames surround the gravel yard. Large oak trees provide dappled shade. Bright summer daylight with natural shadows. The car must be positioned on the gravel surface in the center of the yard. Maintain the authentic Swedish rural atmosphere with green grass and blue sky.',
  'ai.soft',
  1.0,
  0
);