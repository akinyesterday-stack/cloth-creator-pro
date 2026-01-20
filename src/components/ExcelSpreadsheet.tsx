import { useState, useEffect, useCallback, useRef, KeyboardEvent, ClipboardEvent } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { 
  Plus, Trash2, Save, Download, FileSpreadsheet, 
  ArrowUpDown, Loader2, Copy, Clipboard, Check
} from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
import ExcelJS from "exceljs";
import { format } from "date-fns";
import { cn } from "@/lib/utils";

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
  status: string;
  description: string | null;
  isNew?: boolean;
  isModified?: boolean;
}

interface CellPosition {
  row: number;
  col: number;
}

const COLUMNS = [
  { key: "order_name", label: "Model Adı", width: "min-w-[150px]", type: "text" },
  { key: "fabric_type", label: "Kumaş Türü", width: "min-w-[150px]", type: "text" },
  { key: "usage_area", label: "Kullanım Yeri", width: "min-w-[130px]", type: "text" },
  { key: "en", label: "En (cm)", width: "w-[80px]", type: "number" },
  { key: "gramaj", label: "Gramaj (gr)", width: "w-[90px]", type: "number" },
  { key: "price", label: "Fiyat (₺)", width: "w-[90px]", type: "number" },
  { key: "termin_date", label: "Termin", width: "w-[130px]", type: "date" },
  { key: "status", label: "Durum", width: "w-[120px]", type: "select" },
  { key: "description", label: "Açıklama", width: "min-w-[150px]", type: "text" },
];

const statusOptions = [
  { value: "pending", label: "Beklemede", color: "bg-yellow-500/20 text-yellow-700 border-yellow-500/50" },
  { value: "processing", label: "İşleniyor", color: "bg-blue-500/20 text-blue-700 border-blue-500/50" },
  { value: "completed", label: "Tamamlandı", color: "bg-green-500/20 text-green-700 border-green-500/50" },
  { value: "cancelled", label: "İptal", color: "bg-red-500/20 text-destructive border-red-500/50" },
];

