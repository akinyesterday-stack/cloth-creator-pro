import { useState, useRef, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { SearchableCombobox } from "@/components/SearchableCombobox";
import { FabricManager, FabricTypeWithSpec } from "@/components/FabricManager";
import { fabricTypesWithSpecs as defaultFabricTypes, usageAreas as defaultUsageAreas } from "@/data/fabricData";
import { Calculator, Plus, Trash2, FileSpreadsheet, Package, Image, Upload, X, Pencil, Check, Settings } from "lucide-react";
import ExcelJS from "exceljs";

interface FabricItem {
  id: string;
  fabricType: string;
  usageArea: string;
  en: number;
  gramaj: number;
  fiyat: number;
}

interface ModelGroup {
  id: string;
  modelName: string;
  image: string | null;
  items: FabricItem[];
}

export function CostCalculator() {
  const [models, setModels] = useState<ModelGroup[]>([]);
  const [currentModelName, setCurrentModelName] = useState("");
  const [activeModelId, setActiveModelId] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  // Custom fabric types and usage areas
  const [fabricTypes, setFabricTypes] = useState<FabricTypeWithSpec[]>(defaultFabricTypes);
  const [usageAreas, setUsageAreas] = useState<string[]>(defaultUsageAreas);
  const [showManager, setShowManager] = useState(false);
  
  // Form states
  const [selectedFabric, setSelectedFabric] = useState("");
  const [selectedUsage, setSelectedUsage] = useState("");
  const [en, setEn] = useState<number>(0);
  const [gramaj, setGramaj] = useState<number>(0);
  const [fiyat, setFiyat] = useState<number>(0);

  // Edit state
  const [editingItemId, setEditingItemId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<FabricItem | null>(null);

  // Auto-fill en and gramaj when fabric type changes
  const handleFabricChange = (value: string) => {
    setSelectedFabric(value);
    const fabric = fabricTypes.find(f => f.name === value);
    if (fabric) {
      setEn(fabric.en);
      setGramaj(fabric.gramaj);
    }
  };

  const handleAddModel = () => {
    if (!currentModelName.trim()) return;
    
    const newModel: ModelGroup = {
      id: Date.now().toString(),
      modelName: currentModelName.trim(),
      image: null,
      items: [],
    };
    
    setModels([...models, newModel]);
    setActiveModelId(newModel.id);
    setCurrentModelName("");
  };

  const handleAddItem = () => {
    if (!activeModelId || !selectedFabric || !selectedUsage || fiyat <= 0) return;

    const newItem: FabricItem = {
      id: Date.now().toString(),
      fabricType: selectedFabric,
      usageArea: selectedUsage,
      en,
      gramaj,
      fiyat,
    };

    setModels(models.map(model => 
      model.id === activeModelId 
        ? { ...model, items: [...model.items, newItem] }
        : model
    ));
    
    // Reset form
    setSelectedFabric("");
    setSelectedUsage("");
    setEn(0);
    setGramaj(0);
    setFiyat(0);
  };

  const handleRemoveItem = (modelId: string, itemId: string) => {
    setModels(models.map(model =>
      model.id === modelId
        ? { ...model, items: model.items.filter(item => item.id !== itemId) }
        : model
    ));
  };

  const handleRemoveModel = (modelId: string) => {
    setModels(models.filter(model => model.id !== modelId));
    if (activeModelId === modelId) {
      setActiveModelId(models.length > 1 ? models[0].id : null);
    }
  };

  // Edit handlers
  const handleStartEdit = (item: FabricItem) => {
    setEditingItemId(item.id);
    setEditForm({ ...item });
  };

  const handleSaveEdit = (modelId: string) => {
    if (!editForm) return;
    
    setModels(models.map(model =>
      model.id === modelId
        ? { ...model, items: model.items.map(item => 
            item.id === editingItemId ? editForm : item
          )}
        : model
    ));
    setEditingItemId(null);
    setEditForm(null);
  };

  const handleCancelEdit = () => {
    setEditingItemId(null);
    setEditForm(null);
  };

  // Image handling
  const handleImagePaste = useCallback((e: React.ClipboardEvent) => {
    if (!activeModelId) return;
    
    const items = e.clipboardData?.items;
    if (!items) return;

    for (const item of items) {
      if (item.type.startsWith('image/')) {
        const file = item.getAsFile();
        if (file) {
          const reader = new FileReader();
          reader.onload = (event) => {
            const imageData = event.target?.result as string;
            setModels(prev => prev.map(model =>
              model.id === activeModelId
                ? { ...model, image: imageData }
                : model
            ));
          };
          reader.readAsDataURL(file);
        }
        break;
      }
    }
  }, [activeModelId]);

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!activeModelId || !e.target.files?.[0]) return;
    
    const file = e.target.files[0];
    const reader = new FileReader();
    reader.onload = (event) => {
      const imageData = event.target?.result as string;
      setModels(prev => prev.map(model =>
        model.id === activeModelId
          ? { ...model, image: imageData }
          : model
      ));
    };
    reader.readAsDataURL(file);
    e.target.value = '';
  };

  const handleRemoveImage = (modelId: string) => {
    setModels(prev => prev.map(model =>
      model.id === modelId
        ? { ...model, image: null }
        : model
    ));
  };

  const handleExportExcel = async () => {
    const workbook = new ExcelJS.Workbook();
    workbook.creator = 'Maliyet Hesaplayıcı';
    workbook.created = new Date();
    
    const worksheet = workbook.addWorksheet('Maliyet Listesi', {
      views: [{ showGridLines: true }]
    });

    // Define columns
    worksheet.columns = [
      { header: 'Resim', key: 'resim', width: 18 },
      { header: 'Model Adı', key: 'modelAdi', width: 20 },
      { header: 'Kumaş Türü', key: 'kumasTuru', width: 45 },
      { header: 'Kullanım Yeri', key: 'kullanimYeri', width: 35 },
      { header: 'En (CM)', key: 'en', width: 12 },
      { header: 'Gramaj (GR)', key: 'gramaj', width: 14 },
      { header: 'Fiyat (₺)', key: 'fiyat', width: 14 },
    ];

    // Style header row
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

    for (const model of models) {
      if (model.items.length === 0) continue;

      const startRow = currentRow;
      const rowCount = model.items.length;

      // Add items
      for (let i = 0; i < model.items.length; i++) {
        const item = model.items[i];
        const row = worksheet.addRow({
          resim: '',
          modelAdi: i === 0 ? model.modelName : '',
          kumasTuru: item.fabricType,
          kullanimYeri: item.usageArea,
          en: item.en,
          gramaj: item.gramaj,
          fiyat: item.fiyat,
        });

        row.height = 60;

        // Style all cells
        row.eachCell((cell, colNumber) => {
          cell.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true };
          
          // Model columns (resim and model adı)
          if (colNumber <= 2) {
            cell.fill = {
              type: 'pattern',
              pattern: 'solid',
              fgColor: { argb: 'DBEAFE' }
            };
            cell.font = { bold: true, size: 11 };
          }
          
          // All cells get borders
          cell.border = {
            top: { style: 'thin', color: { argb: 'D1D5DB' } },
            bottom: { style: 'thin', color: { argb: 'D1D5DB' } },
            left: { style: 'thin', color: { argb: 'D1D5DB' } },
            right: { style: 'thin', color: { argb: 'D1D5DB' } }
          };
        });

        currentRow++;
      }

      // Merge cells for Resim and Model Adı
      if (rowCount > 1) {
        worksheet.mergeCells(startRow, 1, startRow + rowCount - 1, 1); // Resim
        worksheet.mergeCells(startRow, 2, startRow + rowCount - 1, 2); // Model Adı
      }

      // Add image if exists
      if (model.image) {
        try {
          // Extract base64 data
          const base64Match = model.image.match(/^data:image\/(png|jpeg|jpg|gif);base64,(.+)$/);
          if (base64Match) {
            const extRaw = base64Match[1];
            const base64Data = base64Match[2];
            const extension = (extRaw === 'jpg' ? 'jpeg' : extRaw) as 'png' | 'jpeg' | 'gif';

            const imageId = workbook.addImage({
              base64: base64Data,
              extension: extension,
            });

            worksheet.addImage(imageId, {
              tl: { col: 0.1, row: startRow - 0.9 },
              ext: { width: 100, height: 55 * rowCount }
            });
          }
        } catch (error) {
          console.error('Image processing error:', error);
        }
      }

      // Apply thick borders around the entire model group
      for (let r = startRow; r < startRow + rowCount; r++) {
        const row = worksheet.getRow(r);
        for (let c = 1; c <= 7; c++) {
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
            right: c === 7 
              ? { style: 'medium', color: { argb: '2563EB' } }
              : existingBorder.right,
          };
        }
      }
    }

    // Generate and download file
    const buffer = await workbook.xlsx.writeBuffer();
    const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `maliyet_listesi_${new Date().toISOString().split('T')[0]}.xlsx`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const activeModel = models.find(m => m.id === activeModelId);

  return (
    <div className="space-y-8 animate-fade-in" onPaste={handleImagePaste}>
      {/* Settings Button */}
      <div className="flex justify-end">
        <Button
          variant={showManager ? "default" : "outline"}
          onClick={() => setShowManager(!showManager)}
          className="gap-2"
        >
          <Settings className="h-4 w-4" />
          {showManager ? "Yönetimi Kapat" : "Kumaş & Kullanım Yeri Yönetimi"}
        </Button>
      </div>

      {/* Fabric Manager */}
      {showManager && (
        <FabricManager
          fabricTypes={fabricTypes}
          usageAreas={usageAreas}
          onFabricTypesChange={setFabricTypes}
          onUsageAreasChange={setUsageAreas}
        />
      )}

      {/* Model Creation */}
      <Card className="border-none shadow-2xl overflow-hidden bg-gradient-to-br from-card via-card to-secondary/20">
        <CardHeader className="gradient-primary rounded-t-lg relative overflow-hidden">
          <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHZpZXdCb3g9IjAgMCA2MCA2MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZyBmaWxsPSJub25lIiBmaWxsLXJ1bGU9ImV2ZW5vZGQiPjxnIGZpbGw9IiNmZmZmZmYiIGZpbGwtb3BhY2l0eT0iMC4wNSI+PHBhdGggZD0iTTM2IDM0djItSDI0di0yaDEyek0zNiAzMHYySDI0di0yaDEyek0zNiAyNnYySDI0di0yaDEyeiIvPjwvZz48L2c+PC9zdmc+')] opacity-30"></div>
          <CardTitle className="text-primary-foreground flex items-center gap-3 relative z-10">
            <div className="p-2 bg-white/20 rounded-lg backdrop-blur-sm">
              <Package className="h-5 w-5" />
            </div>
            <span className="text-xl font-bold tracking-tight">Model Oluştur</span>
          </CardTitle>
        </CardHeader>
        <CardContent className="p-8">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1 space-y-2">
              <Label htmlFor="model-name" className="text-sm font-semibold text-foreground/80">Model Adı</Label>
              <Input
                id="model-name"
                value={currentModelName}
                onChange={(e) => setCurrentModelName(e.target.value)}
                placeholder="Örn: LOSKA, BEGOR..."
                onKeyDown={(e) => e.key === "Enter" && handleAddModel()}
                className="h-12 text-lg border-2 focus:border-primary transition-all duration-300 bg-background/50 backdrop-blur-sm"
              />
            </div>
            <div className="flex items-end">
              <Button 
                onClick={handleAddModel}
                disabled={!currentModelName.trim()}
                className="h-12 px-8 gradient-accent text-accent-foreground hover:opacity-90 shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-105"
              >
                <Plus className="h-5 w-5 mr-2" />
                Model Ekle
              </Button>
            </div>
          </div>
          
          {/* Model Tabs */}
          {models.length > 0 && (
            <div className="mt-8 flex flex-wrap gap-3">
              {models.map(model => (
                <Button
                  key={model.id}
                  variant={activeModelId === model.id ? "default" : "outline"}
                  size="lg"
                  onClick={() => setActiveModelId(model.id)}
                  className={`relative group transition-all duration-300 hover:scale-105 ${
                    activeModelId === model.id 
                      ? 'shadow-lg shadow-primary/30' 
                      : 'hover:bg-secondary/80'
                  }`}
                >
                  {model.image && (
                    <div className="w-6 h-6 rounded overflow-hidden mr-2 border border-white/20">
                      <img src={model.image} alt="" className="w-full h-full object-cover" />
                    </div>
                  )}
                  {model.modelName}
                  <span className="ml-2 text-xs opacity-70 bg-black/10 px-2 py-0.5 rounded-full">
                    {model.items.length}
                  </span>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleRemoveModel(model.id);
                    }}
                    className="absolute -top-2 -right-2 w-6 h-6 rounded-full bg-destructive text-destructive-foreground text-xs flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all duration-200 shadow-md hover:scale-110"
                  >
                    ×
                  </button>
                </Button>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Fabric Entry Form */}
      {activeModel && (
        <Card className="border-none shadow-2xl animate-slide-in overflow-hidden">
          <CardHeader className="bg-gradient-to-r from-secondary/80 via-secondary/50 to-transparent border-b border-border/50">
            <CardTitle className="text-xl flex items-center gap-3">
              <div className="p-2 bg-primary/10 rounded-lg">
                <Calculator className="h-5 w-5 text-primary" />
              </div>
              <span className="font-bold">{activeModel.modelName}</span>
              <span className="text-muted-foreground font-normal">- Kumaş Ekle</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="p-8 space-y-8">
            {/* Image Upload Section */}
            <div className="flex items-start gap-6 p-6 bg-gradient-to-br from-muted/30 to-transparent rounded-2xl border border-border/50">
              <div className="flex-shrink-0">
                {activeModel.image ? (
                  <div className="relative group">
                    <div className="w-32 h-32 rounded-xl overflow-hidden border-4 border-primary/20 shadow-lg">
                      <img 
                        src={activeModel.image} 
                        alt={activeModel.modelName} 
                        className="w-full h-full object-cover"
                      />
                    </div>
                    <button
                      onClick={() => handleRemoveImage(activeModel.id)}
                      className="absolute -top-2 -right-2 w-8 h-8 rounded-full bg-destructive text-destructive-foreground flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all shadow-lg hover:scale-110"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                ) : (
                  <div 
                    className="w-32 h-32 rounded-xl border-3 border-dashed border-primary/30 bg-gradient-to-br from-primary/5 to-primary/10 flex flex-col items-center justify-center cursor-pointer hover:border-primary/50 hover:bg-primary/15 transition-all duration-300 group"
                    onClick={() => fileInputRef.current?.click()}
                  >
                    <Image className="h-8 w-8 text-primary/50 group-hover:text-primary/70 transition-colors mb-2" />
                    <span className="text-xs text-muted-foreground text-center px-2">Ctrl+V veya tıkla</span>
                  </div>
                )}
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleImageUpload}
                  className="hidden"
                />
              </div>
              <div className="flex-1 space-y-2">
                <h4 className="font-semibold text-foreground flex items-center gap-2">
                  <Upload className="h-4 w-4 text-primary" />
                  Model Resmi
                </h4>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  Resmi <kbd className="px-2 py-0.5 bg-muted rounded text-xs font-mono">Ctrl+V</kbd> ile yapıştırın veya dosya seçin. 
                  Excel'e aktarıldığında ilk sütunda görünecektir.
                </p>
              </div>
            </div>

            {/* Form Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              <div className="space-y-3">
                <Label className="text-sm font-semibold text-foreground/80">Kumaş Türü</Label>
                <SearchableCombobox
                  options={fabricTypes.map(f => f.name)}
                  value={selectedFabric}
                  onValueChange={handleFabricChange}
                  placeholder="Kumaş seçin..."
                  searchPlaceholder="Kumaş ara..."
                  allowCustom={true}
                />
              </div>

              <div className="space-y-3">
                <Label className="text-sm font-semibold text-foreground/80">Kullanım Yeri</Label>
                <SearchableCombobox
                  options={usageAreas}
                  value={selectedUsage}
                  onValueChange={setSelectedUsage}
                  placeholder="Kullanım yeri seçin..."
                  searchPlaceholder="Kullanım yeri ara..."
                  allowCustom={true}
                />
              </div>

              <div className="space-y-3">
                <Label htmlFor="en" className="text-sm font-semibold text-foreground/80">En (CM)</Label>
                <Input
                  id="en"
                  type="number"
                  min="0"
                  value={en || ""}
                  onChange={(e) => setEn(Number(e.target.value))}
                  placeholder="0"
                  className="h-11 border-2 focus:border-primary transition-all duration-300"
                />
              </div>

              <div className="space-y-3">
                <Label htmlFor="gramaj" className="text-sm font-semibold text-foreground/80">Gramaj (GR)</Label>
                <Input
                  id="gramaj"
                  type="number"
                  min="0"
                  value={gramaj || ""}
                  onChange={(e) => setGramaj(Number(e.target.value))}
                  placeholder="0"
                  className="h-11 border-2 focus:border-primary transition-all duration-300"
                />
              </div>

              <div className="space-y-3">
                <Label htmlFor="fiyat" className="text-sm font-semibold text-foreground/80">Fiyat (₺)</Label>
                <Input
                  id="fiyat"
                  type="number"
                  min="0"
                  step="0.01"
                  value={fiyat || ""}
                  onChange={(e) => setFiyat(Number(e.target.value))}
                  placeholder="0.00"
                  className="h-11 border-2 focus:border-primary transition-all duration-300"
                />
              </div>

              <div className="flex items-end">
                <Button
                  onClick={handleAddItem}
                  disabled={!selectedFabric || !selectedUsage || fiyat <= 0}
                  className="w-full h-11 gradient-accent text-accent-foreground hover:opacity-90 shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-[1.02]"
                >
                  <Plus className="h-5 w-5 mr-2" />
                  Kumaş Ekle
                </Button>
              </div>
            </div>

            {/* Items List for Active Model */}
            {activeModel.items.length > 0 && (
              <div className="mt-8">
                <div className="overflow-x-auto rounded-2xl border border-border/50 shadow-inner bg-gradient-to-br from-background to-muted/20">
                  <table className="w-full">
                    <thead>
                      <tr className="bg-gradient-to-r from-muted/80 to-muted/40">
                        <th className="text-left py-4 px-5 font-semibold text-sm text-foreground/70">#</th>
                        <th className="text-left py-4 px-5 font-semibold text-sm text-foreground/70">Kumaş Türü</th>
                        <th className="text-left py-4 px-5 font-semibold text-sm text-foreground/70">Kullanım Yeri</th>
                        <th className="text-right py-4 px-5 font-semibold text-sm text-foreground/70">En (CM)</th>
                        <th className="text-right py-4 px-5 font-semibold text-sm text-foreground/70">Gramaj (GR)</th>
                        <th className="text-right py-4 px-5 font-semibold text-sm text-foreground/70">Fiyat</th>
                        <th className="w-24"></th>
                      </tr>
                    </thead>
                    <tbody>
                      {activeModel.items.map((item, index) => (
                        <tr 
                          key={item.id} 
                          className="border-t border-border/30 hover:bg-primary/5 transition-colors duration-200"
                        >
                          <td className="py-4 px-5 text-sm text-muted-foreground font-medium">{index + 1}</td>
                          {editingItemId === item.id ? (
                            <>
                              <td className="py-2 px-2">
                                <Input 
                                  value={editForm?.fabricType || ""} 
                                  onChange={(e) => setEditForm(prev => prev ? {...prev, fabricType: e.target.value} : null)}
                                  className="h-9 text-sm"
                                />
                              </td>
                              <td className="py-2 px-2">
                                <Input 
                                  value={editForm?.usageArea || ""} 
                                  onChange={(e) => setEditForm(prev => prev ? {...prev, usageArea: e.target.value} : null)}
                                  className="h-9 text-sm"
                                />
                              </td>
                              <td className="py-2 px-2">
                                <Input 
                                  type="number"
                                  value={editForm?.en || ""} 
                                  onChange={(e) => setEditForm(prev => prev ? {...prev, en: Number(e.target.value)} : null)}
                                  className="h-9 text-sm text-right w-20"
                                />
                              </td>
                              <td className="py-2 px-2">
                                <Input 
                                  type="number"
                                  value={editForm?.gramaj || ""} 
                                  onChange={(e) => setEditForm(prev => prev ? {...prev, gramaj: Number(e.target.value)} : null)}
                                  className="h-9 text-sm text-right w-20"
                                />
                              </td>
                              <td className="py-2 px-2">
                                <Input 
                                  type="number"
                                  step="0.01"
                                  value={editForm?.fiyat || ""} 
                                  onChange={(e) => setEditForm(prev => prev ? {...prev, fiyat: Number(e.target.value)} : null)}
                                  className="h-9 text-sm text-right w-24"
                                />
                              </td>
                              <td className="py-2 px-2">
                                <div className="flex gap-1">
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    onClick={() => handleSaveEdit(activeModel.id)}
                                    className="h-8 w-8 text-green-600 hover:text-green-700 hover:bg-green-100"
                                  >
                                    <Check className="h-4 w-4" />
                                  </Button>
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    onClick={handleCancelEdit}
                                    className="h-8 w-8 text-muted-foreground hover:text-foreground"
                                  >
                                    <X className="h-4 w-4" />
                                  </Button>
                                </div>
                              </td>
                            </>
                          ) : (
                            <>
                              <td className="py-4 px-5 text-sm font-medium">{item.fabricType}</td>
                              <td className="py-4 px-5 text-sm">{item.usageArea}</td>
                              <td className="py-4 px-5 text-sm text-right font-mono">{item.en}</td>
                              <td className="py-4 px-5 text-sm text-right font-mono">{item.gramaj}</td>
                              <td className="py-4 px-5 text-sm text-right font-bold text-primary">
                                ₺{item.fiyat.toFixed(2)}
                              </td>
                              <td className="py-4 px-3">
                                <div className="flex gap-1">
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    onClick={() => handleStartEdit(item)}
                                    className="h-9 w-9 text-blue-600 hover:text-blue-700 hover:bg-blue-50 rounded-full transition-all"
                                  >
                                    <Pencil className="h-4 w-4" />
                                  </Button>
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    onClick={() => handleRemoveItem(activeModel.id, item.id)}
                                    className="h-9 w-9 text-destructive hover:text-destructive hover:bg-destructive/10 rounded-full transition-all"
                                  >
                                    <Trash2 className="h-4 w-4" />
                                  </Button>
                                </div>
                              </td>
                            </>
                          )}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Export Button */}
      {models.length > 0 && models.some(m => m.items.length > 0) && (
        <Card className="border-none shadow-2xl animate-fade-in overflow-hidden bg-gradient-to-br from-card to-primary/5">
          <CardContent className="p-8">
            <div className="flex flex-col sm:flex-row items-center justify-between gap-6">
              <div className="text-center sm:text-left">
                <h3 className="text-xl font-bold text-foreground mb-2">Dışa Aktarmaya Hazır</h3>
                <p className="text-muted-foreground">
                  {models.filter(m => m.items.length > 0).length} model, toplam{" "}
                  {models.reduce((sum, m) => sum + m.items.length, 0)} kalem kumaş
                </p>
              </div>
              <Button 
                onClick={handleExportExcel} 
                size="lg"
                className="gradient-primary hover:opacity-90 shadow-xl hover:shadow-2xl transition-all duration-300 hover:scale-105 px-10"
              >
                <FileSpreadsheet className="h-5 w-5 mr-3" />
                Excel İndir
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
