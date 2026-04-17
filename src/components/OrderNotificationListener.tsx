import { useEffect, useRef, useState } from "react";
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

// Session-storage key so we only show the login-fireworks once per session
const LOGIN_FIREWORKS_KEY = "lcw_login_fireworks_shown";

export function OrderNotificationListener() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [showFireworks, setShowFireworks] = useState(false);
  const checkedOnLogin = useRef(false);

  // Realtime: trigger on every new incoming order
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

  // On login / dashboard load: if there are any unseen order notifications, fire celebration
  useEffect(() => {
    if (!user || checkedOnLogin.current) return;
    checkedOnLogin.current = true;

    const alreadyShown = sessionStorage.getItem(LOGIN_FIREWORKS_KEY);
    if (alreadyShown) return;

    const checkUnseen = async () => {
      const { data, error } = await supabase
        .from("order_notifications")
        .select("id")
        .eq("recipient_id", user.id)
        .eq("is_seen", false)
        .limit(1);

      if (!error && data && data.length > 0) {
        sessionStorage.setItem(LOGIN_FIREWORKS_KEY, "1");
        // Slight delay so the dashboard renders first
        setTimeout(() => setShowFireworks(true), 600);
      }
    };

    checkUnseen();
  }, [user]);

  if (!showFireworks) return null;

  return <Fireworks onComplete={() => setShowFireworks(false)} />;
}
