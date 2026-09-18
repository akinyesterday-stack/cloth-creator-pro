import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { ArrowRight, CheckCircle2, Circle, Loader2, Workflow } from "lucide-react";
import { SAS_STATUS, WAITING_ON, daysSince, formatTL, getAccessibleLeaderIds } from "@/lib/sas";

interface PipelineRow {
  work_order_id: string;
  sas_id: string;
  status: string;
  total_amount: number;
  revision: number;
  cost_opened_at: string | null;
  updated_at: string;
  po_number: string;
  model_name: string;
  total_quantity: number;
  item_count: number;
}

const FILTERS = [
  { value: "all", label: "Tümü" },
  { value: "fabric_pending", label: "Kumaşçıda" },
  { value: "gramaj_pending", label: "Kesim Takipte" },
  { value: "sorumlu_approval", label: "Sorumlu Onayında" },
  { value: "mudur_approval", label: "Müdür Onayında" },
  { value: "approved", label: "Onaylandı" },
];

export function TeamPipeline() {
  const { user, userType } = useAuth();
  const navigate = useNavigate();
  const [rows, setRows] = useState<PipelineRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("all");

  useEffect(() => {
    if (user) load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, userType]);

  const load = async () => {
    setLoading(true);
    try {
      const leaderIds = await getAccessibleLeaderIds(user!.id, userType);
      if (leaderIds.length === 0) {
        setRows([]);
        return;
      }

      const { data: sasForms } = await supabase
        .from("sas_forms")
        .select("id, work_order_id, status, total_amount, revision, cost_opened_at, updated_at")
        .in("team_leader_id", leaderIds)
        .order("updated_at", { ascending: false });

      if (!sasForms || sasForms.length === 0) {
        setRows([]);
        return;
      }

      const woIds = sasForms.map((s) => s.work_order_id);
      const { data: workOrders } = await supabase
        .from("work_orders")
        .select("id, order_id")
        .in("id", woIds);

      const orderIds = (workOrders || []).map((w) => w.order_id);
      const [{ data: orders }, { data: items }] = await Promise.all([
        orderIds.length
          ? supabase.from("buyer_orders").select("id, po_number, model_name, total_quantity").in("id", orderIds)
          : Promise.resolve({ data: [] as { id: string; po_number: string; model_name: string; total_quantity: number }[] }),
        supabase.from("sas_items").select("id, sas_id").in("sas_id", sasForms.map((s) => s.id)),
      ]);

      setRows(
        sasForms.map((s) => {
          const wo = workOrders?.find((w) => w.id === s.work_order_id);
          const order = orders?.find((o) => o.id === wo?.order_id);
          return {
            work_order_id: s.work_order_id,
            sas_id: s.id,
            status: s.status,
            total_amount: Number(s.total_amount || 0),
            revision: Number((s as { revision?: number }).revision ?? 1),
            cost_opened_at: (s as { cost_opened_at?: string | null }).cost_opened_at ?? null,
            updated_at: s.updated_at,
            po_number: order?.po_number || "—",
            model_name: order?.model_name || "—",
            total_quantity: order?.total_quantity || 0,
            item_count: (items || []).filter((i) => i.sas_id === s.id).length,
          };
        }),
      );
    } finally {
      setLoading(false);
    }
  };

  const visible = filter === "all" ? rows : rows.filter((r) => r.status === filter);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <Card className="modern-card">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Workflow className="h-5 w-5" /> Kimde Ne Bekliyor ({visible.length})
        </CardTitle>
        <div className="flex flex-wrap gap-2 pt-2">
          {FILTERS.map((f) => (
            <Button
              key={f.value}
              size="sm"
              variant={filter === f.value ? "default" : "outline"}
              onClick={() => setFilter(f.value)}
            >
              {f.label}
            </Button>
          ))}
        </div>
      </CardHeader>
      <CardContent>
        {visible.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-8">Bu filtrede dosya bulunmuyor.</p>
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>PO / Model</TableHead>
                  <TableHead>Adım</TableHead>
                  <TableHead>Bekleyen</TableHead>
                  <TableHead className="w-24">Kalem</TableHead>
                  <TableHead className="w-24">Bekleme</TableHead>
                  <TableHead className="w-28">Maliyet</TableHead>
                  <TableHead className="w-20">Tur</TableHead>
                  <TableHead className="w-32">Tutar</TableHead>
                  <TableHead className="w-24" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {visible.map((r) => (
                  <TableRow key={r.sas_id}>
                    <TableCell>
                      <p className="font-medium text-sm">{r.po_number}</p>
                      <p className="text-xs text-muted-foreground">
                        {r.model_name} • {r.total_quantity} adet
                      </p>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className={SAS_STATUS[r.status]?.className}>
                        {SAS_STATUS[r.status]?.label || r.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-sm">{WAITING_ON[r.status] || "—"}</TableCell>
                    <TableCell className="text-sm">{r.item_count}</TableCell>
                    <TableCell className="text-sm">{daysSince(r.updated_at)} gün</TableCell>
                    <TableCell>
                      {r.cost_opened_at ? (
                        <span className="flex items-center gap-1 text-xs text-green-600">
                          <CheckCircle2 className="h-3.5 w-3.5" /> Açıldı
                        </span>
                      ) : (
                        <span className="flex items-center gap-1 text-xs text-muted-foreground">
                          <Circle className="h-3.5 w-3.5" /> Bekliyor
                        </span>
                      )}
                    </TableCell>
                    <TableCell className="text-sm">{r.revision}. tur</TableCell>
                    <TableCell className="text-sm font-semibold">{formatTL(r.total_amount)}</TableCell>
                    <TableCell>
                      <Button size="sm" variant="ghost" onClick={() => navigate(`/sas/${r.work_order_id}`)}>
                        Aç <ArrowRight className="h-4 w-4 ml-1" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
