INSERT INTO public.scenes (
  id, name, description, category, 
  thumbnail_url, full_res_url,
  horizon_y, baseline_y, default_scale,
  shadow_enabled, shadow_strength, shadow_blur, shadow_offset_x, shadow_offset_y,
  reflection_enabled, reflection_opacity, reflection_fade,
  ai_prompt, photoroom_shadow_mode, reference_scale, sort_order
) VALUES (
  'november-mist',
  'November Mist',
  'Dimmig svensk höstmiljö med avlövade träd, gräsmark och grusväg i mjukt novemberljus',
  'autumn',
  'https://cfsyxrokdemwkklqflnb.supabase.co/storage/v1/object/public/processed-cars/scenes/november-mist.jpg',
  'https://cfsyxrokdemwkklqflnb.supabase.co/storage/v1/object/public/processed-cars/scenes/november-mist.jpg',
  52, 70, 0.65,
  false, 0, 0, 0, 0,
  false, 0, 0,
  'Place the vehicle on the gravel driveway in a misty Swedish autumn countryside. Bare oak trees with lichen-covered trunks frame the scene. Open green fields stretch into the background with a soft hazy atmosphere. Late autumn natural light with sun breaking through clouds. The car must be positioned on the gravel surface. Maintain the peaceful Scandinavian rural November atmosphere with subdued colors.',
  'ai.soft',
  1.0,
  0
);