INSERT INTO public.scenes (
  id, name, description, category, 
  thumbnail_url, full_res_url,
  horizon_y, baseline_y, default_scale,
  shadow_enabled, shadow_strength, shadow_blur, shadow_offset_x, shadow_offset_y,
  reflection_enabled, reflection_opacity, reflection_fade,
  ai_prompt, photoroom_shadow_mode, reference_scale, sort_order
) VALUES (
  'svenskt-industriomrade-sommar',
  'Svenskt industriområde sommar',
  'Typiskt svenskt industriområde med gul plåtbyggnad, asfaltplan och björkar i sommarljus',
  'outdoor',
  'https://cfsyxrokdemwkklqflnb.supabase.co/storage/v1/object/public/processed-cars/scenes/svenskt-industriomrade-sommar.png',
  'https://cfsyxrokdemwkklqflnb.supabase.co/storage/v1/object/public/processed-cars/scenes/svenskt-industriomrade-sommar.png',
  52, 70, 0.65,
  false, 0, 0, 0, 0,
  false, 0, 0,
  'Place the vehicle on the asphalt parking area in a Swedish industrial zone. Yellow corrugated metal warehouse building with white garage door in the background. Birch trees and green vegetation on the right side. Overcast summer sky with soft diffused lighting. The car must be positioned on the grey asphalt surface. Maintain the authentic Swedish industrial area atmosphere with chain-link fence and natural surroundings.',
  'ai.soft',
  1.0,
  0
);