export function ExcelSpreadsheet() {
  const { user } = useAuth();
  const [rows, setRows] = useState<OrderRow[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("asc");
  
  // Excel-like selection state
  const [selectedCell, setSelectedCell] = useState<CellPosition | null>(null);
  const [selectionStart, setSelectionStart] = useState<CellPosition | null>(null);
  const [selectionEnd, setSelectionEnd] = useState<CellPosition | null>(null);
  const [isSelecting, setIsSelecting] = useState(false);
  const [editingCell, setEditingCell] = useState<CellPosition | null>(null);
  const [copiedCells, setCopiedCells] = useState<string[][] | null>(null);
  
  const tableRef = useRef<HTMLTableElement>(null);
  const inputRefs = useRef<Map<string, HTMLInputElement>>(new Map());

  useEffect(() => {
    if (user) loadOrders();
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

      const mappedData: OrderRow[] = (data || []).map((order) => ({
        id: order.id,
        order_name: order.order_name,
        model_image: order.model_image,
        fabric_type: order.fabric_type,
        usage_area: order.usage_area,
        en: order.en,
        gramaj: order.gramaj,
        price: order.price,
        termin_date: order.termin_date,
        status: order.status,
        description: order.description,
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
      status: "pending",
      description: null,
      isNew: true,
      isModified: false,
    };
    setRows([...rows, newRow]);
    
    // Focus the first cell of new row
    setTimeout(() => {
      setSelectedCell({ row: rows.length, col: 0 });
      setEditingCell({ row: rows.length, col: 0 });
    }, 50);
  };

  const handleCellChange = (rowIndex: number, colKey: string, value: string | number | null) => {
    setRows(rows.map((row, idx) => {
      if (idx === rowIndex) {
        const column = COLUMNS.find(c => c.key === colKey);
        let processedValue = value;
        
        if (column?.type === "number" && value !== null && value !== "") {
          processedValue = Number(value);
        }
        
        return { ...row, [colKey]: processedValue, isModified: true };
      }
      return row;
    }));
  };

  const handleDeleteRow = async (rowIndex: number) => {
    const row = rows[rowIndex];
    
    if (row?.isNew) {
      setRows(rows.filter((_, idx) => idx !== rowIndex));
      return;
    }

    try {
      const { error } = await supabase.from("orders").delete().eq("id", row.id);
      if (error) throw error;
      setRows(rows.filter((_, idx) => idx !== rowIndex));
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
        const orderData = {
          user_id: user.id,
          order_name: row.order_name || "İsimsiz Sipariş",
          model_image: row.model_image,
          fabric_type: row.fabric_type,
          usage_area: row.usage_area,
          en: row.en,
          gramaj: row.gramaj,
          price: row.price || 0,
          termin_date: row.termin_date,
          status: row.status,
          description: row.description,
        };

        if (row.isNew) {
          const { data, error } = await supabase
            .from("orders")
            .insert(orderData)
            .select()
            .single();

          if (error) throw error;
          
          setRows(prev => prev.map((r, idx) => 
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
            r.id === row.id ? { ...r, isModified: false } : r
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

  // Excel-like keyboard navigation
  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    if (!selectedCell) return;

    const { row, col } = selectedCell;
    const maxRow = rows.length - 1;
    const maxCol = COLUMNS.length - 1;

    switch (e.key) {
      case "ArrowUp":
        if (!editingCell) {
          e.preventDefault();
          setSelectedCell({ row: Math.max(0, row - 1), col });
        }
        break;
      case "ArrowDown":
        if (!editingCell) {
          e.preventDefault();
          setSelectedCell({ row: Math.min(maxRow, row + 1), col });
        }
        break;
      case "ArrowLeft":
        if (!editingCell) {
          e.preventDefault();
          setSelectedCell({ row, col: Math.max(0, col - 1) });
        }
        break;
      case "ArrowRight":
        if (!editingCell) {
          e.preventDefault();
          setSelectedCell({ row, col: Math.min(maxCol, col + 1) });
        }
        break;
      case "Tab":
        e.preventDefault();
        if (e.shiftKey) {
          if (col > 0) {
            setSelectedCell({ row, col: col - 1 });
          } else if (row > 0) {
            setSelectedCell({ row: row - 1, col: maxCol });
          }
        } else {
          if (col < maxCol) {
            setSelectedCell({ row, col: col + 1 });
          } else if (row < maxRow) {
            setSelectedCell({ row: row + 1, col: 0 });
          }
        }
        setEditingCell(null);
        break;
      case "Enter":
        e.preventDefault();
        if (editingCell) {
          setEditingCell(null);
          setSelectedCell({ row: Math.min(maxRow, row + 1), col });
        } else {
          setEditingCell(selectedCell);
        }
        break;
      case "Escape":
        setEditingCell(null);
        break;
      case "F2":
        e.preventDefault();
        setEditingCell(selectedCell);
        break;
      case "Delete":
      case "Backspace":
        if (!editingCell) {
          e.preventDefault();
          handleCellChange(row, COLUMNS[col].key, null);
        }
        break;
      case "c":
        if (e.ctrlKey || e.metaKey) {
          handleCopy();
        }
        break;
      case "v":
        if (e.ctrlKey || e.metaKey) {
          handlePaste();
        }
        break;
    }
  }, [selectedCell, editingCell, rows]);

  const handleCopy = () => {
    if (!selectedCell) return;
    
    const start = selectionStart || selectedCell;
    const end = selectionEnd || selectedCell;
    
    const minRow = Math.min(start.row, end.row);
    const maxRow = Math.max(start.row, end.row);
    const minCol = Math.min(start.col, end.col);
    const maxCol = Math.max(start.col, end.col);
    
    const copied: string[][] = [];
    for (let r = minRow; r <= maxRow; r++) {
      const rowData: string[] = [];
      for (let c = minCol; c <= maxCol; c++) {
        const value = rows[r]?.[COLUMNS[c].key as keyof OrderRow];
        rowData.push(value?.toString() || "");
      }
      copied.push(rowData);
    }
    
    setCopiedCells(copied);
    
    // Also copy to clipboard as tab-separated
    const clipboardText = copied.map(row => row.join("\t")).join("\n");
    navigator.clipboard.writeText(clipboardText);
    toast.success("Kopyalandı");
  };

  const handlePaste = async () => {
    if (!selectedCell) return;
    
    try {
      const clipboardText = await navigator.clipboard.readText();
      const pastedRows = clipboardText.split("\n").map(row => row.split("\t"));
      
      const newRows = [...rows];
      pastedRows.forEach((pasteRow, rIdx) => {
        const targetRow = selectedCell.row + rIdx;
        if (targetRow >= newRows.length) return;
        
        pasteRow.forEach((value, cIdx) => {
          const targetCol = selectedCell.col + cIdx;
          if (targetCol >= COLUMNS.length) return;
          
          const colKey = COLUMNS[targetCol].key;
          const colType = COLUMNS[targetCol].type;
          
          let processedValue: any = value;
          if (colType === "number" && value) {
            processedValue = Number(value.replace(",", "."));
            if (isNaN(processedValue)) processedValue = null;
          }
          
          newRows[targetRow] = {
            ...newRows[targetRow],
            [colKey]: processedValue || null,
            isModified: true,
          };
        });
      });
      
      setRows(newRows);
      toast.success("Yapıştırıldı");
    } catch (error) {
      console.error("Paste error:", error);
    }
  };

  const handleCellMouseDown = (row: number, col: number) => {
    setSelectedCell({ row, col });
    setSelectionStart({ row, col });
    setSelectionEnd({ row, col });
    setIsSelecting(true);
  };

  const handleCellMouseEnter = (row: number, col: number) => {
    if (isSelecting) {
      setSelectionEnd({ row, col });
    }
  };

  const handleCellMouseUp = () => {
    setIsSelecting(false);
  };

  const isCellSelected = (row: number, col: number): boolean => {
    if (!selectionStart || !selectionEnd) {
      return selectedCell?.row === row && selectedCell?.col === col;
    }
    
    const minRow = Math.min(selectionStart.row, selectionEnd.row);
    const maxRow = Math.max(selectionStart.row, selectionEnd.row);
    const minCol = Math.min(selectionStart.col, selectionEnd.col);
    const maxCol = Math.max(selectionStart.col, selectionEnd.col);
    
    return row >= minRow && row <= maxRow && col >= minCol && col <= maxCol;
  };

  const isCellFocused = (row: number, col: number): boolean => {
    return selectedCell?.row === row && selectedCell?.col === col;
  };

  const exportToExcel = async () => {
    if (rows.length === 0) {
      toast.error("İndirilecek sipariş bulunamadı");
      return;
    }

    const workbook = new ExcelJS.Workbook();
    workbook.creator = "Kumaş Tedarik Sistemi";
    const worksheet = workbook.addWorksheet("Siparişler");

    worksheet.columns = [
      { header: "Model Adı", key: "modelAdi", width: 25 },
      { header: "Kumaş Türü", key: "kumasTuru", width: 30 },
      { header: "Kullanım Yeri", key: "kullanimYeri", width: 25 },
      { header: "En (CM)", key: "en", width: 12 },
      { header: "Gramaj (GR)", key: "gramaj", width: 12 },
      { header: "Fiyat (₺)", key: "fiyat", width: 12 },
      { header: "Termin", key: "termin", width: 15 },
      { header: "Durum", key: "durum", width: 15 },
      { header: "Açıklama", key: "aciklama", width: 30 },
    ];

    const headerRow = worksheet.getRow(1);
    headerRow.height = 25;
    headerRow.eachCell((cell) => {
      cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "2563EB" } };
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
        modelAdi: row.order_name,
        kumasTuru: row.fabric_type || "",
        kullanimYeri: row.usage_area || "",
        en: row.en || "",
        gramaj: row.gramaj || "",
        fiyat: row.price || "",
        termin: row.termin_date ? format(new Date(row.termin_date), "d.MM.yyyy") : "",
        durum: statusLabel,
        aciklama: row.description || "",
      });

      dataRow.height = 25;
      dataRow.eachCell((cell) => {
        cell.alignment = { horizontal: "center", vertical: "middle" };
        cell.border = {
          top: { style: "thin", color: { argb: "D1D5DB" } },
          bottom: { style: "thin", color: { argb: "D1D5DB" } },
          left: { style: "thin", color: { argb: "D1D5DB" } },
          right: { style: "thin", color: { argb: "D1D5DB" } },
        };
      });
    }

    const buffer = await workbook.xlsx.writeBuffer();
    const blob = new Blob([buffer], {
      type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `siparisler_${new Date().toISOString().split("T")[0]}.xlsx`;
    link.click();
    URL.revokeObjectURL(url);
    toast.success("Excel dosyası indirildi");
  };

  const hasModifications = rows.some(r => r.isModified || r.isNew);

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
            <Badge variant="outline" className="ml-2 text-xs">
              Excel Modu
            </Badge>
          </CardTitle>
          <div className="flex items-center gap-2 flex-wrap">
            <Button variant="outline" size="sm" onClick={handleCopy} disabled={!selectedCell}>
              <Copy className="h-4 w-4 mr-1" />
              Kopyala
            </Button>
            <Button variant="outline" size="sm" onClick={handlePaste}>
              <Clipboard className="h-4 w-4 mr-1" />
              Yapıştır
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setSortOrder(sortOrder === "asc" ? "desc" : "asc")}
            >
              <ArrowUpDown className="h-4 w-4 mr-1" />
              Termin {sortOrder === "asc" ? "↑" : "↓"}
            </Button>
            <Button variant="outline" size="sm" onClick={exportToExcel}>
              <Download className="h-4 w-4 mr-1" />
              Excel
            </Button>
            <Button size="sm" onClick={handleAddRow}>
              <Plus className="h-4 w-4 mr-1" />
              Satır
            </Button>
            {hasModifications && (
              <Button
                size="sm"
                onClick={handleSaveAll}
                disabled={isSaving}
                className="bg-green-600 hover:bg-green-700"
              >
                {isSaving ? (
                  <Loader2 className="h-4 w-4 animate-spin mr-1" />
                ) : (
                  <Save className="h-4 w-4 mr-1" />
                )}
                Kaydet
              </Button>
            )}
          </div>
        </div>
        <p className="text-xs text-muted-foreground mt-2">
          💡 Klavye: Ok tuşları ile gezin, Enter ile düzenleyin, Tab ile ilerleyin, Ctrl+C/V kopyala-yapıştır
        </p>
      </CardHeader>
      <CardContent className="p-0 overflow-x-auto">
        <div 
          className="relative" 
          onKeyDown={handleKeyDown as any}
          onMouseUp={handleCellMouseUp}
          tabIndex={0}
        >
          <table ref={tableRef} className="w-full border-collapse text-sm">
            <thead>
              <tr className="bg-muted/70 border-b-2 border-border">
                <th className="w-[40px] p-2 text-center font-semibold text-muted-foreground border-r">#</th>
                {COLUMNS.map((col, idx) => (
                  <th 
                    key={col.key} 
                    className={cn(
                      "p-2 text-left font-semibold text-muted-foreground border-r",
                      col.width
                    )}
                  >
                    {col.label}
                  </th>
                ))}
                <th className="w-[50px] p-2"></th>
              </tr>
            </thead>
            <tbody>
              {rows.length === 0 ? (
                <tr>
                  <td colSpan={COLUMNS.length + 2} className="text-center py-12 text-muted-foreground">
                    <FileSpreadsheet className="h-12 w-12 mx-auto mb-3 opacity-30" />
                    <p>Henüz sipariş bulunmuyor</p>
                    <p className="text-sm">Yeni satır ekleyerek başlayın</p>
                  </td>
                </tr>
              ) : (
                rows.map((row, rowIndex) => (
                  <tr 
                    key={row.id} 
                    className={cn(
                      "border-b hover:bg-muted/30 transition-colors",
                      row.isNew && "bg-green-50 dark:bg-green-950/20",
                      row.isModified && !row.isNew && "bg-yellow-50 dark:bg-yellow-950/20"
                    )}
                  >
                    <td className="p-1 text-center text-xs text-muted-foreground border-r bg-muted/30 font-mono">
                      {rowIndex + 1}
                      {(row.isNew || row.isModified) && (
                        <span className={cn(
                          "inline-block w-2 h-2 rounded-full ml-1",
                          row.isNew ? "bg-green-500" : "bg-yellow-500"
                        )} />
                      )}
                    </td>
                    {COLUMNS.map((col, colIndex) => {
                      const isEditing = editingCell?.row === rowIndex && editingCell?.col === colIndex;
                      const isSelected = isCellSelected(rowIndex, colIndex);
                      const isFocused = isCellFocused(rowIndex, colIndex);
                      const value = row[col.key as keyof OrderRow];

                      return (
                        <td 
                          key={col.key}
                          className={cn(
                            "p-0 border-r relative",
                            col.width,
                            isSelected && "bg-primary/10",
                            isFocused && "ring-2 ring-inset ring-primary"
                          )}
                          onMouseDown={() => handleCellMouseDown(rowIndex, colIndex)}
                          onMouseEnter={() => handleCellMouseEnter(rowIndex, colIndex)}
                          onDoubleClick={() => setEditingCell({ row: rowIndex, col: colIndex })}
                        >
                          {col.type === "select" ? (
                            <Select
                              value={value as string}
                              onValueChange={(v) => handleCellChange(rowIndex, col.key, v)}
                            >
                              <SelectTrigger className="h-8 text-xs border-0 bg-transparent rounded-none">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                {statusOptions.map((opt) => (
                                  <SelectItem key={opt.value} value={opt.value}>
                                    <Badge variant="outline" className={cn("text-xs", opt.color)}>
                                      {opt.label}
                                    </Badge>
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          ) : isEditing ? (
                            <Input
                              type={col.type === "date" ? "date" : col.type === "number" ? "number" : "text"}
                              value={value?.toString() || ""}
                              onChange={(e) => handleCellChange(rowIndex, col.key, e.target.value)}
                              onBlur={() => setEditingCell(null)}
                              onKeyDown={(e) => {
                                if (e.key === "Enter") setEditingCell(null);
                                if (e.key === "Escape") setEditingCell(null);
                              }}
                              className="h-8 text-xs border-0 bg-transparent rounded-none focus:ring-0 focus:ring-offset-0"
                              autoFocus
                              step={col.type === "number" ? "0.01" : undefined}
                            />
                          ) : (
                            <div className="px-2 py-1.5 min-h-[32px] text-xs truncate cursor-cell">
                              {col.type === "date" && value 
                                ? format(new Date(value as string), "dd.MM.yyyy")
                                : value?.toString() || ""
                              }
                            </div>
                          )}
                        </td>
                      );
                    })}
                    <td className="p-1 text-center">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDeleteRow(rowIndex)}
                        className="h-7 w-7 p-0 text-muted-foreground hover:text-destructive"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  );
}
