-- Update existing scenes with proper ai_prompts where missing
UPDATE scenes SET ai_prompt = 'Place the vehicle on the polished grey floor inside this minimalist dark studio. Maintain the wood paneling backdrop with soft ambient lighting. The car should have a clear floor reflection.' WHERE id = 'dark-studio' AND ai_prompt IS NULL;

UPDATE scenes SET ai_prompt = 'Place the vehicle on the light marble floor in this bright minimalist studio. Maintain the soft white backdrop and gentle lighting with floor reflections.' WHERE id = 'ljus-marmor' AND ai_prompt IS NULL;

UPDATE scenes SET ai_prompt = 'Place the vehicle on the dark wooden floor in this contrast studio with light backdrop. Maintain the dramatic lighting contrast with floor reflection.' WHERE id = 'contrast' AND ai_prompt IS NULL;

UPDATE scenes SET ai_prompt = 'Place the vehicle on the white tiled floor in this minimal white studio. Maintain clean lines and bright lighting with subtle floor reflection.' WHERE id = 'vit-kakel' AND ai_prompt IS NULL;

UPDATE scenes SET ai_prompt = 'Place the vehicle in this green park setting during daytime. Natural outdoor lighting with trees and grass in background.' WHERE id = 'outdoor-park' AND ai_prompt IS NULL;

-- Update categories for existing scenes
UPDATE scenes SET category = 'studios' WHERE category = 'studio';
UPDATE scenes SET category = 'utomhus' WHERE category = 'utomhus';

-- Remove fancy category, move plattform to studios
UPDATE scenes SET category = 'studios' WHERE id = 'plattform';

-- Insert placeholder scenes for new backgrounds
-- Studios category
INSERT INTO scenes (id, name, description, category, thumbnail_url, full_res_url, ai_prompt, sort_order, horizon_y, baseline_y, default_scale, shadow_enabled, reflection_enabled, reflection_opacity, reflection_fade)
VALUES 
('solid-platform', 'Solid Plattform', 'Stilren plattform med studioljus', 'studios', 'https://cfsyxrokdemwkklqflnb.supabase.co/storage/v1/object/public/processed-cars/scenes/placeholder.jpg', 'https://cfsyxrokdemwkklqflnb.supabase.co/storage/v1/object/public/processed-cars/scenes/placeholder.jpg', 'Place vehicle on solid platform in professional car studio with soft box lighting', 1, 52, 70, 0.65, false, true, 0.5, 0.7),
('bright-concrete', 'Bright Concrete', 'Ljus betong med fönster', 'studios', 'https://cfsyxrokdemwkklqflnb.supabase.co/storage/v1/object/public/processed-cars/scenes/placeholder.jpg', 'https://cfsyxrokdemwkklqflnb.supabase.co/storage/v1/object/public/processed-cars/scenes/placeholder.jpg', 'Place vehicle on polished concrete floor in bright industrial space with large windows', 2, 52, 70, 0.65, true, false, 0, 0),
('ljus-plathall', 'Ljus Plåthall', 'Industriell hall med naturligt ljus', 'studios', 'https://cfsyxrokdemwkklqflnb.supabase.co/storage/v1/object/public/processed-cars/scenes/placeholder.jpg', 'https://cfsyxrokdemwkklqflnb.supabase.co/storage/v1/object/public/processed-cars/scenes/placeholder.jpg', 'Place vehicle inside bright industrial metal hall with corrugated walls and natural lighting', 3, 52, 70, 0.65, true, false, 0, 0)
ON CONFLICT (id) DO NOTHING;

-- Utomhus category  
INSERT INTO scenes (id, name, description, category, thumbnail_url, full_res_url, ai_prompt, sort_order, horizon_y, baseline_y, default_scale, shadow_enabled, reflection_enabled)
VALUES
('park-dagtid', 'Park Dagtid', 'Grön park i dagsljus', 'utomhus', 'https://cfsyxrokdemwkklqflnb.supabase.co/storage/v1/object/public/processed-cars/scenes/placeholder.jpg', 'https://cfsyxrokdemwkklqflnb.supabase.co/storage/v1/object/public/processed-cars/scenes/placeholder.jpg', 'Place vehicle in sunny park during daytime with green grass and trees', 1, 48, 70, 0.6, true, false),
('platvagg-utomhus', 'Plåtvägg Utomhus', 'Industriell utomhusvägg', 'utomhus', 'https://cfsyxrokdemwkklqflnb.supabase.co/storage/v1/object/public/processed-cars/scenes/placeholder.jpg', 'https://cfsyxrokdemwkklqflnb.supabase.co/storage/v1/object/public/processed-cars/scenes/placeholder.jpg', 'Place vehicle outdoors against industrial corrugated metal wall with natural lighting', 3, 48, 70, 0.6, true, false)
ON CONFLICT (id) DO NOTHING;

