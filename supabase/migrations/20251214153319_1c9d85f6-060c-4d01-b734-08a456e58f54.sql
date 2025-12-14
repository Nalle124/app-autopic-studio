INSERT INTO public.scenes (
  id, name, description, category, 
  thumbnail_url, full_res_url,
  horizon_y, baseline_y, default_scale,
  shadow_enabled, shadow_strength, shadow_blur, shadow_offset_x, shadow_offset_y,
  reflection_enabled, reflection_opacity, reflection_fade,
  ai_prompt, photoroom_shadow_mode, reference_scale, sort_order
) VALUES (
  'dark-wood-studio',
  'Dark wood studio',
  'Exklusiv mörk studio med trälameller, stenvägg och dramatisk spotlight-belysning på polerat betonggolv',
  'mörka studios',
  'https://cfsyxrokdemwkklqflnb.supabase.co/storage/v1/object/public/processed-cars/scenes/dark-wood-studio.png',
  'https://cfsyxrokdemwkklqflnb.supabase.co/storage/v1/object/public/processed-cars/scenes/dark-wood-studio.png',
  52, 70, 0.65,
  false, 0, 0, 0, 0,
  true, 0.5, 0.5,
  'Place the vehicle on the dark polished concrete floor in the luxury showroom. Vertical wooden slat panels alternate with dark stone wall sections. Dramatic spotlight lighting from above creates pools of light. Dark moody atmosphere with premium aesthetic.',
  'none',
  1.0,
  0
);