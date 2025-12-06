-- Allow service role to insert credit transactions (via edge functions)
CREATE POLICY "Service role can insert transactions" 
ON public.credit_transactions 
FOR INSERT 
WITH CHECK (true);

-- Allow service role to update user_credits (via edge functions)
DROP POLICY IF EXISTS "Users cannot directly modify credits" ON public.user_credits;
CREATE POLICY "Service role can update credits" 
ON public.user_credits 
FOR UPDATE 
USING (true);

CREATE POLICY "Service role can insert credits" 
ON public.user_credits 
FOR INSERT 
WITH CHECK (true);