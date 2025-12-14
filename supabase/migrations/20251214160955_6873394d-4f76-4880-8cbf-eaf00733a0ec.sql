INSERT INTO public.scenes (
  id, name, description, category, 
  thumbnail_url, full_res_url,
  horizon_y, baseline_y, default_scale,
  shadow_enabled, shadow_strength, shadow_blur, shadow_offset_x, shadow_offset_y,
  reflection_enabled, reflection_opacity, reflection_fade,
  ai_prompt, photoroom_shadow_mode, reference_scale, sort_order
) VALUES (
  'dusk-plaza',
  'Dusk Plaza',
  'Modern glasbyggnad med skymningsljus och våt stenplatteyta',
  'premium',
  'https://cfsyxrokdemwkklqflnb.supabase.co/storage/v1/object/public/processed-cars/scenes/dusk-plaza.png',
  'https://cfsyxrokdemwkklqflnb.supabase.co/storage/v1/object/public/processed-cars/scenes/dusk-plaza.png',
  52, 70, 0.65,
  false, 0, 0, 0, 0,
  true, 0.4, 0.5,
  'Place the vehicle on the wet stone tile plaza. Modern glass office building with warm interior lighting on the right. Blue hour sunset sky. Wet reflective surface.',
  'ai.soft',
  1.0,
  0
);