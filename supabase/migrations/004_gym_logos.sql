-- Gym logos: each owner can upload their gym's logo; it shows in the sidebar for the whole team.
-- Safe to run more than once. Run it in the Supabase SQL editor after 003_walk_ins.sql.

ALTER TABLE public.gyms ADD COLUMN IF NOT EXISTS logo_url TEXT;

-- Public bucket so logos load with a plain link; 2 MB, images only.
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES ('gym-logos', 'gym-logos', true, 2097152, ARRAY['image/png', 'image/jpeg', 'image/webp'])
ON CONFLICT (id) DO UPDATE SET
  public = EXCLUDED.public,
  file_size_limit = EXCLUDED.file_size_limit,
  allowed_mime_types = EXCLUDED.allowed_mime_types;

-- Files live under "<gym id>/...". Only that gym's owner can add, replace or delete them.
-- (Anyone can view them through the public link; Storage still needs this to find a file before deleting it.)
DROP POLICY IF EXISTS "Gym owners see their logo files" ON storage.objects;
CREATE POLICY "Gym owners see their logo files" ON storage.objects FOR SELECT TO authenticated
  USING (
    bucket_id = 'gym-logos'
    AND (storage.foldername(name))[1] = (SELECT public.my_gym_id())::text
    AND (SELECT public.my_gym_role()) = 'owner'
  );

DROP POLICY IF EXISTS "Gym owners upload their logo" ON storage.objects;
CREATE POLICY "Gym owners upload their logo" ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'gym-logos'
    AND (storage.foldername(name))[1] = (SELECT public.my_gym_id())::text
    AND (SELECT public.my_gym_role()) = 'owner'
  );

DROP POLICY IF EXISTS "Gym owners replace their logo" ON storage.objects;
CREATE POLICY "Gym owners replace their logo" ON storage.objects FOR UPDATE TO authenticated
  USING (
    bucket_id = 'gym-logos'
    AND (storage.foldername(name))[1] = (SELECT public.my_gym_id())::text
    AND (SELECT public.my_gym_role()) = 'owner'
  );

DROP POLICY IF EXISTS "Gym owners delete their logo" ON storage.objects;
CREATE POLICY "Gym owners delete their logo" ON storage.objects FOR DELETE TO authenticated
  USING (
    bucket_id = 'gym-logos'
    AND (storage.foldername(name))[1] = (SELECT public.my_gym_id())::text
    AND (SELECT public.my_gym_role()) = 'owner'
  );
