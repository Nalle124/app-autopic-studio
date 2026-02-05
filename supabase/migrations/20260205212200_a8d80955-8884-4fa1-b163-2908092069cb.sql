
UPDATE public.scenes 
SET 
  composite_mode = false,
  reference_scale = 0.95,
  ai_prompt = 'Minimalist professional photography studio. Dark charcoal grey wall (hex #4a4a4a) with very subtle texture, no patterns. Smooth polished light grey floor (hex #a0a0a0) with soft gradient reflection. Clean horizon line where wall meets floor at roughly 60% height. Soft diffused overhead lighting creating gentle floor reflection. No objects, no props, no windows. Solid matte wall, reflective smooth floor. Professional automotive studio backdrop.',
  photoroom_shadow_mode = 'ai.soft',
  updated_at = now()
WHERE id = 'granet-studio';
