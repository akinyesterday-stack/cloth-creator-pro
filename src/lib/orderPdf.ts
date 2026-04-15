import { supabase } from "@/integrations/supabase/client";
import { format } from "date-fns";

export async function generateOrderPdf(orderId: string) {
  // Fetch order
  const { data: order, error } = await supabase
    .from("buyer_orders")
    .select("*")
    .eq("id", orderId)
    .single();

  if (error || !order) throw new Error("Sipariş bulunamadı");

  // Fetch items
  const { data: items } = await supabase
    .from("buyer_order_items")
    .select("*")
    .eq("order_id", orderId);

  // Fetch countries
  const { data: countries } = await supabase
    .from("buyer_order_countries")
    .select("*")
    .eq("order_id", orderId);

  const { default: jsPDF } = await import("jspdf");
  const doc = new jsPDF({ orientation: "landscape", unit: "mm", format: "a4" });

  const w = doc.internal.pageSize.getWidth();
  const h = doc.internal.pageSize.getHeight();
  const margin = 10;

  // ---- HEADER ----
  doc.setDrawColor(0, 162, 232);
  doc.setLineWidth(1);
  doc.line(margin, 8, w - margin, 8);

  doc.setFontSize(22);
  doc.setTextColor(0, 162, 232);
  doc.setFont("helvetica", "bold");
  doc.text("LC WAIKIKI", margin, 18);

  doc.setLineWidth(0.5);
  doc.line(margin, 22, w - margin, 22);

  // ---- ORDER INFO SECTION ----
  doc.setFontSize(8);
  doc.setTextColor(0, 0, 0);
  doc.setFont("helvetica", "normal");

  const orderDate = order.order_date ? format(new Date(order.order_date), "dd.MM.yyyy") : format(new Date(order.created_at), "dd.MM.yyyy");

  const leftCol = margin;
  const midCol = 80;
  const rightCol = 160;
  let y = 28;

  const drawField = (label: string, value: string, x: number, yPos: number) => {
    doc.setFont("helvetica", "bold");
    doc.text(label, x, yPos);
    doc.setFont("helvetica", "normal");
    doc.text(value, x + doc.getTextWidth(label) + 2, yPos);
  };

  drawField("Siparis Tarihi", orderDate, leftCol, y);
  drawField("Siparis Kodu", order.po_number, midCol, y);
  drawField("Odeme Sekli", "Tanimis", rightCol, y);
  y += 6;

  doc.setDrawColor(150);
  doc.setLineWidth(0.3);
  doc.line(leftCol, y, w - margin, y);
  y += 5;

  // Info grid
  const infoRows = [
    [["Uretici Cari Kod", order.order_code || "S0.2.2.X.034.011"], ["Model Adi", order.model_name]],
    [["Uretici Firma", "TAHA GIYIM SAN. VE TIC. A.S."], ["Merch Alt Grup", order.merch_alt_grup || "CKB"]],
    [["Alici", order.brand || "LC Waikiki"], ["Sezon", order.season || "-"]],
    [["Mal Tanimi", order.mal_tanimi || "-"], ["Yi Inspection Tarihi", order.yi_inspection_date || "-"]],
    [["Marka", order.brand || "LC WAIKIKI"], ["YD Inspection Tarihi", order.yd_inspection_date || "-"]],
    [["Kumas Fiyati", order.fabric_price ? `${order.fabric_price.toFixed(2)} TL` : "-"], ["Teslim Yeri", order.teslim_yeri || "LCWaikiki Depolari"]],
  ];

  for (const row of infoRows) {
    for (let i = 0; i < row.length; i++) {
      const x = i === 0 ? leftCol : rightCol;
      drawField(row[i][0] + ": ", row[i][1], x, y);
    }
    y += 5;
  }

  y += 3;
  doc.setDrawColor(150);
  doc.line(leftCol, y, w - margin, y);
  y += 5;

  // Totals
  const totalQty = order.total_quantity || 0;
  const totalAmount = order.total_amount || 0;
  const kdvAmount = order.kdv_amount || 0;
  const totalWithKdv = order.total_with_kdv || 0;

  drawField("Toplam Siparis Miktar: ", totalQty.toLocaleString("tr-TR"), leftCol, y);
  drawField("Birim Fiyat: ", `${(order.unit_price || 0).toFixed(2)} TL`, rightCol, y);
  y += 5;
  drawField("Toplam Tutar: ", `${totalAmount.toLocaleString("tr-TR", { minimumFractionDigits: 2 })} TL`, leftCol, y);
  drawField("Kumasci: ", "TAHA GIYIM SAN. VE TIC. A.S.", rightCol, y);
  y += 5;
  drawField(`%${order.kdv_rate || 10} KDV: `, `${kdvAmount.toLocaleString("tr-TR", { minimumFractionDigits: 2 })} TL`, leftCol, y);
  y += 5;
  drawField("KDVli Toplam Tutar: ", `${totalWithKdv.toLocaleString("tr-TR", { minimumFractionDigits: 2 })} TL`, leftCol, y);
  y += 5;

  if (order.option_price) {
    drawField("Option Alim Fiyati: ", order.option_price, leftCol, y);
    y += 5;
  }

  y += 3;
  doc.setDrawColor(150);
  doc.line(leftCol, y, w - margin, y);
  y += 5;

  // ---- ITEMS TABLE ----
  if (items && items.length > 0) {
    // Table header
    doc.setFillColor(240, 240, 240);
    doc.rect(leftCol, y - 3, w - margin * 2, 6, "F");

    doc.setFont("helvetica", "bold");
    doc.setFontSize(7);
    const colHeaders = ["JIT", "Satis Bolgesi", "Model", "Option", "Inspection", "3m-6m", "6m-9m", "9m-12m", "12m-18m", "18m-24m", "24m-36m", "3y-4y", "Toplam Adet"];
    const colX = [leftCol, leftCol + 12, leftCol + 35, leftCol + 65, leftCol + 90, leftCol + 115, leftCol + 128, leftCol + 141, leftCol + 154, leftCol + 167, leftCol + 180, leftCol + 193, leftCol + 210];

    colHeaders.forEach((h, i) => {
      doc.text(h, colX[i], y);
    });
    y += 6;

    doc.setFont("helvetica", "normal");
    doc.setFontSize(7);

    // Acik Adet section header
    doc.setFont("helvetica", "bold");
    doc.setFontSize(8);
    doc.text("Acik Adet", leftCol + 115, y - 8);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(7);

    for (const item of items) {
      if (y > h - 20) { doc.addPage(); y = 15; }

      doc.text(item.jit ? "Evet" : "Hayir", colX[0], y);
      doc.text(item.satis_bolgesi || "Yurt Ici", colX[1], y);
      doc.text(item.model || "-", colX[2], y);
      doc.text(item.option_name || "-", colX[3], y);
      doc.text(item.inspection_date || "-", colX[4], y);
      doc.text(String(item.size_0m_1m || 0), colX[5], y);
      doc.text(String(item.size_1m_3m || 0), colX[6], y);
      doc.text(String(item.size_3m_6m || 0), colX[7], y);
      doc.text(String(item.size_6m_9m || 0), colX[8], y);
      doc.text("0", colX[9], y);
      doc.text("0", colX[10], y);
      doc.text("0", colX[11], y);
      doc.text(String(item.total_quantity || 0), colX[12], y);
      y += 5;
    }

    // Asorti section
    y += 5;
    doc.setFont("helvetica", "bold");
    doc.setFontSize(8);
    doc.text("Asorti Adet", leftCol, y);
    y += 5;

    doc.setFillColor(240, 240, 240);
    doc.rect(leftCol, y - 3, w - margin * 2, 6, "F");
    doc.setFontSize(7);
    const asortiHeaders = ["JIT", "Satis Bolgesi", "Model", "Option", "Inspection", "3m-6m", "6m-9m", "9m-12m", "12m-18m", "18m-24m", "24m-36m", "3y-4y", "Toplam Asorti", "Asorti Basina", "Toplam Adet"];
    asortiHeaders.forEach((h, i) => {
      const ax = leftCol + i * 18;
      if (i < colX.length) doc.text(h, colX[i], y);
      else doc.text(h, leftCol + 210 + (i - 12) * 20, y);
    });
    y += 6;

    doc.setFont("helvetica", "normal");
    for (const item of items) {
      if (y > h - 20) { doc.addPage(); y = 15; }
      doc.text(item.jit ? "Evet" : "Hayir", colX[0], y);
      doc.text(item.satis_bolgesi || "Yurt Ici", colX[1], y);
      doc.text(item.model || "-", colX[2], y);
      doc.text(item.option_name || "-", colX[3], y);
      doc.text(item.inspection_date || "-", colX[4], y);
      doc.text(String(item.asorti_0m_1m || 0), colX[5], y);
      doc.text(String(item.asorti_1m_3m || 0), colX[6], y);
      doc.text(String(item.asorti_3m_6m || 0), colX[7], y);
      doc.text(String(item.asorti_6m_9m || 0), colX[8], y);
      doc.text("0", colX[9], y);
      doc.text("0", colX[10], y);
      doc.text("0", colX[11], y);
      doc.text(String(item.asorti_count || 0), colX[12], y);
      const perSet = (item.asorti_0m_1m || 0) + (item.asorti_1m_3m || 0) + (item.asorti_3m_6m || 0) + (item.asorti_6m_9m || 0);
      doc.text(String(perSet), leftCol + 228, y);
      doc.text(String((item.asorti_count || 0) * perSet), leftCol + 248, y);
      y += 5;
    }
  }

  // Country details
  if (countries && countries.length > 0) {
    y += 8;
    doc.setFont("helvetica", "bold");
    doc.setFontSize(8);
    doc.text("Ulke Detaylari", leftCol, y);
    y += 5;

    doc.setFillColor(240, 240, 240);
    doc.rect(leftCol, y - 3, w - margin * 2, 6, "F");
    doc.setFontSize(7);
    const countryHeaders = ["Ulke", "Renk", "Rota", "3m-6m", "6m-9m", "9m-12m", "12m-18m", "18m-24m", "24m-36m", "3y-4y", "Ana Beden", "Toplam Adet"];
    countryHeaders.forEach((h, i) => {
      doc.text(h, leftCol + i * 22, y);
    });
    y += 6;

    doc.setFont("helvetica", "normal");
    for (const c of countries) {
      doc.text(c.country || "-", leftCol, y);
      doc.text(c.color || "-", leftCol + 22, y);
      doc.text(c.rota || "-", leftCol + 44, y);
      doc.text(String(c.size_0m_1m || 0), leftCol + 66, y);
      doc.text(String(c.size_1m_3m || 0), leftCol + 88, y);
      doc.text(String(c.size_3m_6m || 0), leftCol + 110, y);
      doc.text(String(c.size_6m_9m || 0), leftCol + 132, y);
      doc.text("0", leftCol + 154, y);
      doc.text("0", leftCol + 176, y);
      doc.text("0", leftCol + 198, y);
      doc.text(String(c.ana_beden || 0), leftCol + 220, y);
      doc.text(String(c.total_quantity || 0), leftCol + 242, y);
      y += 5;
    }
  }

  // Add model image if available
  if (order.model_image && order.model_image.startsWith("data:")) {
    try {
      doc.addImage(order.model_image, "PNG", w - 55, 25, 40, 40);
    } catch {
      // skip image errors
    }
  }

  doc.save(`Siparis_${order.po_number}.pdf`);
}
