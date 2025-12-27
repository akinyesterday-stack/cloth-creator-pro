import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Settings, Plus, Trash2, Search, Shirt, MapPin, Upload, Pencil, Check, X, ClipboardPaste } from "lucide-react";

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

  // Bulk import states
  const [bulkImportOpen, setBulkImportOpen] = useState(false);
  const [bulkPasteText, setBulkPasteText] = useState("");
  const [parsedBulkItems, setParsedBulkItems] = useState<FabricTypeWithSpec[]>([]);

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

  // Bulk import handlers
  const handleParseBulkText = () => {
    const lines = bulkPasteText.trim().split('\n').filter(line => line.trim());
    const items: FabricTypeWithSpec[] = lines.map(line => {
      // Try to parse tab or comma separated values
      const parts = line.split(/[\t,;]/).map(p => p.trim());
      return {
        name: parts[0] || line.trim(),
        en: 0,
        gramaj: 0
      };
    });
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

  const filteredFabricTypes = fabricTypes.filter((fabric) =>
    fabric.name.toLowerCase().includes(fabricSearch.toLowerCase())
  );

  const filteredUsageAreas = usageAreas.filter((area) =>
    area.toLowerCase().includes(usageSearch.toLowerCase())
  );

  return (
    <Card className="border-none shadow-2xl overflow-hidden bg-gradient-to-br from-card via-card to-secondary/20">
      <CardHeader className="bg-gradient-to-r from-secondary/80 via-secondary/50 to-transparent border-b border-border/50">
        <CardTitle className="text-xl flex items-center gap-3">
          <div className="p-2 bg-primary/10 rounded-lg">
            <Settings className="h-5 w-5 text-primary" />
          </div>
          <span className="font-bold">Kumaş & Kullanım Yeri Yönetimi</span>
        </CardTitle>
      </CardHeader>
      <CardContent className="p-6">
        <Tabs defaultValue="fabrics" className="w-full">
          <TabsList className="grid w-full grid-cols-2 mb-6">
            <TabsTrigger value="fabrics" className="flex items-center gap-2">
              <Shirt className="h-4 w-4" />
              Kumaş Türleri ({fabricTypes.length})
            </TabsTrigger>
            <TabsTrigger value="usage" className="flex items-center gap-2">
              <MapPin className="h-4 w-4" />
              Kullanım Yerleri ({usageAreas.length})
            </TabsTrigger>
          </TabsList>

          <TabsContent value="fabrics" className="space-y-4">
            {/* Add New Fabric Type */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
              <div className="md:col-span-2">
                <Label className="text-xs text-muted-foreground mb-1 block">Kumaş Türü</Label>
                <Input
                  value={newFabricType}
                  onChange={(e) => setNewFabricType(e.target.value)}
                  placeholder="Yeni kumaş türü..."
                  className="h-11"
                />
              </div>
              <div>
                <Label className="text-xs text-muted-foreground mb-1 block">En (CM)</Label>
                <Input
                  type="number"
                  value={newFabricEn || ''}
                  onChange={(e) => setNewFabricEn(Number(e.target.value))}
                  placeholder="En"
                  className="h-11"
                />
              </div>
              <div>
                <Label className="text-xs text-muted-foreground mb-1 block">Gramaj (GR)</Label>
                <Input
                  type="number"
                  value={newFabricGramaj || ''}
                  onChange={(e) => setNewFabricGramaj(Number(e.target.value))}
                  placeholder="Gramaj"
                  className="h-11"
                />
              </div>
            </div>

            <div className="flex gap-3">
              <Button
                onClick={handleAddFabricType}
                disabled={!newFabricType.trim()}
                className="h-11 px-6"
              >
                <Plus className="h-4 w-4 mr-2" />
                Ekle
              </Button>

              <Dialog open={bulkImportOpen} onOpenChange={setBulkImportOpen}>
                <DialogTrigger asChild>
                  <Button variant="outline" className="h-11 px-6">
                    <ClipboardPaste className="h-4 w-4 mr-2" />
                    Toplu Ekle (Excel)
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
                  <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                      <Upload className="h-5 w-5" />
                      Toplu Kumaş Türü Ekleme
                    </DialogTitle>
                  </DialogHeader>

                  <div className="space-y-4 flex-1 overflow-hidden flex flex-col">
                    {parsedBulkItems.length === 0 ? (
                      <>
                        <div className="space-y-2">
                          <Label className="text-sm">Excel'den kopyaladığınız kumaş türlerini yapıştırın</Label>
                          <p className="text-xs text-muted-foreground">
                            Her satır bir kumaş türü olacak. Tab veya virgülle ayrılmış değerler de kabul edilir.
                          </p>
                        </div>
                        <Textarea
                          value={bulkPasteText}
                          onChange={(e) => setBulkPasteText(e.target.value)}
                          placeholder="Kumaş türlerini buraya yapıştırın...&#10;30/1 SÜPREM&#10;40/1 İNTERLOK&#10;36/1 RİBANA..."
                          className="min-h-[200px] font-mono text-sm"
                        />
                        <Button 
                          onClick={handleParseBulkText}
                          disabled={!bulkPasteText.trim()}
                          className="w-full"
                        >
                          <Check className="h-4 w-4 mr-2" />
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
                          >
                            <X className="h-4 w-4 mr-1" />
                            Geri
                          </Button>
                        </div>
                        
                        <ScrollArea className="flex-1 max-h-[400px] border rounded-lg">
                          <div className="p-4 space-y-3">
                            {/* Header */}
                            <div className="grid grid-cols-12 gap-2 px-2 py-1 bg-muted rounded text-xs font-semibold text-muted-foreground sticky top-0">
                              <div className="col-span-6">Kumaş Türü</div>
                              <div className="col-span-2 text-center">En (CM)</div>
                              <div className="col-span-2 text-center">Gramaj (GR)</div>
                              <div className="col-span-2 text-center">İşlem</div>
                            </div>

                            {parsedBulkItems.map((item, index) => (
                              <div 
                                key={index} 
                                className="grid grid-cols-12 gap-2 items-center p-2 bg-background rounded-lg border border-border/30 hover:border-primary/30 transition-colors"
                              >
                                <div className="col-span-6">
                                  <Input
                                    value={item.name}
                                    onChange={(e) => handleUpdateBulkItem(index, 'name', e.target.value)}
                                    className="h-9 text-sm"
                                  />
                                </div>
                                <div className="col-span-2">
                                  <Input
                                    type="number"
                                    value={item.en || ''}
                                    onChange={(e) => handleUpdateBulkItem(index, 'en', e.target.value)}
                                    placeholder="En"
                                    className="h-9 text-sm text-center"
                                  />
                                </div>
                                <div className="col-span-2">
                                  <Input
                                    type="number"
                                    value={item.gramaj || ''}
                                    onChange={(e) => handleUpdateBulkItem(index, 'gramaj', e.target.value)}
                                    placeholder="Gramaj"
                                    className="h-9 text-sm text-center"
                                  />
                                </div>
                                <div className="col-span-2 flex justify-center">
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    onClick={() => handleRemoveBulkItem(index)}
                                    className="h-8 w-8 text-destructive hover:text-destructive hover:bg-destructive/10"
                                  >
                                    <Trash2 className="h-4 w-4" />
                                  </Button>
                                </div>
                              </div>
                            ))}
                          </div>
                        </ScrollArea>

                        <div className="flex gap-3 pt-2">
                          <Button 
                            onClick={handleConfirmBulkImport}
                            className="flex-1"
                            disabled={parsedBulkItems.length === 0}
                          >
                            <Check className="h-4 w-4 mr-2" />
                            Tümünü Ekle ({parsedBulkItems.filter(i => i.name.trim()).length} kumaş)
                          </Button>
                        </div>
                      </>
                    )}
                  </div>
                </DialogContent>
              </Dialog>
            </div>

            {/* Search */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                value={fabricSearch}
                onChange={(e) => setFabricSearch(e.target.value)}
                placeholder="Kumaş türü ara..."
                className="pl-10 h-10"
              />
            </div>

            {/* List */}
            <ScrollArea className="h-[400px] rounded-xl border border-border/50 bg-muted/20">
              <div className="p-3 space-y-2">
                {/* Header */}
                <div className="grid grid-cols-12 gap-2 px-3 py-2 bg-primary/10 rounded-lg text-xs font-semibold text-foreground sticky top-0 z-10">
                  <div className="col-span-6">Kumaş Türü</div>
                  <div className="col-span-2 text-center">En (CM)</div>
                  <div className="col-span-2 text-center">Gramaj (GR)</div>
                  <div className="col-span-2 text-center">İşlem</div>
                </div>

                {filteredFabricTypes.length === 0 ? (
                  <p className="text-center text-muted-foreground py-8">
                    {fabricSearch ? "Sonuç bulunamadı" : "Henüz kumaş türü eklenmemiş"}
                  </p>
                ) : (
                  filteredFabricTypes.map((fabric, index) => {
                    const originalIndex = fabricTypes.findIndex(f => f.name === fabric.name);
                    const isEditing = editingFabricIndex === originalIndex;

                    return (
                      <div
                        key={index}
                        className="grid grid-cols-12 gap-2 items-center p-3 bg-background rounded-lg border border-border/30 hover:border-primary/30 transition-colors group"
                      >
                        {isEditing ? (
                          <>
                            <div className="col-span-6">
                              <Input
                                value={editFabricName}
                                onChange={(e) => setEditFabricName(e.target.value)}
                                className="h-9 text-sm"
                              />
                            </div>
                            <div className="col-span-2">
                              <Input
                                type="number"
                                value={editFabricEn || ''}
                                onChange={(e) => setEditFabricEn(Number(e.target.value))}
                                className="h-9 text-sm text-center"
                              />
                            </div>
                            <div className="col-span-2">
                              <Input
                                type="number"
                                value={editFabricGramaj || ''}
                                onChange={(e) => setEditFabricGramaj(Number(e.target.value))}
                                className="h-9 text-sm text-center"
                              />
                            </div>
                            <div className="col-span-2 flex justify-center gap-1">
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => handleSaveEditFabric(originalIndex)}
                                className="h-8 w-8 text-green-600 hover:text-green-700 hover:bg-green-100"
                              >
                                <Check className="h-4 w-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={handleCancelEditFabric}
                                className="h-8 w-8 text-muted-foreground hover:text-foreground"
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
                                className="h-8 w-8 opacity-0 group-hover:opacity-100 text-primary hover:text-primary hover:bg-primary/10 transition-all"
                              >
                                <Pencil className="h-4 w-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => handleRemoveFabricType(fabric.name)}
                                className="h-8 w-8 opacity-0 group-hover:opacity-100 text-destructive hover:text-destructive hover:bg-destructive/10 transition-all"
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

          <TabsContent value="usage" className="space-y-4">
            {/* Add New Usage Area */}
            <div className="flex gap-3">
              <div className="flex-1">
                <Input
                  value={newUsageArea}
                  onChange={(e) => setNewUsageArea(e.target.value)}
                  placeholder="Yeni kullanım yeri ekle..."
                  onKeyDown={(e) => e.key === "Enter" && handleAddUsageArea()}
                  className="h-11"
                />
              </div>
              <Button
                onClick={handleAddUsageArea}
                disabled={!newUsageArea.trim()}
                className="h-11 px-6"
              >
                <Plus className="h-4 w-4 mr-2" />
                Ekle
              </Button>
            </div>

            {/* Search */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                value={usageSearch}
                onChange={(e) => setUsageSearch(e.target.value)}
                placeholder="Kullanım yeri ara..."
                className="pl-10 h-10"
              />
            </div>

            {/* List */}
            <ScrollArea className="h-[400px] rounded-xl border border-border/50 bg-muted/20">
              <div className="p-3 space-y-2">
                {filteredUsageAreas.length === 0 ? (
                  <p className="text-center text-muted-foreground py-8">
                    {usageSearch ? "Sonuç bulunamadı" : "Henüz kullanım yeri eklenmemiş"}
                  </p>
                ) : (
                  filteredUsageAreas.map((area, index) => (
                    <div
                      key={index}
                      className="flex items-center justify-between p-3 bg-background rounded-lg border border-border/30 hover:border-primary/30 transition-colors group"
                    >
                      <span className="text-sm font-medium">{area}</span>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleRemoveUsageArea(area)}
                        className="h-8 w-8 opacity-0 group-hover:opacity-100 text-destructive hover:text-destructive hover:bg-destructive/10 transition-all"
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
