CREATE POLICY "Managers can view assigned teams" ON public.team_members
FOR SELECT TO authenticated
USING (public.is_manager_of(auth.uid(), team_leader_id));

CREATE POLICY "Managers can view assigned team orders" ON public.buyer_orders
FOR SELECT TO authenticated
USING (assigned_to IS NOT NULL AND public.is_manager_of(auth.uid(), assigned_to));