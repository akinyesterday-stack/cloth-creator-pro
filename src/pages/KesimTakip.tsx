import { useCallback, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Header } from "@/components/Header";
import { TeamPipeline } from "@/components/TeamPipeline";
import { NotificationsPage } from "@/components/NotificationsPage";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { ArrowLeft, Bell, CheckCircle2, Loader2, Scissors, Send, Undo2, Workflow } from "lucide-react";
import {
  SAS_STATUS, SasItem, daysSince, formatTL, getAccessibleLeaderIds,
} from "@/lib/sas";

interface FileRow {
  sas_id: string;
  work_order_id: string;
  status: string;
  revision: number;
  cost_opened_at: string | null;
  updated_at: string;
  total_amount: number;
  po_number: string;
  model_name: string;
  total_quantity: number;
  item_count: number;
}

const KesimTakip = () => {
  const { user, userType } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [files, setFiles] = useState<FileRow[]>([]);
  const [selected, setSelected] = useState<FileRow | null>(null);
  const [items, setItems] = useState<SasItem[]>([]);
  const [note, setNote] = useState("");

  const canEdit = userType === "kesim_takip" || userType === "admin";

  const loadFiles = useCallback(async () => {
    setLoading(true);
    try {
      const leaderIds = await getAccessibleLeaderIds(user!.id, userType);
      if (leaderIds.length === 0) {
        setFiles([]);
        return;
      }
      const { data: sasForms } = await supabase
        .from("sas_forms")
        .select("id, work_order_id, status, revision, cost_opened_at, updated_at, total_amount")
        .in("team_leader_id", leaderIds)
        .eq("status", "gramaj_pending")
        .order("updated_at", { ascending: true });

      if (!sasForms || sasForms.length === 0) {
        setFiles([]);
        return;
      }

      const { data: workOrders } = await supabase
        .from("work_orders")
        .select("id, order_id")
        .in("id", sasForms.map((s) => s.work_order_id));

      const orderIds = (workOrders || []).map((w) => w.order_id);
      const [{ data: orders }, { data: itemRows }] = await Promise.all([
        orderIds.length
          ? supabase.from("buyer_orders").select("id, po_number, model_name, total_quantity").in("id", orderIds)
          : Promise.resolve({ data: [] as { id: string; po_number: string; model_name: string; total_quantity: number }[] }),
        supabase.from("sas_items").select("id, sas_id").in("sas_id", sasForms.map((s) => s.id)),
      ]);

      setFiles(
        sasForms.map((s) => {
          const wo = workOrders?.find((w) => w.id === s.work_order_id);
          const order = orders?.find((o) => o.id === wo?.order_id);
          return {
            sas_id: s.id,
            work_order_id: s.work_order_id,
            status: s.status,
            revision: Number(s.revision ?? 1),
            cost_opened_at: s.cost_opened_at,
            updated_at: s.updated_at,
            total_amount: Number(s.total_amount || 0),
            po_number: order?.po_number || "—",
            model_name: order?.model_name || "—",
            total_quantity: order?.total_quantity || 0,
            item_count: (itemRows || []).filter((i) => i.sas_id === s.id).length,
          };
        }),
      );
    } finally {
      setLoading(false);
    }
  }, [user, userType]);

  useEffect(() => {
    if (user) loadFiles();
  }, [user, loadFiles]);

  const openFile = async (row: FileRow) => {
    setSelected(row);
    const { data } = await supabase.from("sas_items").select("*").eq("sas_id", row.sas_id).order("created_at");
    setItems((data || []) as SasItem[]);
  };

  const saveGramaj = async (id: string, gramaj: number | null) => {
    setItems((prev) => prev.map((i) => (i.id === id ? { ...i, gramaj } : i)));
    const { error } = await supabase.from("sas_items").update({ gramaj }).eq("id", id);
    if (error) {
      toast({ title: "Kaydedilemedi", description: error.message, variant: "destructive" });
      return;
    }
    const { data } = await supabase.from("sas_items").select("*").eq("id", id).maybeSingle();
    if (data) setItems((prev) => prev.map((i) => (i.id === id ? (data as SasItem) : i)));
  };

  const complete = async () => {
    if (!selected) return;
    setBusy(true);
    const { error } = await supabase
      .from("sas_forms")
      .update({ status: "sorumlu_approval" })
      .eq("id", selected.sas_id);
    if (!error && note.trim()) {
      await supabase.from("sas_approvals").insert({
        sas_id: selected.sas_id,
        approver_id: user!.id,
        approver_role: "kesim_takip",
        action: "approved",
        note: note.trim(),
      });
    }
    setBusy(false);
    if (error) {
      toast({ title: "Gönderilemedi", description: error.message, variant: "destructive" });
      return;
    }
    toast({ title: "Tedarik sorumlusuna gönderildi", description: `${selected.po_number} pastal hesabı tamamlandı.` });
    setNote("");
    setSelected(null);
    await loadFiles();
  };

  const sendBack = async () => {
    if (!selected) return;
    setBusy(true);
    const { error } = await supabase
      .from("sas_forms")
      .update({ status: "fabric_pending", revision: selected.revision + 1 })
      .eq("id", selected.sas_id);
    if (!error) {
      await supabase.from("sas_approvals").insert({
        sas_id: selected.sas_id,
        approver_id: user!.id,
        approver_role: "kesim_takip",
        action: "rejected",
        note: note.trim() || "Kumaş bilgileri revize edilsin",
      });
    }
    setBusy(false);
    if (error) {
      toast({ title: "Geri gönderilemedi", description: error.message, variant: "destructive" });
      return;
    }
    toast({ title: "Kumaş sorumlusuna geri gönderildi" });
    setNote("");
    setSelected(null);
    await loadFiles();
  };

  const allFilled = items.length > 0 && items.every((i) => Number(i.gramaj || 0) > 0);

  return (
    <div className="min-h-screen bg-background">
      <div className="fixed inset-0 gradient-mesh pointer-events-none" />
      <Header onRadioToggle={() => {}} isRadioOpen={false} />

      <main className="container mx-auto px-4 py-8 relative z-10">
        <h1 className="text-2xl font-bold mb-6 flex items-center gap-2">
          <Scissors className="h-6 w-6" /> Kesim Takip Paneli
        </h1>

        <Tabs defaultValue="files">
          <TabsList className="mb-6 bg-card/80 backdrop-blur-sm border">
            <TabsTrigger value="files" className="gap-2">
              <Scissors className="h-4 w-4" /> Pastal Bekleyen Dosyalar
            </TabsTrigger>
            <TabsTrigger value="pipeline" className="gap-2">
              <Workflow className="h-4 w-4" /> Kimde Ne Bekliyor
            </TabsTrigger>
            <TabsTrigger value="notifications" className="gap-2">
              <Bell className="h-4 w-4" /> Bildirimler
            </TabsTrigger>
          </TabsList>

          <TabsContent value="files">
            {loading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="h-6 w-6 animate-spin text-primary" />
              </div>
            ) : selected ? (
              <Card className="modern-card">
                <CardHeader className="flex flex-row items-start justify-between gap-3">
                  <div>
                    <Button variant="ghost" size="sm" className="mb-2 -ml-2" onClick={() => setSelected(null)}>
                      <ArrowLeft className="h-4 w-4 mr-1" /> Listeye dön
                    </Button>
                    <CardTitle>
                      {selected.po_number} • {selected.model_name}
                    </CardTitle>
                    <p className="text-sm text-muted-foreground mt-1">
                      {selected.total_quantity} adet • {selected.revision}. tur
                      {selected.cost_opened_at ? " • Maliyet açıldı" : " • Maliyet bekliyor"}
                    </p>
                  </div>
                  <Button variant="outline" size="sm" onClick={() => navigate(`/sas/${selected.work_order_id}`)}>
                    SAS Detayı
                  </Button>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Kumaş</TableHead>
                          <TableHead>Cins</TableHead>
                          <TableHead className="w-24">En (cm)</TableHead>
                          <TableHead className="w-28">m² Gramaj</TableHead>
                          <TableHead className="w-28">Boyahane</TableHead>
                          <TableHead className="w-24">Adet</TableHead>
                          <TableHead className="w-32">Pastal Gramajı (gr)</TableHead>
                          <TableHead className="w-28">Miktar (kg)</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {items.map((item) => (
                          <TableRow key={item.id}>
                            <TableCell>
                              <p className="font-medium text-sm">{item.fabric_code}</p>
                              <p className="text-xs text-muted-foreground">{item.fabric_name || "—"}</p>
                            </TableCell>
                            <TableCell className="text-sm">{item.composition || "—"}</TableCell>
                            <TableCell className="text-sm">{item.width_cm ?? "—"}</TableCell>
                            <TableCell className="text-sm">{item.gsm_m2 ?? "—"}</TableCell>
                            <TableCell className="text-sm">{item.dyehouse || "—"}</TableCell>
                            <TableCell className="text-sm">{item.order_quantity}</TableCell>
                            <TableCell>
                              <Input
                                type="number"
                                className="h-8"
                                disabled={!canEdit}
                                defaultValue={item.gramaj ?? ""}
                                onBlur={(e) => saveGramaj(item.id, e.target.value ? Number(e.target.value) : null)}
                              />
                            </TableCell>
                            <TableCell className="text-sm font-semibold">
                              {Number(item.quantity || 0).toLocaleString("tr-TR")}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>

                  {canEdit && (
                    <>
                      <Textarea
                        placeholder="Not (isteğe bağlı)"
                        value={note}
                        onChange={(e) => setNote(e.target.value)}
                        className="min-h-[70px]"
                      />
                      <div className="flex flex-wrap gap-2">
                        <Button onClick={complete} disabled={!allFilled || busy}>
                          <Send className="h-4 w-4 mr-1" /> Tedarik Sorumlusuna Gönder
                        </Button>
                        <Button variant="outline" onClick={sendBack} disabled={busy}>
                          <Undo2 className="h-4 w-4 mr-1" /> Kumaşçıya Geri Gönder (yeni tur)
                        </Button>
                      </div>
                      {!allFilled && (
                        <p className="text-xs text-muted-foreground">
                          Tüm kalemlerde pastal gramajı girilmeden gönderilemez.
                        </p>
                      )}
                    </>
                  )}
                </CardContent>
              </Card>
            ) : (
              <Card className="modern-card">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Scissors className="h-5 w-5" /> Pastal Bekleyen Dosyalar ({files.length})
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {files.length === 0 ? (
                    <p className="text-sm text-muted-foreground text-center py-8">
                      Şu an kesim takibe düşen dosya yok.
                    </p>
                  ) : (
                    <div className="space-y-3">
                      {files.map((f) => (
                        <div
                          key={f.sas_id}
                          className="flex flex-wrap items-center justify-between gap-3 p-4 rounded-lg bg-secondary/20 border border-border/50"
                        >
                          <div>
                            <p className="font-semibold text-sm">
                              {f.po_number} • {f.model_name}
                            </p>
                            <p className="text-xs text-muted-foreground mt-1">
                              {f.total_quantity} adet • {f.item_count} kumaş kalemi • {daysSince(f.updated_at)} gündür
                              bekliyor • {f.revision}. tur
                            </p>
                          </div>
                          <div className="flex items-center gap-2">
                            {f.cost_opened_at && (
                              <Badge variant="outline" className="bg-green-500/20 text-green-600 border-green-500/30">
                                <CheckCircle2 className="h-3.5 w-3.5 mr-1" /> Maliyet açıldı
                              </Badge>
                            )}
                            <Badge variant="outline" className={SAS_STATUS[f.status]?.className}>
                              {SAS_STATUS[f.status]?.label}
                            </Badge>
                            <span className="text-xs text-muted-foreground">{formatTL(f.total_amount)}</span>
                            <Button size="sm" onClick={() => openFile(f)}>
                              Pastal Gir
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            )}
          </TabsContent>

          <TabsContent value="pipeline">
            <TeamPipeline />
          </TabsContent>

          <TabsContent value="notifications">
            <NotificationsPage />
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
};

export default KesimTakip;
