-- Keep the name on a gym's staff list in step with the person's own profile.
-- gym_staff.full_name is copied from profiles when someone joins a gym; without this, renaming yourself in
-- Settings left the old name on the owner's Staff list.
-- Safe to run more than once. Run it in the Supabase SQL editor after 008_invite_accept_and_server_audit.sql.

CREATE OR REPLACE FUNCTION public.sync_staff_name()
RETURNS TRIGGER
LANGUAGE plpgsql SECURITY DEFINER SET search_path = ''
AS $$
BEGIN
  UPDATE public.gym_staff SET full_name = NEW.full_name WHERE user_id = NEW.id;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS sync_staff_name ON public.profiles;
CREATE TRIGGER sync_staff_name AFTER UPDATE OF full_name ON public.profiles
  FOR EACH ROW WHEN (OLD.full_name IS DISTINCT FROM NEW.full_name)
  EXECUTE FUNCTION public.sync_staff_name();

-- Fix names that already drifted.
UPDATE public.gym_staff s
SET full_name = p.full_name
FROM public.profiles p
WHERE s.user_id = p.id AND s.full_name IS DISTINCT FROM p.full_name;
