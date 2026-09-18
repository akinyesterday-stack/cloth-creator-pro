import { supabase } from "@/integrations/supabase/client";

export type SasStatus =
  | "draft"
  | "fabric_pending"
  | "gramaj_pending"
  | "sorumlu_approval"
  | "mudur_approval"
  | "approved"
  | "rejected";

export const SAS_STATUS: Record<string, { label: string; className: string }> = {
  draft: { label: "Kumaş Kodu Bekleniyor", className: "bg-muted text-muted-foreground border-border" },
  fabric_pending: { label: "Kumaş Sorumlusunda", className: "bg-blue-500/20 text-blue-600 border-blue-500/30" },
  gramaj_pending: { label: "Kesim Takipte (Pastal)", className: "bg-amber-500/20 text-amber-600 border-amber-500/30" },
  sorumlu_approval: { label: "Tedarik Sorumlusu Onayında", className: "bg-purple-500/20 text-purple-600 border-purple-500/30" },
  mudur_approval: { label: "Tedarik Müdürü Onayında", className: "bg-orange-500/20 text-orange-600 border-orange-500/30" },
  approved: { label: "Onaylandı", className: "bg-green-500/20 text-green-600 border-green-500/30" },
  rejected: { label: "Reddedildi", className: "bg-destructive/20 text-destructive border-destructive/30" },
};

/** Who the file is currently waiting on. */
export const WAITING_ON: Record<string, string> = {
  draft: "Planlama (kumaş kodu)",
  fabric_pending: "Kumaş Sorumlusu",
  gramaj_pending: "Kesim Takip Uzmanı",
  sorumlu_approval: "Tedarik Sorumlusu",
  mudur_approval: "Tedarik Müdürü",
  approved: "—",
  rejected: "Kumaş Sorumlusu",
};

export interface SasItem {
  id: string;
  sas_id: string;
  fabric_code: string;
  fabric_name: string | null;
  color: string | null;
  unit: string;
  composition: string | null;
  width_cm: number | null;
  gsm_m2: number | null;
  dyehouse: string | null;
  dye_price: number | null;
  gramaj: number | null;
  order_quantity: number;
  quantity: number | null;
  supplier: string | null;
  termin_date: string | null;
  unit_price: number | null;
  line_total: number | null;
  source: string;
}

export interface SasForm {
  id: string;
  work_order_id: string;
  team_leader_id: string;
  created_by: string;
  status: string;
  total_amount: number;
  plm_fetched_at: string | null;
  plm_error: string | null;
  cost_opened_by: string | null;
  cost_opened_at: string | null;
  revision: number;
  created_at: string;
  updated_at?: string;
}

export interface WorkOrder {
  id: string;
  order_id: string;
  team_leader_id: string;
  opened_by: string;
  status: string;
  notes: string | null;
  created_at: string;
}

/** Returns the team leader (tedarik sorumlusu) id for the current user. */
export async function getMyTeamLeaderId(userId: string): Promise<string | null> {
  const { data } = await supabase
    .from("team_members")
    .select("team_leader_id")
    .eq("member_id", userId)
    .maybeSingle();
  return data?.team_leader_id ?? null;
}

/** Leader ids the current user can see data for (own team or, for a manager, assigned teams). */
export async function getAccessibleLeaderIds(userId: string, userType: string): Promise<string[]> {
  if (userType === "tedarik_muduru" || userType === "isletme_muduru") {
    const { data } = await supabase
      .from("manager_assignments")
      .select("sorumlu_id")
      .eq("manager_id", userId);
    return (data || []).map((r) => r.sorumlu_id);
  }
  if (userType === "tedarik_sorumlusu") return [userId];
  const leader = await getMyTeamLeaderId(userId);
  return leader ? [leader] : [];
}

/** Approval amount limit that applies to a team leader. */
export async function getApprovalLimit(leaderId: string): Promise<number> {
  const { data: assignment } = await supabase
    .from("manager_assignments")
    .select("manager_id")
    .eq("sorumlu_id", leaderId)
    .maybeSingle();
  if (!assignment) return 100000;
  const { data } = await supabase
    .from("approval_settings")
    .select("limit_amount")
    .eq("manager_id", assignment.manager_id)
    .maybeSingle();
  return Number(data?.limit_amount ?? 100000);
}

/** Opens a work order + empty SAS form for a buyer order (idempotent). */
export async function openWorkOrder(orderId: string, leaderId: string, userId: string) {
  const { data: existing } = await supabase
    .from("work_orders")
    .select("id")
    .eq("order_id", orderId)
    .maybeSingle();

  let workOrderId = existing?.id as string | undefined;

  if (!workOrderId) {
    const { data, error } = await supabase
      .from("work_orders")
      .insert({ order_id: orderId, team_leader_id: leaderId, opened_by: userId, status: "open" })
      .select("id")
      .single();
    if (error) throw error;
    workOrderId = data.id;
  }

  const { data: sas } = await supabase
    .from("sas_forms")
    .select("id")
    .eq("work_order_id", workOrderId)
    .maybeSingle();

  if (!sas) {
    const { error } = await supabase
      .from("sas_forms")
      .insert({ work_order_id: workOrderId, team_leader_id: leaderId, created_by: userId, status: "draft" });
    if (error) throw error;
  }

  return workOrderId!;
}

/** Marks / unmarks the planning cost as opened. */
export async function setCostOpened(sasId: string, userId: string, opened: boolean) {
  const { error } = await supabase
    .from("sas_forms")
    .update(
      opened
        ? { cost_opened_by: userId, cost_opened_at: new Date().toISOString() }
        : { cost_opened_by: null, cost_opened_at: null },
    )
    .eq("id", sasId);
  if (error) throw error;
}

export const daysSince = (iso: string) =>
  Math.max(0, Math.floor((Date.now() - new Date(iso).getTime()) / 86400000));

export const formatTL = (n: number | null | undefined) =>
  new Intl.NumberFormat("tr-TR", { style: "currency", currency: "TRY" }).format(Number(n || 0));
