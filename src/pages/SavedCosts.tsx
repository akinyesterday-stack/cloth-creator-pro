import { useState, useEffect } from "react";
import { Header } from "@/components/Header";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Search, Trash2, Calendar, Package, ArrowLeft, Loader2, Download, FileSpreadsheet } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
import { useNavigate } from "react-router-dom";
import { format } from "date-fns";
import { tr } from "date-fns/locale";
import ExcelJS from "exceljs";

interface FabricItem {
  id: string;
  fabricType: string;
  usageArea: string;
  en: number;
  gramaj: number;
  fiyat: number;
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
  const [costs, setCosts] = useState<SavedCost[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (user) {
      loadCosts();
    }
  }, [user]);

  const loadCosts = async () => {
    if (!user) return;
    
    try {
      const { data, error } = await supabase
        .from("saved_costs")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });

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
          kumasTuru: item.fabricType,
          kullanimYeri: item.usageArea,
          en: item.en,
          gramaj: item.gramaj,
          fiyat: item.fiyat,
          birimGramaj: '',
        });

        row.height = 60;

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
              
              {selectedIds.size > 0 && (
                <Button 
                  onClick={handleDownloadSelected}
                  className="gap-2"
                >
                  <FileSpreadsheet className="h-4 w-4" />
                  Seçilenleri İndir ({selectedIds.size})
                </Button>
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
                <Card key={cost.id} className="glass-card hover:shadow-lg transition-shadow">
                  <CardContent className="p-4">
                    <div className="flex items-start gap-4">
                      {/* Checkbox */}
                      <div className="flex items-center pt-1">
                        <Checkbox
                          checked={selectedIds.has(cost.id)}
                          onCheckedChange={() => handleSelectToggle(cost.id)}
                        />
                      </div>

                      {/* Image Preview */}
                      {cost.images && cost.images.length > 0 && (
                        <img 
                          src={cost.images[0]} 
                          alt="Model" 
                          className="h-20 w-20 object-cover rounded-lg border shrink-0"
                        />
                      )}

                      {/* Content */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-3 mb-2">
                          <h3 className="font-semibold text-lg truncate">{cost.model_name}</h3>
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
                        <Button 
                          variant="outline" 
                          size="icon"
                          onClick={() => handleDownloadSingle(cost)}
                          title="Excel olarak indir"
                        >
                          <Download className="h-4 w-4" />
                        </Button>
                        
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
      </main>
      
      <footer className="border-t border-border/50 py-6 mt-12 bg-card/50 backdrop-blur-sm relative z-10">
        <div className="container mx-auto px-4 text-center">
          <p className="text-sm text-muted-foreground">
            © 2025 Tekstil Maliyet Hesaplama Sistemi
          </p>
        </div>
      </footer>
    </div>
  );
};

export default SavedCosts;