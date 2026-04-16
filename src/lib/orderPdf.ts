import { supabase } from "@/integrations/supabase/client";
import { format } from "date-fns";

// Load a Turkish-supporting font (Roboto) and return base64
async function loadTurkishFont(): Promise<string> {
  const url = "https://fonts.gstatic.com/s/roboto/v47/KFOMCnqEu92Fr1ME7kSn66aGLdTylUAMQXC89YmC2DPNWubEbGmT.ttf";
  const response = await fetch(url);
  const buffer = await response.arrayBuffer();
  const bytes = new Uint8Array(buffer);
  let binary = "";
  for (let i = 0; i < bytes.length; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

export async function generateOrderPdf(orderId: string) {
  const { data: order, error } = await supabase
    .from("buyer_orders")
    .select("*")
    .eq("id", orderId)
    .single();

  if (error || !order) throw new Error("Sipariş bulunamadı");

  const { data: items } = await supabase
    .from("buyer_order_items")
    .select("*")
    .eq("order_id", orderId);

  const { data: countries } = await supabase
    .from("buyer_order_countries")
    .select("*")
    .eq("order_id", orderId);

  const { default: jsPDF } = await import("jspdf");
  const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });

  // Load and embed Turkish font
  try {
    const fontBase64 = await loadTurkishFont();
    doc.addFileToVFS("Roboto-Regular.ttf", fontBase64);
    doc.addFont("Roboto-Regular.ttf", "Roboto", "normal");
    doc.setFont("Roboto");
  } catch {
    doc.setFont("helvetica");
  }

  const w = doc.internal.pageSize.getWidth();
  const margin = 10;
  const contentW = w - margin * 2;
  let y = 12;

  // ---- HEADER LINE ----
  doc.setDrawColor(0, 162, 232);
  doc.setLineWidth(1);
  doc.line(margin, y, w - margin, y);
  y += 10;

  doc.setFontSize(20);
  doc.setTextColor(0, 162, 232);
  doc.text("LC WAIKIKI", margin, y);
  y += 4;

  doc.setDrawColor(0, 162, 232);
  doc.setLineWidth(0.5);
  doc.line(margin, y, w - margin, y);
  y += 6;

  // ---- ORDER INFO ----
  doc.setFontSize(7.5);
  doc.setTextColor(0, 0, 0);

  const orderDate = order.order_date
    ? format(new Date(order.order_date), "dd.MM.yyyy")
    : format(new Date(order.created_at), "dd.MM.yyyy");

  const col1 = margin;
  const col2 = margin + contentW * 0.5;

  const drawRow = (label: string, value: string, x: number, yPos: number) => {
    doc.setFont("Roboto", "normal");
    const labelW = doc.getTextWidth(label + "  ");
    doc.text(label, x, yPos);
    doc.text(value || "-", x + labelW, yPos);
  };

  const drawBoldRow = (label: string, value: string, x: number, yPos: number) => {
    doc.setFont("Roboto", "normal");
    doc.text(label, x, yPos);
    const labelW = doc.getTextWidth(label + "  ");
    doc.text(value || "-", x + labelW, yPos);
  };

  // Row 1: Sipariş Tarihi / Sipariş Kodu / Ödeme Şekli
  const col3 = margin + contentW * 0.7;
  drawRow("Sipariş Tarihi:", orderDate, col1, y);
  drawRow("Sipariş Kodu:", order.order_code || order.po_number, col2, y);
  drawRow("Ödeme Şekli:", "Tanımsız", col3, y);
  y += 5;

  doc.setDrawColor(180);
  doc.setLineWidth(0.2);
  doc.line(col1, y, w - margin, y);
  y += 4;

  // Info rows
  const infoRows = [
    [["Üretici Cari Kod:", order.order_code || "S0.2.2.X.034.011"], ["Model Adı:", order.model_name]],
    [["Üretici Firma:", "TAHA GİYİM SAN. VE TİC. A.Ş."], ["Merch Alt Grup:", order.merch_alt_grup || "CKB"]],
    [["Alıcı:", order.brand || "LC Waikiki"], ["Sezon:", order.season || "-"]],
    [["Mal Tanımı:", order.mal_tanimi || "-"], ["Yİ Inspection Tarihi:", order.yi_inspection_date ? format(new Date(order.yi_inspection_date), "dd.MM.yyyy") : "-"]],
    [["Marka:", order.brand || "LC WAIKIKI"], ["YD Inspection Tarihi:", order.yd_inspection_date ? format(new Date(order.yd_inspection_date), "dd.MM.yyyy") : "-"]],
    [["Kumaş Fiyatı:", order.fabric_price ? `${order.fabric_price.toFixed(2)} ₺` : "-"], ["Teslim Yeri:", order.teslim_yeri || "LCWaikiki Depoları"]],
  ];

  for (const row of infoRows) {
    drawRow(row[0][0], row[0][1], col1, y);
    drawRow(row[1][0], row[1][1], col2, y);
    y += 4.5;
  }

  // Model image
  if (order.model_image && order.model_image.startsWith("data:")) {
    try {
      doc.addImage(order.model_image, "PNG", w - margin - 35, y - 27, 30, 35);
    } catch {
      // skip
    }
  }

  y += 3;
  doc.setDrawColor(180);
  doc.line(col1, y, w - margin, y);
  y += 5;

  // ---- TOTALS ----
  const totalQty = order.total_quantity || 0;
  const totalAmount = order.total_amount || 0;
  const kdvAmount = order.kdv_amount || 0;
  const totalWithKdv = order.total_with_kdv || 0;

  drawBoldRow("Toplam Sipariş Miktar:", totalQty.toLocaleString("tr-TR"), col1, y);
  drawBoldRow("Birim Fiyat:", `${(order.unit_price || 0).toFixed(2)} ₺`, col2, y);
  y += 4.5;
  drawBoldRow("Toplam Tutar:", `${totalAmount.toLocaleString("tr-TR", { minimumFractionDigits: 2 })} TL`, col1, y);
  drawBoldRow("Kumaşçı:", "TAHA GİYİM SAN. VE TİC. A.Ş.", col2, y);
  y += 4.5;
  drawBoldRow(`%${order.kdv_rate || 10} KDV:`, `${kdvAmount.toLocaleString("tr-TR", { minimumFractionDigits: 2 })} TL`, col1, y);
  y += 4.5;
  drawBoldRow("KDV'li Toplam Tutar:", `${totalWithKdv.toLocaleString("tr-TR", { minimumFractionDigits: 2 })} TL`, col1, y);
  y += 4.5;

  if (order.option_price) {
    drawBoldRow("Option Alım Fiyatı:", order.option_price, col1, y);
    y += 4.5;
  }

  y += 2;
  doc.setDrawColor(180);
  doc.line(col1, y, w - margin, y);
  y += 6;

  // ---- ITEMS TABLE ----
  const h = doc.internal.pageSize.getHeight();
  const sizeHeaders = ["3m-6m", "6m-9m", "9m-12m", "12m-18m", "18m-24m", "24m-36m", "3y-4y"];

  if (items && items.length > 0) {
    // Açık Adet
    doc.setFontSize(8);
    doc.text("Açık Adet", col1, y);
    y += 4;

    doc.setFillColor(230, 230, 230);
    doc.rect(col1, y - 3, contentW, 5, "F");
    doc.setFontSize(6);

    const tblHeaders = ["JIT", "Satış Bölgesi", "Model", "Option", "Inspection", ...sizeHeaders, "Toplam Adet"];
    const tblX: number[] = [];
    let cx = col1 + 1;
    const colWidths = [8, 16, 18, 18, 18, ...sizeHeaders.map(() => 10), 14];
    for (const cw of colWidths) {
      tblX.push(cx);
      cx += cw;
    }

    tblHeaders.forEach((th, i) => {
      doc.text(th, tblX[i], y);
    });
    y += 5;

    doc.setFontSize(6);
    for (const item of items) {
      if (y > h - 15) { doc.addPage(); y = 15; }
      const vals = [
        item.jit ? "Evet" : "Hayır",
        item.satis_bolgesi || "Yurt İçi",
        item.model || "-",
        item.option_name || "-",
        item.inspection_date || "-",
        String(item.size_0m_1m || 0),
        String(item.size_1m_3m || 0),
        String(item.size_3m_6m || 0),
        String(item.size_6m_9m || 0),
        "0", "0", "0",
        String(item.total_quantity || 0),
      ];
      vals.forEach((v, i) => {
        if (tblX[i] !== undefined) doc.text(v, tblX[i], y);
      });
      y += 4;
    }

    // Asorti Adet
    y += 4;
    doc.setFontSize(8);
    doc.text("Asorti Adet", col1, y);
    y += 4;

    doc.setFillColor(230, 230, 230);
    doc.rect(col1, y - 3, contentW, 5, "F");
    doc.setFontSize(6);

    const asortiHeaders = ["JIT", "Satış Bölgesi", "Model", "Option", "Inspection", ...sizeHeaders, "Toplam Asorti", "Asorti Sipariş", "Toplam Adet"];
    const aColWidths = [8, 16, 18, 18, 18, ...sizeHeaders.map(() => 9), 14, 14, 14];
    const aX: number[] = [];
    let ax = col1 + 1;
    for (const cw of aColWidths) {
      aX.push(ax);
      ax += cw;
    }

    asortiHeaders.forEach((ah, i) => {
      if (aX[i] !== undefined) doc.text(ah, aX[i], y);
    });
    y += 5;

    doc.setFontSize(6);
    for (const item of items) {
      if (y > h - 15) { doc.addPage(); y = 15; }
      const perSet = (item.asorti_0m_1m || 0) + (item.asorti_1m_3m || 0) + (item.asorti_3m_6m || 0) + (item.asorti_6m_9m || 0);
      const totalAsorti = (item.asorti_count || 0) * perSet;
      const vals = [
        item.jit ? "Evet" : "Hayır",
        item.satis_bolgesi || "Yurt İçi",
        item.model || "-",
        item.option_name || "-",
        item.inspection_date || "-",
        String(item.asorti_0m_1m || 0),
        String(item.asorti_1m_3m || 0),
        String(item.asorti_3m_6m || 0),
        String(item.asorti_6m_9m || 0),
        "0", "0", "0",
        String(item.asorti_count || 0),
        String(totalAsorti),
        String(item.total_quantity || 0),
      ];
      vals.forEach((v, i) => {
        if (aX[i] !== undefined) doc.text(v, aX[i], y);
      });
      y += 4;
    }
  }

  // Country details
  if (countries && countries.length > 0) {
    y += 5;
    if (y > h - 30) { doc.addPage(); y = 15; }

    doc.setFontSize(8);
    doc.text("Ülke Detayları", col1, y);
    y += 4;

    doc.setFillColor(230, 230, 230);
    doc.rect(col1, y - 3, contentW, 5, "F");
    doc.setFontSize(6);

    const cHeaders = ["Ülke", "Renk", "Rota", ...sizeHeaders, "Ana Beden", "Toplam Adet"];
    const cWidths = [18, 18, 18, ...sizeHeaders.map(() => 10), 12, 14];
    const cX: number[] = [];
    let ccx = col1 + 1;
    for (const cw of cWidths) {
      cX.push(ccx);
      ccx += cw;
    }

    cHeaders.forEach((ch, i) => {
      if (cX[i] !== undefined) doc.text(ch, cX[i], y);
    });
    y += 5;

    for (const c of countries) {
      if (y > h - 15) { doc.addPage(); y = 15; }
      const vals = [
        c.country || "-",
        c.color || "-",
        c.rota || "-",
        String(c.size_0m_1m || 0),
        String(c.size_1m_3m || 0),
        String(c.size_3m_6m || 0),
        String(c.size_6m_9m || 0),
        "0", "0", "0",
        String(c.ana_beden || 0),
        String(c.total_quantity || 0),
      ];
      vals.forEach((v, i) => {
        if (cX[i] !== undefined) doc.text(v, cX[i], y);
      });
      y += 4;
    }
  }

  doc.save(`Siparis_${order.po_number}.pdf`);
}
