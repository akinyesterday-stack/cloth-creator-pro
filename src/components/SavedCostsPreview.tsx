import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Archive, Loader2, ExternalLink } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useNavigate } from "react-router-dom";
import { format } from "date-fns";
import { tr } from "date-fns/locale";

interface FabricItem {
  id?: string;
  fabricType: string;
  usageArea: string;
  fiyat: number;
}

interface SavedCost {
  id: string;
  model_name: string;
  items: FabricItem[];
  images: string[];
  total_cost: number;
  created_at: string;
}

export const SavedCostsPreview = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [costs, setCosts] = useState<SavedCost[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    let active = true;

    const load = async () => {
      const { data, error } = await supabase
        .from("saved_costs")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });

      if (!active) return;
      if (error) {
        console.error("Error loading saved costs:", error);
        setIsLoading(false);
        return;
      }

      setCosts(
        (data || []).map((item) => ({
          ...item,
          items: Array.isArray(item.items)
            ? (item.items as unknown as FabricItem[])
            : (JSON.parse((item.items as unknown as string) || "[]") as FabricItem[]),
          images: item.images || [],
          total_cost: Number(item.total_cost),
        })) as SavedCost[]
      );
      setIsLoading(false);
    };

    load();
    return () => {
      active = false;
    };
  }, [user]);

  if (!user) return null;

  return (
    <Card className="border-none shadow-2xl overflow-hidden bg-gradient-to-br from-card via-card to-primary/5">
      <CardHeader className="gradient-primary rounded-t-lg flex flex-row items-center justify-between gap-4">
        <CardTitle className="text-primary-foreground flex items-center gap-3">
          <div className="p-2 bg-white/20 rounded-lg backdrop-blur-sm">
            <Archive className="h-5 w-5" />
          </div>
          <span className="text-xl font-bold tracking-tight">
            Kayıtlı Maliyetler {costs.length > 0 && `(${costs.length})`}
          </span>
        </CardTitle>
        <Button
          variant="secondary"
          size="sm"
          className="gap-2"
          onClick={() => navigate("/saved-costs")}
        >
          <ExternalLink className="h-4 w-4" />
          Tümünü Yönet
        </Button>
      </CardHeader>
      <CardContent className="p-6">
        {isLoading ? (
          <div className="flex items-center justify-center py-8 text-muted-foreground gap-2">
            <Loader2 className="h-5 w-5 animate-spin" />
            Yükleniyor...
          </div>
        ) : costs.length === 0 ? (
          <p className="text-center text-muted-foreground py-8">
            Henüz kayıtlı maliyet yok.
          </p>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {costs.map((cost) => (
              <div
                key={cost.id}
                className="rounded-xl border bg-card p-4 space-y-3 hover:shadow-lg transition-shadow cursor-pointer"
                onClick={() => navigate("/saved-costs")}
              >
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <h4 className="font-bold text-foreground">{cost.model_name}</h4>
                    <p className="text-xs text-muted-foreground">
                      {format(new Date(cost.created_at), "dd MMM yyyy", { locale: tr })}
                    </p>
                  </div>
                  <Badge variant="secondary">{cost.total_cost} ₺</Badge>
                </div>

                {cost.images.length > 0 && (
                  <div className="flex flex-wrap gap-2">
                    {cost.images.map((img, i) => (
                      <img
                        key={i}
                        src={img}
                        alt={`${cost.model_name} model görseli ${i + 1}`}
                        loading="lazy"
                        className="h-20 w-20 object-cover rounded-lg border bg-muted"
                      />
                    ))}
                  </div>
                )}

                <ul className="space-y-1">
                  {cost.items.map((item, i) => (
                    <li key={item.id || i} className="text-xs text-muted-foreground truncate">
                      {item.fabricType} → {item.usageArea} • {item.fiyat} ₺
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
};
