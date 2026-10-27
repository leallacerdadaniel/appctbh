-- RESTAURA a função do site handle_new_user exatamente como ela era antes do App CTBH
-- (texto copiado do banco em 27/10/2026). Desfaz o bloco "conta do app" acrescentado
-- naquele dia, que nunca teve efeito. Depois disto o site fica 100% como antes.

CREATE OR REPLACE FUNCTION public.handle_new_user()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  -- Validate email domain for new users
  IF NEW.email IS NOT NULL AND NOT (LOWER(NEW.email) LIKE '%@skema.edu') THEN
    RAISE EXCEPTION 'Only SKEMA Business School email addresses (@skema.edu) are allowed to create an account'
      USING HINT = 'Please use your institutional email address';
  END IF;

  -- Create user profile
  INSERT INTO public.profiles (
    user_id,
    display_name,
    phone,
    roommate_preference,
    bedroom_preference,
    max_budget_brl,
    semester,
    full_name,
    program,
    how_did_you_hear_from_us
  )
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data ->> 'display_name', NEW.email),
    NEW.raw_user_meta_data ->> 'phone',
    CASE
      WHEN NEW.raw_user_meta_data ->> 'roommate_preference' = 'true' THEN true
      WHEN NEW.raw_user_meta_data ->> 'roommate_preference' = 'false' THEN false
      ELSE NULL
    END,
    NEW.raw_user_meta_data ->> 'bedroom_preference',
    CASE
      WHEN NEW.raw_user_meta_data ->> 'max_budget_brl' IS NOT NULL
      THEN (NEW.raw_user_meta_data ->> 'max_budget_brl')::numeric
      ELSE NULL
    END,
    NEW.raw_user_meta_data ->> 'semester',
    NEW.raw_user_meta_data ->> 'full_name',
    NEW.raw_user_meta_data ->> 'program',
    NEW.raw_user_meta_data ->> 'how_did_you_hear_from_us'
  );

  RETURN NEW;
END;
$function$;
