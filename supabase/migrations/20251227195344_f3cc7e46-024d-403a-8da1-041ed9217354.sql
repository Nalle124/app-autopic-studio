-- Update handle_new_user function to give 3 free credits to new users
CREATE OR REPLACE FUNCTION public.handle_new_user()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  -- Create profile
  INSERT INTO public.profiles (id, email, full_name)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email)
  );
  
  -- Assign 'user' role by default
  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.id, 'user'::app_role);
  
  -- Initialize credits with 3 free credits for demo
  INSERT INTO public.user_credits (user_id, credits)
  VALUES (NEW.id, 3);
  
  -- Log the initial credits transaction
  INSERT INTO public.credit_transactions (user_id, amount, balance_after, transaction_type, description)
  VALUES (NEW.id, 3, 3, 'signup_bonus', 'Free credits for new account');
  
  RETURN NEW;
END;
$function$;