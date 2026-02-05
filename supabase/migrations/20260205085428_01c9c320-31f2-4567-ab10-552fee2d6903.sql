-- Add composite_mode column to scenes table
-- When true, the scene will use the reference image directly as background (no AI generation)
ALTER TABLE public.scenes 
ADD COLUMN composite_mode boolean NOT NULL DEFAULT false;

-- Add comment to explain the column
COMMENT ON COLUMN public.scenes.composite_mode IS 'When true, uses reference image directly as background instead of AI generation for 100% consistent results';