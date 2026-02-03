import { useState, useEffect, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { 
  Plus, Trash2, Save, Download, FileSpreadsheet, 
  ArrowUpDown, Loader2, Zap, Clock, FileImage
} from "lucide-react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Checkbox } from "@/components/ui/checkbox";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
import ExcelJS from "exceljs";
import { format } from "date-fns";
import { ImageGenerator } from "@/components/ImageGenerator";

interface OrderRow {
  id: string;
  order_name: string;
  model_image: string | null;
  fabric_type: string | null;
  usage_area: string | null;
  en: number | null;
  gramaj: number | null;
  price: number | null;
  termin_date: string | null;
  fabric_termin_date: string | null;
  po_termin_date: string | null;
  shipped_date: string | null;
  status: string;
  description: string | null;
  is_fast_track: boolean;
  isNew?: boolean;
  isModified?: boolean;
}

const statusOptions = [
  { value: "pending", label: "Beklemede", color: "bg-yellow-500/20 text-yellow-700 dark:text-yellow-400" },
  { value: "processing", label: "İşleniyor", color: "bg-blue-500/20 text-blue-700 dark:text-blue-400" },
  { value: "completed", label: "Tamamlandı", color: "bg-green-500/20 text-green-700 dark:text-green-400" },
  { value: "cancelled", label: "İptal", color: "bg-red-500/20 text-red-700 dark:text-red-400" },
];

export function SpreadsheetOrders() {
  const { user } = useAuth();
  const [rows, setRows] = useState<OrderRow[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("asc");
  const [excelNameDialogOpen, setExcelNameDialogOpen] = useState(false);
  const [excelFileName, setExcelFileName] = useState("");
  const [selectedRows, setSelectedRows] = useState<Set<string>>(new Set());
  const [imageGenOpen, setImageGenOpen] = useState(false);
  const [imageGenImages, setImageGenImages] = useState<Array<{ src: string; label: string }>>([]);

  useEffect(() => {
    if (user) {
      loadOrders();
    }
  }, [user, sortOrder]);

  const loadOrders = async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from("orders")
        .select("*")
        .eq("user_id", user.id)
        .order("termin_date", { ascending: sortOrder === "asc", nullsFirst: false });

      if (error) throw error;

      const mappedData: OrderRow[] = (data || []).map((order: any) => ({
        id: order.id,
        order_name: order.order_name,
        model_image: order.model_image,
        fabric_type: order.fabric_type,
        usage_area: order.usage_area,
        en: order.en,
        gramaj: order.gramaj,
        price: order.price,
        termin_date: order.termin_date,
        fabric_termin_date: order.fabric_termin_date || null,
        po_termin_date: order.po_termin_date || null,
        shipped_date: order.shipped_date || null,
        status: order.status,
        description: order.description,
        is_fast_track: order.is_fast_track || false,
        isNew: false,
        isModified: false,
      }));

      setRows(mappedData);
    } catch (error) {
      console.error("Error loading orders:", error);
      toast.error("Siparişler yüklenirken hata oluştu");
    } finally {
      setIsLoading(false);
    }
  };

  const handleAddRow = () => {
    const newRow: OrderRow = {
      id: `new-${Date.now()}`,
      order_name: "",
      model_image: null,
      fabric_type: null,
      usage_area: null,
      en: null,
      gramaj: null,
      price: null,
      termin_date: null,
      fabric_termin_date: null,
      po_termin_date: null,
      shipped_date: null,
      status: "pending",
      description: null,
      is_fast_track: false,
      isNew: true,
      isModified: false,
    };
    setRows([...rows, newRow]);
  };

  const handleCellChange = (rowId: string, field: keyof OrderRow, value: any) => {
    setRows(rows.map(row => {
      if (row.id === rowId) {
        return { ...row, [field]: value, isModified: true };
      }
      return row;
    }));
  };

  const handleDeleteRow = async (rowId: string) => {
    const row = rows.find(r => r.id === rowId);
    
    if (row?.isNew) {
      setRows(rows.filter(r => r.id !== rowId));
      return;
    }

    try {
      const { error } = await supabase
        .from("orders")
        .delete()
        .eq("id", rowId);

      if (error) throw error;
      
      setRows(rows.filter(r => r.id !== rowId));
      toast.success("Satır silindi");
    } catch (error) {
      console.error("Error deleting order:", error);
      toast.error("Silme işlemi başarısız");
    }
  };

  const handleSaveAll = async () => {
    if (!user) return;
    setIsSaving(true);

    try {
      const modifiedRows = rows.filter(r => r.isModified || r.isNew);
      
      for (const row of modifiedRows) {
        const orderData: any = {
          user_id: user.id,
          order_name: row.order_name || "İsimsiz Sipariş",
          model_image: row.model_image,
          fabric_type: row.fabric_type,
          usage_area: row.usage_area,
          en: row.en,
          gramaj: row.gramaj,
          price: row.price || 0,
          termin_date: row.termin_date,
          fabric_termin_date: row.fabric_termin_date,
          po_termin_date: row.po_termin_date,
          shipped_date: row.shipped_date,
          status: row.status,
          description: row.description,
          is_fast_track: row.is_fast_track,
        };

        if (row.isNew) {
          const { data, error } = await supabase
            .from("orders")
            .insert(orderData)
            .select()
            .single();

          if (error) throw error;
          
          setRows(prev => prev.map(r => 
            r.id === row.id 
              ? { ...r, id: data.id, isNew: false, isModified: false }
              : r
          ));
        } else {
          const { error } = await supabase
            .from("orders")
            .update(orderData)
            .eq("id", row.id);

          if (error) throw error;
          
          setRows(prev => prev.map(r => 
            r.id === row.id 
              ? { ...r, isModified: false }
              : r
          ));
        }
      }

      toast.success(`${modifiedRows.length} satır kaydedildi`);
    } catch (error) {
      console.error("Error saving orders:", error);
      toast.error("Kaydetme işlemi başarısız");
    } finally {
      setIsSaving(false);
    }
  };

  const handleExcelClick = () => {
    if (rows.length === 0) {
      toast.error("İndirilecek sipariş bulunamadı");
      return;
    }
    setExcelFileName(`siparisler_${new Date().toISOString().split("T")[0]}`);
    setExcelNameDialogOpen(true);
  };

  const exportToExcel = async () => {
    setExcelNameDialogOpen(false);

    const workbook = new ExcelJS.Workbook();
    workbook.creator = "Kumaş Tedarik Sistemi";
    workbook.created = new Date();

    const worksheet = workbook.addWorksheet("Siparişler", {
      views: [{ showGridLines: true }],
    });

    worksheet.columns = [
      { header: "FT", key: "ft", width: 8 },
      { header: "Model Adı", key: "modelAdi", width: 25 },
      { header: "Kumaş Türü", key: "kumasTuru", width: 30 },
      { header: "Kullanım Yeri", key: "kullanimYeri", width: 25 },
      { header: "En (CM)", key: "en", width: 12 },
      { header: "Gramaj (GR)", key: "gramaj", width: 12 },
      { header: "Fiyat (₺)", key: "fiyat", width: 12 },
      { header: "Kumaş Termin", key: "kumasTermin", width: 15 },
      { header: "PO Termin", key: "poTermin", width: 15 },
      { header: "Yüklenme Tarihi", key: "yuklenme", width: 15 },
      { header: "Durum", key: "durum", width: 15 },
      { header: "Açıklama", key: "aciklama", width: 30 },
    ];

    const headerRow = worksheet.getRow(1);
    headerRow.height = 25;
    headerRow.eachCell((cell) => {
      cell.fill = {
        type: "pattern",
        pattern: "solid",
        fgColor: { argb: "2563EB" },
      };
      cell.font = { bold: true, color: { argb: "FFFFFF" }, size: 11 };
      cell.alignment = { horizontal: "center", vertical: "middle" };
      cell.border = {
        top: { style: "medium", color: { argb: "1E40AF" } },
        bottom: { style: "medium", color: { argb: "1E40AF" } },
        left: { style: "medium", color: { argb: "1E40AF" } },
        right: { style: "medium", color: { argb: "1E40AF" } },
      };
    });

    for (const row of rows) {
      const statusLabel = statusOptions.find(s => s.value === row.status)?.label || row.status;
      
      const dataRow = worksheet.addRow({
        ft: row.is_fast_track ? "⚡ FT" : "",
        modelAdi: row.order_name,
        kumasTuru: row.fabric_type || "",
        kullanimYeri: row.usage_area || "",
        en: row.en || "",
        gramaj: row.gramaj || "",
        fiyat: row.price || "",
        kumasTermin: row.fabric_termin_date ? format(new Date(row.fabric_termin_date), "d.MM.yyyy") : "",
        poTermin: row.po_termin_date ? format(new Date(row.po_termin_date), "d.MM.yyyy") : "",
        yuklenme: row.shipped_date ? format(new Date(row.shipped_date), "d.MM.yyyy") : "",
        durum: statusLabel,
        aciklama: row.description || "",
      });

      dataRow.height = 30;
      dataRow.eachCell((cell, colNumber) => {
        cell.alignment = { horizontal: "center", vertical: "middle", wrapText: true };
        cell.border = {
          top: { style: "thin", color: { argb: "D1D5DB" } },
          bottom: { style: "thin", color: { argb: "D1D5DB" } },
          left: { style: "thin", color: { argb: "D1D5DB" } },
          right: { style: "thin", color: { argb: "D1D5DB" } },
        };
        
        // Highlight FT rows
        if (row.is_fast_track) {
          cell.fill = {
            type: "pattern",
            pattern: "solid",
            fgColor: { argb: "FEF3C7" },
          };
        }
      });
    }

    const buffer = await workbook.xlsx.writeBuffer();
    const blob = new Blob([buffer], {
      type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `${excelFileName || 'siparisler'}.xlsx`;
    link.click();
    URL.revokeObjectURL(url);
    setExcelFileName("");

    toast.success("Excel dosyası indirildi");
  };

  const hasModifications = rows.some(r => r.isModified || r.isNew);

  const getStatusColor = (status: string) => {
    return statusOptions.find(s => s.value === status)?.color || "";
  };

  const handleSelectRow = (id: string) => {
    setSelectedRows(prev => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const handleSelectAll = () => {
    if (selectedRows.size === rows.length) {
      setSelectedRows(new Set());
    } else {
      setSelectedRows(new Set(rows.map(r => r.id)));
    }
  };

  const handleOpenImageGenerator = () => {
    const selected = selectedRows.size > 0 
      ? rows.filter(r => selectedRows.has(r.id))
      : rows;
    
    const images = selected
      .filter(r => r.model_image)
      .map(r => ({
        src: r.model_image!,
        label: r.order_name,
      }));
    
    if (images.length === 0) {
      toast.error("Resim bulunamadı");
      return;
    }
    
    setImageGenImages(images);
    setImageGenOpen(true);
  };

  if (isLoading) {
    return (
      <Card className="glass-card">
        <CardContent className="py-12 flex items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="glass-card">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <CardTitle className="flex items-center gap-2">
            <FileSpreadsheet className="h-5 w-5 text-primary" />
            Sipariş Tablosu
          </CardTitle>
          <div className="flex items-center gap-2 flex-wrap">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setSortOrder(sortOrder === "asc" ? "desc" : "asc")}
              className="gap-1"
            >
              <ArrowUpDown className="h-4 w-4" />
              Termin {sortOrder === "asc" ? "↑" : "↓"}
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={handleOpenImageGenerator}
              className="gap-1"
            >
              <FileImage className="h-4 w-4" />
              Resim Oluştur {selectedRows.size > 0 ? `(${selectedRows.size})` : ""}
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={handleExcelClick}
              className="gap-1"
            >
              <Download className="h-4 w-4" />
              Excel İndir
            </Button>
            <Button
              size="sm"
              onClick={handleAddRow}
              className="gap-1"
            >
              <Plus className="h-4 w-4" />
              Yeni Satır
            </Button>
            {hasModifications && (
              <Button
                size="sm"
                onClick={handleSaveAll}
                disabled={isSaving}
                className="gap-1 bg-emerald-600 hover:bg-emerald-700"
              >
                {isSaving ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Save className="h-4 w-4" />
                )}
                Kaydet
              </Button>
            )}
          </div>
        </div>
      </CardHeader>
      <CardContent className="p-0 overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/50">
              <TableHead className="w-[40px] text-center">
                <Checkbox
                  checked={selectedRows.size === rows.length && rows.length > 0}
                  onCheckedChange={handleSelectAll}
                />
              </TableHead>
              <TableHead className="w-[40px]"></TableHead>
              <TableHead className="w-[50px] text-center">FT</TableHead>
              <TableHead className="min-w-[130px]">Model Adı</TableHead>
              <TableHead className="min-w-[130px]">Kumaş Türü</TableHead>
              <TableHead className="min-w-[110px]">Kullanım Yeri</TableHead>
              <TableHead className="w-[70px]">En</TableHead>
              <TableHead className="w-[70px]">Gramaj</TableHead>
              <TableHead className="w-[80px]">Fiyat</TableHead>
              <TableHead className="w-[120px]">Kumaş Termin</TableHead>
              <TableHead className="w-[120px]">PO Termin</TableHead>
              <TableHead className="w-[120px]">Yüklenme</TableHead>
              <TableHead className="w-[110px]">Durum</TableHead>
              <TableHead className="min-w-[120px]">Açıklama</TableHead>
              <TableHead className="w-[50px]"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.length === 0 ? (
              <TableRow>
                <TableCell colSpan={15} className="text-center py-8 text-muted-foreground">
                  Henüz sipariş bulunmuyor. "Yeni Satır" butonuna tıklayın.
                </TableCell>
              </TableRow>
            ) : (
              rows.map((row) => (
                <TableRow 
                  key={row.id} 
                  className={`
                    ${row.isNew ? "bg-emerald-50 dark:bg-emerald-950/20" : ""}
                    ${row.isModified && !row.isNew ? "bg-amber-50/50 dark:bg-amber-950/20" : ""}
                    ${row.is_fast_track ? "bg-amber-50 dark:bg-amber-950/20" : ""}
                    ${selectedRows.has(row.id) ? "bg-primary/5" : ""}
                  `}
                >
                  <TableCell className="px-2 text-center">
                    <Checkbox
                      checked={selectedRows.has(row.id)}
                      onCheckedChange={() => handleSelectRow(row.id)}
                    />
                  </TableCell>
                  <TableCell className="px-2">
                    {(row.isNew || row.isModified) && (
                      <div className={`w-2 h-2 rounded-full ${row.isNew ? "bg-emerald-500" : "bg-amber-500"}`} />
                    )}
                  </TableCell>
                  <TableCell className="text-center">
                    <Checkbox
                      checked={row.is_fast_track}
                      onCheckedChange={(checked) => handleCellChange(row.id, "is_fast_track", checked)}
                      className="data-[state=checked]:bg-amber-500 data-[state=checked]:border-amber-500"
                    />
                    {row.is_fast_track && <Zap className="h-3 w-3 text-amber-500 mx-auto mt-1" />}
                  </TableCell>
                  <TableCell>
                    <Input
                      value={row.order_name}
                      onChange={(e) => handleCellChange(row.id, "order_name", e.target.value)}
                      placeholder="Model adı"
                      className="h-8 text-sm border-0 bg-transparent focus:bg-background focus:border"
                    />
                  </TableCell>
                  <TableCell>
                    <Input
                      value={row.fabric_type || ""}
                      onChange={(e) => handleCellChange(row.id, "fabric_type", e.target.value)}
                      placeholder="Kumaş türü"
                      className="h-8 text-sm border-0 bg-transparent focus:bg-background focus:border"
                    />
                  </TableCell>
                  <TableCell>
                    <Input
                      value={row.usage_area || ""}
                      onChange={(e) => handleCellChange(row.id, "usage_area", e.target.value)}
                      placeholder="Kullanım yeri"
                      className="h-8 text-sm border-0 bg-transparent focus:bg-background focus:border"
                    />
                  </TableCell>
                  <TableCell>
                    <Input
                      type="number"
                      value={row.en || ""}
                      onChange={(e) => handleCellChange(row.id, "en", e.target.value ? Number(e.target.value) : null)}
                      placeholder="En"
                      className="h-8 text-sm border-0 bg-transparent focus:bg-background focus:border"
                    />
                  </TableCell>
                  <TableCell>
                    <Input
                      type="number"
                      value={row.gramaj || ""}
                      onChange={(e) => handleCellChange(row.id, "gramaj", e.target.value ? Number(e.target.value) : null)}
                      placeholder="Gramaj"
                      className="h-8 text-sm border-0 bg-transparent focus:bg-background focus:border"
                    />
                  </TableCell>
                  <TableCell>
                    <Input
                      type="number"
                      step="0.01"
                      value={row.price || ""}
                      onChange={(e) => handleCellChange(row.id, "price", e.target.value ? Number(e.target.value) : null)}
                      placeholder="₺"
                      className="h-8 text-sm border-0 bg-transparent focus:bg-background focus:border"
                    />
                  </TableCell>
                  <TableCell>
                    <Input
                      type="date"
                      value={row.fabric_termin_date || ""}
                      onChange={(e) => handleCellChange(row.id, "fabric_termin_date", e.target.value || null)}
                      className="h-8 text-sm border-0 bg-transparent focus:bg-background focus:border"
                    />
                  </TableCell>
                  <TableCell>
                    <Input
                      type="date"
                      value={row.po_termin_date || ""}
                      onChange={(e) => handleCellChange(row.id, "po_termin_date", e.target.value || null)}
                      className="h-8 text-sm border-0 bg-transparent focus:bg-background focus:border"
                    />
                  </TableCell>
                  <TableCell>
                    <Input
                      type="date"
                      value={row.shipped_date || ""}
                      onChange={(e) => handleCellChange(row.id, "shipped_date", e.target.value || null)}
                      className="h-8 text-sm border-0 bg-transparent focus:bg-background focus:border"
                    />
                  </TableCell>
                  <TableCell>
                    <Select
                      value={row.status}
                      onValueChange={(value) => handleCellChange(row.id, "status", value)}
                    >
                      <SelectTrigger className="h-8 text-xs border-0 bg-transparent focus:bg-background">
                        <SelectValue>
                          <Badge className={`${getStatusColor(row.status)} text-xs`}>
                            {statusOptions.find(s => s.value === row.status)?.label}
                          </Badge>
                        </SelectValue>
                      </SelectTrigger>
                      <SelectContent>
                        {statusOptions.map((status) => (
                          <SelectItem key={status.value} value={status.value}>
                            <Badge className={`${status.color} text-xs`}>
                              {status.label}
                            </Badge>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </TableCell>
                  <TableCell>
                    <Input
                      value={row.description || ""}
                      onChange={(e) => handleCellChange(row.id, "description", e.target.value)}
                      placeholder="Açıklama"
                      className="h-8 text-sm border-0 bg-transparent focus:bg-background focus:border"
                    />
                  </TableCell>
                  <TableCell className="px-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-7 w-7 p-0 text-destructive hover:text-destructive"
                      onClick={() => handleDeleteRow(row.id)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </CardContent>

      {/* Excel Name Dialog */}
      <Dialog open={excelNameDialogOpen} onOpenChange={setExcelNameDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <FileSpreadsheet className="h-5 w-5 text-primary" />
              Excel Dosya Adı
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <Input
              value={excelFileName}
              onChange={(e) => setExcelFileName(e.target.value)}
              placeholder="Dosya adı..."
              className="h-11"
            />
            <p className="text-sm text-muted-foreground">
              Dosya .xlsx uzantısıyla kaydedilecektir.
            </p>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setExcelNameDialogOpen(false)}>
              İptal
            </Button>
            <Button onClick={exportToExcel} disabled={!excelFileName.trim()}>
              <Download className="h-4 w-4 mr-2" />
              İndir
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Image Generator */}
      <ImageGenerator 
        open={imageGenOpen} 
        onOpenChange={setImageGenOpen}
        images={imageGenImages}
        title="TAHA GİYİM - Siparişler"
      />
    </Card>
  );
}
