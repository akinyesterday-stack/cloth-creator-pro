import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { sampleOrders, FabricOrder } from "@/data/fabricData";
import { Search, Package, CheckCircle2, Clock, AlertCircle } from "lucide-react";

export function OrdersTable() {
  const [searchTerm, setSearchTerm] = useState("");

  const filteredOrders = sampleOrders.filter((order) =>
    Object.values(order).some((value) =>
      String(value).toLowerCase().includes(searchTerm.toLowerCase())
    )
  );

  const getStatusBadge = (status: string) => {
    if (status === "OK") {
      return (
        <Badge className="bg-success/15 text-success hover:bg-success/20 border-0">
          <CheckCircle2 className="h-3 w-3 mr-1" />
          OK
        </Badge>
      );
    }
    if (status.includes("PP İŞLEMDE")) {
      return (
        <Badge className="bg-warning/15 text-warning hover:bg-warning/20 border-0">
          <Clock className="h-3 w-3 mr-1" />
          İşlemde
        </Badge>
      );
    }
    if (status.includes("PP YAPILACAK")) {
      return (
        <Badge className="bg-primary/15 text-primary hover:bg-primary/20 border-0">
          <AlertCircle className="h-3 w-3 mr-1" />
          Yapılacak
        </Badge>
      );
    }
    return (
      <Badge variant="secondary" className="border-0">
        {status || "—"}
      </Badge>
    );
  };

  return (
    <Card className="border-none shadow-lg animate-fade-in">
      <CardHeader className="gradient-primary rounded-t-lg">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <CardTitle className="text-primary-foreground flex items-center gap-2">
            <Package className="h-5 w-5" />
            Sipariş Listesi
          </CardTitle>
          <div className="relative w-full sm:w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-primary-foreground/60" />
            <Input
              placeholder="Ara..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-9 bg-primary-foreground/10 border-primary-foreground/20 text-primary-foreground placeholder:text-primary-foreground/60 focus-visible:ring-primary-foreground/30"
            />
          </div>
        </div>
      </CardHeader>
      <CardContent className="p-0">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[1200px]">
            <thead>
              <tr className="border-b border-border bg-secondary/30">
                <th className="text-left py-3 px-4 font-semibold text-sm text-muted-foreground">
                  Model
                </th>
                <th className="text-left py-3 px-4 font-semibold text-sm text-muted-foreground">
                  Sipariş No
                </th>
                <th className="text-left py-3 px-4 font-semibold text-sm text-muted-foreground">
                  Kalite
                </th>
                <th className="text-left py-3 px-4 font-semibold text-sm text-muted-foreground">
                  Kısım
                </th>
                <th className="text-left py-3 px-4 font-semibold text-sm text-muted-foreground">
                  Renk
                </th>
                <th className="text-right py-3 px-4 font-semibold text-sm text-muted-foreground">
                  Miktar
                </th>
                <th className="text-right py-3 px-4 font-semibold text-sm text-muted-foreground">
                  İhtiyaç
                </th>
                <th className="text-right py-3 px-4 font-semibold text-sm text-muted-foreground">
                  Fiyat
                </th>
                <th className="text-center py-3 px-4 font-semibold text-sm text-muted-foreground">
                  Durum
                </th>
                <th className="text-left py-3 px-4 font-semibold text-sm text-muted-foreground">
                  Kumaşçı
                </th>
              </tr>
            </thead>
            <tbody>
              {filteredOrders.map((order, index) => (
                <tr
                  key={order.id}
                  className="border-b border-border/50 hover:bg-secondary/20 transition-colors"
                  style={{ animationDelay: `${index * 50}ms` }}
                >
                  <td className="py-3 px-4">
                    <span className="font-medium">{order.modelAdi}</span>
                  </td>
                  <td className="py-3 px-4 text-sm text-muted-foreground">
                    {order.siparisNo}
                  </td>
                  <td className="py-3 px-4 text-sm max-w-[200px] truncate">
                    {order.kalite}
                  </td>
                  <td className="py-3 px-4 text-sm max-w-[180px] truncate">
                    {order.kisim}
                  </td>
                  <td className="py-3 px-4">
                    <div className="flex items-center gap-2">
                      <div
                        className="w-4 h-4 rounded-full border border-border"
                        style={{
                          backgroundColor: order.renk.includes("GREEN")
                            ? "#4ade80"
                            : order.renk.includes("YELLOW")
                            ? "#facc15"
                            : order.renk.includes("PINK")
                            ? "#f472b6"
                            : order.renk.includes("BLUE")
                            ? "#60a5fa"
                            : "#e5e7eb",
                        }}
                      />
                      <span className="text-sm truncate max-w-[150px]">
                        {order.renk}
                      </span>
                    </div>
                  </td>
                  <td className="py-3 px-4 text-sm text-right">
                    {order.siparisMiktari.toLocaleString("tr-TR")}
                  </td>
                  <td className="py-3 px-4 text-sm text-right font-medium">
                    {order.ihtiyac} kg
                  </td>
                  <td className="py-3 px-4 text-sm text-right font-semibold text-primary">
                    {order.fiyat ? `₺${order.fiyat}` : "—"}
                  </td>
                  <td className="py-3 px-4 text-center">
                    {getStatusBadge(order.ppDurumlari)}
                  </td>
                  <td className="py-3 px-4 text-sm">{order.kumasci}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {filteredOrders.length === 0 && (
          <div className="py-12 text-center text-muted-foreground">
            <Package className="h-12 w-12 mx-auto mb-4 opacity-30" />
            <p>Sonuç bulunamadı</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
