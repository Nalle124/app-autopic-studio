
INSERT INTO public.scenes (
  id, name, description, category,
  thumbnail_url, full_res_url,
  horizon_y, baseline_y, default_scale,
  shadow_enabled, shadow_strength, shadow_blur, shadow_offset_x, shadow_offset_y,
  reflection_enabled, reflection_opacity, reflection_fade,
  photoroom_shadow_mode, reference_scale, sort_order,
  ai_prompt
) VALUES (
  'ljus-horna-2',
  'Ljus hörna 2',
  'Minimalistisk vit studiohörna med betonggolv',
  'studio-light',
  'https://cfsyxrokdemwkklqflnb.supabase.co/storage/v1/object/public/processed-cars/scenes/ljus-horna-2.png',
  'https://cfsyxrokdemwkklqflnb.supabase.co/storage/v1/object/public/processed-cars/scenes/ljus-horna-2.png',
  52, 70, 0.65,
  true, 0.5, 10, 0, 5,
  false, 0, 0,
  'ai.soft', 1.0, 0,
  'Professional automotive photography in minimalist white studio corner. Place the car naturally on the concrete floor. Clean white walls meeting in corner. Soft diffused studio lighting. Natural shadow on floor. Maintain exact perspective and corner angle from reference. No props, no people, no text.'
);
