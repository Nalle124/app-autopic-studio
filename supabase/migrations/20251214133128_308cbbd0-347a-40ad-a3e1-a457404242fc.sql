INSERT INTO public.scenes (
  id, name, description, category, 
  thumbnail_url, full_res_url,
  horizon_y, baseline_y, default_scale,
  shadow_enabled, shadow_strength, shadow_blur, shadow_offset_x, shadow_offset_y,
  reflection_enabled, reflection_opacity, reflection_fade,
  ai_prompt, photoroom_shadow_mode, reference_scale, sort_order
) VALUES (
  'dramatisk-sol-lada',
  'Dramatisk sol lada',
  'Industriell ladugård med dramatiskt solnedgångsljus genom stora fönster, polerat betonggolv',
  'premium',
  'https://cfsyxrokdemwkklqflnb.supabase.co/storage/v1/object/public/processed-cars/scenes/dramatisk-sol-lada.png',
  'https://cfsyxrokdemwkklqflnb.supabase.co/storage/v1/object/public/processed-cars/scenes/dramatisk-sol-lada.png',
  52, 70, 0.65,
  false, 0, 0, 0, 0,
  true, 0.3, 0.5,
  'Place the vehicle on the polished concrete floor inside the industrial barn. Dramatic golden sunset light streams through the large windows on the left. The car must be positioned on the concrete surface with reflections visible. Maintain the warm atmospheric lighting.',
  'ai.soft',
  1.0,
  0
);