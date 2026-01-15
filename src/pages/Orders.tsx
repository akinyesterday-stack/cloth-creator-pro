import { useState, useEffect } from "react";
import { Header } from "@/components/Header";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Search, Trash2, Calendar, Package, ArrowLeft, Loader2, Plus, Pencil, Check, X, ArrowUpDown } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
import { useNavigate } from "react-router-dom";
import { format } from "date-fns";
import { tr } from "date-fns/locale";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";

interface Order {
  id: string;
  order_name: string;
  description: string | null;
  status: string;
  items: unknown;
  total_amount: number;
  created_at: string;
  updated_at: string;
}

const statusColors: Record<string, string> = {
  pending: "bg-yellow-500/20 text-yellow-700 border-yellow-500/30",
  processing: "bg-blue-500/20 text-blue-700 border-blue-500/30",
  completed: "bg-green-500/20 text-green-700 border-green-500/30",
  cancelled: "bg-red-500/20 text-destructive border-red-500/30",
};

const statusLabels: Record<string, string> = {
  pending: "Beklemede",
  processing: "İşleniyor",
  completed: "Tamamlandı",
  cancelled: "İptal Edildi",
};

const Orders = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [orders, setOrders] = useState<Order[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc");
  
  // Dialog states
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingOrder, setEditingOrder] = useState<Order | null>(null);
  const [orderName, setOrderName] = useState("");
  const [orderDescription, setOrderDescription] = useState("");
  const [orderStatus, setOrderStatus] = useState("pending");

  useEffect(() => {
    if (user) {
      loadOrders();
    }
  }, [user, sortOrder]);

  const loadOrders = async () => {
    if (!user) return;
    
    try {
      const { data, error } = await supabase
        .from("orders")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: sortOrder === "asc" });

      if (error) throw error;
      setOrders(data || []);
    } catch (error) {
      console.error("Error loading orders:", error);
      toast.error("Siparişler yüklenirken hata oluştu");
    } finally {
      setIsLoading(false);
    }
  };

  const handleSaveOrder = async () => {
    if (!user || !orderName.trim()) {
      toast.error("Sipariş adı zorunludur");
      return;
    }

    try {
      if (editingOrder) {
        const { error } = await supabase
          .from("orders")
          .update({
            order_name: orderName.trim(),
            description: orderDescription.trim() || null,
            status: orderStatus,
          })
          .eq("id", editingOrder.id);

        if (error) throw error;
        
        setOrders(orders.map(o => 
          o.id === editingOrder.id 
            ? { ...o, order_name: orderName.trim(), description: orderDescription.trim() || null, status: orderStatus }
            : o
        ));
        toast.success("Sipariş güncellendi");
      } else {
        const { data, error } = await supabase
          .from("orders")
          .insert({
            user_id: user.id,
            order_name: orderName.trim(),
            description: orderDescription.trim() || null,
            status: orderStatus,
          })
          .select()
          .single();

        if (error) throw error;
        
        setOrders([data, ...orders]);
        toast.success("Sipariş oluşturuldu");
      }
      
      handleCloseDialog();
    } catch (error) {
      console.error("Error saving order:", error);
      toast.error("İşlem başarısız");
    }
  };

  const handleDelete = async (id: string) => {
    try {
      const { error } = await supabase
        .from("orders")
        .delete()
        .eq("id", id);

      if (error) throw error;
      
      setOrders(orders.filter(o => o.id !== id));
      toast.success("Sipariş silindi");
    } catch (error) {
      console.error("Error deleting order:", error);
      toast.error("Silme işlemi başarısız");
    }
  };

  const handleOpenEdit = (order: Order) => {
    setEditingOrder(order);
    setOrderName(order.order_name);
    setOrderDescription(order.description || "");
    setOrderStatus(order.status);
    setIsDialogOpen(true);
  };

  const handleCloseDialog = () => {
    setIsDialogOpen(false);
    setEditingOrder(null);
    setOrderName("");
    setOrderDescription("");
    setOrderStatus("pending");
  };

  const filteredOrders = orders.filter(order =>
    order.order_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (order.description?.toLowerCase() || "").includes(searchQuery.toLowerCase())
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
              <h1 className="text-3xl font-bold text-gradient">Siparişler</h1>
              <p className="text-muted-foreground mt-1">
                Siparişlerinizi yönetin ve takip edin
              </p>
            </div>
            
            <div className="flex items-center gap-3 flex-wrap">
              <div className="relative w-full sm:w-80">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Sipariş adı veya açıklama ara..."
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

              <Dialog open={isDialogOpen} onOpenChange={(open) => !open && handleCloseDialog()}>
                <DialogTrigger asChild>
                  <Button className="gap-2">
                    <Plus className="h-4 w-4" />
                    Yeni Sipariş
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>
                      {editingOrder ? "Siparişi Düzenle" : "Yeni Sipariş Oluştur"}
                    </DialogTitle>
                  </DialogHeader>
                  <div className="space-y-4 mt-4">
                    <div>
                      <label className="text-sm font-medium mb-1.5 block">Sipariş Adı</label>
                      <Input
                        placeholder="Sipariş adını girin..."
                        value={orderName}
                        onChange={(e) => setOrderName(e.target.value)}
                      />
                    </div>
                    <div>
                      <label className="text-sm font-medium mb-1.5 block">Açıklama</label>
                      <Textarea
                        placeholder="Sipariş açıklaması (isteğe bağlı)..."
                        value={orderDescription}
                        onChange={(e) => setOrderDescription(e.target.value)}
                        rows={3}
                      />
                    </div>
                    <div>
                      <label className="text-sm font-medium mb-1.5 block">Durum</label>
                      <Select value={orderStatus} onValueChange={setOrderStatus}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="pending">Beklemede</SelectItem>
                          <SelectItem value="processing">İşleniyor</SelectItem>
                          <SelectItem value="completed">Tamamlandı</SelectItem>
                          <SelectItem value="cancelled">İptal Edildi</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="flex justify-end gap-2 pt-2">
                      <Button variant="outline" onClick={handleCloseDialog}>
                        İptal
                      </Button>
                      <Button onClick={handleSaveOrder}>
                        {editingOrder ? "Güncelle" : "Oluştur"}
                      </Button>
                    </div>
                  </div>
                </DialogContent>
              </Dialog>
            </div>
          </div>
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : filteredOrders.length === 0 ? (
          <Card className="glass-card">
            <CardContent className="py-12 text-center">
              <Package className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <h3 className="text-lg font-medium mb-2">
                {searchQuery ? "Sonuç bulunamadı" : "Henüz sipariş yok"}
              </h3>
              <p className="text-muted-foreground">
                {searchQuery 
                  ? "Farklı bir arama terimi deneyin" 
                  : "Yeni bir sipariş oluşturmak için yukarıdaki butonu kullanın"}
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4">
            {filteredOrders.map((order) => (
              <Card key={order.id} className="glass-card hover:shadow-lg transition-shadow group">
                <CardContent className="p-4">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-3 mb-2">
                        <h3 className="font-semibold text-lg truncate">{order.order_name}</h3>
                        <Badge className={`shrink-0 ${statusColors[order.status] || ""}`}>
                          {statusLabels[order.status] || order.status}
                        </Badge>
                      </div>
                      
                      {order.description && (
                        <p className="text-sm text-muted-foreground mb-2 line-clamp-2">
                          {order.description}
                        </p>
                      )}
                      
                      <div className="flex items-center gap-4 text-sm text-muted-foreground">
                        <span className="flex items-center gap-1">
                          <Calendar className="h-3.5 w-3.5" />
                          {format(new Date(order.created_at), "d MMMM yyyy, HH:mm", { locale: tr })}
                        </span>
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-2 shrink-0">
                      <Button 
                        variant="outline" 
                        size="icon"
                        onClick={() => handleOpenEdit(order)}
                        title="Düzenle"
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                      
                      <Button 
                        variant="outline" 
                        size="icon"
                        className="text-destructive hover:text-destructive"
                        onClick={() => handleDelete(order.id)}
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
            TAHA GİYİM - 2025 ARALIK - AKIN ALTUN
          </p>
        </div>
      </footer>
    </div>
  );
};

export default Orders;
