import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { ClipboardList, Loader2, PlayCircle, ArrowRight } from "lucide-react";
import { format } from "date-fns";
import { tr } from "date-fns/locale";
import { SAS_STATUS, formatTL, getAccessibleLeaderIds, openWorkOrder } from "@/lib/sas";

interface Row {
  order_id: string;
  po_number: string;
  model_name: string;
  order_code: string | null;
  brand: string | null;
  total_quantity: number;
  assigned_to: string | null;
  created_at: string;
  work_order_id?: string;
  sas_id?: string;
  sas_status?: string;
  sas_total?: number;
}

export function WorkOrderList() {
  const { user, userType } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [openingId, setOpeningId] = useState<string | null>(null);

  const canOpen = ["planlama", "tedarik_sorumlusu", "admin"].includes(userType);

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

      const { data: orders } = await supabase
        .from("buyer_orders")
        .select("id, po_number, model_name, order_code, brand, total_quantity, assigned_to, created_at")
        .in("assigned_to", leaderIds)
        .eq("status", "sent")
        .order("created_at", { ascending: false });

      const orderIds = (orders || []).map((o) => o.id);
      const { data: workOrders } = orderIds.length
        ? await supabase.from("work_orders").select("id, order_id").in("order_id", orderIds)
        : { data: [] as { id: string; order_id: string }[] };

      const woIds = (workOrders || []).map((w) => w.id);
      const { data: sasForms } = woIds.length
        ? await supabase.from("sas_forms").select("id, work_order_id, status, total_amount").in("work_order_id", woIds)
        : { data: [] as { id: string; work_order_id: string; status: string; total_amount: number }[] };

      setRows(
        (orders || []).map((o) => {
          const wo = workOrders?.find((w) => w.order_id === o.id);
          const sas = wo ? sasForms?.find((s) => s.work_order_id === wo.id) : undefined;
          return {
            order_id: o.id,
            po_number: o.po_number,
            model_name: o.model_name,
            order_code: o.order_code,
            brand: o.brand,
            total_quantity: o.total_quantity,
            assigned_to: o.assigned_to,
            created_at: o.created_at,
            work_order_id: wo?.id,
            sas_id: sas?.id,
            sas_status: sas?.status,
            sas_total: sas ? Number(sas.total_amount) : undefined,
          };
        }),
      );
    } finally {
      setLoading(false);
    }
  };

  const handleOpen = async (row: Row) => {
    if (!row.assigned_to) return;
    setOpeningId(row.order_id);
    try {
      const workOrderId = await openWorkOrder(row.order_id, row.assigned_to, user!.id);
      navigate(`/sas/${workOrderId}`);
    } catch (error) {
      toast({
        title: "İş emri açılamadı",
        description: error instanceof Error ? error.message : "Bilinmeyen hata",
        variant: "destructive",
      });
    } finally {
      setOpeningId(null);
    }
  };

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
          <ClipboardList className="h-5 w-5" />
          İş Emirleri ({rows.length})
        </CardTitle>
      </CardHeader>
      <CardContent>
        {rows.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-8">
            Ekibinize gelen sipariş bulunmuyor.
          </p>
        ) : (
          <div className="space-y-3">
            {rows.map((row) => (
              <div
                key={row.order_id}
                className="flex flex-wrap items-center justify-between gap-3 p-4 rounded-lg bg-secondary/20 border border-border/50"
              >
                <div className="min-w-0">
                  <p className="font-semibold text-sm">
                    {row.po_number} • {row.model_name}
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">
                    {row.order_code ? `Kod: ${row.order_code} • ` : ""}
                    {row.brand ? `${row.brand} • ` : ""}
                    {row.total_quantity} adet •{" "}
                    {format(new Date(row.created_at), "dd MMM yyyy", { locale: tr })}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  {row.sas_status && (
                    <Badge variant="outline" className={SAS_STATUS[row.sas_status]?.className}>
                      {SAS_STATUS[row.sas_status]?.label || row.sas_status}
                    </Badge>
                  )}
                  {row.sas_total !== undefined && row.sas_total > 0 && (
                    <span className="text-xs text-muted-foreground">{formatTL(row.sas_total)}</span>
                  )}
                  {row.work_order_id ? (
                    <Button size="sm" variant="outline" onClick={() => navigate(`/sas/${row.work_order_id}`)}>
                      SAS Aç <ArrowRight className="h-4 w-4 ml-1" />
                    </Button>
                  ) : canOpen ? (
                    <Button size="sm" onClick={() => handleOpen(row)} disabled={openingId === row.order_id}>
                      {openingId === row.order_id ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <>
                          <PlayCircle className="h-4 w-4 mr-1" /> İş Emrini Aç
                        </>
                      )}
                    </Button>
                  ) : (
                    <span className="text-xs text-muted-foreground">Planlama açmadı</span>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
