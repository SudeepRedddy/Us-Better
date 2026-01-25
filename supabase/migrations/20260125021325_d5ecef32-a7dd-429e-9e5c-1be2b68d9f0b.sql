-- Drop the existing restrictive policy
DROP POLICY IF EXISTS "Users can view own habits and friends public habits" ON public.habits;

-- Create a new policy that allows viewing:
-- 1. Own habits (all)
-- 2. Other users' PUBLIC habits (for leaderboard/friend views)
CREATE POLICY "Users can view own habits and public habits" ON public.habits
  FOR SELECT USING (
    auth.uid() = user_id 
    OR is_public = true
  );

-- Also update daily_check_ins to match the new habit visibility
DROP POLICY IF EXISTS "Users can view own and friends check-ins" ON public.daily_check_ins;

CREATE POLICY "Users can view check-ins for visible habits" ON public.daily_check_ins
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM habits h
      WHERE h.id = daily_check_ins.habit_id 
      AND (h.user_id = auth.uid() OR h.is_public = true)
    )
  );