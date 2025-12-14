INSERT INTO public.scenes (
  id, name, description, category, 
  thumbnail_url, full_res_url,
  horizon_y, baseline_y, default_scale,
  shadow_enabled, shadow_strength, shadow_blur, shadow_offset_x, shadow_offset_y,
  reflection_enabled, reflection_opacity, reflection_fade,
  ai_prompt, photoroom_shadow_mode, reference_scale, sort_order
) VALUES (
  'midnight-garage',
  'Midnight Garage',
  'Lyxigt mörkt garage med betongväggar, trälameller och LED-belysning',
  'studio-dark',
  'https://cfsyxrokdemwkklqflnb.supabase.co/storage/v1/object/public/processed-cars/scenes/midnight-garage.png',
  'https://cfsyxrokdemwkklqflnb.supabase.co/storage/v1/object/public/processed-cars/scenes/midnight-garage.png',
  52, 70, 0.65,
  false, 0, 0, 0, 0,
  true, 0.5, 0.5,
  'Place the vehicle on the polished concrete floor in the luxury garage. Dark concrete walls with vertical dark wood slat panels. LED strip lighting along ceiling and walls. Moody atmospheric lighting.',
  'none',
  1.0,
  0
);