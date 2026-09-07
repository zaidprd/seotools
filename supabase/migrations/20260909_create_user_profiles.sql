-- Create a minimum application profile whenever Supabase Auth creates a user.
-- The API-level upsert remains as a recovery path for pre-existing Auth users.
CREATE OR REPLACE FUNCTION public.create_profile_for_auth_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.users (id, email, plan, credits)
  VALUES (NEW.id, COALESCE(NEW.email, ''), 'free', 0)
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS auth_user_profile_trigger ON auth.users;
CREATE TRIGGER auth_user_profile_trigger
AFTER INSERT ON auth.users
FOR EACH ROW
EXECUTE FUNCTION public.create_profile_for_auth_user();
