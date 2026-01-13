import { useState, useEffect } from "react";
import { Header } from "@/components/Header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Search, Trash2, Eye, Calendar, Package, ArrowLeft, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
import { useNavigate } from "react-router-dom";
import { format } from "date-fns";
import { tr } from "date-fns/locale";

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
  const [selectedCost, setSelectedCost] = useState<SavedCost | null>(null);

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
      
      // Parse items from JSONB
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
      toast.success("Maliyet silindi");
    } catch (error) {
      console.error("Error deleting cost:", error);
      toast.error("Silme işlemi başarısız");
    }
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
            
            <div className="relative w-full sm:w-80">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Model adı, kumaş veya kullanım yeri ara..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
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
          <div className="grid gap-4">
            {filteredCosts.map((cost) => (
              <Card key={cost.id} className="glass-card hover:shadow-lg transition-shadow">
                <CardContent className="p-4">
                  <div className="flex items-start justify-between gap-4">
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
                        <span className="font-medium text-foreground">
                          Toplam: ₺{cost.total_cost.toFixed(2)}
                        </span>
                      </div>
                      
                      <div className="flex flex-wrap gap-1.5">
                        {cost.items.slice(0, 4).map((item, idx) => (
                          <Badge key={idx} variant="outline" className="text-xs">
                            {item.fabricType}
                          </Badge>
                        ))}
                        {cost.items.length > 4 && (
                          <Badge variant="outline" className="text-xs">
                            +{cost.items.length - 4} daha
                          </Badge>
                        )}
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-2 shrink-0">
                      {cost.images.length > 0 && (
                        <img 
                          src={cost.images[0]} 
                          alt="Model" 
                          className="h-16 w-16 object-cover rounded-lg border"
                        />
                      )}
                      
                      <Dialog>
                        <DialogTrigger asChild>
                          <Button 
                            variant="outline" 
                            size="icon"
                            onClick={() => setSelectedCost(cost)}
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                        </DialogTrigger>
                        <DialogContent className="max-w-4xl max-h-[90vh] overflow-auto">
                          <DialogHeader>
                            <DialogTitle>{cost.model_name}</DialogTitle>
                          </DialogHeader>
                          
                          {cost.images.length > 0 && (
                            <div className="flex gap-2 overflow-x-auto pb-2">
                              {cost.images.map((img, idx) => (
                                <img 
                                  key={idx}
                                  src={img} 
                                  alt={`Model ${idx + 1}`}
                                  className="h-32 w-32 object-cover rounded-lg border shrink-0"
                                />
                              ))}
                            </div>
                          )}
                          
                          <Table>
                            <TableHeader>
                              <TableRow>
                                <TableHead>Kumaş Türü</TableHead>
                                <TableHead>Kullanım Yeri</TableHead>
                                <TableHead className="text-right">En (CM)</TableHead>
                                <TableHead className="text-right">Gramaj (GR)</TableHead>
                                <TableHead className="text-right">Fiyat (₺)</TableHead>
                              </TableRow>
                            </TableHeader>
                            <TableBody>
                              {cost.items.map((item) => (
                                <TableRow key={item.id}>
                                  <TableCell className="font-medium">{item.fabricType}</TableCell>
                                  <TableCell>{item.usageArea}</TableCell>
                                  <TableCell className="text-right">{item.en}</TableCell>
                                  <TableCell className="text-right">{item.gramaj}</TableCell>
                                  <TableCell className="text-right">₺{item.fiyat.toFixed(2)}</TableCell>
                                </TableRow>
                              ))}
                            </TableBody>
                          </Table>
                          
                          <div className="flex justify-end pt-4 border-t">
                            <div className="text-lg font-semibold">
                              Toplam: ₺{cost.total_cost.toFixed(2)}
                            </div>
                          </div>
                        </DialogContent>
                      </Dialog>
                      
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
