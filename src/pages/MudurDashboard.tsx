import { useEffect, useState } from "react";
import { Header } from "@/components/Header";
import { TeamReport } from "@/components/TeamReport";
import { WorkOrderList } from "@/components/WorkOrderList";
import { NotificationsPage } from "@/components/NotificationsPage";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { BarChart3, Bell, ClipboardList, Loader2, Plus, Settings2, Trash2, Users } from "lucide-react";
import { formatTL } from "@/lib/sas";

interface Assignment {
  id: string;
  sorumlu_id: string;
  full_name?: string;
}

const MudurDashboard = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState("team");
  const [loading, setLoading] = useState(true);
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [available, setAvailable] = useState<{ user_id: string; full_name: string }[]>([]);
  const [selected, setSelected] = useState("");
  const [limitAmount, setLimitAmount] = useState("100000");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (user) load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  const load = async () => {
    setLoading(true);
    try {
      const [{ data: rows }, { data: profiles }, { data: settings }] = await Promise.all([
        supabase.from("manager_assignments").select("id, sorumlu_id").eq("manager_id", user!.id),
        supabase
          .from("profiles")
          .select("user_id, full_name")
          .eq("user_type", "tedarik_sorumlusu")
          .eq("status", "approved"),
        supabase.from("approval_settings").select("limit_amount").eq("manager_id", user!.id).maybeSingle(),
      ]);

      const assigned = (rows || []).map((r) => ({
        ...r,
        full_name: profiles?.find((p) => p.user_id === r.sorumlu_id)?.full_name || "Bilinmiyor",
      }));
      setAssignments(assigned);
      setAvailable((profiles || []).filter((p) => !assigned.some((a) => a.sorumlu_id === p.user_id)));
      if (settings) setLimitAmount(String(settings.limit_amount));
    } finally {
      setLoading(false);
    }
  };

  const addAssignment = async () => {
    if (!selected) return;
    const { error } = await supabase
      .from("manager_assignments")
      .insert({ manager_id: user!.id, sorumlu_id: selected });
    if (error) {
      toast({ title: "Eklenemedi", description: error.message, variant: "destructive" });
      return;
    }
    setSelected("");
    await load();
  };

  const removeAssignment = async (id: string) => {
    await supabase.from("manager_assignments").delete().eq("id", id);
    await load();
  };

  const saveLimit = async () => {
    setSaving(true);
    const { error } = await supabase
      .from("approval_settings")
      .upsert({ manager_id: user!.id, limit_amount: Number(limitAmount || 0) }, { onConflict: "manager_id" });
    setSaving(false);
    if (error) {
      toast({ title: "Limit kaydedilemedi", description: error.message, variant: "destructive" });
      return;
    }
    toast({ title: "Onay limiti güncellendi", description: formatTL(Number(limitAmount || 0)) });
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="fixed inset-0 gradient-mesh pointer-events-none" />
      <Header onRadioToggle={() => {}} isRadioOpen={false} />

      <main className="container mx-auto px-4 py-8 relative z-10">
        <h1 className="text-2xl font-bold mb-6">Tedarik Müdürü Paneli</h1>

        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="mb-6 bg-card/80 backdrop-blur-sm border">
            <TabsTrigger value="team" className="gap-2">
              <Users className="h-4 w-4" /> Tedarik Sorumluları
            </TabsTrigger>
            <TabsTrigger value="approvals" className="gap-2">
              <ClipboardList className="h-4 w-4" /> Onaylar
            </TabsTrigger>
            <TabsTrigger value="report" className="gap-2">
              <BarChart3 className="h-4 w-4" /> Raporlar
            </TabsTrigger>
            <TabsTrigger value="notifications" className="gap-2">
              <Bell className="h-4 w-4" /> Bildirimler
            </TabsTrigger>
          </TabsList>

          <TabsContent value="team">
            <div className="grid gap-6 md:grid-cols-2">
              <Card className="modern-card">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Users className="h-5 w-5" /> Sorumlu Ata
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex gap-2">
                    <Select value={selected} onValueChange={setSelected}>
                      <SelectTrigger>
                        <SelectValue placeholder="Tedarik sorumlusu seçin" />
                      </SelectTrigger>
                      <SelectContent>
                        {available.map((p) => (
                          <SelectItem key={p.user_id} value={p.user_id}>
                            {p.full_name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <Button onClick={addAssignment} disabled={!selected}>
                      <Plus className="h-4 w-4" />
                    </Button>
                  </div>

                  {assignments.length === 0 ? (
                    <p className="text-sm text-muted-foreground text-center py-6">
                      Henüz tedarik sorumlusu atamadınız.
                    </p>
                  ) : (
                    <div className="space-y-2">
                      {assignments.map((a) => (
                        <div
                          key={a.id}
                          className="flex items-center justify-between p-3 rounded-lg bg-secondary/30 border border-border/50"
                        >
                          <span className="font-medium text-sm">{a.full_name}</span>
                          <Button variant="ghost" size="icon" onClick={() => removeAssignment(a.id)}>
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>

              <Card className="modern-card">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Settings2 className="h-5 w-5" /> Onay Limiti
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <p className="text-sm text-muted-foreground">
                    Bu tutarın altındaki SAS formları tedarik sorumlusu onayıyla tamamlanır; üstündekiler ayrıca
                    sizin onayınıza düşer.
                  </p>
                  <div className="space-y-2">
                    <Label htmlFor="limit">Limit (TL)</Label>
                    <Input
                      id="limit"
                      type="number"
                      value={limitAmount}
                      onChange={(e) => setLimitAmount(e.target.value)}
                    />
                  </div>
                  <Button onClick={saveLimit} disabled={saving}>
                    {saving ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : null} Kaydet
                  </Button>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="approvals">
            <WorkOrderList />
          </TabsContent>
          <TabsContent value="report">
            <TeamReport />
          </TabsContent>
          <TabsContent value="notifications">
            <NotificationsPage />
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
};

export default MudurDashboard;
