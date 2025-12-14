INSERT INTO public.scenes (
  id, name, description, category, 
  thumbnail_url, full_res_url,
  horizon_y, baseline_y, default_scale,
  shadow_enabled, shadow_strength, shadow_blur, shadow_offset_x, shadow_offset_y,
  reflection_enabled, reflection_opacity, reflection_fade,
  ai_prompt, photoroom_shadow_mode, reference_scale, sort_order
) VALUES (
  'art-deco',
  'Art Deco',
  'Lyxig Art Deco-studio med geometriska guld- och svarta mönster på bakbelyst vägg och terrazzogolv',
  'kreativa',
  'https://cfsyxrokdemwkklqflnb.supabase.co/storage/v1/object/public/processed-cars/scenes/art-deco.jpg',
  'https://cfsyxrokdemwkklqflnb.supabase.co/storage/v1/object/public/processed-cars/scenes/art-deco.jpg',
  52, 70, 0.65,
  false, 0, 0, 0, 0,
  true, 0.45, 0.5,
  'Place the vehicle on the terrazzo floor in the luxury Art Deco showroom. Geometric gold and black fan pattern wall panel with warm backlit edges. Elegant 1920s aesthetic with modern touch.',
  'none',
  1.0,
  0
);