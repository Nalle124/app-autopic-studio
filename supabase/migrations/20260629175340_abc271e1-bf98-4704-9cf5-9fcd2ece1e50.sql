
-- Per-category reference scale tuning for PhotoRoom Studio engine.
-- Studio = hold reference tightly (clean, predictable).
-- Bilhall / showroom-style scenes = slightly looser so PhotoRoom can ground the car in the room.
-- Creative / outdoor / experimental scenes = looser still, gives PhotoRoom room to relight.

UPDATE public.scenes
SET reference_scale = 0.95
WHERE category ILIKE 'studio%' OR id ILIKE 'studio-%';

UPDATE public.scenes
SET reference_scale = 0.85
WHERE category ILIKE 'bilhall%' OR id ILIKE 'bilhall%' OR category ILIKE 'showroom%';

UPDATE public.scenes
SET reference_scale = 0.75
WHERE (category IS NULL OR category NOT ILIKE 'studio%')
  AND (category IS NULL OR category NOT ILIKE 'bilhall%')
  AND (category IS NULL OR category NOT ILIKE 'showroom%')
  AND id NOT ILIKE 'studio-%'
  AND id NOT ILIKE 'bilhall%';
