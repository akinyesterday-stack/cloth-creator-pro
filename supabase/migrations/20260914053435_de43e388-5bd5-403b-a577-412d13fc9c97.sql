-- Helper: team/manager access
CREATE TABLE public.manager_assignments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  manager_id uuid NOT NULL,
  sorumlu_id uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (manager_id, sorumlu_id)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.manager_assignments TO authenticated;
GRANT ALL ON public.manager_assignments TO service_role;
ALTER TABLE public.manager_assignments ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.is_manager_of(_manager uuid, _sorumlu uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.manager_assignments
                 WHERE manager_id = _manager AND sorumlu_id = _sorumlu)
$$;

CREATE OR REPLACE FUNCTION public.can_access_team(_leader uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT _leader = auth.uid()
     OR EXISTS (SELECT 1 FROM public.team_members
                WHERE team_leader_id = _leader AND member_id = auth.uid())
     OR EXISTS (SELECT 1 FROM public.manager_assignments
                WHERE sorumlu_id = _leader AND manager_id = auth.uid())
     OR public.has_role(auth.uid(), 'admin')
$$;

CREATE OR REPLACE FUNCTION public.my_team_leaders()
RETURNS SETOF uuid LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT auth.uid()
  UNION
  SELECT team_leader_id FROM public.team_members WHERE member_id = auth.uid()
  UNION
  SELECT sorumlu_id FROM public.manager_assignments WHERE manager_id = auth.uid()
$$;

CREATE POLICY "Managers manage own assignments" ON public.manager_assignments
FOR ALL TO authenticated USING (manager_id = auth.uid() OR sorumlu_id = auth.uid() OR public.has_role(auth.uid(),'admin'))
WITH CHECK (manager_id = auth.uid() OR public.has_role(auth.uid(),'admin'));

-- Approval limit settings (per manager)
CREATE TABLE public.approval_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  manager_id uuid NOT NULL UNIQUE,
  limit_amount numeric NOT NULL DEFAULT 100000,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.approval_settings TO authenticated;
GRANT ALL ON public.approval_settings TO service_role;
ALTER TABLE public.approval_settings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone approved can read limits" ON public.approval_settings
FOR SELECT TO authenticated USING (true);
CREATE POLICY "Managers manage own limit" ON public.approval_settings
FOR ALL TO authenticated USING (manager_id = auth.uid() OR public.has_role(auth.uid(),'admin'))
WITH CHECK (manager_id = auth.uid() OR public.has_role(auth.uid(),'admin'));
CREATE TRIGGER update_approval_settings_updated_at BEFORE UPDATE ON public.approval_settings
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Work orders
CREATE TABLE public.work_orders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id uuid NOT NULL UNIQUE REFERENCES public.buyer_orders(id) ON DELETE CASCADE,
  team_leader_id uuid NOT NULL,
  opened_by uuid NOT NULL,
  status text NOT NULL DEFAULT 'open',
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.work_orders TO authenticated;
GRANT ALL ON public.work_orders TO service_role;
ALTER TABLE public.work_orders ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Team can view work orders" ON public.work_orders
FOR SELECT TO authenticated USING (public.can_access_team(team_leader_id));
CREATE POLICY "Team can create work orders" ON public.work_orders
FOR INSERT TO authenticated WITH CHECK (public.can_access_team(team_leader_id) AND opened_by = auth.uid());
CREATE POLICY "Team can update work orders" ON public.work_orders
FOR UPDATE TO authenticated USING (public.can_access_team(team_leader_id));
CREATE POLICY "Leader can delete work orders" ON public.work_orders
FOR DELETE TO authenticated USING (team_leader_id = auth.uid() OR public.has_role(auth.uid(),'admin'));
CREATE TRIGGER update_work_orders_updated_at BEFORE UPDATE ON public.work_orders
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- SAS forms
CREATE TABLE public.sas_forms (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  work_order_id uuid NOT NULL UNIQUE REFERENCES public.work_orders(id) ON DELETE CASCADE,
  team_leader_id uuid NOT NULL,
  created_by uuid NOT NULL,
  status text NOT NULL DEFAULT 'draft',
  total_amount numeric NOT NULL DEFAULT 0,
  plm_fetched_at timestamptz,
  plm_error text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.sas_forms TO authenticated;
GRANT ALL ON public.sas_forms TO service_role;
ALTER TABLE public.sas_forms ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Team can view sas" ON public.sas_forms
FOR SELECT TO authenticated USING (public.can_access_team(team_leader_id));
CREATE POLICY "Team can create sas" ON public.sas_forms
FOR INSERT TO authenticated WITH CHECK (public.can_access_team(team_leader_id) AND created_by = auth.uid());
CREATE POLICY "Team can update sas" ON public.sas_forms
FOR UPDATE TO authenticated USING (public.can_access_team(team_leader_id));
CREATE POLICY "Leader can delete sas" ON public.sas_forms
FOR DELETE TO authenticated USING (team_leader_id = auth.uid() OR public.has_role(auth.uid(),'admin'));
CREATE TRIGGER update_sas_forms_updated_at BEFORE UPDATE ON public.sas_forms
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- SAS items
CREATE TABLE public.sas_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  sas_id uuid NOT NULL REFERENCES public.sas_forms(id) ON DELETE CASCADE,
  fabric_code text NOT NULL,
  fabric_name text,
  color text,
  unit text NOT NULL DEFAULT 'kg',
  gramaj numeric,
  order_quantity integer NOT NULL DEFAULT 0,
  quantity numeric GENERATED ALWAYS AS (round(COALESCE(gramaj,0) * order_quantity / 1000.0, 2)) STORED,
  supplier text,
  termin_date date,
  unit_price numeric,
  line_total numeric GENERATED ALWAYS AS (round(COALESCE(gramaj,0) * order_quantity / 1000.0 * COALESCE(unit_price,0), 2)) STORED,
  source text NOT NULL DEFAULT 'manual',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.sas_items TO authenticated;
GRANT ALL ON public.sas_items TO service_role;
ALTER TABLE public.sas_items ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.can_access_sas(_sas_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.sas_forms s
                 WHERE s.id = _sas_id AND public.can_access_team(s.team_leader_id))
$$;

CREATE POLICY "Team can view sas items" ON public.sas_items
FOR SELECT TO authenticated USING (public.can_access_sas(sas_id));
CREATE POLICY "Team can insert sas items" ON public.sas_items
FOR INSERT TO authenticated WITH CHECK (public.can_access_sas(sas_id));
CREATE POLICY "Team can update sas items" ON public.sas_items
FOR UPDATE TO authenticated USING (public.can_access_sas(sas_id));
CREATE POLICY "Team can delete sas items" ON public.sas_items
FOR DELETE TO authenticated USING (public.can_access_sas(sas_id));
CREATE TRIGGER update_sas_items_updated_at BEFORE UPDATE ON public.sas_items
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Keep SAS total in sync
CREATE OR REPLACE FUNCTION public.recalc_sas_total()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE _sas uuid;
BEGIN
  _sas := COALESCE(NEW.sas_id, OLD.sas_id);
  UPDATE public.sas_forms
    SET total_amount = COALESCE((SELECT SUM(line_total) FROM public.sas_items WHERE sas_id = _sas), 0)
  WHERE id = _sas;
  RETURN NULL;
END;
$$;
CREATE TRIGGER sas_items_recalc_total
AFTER INSERT OR UPDATE OR DELETE ON public.sas_items
FOR EACH ROW EXECUTE FUNCTION public.recalc_sas_total();

-- Approvals
CREATE TABLE public.sas_approvals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  sas_id uuid NOT NULL REFERENCES public.sas_forms(id) ON DELETE CASCADE,
  approver_id uuid NOT NULL,
  approver_role text NOT NULL,
  action text NOT NULL,
  note text,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT ON public.sas_approvals TO authenticated;
GRANT ALL ON public.sas_approvals TO service_role;
ALTER TABLE public.sas_approvals ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Team can view approvals" ON public.sas_approvals
FOR SELECT TO authenticated USING (public.can_access_sas(sas_id));
CREATE POLICY "Approvers can insert own approval" ON public.sas_approvals
FOR INSERT TO authenticated WITH CHECK (approver_id = auth.uid() AND public.can_access_sas(sas_id));