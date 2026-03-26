import { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Download, X, Loader2, FileText, Package } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { format } from "date-fns";
import { tr } from "date-fns/locale";

interface OrderData {
  id: string;
  po_number: string;
  model_name: string;
  brand: string | null;
  season: string | null;
  mal_tanimi: string | null;
  merch_alt_grup: string | null;
  yi_inspection_date: string | null;
  yd_inspection_date: string | null;
  teslim_yeri: string | null;
  total_quantity: number;
  unit_price: number | null;
  total_amount: number | null;
  kdv_rate: number | null;
  kdv_amount: number | null;
  total_with_kdv: number | null;
  profit_margin: number | null;
  profit_amount: number | null;
  fabric_price: number | null;
  option_price: string | null;
  model_image: string | null;
  status: string | null;
  created_at: string;
  customer_name: string;
  items?: OrderItem[];
}

interface OrderItem {
  id: string;
  model: string;
  option_name: string;
  size_0m_1m: number;
  size_1m_3m: number;
  size_3m_6m: number;
  size_6m_9m: number;
  asorti_count: number;
  total_quantity: number;
}

interface OrderPDFPreviewProps {
  orderId: string | null;
  open: boolean;
  onClose: () => void;
}

export function OrderPDFPreview({ orderId, open, onClose }: OrderPDFPreviewProps) {
  const [order, setOrder] = useState<OrderData | null>(null);
  const [loading, setLoading] = useState(false);
  const printRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (orderId && open) {
      fetchOrder(orderId);
    }
  }, [orderId, open]);

  const fetchOrder = async (id: string) => {
    setLoading(true);
    try {
      const { data: orderData, error } = await supabase
        .from("buyer_orders")
        .select("*")
        .eq("id", id)
        .single();

      if (error) throw error;

      const { data: itemsData } = await supabase
        .from("buyer_order_items")
        .select("*")
        .eq("order_id", id);

      setOrder({ ...orderData, items: itemsData || [] });
    } catch (err) {
      console.error("Error fetching order:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleDownloadPDF = () => {
    if (!printRef.current || !order) return;

    const printWindow = window.open("", "_blank");
    if (!printWindow) return;

    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>Siparis - PO: ${order.po_number}</title>
          <style>
            * { margin: 0; padding: 0; box-sizing: border-box; }
            body { font-family: 'Segoe UI', sans-serif; padding: 24px; color: #1a1a2e; background: #fff; }
            .header { display: flex; justify-content: space-between; align-items: flex-start; border-bottom: 3px solid #3b82f6; padding-bottom: 16px; margin-bottom: 20px; }
            .header h1 { font-size: 22px; color: #3b82f6; }
            .header .po { font-size: 14px; color: #64748b; margin-top: 4px; }
            .header .date { text-align: right; font-size: 13px; color: #64748b; }
            .section { margin-bottom: 20px; }
            .section-title { font-size: 14px; font-weight: 700; color: #3b82f6; margin-bottom: 8px; border-bottom: 1px solid #e2e8f0; padding-bottom: 4px; }
            .grid { display: grid; grid-template-columns: 1fr 1fr; gap: 8px; }
            .field { display: flex; gap: 8px; font-size: 13px; }
            .field .label { color: #64748b; min-width: 140px; }
            .field .value { font-weight: 600; }
            table { width: 100%; border-collapse: collapse; font-size: 12px; margin-top: 8px; }
            th { background: #3b82f6; color: #fff; padding: 8px 6px; text-align: center; }
            td { border: 1px solid #e2e8f0; padding: 6px; text-align: center; }
            tr:nth-child(even) { background: #f8fafc; }
            .totals { margin-top: 16px; text-align: right; }
            .totals .row { display: flex; justify-content: flex-end; gap: 16px; padding: 4px 0; font-size: 13px; }
            .totals .row.total { font-weight: 700; font-size: 15px; border-top: 2px solid #3b82f6; padding-top: 8px; margin-top: 4px; }
            .footer { margin-top: 30px; text-align: center; font-size: 11px; color: #94a3b8; border-top: 1px solid #e2e8f0; padding-top: 12px; }
            @media print { body { padding: 12px; } }
          </style>
        </head>
        <body>
          ${printRef.current.innerHTML}
          <script>window.onload = function() { window.print(); }</script>
        </body>
      </html>
    `);
    printWindow.document.close();
  };

  if (!open) return null;

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5 text-primary" />
            Siparis Detayi
          </DialogTitle>
        </DialogHeader>

        {loading ? (
          <div className="flex items-center justify-center py-16">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : order ? (
          <>
            {/* Action Buttons */}
            <div className="flex gap-2 justify-end -mt-2">
              <Button onClick={handleDownloadPDF} className="gap-2">
                <Download className="h-4 w-4" />
                PDF Indir
              </Button>
              <Button variant="outline" onClick={onClose}>
                <X className="h-4 w-4" />
              </Button>
            </div>

            {/* Preview Area */}
            <div ref={printRef} className="bg-card border border-border rounded-lg p-6">
              {/* Header */}
              <div className="flex justify-between items-start border-b-2 border-primary pb-4 mb-5">
                <div>
                  <h1 className="text-xl font-bold text-primary">TAHA GIYIM</h1>
                  <p className="text-sm text-muted-foreground mt-1">
                    PO: <span className="font-mono font-bold text-foreground">{order.po_number}</span>
                  </p>
                  <Badge variant="outline" className="mt-2">
                    {order.status === "sent" ? "Gonderildi" : order.status === "draft" ? "Taslak" : order.status || "Belirsiz"}
                  </Badge>
                </div>
                <div className="text-right text-sm text-muted-foreground">
                  <p>{format(new Date(order.created_at), "d MMMM yyyy", { locale: tr })}</p>
                  <p>{order.customer_name}</p>
                </div>
              </div>

              {/* Order Info */}
              <div className="mb-5">
                <h3 className="text-sm font-bold text-primary mb-3 border-b border-border pb-1">
                  Siparis Bilgileri
                </h3>
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <div className="flex gap-2">
                    <span className="text-muted-foreground min-w-[120px]">Model:</span>
                    <span className="font-semibold">{order.model_name}</span>
                  </div>
                  <div className="flex gap-2">
                    <span className="text-muted-foreground min-w-[120px]">Marka:</span>
                    <span className="font-semibold">{order.brand || "-"}</span>
                  </div>
                  <div className="flex gap-2">
                    <span className="text-muted-foreground min-w-[120px]">Sezon:</span>
                    <span className="font-semibold">{order.season || "-"}</span>
                  </div>
                  <div className="flex gap-2">
                    <span className="text-muted-foreground min-w-[120px]">Mal Tanimi:</span>
                    <span className="font-semibold">{order.mal_tanimi || "-"}</span>
                  </div>
                  <div className="flex gap-2">
                    <span className="text-muted-foreground min-w-[120px]">Merch Alt Grup:</span>
                    <span className="font-semibold">{order.merch_alt_grup || "-"}</span>
                  </div>
                  <div className="flex gap-2">
                    <span className="text-muted-foreground min-w-[120px]">Teslim Yeri:</span>
                    <span className="font-semibold">{order.teslim_yeri || "-"}</span>
                  </div>
                  {order.yi_inspection_date && (
                    <div className="flex gap-2">
                      <span className="text-muted-foreground min-w-[120px]">YI Inspection:</span>
                      <span className="font-semibold">
                        {format(new Date(order.yi_inspection_date), "d MMM yyyy", { locale: tr })}
                      </span>
                    </div>
                  )}
                  {order.yd_inspection_date && (
                    <div className="flex gap-2">
                      <span className="text-muted-foreground min-w-[120px]">YD Inspection:</span>
                      <span className="font-semibold">
                        {format(new Date(order.yd_inspection_date), "d MMM yyyy", { locale: tr })}
                      </span>
                    </div>
                  )}
                </div>
              </div>

              {/* Items Table */}
              {order.items && order.items.length > 0 && (
                <div className="mb-5">
                  <h3 className="text-sm font-bold text-primary mb-3 border-b border-border pb-1">
                    Siparis Kalemleri
                  </h3>
                  <div className="overflow-x-auto">
                    <table className="w-full text-xs border-collapse">
                      <thead>
                        <tr className="bg-primary text-primary-foreground">
                          <th className="px-2 py-2 text-left">Model</th>
                          <th className="px-2 py-2 text-left">Option</th>
                          <th className="px-2 py-2 text-center">0-1m</th>
                          <th className="px-2 py-2 text-center">1-3m</th>
                          <th className="px-2 py-2 text-center">3-6m</th>
                          <th className="px-2 py-2 text-center">6-9m</th>
                          <th className="px-2 py-2 text-center">Asorti</th>
                          <th className="px-2 py-2 text-center font-bold">Toplam</th>
                        </tr>
                      </thead>
                      <tbody>
                        {order.items.map((item, idx) => (
                          <tr key={item.id} className={idx % 2 === 0 ? "bg-secondary/30" : ""}>
                            <td className="px-2 py-1.5 border border-border">{item.model || "-"}</td>
                            <td className="px-2 py-1.5 border border-border">{item.option_name || "-"}</td>
                            <td className="px-2 py-1.5 border border-border text-center">{item.size_0m_1m}</td>
                            <td className="px-2 py-1.5 border border-border text-center">{item.size_1m_3m}</td>
                            <td className="px-2 py-1.5 border border-border text-center">{item.size_3m_6m}</td>
                            <td className="px-2 py-1.5 border border-border text-center">{item.size_6m_9m}</td>
                            <td className="px-2 py-1.5 border border-border text-center">{item.asorti_count}</td>
                            <td className="px-2 py-1.5 border border-border text-center font-bold">
                              {item.total_quantity.toLocaleString()}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* Price Summary */}
              <div className="mb-4">
                <h3 className="text-sm font-bold text-primary mb-3 border-b border-border pb-1">
                  Fiyat Ozeti
                </h3>
                <div className="flex flex-col items-end gap-1 text-sm">
                  <div className="flex gap-4">
                    <span className="text-muted-foreground">Toplam Adet:</span>
                    <span className="font-bold w-28 text-right">{order.total_quantity.toLocaleString()}</span>
                  </div>
                  {order.unit_price != null && (
                    <div className="flex gap-4">
                      <span className="text-muted-foreground">Birim Fiyat:</span>
                      <span className="font-semibold w-28 text-right">{order.unit_price.toLocaleString("tr-TR")} TL</span>
                    </div>
                  )}
                  {order.total_amount != null && (
                    <div className="flex gap-4">
                      <span className="text-muted-foreground">Toplam Tutar:</span>
                      <span className="font-semibold w-28 text-right">{order.total_amount.toLocaleString("tr-TR")} TL</span>
                    </div>
                  )}
                  {order.kdv_amount != null && (
                    <div className="flex gap-4">
                      <span className="text-muted-foreground">KDV (%{order.kdv_rate}):</span>
                      <span className="w-28 text-right">{order.kdv_amount.toLocaleString("tr-TR")} TL</span>
                    </div>
                  )}
                  {order.total_with_kdv != null && (
                    <div className="flex gap-4 border-t-2 border-primary pt-2 mt-1">
                      <span className="font-bold">KDV Dahil Toplam:</span>
                      <span className="font-bold text-base w-28 text-right">{order.total_with_kdv.toLocaleString("tr-TR")} TL</span>
                    </div>
                  )}
                  {order.fabric_price != null && order.fabric_price > 0 && (
                    <div className="flex gap-4 text-muted-foreground">
                      <span>Kumas Fiyati:</span>
                      <span className="w-28 text-right">{order.fabric_price.toLocaleString("tr-TR")} TL</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Footer */}
              <div className="text-center text-xs text-muted-foreground border-t border-border pt-3 mt-4">
                TAHA GIYIM - Kumas Tedarik Sistemi
              </div>
            </div>
          </>
        ) : (
          <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
            <Package className="h-10 w-10 mb-2 opacity-50" />
            <p>Siparis bulunamadi</p>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
