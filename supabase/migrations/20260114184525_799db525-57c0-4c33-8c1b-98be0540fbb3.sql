-- Create verification_codes table for email verification
CREATE TABLE public.verification_codes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  email TEXT NOT NULL,
  code TEXT NOT NULL,
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
  attempts INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create index for email lookups
CREATE INDEX idx_verification_codes_email ON public.verification_codes(email);

-- Add unique constraint on email (only one active code per email)
CREATE UNIQUE INDEX idx_verification_codes_email_unique ON public.verification_codes(email);

-- RLS is NOT enabled on this table since it's only accessed by edge functions with service role key
-- The table stores temporary verification codes that expire in 10 minutes

-- Automatically clean up expired codes (older than 1 hour)
CREATE OR REPLACE FUNCTION public.cleanup_expired_verification_codes()
RETURNS void AS $$
BEGIN
  DELETE FROM public.verification_codes
  WHERE expires_at < now() - interval '1 hour';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;