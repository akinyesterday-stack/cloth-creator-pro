import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Fireworks } from "./Fireworks";
import { useToast } from "@/hooks/use-toast";

interface OrderNotification {
  id: string;
  sender_name: string;
  po_number: string;
  model_name: string;
}

export function OrderNotificationListener() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [activeNotification, setActiveNotification] = useState<OrderNotification | null>(null);

  useEffect(() => {
    if (!user) return;

    // Listen for new order_notifications in realtime
    const channel = supabase
      .channel('order-notifications')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'order_notifications',
          filter: `recipient_id=eq.${user.id}`,
        },
        (payload) => {
          const notif = payload.new as OrderNotification;
          setActiveNotification(notif);
          toast({
            title: "🎉 Yeni Sipariş Geldi!",
            description: `${notif.sender_name} yeni sipariş gönderdi - PO: ${notif.po_number} - ${notif.model_name}`,
          });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user, toast]);

  if (!activeNotification) return null;

  return (
    <Fireworks onComplete={() => setActiveNotification(null)} />
  );
}
