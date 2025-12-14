INSERT INTO public.scenes (
  id, name, description, category, 
  thumbnail_url, full_res_url,
  horizon_y, baseline_y, default_scale,
  shadow_enabled, shadow_strength, shadow_blur, shadow_offset_x, shadow_offset_y,
  reflection_enabled, reflection_opacity, reflection_fade,
  ai_prompt, photoroom_shadow_mode, reference_scale, sort_order
) VALUES (
  'nordisk-soluppgang-garage',
  'Nordisk Soluppgång Garage',
  'Skandinavisk grusuppfart vid modern träbyggnad med björkar och sjöutsikt i gyllene morgonljus',
  'outdoor',
  'https://cfsyxrokdemwkklqflnb.supabase.co/storage/v1/object/public/processed-cars/scenes/nordisk-soluppgang-garage.png',
  'https://cfsyxrokdemwkklqflnb.supabase.co/storage/v1/object/public/processed-cars/scenes/nordisk-soluppgang-garage.png',
  52, 70, 0.65,
  false, 0, 0, 0, 0,
  false, 0, 0,
  'Place the vehicle on the gravel driveway in front of the modern Scandinavian wooden building. Birch trees and calm lake visible in the background. Golden sunrise morning light with warm tones. The car must be positioned on the gravel ground, NOT on the building or deck.',
  'ai.soft',
  1.0,
  0
);