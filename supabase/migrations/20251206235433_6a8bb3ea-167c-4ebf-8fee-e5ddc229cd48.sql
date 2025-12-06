-- Admin function to get all users with their credits
CREATE OR REPLACE FUNCTION public.admin_get_users_with_credits()
RETURNS TABLE(
  id uuid,
  email text,
  full_name text,
  company_name text,
  customer_type text,
  credits integer,
  created_at timestamp with time zone,
  roles text[]
)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT 
    p.id,
    p.email,
    p.full_name,
    p.company_name,
    p.customer_type,
    COALESCE(uc.credits, 0) as credits,
    p.created_at,
    ARRAY_AGG(ur.role::TEXT) as roles
  FROM public.profiles p
  LEFT JOIN public.user_credits uc ON uc.user_id = p.id
  LEFT JOIN public.user_roles ur ON ur.user_id = p.id
  WHERE public.is_admin(auth.uid())
  GROUP BY p.id, p.email, p.full_name, p.company_name, p.customer_type, uc.credits, p.created_at
  ORDER BY p.created_at DESC
$$;

-- Admin function to add credits to a user
CREATE OR REPLACE FUNCTION public.admin_add_credits(target_user_id uuid, amount integer, description text)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  new_balance integer;
BEGIN
  -- Check if caller is admin
  IF NOT public.is_admin(auth.uid()) THEN
    RAISE EXCEPTION 'Not authorized';
  END IF;

  -- Get current balance
  SELECT credits INTO new_balance FROM public.user_credits WHERE user_id = target_user_id;
  
  IF new_balance IS NULL THEN
    new_balance := 0;
  END IF;
  
  new_balance := new_balance + amount;
  
  -- Update or insert credits
  INSERT INTO public.user_credits (user_id, credits, updated_at)
  VALUES (target_user_id, new_balance, now())
  ON CONFLICT (user_id) DO UPDATE SET credits = new_balance, updated_at = now();
  
  -- Log transaction
  INSERT INTO public.credit_transactions (user_id, amount, balance_after, transaction_type, description)
  VALUES (target_user_id, amount, new_balance, 'admin_adjustment', description);
  
  RETURN new_balance;
END;
$$;