-- Enable RLS on verification_codes table
ALTER TABLE public.verification_codes ENABLE ROW LEVEL SECURITY;

-- No public policies - this table is only accessed via edge functions with service role key
-- Service role bypasses RLS, so no policies are needed