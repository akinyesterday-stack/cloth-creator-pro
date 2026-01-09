import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { 
  ArrowLeft, 
  Loader2, 
  DollarSign, 
  Plus, 
  Trash2, 
  Pencil, 
  Check, 
  X,
  Search,
  Save
} from "lucide-react";

interface FabricPrice {
  id: string;
  fabric_name: string;
  en: number;
  gramaj: number;
  fiyat: number;
}

export default function FabricPrices() {
  const navigate = useNavigate();
  const { user, isLoading: authLoading } = useAuth();
  
  const [fabricPrices, setFabricPrices] = useState<FabricPrice[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [search, setSearch] = useState("");
  
  // New fabric form
  const [newFabricName, setNewFabricName] = useState("");
  const [newEn, setNewEn] = useState<number>(0);
  const [newGramaj, setNewGramaj] = useState<number>(0);
  const [newFiyat, setNewFiyat] = useState<number>(0);
  const [isAdding, setIsAdding] = useState(false);
  
  // Edit state
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<FabricPrice | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (!authLoading && !user) {
      navigate("/auth");
    }
  }, [user, authLoading, navigate]);

  useEffect(() => {
    if (user) {
      fetchFabricPrices();
    }
  }, [user]);

  const fetchFabricPrices = async () => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from("fabric_prices")
        .select("*")
        .eq("user_id", user!.id)
        .order("fabric_name");

      if (error) throw error;
      setFabricPrices(data || []);
    } catch (error) {
      console.error("Error fetching fabric prices:", error);
      toast.error("Fiyatlar yüklenirken hata oluştu");
    } finally {
      setIsLoading(false);
    }
  };

  const handleAddFabricPrice = async () => {
    if (!newFabricName.trim()) {
      toast.error("Kumaş adı gerekli");
      return;
    }

    setIsAdding(true);
    try {
      const { error } = await supabase
        .from("fabric_prices")
        .insert({
          user_id: user!.id,
          fabric_name: newFabricName.trim(),
          en: newEn,
          gramaj: newGramaj,
          fiyat: newFiyat,
        });

      if (error) {
        if (error.code === "23505") {
          toast.error("Bu kumaş zaten mevcut");
        } else {
          throw error;
        }
      } else {
        toast.success("Kumaş fiyatı eklendi");
        setNewFabricName("");
        setNewEn(0);
        setNewGramaj(0);
        setNewFiyat(0);
        fetchFabricPrices();
      }
    } catch (error) {
      console.error("Error adding fabric price:", error);
      toast.error("Kumaş fiyatı eklenirken hata oluştu");
    } finally {
      setIsAdding(false);
    }
  };

  const handleStartEdit = (fabric: FabricPrice) => {
    setEditingId(fabric.id);
    setEditForm({ ...fabric });
  };

  const handleSaveEdit = async () => {
    if (!editForm) return;

    setIsSaving(true);
    try {
      const { error } = await supabase
        .from("fabric_prices")
        .update({
          fabric_name: editForm.fabric_name,
          en: editForm.en,
          gramaj: editForm.gramaj,
          fiyat: editForm.fiyat,
        })
        .eq("id", editForm.id);

      if (error) throw error;

      toast.success("Fiyat güncellendi");
      setEditingId(null);
      setEditForm(null);
      fetchFabricPrices();
    } catch (error) {
      console.error("Error updating fabric price:", error);
      toast.error("Fiyat güncellenirken hata oluştu");
    } finally {
      setIsSaving(false);
    }
  };

  const handleCancelEdit = () => {
    setEditingId(null);
    setEditForm(null);
  };

  const handleDelete = async (id: string) => {
    try {
      const { error } = await supabase
        .from("fabric_prices")
        .delete()
        .eq("id", id);

      if (error) throw error;

      toast.success("Kumaş fiyatı silindi");
      fetchFabricPrices();
    } catch (error) {
      console.error("Error deleting fabric price:", error);
      toast.error("Kumaş fiyatı silinirken hata oluştu");
    }
  };

  const filteredPrices = fabricPrices.filter(fp =>
    fp.fabric_name.toLowerCase().includes(search.toLowerCase())
  );

  if (authLoading || !user) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="fixed inset-0 gradient-mesh pointer-events-none" />
      
      <header className="sticky top-0 z-40 border-b border-border/50 bg-card/80 backdrop-blur-xl">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" onClick={() => navigate("/")}>
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div className="flex items-center gap-3">
              <div className="p-2 bg-primary/20 rounded-lg">
                <DollarSign className="h-6 w-6 text-primary" />
              </div>
              <h1 className="text-2xl font-display font-bold tracking-wide">Kalite Fiyatları</h1>
            </div>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8 relative z-10">
        <div className="grid gap-6">
          {/* Add New Fabric Price */}
          <Card className="modern-card">
            <CardHeader className="bg-gradient-to-r from-primary/10 via-primary/5 to-transparent border-b border-border/50">
              <CardTitle className="flex items-center gap-3">
                <Plus className="h-5 w-5 text-primary" />
                <span>Yeni Kalite Fiyatı Ekle</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="p-6">
              <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
                <div className="md:col-span-2">
                  <Label className="text-xs text-muted-foreground mb-2 block uppercase tracking-wide">Kumaş Adı</Label>
                  <Input
                    value={newFabricName}
                    onChange={(e) => setNewFabricName(e.target.value)}
                    placeholder="Örn: 30/1 SÜPREM"
                    className="h-12"
                  />
                </div>
                <div>
                  <Label className="text-xs text-muted-foreground mb-2 block uppercase tracking-wide">En (CM)</Label>
                  <Input
                    type="number"
                    value={newEn || ""}
                    onChange={(e) => setNewEn(Number(e.target.value))}
                    placeholder="0"
                    className="h-12"
                  />
                </div>
                <div>
                  <Label className="text-xs text-muted-foreground mb-2 block uppercase tracking-wide">Gramaj (GR)</Label>
                  <Input
                    type="number"
                    value={newGramaj || ""}
                    onChange={(e) => setNewGramaj(Number(e.target.value))}
                    placeholder="0"
                    className="h-12"
                  />
                </div>
                <div>
                  <Label className="text-xs text-muted-foreground mb-2 block uppercase tracking-wide">Fiyat (₺)</Label>
                  <Input
                    type="number"
                    step="0.01"
                    value={newFiyat || ""}
                    onChange={(e) => setNewFiyat(Number(e.target.value))}
                    placeholder="0.00"
                    className="h-12"
                  />
                </div>
              </div>
              <Button
                onClick={handleAddFabricPrice}
                disabled={!newFabricName.trim() || isAdding}
                className="mt-4 h-12 px-8 gradient-primary hover:opacity-90"
              >
                {isAdding ? (
                  <Loader2 className="h-5 w-5 animate-spin mr-2" />
                ) : (
                  <Plus className="h-5 w-5 mr-2" />
                )}
                Ekle
              </Button>
            </CardContent>
          </Card>

          {/* Fabric Prices List */}
          <Card className="modern-card">
            <CardHeader className="bg-gradient-to-r from-secondary/50 via-secondary/30 to-transparent border-b border-border/50">
              <CardTitle className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <DollarSign className="h-5 w-5 text-primary" />
                  <span>Kayıtlı Fiyatlar</span>
                  <span className="ml-2 px-2 py-0.5 text-xs bg-primary/20 rounded-full">{fabricPrices.length}</span>
                </div>
                <div className="relative w-64">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    placeholder="Kumaş ara..."
                    className="pl-10 h-10"
                  />
                </div>
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              {isLoading ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2 className="h-8 w-8 animate-spin text-primary" />
                </div>
              ) : filteredPrices.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
                  <DollarSign className="h-12 w-12 mb-4 opacity-30" />
                  <p>{search ? "Sonuç bulunamadı" : "Henüz kumaş fiyatı eklenmemiş"}</p>
                </div>
              ) : (
                <ScrollArea className="max-h-[600px]">
                  <table className="w-full">
                    <thead className="sticky top-0 bg-muted/80 backdrop-blur-sm">
                      <tr>
                        <th className="text-left py-3 px-4 font-semibold text-sm">Kumaş Adı</th>
                        <th className="text-right py-3 px-4 font-semibold text-sm">En (CM)</th>
                        <th className="text-right py-3 px-4 font-semibold text-sm">Gramaj (GR)</th>
                        <th className="text-right py-3 px-4 font-semibold text-sm">Fiyat (₺)</th>
                        <th className="w-24"></th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredPrices.map((fabric) => (
                        <tr key={fabric.id} className="border-t border-border/30 hover:bg-primary/5">
                          {editingId === fabric.id ? (
                            <>
                              <td className="py-2 px-2">
                                <Input
                                  value={editForm?.fabric_name || ""}
                                  onChange={(e) => setEditForm(prev => prev ? {...prev, fabric_name: e.target.value} : null)}
                                  className="h-9"
                                />
                              </td>
                              <td className="py-2 px-2">
                                <Input
                                  type="number"
                                  value={editForm?.en || ""}
                                  onChange={(e) => setEditForm(prev => prev ? {...prev, en: Number(e.target.value)} : null)}
                                  className="h-9 text-right w-24"
                                />
                              </td>
                              <td className="py-2 px-2">
                                <Input
                                  type="number"
                                  value={editForm?.gramaj || ""}
                                  onChange={(e) => setEditForm(prev => prev ? {...prev, gramaj: Number(e.target.value)} : null)}
                                  className="h-9 text-right w-24"
                                />
                              </td>
                              <td className="py-2 px-2">
                                <Input
                                  type="number"
                                  step="0.01"
                                  value={editForm?.fiyat || ""}
                                  onChange={(e) => setEditForm(prev => prev ? {...prev, fiyat: Number(e.target.value)} : null)}
                                  className="h-9 text-right w-28"
                                />
                              </td>
                              <td className="py-2 px-2">
                                <div className="flex gap-1">
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    onClick={handleSaveEdit}
                                    disabled={isSaving}
                                    className="h-8 w-8 text-green-600 hover:text-green-700 hover:bg-green-100"
                                  >
                                    {isSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
                                  </Button>
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    onClick={handleCancelEdit}
                                    className="h-8 w-8"
                                  >
                                    <X className="h-4 w-4" />
                                  </Button>
                                </div>
                              </td>
                            </>
                          ) : (
                            <>
                              <td className="py-3 px-4 font-medium">{fabric.fabric_name}</td>
                              <td className="py-3 px-4 text-right font-mono">{fabric.en}</td>
                              <td className="py-3 px-4 text-right font-mono">{fabric.gramaj}</td>
                              <td className="py-3 px-4 text-right font-bold text-primary">₺{Number(fabric.fiyat).toFixed(2)}</td>
                              <td className="py-3 px-2">
                                <div className="flex gap-1">
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    onClick={() => handleStartEdit(fabric)}
                                    className="h-8 w-8 text-blue-600 hover:text-blue-700 hover:bg-blue-50"
                                  >
                                    <Pencil className="h-4 w-4" />
                                  </Button>
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    onClick={() => handleDelete(fabric.id)}
                                    className="h-8 w-8 text-destructive hover:text-destructive hover:bg-destructive/10"
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
                </ScrollArea>
              )}
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
}
