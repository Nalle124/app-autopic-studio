
CREATE OR REPLACE FUNCTION public.handle_new_user()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  -- Create profile
  INSERT INTO public.profiles (id, email, full_name, onboarding_completed)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', ''),
    false
  );
  
  -- Initialize credits with 3 free credits for new accounts
  INSERT INTO public.user_credits (user_id, credits)
  VALUES (NEW.id, 3);
  
  RETURN NEW;
END;
$function$;
