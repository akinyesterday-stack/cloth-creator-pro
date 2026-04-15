import { useState, useEffect } from "react";
import { Header } from "@/components/Header";
import { TeamManager } from "@/components/TeamManager";
import { IncomingOrders } from "@/components/IncomingOrders";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Users, Activity, ClipboardList, Bell, Loader2 } from "lucide-react";
import { format } from "date-fns";
import { tr } from "date-fns/locale";

interface ActivityLog {
  id: string;
  user_id: string;
  action_type: string;
  description: string;
  model_name: string | null;
  created_at: string;
  user_name?: string;
}

interface TeamMemberInfo {
  id: string;
  member_id: string;
  role: string;
  full_name: string;
  user_type: string | null;
}

interface OrderNotification {
  id: string;
  sender_name: string | null;
  po_number: string | null;
  model_name: string | null;
  created_at: string;
  is_seen: boolean;
}

const ROLE_LABELS: Record<string, string> = {
  fabric: "Kumaş",
  planlama: "Planlama",
  fason: "Fason",
};

const ACTION_COLORS: Record<string, string> = {
  fabric_received: "bg-blue-500/20 text-blue-400 border-blue-500/30",
  planning_started: "bg-amber-500/20 text-amber-400 border-amber-500/30",
  planning_completed: "bg-green-500/20 text-green-400 border-green-500/30",
  fason_started: "bg-purple-500/20 text-purple-400 border-purple-500/30",
  fason_completed: "bg-emerald-500/20 text-emerald-400 border-emerald-500/30",
  general: "bg-muted text-muted-foreground border-border",
};

