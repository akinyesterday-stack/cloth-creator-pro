import { useEffect, useState, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Header } from "@/components/Header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import {
  ArrowLeft, Check, Download, Loader2, Plus, RefreshCw, Send, Trash2, X,
} from "lucide-react";
import { format } from "date-fns";
import { tr } from "date-fns/locale";
import { SAS_STATUS, SasForm, SasItem, formatTL, getApprovalLimit } from "@/lib/sas";
import { generateOrderPdf } from "@/lib/orderPdf";

interface OrderInfo {
  id: string;
  po_number: string;
  model_name: string;
  order_code: string | null;
  brand: string | null;
  customer_name: string;
  season: string | null;
  total_quantity: number;
  model_image: string | null;
}

interface Approval {
  id: string;
  approver_id: string;
  approver_role: string;
  action: string;
  note: string | null;
  created_at: string;
  approver_name?: string;
}

const SasDetail = () => {
  const { workOrderId } = useParams();
  const navigate = useNavigate();
  const { user, userType } = useAuth();
  const { toast } = useToast();

  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [order, setOrder] = useState<OrderInfo | null>(null);
  const [sas, setSas] = useState<SasForm | null>(null);
  const [items, setItems] = useState<SasItem[]>([]);
  const [approvals, setApprovals] = useState<Approval[]>([]);
  const [limit, setLimit] = useState(100000);
  const [note, setNote] = useState("");

  const isAdmin = userType === "admin";
  const canPlm = isAdmin || ["planlama", "tedarik_sorumlusu"].includes(userType);
  const canGramaj = isAdmin || userType === "kesim_takip";
  const canFabric = isAdmin || userType === "fabric";
  const canSorumluApprove = isAdmin || userType === "tedarik_sorumlusu";
  const canMudurApprove = isAdmin || ["tedarik_muduru", "isletme_muduru"].includes(userType);

  const load = useCallback(async () => {
    if (!workOrderId) return;
    setLoading(true);
    try {
      const { data: wo } = await supabase
        .from("work_orders")
        .select("id, order_id, team_leader_id")
        .eq("id", workOrderId)
        .maybeSingle();
      if (!wo) return;

      const [{ data: orderRow }, { data: sasRow }] = await Promise.all([
        supabase
          .from("buyer_orders")
          .select("id, po_number, model_name, order_code, brand, customer_name, season, total_quantity, model_image")
          .eq("id", wo.order_id)
          .maybeSingle(),
        supabase.from("sas_forms").select("*").eq("work_order_id", wo.id).maybeSingle(),
      ]);

      setOrder(orderRow as OrderInfo | null);
      setSas(sasRow as SasForm | null);
      setLimit(await getApprovalLimit(wo.team_leader_id));

      if (sasRow) {
        const [{ data: itemRows }, { data: approvalRows }] = await Promise.all([
          supabase.from("sas_items").select("*").eq("sas_id", sasRow.id).order("created_at"),
          supabase.from("sas_approvals").select("*").eq("sas_id", sasRow.id).order("created_at"),
        ]);
        setItems((itemRows || []) as SasItem[]);

        const ids = [...new Set((approvalRows || []).map((a) => a.approver_id))];
        const { data: profiles } = ids.length
          ? await supabase.from("profiles").select("user_id, full_name").in("user_id", ids)
          : { data: [] as { user_id: string; full_name: string }[] };
        setApprovals(
          (approvalRows || []).map((a) => ({
            ...a,
            approver_name: profiles?.find((p) => p.user_id === a.approver_id)?.full_name || "Bilinmiyor",
          })),
        );
      }
    } finally {
      setLoading(false);
    }
  }, [workOrderId]);

  useEffect(() => {
    load();
  }, [load]);

  const updateItem = async (id: string, patch: Partial<SasItem>) => {
    setItems((prev) => prev.map((i) => (i.id === id ? { ...i, ...patch } : i)));
    const { error } = await supabase.from("sas_items").update(patch).eq("id", id);
    if (error) {
      toast({ title: "Kaydedilemedi", description: error.message, variant: "destructive" });
      return;
    }
    const { data } = await supabase.from("sas_items").select("*").eq("id", id).maybeSingle();
    if (data) setItems((prev) => prev.map((i) => (i.id === id ? (data as SasItem) : i)));
  };

  const addItem = async () => {
    if (!sas || !order) return;
    const { data, error } = await supabase
      .from("sas_items")
      .insert({
        sas_id: sas.id,
        fabric_code: "YENİ-KOD",
        order_quantity: order.total_quantity,
        source: "manual",
      })
      .select("*")
      .single();
    if (error) {
      toast({ title: "Kalem eklenemedi", description: error.message, variant: "destructive" });
      return;
    }
    setItems((prev) => [...prev, data as SasItem]);
  };

  const removeItem = async (id: string) => {
    await supabase.from("sas_items").delete().eq("id", id);
    setItems((prev) => prev.filter((i) => i.id !== id));
  };

  const fetchPlm = async () => {
    if (!sas || !order) return;
    setBusy(true);
    try {
      const { data, error } = await supabase.functions.invoke("plm-fetch-fabrics", {
        body: {
          sas_id: sas.id,
          model_name: order.model_name,
          po_number: order.po_number,
          order_quantity: order.total_quantity,
        },
      });
      if (error) throw error;
      toast({ title: "PLM'den çekildi", description: `${data?.inserted ?? 0} kumaş kalemi eklendi.` });
      await load();
    } catch (error) {
      const message = error instanceof Error ? error.message : "Bilinmeyen hata";
      toast({ title: "PLM'den çekilemedi", description: message, variant: "destructive" });
      await load();
    } finally {
      setBusy(false);
    }
  };

  const setStatus = async (status: string) => {
    if (!sas) return;
    setBusy(true);
    const { error } = await supabase.from("sas_forms").update({ status }).eq("id", sas.id);
    setBusy(false);
    if (error) {
      toast({ title: "Durum güncellenemedi", description: error.message, variant: "destructive" });
      return;
    }
    setSas({ ...sas, status });
  };

  const recordApproval = async (action: string, role: string, nextStatus: string) => {
    if (!sas) return;
    setBusy(true);
    const { error } = await supabase.from("sas_approvals").insert({
      sas_id: sas.id,
      approver_id: user!.id,
      approver_role: role,
      action,
      note: note || null,
    });
    setBusy(false);
    if (error) {
      toast({ title: "Onay kaydedilemedi", description: error.message, variant: "destructive" });
      return;
    }
    setNote("");
    await setStatus(nextStatus);
    await load();
  };

  const total = items.reduce((sum, i) => sum + Number(i.line_total || 0), 0);
  const gramajComplete = items.length > 0 && items.every((i) => Number(i.gramaj || 0) > 0);
  const fabricComplete =
    items.length > 0 && items.every((i) => i.supplier && i.termin_date && Number(i.unit_price || 0) > 0);

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!order || !sas) {
    return (
      <div className="min-h-screen bg-background">
        <Header onRadioToggle={() => {}} isRadioOpen={false} />
        <main className="container mx-auto px-4 py-12 text-center">
          <p className="text-muted-foreground">Bu iş emrine erişiminiz yok veya kayıt bulunamadı.</p>
          <Button className="mt-4" variant="outline" onClick={() => navigate(-1)}>
            Geri dön
          </Button>
        </main>
      </div>
    );
  }

  const status = sas.status;

  return (
    <div className="min-h-screen bg-background">
      <div className="fixed inset-0 gradient-mesh pointer-events-none" />
      <Header onRadioToggle={() => {}} isRadioOpen={false} />

      <main className="container mx-auto px-4 py-8 relative z-10 space-y-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="sm" onClick={() => navigate(-1)}>
              <ArrowLeft className="h-4 w-4 mr-1" /> Geri
            </Button>
            <div>
              <h1 className="text-2xl font-bold">
                SAS • {order.po_number}
              </h1>
              <p className="text-sm text-muted-foreground">
                {order.model_name} • {order.customer_name} • {order.total_quantity} adet
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant="outline" className={SAS_STATUS[status]?.className}>
              {SAS_STATUS[status]?.label || status}
            </Badge>
            <Button variant="outline" size="sm" onClick={() => generateOrderPdf(order.id)}>
              <Download className="h-4 w-4 mr-1" /> Sipariş PDF
            </Button>
          </div>
        </div>

        <Card className="modern-card">
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>Kumaş Kalemleri ({items.length})</CardTitle>
            <div className="flex items-center gap-2">
              {canPlm && (
                <Button size="sm" variant="outline" onClick={fetchPlm} disabled={busy}>
                  {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4 mr-1" />}
                  PLM'den Çek
                </Button>
              )}
              {canPlm && (
                <Button size="sm" variant="outline" onClick={addItem}>
                  <Plus className="h-4 w-4 mr-1" /> Kalem Ekle
                </Button>
              )}
            </div>
          </CardHeader>
          <CardContent>
            {sas.plm_error && (
              <p className="text-xs text-destructive mb-3">PLM: {sas.plm_error}</p>
            )}
            {sas.plm_fetched_at && (
              <p className="text-xs text-muted-foreground mb-3">
                Son PLM çekimi: {format(new Date(sas.plm_fetched_at), "dd MMM yyyy HH:mm", { locale: tr })}
              </p>
            )}
            {items.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-8">
                Henüz kumaş kalemi yok. PLM'den çekin veya elle ekleyin.
              </p>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Kumaş Kodu</TableHead>
                      <TableHead>Kumaş Adı</TableHead>
                      <TableHead>Renk</TableHead>
                      <TableHead className="w-28">Gramaj (gr)</TableHead>
                      <TableHead className="w-24">Adet</TableHead>
                      <TableHead className="w-28">Miktar (kg)</TableHead>
                      <TableHead className="w-40">Üretici</TableHead>
                      <TableHead className="w-40">Termin</TableHead>
                      <TableHead className="w-28">Birim Fiyat</TableHead>
                      <TableHead className="w-32">Tutar</TableHead>
                      {canPlm && <TableHead className="w-10" />}
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {items.map((item) => (
                      <TableRow key={item.id}>
                        <TableCell>
                          {canPlm ? (
                            <Input
                              className="h-8"
                              defaultValue={item.fabric_code}
                              onBlur={(e) => updateItem(item.id, { fabric_code: e.target.value })}
                            />
                          ) : (
                            <span className="font-medium text-sm">{item.fabric_code}</span>
                          )}
                        </TableCell>
                        <TableCell>
                          {canPlm ? (
                            <Input
                              className="h-8"
                              defaultValue={item.fabric_name || ""}
                              onBlur={(e) => updateItem(item.id, { fabric_name: e.target.value })}
                            />
                          ) : (
                            <span className="text-sm">{item.fabric_name || "—"}</span>
                          )}
                        </TableCell>
                        <TableCell className="text-sm">{item.color || "—"}</TableCell>
                        <TableCell>
                          <Input
                            type="number"
                            className="h-8"
                            disabled={!canGramaj}
                            defaultValue={item.gramaj ?? ""}
                            onBlur={(e) =>
                              updateItem(item.id, { gramaj: e.target.value ? Number(e.target.value) : null })
                            }
                          />
                        </TableCell>
                        <TableCell>
                          <Input
                            type="number"
                            className="h-8"
                            disabled={!canGramaj}
                            defaultValue={item.order_quantity}
                            onBlur={(e) => updateItem(item.id, { order_quantity: Number(e.target.value || 0) })}
                          />
                        </TableCell>
                        <TableCell className="text-sm font-medium">
                          {Number(item.quantity || 0).toLocaleString("tr-TR")}
                        </TableCell>
                        <TableCell>
                          <Input
                            className="h-8"
                            disabled={!canFabric}
                            defaultValue={item.supplier || ""}
                            onBlur={(e) => updateItem(item.id, { supplier: e.target.value || null })}
                          />
                        </TableCell>
                        <TableCell>
                          <Input
                            type="date"
                            className="h-8"
                            disabled={!canFabric}
                            defaultValue={item.termin_date || ""}
                            onBlur={(e) => updateItem(item.id, { termin_date: e.target.value || null })}
                          />
                        </TableCell>
                        <TableCell>
                          <Input
                            type="number"
                            step="0.01"
                            className="h-8"
                            disabled={!canFabric}
                            defaultValue={item.unit_price ?? ""}
                            onBlur={(e) =>
                              updateItem(item.id, { unit_price: e.target.value ? Number(e.target.value) : null })
                            }
                          />
                        </TableCell>
                        <TableCell className="text-sm font-semibold">{formatTL(item.line_total)}</TableCell>
                        {canPlm && (
                          <TableCell>
                            <Button variant="ghost" size="icon" onClick={() => removeItem(item.id)}>
                              <Trash2 className="h-4 w-4 text-destructive" />
                            </Button>
                          </TableCell>
                        )}
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}

            <div className="flex flex-wrap items-center justify-between gap-3 mt-4 pt-4 border-t">
              <p className="text-sm text-muted-foreground">
                Onay limiti: <span className="font-medium text-foreground">{formatTL(limit)}</span>
              </p>
              <p className="text-lg font-bold">SAS Toplamı: {formatTL(total)}</p>
            </div>
          </CardContent>
        </Card>

        <Card className="modern-card">
          <CardHeader>
            <CardTitle>Akış</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <Textarea
              placeholder="Not (isteğe bağlı)"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              className="min-h-[70px]"
            />
            <div className="flex flex-wrap gap-2">
              {status === "draft" && canPlm && (
                <Button onClick={() => setStatus("gramaj_pending")} disabled={items.length === 0 || busy}>
                  Kesim Takibe Gönder
                </Button>
              )}
              {status === "gramaj_pending" && canGramaj && (
                <Button onClick={() => setStatus("fabric_pending")} disabled={!gramajComplete || busy}>
                  Gramajları Tamamla
                </Button>
              )}
              {status === "fabric_pending" && canFabric && (
                <Button onClick={() => setStatus("sorumlu_approval")} disabled={!fabricComplete || busy}>
                  <Send className="h-4 w-4 mr-1" /> Onaya Gönder
                </Button>
              )}
              {status === "sorumlu_approval" && canSorumluApprove && (
                <>
                  <Button
                    onClick={() =>
                      recordApproval("approved", "tedarik_sorumlusu", total > limit ? "mudur_approval" : "approved")
                    }
                    disabled={busy}
                  >
                    <Check className="h-4 w-4 mr-1" />
                    {total > limit ? "Onayla ve Müdüre Gönder" : "Onayla"}
                  </Button>
                  <Button
                    variant="destructive"
                    onClick={() => recordApproval("rejected", "tedarik_sorumlusu", "fabric_pending")}
                    disabled={busy}
                  >
                    <X className="h-4 w-4 mr-1" /> Reddet
                  </Button>
                </>
              )}
              {status === "mudur_approval" && canMudurApprove && (
                <>
                  <Button onClick={() => recordApproval("approved", "tedarik_muduru", "approved")} disabled={busy}>
                    <Check className="h-4 w-4 mr-1" /> Onayla
                  </Button>
                  <Button
                    variant="destructive"
                    onClick={() => recordApproval("rejected", "tedarik_muduru", "fabric_pending")}
                    disabled={busy}
                  >
                    <X className="h-4 w-4 mr-1" /> Reddet
                  </Button>
                </>
              )}
              {status === "approved" && (
                <p className="text-sm text-green-600 font-medium">Bu SAS onaylandı.</p>
              )}
            </div>

            {approvals.length > 0 && (
              <div className="space-y-2 pt-2 border-t">
                {approvals.map((a) => (
                  <div key={a.id} className="flex items-center justify-between text-sm">
                    <span>
                      <span className="font-medium">{a.approver_name}</span>{" "}
                      <span className={a.action === "approved" ? "text-green-600" : "text-destructive"}>
                        {a.action === "approved" ? "onayladı" : "reddetti"}
                      </span>
                      {a.note ? ` — ${a.note}` : ""}
                    </span>
                    <span className="text-xs text-muted-foreground">
                      {format(new Date(a.created_at), "dd MMM HH:mm", { locale: tr })}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </main>
    </div>
  );
};

export default SasDetail;
