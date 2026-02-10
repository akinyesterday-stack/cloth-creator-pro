
-- Team members table for Tedarik Sorumlusu
CREATE TABLE public.team_members (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  team_leader_id uuid NOT NULL,
  member_id uuid NOT NULL,
  role text NOT NULL DEFAULT 'fabric',
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(team_leader_id, member_id)
);

ALTER TABLE public.team_members ENABLE ROW LEVEL SECURITY;

-- Team leader can manage their own team
CREATE POLICY "Team leaders can manage their team"
  ON public.team_members FOR ALL
  USING (auth.uid() = team_leader_id)
  WITH CHECK (auth.uid() = team_leader_id);

-- Members can see they belong to a team
CREATE POLICY "Members can see their team membership"
  ON public.team_members FOR SELECT
  USING (auth.uid() = member_id);

-- Admins can see all teams
CREATE POLICY "Admins can view all teams"
  ON public.team_members FOR SELECT
  USING (has_role(auth.uid(), 'admin'::app_role));

-- Order notifications table for fireworks effect
CREATE TABLE public.order_notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id uuid REFERENCES public.buyer_orders(id) ON DELETE CASCADE,
  recipient_id uuid NOT NULL,
  sender_id uuid NOT NULL,
  sender_name text,
  po_number text,
  model_name text,
  is_seen boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.order_notifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own order notifications"
  ON public.order_notifications FOR SELECT
  USING (auth.uid() = recipient_id);

CREATE POLICY "Users can update their own order notifications"
  ON public.order_notifications FOR UPDATE
  USING (auth.uid() = recipient_id);

CREATE POLICY "Authenticated users can create order notifications"
  ON public.order_notifications FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL);

-- Enable realtime for order_notifications
ALTER PUBLICATION supabase_realtime ADD TABLE public.order_notifications;