const TedarikDashboard = () => {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState("team");
  const [teamMembers, setTeamMembers] = useState<TeamMemberInfo[]>([]);
  const [activities, setActivities] = useState<ActivityLog[]>([]);
  const [notifications, setNotifications] = useState<OrderNotification[]>([]);
  const [loading, setLoading] = useState(true);

  const unseenCount = notifications.filter(n => !n.is_seen).length;

  useEffect(() => {
    if (user) {
      fetchData();
      const channel = supabase
        .channel("team-activity")
        .on("postgres_changes", { event: "INSERT", schema: "public", table: "team_activity_log", filter: `team_leader_id=eq.${user.id}` }, () => fetchActivities())
        .subscribe();

      const notifChannel = supabase
        .channel("tedarik-order-notifs")
        .on("postgres_changes", { event: "INSERT", schema: "public", table: "order_notifications", filter: `recipient_id=eq.${user.id}` }, () => fetchNotifications())
        .subscribe();

      return () => {
        supabase.removeChannel(channel);
        supabase.removeChannel(notifChannel);
      };
    }
  }, [user]);

  const fetchData = async () => {
    setLoading(true);
    await Promise.all([fetchTeamMembers(), fetchActivities(), fetchNotifications()]);
    setLoading(false);
  };

  const fetchTeamMembers = async () => {
    const { data: teamData } = await supabase
      .from("team_members")
      .select("*")
      .eq("team_leader_id", user!.id);

    if (!teamData || teamData.length === 0) { setTeamMembers([]); return; }

    const memberIds = teamData.map(t => t.member_id);
    const { data: profiles } = await supabase
      .from("profiles")
      .select("user_id, full_name, user_type")
      .in("user_id", memberIds);

    const enriched = teamData.map(tm => {
      const profile = profiles?.find(p => p.user_id === tm.member_id);
      return { ...tm, full_name: profile?.full_name || "Bilinmiyor", user_type: profile?.user_type || null };
    });
    setTeamMembers(enriched);
  };

  const fetchActivities = async () => {
    const { data } = await supabase
      .from("team_activity_log")
      .select("*")
      .eq("team_leader_id", user!.id)
      .order("created_at", { ascending: false })
      .limit(50);

    if (!data) { setActivities([]); return; }

    const userIds = [...new Set(data.map(a => a.user_id))];
    const { data: profiles } = await supabase
      .from("profiles")
      .select("user_id, full_name")
      .in("user_id", userIds);

    setActivities(data.map(a => ({
      ...a,
      user_name: profiles?.find(p => p.user_id === a.user_id)?.full_name || "Bilinmiyor",
    })));
  };

  const fetchNotifications = async () => {
    const { data } = await supabase
      .from("order_notifications")
      .select("*")
      .eq("recipient_id", user!.id)
      .order("created_at", { ascending: false })
      .limit(50);

    setNotifications(data || []);
  };

  const markAsSeen = async (id: string) => {
    await supabase.from("order_notifications").update({ is_seen: true }).eq("id", id);
    setNotifications(prev => prev.map(n => n.id === id ? { ...n, is_seen: true } : n));
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
        <h1 className="text-2xl font-bold mb-6">Tedarik Sorumlusu Paneli</h1>

        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="mb-6 bg-card/80 backdrop-blur-sm border">
            <TabsTrigger value="team" className="gap-2">
              <Users className="h-4 w-4" /> Ekibim
            </TabsTrigger>
            <TabsTrigger value="notifications" className="gap-2 relative">
              <Bell className="h-4 w-4" /> Bildirimler
              {unseenCount > 0 && (
                <Badge className="ml-1 h-5 w-5 p-0 flex items-center justify-center text-[10px] bg-destructive text-destructive-foreground">
                  {unseenCount}
                </Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="orders" className="gap-2">
              <ClipboardList className="h-4 w-4" /> Gelen Siparişler
            </TabsTrigger>
            <TabsTrigger value="activity" className="gap-2">
              <Activity className="h-4 w-4" /> Aktiviteler
            </TabsTrigger>
          </TabsList>

          <TabsContent value="team">
            <div className="grid gap-6 md:grid-cols-2">
              <TeamManager />
              <Card className="modern-card">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Users className="h-5 w-5" />
                    Ekip Üyeleri ({teamMembers.length})
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {teamMembers.length === 0 ? (
                    <p className="text-sm text-muted-foreground text-center py-8">
                      Henüz ekip üyesi eklenmedi. Sol taraftan ekip üyelerinizi ekleyin.
                    </p>
                  ) : (
                    <div className="space-y-3">
                      {teamMembers.map(m => (
                        <div key={m.id} className="flex items-center justify-between p-4 rounded-lg bg-secondary/30 border border-border/50">
                          <div>
                            <p className="font-semibold">{m.full_name}</p>
                            <p className="text-xs text-muted-foreground">{ROLE_LABELS[m.role] || m.role}</p>
                          </div>
                          <Badge variant="outline" className="text-xs">{m.user_type || "—"}</Badge>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="notifications">
            <Card className="modern-card">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Bell className="h-5 w-5" />
                  Sipariş Bildirimleri
                </CardTitle>
              </CardHeader>
              <CardContent>
                {notifications.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-8">
                    Henüz bildirim bulunmuyor.
                  </p>
                ) : (
                  <div className="space-y-3">
                    {notifications.map(n => (
                      <div
                        key={n.id}
                        className={`flex items-center justify-between p-4 rounded-lg border transition-colors cursor-pointer ${
                          n.is_seen
                            ? "bg-secondary/20 border-border/50"
                            : "bg-primary/10 border-primary/30 shadow-sm"
                        }`}
                        onClick={() => !n.is_seen && markAsSeen(n.id)}
                      >
                        <div className="flex items-center gap-3">
                          {!n.is_seen && <div className="w-2.5 h-2.5 rounded-full bg-primary animate-pulse" />}
                          <div>
                            <p className="font-semibold text-sm">
                              🎉 {n.sender_name || "Buyer"} yeni sipariş gönderdi!
                            </p>
                            <p className="text-xs text-muted-foreground mt-1">
                              PO: {n.po_number} • Model: {n.model_name}
                            </p>
                          </div>
                        </div>
                        <span className="text-xs text-muted-foreground whitespace-nowrap">
                          {format(new Date(n.created_at), "dd MMM HH:mm", { locale: tr })}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="orders">
            <IncomingOrders />
          </TabsContent>

          <TabsContent value="activity">
            <Card className="modern-card">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Activity className="h-5 w-5" />
                  Ekip Aktiviteleri
                </CardTitle>
              </CardHeader>
              <CardContent>
                {activities.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-8">
                    Henüz ekip aktivitesi bulunmuyor.
                  </p>
                ) : (
                  <div className="space-y-3">
                    {activities.map(a => (
                      <div key={a.id} className="flex items-start gap-4 p-4 rounded-lg bg-secondary/20 border border-border/50">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="font-semibold text-sm">{a.user_name}</span>
                            <Badge variant="outline" className={`text-xs ${ACTION_COLORS[a.action_type] || ACTION_COLORS.general}`}>
                              {a.action_type}
                            </Badge>
                          </div>
                          <p className="text-sm text-foreground">{a.description}</p>
                          {a.model_name && <p className="text-xs text-muted-foreground mt-1">Model: {a.model_name}</p>}
                        </div>
                        <span className="text-xs text-muted-foreground whitespace-nowrap">
                          {format(new Date(a.created_at), "dd MMM HH:mm", { locale: tr })}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
};

export default TedarikDashboard;
