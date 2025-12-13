-- Fix 1: Add INSERT policy for profiles table (defense-in-depth)
CREATE POLICY "Users can insert their own profile"
  ON public.profiles
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = id);

-- Fix 2: Update admin functions to use consistent authorization with explicit errors

-- Update admin_get_users_with_credits to raise exception for non-admins
CREATE OR REPLACE FUNCTION public.admin_get_users_with_credits()
RETURNS TABLE(id uuid, email text, full_name text, company_name text, customer_type text, credits integer, created_at timestamp with time zone, roles text[])
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT public.is_admin(auth.uid()) THEN
    RAISE EXCEPTION 'Not authorized';
  END IF;
  
  RETURN QUERY
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
  GROUP BY p.id, p.email, p.full_name, p.company_name, p.customer_type, uc.credits, p.created_at
  ORDER BY p.created_at DESC;
END;
$$;

-- Update admin_get_user_stats to raise exception for non-admins
CREATE OR REPLACE FUNCTION public.admin_get_user_stats()
RETURNS TABLE(total_users bigint, total_jobs bigint, completed_jobs bigint, failed_jobs bigint)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT public.is_admin(auth.uid()) THEN
    RAISE EXCEPTION 'Not authorized';
  END IF;
  
  RETURN QUERY
  SELECT 
    (SELECT COUNT(*) FROM public.profiles) as total_users,
    (SELECT COUNT(*) FROM public.processing_jobs) as total_jobs,
    (SELECT COUNT(*) FROM public.processing_jobs WHERE status = 'completed') as completed_jobs,
    (SELECT COUNT(*) FROM public.processing_jobs WHERE status = 'failed') as failed_jobs;
END;
$$;

-- Update admin_get_all_users to raise exception for non-admins  
CREATE OR REPLACE FUNCTION public.admin_get_all_users()
RETURNS TABLE(id uuid, email text, full_name text, created_at timestamp with time zone, roles text[])
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT public.is_admin(auth.uid()) THEN
    RAISE EXCEPTION 'Not authorized';
  END IF;
  
  RETURN QUERY
  SELECT 
    p.id,
    p.email,
    p.full_name,
    p.created_at,
    ARRAY_AGG(ur.role::TEXT) as roles
  FROM public.profiles p
  LEFT JOIN public.user_roles ur ON ur.user_id = p.id
  GROUP BY p.id, p.email, p.full_name, p.created_at
  ORDER BY p.created_at DESC;
END;
$$;