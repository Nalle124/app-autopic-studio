-- Add photoroom_shadow_mode column to scenes table
ALTER TABLE public.scenes 
ADD COLUMN IF NOT EXISTS photoroom_shadow_mode text DEFAULT 'none';

-- Add comment for clarity
COMMENT ON COLUMN public.scenes.photoroom_shadow_mode IS 'PhotoRoom AI shadow mode: none, ai.soft, ai.hard, ai.floating';