import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { ClipboardList, Download, Loader2, Eye } from "lucide-react";
import { format } from "date-fns";
import { tr } from "date-fns/locale";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

interface BuyerOrder {
  id: string;
  po_number: string;
  model_name: string;
  brand: string | null;
  season: string | null;
  total_quantity: number;
  total_amount: number | null;
  unit_price: number | null;
  status: string | null;
  created_at: string;
  model_image: string | null;
  customer_name: string;
  mal_tanimi: string | null;
  teslim_yeri: string | null;
  yi_inspection_date: string | null;
  yd_inspection_date: string | null;
  kdv_rate: number | null;
  kdv_amount: number | null;
  total_with_kdv: number | null;
  profit_margin: number | null;
  profit_amount: number | null;
  fabric_price: number | null;
  option_price: string | null;
  merch_alt_grup: string | null;
}

interface OrderItem {
  id: string;
  model: string | null;
  option_name: string | null;
  size_0m_1m: number | null;
  size_1m_3m: number | null;
  size_3m_6m: number | null;
  size_6m_9m: number | null;
  asorti_count: number | null;
  total_quantity: number | null;
  inspection_date: string | null;
}

const STATUS_MAP: Record<string, { label: string; className: string }> = {
  sent: { label: "Gönderildi", className: "bg-blue-500/20 text-blue-400 border-blue-500/30" },
  pending: { label: "Beklemede", className: "bg-amber-500/20 text-amber-400 border-amber-500/30" },
  draft: { label: "Taslak", className: "bg-muted text-muted-foreground border-border" },
  processing: { label: "İşleniyor", className: "bg-purple-500/20 text-purple-400 border-purple-500/30" },
  completed: { label: "Tamamlandı", className: "bg-green-500/20 text-green-400 border-green-500/30" },
};

