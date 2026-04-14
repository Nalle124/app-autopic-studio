-- Fix lightroom-studio: window should be frosted/diffused, not clear glass showing outdoor view.
-- The AI was filling the window with trees/outdoor because the prompt said "large bright window panels"
-- which combined with car reflections caused outdoor context to bleed in.

UPDATE public.scenes
SET
  ai_prompt = 'Professional automotive photography studio. Place the car centered on the grey tile floor, facing slightly angled to the left. The floor shows natural reflections of the car on the polished grey tiles. Large frosted glass window panels on the right side provide soft diffused white light — the glass is opaque white/milky, no outdoor view visible through the glass. Clean white walls with subtle corner shadows. Studio environment looks spacious and premium. No props, no people, no text. Completely enclosed interior studio.',
  updated_at = now()
WHERE id = 'lightroom-studio';
