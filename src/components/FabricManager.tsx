import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Settings, Plus, Trash2, Search, Shirt, MapPin, Upload, Pencil, Check, X, ClipboardPaste, Layers, Filter } from "lucide-react";

export interface FabricTypeWithSpec {
  name: string;
  en: number;
  gramaj: number;
}

interface FabricManagerProps {
  fabricTypes: FabricTypeWithSpec[];
  usageAreas: string[];
  onFabricTypesChange: (types: FabricTypeWithSpec[]) => void;
  onUsageAreasChange: (areas: string[]) => void;
}

export function FabricManager({
  fabricTypes,
  usageAreas,
  onFabricTypesChange,
  onUsageAreasChange,
}: FabricManagerProps) {
  const [newFabricType, setNewFabricType] = useState("");
  const [newFabricEn, setNewFabricEn] = useState<number>(0);
  const [newFabricGramaj, setNewFabricGramaj] = useState<number>(0);
  const [newUsageArea, setNewUsageArea] = useState("");
  const [fabricSearch, setFabricSearch] = useState("");
  const [usageSearch, setUsageSearch] = useState("");

  // Edit states
  const [editingFabricIndex, setEditingFabricIndex] = useState<number | null>(null);
  const [editFabricName, setEditFabricName] = useState("");
  const [editFabricEn, setEditFabricEn] = useState<number>(0);
  const [editFabricGramaj, setEditFabricGramaj] = useState<number>(0);

  // Bulk import states for fabrics
  const [bulkImportOpen, setBulkImportOpen] = useState(false);
  const [bulkPasteText, setBulkPasteText] = useState("");
  const [parsedBulkItems, setParsedBulkItems] = useState<FabricTypeWithSpec[]>([]);

  // Bulk import states for usage areas
  const [usageBulkImportOpen, setUsageBulkImportOpen] = useState(false);
  const [usageBulkPasteText, setUsageBulkPasteText] = useState("");
  const [parsedUsageBulkItems, setParsedUsageBulkItems] = useState<string[]>([]);

  // Custom filter patterns
  const [filterDialogOpen, setFilterDialogOpen] = useState(false);
  const [customFilters, setCustomFilters] = useState<string[]>([]);
  const [newFilter, setNewFilter] = useState("");

  const handleAddFabricType = () => {
    if (newFabricType.trim() && !fabricTypes.find(f => f.name === newFabricType.trim())) {
      onFabricTypesChange([...fabricTypes, { 
        name: newFabricType.trim(), 
        en: newFabricEn, 
        gramaj: newFabricGramaj 
      }]);
      setNewFabricType("");
      setNewFabricEn(0);
      setNewFabricGramaj(0);
    }
  };

  const handleRemoveFabricType = (name: string) => {
    onFabricTypesChange(fabricTypes.filter((f) => f.name !== name));
  };

  const handleStartEditFabric = (index: number, fabric: FabricTypeWithSpec) => {
    setEditingFabricIndex(index);
    setEditFabricName(fabric.name);
    setEditFabricEn(fabric.en);
    setEditFabricGramaj(fabric.gramaj);
  };

  const handleSaveEditFabric = (index: number) => {
    const updated = [...fabricTypes];
    updated[index] = {
      name: editFabricName.trim(),
      en: editFabricEn,
      gramaj: editFabricGramaj
    };
    onFabricTypesChange(updated);
    setEditingFabricIndex(null);
  };

  const handleCancelEditFabric = () => {
    setEditingFabricIndex(null);
  };

  const handleAddUsageArea = () => {
    if (newUsageArea.trim() && !usageAreas.includes(newUsageArea.trim())) {
      onUsageAreasChange([...usageAreas, newUsageArea.trim()]);
      setNewUsageArea("");
    }
  };

  const handleRemoveUsageArea = (area: string) => {
    onUsageAreasChange(usageAreas.filter((a) => a !== area));
  };

  // Check if line should be filtered (single A or custom patterns)
  const shouldFilterLine = (line: string): boolean => {
    // Single A filter - any line containing only "A" repeated
    if (/^A+$/i.test(line.trim())) return true;
    
    // Custom filter patterns
    for (const pattern of customFilters) {
      if (line.toLowerCase().includes(pattern.toLowerCase())) {
        return true;
      }
    }
    
    return false;
  };

  // Bulk import handlers for fabrics
  const handleParseBulkText = () => {
    const lines = bulkPasteText.trim().split('\n').filter(line => line.trim());
    const items: FabricTypeWithSpec[] = lines
      .map(line => {
        const parts = line.split(/[\t,;]/).map(p => p.trim());
        return {
          name: parts[0] || line.trim(),
          en: 0,
          gramaj: 0
        };
      })
      .filter(item => !shouldFilterLine(item.name));
    setParsedBulkItems(items);
  };

  const handleUpdateBulkItem = (index: number, field: 'name' | 'en' | 'gramaj', value: string | number) => {
    const updated = [...parsedBulkItems];
    if (field === 'name') {
      updated[index].name = value as string;
    } else if (field === 'en') {
      updated[index].en = Number(value) || 0;
    } else {
      updated[index].gramaj = Number(value) || 0;
    }
    setParsedBulkItems(updated);
  };

  const handleRemoveBulkItem = (index: number) => {
    setParsedBulkItems(parsedBulkItems.filter((_, i) => i !== index));
  };

  const handleConfirmBulkImport = () => {
    const validItems = parsedBulkItems.filter(item => 
      item.name.trim() && !fabricTypes.find(f => f.name === item.name.trim())
    );
    onFabricTypesChange([...fabricTypes, ...validItems]);
    setBulkImportOpen(false);
    setBulkPasteText("");
    setParsedBulkItems([]);
  };

  // Bulk import handlers for usage areas
  const handleParseUsageBulkText = () => {
    const lines = usageBulkPasteText.trim().split('\n').filter(line => line.trim());
    const items = lines
      .map(line => {
        const parts = line.split(/[\t,;]/).map(p => p.trim());
        return parts[0] || line.trim();
      })
      .filter(item => !shouldFilterLine(item));
    setParsedUsageBulkItems(items);
  };

  const handleUpdateUsageBulkItem = (index: number, value: string) => {
    const updated = [...parsedUsageBulkItems];
    updated[index] = value;
    setParsedUsageBulkItems(updated);
  };

  const handleRemoveUsageBulkItem = (index: number) => {
    setParsedUsageBulkItems(parsedUsageBulkItems.filter((_, i) => i !== index));
  };

  const handleConfirmUsageBulkImport = () => {
    const validItems = parsedUsageBulkItems.filter(item => 
      item.trim() && !usageAreas.includes(item.trim())
    );
    onUsageAreasChange([...usageAreas, ...validItems]);
    setUsageBulkImportOpen(false);
    setUsageBulkPasteText("");
    setParsedUsageBulkItems([]);
  };

  // Custom filter handlers
  const handleAddFilter = () => {
    if (newFilter.trim() && !customFilters.includes(newFilter.trim())) {
      setCustomFilters([...customFilters, newFilter.trim()]);
      setNewFilter("");
    }
  };

  const handleRemoveFilter = (filter: string) => {
    setCustomFilters(customFilters.filter(f => f !== filter));
  };

  const filteredFabricTypes = fabricTypes.filter((fabric) =>
    fabric.name.toLowerCase().includes(fabricSearch.toLowerCase())
  );

  const filteredUsageAreas = usageAreas.filter((area) =>
    area.toLowerCase().includes(usageSearch.toLowerCase())
  );

  return (
    <Card className="modern-card overflow-hidden animate-fade-in">
      <CardHeader className="bg-gradient-to-r from-primary/10 via-primary/5 to-transparent border-b border-border/50 py-5">
        <div className="flex items-center justify-between">
          <CardTitle className="text-xl flex items-center gap-4">
            <div className="p-3 bg-primary/10 rounded-lg">
              <Layers className="h-6 w-6 text-primary" />
            </div>
            <span className="font-semibold">Kumaş & Kullanım Yeri Yönetimi</span>
          </CardTitle>
          
          {/* Filter Settings Button */}
          <Dialog open={filterDialogOpen} onOpenChange={setFilterDialogOpen}>
            <DialogTrigger asChild>
              <Button variant="outline" size="sm" className="gap-2">
                <Filter className="h-4 w-4" />
                Filtre Ayarları
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  <Filter className="h-5 w-5" />
                  Otomatik Filtre Ayarları
                </DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <p className="text-sm text-muted-foreground">
                  Toplu yüklemede bu kelimeleri içeren satırlar otomatik olarak silinir.
                  Tek "A" harfi zaten varsayılan olarak filtrelenir.
                </p>
                
                <div className="flex gap-2">
                  <Input
                    value={newFilter}
                    onChange={(e) => setNewFilter(e.target.value)}
                    placeholder="Filtre kelimesi..."
                    onKeyDown={(e) => e.key === "Enter" && handleAddFilter()}
                  />
                  <Button onClick={handleAddFilter} disabled={!newFilter.trim()}>
                    <Plus className="h-4 w-4" />
                  </Button>
                </div>
                
                <div className="flex flex-wrap gap-2">
                  <div className="px-3 py-1.5 bg-muted rounded-full text-sm flex items-center gap-2">
                    <span>A (varsayılan)</span>
                  </div>
                  {customFilters.map((filter) => (
                    <div key={filter} className="px-3 py-1.5 bg-destructive/10 rounded-full text-sm flex items-center gap-2">
                      <span>{filter}</span>
                      <button onClick={() => handleRemoveFilter(filter)} className="text-destructive hover:text-destructive/80">
                        <X className="h-3 w-3" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
              <DialogFooter>
                <Button onClick={() => setFilterDialogOpen(false)}>Tamam</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </CardHeader>
      <CardContent className="p-6">
        <Tabs defaultValue="fabrics" className="w-full">
          <TabsList className="grid w-full grid-cols-2 mb-8 h-14 p-1 bg-secondary/80 border border-border/50 rounded-lg">
            <TabsTrigger 
              value="fabrics" 
              className="h-full text-base font-semibold rounded-md data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:glow-primary-sm transition-all duration-300 flex items-center gap-3"
            >
              <Shirt className="h-5 w-5" />
              <span>Kumaş Türleri</span>
              <span className="ml-1 px-2 py-0.5 text-xs bg-background/30 rounded-full">{fabricTypes.length}</span>
            </TabsTrigger>
            <TabsTrigger 
              value="usage" 
              className="h-full text-base font-semibold rounded-md data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:glow-primary-sm transition-all duration-300 flex items-center gap-3"
            >
              <MapPin className="h-5 w-5" />
              <span>Kullanım Yerleri</span>
              <span className="ml-1 px-2 py-0.5 text-xs bg-background/30 rounded-full">{usageAreas.length}</span>
            </TabsTrigger>
          </TabsList>

          <TabsContent value="fabrics" className="space-y-6 animate-fade-in">
            {/* Add New Fabric Type */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 p-5 bg-secondary/30 rounded-xl border border-border/20">
              <div className="md:col-span-2">
                <Label className="text-xs text-muted-foreground mb-2 block uppercase tracking-wide">Kumaş Türü</Label>
                <Input
                  value={newFabricType}
                  onChange={(e) => setNewFabricType(e.target.value)}
                  placeholder="Yeni kumaş türü..."
                  className="h-12 bg-background/50 border-border/30 focus:border-primary focus:ring-primary/20"
                />
              </div>
              <div>
                <Label className="text-xs text-muted-foreground mb-2 block uppercase tracking-wide">En (CM)</Label>
                <Input
                  type="number"
                  value={newFabricEn || ''}
                  onChange={(e) => setNewFabricEn(Number(e.target.value))}
                  placeholder="En"
                  className="h-12 bg-background/50 border-border/30 focus:border-primary focus:ring-primary/20"
                />
              </div>
              <div>
                <Label className="text-xs text-muted-foreground mb-2 block uppercase tracking-wide">Gramaj (GR)</Label>
                <Input
                  type="number"
                  value={newFabricGramaj || ''}
                  onChange={(e) => setNewFabricGramaj(Number(e.target.value))}
                  placeholder="Gramaj"
                  className="h-12 bg-background/50 border-border/30 focus:border-primary focus:ring-primary/20"
                />
              </div>
            </div>

            <div className="flex gap-3 flex-wrap">
              <Button
                onClick={handleAddFabricType}
                disabled={!newFabricType.trim()}
                className="h-12 px-8 gradient-primary hover:opacity-90 glow-primary-sm font-semibold"
              >
                <Plus className="h-5 w-5 mr-2" />
                Ekle
              </Button>

              <Button
                variant="destructive"
                onClick={() => {
                  onFabricTypesChange([]);
                }}
                disabled={fabricTypes.length === 0}
                className="h-12 px-6"
              >
                <Trash2 className="h-5 w-5 mr-2" />
                Tümünü Sil
              </Button>

              <Dialog open={bulkImportOpen} onOpenChange={setBulkImportOpen}>
                <DialogTrigger asChild>
                  <Button variant="outline" className="h-12 px-8 border-border/50 hover:border-primary hover:bg-primary/10">
                    <ClipboardPaste className="h-5 w-5 mr-2" />
                    Toplu Ekle
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden flex flex-col bg-card border-border/30">
                  <DialogHeader className="border-b border-border/30 pb-4">
                    <DialogTitle className="flex items-center gap-3 text-xl font-display tracking-wide">
                      <div className="p-2 bg-primary/20 rounded-lg">
                        <Upload className="h-5 w-5 text-primary" />
                      </div>
                      TOPLU KUMAŞ TÜRÜ EKLEME
                    </DialogTitle>
                  </DialogHeader>

                  <div className="space-y-4 flex-1 overflow-hidden flex flex-col pt-4">
                    {parsedBulkItems.length === 0 ? (
                      <>
                        <div className="space-y-2">
                          <Label className="text-sm font-medium">Excel'den kopyaladığınız kumaş türlerini yapıştırın</Label>
                          <p className="text-xs text-muted-foreground">
                            Her satır bir kumaş türü olacak. Tek "A" harfi ve özel filtreler içeren satırlar otomatik filtrelenir.
                          </p>
                        </div>
                        <Textarea
                          value={bulkPasteText}
                          onChange={(e) => setBulkPasteText(e.target.value)}
                          placeholder="Kumaş türlerini buraya yapıştırın...&#10;30/1 SÜPREM&#10;40/1 İNTERLOK&#10;36/1 RİBANA..."
                          className="min-h-[200px] font-mono text-sm bg-background/50 border-border/30"
                        />
                        <Button 
                          onClick={handleParseBulkText}
                          disabled={!bulkPasteText.trim()}
                          className="w-full h-12 gradient-primary hover:opacity-90"
                        >
                          <Check className="h-5 w-5 mr-2" />
                          Satırları Ayrıştır ({bulkPasteText.trim().split('\n').filter(l => l.trim()).length} satır)
                        </Button>
                      </>
                    ) : (
                      <>
                        <div className="flex items-center justify-between">
                          <Label className="text-sm font-medium">
                            En ve Gramaj Değerlerini Girin ({parsedBulkItems.length} kumaş)
                          </Label>
                          <Button 
                            variant="ghost" 
                            size="sm"
                            onClick={() => setParsedBulkItems([])}
                            className="text-muted-foreground hover:text-foreground"
                          >
                            <X className="h-4 w-4 mr-1" />
                            Geri
                          </Button>
                        </div>
                        
                        <ScrollArea className="flex-1 max-h-[400px] rounded-lg border border-border/30 scrollbar-netflix">
                          <div className="p-4 space-y-2">
                            {/* Header */}
                            <div className="grid grid-cols-12 gap-2 px-3 py-2 bg-primary/10 rounded-lg text-xs font-semibold text-primary uppercase tracking-wide sticky top-0 z-10">
                              <div className="col-span-6">Kumaş Türü</div>
                              <div className="col-span-2 text-center">En (CM)</div>
                              <div className="col-span-2 text-center">Gramaj (GR)</div>
                              <div className="col-span-2 text-center">İşlem</div>
                            </div>

                            {parsedBulkItems.map((item, index) => (
                              <div 
                                key={index} 
                                className="grid grid-cols-12 gap-2 items-center p-3 bg-secondary/30 rounded-lg border border-border/20 hover:border-primary/30 transition-all group"
                              >
                                <div className="col-span-6">
                                  <Input
                                    value={item.name}
                                    onChange={(e) => handleUpdateBulkItem(index, 'name', e.target.value)}
                                    className="h-10 text-sm bg-background/50"
                                  />
                                </div>
                                <div className="col-span-2">
                                  <Input
                                    type="number"
                                    value={item.en || ''}
                                    onChange={(e) => handleUpdateBulkItem(index, 'en', e.target.value)}
                                    placeholder="En"
                                    className="h-10 text-sm text-center bg-background/50"
                                  />
                                </div>
                                <div className="col-span-2">
                                  <Input
                                    type="number"
                                    value={item.gramaj || ''}
                                    onChange={(e) => handleUpdateBulkItem(index, 'gramaj', e.target.value)}
                                    placeholder="Gramaj"
                                    className="h-10 text-sm text-center bg-background/50"
                                  />
                                </div>
                                <div className="col-span-2 flex justify-center">
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    onClick={() => handleRemoveBulkItem(index)}
                                    className="h-9 w-9 text-destructive hover:text-destructive hover:bg-destructive/10"
                                  >
                                    <Trash2 className="h-4 w-4" />
                                  </Button>
                                </div>
                              </div>
                            ))}
                          </div>
                        </ScrollArea>

                        <Button 
                          onClick={handleConfirmBulkImport}
                          className="w-full h-12 gradient-primary hover:opacity-90"
                          disabled={parsedBulkItems.length === 0}
                        >
                          <Check className="h-5 w-5 mr-2" />
                          Tümünü Ekle ({parsedBulkItems.filter(i => i.name.trim()).length} kumaş)
                        </Button>
                      </>
                    )}
                  </div>
                </DialogContent>
              </Dialog>
            </div>

            {/* Search */}
            <div className="relative">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
              <Input
                value={fabricSearch}
                onChange={(e) => setFabricSearch(e.target.value)}
                placeholder="Kumaş türü ara..."
                className="pl-12 h-12 bg-background/50 border-border/30 focus:border-primary"
              />
            </div>

            {/* Fabric List */}
            <ScrollArea className="h-[400px] rounded-xl border border-border/30 bg-gradient-to-br from-background/50 to-muted/20">
              <div className="p-4 space-y-2">
                {filteredFabricTypes.map((fabric, index) => (
                  <div 
                    key={fabric.name} 
                    className="group p-4 rounded-lg border border-border/30 bg-card/50 hover:border-primary/30 hover:bg-card transition-all duration-200"
                  >
                    {editingFabricIndex === index ? (
                      <div className="grid grid-cols-12 gap-3 items-center">
                        <div className="col-span-5">
                          <Input
                            value={editFabricName}
                            onChange={(e) => setEditFabricName(e.target.value)}
                            className="h-10"
                          />
                        </div>
                        <div className="col-span-2">
                          <Input
                            type="number"
                            value={editFabricEn || ''}
                            onChange={(e) => setEditFabricEn(Number(e.target.value))}
                            placeholder="En"
                            className="h-10 text-center"
                          />
                        </div>
                        <div className="col-span-2">
                          <Input
                            type="number"
                            value={editFabricGramaj || ''}
                            onChange={(e) => setEditFabricGramaj(Number(e.target.value))}
                            placeholder="Gramaj"
                            className="h-10 text-center"
                          />
                        </div>
                        <div className="col-span-3 flex gap-2 justify-end">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleSaveEditFabric(index)}
                            className="h-9 w-9 text-green-600 hover:text-green-700 hover:bg-green-100"
                          >
                            <Check className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={handleCancelEditFabric}
                            className="h-9 w-9"
                          >
                            <X className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    ) : (
                      <div className="flex items-center justify-between">
                        <div className="flex-1">
                          <span className="font-medium text-foreground">{fabric.name}</span>
                          <div className="flex gap-4 mt-1 text-sm text-muted-foreground">
                            <span>En: {fabric.en} CM</span>
                            <span>Gramaj: {fabric.gramaj} GR</span>
                          </div>
                        </div>
                        <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleStartEditFabric(index, fabric)}
                            className="h-9 w-9 text-blue-600 hover:text-blue-700 hover:bg-blue-50"
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleRemoveFabricType(fabric.name)}
                            className="h-9 w-9 text-destructive hover:text-destructive hover:bg-destructive/10"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </ScrollArea>
          </TabsContent>

          <TabsContent value="usage" className="space-y-6 animate-fade-in">
            {/* Add New Usage Area */}
            <div className="flex gap-4 p-5 bg-secondary/30 rounded-xl border border-border/20">
              <div className="flex-1">
                <Label className="text-xs text-muted-foreground mb-2 block uppercase tracking-wide">Kullanım Yeri</Label>
                <Input
                  value={newUsageArea}
                  onChange={(e) => setNewUsageArea(e.target.value)}
                  placeholder="Yeni kullanım yeri..."
                  className="h-12 bg-background/50 border-border/30 focus:border-primary focus:ring-primary/20"
                  onKeyDown={(e) => e.key === "Enter" && handleAddUsageArea()}
                />
              </div>
            </div>

            <div className="flex gap-3 flex-wrap">
              <Button
                onClick={handleAddUsageArea}
                disabled={!newUsageArea.trim()}
                className="h-12 px-8 gradient-primary hover:opacity-90 glow-primary-sm font-semibold"
              >
                <Plus className="h-5 w-5 mr-2" />
                Ekle
              </Button>

              <Button
                variant="destructive"
                onClick={() => {
                  onUsageAreasChange([]);
                }}
                disabled={usageAreas.length === 0}
                className="h-12 px-6"
              >
                <Trash2 className="h-5 w-5 mr-2" />
                Tümünü Sil
              </Button>

              <Dialog open={usageBulkImportOpen} onOpenChange={setUsageBulkImportOpen}>
                <DialogTrigger asChild>
                  <Button variant="outline" className="h-12 px-8 border-border/50 hover:border-primary hover:bg-primary/10">
                    <ClipboardPaste className="h-5 w-5 mr-2" />
                    Toplu Ekle
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-3xl max-h-[90vh] overflow-hidden flex flex-col bg-card border-border/30">
                  <DialogHeader className="border-b border-border/30 pb-4">
                    <DialogTitle className="flex items-center gap-3 text-xl font-display tracking-wide">
                      <div className="p-2 bg-primary/20 rounded-lg">
                        <Upload className="h-5 w-5 text-primary" />
                      </div>
                      TOPLU KULLANIM YERİ EKLEME
                    </DialogTitle>
                  </DialogHeader>

                  <div className="space-y-4 flex-1 overflow-hidden flex flex-col pt-4">
                    {parsedUsageBulkItems.length === 0 ? (
                      <>
                        <div className="space-y-2">
                          <Label className="text-sm font-medium">Excel'den kopyaladığınız kullanım yerlerini yapıştırın</Label>
                          <p className="text-xs text-muted-foreground">
                            Her satır bir kullanım yeri olacak. Tek "A" harfi ve özel filtreler içeren satırlar otomatik filtrelenir.
                          </p>
                        </div>
                        <Textarea
                          value={usageBulkPasteText}
                          onChange={(e) => setUsageBulkPasteText(e.target.value)}
                          placeholder="Kullanım yerlerini buraya yapıştırın...&#10;BEDEN&#10;KOL&#10;YAKA..."
                          className="min-h-[200px] font-mono text-sm bg-background/50 border-border/30"
                        />
                        <Button 
                          onClick={handleParseUsageBulkText}
                          disabled={!usageBulkPasteText.trim()}
                          className="w-full h-12 gradient-primary hover:opacity-90"
                        >
                          <Check className="h-5 w-5 mr-2" />
                          Satırları Ayrıştır ({usageBulkPasteText.trim().split('\n').filter(l => l.trim()).length} satır)
                        </Button>
                      </>
                    ) : (
                      <>
                        <div className="flex items-center justify-between">
                          <Label className="text-sm font-medium">
                            Kullanım Yerlerini Kontrol Edin ({parsedUsageBulkItems.length} adet)
                          </Label>
                          <Button 
                            variant="ghost" 
                            size="sm"
                            onClick={() => setParsedUsageBulkItems([])}
                            className="text-muted-foreground hover:text-foreground"
                          >
                            <X className="h-4 w-4 mr-1" />
                            Geri
                          </Button>
                        </div>
                        
                        <ScrollArea className="flex-1 max-h-[400px] rounded-lg border border-border/30 scrollbar-netflix">
                          <div className="p-4 space-y-2">
                            {parsedUsageBulkItems.map((item, index) => (
                              <div 
                                key={index} 
                                className="flex items-center gap-3 p-3 bg-secondary/30 rounded-lg border border-border/20 hover:border-primary/30 transition-all group"
                              >
                                <div className="flex-1">
                                  <Input
                                    value={item}
                                    onChange={(e) => handleUpdateUsageBulkItem(index, e.target.value)}
                                    className="h-10 text-sm bg-background/50"
                                  />
                                </div>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  onClick={() => handleRemoveUsageBulkItem(index)}
                                  className="h-9 w-9 text-destructive hover:text-destructive hover:bg-destructive/10"
                                >
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              </div>
                            ))}
                          </div>
                        </ScrollArea>

                        <Button 
                          onClick={handleConfirmUsageBulkImport}
                          className="w-full h-12 gradient-primary hover:opacity-90"
                          disabled={parsedUsageBulkItems.length === 0}
                        >
                          <Check className="h-5 w-5 mr-2" />
                          Tümünü Ekle ({parsedUsageBulkItems.filter(i => i.trim()).length} adet)
                        </Button>
                      </>
                    )}
                  </div>
                </DialogContent>
              </Dialog>
            </div>

            {/* Search */}
            <div className="relative">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
              <Input
                value={usageSearch}
                onChange={(e) => setUsageSearch(e.target.value)}
                placeholder="Kullanım yeri ara..."
                className="pl-12 h-12 bg-background/50 border-border/30 focus:border-primary"
              />
            </div>

            {/* Usage Areas List */}
            <ScrollArea className="h-[400px] rounded-xl border border-border/30 bg-gradient-to-br from-background/50 to-muted/20">
              <div className="p-4 grid grid-cols-2 md:grid-cols-3 gap-2">
                {filteredUsageAreas.map((area) => (
                  <div 
                    key={area} 
                    className="group flex items-center justify-between p-3 rounded-lg border border-border/30 bg-card/50 hover:border-primary/30 hover:bg-card transition-all duration-200"
                  >
                    <span className="font-medium text-sm truncate">{area}</span>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleRemoveUsageArea(area)}
                      className="h-7 w-7 opacity-0 group-hover:opacity-100 text-destructive hover:text-destructive hover:bg-destructive/10 transition-all"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                ))}
              </div>
            </ScrollArea>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}
