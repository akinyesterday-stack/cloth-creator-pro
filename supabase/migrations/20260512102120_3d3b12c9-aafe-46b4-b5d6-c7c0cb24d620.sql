-- Backend-created notifications for assigned supply managers and their team members
CREATE OR REPLACE FUNCTION public.create_order_notifications_for_order()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _sender_name text;
BEGIN
  IF NEW.status IS DISTINCT FROM 'sent' OR NEW.assigned_to IS NULL THEN
    RETURN NEW;
  END IF;

  SELECT p.full_name
  INTO _sender_name
  FROM public.profiles p
  WHERE p.user_id = NEW.user_id
  LIMIT 1;

  INSERT INTO public.order_notifications (
    order_id,
    recipient_id,
    sender_id,
    sender_name,
    po_number,
    model_name
  )
  SELECT
    NEW.id,
    recipients.recipient_id,
    NEW.user_id,
    COALESCE(_sender_name, 'Buyer'),
    NEW.po_number,
    NEW.model_name
  FROM (
    SELECT NEW.assigned_to AS recipient_id
    UNION
    SELECT tm.member_id AS recipient_id
    FROM public.team_members tm
    WHERE tm.team_leader_id = NEW.assigned_to
  ) recipients
  WHERE recipients.recipient_id IS NOT NULL;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS buyer_orders_notify_recipients ON public.buyer_orders;
CREATE TRIGGER buyer_orders_notify_recipients
AFTER INSERT OR UPDATE OF status, assigned_to, po_number, model_name ON public.buyer_orders
FOR EACH ROW
WHEN (NEW.status = 'sent' AND NEW.assigned_to IS NOT NULL)
EXECUTE FUNCTION public.create_order_notifications_for_order();

-- When a supply manager adds a new team member, give that member existing sent orders as notifications
CREATE OR REPLACE FUNCTION public.create_existing_order_notifications_for_team_member()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
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
    NEW.member_id,
    bo.user_id,
    COALESCE(p.full_name, 'Buyer'),
    bo.po_number,
    bo.model_name
  FROM public.buyer_orders bo
  LEFT JOIN public.profiles p
    ON p.user_id = bo.user_id
  WHERE bo.assigned_to = NEW.team_leader_id
    AND bo.status = 'sent'
    AND NOT EXISTS (
      SELECT 1
      FROM public.order_notifications existing
      WHERE existing.order_id = bo.id
        AND existing.recipient_id = NEW.member_id
    );

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS team_members_backfill_order_notifications ON public.team_members;
CREATE TRIGGER team_members_backfill_order_notifications
AFTER INSERT ON public.team_members
FOR EACH ROW
EXECUTE FUNCTION public.create_existing_order_notifications_for_team_member();

-- Client code should no longer create order notifications directly; backend triggers do it consistently
DROP POLICY IF EXISTS "Authenticated users can create order notifications" ON public.order_notifications;

-- Keep direct calls to trigger/security helper functions unavailable from the public API
REVOKE EXECUTE ON FUNCTION public.create_order_notifications_for_order() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.create_existing_order_notifications_for_team_member() FROM PUBLIC, anon, authenticated;
DROP FUNCTION IF EXISTS public.get_team_member_ids(uuid);

-- Tighten order detail access: buyers manage their own details; assigned supply managers and their teams can view details
DROP POLICY IF EXISTS "Users can manage order items through orders" ON public.buyer_order_items;
CREATE POLICY "Buyers can manage own order items"
ON public.buyer_order_items
FOR ALL
USING (
  EXISTS (
    SELECT 1
    FROM public.buyer_orders bo
    WHERE bo.id = buyer_order_items.order_id
      AND bo.user_id = auth.uid()
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1
    FROM public.buyer_orders bo
    WHERE bo.id = buyer_order_items.order_id
      AND bo.user_id = auth.uid()
  )
);

CREATE POLICY "Assigned users and team members can view order items"
ON public.buyer_order_items
FOR SELECT
USING (
  EXISTS (
    SELECT 1
    FROM public.buyer_orders bo
    WHERE bo.id = buyer_order_items.order_id
      AND (
        bo.assigned_to = auth.uid()
        OR EXISTS (
          SELECT 1
          FROM public.team_members tm
          WHERE tm.team_leader_id = bo.assigned_to
            AND tm.member_id = auth.uid()
        )
        OR public.has_role(auth.uid(), 'admin'::app_role)
      )
  )
);

DROP POLICY IF EXISTS "Users can manage order countries through orders" ON public.buyer_order_countries;
CREATE POLICY "Buyers can manage own order countries"
ON public.buyer_order_countries
FOR ALL
USING (
  EXISTS (
    SELECT 1
    FROM public.buyer_orders bo
    WHERE bo.id = buyer_order_countries.order_id
      AND bo.user_id = auth.uid()
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1
    FROM public.buyer_orders bo
    WHERE bo.id = buyer_order_countries.order_id
      AND bo.user_id = auth.uid()
  )
);

CREATE POLICY "Assigned users and team members can view order countries"
ON public.buyer_order_countries
FOR SELECT
USING (
  EXISTS (
    SELECT 1
    FROM public.buyer_orders bo
    WHERE bo.id = buyer_order_countries.order_id
      AND (
        bo.assigned_to = auth.uid()
        OR EXISTS (
          SELECT 1
          FROM public.team_members tm
          WHERE tm.team_leader_id = bo.assigned_to
            AND tm.member_id = auth.uid()
        )
        OR public.has_role(auth.uid(), 'admin'::app_role)
      )
  )
);