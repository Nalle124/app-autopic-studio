CREATE OR REPLACE FUNCTION public.increment_credits(p_user_id uuid, p_amount integer DEFAULT 1)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  new_balance integer;
BEGIN
  IF p_amount IS NULL OR p_amount <= 0 THEN
    RAISE EXCEPTION 'invalid_amount';
  END IF;

  UPDATE public.user_credits
  SET credits = credits + p_amount, updated_at = now()
  WHERE user_id = p_user_id
  RETURNING credits INTO new_balance;

  IF new_balance IS NULL THEN
    RAISE EXCEPTION 'user_credits_not_found';
  END IF;

  RETURN new_balance;
END;
$$;

REVOKE ALL ON FUNCTION public.increment_credits(uuid, integer) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.increment_credits(uuid, integer) FROM anon;
REVOKE ALL ON FUNCTION public.increment_credits(uuid, integer) FROM authenticated;
GRANT EXECUTE ON FUNCTION public.increment_credits(uuid, integer) TO service_role;