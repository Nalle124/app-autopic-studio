INSERT INTO public.scenes (
  id, name, description, category, 
  thumbnail_url, full_res_url,
  horizon_y, baseline_y, default_scale,
  shadow_enabled, shadow_strength, shadow_blur, shadow_offset_x, shadow_offset_y,
  reflection_enabled, reflection_opacity, reflection_fade,
  ai_prompt, photoroom_shadow_mode, reference_scale, sort_order
) VALUES (
  'klassisk-innergard-kvall',
  'Klassisk Innergård kväll',
  'Europeisk steninnergård med kullersten, varma gatlyktor och historiska byggnader i kvällsljus',
  'premium',
  'https://cfsyxrokdemwkklqflnb.supabase.co/storage/v1/object/public/processed-cars/scenes/klassisk-innergard-kvall.png',
  'https://cfsyxrokdemwkklqflnb.supabase.co/storage/v1/object/public/processed-cars/scenes/klassisk-innergard-kvall.png',
  52, 70, 0.65,
  false, 0, 0, 0, 0,
  false, 0, 0,
  'Place the vehicle on the cobblestone courtyard. Evening atmosphere with warm ambient lighting. Historic European architecture surrounds the scene. The car must be positioned on the stone surface in the center of the courtyard.',
  'ai.soft',
  1.0,
  0
);