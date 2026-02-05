import { useState, useEffect, useRef } from "react";
import { Header } from "@/components/Header";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Search, Trash2, Calendar, Package, ArrowLeft, Loader2, Download, FileSpreadsheet, Pencil, Check, X, Upload, Image, ArrowUpDown, Plus, SendHorizontal, Copy, FileImage } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
import { useNavigate, useSearchParams } from "react-router-dom";
import { format } from "date-fns";
import { tr } from "date-fns/locale";
import ExcelJS from "exceljs";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { ImageGenerator } from "@/components/ImageGenerator";

interface FabricItem {
  id: string;
  fabricType: string;
  usageArea: string;
  en: number;
  gramaj: number;
  fiyat: number;
  priceExpected?: boolean;
  printType?: string; // baskılı tipi: fon, zemin, boyalı, pigment, aşındırma
   boyahane?: string; // boyahane ismi
}

interface SavedCost {
  id: string;
  model_name: string;
  items: FabricItem[];
  images: string[];
  total_cost: number;
  created_at: string;
  updated_at: string;
}

const SavedCosts = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [costs, setCosts] = useState<SavedCost[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc");
  
  // Edit states
  const [editingModelId, setEditingModelId] = useState<string | null>(null);
  const [editModelName, setEditModelName] = useState("");
  const [editingImagesId, setEditingImagesId] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  // Edit items dialog
  const [editingItemsCostId, setEditingItemsCostId] = useState<string | null>(null);
  const [editingItems, setEditingItems] = useState<FabricItem[]>([]);

  // Image generator
  const [imageGenOpen, setImageGenOpen] = useState(false);
  const [imageGenImages, setImageGenImages] = useState<Array<{ src: string; label: string }>>([]);

  // Row selection for import
  const [selectedRowsForImport, setSelectedRowsForImport] = useState<Set<string>>(new Set());
  const [importDialogOpen, setImportDialogOpen] = useState(false);
  const [importModelName, setImportModelName] = useState("");
  const [importSourceCost, setImportSourceCost] = useState<SavedCost | null>(null);

  useEffect(() => {
    if (user) {
      loadCosts();
    }
  }, [user, sortOrder]);

  const loadCosts = async () => {
    if (!user) return;
    
    try {
      const { data, error } = await supabase
        .from("saved_costs")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: sortOrder === "asc" });

      if (error) throw error;
      
      const parsedData = (data || []).map(item => ({
        ...item,
        items: Array.isArray(item.items) ? item.items : JSON.parse(item.items as string || '[]'),
        total_cost: Number(item.total_cost)
      })) as SavedCost[];
      
      setCosts(parsedData);
    } catch (error) {
      console.error("Error loading costs:", error);
      toast.error("Maliyetler yüklenirken hata oluştu");
    } finally {
      setIsLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      const { error } = await supabase
        .from("saved_costs")
        .delete()
        .eq("id", id);

      if (error) throw error;
      
      setCosts(costs.filter(c => c.id !== id));
      setSelectedIds(prev => {
        const next = new Set(prev);
        next.delete(id);
        return next;
      });
      toast.success("Maliyet silindi");
    } catch (error) {
      console.error("Error deleting cost:", error);
      toast.error("Silme işlemi başarısız");
    }
  };

  // Model name editing
  const handleStartEditModelName = (cost: SavedCost) => {
    setEditingModelId(cost.id);
    setEditModelName(cost.model_name);
  };

  const handleSaveModelName = async () => {
    if (!editingModelId || !editModelName.trim()) return;
    
    try {
      const { error } = await supabase
        .from("saved_costs")
        .update({ model_name: editModelName.trim() })
        .eq("id", editingModelId);

      if (error) throw error;
      
      setCosts(costs.map(c => 
        c.id === editingModelId ? { ...c, model_name: editModelName.trim() } : c
      ));
      setEditingModelId(null);
      setEditModelName("");
      toast.success("Model adı güncellendi");
    } catch (error) {
      console.error("Error updating model name:", error);
      toast.error("Güncelleme başarısız");
    }
  };

  const handleCancelEditModelName = () => {
    setEditingModelId(null);
    setEditModelName("");
  };

  // Image editing
  const handleStartEditImages = (costId: string) => {
    setEditingImagesId(costId);
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>, costId: string) => {
    if (!e.target.files || e.target.files.length === 0) return;
    
    const cost = costs.find(c => c.id === costId);
    if (!cost) return;

    const files = Array.from(e.target.files).slice(0, 10 - (cost.images?.length || 0));
    const readers = files.map(
      (file) =>
        new Promise<string>((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = () => resolve(reader.result as string);
          reader.onerror = () => reject(new Error("File read error"));
          reader.readAsDataURL(file);
        })
    );

    try {
      const newImages = await Promise.all(readers);
      const updatedImages = [...(cost.images || []), ...newImages].slice(0, 10);
      
      const { error } = await supabase
        .from("saved_costs")
        .update({ images: updatedImages })
        .eq("id", costId);

      if (error) throw error;
      
      setCosts(costs.map(c => 
        c.id === costId ? { ...c, images: updatedImages } : c
      ));
      toast.success("Resimler eklendi");
    } catch (error) {
      console.error("Error uploading images:", error);
      toast.error("Resim yükleme başarısız");
    }
    
    e.target.value = "";
  };

  const handleRemoveImage = async (costId: string, imageIndex: number) => {
    const cost = costs.find(c => c.id === costId);
    if (!cost) return;

    const updatedImages = cost.images.filter((_, i) => i !== imageIndex);
    
    try {
      const { error } = await supabase
        .from("saved_costs")
        .update({ images: updatedImages })
        .eq("id", costId);

      if (error) throw error;
      
      setCosts(costs.map(c => 
        c.id === costId ? { ...c, images: updatedImages } : c
      ));
      toast.success("Resim silindi");
    } catch (error) {
      console.error("Error removing image:", error);
      toast.error("Resim silme başarısız");
    }
  };

  const handleCloseImageEdit = () => {
    setEditingImagesId(null);
  };

  // Item editing functions
  const handleStartEditItems = (cost: SavedCost) => {
    setEditingItemsCostId(cost.id);
    setEditingItems([...cost.items]);
  };

  const handleAddNewItem = () => {
    const newItem: FabricItem = {
      id: crypto.randomUUID(),
      fabricType: "",
      usageArea: "",
      en: 0,
      gramaj: 0,
      fiyat: 0,
    };
    setEditingItems([...editingItems, newItem]);
  };

  const handleUpdateItem = (index: number, field: keyof FabricItem, value: string | number) => {
    const updated = [...editingItems];
    updated[index] = { ...updated[index], [field]: value };
    setEditingItems(updated);
  };

  const handleRemoveItem = (index: number) => {
    setEditingItems(editingItems.filter((_, i) => i !== index));
  };

  const handleSaveItems = async () => {
    if (!editingItemsCostId) return;
    
    const validItems = editingItems.filter(item => item.fabricType.trim());
    const totalCost = validItems.reduce((sum, item) => sum + item.fiyat, 0);
    
    try {
      const { error } = await supabase
        .from("saved_costs")
        .update({ 
          items: JSON.parse(JSON.stringify(validItems)),
          total_cost: totalCost
        })
        .eq("id", editingItemsCostId);

      if (error) throw error;
      
      setCosts(costs.map(c => 
        c.id === editingItemsCostId 
          ? { ...c, items: validItems, total_cost: totalCost } 
          : c
      ));
      setEditingItemsCostId(null);
      setEditingItems([]);
      toast.success("Kalemler güncellendi");
    } catch (error) {
      console.error("Error updating items:", error);
      toast.error("Güncelleme başarısız");
    }
  };

  const handleCancelEditItems = () => {
    setEditingItemsCostId(null);
    setEditingItems([]);
  };

  // Transfer to orders
  const handleTransferToOrders = async (cost: SavedCost) => {
    if (!user) return;

    try {
      // Create an order for each item in the cost
      for (const item of cost.items) {
        await supabase
          .from("orders")
          .insert({
            user_id: user.id,
            order_name: cost.model_name,
            model_image: cost.images && cost.images.length > 0 ? cost.images[0] : null,
            fabric_type: item.fabricType,
            usage_area: item.usageArea,
            en: item.en,
            gramaj: item.gramaj,
            price: item.fiyat,
            status: "pending",
          });
      }

      toast.success(`"${cost.model_name}" siparişlere aktarıldı (${cost.items.length} kalem)`);
    } catch (error) {
      console.error("Error transferring to orders:", error);
      toast.error("Siparişe aktarma başarısız");
    }
  };

  // Send items to new cost calculation
  const handleSendToNewCost = (cost: SavedCost) => {
    // Navigate to main page with items in URL state
    const itemsData = encodeURIComponent(JSON.stringify({
      modelName: cost.model_name,
      items: cost.items,
      images: cost.images,
    }));
    navigate(`/?importCost=${itemsData}`);
    toast.success(`"${cost.model_name}" maliyete aktarılıyor...`);
  };

  // Open row selection dialog for a specific cost
  const handleOpenRowImportDialog = (cost: SavedCost) => {
    setImportSourceCost(cost);
    setSelectedRowsForImport(new Set());
    setImportModelName("");
    setImportDialogOpen(true);
  };

  // Toggle row selection for import - use index as fallback if id is undefined
  const handleToggleRowForImport = (itemId: string, index: number) => {
    const key = itemId || `item-${index}`;
    setSelectedRowsForImport(prev => {
      const next = new Set(prev);
      if (next.has(key)) {
        next.delete(key);
      } else {
        next.add(key);
      }
      return next;
    });
  };

  // Select all rows for import
  const handleSelectAllRowsForImport = () => {
    if (!importSourceCost) return;
    const allKeys = importSourceCost.items.map((item, idx) => item.id || `item-${idx}`);
    if (selectedRowsForImport.size === allKeys.length) {
      setSelectedRowsForImport(new Set());
    } else {
      setSelectedRowsForImport(new Set(allKeys));
    }
  };

  // Confirm and send selected rows to new cost
  const handleConfirmRowImport = () => {
    if (!importSourceCost || selectedRowsForImport.size === 0 || !importModelName.trim()) {
      toast.error("Model adı giriniz ve en az bir satır seçiniz");
      return;
    }

    const selectedItems = importSourceCost.items.filter((item, idx) => {
      const key = item.id || `item-${idx}`;
      return selectedRowsForImport.has(key);
    });
    const itemsData = encodeURIComponent(JSON.stringify({
      modelName: importModelName.trim(),
      items: selectedItems,
      images: importSourceCost.images,
    }));
    
    navigate(`/?importCost=${itemsData}`);
    toast.success(`${selectedItems.length} satır "${importModelName}" modeline aktarılıyor...`);
    
    setImportDialogOpen(false);
    setImportSourceCost(null);
    setSelectedRowsForImport(new Set());
    setImportModelName("");
  };

  // Open image generator with selected costs
  const handleOpenImageGenerator = () => {
    const selected = costs.filter(c => selectedIds.has(c.id));
    if (selected.length === 0) {
      toast.error("Lütfen en az bir model seçin");
      return;
    }
    
    const images = selected.flatMap(cost => 
      (cost.images || []).map(img => ({
        src: img,
        label: cost.model_name,
      }))
    );
    
    if (images.length === 0) {
      toast.error("Seçili modellerde resim bulunamadı");
      return;
    }
    
    setImageGenImages(images);
    setImageGenOpen(true);
  };

  const handleSelectToggle = (id: string) => {
    setSelectedIds(prev => {
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
    if (selectedIds.size === filteredCosts.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(filteredCosts.map(c => c.id)));
    }
  };

  // Print type colors for Excel
  const PRINT_TYPE_COLORS: Record<string, string> = {
    "fon": "FFE4C4",
    "zemin": "D4E4BC",
    "boyalı": "E4D4F4",
    "pigment": "F4D4E4",
    "aşındırma": "D4E4F4",
  };

  // Excel export function for given costs
  const exportToExcel = async (costsToExport: SavedCost[]) => {
    if (costsToExport.length === 0) {
      toast.error("İndirilecek maliyet bulunamadı");
      return;
    }

    const workbook = new ExcelJS.Workbook();
    workbook.creator = 'Maliyet Hesaplayıcı';
    workbook.created = new Date();
    
    const worksheet = workbook.addWorksheet('Maliyet Listesi', {
      views: [{ showGridLines: true }]
    });

    worksheet.columns = [
      { header: 'Resim', key: 'resim', width: 40 },
      { header: 'Model Adı', key: 'modelAdi', width: 20 },
      { header: 'Kumaş Türü', key: 'kumasTuru', width: 45 },
      { header: 'Kullanım Yeri', key: 'kullanimYeri', width: 35 },
      { header: 'En (CM)', key: 'en', width: 12 },
      { header: 'Gramaj (GR)', key: 'gramaj', width: 14 },
      { header: 'Fiyat (₺)', key: 'fiyat', width: 14 },
      { header: 'Birim Gramaj', key: 'birimGramaj', width: 14 },
      { header: 'Boyahane', key: 'boyahane', width: 18 },
    ];

    const headerRow = worksheet.getRow(1);
    headerRow.height = 30;
    headerRow.eachCell((cell) => {
      cell.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: '2563EB' }
      };
      cell.font = { bold: true, color: { argb: 'FFFFFF' }, size: 12 };
      cell.alignment = { horizontal: 'center', vertical: 'middle' };
      cell.border = {
        top: { style: 'medium', color: { argb: '1E40AF' } },
        bottom: { style: 'medium', color: { argb: '1E40AF' } },
        left: { style: 'medium', color: { argb: '1E40AF' } },
        right: { style: 'medium', color: { argb: '1E40AF' } }
      };
    });

    let currentRow = 2;

    for (const cost of costsToExport) {
      if (cost.items.length === 0) continue;

      const startRow = currentRow;
      const rowCount = cost.items.length;

      for (let i = 0; i < cost.items.length; i++) {
        const item = cost.items[i];
        const row = worksheet.addRow({
          resim: '',
          modelAdi: i === 0 ? cost.model_name : '',
          kumasTuru: item.fabricType + (item.printType ? ` (${item.printType.toUpperCase()})` : ''),
          kullanimYeri: item.usageArea,
          en: item.en,
          gramaj: item.gramaj,
          fiyat: item.priceExpected ? 'FİYAT BEKLENİYOR' : item.fiyat,
          birimGramaj: '',
          boyahane: item.boyahane || '',
        });

        row.height = 60;

        // Get print type color for baskılı items
        const printTypeColor = item.printType ? PRINT_TYPE_COLORS[item.printType] : null;

        row.eachCell((cell, colNumber) => {
          cell.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true };
          
          if (colNumber <= 2) {
            cell.fill = {
              type: 'pattern',
              pattern: 'solid',
              fgColor: { argb: 'DBEAFE' }
            };
            cell.font = { bold: true, size: 11 };
          }
          
          // Apply print type color to fabric type column
          if (colNumber === 3 && printTypeColor) {
            cell.fill = {
              type: 'pattern',
              pattern: 'solid',
              fgColor: { argb: printTypeColor }
            };
          }
          
          cell.border = {
            top: { style: 'thin', color: { argb: 'D1D5DB' } },
            bottom: { style: 'thin', color: { argb: 'D1D5DB' } },
            left: { style: 'thin', color: { argb: 'D1D5DB' } },
            right: { style: 'thin', color: { argb: 'D1D5DB' } }
          };
        });

        currentRow++;
      }

      if (rowCount > 1) {
        worksheet.mergeCells(startRow, 1, startRow + rowCount - 1, 1);
        worksheet.mergeCells(startRow, 2, startRow + rowCount - 1, 2);
      }

      // Add image(s) if exists
      if (cost.images && cost.images.length > 0) {
        try {
          const composeImagesHorizontal = async (images: string[]) => {
            const load = (src: string) =>
              new Promise<HTMLImageElement>((resolve, reject) => {
                const img = new window.Image();
                img.onload = () => resolve(img);
                img.onerror = reject;
                img.src = src;
              });

            const imgs = await Promise.all(images.map(load));
            const maxH = Math.max(...imgs.map((i) => i.naturalHeight || i.height));
            const gap = 16;

            const scaled = imgs.map((img) => {
              const h = maxH;
              const w = Math.round(((img.naturalWidth || img.width) / (img.naturalHeight || img.height)) * h);
              return { img, w, h };
            });

            const totalW = scaled.reduce((sum, s) => sum + s.w, 0) + gap * (scaled.length - 1);

            const canvas = document.createElement("canvas");
            canvas.width = Math.min(totalW, 2400);
            const scaleDown = canvas.width / totalW;
            canvas.height = Math.round(maxH * scaleDown);

            const ctx = canvas.getContext("2d");
            if (!ctx) throw new Error("Canvas not supported");

            ctx.fillStyle = "#FFFFFF";
            ctx.fillRect(0, 0, canvas.width, canvas.height);

            let x = 0;
            for (const s of scaled) {
              const w = Math.round(s.w * scaleDown);
              const h = Math.round(s.h * scaleDown);
              ctx.drawImage(s.img, x, 0, w, h);
              x += w + Math.round(gap * scaleDown);
            }

            return canvas.toDataURL("image/png");
          };

          const composite =
            cost.images.length === 1 ? cost.images[0] : await composeImagesHorizontal(cost.images);

          const base64Match = composite.match(/^data:image\/(png|jpeg|jpg|gif);base64,(.+)$/);
          if (base64Match) {
            const extRaw = base64Match[1];
            const base64Data = base64Match[2];
            const extension = (extRaw === "jpg" ? "jpeg" : extRaw) as "png" | "jpeg" | "gif";

            const imageId = workbook.addImage({
              base64: base64Data,
              extension,
            });

            const colWidthPx = 40 * 7;
            const rowHeightPt = 60;
            const totalRowHeightPx = rowHeightPt * rowCount * 1.33;

            const paddingPx = 8;
            const availableWidth = colWidthPx - paddingPx * 2;
            const availableHeight = totalRowHeightPx - paddingPx * 2;

            const imageWidth = availableWidth;
            const imageHeight = availableHeight;

            const colOffset = paddingPx / colWidthPx;
            const rowOffset = paddingPx / (rowHeightPt * 1.33);

            worksheet.addImage(imageId, {
              tl: { col: colOffset, row: startRow - 1 + rowOffset },
              ext: { width: imageWidth, height: imageHeight },
            });
          }
        } catch (error) {
          console.error("Image processing error:", error);
        }
      }

      // Apply thick borders around the entire model group
      for (let r = startRow; r < startRow + rowCount; r++) {
        const row = worksheet.getRow(r);
        for (let c = 1; c <= 8; c++) {
          const cell = row.getCell(c);
          const existingBorder = cell.border || {};
          
          cell.border = {
            top: r === startRow 
              ? { style: 'medium', color: { argb: '2563EB' } }
              : existingBorder.top,
            bottom: r === startRow + rowCount - 1 
              ? { style: 'medium', color: { argb: '2563EB' } }
              : existingBorder.bottom,
            left: c === 1 
              ? { style: 'medium', color: { argb: '2563EB' } }
              : existingBorder.left,
            right: c === 8 
              ? { style: 'medium', color: { argb: '2563EB' } }
              : existingBorder.right,
          };
        }
      }
    }

    const buffer = await workbook.xlsx.writeBuffer();
    const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `maliyet_listesi_${new Date().toISOString().split('T')[0]}.xlsx`;
    link.click();
    URL.revokeObjectURL(url);
    
    toast.success(`${costsToExport.length} model Excel'e aktarıldı`);
  };

  const handleDownloadSingle = (cost: SavedCost) => {
    exportToExcel([cost]);
  };

  const handleDownloadSelected = () => {
    const selected = costs.filter(c => selectedIds.has(c.id));
    exportToExcel(selected);
  };

  const filteredCosts = costs.filter(cost =>
    cost.model_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    cost.items.some(item => 
      item.fabricType.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.usageArea.toLowerCase().includes(searchQuery.toLowerCase())
    )
  );

  return (
    <div className="min-h-screen bg-background">
      <div className="fixed inset-0 gradient-mesh pointer-events-none" />
      
      <Header />
      
      <main className="container mx-auto px-4 py-8 relative z-10">
        <div className="mb-6">
          <Button 
            variant="ghost" 
            onClick={() => navigate("/")}
            className="mb-4"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Geri Dön
          </Button>
          
          <div className="flex items-center justify-between flex-wrap gap-4">
            <div>
              <h1 className="text-3xl font-bold text-gradient">Kayıtlı Maliyetler</h1>
              <p className="text-muted-foreground mt-1">
                Geçmiş maliyet hesaplamalarınızı görüntüleyin ve arayın
              </p>
            </div>
            
            <div className="flex items-center gap-3 flex-wrap">
              <div className="relative w-full sm:w-80">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Model adı, kumaş veya kullanım yeri ara..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>
              
              <Button
                variant="outline"
                onClick={() => setSortOrder(sortOrder === "desc" ? "asc" : "desc")}
                className="gap-2"
              >
                <ArrowUpDown className="h-4 w-4" />
                {sortOrder === "desc" ? "Yeniden Eskiye" : "Eskiden Yeniye"}
              </Button>
              
              {selectedIds.size > 0 && (
                <>
                  <Button 
                    variant="outline"
                    onClick={handleOpenImageGenerator}
                    className="gap-2"
                  >
                    <FileImage className="h-4 w-4" />
                    Resim Oluştur ({selectedIds.size})
                  </Button>
                  <Button 
                    onClick={handleDownloadSelected}
                    className="gap-2"
                  >
                    <FileSpreadsheet className="h-4 w-4" />
                    Seçilenleri İndir ({selectedIds.size})
                  </Button>
                </>
              )}
            </div>
          </div>
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : filteredCosts.length === 0 ? (
          <Card className="glass-card">
            <CardContent className="py-12 text-center">
              <Package className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <h3 className="text-lg font-medium mb-2">
                {searchQuery ? "Sonuç bulunamadı" : "Henüz kayıtlı maliyet yok"}
              </h3>
              <p className="text-muted-foreground">
                {searchQuery 
                  ? "Farklı bir arama terimi deneyin" 
                  : "Maliyet hesaplayıcıdan maliyetlerinizi kaydedin"}
              </p>
            </CardContent>
          </Card>
        ) : (
          <>
            {/* Select All */}
            <div className="flex items-center gap-2 mb-4">
              <Checkbox
                id="select-all"
                checked={selectedIds.size === filteredCosts.length && filteredCosts.length > 0}
                onCheckedChange={handleSelectAll}
              />
              <label htmlFor="select-all" className="text-sm text-muted-foreground cursor-pointer">
                Tümünü Seç ({filteredCosts.length} kayıt)
              </label>
            </div>

            <div className="grid gap-4">
              {filteredCosts.map((cost) => (
                <Card key={cost.id} className="glass-card hover:shadow-lg transition-shadow group">
                  <CardContent className="p-4">
                    <div className="flex items-start gap-4">
                      {/* Checkbox */}
                      <div className="flex items-center pt-1">
                        <Checkbox
                          checked={selectedIds.has(cost.id)}
                          onCheckedChange={() => handleSelectToggle(cost.id)}
                        />
                      </div>

                      {/* Image Preview / Edit */}
                      <div className="shrink-0">
                        {editingImagesId === cost.id ? (
                          <div className="space-y-2">
                            <div className="flex flex-wrap gap-2">
                              {cost.images && cost.images.map((img, idx) => (
                                <div key={idx} className="relative group">
                                  <img 
                                    src={img} 
                                    alt={`Model ${idx + 1}`} 
                                    className="h-16 w-16 object-cover rounded border"
                                  />
                                  <button
                                    onClick={() => handleRemoveImage(cost.id, idx)}
                                    className="absolute -top-1 -right-1 bg-destructive text-destructive-foreground rounded-full p-0.5 opacity-0 group-hover:opacity-100 transition-opacity"
                                  >
                                    <X className="h-3 w-3" />
                                  </button>
                                </div>
                              ))}
                              {(!cost.images || cost.images.length < 10) && (
                                <label className="h-16 w-16 border-2 border-dashed border-muted-foreground/30 rounded flex items-center justify-center cursor-pointer hover:border-primary/50 transition-colors">
                                  <Upload className="h-5 w-5 text-muted-foreground" />
                                  <input
                                    type="file"
                                    accept="image/*"
                                    multiple
                                    className="hidden"
                                    onChange={(e) => handleImageUpload(e, cost.id)}
                                  />
                                </label>
                              )}
                            </div>
                            <Button size="sm" variant="outline" onClick={handleCloseImageEdit}>
                              <Check className="h-3 w-3 mr-1" />
                              Tamam
                            </Button>
                          </div>
                        ) : (
                          <div 
                            className="relative group cursor-pointer flex gap-1 flex-wrap"
                            onClick={() => handleStartEditImages(cost.id)}
                          >
                            {cost.images && cost.images.length > 0 ? (
                              <>
                                {cost.images.slice(0, 4).map((img, idx) => (
                                  <div key={idx} className="relative">
                                    <img 
                                      src={img} 
                                      alt={`Model ${idx + 1}`} 
                                      className="h-16 w-16 object-cover rounded-lg border"
                                    />
                                  </div>
                                ))}
                                {cost.images.length > 4 && (
                                  <div className="h-16 w-16 rounded-lg border bg-muted flex items-center justify-center">
                                    <span className="text-sm font-medium text-muted-foreground">+{cost.images.length - 4}</span>
                                  </div>
                                )}
                                <div className="absolute inset-0 bg-black/30 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center pointer-events-none">
                                  <Pencil className="h-5 w-5 text-white" />
                                </div>
                              </>
                            ) : (
                              <div className="h-16 w-16 border-2 border-dashed border-muted-foreground/30 rounded-lg flex items-center justify-center hover:border-primary/50 transition-colors">
                                <Image className="h-6 w-6 text-muted-foreground" />
                              </div>
                            )}
                          </div>
                        )}
                      </div>

                      {/* Content */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-3 mb-2">
                          {editingModelId === cost.id ? (
                            <div className="flex items-center gap-2">
                              <Input
                                value={editModelName}
                                onChange={(e) => setEditModelName(e.target.value)}
                                className="h-8 w-48"
                                autoFocus
                                onKeyDown={(e) => {
                                  if (e.key === "Enter") handleSaveModelName();
                                  if (e.key === "Escape") handleCancelEditModelName();
                                }}
                              />
                              <Button size="icon" variant="ghost" className="h-7 w-7" onClick={handleSaveModelName}>
                                <Check className="h-4 w-4 text-green-600" />
                              </Button>
                              <Button size="icon" variant="ghost" className="h-7 w-7" onClick={handleCancelEditModelName}>
                                <X className="h-4 w-4 text-destructive" />
                              </Button>
                            </div>
                          ) : (
                            <>
                              <h3 className="font-semibold text-lg truncate">{cost.model_name}</h3>
                              <Button 
                                size="icon" 
                                variant="ghost" 
                                className="h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity"
                                onClick={() => handleStartEditModelName(cost)}
                              >
                                <Pencil className="h-3 w-3" />
                              </Button>
                            </>
                          )}
                          <Badge variant="secondary" className="shrink-0">
                            {cost.items.length} kalem
                          </Badge>
                        </div>
                        
                        <div className="flex items-center gap-4 text-sm text-muted-foreground mb-3">
                          <span className="flex items-center gap-1">
                            <Calendar className="h-3.5 w-3.5" />
                            {format(new Date(cost.created_at), "d MMMM yyyy, HH:mm", { locale: tr })}
                          </span>
                        </div>
                        
                        {/* Items Preview - Fabric, Usage Area, Price side by side */}
                        <div className="space-y-1.5 text-sm">
                          {cost.items.map((item, idx) => (
                            <div key={idx} className="flex flex-wrap items-center gap-2 text-muted-foreground">
                              <Badge variant="outline" className="text-xs font-medium">
                                {item.fabricType}
                              </Badge>
                              <span className="text-xs">→</span>
                              <span className="text-xs">{item.usageArea}</span>
                              <span className="text-xs">•</span>
                              <span className="text-xs font-medium text-foreground">₺{item.fiyat.toFixed(2)}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                      
                      {/* Actions */}
                      <div className="flex items-center gap-2 shrink-0">
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button 
                              variant="outline" 
                              size="icon"
                              onClick={() => handleOpenRowImportDialog(cost)}
                              className="text-violet-600 hover:text-violet-700 hover:bg-violet-50 dark:hover:bg-violet-950"
                            >
                              <ArrowUpDown className="h-4 w-4" />
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent>Satır Seçerek Kopyala</TooltipContent>
                        </Tooltip>
                        
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button 
                              variant="outline" 
                              size="icon"
                              onClick={() => handleSendToNewCost(cost)}
                              className="text-blue-600 hover:text-blue-700 hover:bg-blue-50 dark:hover:bg-blue-950"
                            >
                              <Copy className="h-4 w-4" />
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent>Tümünü Yeni Maliyete Kopyala</TooltipContent>
                        </Tooltip>
                        
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button 
                              variant="outline" 
                              size="icon"
                              onClick={() => handleTransferToOrders(cost)}
                              className="text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50 dark:hover:bg-emerald-950"
                            >
                              <SendHorizontal className="h-4 w-4" />
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent>Siparişlere Aktar</TooltipContent>
                        </Tooltip>
                        
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button 
                              variant="outline" 
                              size="icon"
                              onClick={() => handleStartEditItems(cost)}
                            >
                              <Plus className="h-4 w-4" />
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent>Kalemleri Düzenle</TooltipContent>
                        </Tooltip>
                        
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button 
                              variant="outline" 
                              size="icon"
                              onClick={() => handleDownloadSingle(cost)}
                            >
                              <Download className="h-4 w-4" />
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent>Excel İndir</TooltipContent>
                        </Tooltip>
                        
                        <Button 
                          variant="outline" 
                          size="icon"
                          className="text-destructive hover:text-destructive"
                          onClick={() => handleDelete(cost.id)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </>
        )}

        {/* Edit Items Dialog */}
        <Dialog open={!!editingItemsCostId} onOpenChange={(open) => !open && handleCancelEditItems()}>
          <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Kalemleri Düzenle</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 mt-4">
              {editingItems.map((item, idx) => (
                <div key={item.id || idx} className="flex items-start gap-2 p-3 border rounded-lg bg-muted/30">
                  <div className="flex-1 grid grid-cols-2 md:grid-cols-3 gap-2">
                    <div>
                      <label className="text-xs text-muted-foreground">Kumaş Türü</label>
                      <Input
                        placeholder="Kumaş türü"
                        value={item.fabricType}
                        onChange={(e) => handleUpdateItem(idx, "fabricType", e.target.value)}
                        className="h-8"
                      />
                    </div>
                    <div>
                      <label className="text-xs text-muted-foreground">Kullanım Yeri</label>
                      <Input
                        placeholder="Kullanım yeri"
                        value={item.usageArea}
                        onChange={(e) => handleUpdateItem(idx, "usageArea", e.target.value)}
                        className="h-8"
                      />
                    </div>
                    <div>
                      <label className="text-xs text-muted-foreground">En (CM)</label>
                      <Input
                        type="number"
                        placeholder="En"
                        value={item.en || ""}
                        onChange={(e) => handleUpdateItem(idx, "en", Number(e.target.value))}
                        className="h-8"
                      />
                    </div>
                    <div>
                      <label className="text-xs text-muted-foreground">Gramaj (GR)</label>
                      <Input
                        type="number"
                        placeholder="Gramaj"
                        value={item.gramaj || ""}
                        onChange={(e) => handleUpdateItem(idx, "gramaj", Number(e.target.value))}
                        className="h-8"
                      />
                    </div>
                    <div>
                      <label className="text-xs text-muted-foreground">Fiyat (₺)</label>
                      <Input
                        type="number"
                        step="0.01"
                        placeholder="Fiyat"
                        value={item.fiyat || ""}
                        onChange={(e) => handleUpdateItem(idx, "fiyat", Number(e.target.value))}
                        className="h-8"
                      />
                    </div>
                    <div>
                      <label className="text-xs text-muted-foreground">Boyahane</label>
                      <Input
                        placeholder="Boyahane"
                        value={item.boyahane || ""}
                        onChange={(e) => handleUpdateItem(idx, "boyahane", e.target.value)}
                        className="h-8"
                      />
                    </div>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 text-destructive hover:text-destructive shrink-0"
                    onClick={() => handleRemoveItem(idx)}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              ))}
              
              <Button variant="outline" className="w-full" onClick={handleAddNewItem}>
                <Plus className="h-4 w-4 mr-2" />
                Yeni Kalem Ekle
              </Button>
              
              <div className="flex justify-end gap-2 pt-4 border-t">
                <Button variant="outline" onClick={handleCancelEditItems}>
                  İptal
                </Button>
                <Button onClick={handleSaveItems}>
                  Kaydet
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>

        {/* Row Import Dialog */}
        <Dialog open={importDialogOpen} onOpenChange={setImportDialogOpen}>
          <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Satır Seçerek Yeni Maliyete Kopyala</DialogTitle>
            </DialogHeader>
            {importSourceCost && (
              <div className="space-y-4 mt-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium">Yeni Model Adı</label>
                  <Input
                    value={importModelName}
                    onChange={(e) => setImportModelName(e.target.value)}
                    placeholder="Model adı giriniz..."
                    className="h-10"
                  />
                </div>
                
                <div className="flex items-center gap-2 border-b pb-2">
                  <Checkbox
                    checked={selectedRowsForImport.size === importSourceCost.items.length && importSourceCost.items.length > 0}
                    onCheckedChange={handleSelectAllRowsForImport}
                  />
                  <span className="text-sm font-medium">Tümünü Seç ({importSourceCost.items.length} satır)</span>
                </div>
                
                <div className="space-y-2">
                  {importSourceCost.items.map((item, idx) => (
                    <div 
                      key={item.id || idx} 
                      className={`flex items-center gap-3 p-3 border rounded-lg cursor-pointer transition-colors hover:bg-muted/50 ${
                        selectedRowsForImport.has(item.id || `item-${idx}`) ? 'bg-primary/10 border-primary/50' : ''
                      }`}
                      onClick={() => handleToggleRowForImport(item.id, idx)}
                    >
                      <Checkbox
                        checked={selectedRowsForImport.has(item.id || `item-${idx}`)}
                        onCheckedChange={() => handleToggleRowForImport(item.id, idx)}
                      />
                      <div className="flex-1 grid grid-cols-2 md:grid-cols-4 gap-2 text-sm">
                        <span className="font-medium">{item.fabricType}</span>
                        <span className="text-muted-foreground">{item.usageArea}</span>
                        <span className="text-muted-foreground">{item.en}cm / {item.gramaj}gr</span>
                        <span className="font-medium text-right">
                          ₺{item.fiyat.toFixed(2)}
                          {item.boyahane && <span className="text-xs text-muted-foreground ml-1">({item.boyahane})</span>}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
                
                <div className="flex justify-end gap-2 pt-4 border-t">
                  <Button variant="outline" onClick={() => setImportDialogOpen(false)}>
                    İptal
                  </Button>
                  <Button 
                    onClick={handleConfirmRowImport}
                    disabled={selectedRowsForImport.size === 0 || !importModelName.trim()}
                  >
                    <Copy className="h-4 w-4 mr-2" />
                    {selectedRowsForImport.size} Satır Kopyala
                  </Button>
                </div>
              </div>
            )}
          </DialogContent>
        </Dialog>

        {/* Image Generator */}
        <ImageGenerator 
          open={imageGenOpen} 
          onOpenChange={setImageGenOpen}
          images={imageGenImages}
          title="TAHA GİYİM - Kayıtlı Maliyetler"
        />
      </main>
      
      <footer className="border-t border-border/50 py-6 mt-12 bg-card/50 backdrop-blur-sm relative z-10">
        <div className="container mx-auto px-4 text-center">
          <p className="text-sm text-muted-foreground">
            TAHA GİYİM - 2025 ARALIK - AKIN ALTUN
          </p>
        </div>
      </footer>
    </div>
  );
};

export default SavedCosts;