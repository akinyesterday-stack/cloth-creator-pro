import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Bell, Download, Loader2, Check } from "lucide-react";
import { format } from "date-fns";
import { tr } from "date-fns/locale";
import { generateOrderPdf } from "@/lib/orderPdf";

interface OrderNotification {
  id: string;
  sender_name: string | null;
  po_number: string | null;
  model_name: string | null;
  order_id: string | null;
  created_at: string;
  is_seen: boolean;
}

export function NotificationsPage() {
  const { user } = useAuth();
  const [notifications, setNotifications] = useState<OrderNotification[]>([]);
  const [loading, setLoading] = useState(true);
  const [downloadingId, setDownloadingId] = useState<string | null>(null);

  useEffect(() => {
    if (user) {
      fetchNotifications();
      const channel = supabase
        .channel("user-notifications-page")
        .on("postgres_changes", {
          event: "INSERT",
          schema: "public",
          table: "order_notifications",
          filter: `recipient_id=eq.${user.id}`,
        }, () => fetchNotifications())
        .subscribe();

      return () => { supabase.removeChannel(channel); };
    }
  }, [user]);

  const fetchNotifications = async () => {
    setLoading(true);
    const { data } = await supabase
      .from("order_notifications")
      .select("*")
      .eq("recipient_id", user!.id)
      .order("created_at", { ascending: false })
      .limit(100);
    setNotifications(data || []);
    setLoading(false);
  };

  const markAsSeen = async (id: string) => {
    await supabase.from("order_notifications").update({ is_seen: true }).eq("id", id);
    setNotifications(prev => prev.map(n => n.id === id ? { ...n, is_seen: true } : n));
  };

  const markAllSeen = async () => {
    const unseenIds = notifications.filter(n => !n.is_seen).map(n => n.id);
    if (unseenIds.length === 0) return;
    for (const id of unseenIds) {
      await supabase.from("order_notifications").update({ is_seen: true }).eq("id", id);
    }
    setNotifications(prev => prev.map(n => ({ ...n, is_seen: true })));
  };

  const handleDownloadPdf = async (notif: OrderNotification) => {
    if (!notif.order_id) return;
    setDownloadingId(notif.id);
    try {
      await generateOrderPdf(notif.order_id);
      if (!notif.is_seen) markAsSeen(notif.id);
    } catch (err) {
      console.error("PDF error:", err);
    }
    setDownloadingId(null);
  };

  const unseenCount = notifications.filter(n => !n.is_seen).length;

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <Card className="modern-card">
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="flex items-center gap-2">
          <Bell className="h-5 w-5" />
          Bildirimler
          {unseenCount > 0 && (
            <Badge className="bg-destructive text-destructive-foreground ml-2">
              {unseenCount} yeni
            </Badge>
          )}
        </CardTitle>
        {unseenCount > 0 && (
          <Button variant="outline" size="sm" onClick={markAllSeen}>
            <Check className="h-4 w-4 mr-1" /> Tümünü Okundu Yap
          </Button>
        )}
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
                className={`flex items-center justify-between p-4 rounded-lg border transition-colors ${
                  n.is_seen
                    ? "bg-secondary/20 border-border/50"
                    : "bg-primary/10 border-primary/30 shadow-sm"
                }`}
              >
                <div className="flex items-center gap-3 flex-1 min-w-0">
                  {!n.is_seen && <div className="w-2.5 h-2.5 rounded-full bg-primary animate-pulse shrink-0" />}
                  <div className="min-w-0">
                    <p className="font-semibold text-sm">
                      🎉 {n.sender_name || "Buyer"} yeni sipariş gönderdi!
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">
                      PO: {n.po_number} • Model: {n.model_name}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <span className="text-xs text-muted-foreground whitespace-nowrap">
                    {format(new Date(n.created_at), "dd MMM HH:mm", { locale: tr })}
                  </span>
                  {n.order_id && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleDownloadPdf(n)}
                      disabled={downloadingId === n.id}
                    >
                      {downloadingId === n.id ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <>
                          <Download className="h-4 w-4 mr-1" />
                          PDF
                        </>
                      )}
                    </Button>
                  )}
                  {!n.is_seen && (
                    <Button variant="ghost" size="sm" onClick={() => markAsSeen(n.id)}>
                      Okundu
                    </Button>
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
