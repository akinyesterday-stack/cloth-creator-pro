-- Let team members of the assigned supply manager view the same buyer orders
DROP POLICY IF EXISTS "Assigned users can view orders" ON public.buyer_orders;
DROP POLICY IF EXISTS "Team members can view assigned leader orders" ON public.buyer_orders;

CREATE POLICY "Assigned users and team members can view orders"
ON public.buyer_orders
FOR SELECT
USING (
  auth.uid() = assigned_to
  OR EXISTS (
    SELECT 1
    FROM public.team_members tm
    WHERE tm.team_leader_id = buyer_orders.assigned_to
      AND tm.member_id = auth.uid()
  )
);

-- Keep order detail rows readable for both assigned supply managers and their team members
DROP POLICY IF EXISTS "Users can manage order items through orders" ON public.buyer_order_items;
CREATE POLICY "Users can manage order items through orders"
ON public.buyer_order_items
FOR ALL
USING (
  EXISTS (
    SELECT 1
    FROM public.buyer_orders bo
    WHERE bo.id = buyer_order_items.order_id
      AND (
        bo.user_id = auth.uid()
        OR bo.assigned_to = auth.uid()
        OR EXISTS (
          SELECT 1
          FROM public.team_members tm
          WHERE tm.team_leader_id = bo.assigned_to
            AND tm.member_id = auth.uid()
        )
      )
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1
    FROM public.buyer_orders bo
    WHERE bo.id = buyer_order_items.order_id
      AND (
        bo.user_id = auth.uid()
        OR bo.assigned_to = auth.uid()
        OR EXISTS (
          SELECT 1
          FROM public.team_members tm
          WHERE tm.team_leader_id = bo.assigned_to
            AND tm.member_id = auth.uid()
        )
      )
  )
);

DROP POLICY IF EXISTS "Users can manage order countries through orders" ON public.buyer_order_countries;
CREATE POLICY "Users can manage order countries through orders"
ON public.buyer_order_countries
FOR ALL
USING (
  EXISTS (
    SELECT 1
    FROM public.buyer_orders bo
    WHERE bo.id = buyer_order_countries.order_id
      AND (
        bo.user_id = auth.uid()
        OR bo.assigned_to = auth.uid()
        OR EXISTS (
          SELECT 1
          FROM public.team_members tm
          WHERE tm.team_leader_id = bo.assigned_to
            AND tm.member_id = auth.uid()
        )
      )
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1
    FROM public.buyer_orders bo
    WHERE bo.id = buyer_order_countries.order_id
      AND (
        bo.user_id = auth.uid()
        OR bo.assigned_to = auth.uid()
        OR EXISTS (
          SELECT 1
          FROM public.team_members tm
          WHERE tm.team_leader_id = bo.assigned_to
            AND tm.member_id = auth.uid()
        )
      )
  )
);

-- Backfill missing notifications for existing sent orders to current team members
INSERT INTO public.order_notifications (
  order_id,
  recipient_id,
  sender_id,
  sender_name,
  po_number,
  model_name
)
SELECT
  bo.id,
  tm.member_id,
  bo.user_id,
  COALESCE(p.full_name, 'Buyer'),
  bo.po_number,
  bo.model_name
FROM public.buyer_orders bo
JOIN public.team_members tm
  ON tm.team_leader_id = bo.assigned_to
LEFT JOIN public.profiles p
  ON p.user_id = bo.user_id
WHERE bo.assigned_to IS NOT NULL
  AND bo.status = 'sent'
  AND NOT EXISTS (
    SELECT 1
    FROM public.order_notifications existing
    WHERE existing.order_id = bo.id
      AND existing.recipient_id = tm.member_id
  );