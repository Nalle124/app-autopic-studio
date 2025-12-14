INSERT INTO public.scenes (
  id, name, description, category, 
  thumbnail_url, full_res_url,
  horizon_y, baseline_y, default_scale,
  shadow_enabled, shadow_strength, shadow_blur, shadow_offset_x, shadow_offset_y,
  reflection_enabled, reflection_opacity, reflection_fade,
  ai_prompt, photoroom_shadow_mode, reference_scale, sort_order
) VALUES (
  '70s-glam-studio',
  '70s glam studio',
  'Retro glamstudio med koppartonad damastvägg, varmt uplight och blankt mörkt golv',
  'ljusa studios',
  'https://cfsyxrokdemwkklqflnb.supabase.co/storage/v1/object/public/processed-cars/scenes/70s-glam-studio.jpg',
  'https://cfsyxrokdemwkklqflnb.supabase.co/storage/v1/object/public/processed-cars/scenes/70s-glam-studio.jpg',
  52, 70, 0.65,
  false, 0, 0, 0, 0,
  true, 0.5, 0.5,
  'Place the vehicle on the dark glossy floor in the retro glam studio. Warm copper-toned spotlight from above. Moody atmospheric lighting.',
  'none',
  1.0,
  0
);