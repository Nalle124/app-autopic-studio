-- Drop overly permissive policies that grant all users INSERT/UPDATE on credits
DROP POLICY IF EXISTS "Service role can insert transactions" ON public.credit_transactions;
DROP POLICY IF EXISTS "Service role can update credits" ON public.user_credits;
DROP POLICY IF EXISTS "Service role can insert credits" ON public.user_credits;