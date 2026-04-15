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
  const [showFireworks, setShowFireworks] = useState(false);

  useEffect(() => {
    if (!user) return;

    const channel = supabase
      .channel('order-notifications-global')
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
          setShowFireworks(true);
          toast({
            title: "🎉🎆 Yeni Sipariş Geldi!",
            description: `${notif.sender_name || "Buyer"} yeni sipariş gönderdi!\nPO: ${notif.po_number} - ${notif.model_name}`,
            duration: 8000,
          });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user, toast]);

  if (!showFireworks) return null;

  return <Fireworks onComplete={() => setShowFireworks(false)} />;
}