export function IncomingOrders() {
  const { user } = useAuth();
  const [orders, setOrders] = useState<BuyerOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedOrder, setSelectedOrder] = useState<BuyerOrder | null>(null);
  const [orderItems, setOrderItems] = useState<OrderItem[]>([]);
  const [itemsLoading, setItemsLoading] = useState(false);

  useEffect(() => {
    if (user) {
      fetchOrders();

      const channel = supabase
        .channel("incoming-orders")
        .on(
          "postgres_changes",
          { event: "INSERT", schema: "public", table: "buyer_orders", filter: `assigned_to=eq.${user.id}` },
          () => fetchOrders()
        )
        .subscribe();

      return () => { supabase.removeChannel(channel); };
    }
  }, [user]);

  const fetchOrders = async () => {
    setLoading(true);
    const { data } = await supabase
      .from("buyer_orders")
      .select("*")
      .eq("assigned_to", user!.id)
      .order("created_at", { ascending: false });

    setOrders(data || []);
    setLoading(false);
  };

  const viewOrder = async (order: BuyerOrder) => {
    setSelectedOrder(order);
    setItemsLoading(true);
    const { data } = await supabase
      .from("buyer_order_items")
      .select("*")
      .eq("order_id", order.id);
    setOrderItems(data || []);
    setItemsLoading(false);
  };

  const downloadPdf = async (order: BuyerOrder) => {
    const { generateOrderPdf } = await import("@/lib/orderPdf");
    await generateOrderPdf(order.id);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <>
      <Card className="modern-card">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ClipboardList className="h-5 w-5" />
            Gelen Siparişler ({orders.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {orders.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-8">
              Henüz gelen sipariş bulunmuyor.
            </p>
          ) : (
            <div className="space-y-3">
              {orders.map((order) => {
                const status = STATUS_MAP[order.status || "pending"] || STATUS_MAP.pending;
                return (
                  <div
                    key={order.id}
                    className="flex items-center justify-between p-4 rounded-lg bg-secondary/30 border border-border/50 hover:bg-secondary/50 transition-colors"
                  >
                    <div className="flex items-center gap-4">
                      {order.model_image && (
                        <img
                          src={order.model_image}
                          alt={order.model_name}
                          className="w-12 h-12 rounded-lg object-cover border border-border/50"
                        />
                      )}
                      <div>
                        <p className="font-semibold">{order.model_name}</p>
                        <div className="flex items-center gap-2 mt-1">
                          <span className="text-xs text-muted-foreground">PO: {order.po_number}</span>
                          <span className="text-xs text-muted-foreground">•</span>
                          <span className="text-xs text-muted-foreground">{order.total_quantity} adet</span>
                          <span className="text-xs text-muted-foreground">•</span>
                          <span className="text-xs text-muted-foreground">
                            {format(new Date(order.created_at), "dd MMM yyyy", { locale: tr })}
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <Badge variant="outline" className={`text-xs ${status.className}`}>
                        {status.label}
                      </Badge>
                      <Button variant="ghost" size="icon" onClick={() => viewOrder(order)} title="Detay">
                        <Eye className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="icon" onClick={() => downloadPdf(order)} title="PDF İndir">
                        <Download className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Order Detail Dialog */}
      <Dialog open={!!selectedOrder} onOpenChange={() => setSelectedOrder(null)}>
        <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
          {selectedOrder && (
            <>
              <DialogHeader>
                <DialogTitle className="flex items-center justify-between">
                  <span>Sipariş Detayı - PO: {selectedOrder.po_number}</span>
                  <Button size="sm" variant="outline" onClick={() => downloadPdf(selectedOrder)}>
                    <Download className="h-4 w-4 mr-1" /> PDF İndir
                  </Button>
                </DialogTitle>
              </DialogHeader>

              <div className="grid grid-cols-2 gap-4 text-sm mt-4">
                <div><span className="text-muted-foreground">Model:</span> <strong>{selectedOrder.model_name}</strong></div>
                <div><span className="text-muted-foreground">Marka:</span> <strong>{selectedOrder.brand || "-"}</strong></div>
                <div><span className="text-muted-foreground">Sezon:</span> <strong>{selectedOrder.season || "-"}</strong></div>
                <div><span className="text-muted-foreground">Müşteri:</span> <strong>{selectedOrder.customer_name}</strong></div>
                <div><span className="text-muted-foreground">Toplam Adet:</span> <strong>{selectedOrder.total_quantity}</strong></div>
                <div><span className="text-muted-foreground">Birim Fiyat:</span> <strong>{selectedOrder.unit_price?.toFixed(2)} ₺</strong></div>
                <div><span className="text-muted-foreground">Toplam:</span> <strong>{selectedOrder.total_amount?.toFixed(2)} ₺</strong></div>
                <div><span className="text-muted-foreground">KDV Dahil:</span> <strong>{selectedOrder.total_with_kdv?.toFixed(2)} ₺</strong></div>
              </div>

              {selectedOrder.model_image && (
                <div className="mt-4">
                  <img
                    src={selectedOrder.model_image}
                    alt={selectedOrder.model_name}
                    className="w-32 h-32 rounded-lg object-cover border border-border/50"
                  />
                </div>
              )}

              <div className="mt-6">
                <h3 className="font-semibold mb-3">Sipariş Kalemleri</h3>
                {itemsLoading ? (
                  <div className="flex items-center justify-center py-4">
                    <Loader2 className="h-5 w-5 animate-spin" />
                  </div>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Model</TableHead>
                        <TableHead>Option</TableHead>
                        <TableHead className="text-center">0m-1m</TableHead>
                        <TableHead className="text-center">1m-3m</TableHead>
                        <TableHead className="text-center">3m-6m</TableHead>
                        <TableHead className="text-center">6m-9m</TableHead>
                        <TableHead className="text-center">Asorti</TableHead>
                        <TableHead className="text-center">Toplam</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {orderItems.map((item) => (
                        <TableRow key={item.id}>
                          <TableCell>{item.model || "-"}</TableCell>
                          <TableCell>{item.option_name || "-"}</TableCell>
                          <TableCell className="text-center">{item.size_0m_1m || 0}</TableCell>
                          <TableCell className="text-center">{item.size_1m_3m || 0}</TableCell>
                          <TableCell className="text-center">{item.size_3m_6m || 0}</TableCell>
                          <TableCell className="text-center">{item.size_6m_9m || 0}</TableCell>
                          <TableCell className="text-center">{item.asorti_count || 0}</TableCell>
                          <TableCell className="text-center font-semibold">{item.total_quantity || 0}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
