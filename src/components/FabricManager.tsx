import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Settings, Plus, Trash2, Search, Shirt, MapPin } from "lucide-react";

interface FabricManagerProps {
  fabricTypes: string[];
  usageAreas: string[];
  onFabricTypesChange: (types: string[]) => void;
  onUsageAreasChange: (areas: string[]) => void;
}

export function FabricManager({
  fabricTypes,
  usageAreas,
  onFabricTypesChange,
  onUsageAreasChange,
}: FabricManagerProps) {
  const [newFabricType, setNewFabricType] = useState("");
  const [newUsageArea, setNewUsageArea] = useState("");
  const [fabricSearch, setFabricSearch] = useState("");
  const [usageSearch, setUsageSearch] = useState("");

  const handleAddFabricType = () => {
    if (newFabricType.trim() && !fabricTypes.includes(newFabricType.trim())) {
      onFabricTypesChange([...fabricTypes, newFabricType.trim()]);
      setNewFabricType("");
    }
  };

  const handleRemoveFabricType = (type: string) => {
    onFabricTypesChange(fabricTypes.filter((t) => t !== type));
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

  const filteredFabricTypes = fabricTypes.filter((type) =>
    type.toLowerCase().includes(fabricSearch.toLowerCase())
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
            <div className="flex gap-3">
              <div className="flex-1">
                <Input
                  value={newFabricType}
                  onChange={(e) => setNewFabricType(e.target.value)}
                  placeholder="Yeni kumaş türü ekle..."
                  onKeyDown={(e) => e.key === "Enter" && handleAddFabricType()}
                  className="h-11"
                />
              </div>
              <Button
                onClick={handleAddFabricType}
                disabled={!newFabricType.trim()}
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
                value={fabricSearch}
                onChange={(e) => setFabricSearch(e.target.value)}
                placeholder="Kumaş türü ara..."
                className="pl-10 h-10"
              />
            </div>

            {/* List */}
            <ScrollArea className="h-[300px] rounded-xl border border-border/50 bg-muted/20">
              <div className="p-3 space-y-2">
                {filteredFabricTypes.length === 0 ? (
                  <p className="text-center text-muted-foreground py-8">
                    {fabricSearch ? "Sonuç bulunamadı" : "Henüz kumaş türü eklenmemiş"}
                  </p>
                ) : (
                  filteredFabricTypes.map((type, index) => (
                    <div
                      key={index}
                      className="flex items-center justify-between p-3 bg-background rounded-lg border border-border/30 hover:border-primary/30 transition-colors group"
                    >
                      <span className="text-sm font-medium">{type}</span>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleRemoveFabricType(type)}
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
            <ScrollArea className="h-[300px] rounded-xl border border-border/50 bg-muted/20">
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
