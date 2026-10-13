-- Caps how often one login can send reminder emails/SMS or ask the AI, so nobody can burn the
-- Resend, Semaphore or Gemini quota by calling the API in a loop. Safe to run more than once.
-- Run it in the Supabase SQL editor after 006_merge_city_into_address.sql.

CREATE TABLE IF NOT EXISTS public.api_usage (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  kind TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);
CREATE INDEX IF NOT EXISTS idx_api_usage_user_kind_time ON public.api_usage(user_id, kind, created_at);

-- No policies: only take_api_quota() below reads or writes it.
ALTER TABLE public.api_usage ENABLE ROW LEVEL SECURITY;

-- Counts one use of `p_kind` for the caller. False (and nothing counted) when they already used
-- `p_max` within `p_window`.
CREATE OR REPLACE FUNCTION public.take_api_quota(p_kind TEXT, p_max INT, p_window INTERVAL)
RETURNS BOOLEAN
LANGUAGE plpgsql SECURITY DEFINER SET search_path = ''
AS $$
DECLARE
  v_uid UUID := auth.uid();
  v_used INT;
BEGIN
  IF v_uid IS NULL THEN
    RETURN FALSE;
  END IF;

  -- Old rows are no use to any window we check.
  DELETE FROM public.api_usage
  WHERE user_id = v_uid AND created_at < timezone('utc'::text, now()) - INTERVAL '1 day';

  SELECT count(*) INTO v_used FROM public.api_usage
  WHERE user_id = v_uid AND kind = p_kind AND created_at > timezone('utc'::text, now()) - p_window;
  IF v_used >= p_max THEN
    RETURN FALSE;
  END IF;

  INSERT INTO public.api_usage (user_id, kind) VALUES (v_uid, p_kind);
  RETURN TRUE;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.take_api_quota(TEXT, INT, INTERVAL) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.take_api_quota(TEXT, INT, INTERVAL) TO authenticated;
