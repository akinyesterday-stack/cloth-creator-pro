
-- Activity log table for tracking team member actions
CREATE TABLE public.team_activity_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  team_leader_id uuid NOT NULL,
  action_type text NOT NULL DEFAULT 'general',
  description text NOT NULL,
  related_order_id uuid,
  model_name text,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.team_activity_log ENABLE ROW LEVEL SECURITY;

-- Team leaders can view their team's activity
CREATE POLICY "Team leaders can view team activity"
ON public.team_activity_log FOR SELECT
USING (auth.uid() = team_leader_id);

-- Team members can insert their own activity
CREATE POLICY "Users can insert their own activity"
ON public.team_activity_log FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- Admins can view all activity
CREATE POLICY "Admins can view all activity"
ON public.team_activity_log FOR SELECT
USING (has_role(auth.uid(), 'admin'::app_role));

-- Enable realtime for activity log
ALTER PUBLICATION supabase_realtime ADD TABLE public.team_activity_log;
