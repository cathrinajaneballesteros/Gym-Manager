-- One check-in per member per day, even when two devices check the same member in at once.
-- Safe to run more than once. Run it in the Supabase SQL editor after 004_gym_logos.sql.

-- The gym's calendar day of each visit (Philippine time).
ALTER TABLE public.attendance_logs ADD COLUMN IF NOT EXISTS check_in_date DATE;
UPDATE public.attendance_logs
SET check_in_date = (timezone('Asia/Manila', check_in_time))::date
WHERE check_in_date IS NULL;
ALTER TABLE public.attendance_logs
  ALTER COLUMN check_in_date SET DEFAULT (timezone('Asia/Manila', now()))::date,
  ALTER COLUMN check_in_date SET NOT NULL;

-- If a member was already checked in twice on a day, keep only the first visit.
DELETE FROM public.attendance_logs a
USING public.attendance_logs b
WHERE a.member_id = b.member_id
  AND a.check_in_date = b.check_in_date
  AND (a.check_in_time > b.check_in_time OR (a.check_in_time = b.check_in_time AND a.id > b.id));

CREATE UNIQUE INDEX IF NOT EXISTS idx_attendance_once_a_day ON public.attendance_logs(member_id, check_in_date);
