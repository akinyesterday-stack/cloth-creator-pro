import { Card, CardContent } from "@/components/ui/card";
import { sampleOrders } from "@/data/fabricData";
import { Package, TrendingUp, Layers, DollarSign } from "lucide-react";

export function StatsCards() {
  const totalOrders = sampleOrders.length;
  const totalQuantity = sampleOrders.reduce((sum, o) => sum + o.ihtiyac, 0);
  const avgPrice =
    sampleOrders.filter((o) => o.fiyat).reduce((sum, o) => sum + (o.fiyat || 0), 0) /
    sampleOrders.filter((o) => o.fiyat).length;
  const uniqueFabrics = [...new Set(sampleOrders.map((o) => o.kalite))].length;

  const stats = [
    {
      title: "Toplam Sipariş",
      value: totalOrders,
      icon: Package,
      color: "from-primary to-primary/80",
    },
    {
      title: "Toplam İhtiyaç",
      value: `${totalQuantity.toLocaleString("tr-TR")} kg`,
      icon: TrendingUp,
      color: "from-success to-success/80",
    },
    {
      title: "Kumaş Çeşidi",
      value: uniqueFabrics,
      icon: Layers,
      color: "from-accent to-accent/80",
    },
    {
      title: "Ort. Fiyat",
      value: `₺${avgPrice.toFixed(2)}`,
      icon: DollarSign,
      color: "from-warning to-warning/80",
    },
  ];

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      {stats.map((stat, index) => (
        <Card
          key={stat.title}
          className="border-none shadow-md overflow-hidden animate-fade-in"
          style={{ animationDelay: `${index * 100}ms` }}
        >
          <CardContent className="p-0">
            <div className="flex items-center">
              <div
                className={`w-20 h-20 flex items-center justify-center bg-gradient-to-br ${stat.color}`}
              >
                <stat.icon className="h-8 w-8 text-white" />
              </div>
              <div className="flex-1 p-4">
                <p className="text-sm text-muted-foreground">{stat.title}</p>
                <p className="text-2xl font-bold">{stat.value}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
