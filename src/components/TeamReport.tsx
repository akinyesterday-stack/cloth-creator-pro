import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { BarChart3, Loader2 } from "lucide-react";
import { SAS_STATUS, formatTL, getAccessibleLeaderIds } from "@/lib/sas";

interface LeaderStat {
  leaderId: string;
  leaderName: string;
  orderCount: number;
  workOrderCount: number;
  sasTotal: number;
  approvedCount: number;
  pendingCount: number;
  lateCount: number;
  statuses: Record<string, number>;
}

export function TeamReport() {
  const { user, userType } = useAuth();
  const [stats, setStats] = useState<LeaderStat[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user) load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, userType]);

  const load = async () => {
    setLoading(true);
    try {
      const leaderIds = await getAccessibleLeaderIds(user!.id, userType);
      if (leaderIds.length === 0) {
        setStats([]);
        return;
      }

      const [{ data: profiles }, { data: orders }, { data: workOrders }] = await Promise.all([
        supabase.from("profiles").select("user_id, full_name").in("user_id", leaderIds),
        supabase.from("buyer_orders").select("id, assigned_to").in("assigned_to", leaderIds),
        supabase.from("work_orders").select("id, team_leader_id").in("team_leader_id", leaderIds),
      ]);

      const woIds = (workOrders || []).map((w) => w.id);
      const { data: sasForms } = woIds.length
        ? await supabase
            .from("sas_forms")
            .select("id, work_order_id, team_leader_id, status, total_amount")
            .in("work_order_id", woIds)
        : { data: [] as { id: string; team_leader_id: string; status: string; total_amount: number }[] };

      const sasIds = (sasForms || []).map((s) => s.id);
      const { data: lateItems } = sasIds.length
        ? await supabase
            .from("sas_items")
            .select("sas_id, termin_date")
            .in("sas_id", sasIds)
            .lt("termin_date", new Date().toISOString().slice(0, 10))
        : { data: [] as { sas_id: string; termin_date: string }[] };

      setStats(
        leaderIds.map((id) => {
          const leaderSas = (sasForms || []).filter((s) => s.team_leader_id === id);
          const statuses: Record<string, number> = {};
          leaderSas.forEach((s) => {
            statuses[s.status] = (statuses[s.status] || 0) + 1;
          });
          const leaderSasIds = leaderSas.map((s) => s.id);
          return {
            leaderId: id,
            leaderName: profiles?.find((p) => p.user_id === id)?.full_name || "Bilinmiyor",
            orderCount: (orders || []).filter((o) => o.assigned_to === id).length,
            workOrderCount: (workOrders || []).filter((w) => w.team_leader_id === id).length,
            sasTotal: leaderSas.reduce((sum, s) => sum + Number(s.total_amount || 0), 0),
            approvedCount: leaderSas.filter((s) => s.status === "approved").length,
            pendingCount: leaderSas.filter((s) => s.status !== "approved").length,
            lateCount: (lateItems || []).filter((i) => leaderSasIds.includes(i.sas_id)).length,
            statuses,
          };
        }),
      );
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </div>
    );
  }

  const grand = stats.reduce(
    (acc, s) => ({
      orderCount: acc.orderCount + s.orderCount,
      workOrderCount: acc.workOrderCount + s.workOrderCount,
      sasTotal: acc.sasTotal + s.sasTotal,
      approvedCount: acc.approvedCount + s.approvedCount,
      pendingCount: acc.pendingCount + s.pendingCount,
      lateCount: acc.lateCount + s.lateCount,
    }),
    { orderCount: 0, workOrderCount: 0, sasTotal: 0, approvedCount: 0, pendingCount: 0, lateCount: 0 },
  );

  return (
    <div className="space-y-6">
      {stats.length > 1 && (
        <Card className="modern-card">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BarChart3 className="h-5 w-5" /> Toplu Rapor ({stats.length} ekip)
            </CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-2 md:grid-cols-6 gap-4">
            <Stat label="Sipariş" value={grand.orderCount} />
            <Stat label="İş Emri" value={grand.workOrderCount} />
            <Stat label="Onaylı SAS" value={grand.approvedCount} />
            <Stat label="Bekleyen SAS" value={grand.pendingCount} />
            <Stat label="Geciken Termin" value={grand.lateCount} />
            <Stat label="Toplam Tutar" value={formatTL(grand.sasTotal)} />
          </CardContent>
        </Card>
      )}

      {stats.length === 0 ? (
        <Card className="modern-card">
          <CardContent className="py-10 text-center text-sm text-muted-foreground">
            Raporlanacak ekip bulunmuyor.
          </CardContent>
        </Card>
      ) : (
        stats.map((s) => (
          <Card key={s.leaderId} className="modern-card">
            <CardHeader>
              <CardTitle className="text-base">{s.leaderName} ekibi</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 md:grid-cols-6 gap-4">
                <Stat label="Sipariş" value={s.orderCount} />
                <Stat label="İş Emri" value={s.workOrderCount} />
                <Stat label="Onaylı SAS" value={s.approvedCount} />
                <Stat label="Bekleyen SAS" value={s.pendingCount} />
                <Stat label="Geciken Termin" value={s.lateCount} />
                <Stat label="Toplam Tutar" value={formatTL(s.sasTotal)} />
              </div>
              <div className="flex flex-wrap gap-2">
                {Object.entries(s.statuses).map(([key, count]) => (
                  <Badge key={key} variant="outline" className={SAS_STATUS[key]?.className}>
                    {SAS_STATUS[key]?.label || key}: {count}
                  </Badge>
                ))}
              </div>
            </CardContent>
          </Card>
        ))
      )}
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="p-3 rounded-lg bg-secondary/30 border border-border/50">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="text-lg font-bold mt-1">{value}</p>
    </div>
  );
}
