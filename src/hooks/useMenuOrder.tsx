import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./useAuth";

export interface MenuItem {
  id: string;
  label: string;
  icon: string;
  path: string;
}

const defaultMenuItems: MenuItem[] = [
  { id: "orders", label: "Siparişler", icon: "ShoppingCart", path: "/orders" },
  { id: "saved-costs", label: "Kayıtlı Maliyetler", icon: "Archive", path: "/saved-costs" },
  { id: "fabric-prices", label: "Kalite Fiyatları", icon: "DollarSign", path: "/fabric-prices" },
];

export function useMenuOrder() {
  const { user } = useAuth();
  const [menuOrder, setMenuOrder] = useState<string[]>(defaultMenuItems.map(m => m.id));
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (user) {
      loadMenuOrder();
    } else {
      setIsLoading(false);
    }
  }, [user]);

  const loadMenuOrder = async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from("user_settings")
        .select("menu_order")
        .eq("user_id", user.id)
        .maybeSingle();

      if (error && error.code !== "PGRST116") {
        console.error("Error loading menu order:", error);
      }

      if (data?.menu_order && Array.isArray(data.menu_order)) {
        setMenuOrder(data.menu_order as string[]);
      }
    } catch (error) {
      console.error("Error loading menu order:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const updateMenuOrder = async (newOrder: string[]) => {
    if (!user) return;

    setMenuOrder(newOrder);

    try {
      const { data: existing } = await supabase
        .from("user_settings")
        .select("id")
        .eq("user_id", user.id)
        .maybeSingle();

      if (existing) {
        await supabase
          .from("user_settings")
          .update({ menu_order: newOrder })
          .eq("user_id", user.id);
      } else {
        await supabase
          .from("user_settings")
          .insert({ 
            user_id: user.id, 
            menu_order: newOrder 
          });
      }
    } catch (error) {
      console.error("Error updating menu order:", error);
    }
  };

  const moveItemUp = (itemId: string) => {
    const index = menuOrder.indexOf(itemId);
    if (index > 0) {
      const newOrder = [...menuOrder];
      [newOrder[index - 1], newOrder[index]] = [newOrder[index], newOrder[index - 1]];
      updateMenuOrder(newOrder);
    }
  };

  const moveItemDown = (itemId: string) => {
    const index = menuOrder.indexOf(itemId);
    if (index < menuOrder.length - 1) {
      const newOrder = [...menuOrder];
      [newOrder[index], newOrder[index + 1]] = [newOrder[index + 1], newOrder[index]];
      updateMenuOrder(newOrder);
    }
  };

  const moveToTop = (itemId: string) => {
    const newOrder = [itemId, ...menuOrder.filter(id => id !== itemId)];
    updateMenuOrder(newOrder);
  };

  const moveToBottom = (itemId: string) => {
    const newOrder = [...menuOrder.filter(id => id !== itemId), itemId];
    updateMenuOrder(newOrder);
  };

  const getOrderedMenuItems = (): MenuItem[] => {
    return menuOrder
      .map(id => defaultMenuItems.find(item => item.id === id))
      .filter((item): item is MenuItem => item !== undefined);
  };

  return {
    menuOrder,
    isLoading,
    getOrderedMenuItems,
    moveItemUp,
    moveItemDown,
    moveToTop,
    moveToBottom,
    defaultMenuItems,
  };
}
