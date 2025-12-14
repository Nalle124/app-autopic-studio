INSERT INTO public.scenes (
  id, name, description, category, 
  thumbnail_url, full_res_url,
  horizon_y, baseline_y, default_scale,
  shadow_enabled, shadow_strength, shadow_blur, shadow_offset_x, shadow_offset_y,
  reflection_enabled, reflection_opacity, reflection_fade,
  ai_prompt, photoroom_shadow_mode, reference_scale, sort_order
) VALUES (
  'danmark-kopenhamngata',
  'Danmark Köpenhamngata',
  'Charmig dansk kullerstensgata med färgglada historiska byggnader i varmt dagsljus',
  'outdoor',
  'https://cfsyxrokdemwkklqflnb.supabase.co/storage/v1/object/public/processed-cars/scenes/danmark-kopenhamngata.png',
  'https://cfsyxrokdemwkklqflnb.supabase.co/storage/v1/object/public/processed-cars/scenes/danmark-kopenhamngata.png',
  52, 70, 0.65,
  false, 0, 0, 0, 0,
  false, 0, 0,
  'Place the vehicle on the cobblestone street in the historic Copenhagen neighborhood. Colorful traditional Danish buildings with orange, blue, and red facades line the street. Warm natural daylight with soft shadows. The car must be positioned on the cobblestone road surface, NOT on sidewalks or against buildings. Maintain the charming Scandinavian old town atmosphere.',
  'ai.soft',
  1.0,
  0
);