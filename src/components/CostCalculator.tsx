import { useState, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { SearchableCombobox } from "@/components/SearchableCombobox";
import { fabricTypes, usageAreas, suppliers, getDefaultGramaj } from "@/data/fabricData";
import { Calculator, Plus, Trash2, FileSpreadsheet, Package } from "lucide-react";
import * as XLSX from "xlsx";

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
  items: FabricItem[];
}

export function CostCalculator() {
  const [models, setModels] = useState<ModelGroup[]>([]);
  const [currentModelName, setCurrentModelName] = useState("");
  const [activeModelId, setActiveModelId] = useState<string | null>(null);
  
  // Form states
  const [selectedFabric, setSelectedFabric] = useState("");
  const [selectedUsage, setSelectedUsage] = useState("");
  const [en, setEn] = useState<number>(0);
  const [gramaj, setGramaj] = useState<number>(0);
  const [fiyat, setFiyat] = useState<number>(0);

  // Auto-fill en and gramaj when fabric type changes
  const handleFabricChange = (value: string) => {
    setSelectedFabric(value);
    const specs = getDefaultGramaj(value);
    if (specs) {
      setEn(specs.en);
      setGramaj(specs.gramaj);
    }
  };

  const totalCost = useMemo(() => {
    return models.reduce((sum, model) => 
      sum + model.items.reduce((itemSum, item) => itemSum + item.fiyat, 0), 0
    );
  }, [models]);

  const handleAddModel = () => {
    if (!currentModelName.trim()) return;
    
    const newModel: ModelGroup = {
      id: Date.now().toString(),
      modelName: currentModelName.trim(),
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

  const handleExportExcel = () => {
    const data: any[] = [];
    
    models.forEach(model => {
      model.items.forEach((item, index) => {
        data.push({
          "Model Adı": model.modelName,
          "Sıra": index + 1,
          "Kumaş Türü": item.fabricType,
          "Kullanım Yeri": item.usageArea,
          "En (CM)": item.en,
          "Gramaj (GR)": item.gramaj,
          "Fiyat (₺)": item.fiyat,
        });
      });
      
      // Add model total row
      const modelTotal = model.items.reduce((sum, item) => sum + item.fiyat, 0);
      data.push({
        "Model Adı": model.modelName,
        "Sıra": "",
        "Kumaş Türü": "TOPLAM",
        "Kullanım Yeri": "",
        "En (CM)": "",
        "Gramaj (GR)": "",
        "Fiyat (₺)": modelTotal,
      });
      
      // Empty row between models
      data.push({});
    });
    
    // Grand total
    data.push({
      "Model Adı": "GENEL TOPLAM",
      "Sıra": "",
      "Kumaş Türü": "",
      "Kullanım Yeri": "",
      "En (CM)": "",
      "Gramaj (GR)": "",
      "Fiyat (₺)": totalCost,
    });

    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Maliyet Listesi");
    
    // Set column widths
    ws["!cols"] = [
      { wch: 15 }, // Model Adı
      { wch: 8 },  // Sıra
      { wch: 40 }, // Kumaş Türü
      { wch: 30 }, // Kullanım Yeri
      { wch: 12 }, // En
      { wch: 12 }, // Gramaj
      { wch: 12 }, // Fiyat
    ];
    
    XLSX.writeFile(wb, `maliyet_listesi_${new Date().toISOString().split('T')[0]}.xlsx`);
  };

  const activeModel = models.find(m => m.id === activeModelId);

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Model Creation */}
      <Card className="border-none shadow-lg">
        <CardHeader className="gradient-primary rounded-t-lg">
          <CardTitle className="text-primary-foreground flex items-center gap-2">
            <Package className="h-5 w-5" />
            Model Oluştur
          </CardTitle>
        </CardHeader>
        <CardContent className="p-6">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1 space-y-2">
              <Label htmlFor="model-name">Model Adı</Label>
              <Input
                id="model-name"
                value={currentModelName}
                onChange={(e) => setCurrentModelName(e.target.value)}
                placeholder="Örn: LOSKA, BEGOR..."
                onKeyDown={(e) => e.key === "Enter" && handleAddModel()}
              />
            </div>
            <div className="flex items-end">
              <Button 
                onClick={handleAddModel}
                disabled={!currentModelName.trim()}
                className="gradient-accent text-accent-foreground hover:opacity-90"
              >
                <Plus className="h-4 w-4 mr-2" />
                Model Ekle
              </Button>
            </div>
          </div>
          
          {/* Model Tabs */}
          {models.length > 0 && (
            <div className="mt-6 flex flex-wrap gap-2">
              {models.map(model => (
                <Button
                  key={model.id}
                  variant={activeModelId === model.id ? "default" : "outline"}
                  size="sm"
                  onClick={() => setActiveModelId(model.id)}
                  className="relative group"
                >
                  {model.modelName}
                  <span className="ml-2 text-xs opacity-70">
                    ({model.items.length})
                  </span>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleRemoveModel(model.id);
                    }}
                    className="absolute -top-2 -right-2 w-5 h-5 rounded-full bg-destructive text-destructive-foreground text-xs flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
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
        <Card className="border-none shadow-lg animate-slide-in">
          <CardHeader className="bg-secondary/50">
            <CardTitle className="text-lg flex items-center gap-2">
              <Calculator className="h-5 w-5 text-primary" />
              {activeModel.modelName} - Kumaş Ekle
            </CardTitle>
          </CardHeader>
          <CardContent className="p-6 space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label>Kumaş Türü</Label>
                <SearchableCombobox
                  options={fabricTypes}
                  value={selectedFabric}
                  onValueChange={handleFabricChange}
                  placeholder="Kumaş seçin..."
                  searchPlaceholder="Kumaş ara..."
                />
              </div>

              <div className="space-y-2">
                <Label>Kullanım Yeri</Label>
                <SearchableCombobox
                  options={usageAreas}
                  value={selectedUsage}
                  onValueChange={setSelectedUsage}
                  placeholder="Kullanım yeri seçin..."
                  searchPlaceholder="Kullanım yeri ara..."
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="en">En (CM)</Label>
                <Input
                  id="en"
                  type="number"
                  min="0"
                  value={en || ""}
                  onChange={(e) => setEn(Number(e.target.value))}
                  placeholder="0"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="gramaj">Gramaj (GR)</Label>
                <Input
                  id="gramaj"
                  type="number"
                  min="0"
                  value={gramaj || ""}
                  onChange={(e) => setGramaj(Number(e.target.value))}
                  placeholder="0"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="fiyat">Fiyat (₺)</Label>
                <Input
                  id="fiyat"
                  type="number"
                  min="0"
                  step="0.01"
                  value={fiyat || ""}
                  onChange={(e) => setFiyat(Number(e.target.value))}
                  placeholder="0.00"
                />
              </div>

              <div className="flex items-end">
                <Button
                  onClick={handleAddItem}
                  disabled={!selectedFabric || !selectedUsage || fiyat <= 0}
                  className="w-full gradient-accent text-accent-foreground hover:opacity-90"
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Kumaş Ekle
                </Button>
              </div>
            </div>

            {/* Items List for Active Model */}
            {activeModel.items.length > 0 && (
              <div className="mt-6">
                <div className="overflow-x-auto rounded-lg border border-border">
                  <table className="w-full">
                    <thead>
                      <tr className="bg-muted/50">
                        <th className="text-left py-3 px-4 font-medium text-sm">#</th>
                        <th className="text-left py-3 px-4 font-medium text-sm">Kumaş Türü</th>
                        <th className="text-left py-3 px-4 font-medium text-sm">Kullanım Yeri</th>
                        <th className="text-right py-3 px-4 font-medium text-sm">En (CM)</th>
                        <th className="text-right py-3 px-4 font-medium text-sm">Gramaj (GR)</th>
                        <th className="text-right py-3 px-4 font-medium text-sm">Fiyat</th>
                        <th className="w-12"></th>
                      </tr>
                    </thead>
                    <tbody>
                      {activeModel.items.map((item, index) => (
                        <tr key={item.id} className="border-t border-border/50 hover:bg-secondary/20">
                          <td className="py-3 px-4 text-sm text-muted-foreground">{index + 1}</td>
                          <td className="py-3 px-4 text-sm">{item.fabricType}</td>
                          <td className="py-3 px-4 text-sm">{item.usageArea}</td>
                          <td className="py-3 px-4 text-sm text-right">{item.en}</td>
                          <td className="py-3 px-4 text-sm text-right">{item.gramaj}</td>
                          <td className="py-3 px-4 text-sm text-right font-semibold text-primary">
                            ₺{item.fiyat.toFixed(2)}
                          </td>
                          <td className="py-3 px-4">
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => handleRemoveItem(activeModel.id, item.id)}
                              className="h-8 w-8 text-destructive hover:text-destructive hover:bg-destructive/10"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                    <tfoot>
                      <tr className="bg-primary/5 border-t border-border">
                        <td colSpan={5} className="py-3 px-4 text-right font-semibold">
                          Model Toplamı:
                        </td>
                        <td className="py-3 px-4 text-right font-bold text-primary">
                          ₺{activeModel.items.reduce((sum, item) => sum + item.fiyat, 0).toFixed(2)}
                        </td>
                        <td></td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Summary and Export */}
      {models.length > 0 && models.some(m => m.items.length > 0) && (
        <Card className="border-none shadow-lg animate-fade-in">
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-lg">Özet & Dışa Aktar</CardTitle>
            <Button onClick={handleExportExcel} className="gradient-primary hover:opacity-90">
              <FileSpreadsheet className="h-4 w-4 mr-2" />
              Excel İndir
            </Button>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {models.filter(m => m.items.length > 0).map(model => (
                <div key={model.id} className="flex justify-between items-center p-4 bg-secondary/30 rounded-lg">
                  <div>
                    <span className="font-medium">{model.modelName}</span>
                    <span className="text-sm text-muted-foreground ml-2">
                      ({model.items.length} kalem)
                    </span>
                  </div>
                  <span className="font-semibold">
                    ₺{model.items.reduce((sum, item) => sum + item.fiyat, 0).toFixed(2)}
                  </span>
                </div>
              ))}
              
              <div className="flex justify-between items-center p-4 bg-primary/10 rounded-lg border-2 border-primary/20">
                <span className="text-lg font-bold">Genel Toplam</span>
                <span className="text-2xl font-bold text-primary">
                  ₺{totalCost.toFixed(2)}
                </span>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
