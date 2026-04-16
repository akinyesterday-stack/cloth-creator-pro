import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Plus, Package, FileText, LogOut, Loader2, Bell, Edit } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { NotificationsPage } from "@/components/NotificationsPage";

interface BuyerOrder {
  id: string;
  po_number: string;
  model_name: string;
  total_quantity: number;
  total_with_kdv: number;
  status: string;
  created_at: string;
}

export default function BuyerDashboard() {
  const navigate = useNavigate();
  const { profile, signOut } = useAuth();
  const [orders, setOrders] = useState<BuyerOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [unseenCount, setUnseenCount] = useState(0);

  useEffect(() => {
    fetchOrders();
    fetchUnseenCount();
  }, []);

  const fetchOrders = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("buyer_orders")
      .select("*")
      .order("created_at", { ascending: false });

    if (!error && data) {
      setOrders(data);
    }
    setLoading(false);
  };

  const fetchUnseenCount = async () => {
    const { data: userData } = await supabase.auth.getUser();
    if (!userData.user) return;
    const { count } = await supabase
      .from("order_notifications")
      .select("*", { count: "exact", head: true })
      .eq("recipient_id", userData.user.id)
      .eq("is_seen", false);
    setUnseenCount(count || 0);
  };

  const getStatusBadge = (status: string) => {
    const statusMap: Record<string, { label: string; variant: "default" | "secondary" | "destructive" | "outline" }> = {
      pending: { label: "Beklemede", variant: "secondary" },
      draft: { label: "Taslak", variant: "outline" },
      sent: { label: "Gönderildi", variant: "default" },
      approved: { label: "Onaylandı", variant: "default" },
      in_progress: { label: "Üretimde", variant: "outline" },
      completed: { label: "Tamamlandı", variant: "default" },
    };
    const info = statusMap[status] || statusMap.pending;
    return <Badge variant={info.variant}>{info.label}</Badge>;
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="fixed inset-0 gradient-mesh pointer-events-none" />
      
      <header className="border-b border-border/50 bg-card/80 backdrop-blur-sm sticky top-0 z-50">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gradient">TAHA GİYİM</h1>
            <p className="text-sm text-muted-foreground">Buyer Panel - {profile?.full_name}</p>
          </div>
          <Button variant="ghost" onClick={signOut}>
            <LogOut className="h-4 w-4 mr-2" />
            Çıkış
          </Button>
        </div>
      </header>
      
      <main className="container mx-auto px-4 py-8 relative z-10">
        <div className="mb-8">
          <Button 
            size="lg" 
            className="gradient-primary hover:opacity-90"
            onClick={() => navigate("/buyer/new-order")}
          >
            <Plus className="h-5 w-5 mr-2" />
            Yeni Sipariş Oluştur
          </Button>
        </div>

        <Tabs defaultValue="orders">
          <TabsList>
            <TabsTrigger value="orders" className="flex items-center gap-2">
              <Package className="h-4 w-4" />
              Siparişlerim
            </TabsTrigger>
            <TabsTrigger value="notifications" className="flex items-center gap-2">
              <Bell className="h-4 w-4" />
              Bildirimler
              {unseenCount > 0 && (
                <Badge className="bg-destructive text-destructive-foreground ml-1 h-5 px-1.5 text-xs">
                  {unseenCount}
                </Badge>
              )}
            </TabsTrigger>
          </TabsList>

          <TabsContent value="orders" className="mt-6">
            {/* Stats */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
              <Card className="modern-card">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground">Toplam Sipariş</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold">{orders.length}</div>
                </CardContent>
              </Card>
              <Card className="modern-card">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground">Bekleyen</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold text-yellow-500">
                    {orders.filter(o => o.status === "pending" || o.status === "draft").length}
                  </div>
                </CardContent>
              </Card>
              <Card className="modern-card">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground">Toplam Ciro</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold text-green-500">
                    {orders.reduce((sum, o) => sum + Number(o.total_with_kdv || 0), 0).toLocaleString("tr-TR")} ₺
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Orders List */}
            <Card className="modern-card">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Package className="h-5 w-5" />
                  Siparişlerim
                </CardTitle>
              </CardHeader>
              <CardContent>
                {loading ? (
                  <div className="flex justify-center py-8">
                    <Loader2 className="h-8 w-8 animate-spin text-primary" />
                  </div>
                ) : orders.length === 0 ? (
                  <div className="text-center py-12 text-muted-foreground">
                    <FileText className="h-12 w-12 mx-auto mb-4 opacity-50" />
                    <p>Henüz sipariş oluşturmadınız</p>
                    <Button variant="outline" className="mt-4" onClick={() => navigate("/buyer/new-order")}>
                      <Plus className="h-4 w-4 mr-2" />
                      İlk Siparişinizi Oluşturun
                    </Button>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {orders.map((order) => (
                      <div
                        key={order.id}
                        className="flex items-center justify-between p-4 rounded-lg border border-border/50 bg-background/50 hover:bg-accent/30 transition-colors"
                      >
                        <div className="flex items-center gap-4">
                          <div className="p-2 bg-primary/10 rounded-lg">
                            <Package className="h-5 w-5 text-primary" />
                          </div>
                          <div>
                            <p className="font-medium">{order.model_name}</p>
                            <p className="text-sm text-muted-foreground">
                              PO: {order.po_number} | {order.total_quantity.toLocaleString()} adet
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-3">
                          <div className="text-right">
                            <p className="font-medium">{Number(order.total_with_kdv).toLocaleString("tr-TR")} ₺</p>
                            <p className="text-xs text-muted-foreground">
                              {new Date(order.created_at).toLocaleDateString("tr-TR")}
                            </p>
                          </div>
                          {getStatusBadge(order.status)}
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => navigate(`/buyer/order/${order.id}`)}
                          >
                            <Edit className="h-4 w-4 mr-1" />
                            Düzenle
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="notifications" className="mt-6">
            <NotificationsPage />
          </TabsContent>
        </Tabs>
      </main>
      
      <footer className="border-t border-border/50 py-6 mt-12 bg-card/50 backdrop-blur-sm relative z-10">
        <div className="container mx-auto px-4 text-center">
          <p className="text-sm text-muted-foreground">
            TAHA GİYİM - 2025 - Buyer Panel
          </p>
        </div>
      </footer>
    </div>
  );
}