-- Lantligt category
INSERT INTO scenes (id, name, description, category, thumbnail_url, full_res_url, ai_prompt, sort_order, horizon_y, baseline_y, default_scale, shadow_enabled, reflection_enabled)
VALUES
('sateri-lada', 'Säteri Lada', 'Rustik ladugård på landet', 'lantligt', 'https://cfsyxrokdemwkklqflnb.supabase.co/storage/v1/object/public/processed-cars/scenes/placeholder.jpg', 'https://cfsyxrokdemwkklqflnb.supabase.co/storage/v1/object/public/processed-cars/scenes/placeholder.jpg', 'Place vehicle in front of rustic Swedish manor barn with red wooden walls', 1, 48, 70, 0.6, true, false),
('landsvag', 'Landsväg', 'Svensk landsväg', 'lantligt', 'https://cfsyxrokdemwkklqflnb.supabase.co/storage/v1/object/public/processed-cars/scenes/placeholder.jpg', 'https://cfsyxrokdemwkklqflnb.supabase.co/storage/v1/object/public/processed-cars/scenes/placeholder.jpg', 'Place vehicle on scenic Swedish country road with forest and fields', 2, 45, 68, 0.55, true, false),
('kyrkans-parkering', 'Kyrkans Parkering', 'Kyrka på landet', 'lantligt', 'https://cfsyxrokdemwkklqflnb.supabase.co/storage/v1/object/public/processed-cars/scenes/placeholder.jpg', 'https://cfsyxrokdemwkklqflnb.supabase.co/storage/v1/object/public/processed-cars/scenes/placeholder.jpg', 'Place vehicle in parking area outside traditional Swedish country church', 3, 48, 70, 0.6, true, false),
('lantlig-plathall', 'Lantlig Plåthall', 'Enkel plåthall på gård', 'lantligt', 'https://cfsyxrokdemwkklqflnb.supabase.co/storage/v1/object/public/processed-cars/scenes/placeholder.jpg', 'https://cfsyxrokdemwkklqflnb.supabase.co/storage/v1/object/public/processed-cars/scenes/placeholder.jpg', 'Place vehicle inside simple farm metal hall building', 4, 50, 70, 0.6, true, false)
ON CONFLICT (id) DO NOTHING;

-- Premium category
INSERT INTO scenes (id, name, description, category, thumbnail_url, full_res_url, ai_prompt, sort_order, horizon_y, baseline_y, default_scale, shadow_enabled, reflection_enabled, reflection_opacity, reflection_fade)
VALUES
('premium-showroom', 'Premium Showroom', 'Lyxig bilhall', 'premium', 'https://cfsyxrokdemwkklqflnb.supabase.co/storage/v1/object/public/processed-cars/scenes/placeholder.jpg', 'https://cfsyxrokdemwkklqflnb.supabase.co/storage/v1/object/public/processed-cars/scenes/placeholder.jpg', 'Place vehicle in luxury car showroom with polished floors and premium lighting', 1, 52, 72, 0.65, false, true, 0.6, 0.7),
('premium-studio', 'Premium Studio', 'Exklusiv fotostudio', 'premium', 'https://cfsyxrokdemwkklqflnb.supabase.co/storage/v1/object/public/processed-cars/scenes/placeholder.jpg', 'https://cfsyxrokdemwkklqflnb.supabase.co/storage/v1/object/public/processed-cars/scenes/placeholder.jpg', 'Place vehicle in high-end photography studio with dramatic lighting and reflective floor', 2, 52, 72, 0.65, false, true, 0.65, 0.75),
('premium-garage', 'Premium Garage', 'Privat lyxgarage', 'premium', 'https://cfsyxrokdemwkklqflnb.supabase.co/storage/v1/object/public/processed-cars/scenes/placeholder.jpg', 'https://cfsyxrokdemwkklqflnb.supabase.co/storage/v1/object/public/processed-cars/scenes/placeholder.jpg', 'Place vehicle in exclusive private garage with modern architecture and ambient lighting', 3, 50, 70, 0.6, true, true, 0.4, 0.6)
ON CONFLICT (id) DO NOTHING;

-- Skoj category
INSERT INTO scenes (id, name, description, category, thumbnail_url, full_res_url, ai_prompt, sort_order, horizon_y, baseline_y, default_scale, shadow_enabled, reflection_enabled, reflection_opacity)
VALUES
('coop-natt', 'Coop Parkeringen', 'Nattlig matbutiksparkering', 'skoj', 'https://cfsyxrokdemwkklqflnb.supabase.co/storage/v1/object/public/processed-cars/scenes/placeholder.jpg', 'https://cfsyxrokdemwkklqflnb.supabase.co/storage/v1/object/public/processed-cars/scenes/placeholder.jpg', 'Place vehicle in Swedish Coop grocery store parking lot at night with store lights glowing', 1, 48, 70, 0.6, true, true, 0.3),
('dubai-streets', 'Dubai Streets', 'Lyxiga Dubai-gator', 'skoj', 'https://cfsyxrokdemwkklqflnb.supabase.co/storage/v1/object/public/processed-cars/scenes/placeholder.jpg', 'https://cfsyxrokdemwkklqflnb.supabase.co/storage/v1/object/public/processed-cars/scenes/placeholder.jpg', 'Place vehicle on glamorous Dubai street with palm trees and luxury buildings at sunset', 2, 45, 68, 0.55, true, false, 0)
ON CONFLICT (id) DO NOTHING;