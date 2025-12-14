UPDATE public.scenes 
SET 
  reference_scale = 1.0,
  ai_prompt = 'Place the vehicle on the terrazzo floor. Keep the exact Art Deco geometric gold and black fan pattern wall panel with warm backlit edges exactly as shown in the reference image. Do not simplify or remove the wall pattern.'
WHERE id = 'art-deco';