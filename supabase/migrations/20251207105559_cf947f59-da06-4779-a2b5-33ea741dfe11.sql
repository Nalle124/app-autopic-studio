-- Add reference scale column for PhotoRoom guidance
ALTER TABLE public.scenes ADD COLUMN IF NOT EXISTS reference_scale numeric NOT NULL DEFAULT 1.0;

-- Update Abstrakt Blå to use 70% reference matching
UPDATE public.scenes SET reference_scale = 0.7 WHERE id = 'abstrakt-bla';