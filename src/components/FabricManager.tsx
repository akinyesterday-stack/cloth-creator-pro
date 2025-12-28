import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Settings, Plus, Trash2, Search, Shirt, MapPin, Upload, Pencil, Check, X, ClipboardPaste, Layers } from "lucide-react";

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
      .filter(item => !/A{3,}/i.test(item.name));
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
      .filter(item => !/A{3,}/i.test(item));
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

  const filteredFabricTypes = fabricTypes.filter((fabric) =>
    fabric.name.toLowerCase().includes(fabricSearch.toLowerCase())
  );

  const filteredUsageAreas = usageAreas.filter((area) =>
    area.toLowerCase().includes(usageSearch.toLowerCase())
  );

  return (
    <Card className="netflix-card border-none overflow-hidden animate-fade-in">
      <CardHeader className="bg-gradient-to-r from-primary/20 via-primary/10 to-transparent border-b border-border/30 py-5">
        <CardTitle className="text-2xl flex items-center gap-4 font-display tracking-wider">
          <div className="p-3 bg-primary/20 rounded-lg glow-primary-sm">
            <Layers className="h-6 w-6 text-primary" />
          </div>
          <span>KUMAŞ & KULLANIM YERİ YÖNETİMİ</span>
        </CardTitle>
      </CardHeader>
      <CardContent className="p-6">
        <Tabs defaultValue="fabrics" className="w-full">
          <TabsList className="grid w-full grid-cols-2 mb-8 h-14 p-1 bg-secondary/50 border border-border/30 rounded-lg">
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

            <div className="flex gap-3">
              <Button
                onClick={handleAddFabricType}
                disabled={!newFabricType.trim()}
                className="h-12 px-8 gradient-primary hover:opacity-90 glow-primary-sm font-semibold"
              >
                <Plus className="h-5 w-5 mr-2" />
                Ekle
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
                            Her satır bir kumaş türü olacak. 3+ yanyana A harfi içeren satırlar otomatik filtrelenir.
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
                className="pl-12 h-12 bg-secondary/30 border-border/30 focus:border-primary"
              />
            </div>

            {/* List */}
            <ScrollArea className="h-[450px] rounded-xl border border-border/30 bg-background/50 scrollbar-netflix">
              <div className="p-4 space-y-2">
                {/* Header */}
                <div className="grid grid-cols-12 gap-2 px-4 py-3 bg-primary/10 rounded-lg text-xs font-semibold text-primary uppercase tracking-wide sticky top-0 z-10">
                  <div className="col-span-6">Kumaş Türü</div>
                  <div className="col-span-2 text-center">En (CM)</div>
                  <div className="col-span-2 text-center">Gramaj (GR)</div>
                  <div className="col-span-2 text-center">İşlem</div>
                </div>

                {filteredFabricTypes.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
                    <Shirt className="h-12 w-12 mb-4 opacity-30" />
                    <p>{fabricSearch ? "Sonuç bulunamadı" : "Henüz kumaş türü eklenmemiş"}</p>
                  </div>
                ) : (
                  filteredFabricTypes.map((fabric, index) => {
                    const originalIndex = fabricTypes.findIndex(f => f.name === fabric.name);
                    const isEditing = editingFabricIndex === originalIndex;

                    return (
                      <div
                        key={index}
                        className="grid grid-cols-12 gap-2 items-center p-4 bg-secondary/30 rounded-lg border border-border/20 hover:border-primary/30 transition-all group"
                      >
                        {isEditing ? (
                          <>
                            <div className="col-span-6">
                              <Input
                                value={editFabricName}
                                onChange={(e) => setEditFabricName(e.target.value)}
                                className="h-10 text-sm bg-background/50"
                              />
                            </div>
                            <div className="col-span-2">
                              <Input
                                type="number"
                                value={editFabricEn || ''}
                                onChange={(e) => setEditFabricEn(Number(e.target.value))}
                                className="h-10 text-sm text-center bg-background/50"
                              />
                            </div>
                            <div className="col-span-2">
                              <Input
                                type="number"
                                value={editFabricGramaj || ''}
                                onChange={(e) => setEditFabricGramaj(Number(e.target.value))}
                                className="h-10 text-sm text-center bg-background/50"
                              />
                            </div>
                            <div className="col-span-2 flex justify-center gap-1">
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => handleSaveEditFabric(originalIndex)}
                                className="h-9 w-9 text-success hover:text-success hover:bg-success/10"
                              >
                                <Check className="h-4 w-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={handleCancelEditFabric}
                                className="h-9 w-9 text-muted-foreground hover:text-foreground"
                              >
                                <X className="h-4 w-4" />
                              </Button>
                            </div>
                          </>
                        ) : (
                          <>
                            <div className="col-span-6">
                              <span className="text-sm font-medium">{fabric.name}</span>
                            </div>
                            <div className="col-span-2 text-center">
                              <span className="text-sm text-muted-foreground">{fabric.en || '-'}</span>
                            </div>
                            <div className="col-span-2 text-center">
                              <span className="text-sm text-muted-foreground">{fabric.gramaj || '-'}</span>
                            </div>
                            <div className="col-span-2 flex justify-center gap-1">
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => handleStartEditFabric(originalIndex, fabric)}
                                className="h-9 w-9 opacity-0 group-hover:opacity-100 text-primary hover:text-primary hover:bg-primary/10 transition-all"
                              >
                                <Pencil className="h-4 w-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => handleRemoveFabricType(fabric.name)}
                                className="h-9 w-9 opacity-0 group-hover:opacity-100 text-destructive hover:text-destructive hover:bg-destructive/10 transition-all"
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                          </>
                        )}
                      </div>
                    );
                  })
                )}
              </div>
            </ScrollArea>
          </TabsContent>

          <TabsContent value="usage" className="space-y-6 animate-fade-in">
            {/* Add New Usage Area */}
            <div className="p-5 bg-secondary/30 rounded-xl border border-border/20">
              <Label className="text-xs text-muted-foreground mb-2 block uppercase tracking-wide">Kullanım Yeri</Label>
              <Input
                value={newUsageArea}
                onChange={(e) => setNewUsageArea(e.target.value)}
                placeholder="Yeni kullanım yeri ekle..."
                onKeyDown={(e) => e.key === "Enter" && handleAddUsageArea()}
                className="h-12 bg-background/50 border-border/30 focus:border-primary focus:ring-primary/20"
              />
            </div>

            <div className="flex gap-3">
              <Button
                onClick={handleAddUsageArea}
                disabled={!newUsageArea.trim()}
                className="h-12 px-8 gradient-primary hover:opacity-90 glow-primary-sm font-semibold"
              >
                <Plus className="h-5 w-5 mr-2" />
                Ekle
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
                            Her satır bir kullanım yeri olacak. 3+ yanyana A harfi içeren satırlar otomatik filtrelenir.
                          </p>
                        </div>
                        <Textarea
                          value={usageBulkPasteText}
                          onChange={(e) => setUsageBulkPasteText(e.target.value)}
                          placeholder="Kullanım yerlerini buraya yapıştırın...&#10;BEDEN&#10;KOL&#10;YAKA&#10;MANŞET..."
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
                            Kullanım Yerlerini Düzenleyin ({parsedUsageBulkItems.length} adet)
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
                            {/* Header */}
                            <div className="grid grid-cols-12 gap-2 px-3 py-2 bg-primary/10 rounded-lg text-xs font-semibold text-primary uppercase tracking-wide sticky top-0 z-10">
                              <div className="col-span-10">Kullanım Yeri</div>
                              <div className="col-span-2 text-center">İşlem</div>
                            </div>

                            {parsedUsageBulkItems.map((item, index) => (
                              <div 
                                key={index} 
                                className="grid grid-cols-12 gap-2 items-center p-3 bg-secondary/30 rounded-lg border border-border/20 hover:border-primary/30 transition-all group"
                              >
                                <div className="col-span-10">
                                  <Input
                                    value={item}
                                    onChange={(e) => handleUpdateUsageBulkItem(index, e.target.value)}
                                    className="h-10 text-sm bg-background/50"
                                  />
                                </div>
                                <div className="col-span-2 flex justify-center">
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    onClick={() => handleRemoveUsageBulkItem(index)}
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
                          onClick={handleConfirmUsageBulkImport}
                          className="w-full h-12 gradient-primary hover:opacity-90"
                          disabled={parsedUsageBulkItems.length === 0}
                        >
                          <Check className="h-5 w-5 mr-2" />
                          Tümünü Ekle ({parsedUsageBulkItems.filter(i => i.trim()).length} kullanım yeri)
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
                className="pl-12 h-12 bg-secondary/30 border-border/30 focus:border-primary"
              />
            </div>

            {/* List */}
            <ScrollArea className="h-[450px] rounded-xl border border-border/30 bg-background/50 scrollbar-netflix">
              <div className="p-4 space-y-2">
                {filteredUsageAreas.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
                    <MapPin className="h-12 w-12 mb-4 opacity-30" />
                    <p>{usageSearch ? "Sonuç bulunamadı" : "Henüz kullanım yeri eklenmemiş"}</p>
                  </div>
                ) : (
                  filteredUsageAreas.map((area, index) => (
                    <div
                      key={index}
                      className="flex items-center justify-between p-4 bg-secondary/30 rounded-lg border border-border/20 hover:border-primary/30 transition-all group"
                    >
                      <span className="text-sm font-medium">{area}</span>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleRemoveUsageArea(area)}
                        className="h-9 w-9 opacity-0 group-hover:opacity-100 text-destructive hover:text-destructive hover:bg-destructive/10 transition-all"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  ))
                )}
              </div>
            </ScrollArea>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}