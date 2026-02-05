import { useState, useRef, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { ArrowLeft, Upload, Plus, Trash2, Loader2, Package, Calendar, Save, Send } from "lucide-react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

interface OrderItem {
  id: string;
  jit: boolean;
  satis_bolgesi: string;
  model: string;
  option_name: string;
  inspection_date: string;
  size_0m_1m: number;
  size_1m_3m: number;
  size_3m_6m: number;
  size_6m_9m: number;
  asorti_0m_1m: number;
  asorti_1m_3m: number;
  asorti_3m_6m: number;
  asorti_6m_9m: number;
  asorti_count: number;
  total_quantity: number;
}

interface TedarikSorumlusu {
  id: string;
  user_id: string;
  full_name: string;
}

const SIZES = ["0m-1m", "1m-3m", "3m-6m", "6m-9m"];
const ASORTI_DEFAULTS = { "0m-1m": 1, "1m-3m": 3, "3m-6m": 3, "6m-9m": 1 };

export default function BuyerNewOrder() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [loading, setLoading] = useState(false);
  const [tedarikSorumlulari, setTedarikSorumlulari] = useState<TedarikSorumlusu[]>([]);

  // Form fields
  const [modelName, setModelName] = useState("");
  const [modelImage, setModelImage] = useState<string | null>(null);
  const [brand, setBrand] = useState("LC WAIKIKI");
  const [season, setSeason] = useState("");
  const [malTanimi, setMalTanimi] = useState("");
  const [merchAltGrup, setMerchAltGrup] = useState("");
  const [yiInspectionDate, setYiInspectionDate] = useState("");
  const [ydInspectionDate, setYdInspectionDate] = useState("");
  const [teslimYeri, setTeslimYeri] = useState("LCWaikiki Depoları");
  const [unitPrice, setUnitPrice] = useState(0);
  const [kdvRate, setKdvRate] = useState(10);
  const [fabricPrice, setFabricPrice] = useState(0);
  const [optionPrice, setOptionPrice] = useState("");
  const [profitMargin, setProfitMargin] = useState(15);
  const [assignedTo, setAssignedTo] = useState("");

  // Order items
  const [items, setItems] = useState<OrderItem[]>([]);

  // Fetch tedarik sorumlulari
  useEffect(() => {
    const fetchTedarikSorumlulari = async () => {
      const { data } = await supabase
        .from("profiles")
        .select("id, user_id, full_name")
        .eq("user_type", "tedarik_sorumlusu")
        .eq("status", "approved");

      if (data) {
        setTedarikSorumlulari(data);
      }
    };
    fetchTedarikSorumlulari();
  }, []);

  // Generate 7-digit PO number
  const generatePoNumber = () => {
    return Math.floor(1000000 + Math.random() * 9000000).toString();
  };

  // Calculate totals
  const totalQuantity = items.reduce((sum, item) => sum + item.total_quantity, 0);
  const totalAmount = totalQuantity * unitPrice;
  const kdvAmount = totalAmount * (kdvRate / 100);
  const totalWithKdv = totalAmount + kdvAmount;
  const profitAmount = totalAmount * (profitMargin / 100);

  const addItem = () => {
    const newItem: OrderItem = {
      id: crypto.randomUUID(),
      jit: false,
      satis_bolgesi: "Yurt İçi",
      model: "",
      option_name: "",
      inspection_date: yiInspectionDate,
      size_0m_1m: 0,
      size_1m_3m: 0,
      size_3m_6m: 0,
      size_6m_9m: 0,
      asorti_0m_1m: ASORTI_DEFAULTS["0m-1m"],
      asorti_1m_3m: ASORTI_DEFAULTS["1m-3m"],
      asorti_3m_6m: ASORTI_DEFAULTS["3m-6m"],
      asorti_6m_9m: ASORTI_DEFAULTS["6m-9m"],
      asorti_count: 0,
      total_quantity: 0,
    };
    setItems([...items, newItem]);
  };

  const updateItem = (id: string, field: keyof OrderItem, value: any) => {
    setItems(items.map(item => {
      if (item.id !== id) return item;
      
      const updated = { ...item, [field]: value };
      
      // Recalculate total
      const openTotal = updated.size_0m_1m + updated.size_1m_3m + updated.size_3m_6m + updated.size_6m_9m;
      const asortiTotal = updated.asorti_count * (updated.asorti_0m_1m + updated.asorti_1m_3m + updated.asorti_3m_6m + updated.asorti_6m_9m);
      updated.total_quantity = openTotal + asortiTotal;
      
      return updated;
    }));
  };

  const removeItem = (id: string) => {
    setItems(items.filter(item => item.id !== id));
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setModelImage(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSubmit = async (sendToTedarik: boolean) => {
    if (!modelName.trim()) {
      toast({ title: "Hata", description: "Model adı gerekli", variant: "destructive" });
      return;
    }

    if (items.length === 0) {
      toast({ title: "Hata", description: "En az bir kalem ekleyin", variant: "destructive" });
      return;
    }

    if (sendToTedarik && !assignedTo) {
      toast({ title: "Hata", description: "Tedarik sorumlusu seçin", variant: "destructive" });
      return;
    }

    setLoading(true);

    try {
      const poNumber = generatePoNumber();

      // Create order
      const { data: orderData, error: orderError } = await supabase
        .from("buyer_orders")
        .insert({
          user_id: user?.id,
          po_number: poNumber,
          model_name: modelName,
          model_image: modelImage,
          brand,
          season,
          mal_tanimi: malTanimi,
          merch_alt_grup: merchAltGrup,
          yi_inspection_date: yiInspectionDate || null,
          yd_inspection_date: ydInspectionDate || null,
          teslim_yeri: teslimYeri,
          total_quantity: totalQuantity,
          unit_price: unitPrice,
          total_amount: totalAmount,
          kdv_rate: kdvRate,
          kdv_amount: kdvAmount,
          total_with_kdv: totalWithKdv,
          profit_margin: profitMargin,
          profit_amount: profitAmount,
          fabric_price: fabricPrice,
          option_price: optionPrice,
          assigned_to: sendToTedarik ? assignedTo : null,
          status: sendToTedarik ? "sent" : "draft",
        })
        .select()
        .single();

      if (orderError) throw orderError;

      // Create order items
      if (orderData && items.length > 0) {
        const orderItems = items.map(item => ({
          order_id: orderData.id,
          jit: item.jit,
          satis_bolgesi: item.satis_bolgesi,
          model: item.model,
          option_name: item.option_name,
          inspection_date: item.inspection_date || null,
          size_0m_1m: item.size_0m_1m,
          size_1m_3m: item.size_1m_3m,
          size_3m_6m: item.size_3m_6m,
          size_6m_9m: item.size_6m_9m,
          asorti_0m_1m: item.asorti_0m_1m,
          asorti_1m_3m: item.asorti_1m_3m,
          asorti_3m_6m: item.asorti_3m_6m,
          asorti_6m_9m: item.asorti_6m_9m,
          asorti_count: item.asorti_count,
          total_quantity: item.total_quantity,
        }));

        const { error: itemsError } = await supabase
          .from("buyer_order_items")
          .insert(orderItems);

        if (itemsError) throw itemsError;
      }

      toast({
        title: "Başarılı",
        description: sendToTedarik 
          ? `Sipariş oluşturuldu ve tedarik sorumlusuna gönderildi (PO: ${poNumber})`
          : `Sipariş taslak olarak kaydedildi (PO: ${poNumber})`,
      });

      navigate("/buyer");
    } catch (error: any) {
      toast({
        title: "Hata",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="fixed inset-0 gradient-mesh pointer-events-none" />
      
      {/* Header */}
      <header className="border-b border-border/50 bg-card/80 backdrop-blur-sm sticky top-0 z-50">
        <div className="container mx-auto px-4 py-4 flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => navigate("/buyer")}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-xl font-bold">Yeni Sipariş Oluştur</h1>
            <p className="text-sm text-muted-foreground">LC Waikiki formatında sipariş girişi</p>
          </div>
        </div>
      </header>
      
      <main className="container mx-auto px-4 py-8 relative z-10">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Column - Main Info */}
          <div className="lg:col-span-2 space-y-6">
            {/* Basic Info */}
            <Card className="modern-card">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Package className="h-5 w-5" />
                  Sipariş Bilgileri
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Model Adı *</Label>
                    <Input
                      value={modelName}
                      onChange={(e) => setModelName(e.target.value)}
                      placeholder="UST,ERHEN TKM-6S"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Marka</Label>
                    <Input
                      value={brand}
                      onChange={(e) => setBrand(e.target.value)}
                      placeholder="LC WAIKIKI"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Sezon</Label>
                    <Input
                      value={season}
                      onChange={(e) => setSeason(e.target.value)}
                      placeholder="S6"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Merch Alt Grup</Label>
                    <Input
                      value={merchAltGrup}
                      onChange={(e) => setMerchAltGrup(e.target.value)}
                      placeholder="CKB"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>Mal Tanımı</Label>
                  <Input
                    value={malTanimi}
                    onChange={(e) => setMalTanimi(e.target.value)}
                    placeholder="BASIC YENİDOĞAN TAKIM"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Yİ Inspection Tarihi</Label>
                    <Input
                      type="date"
                      value={yiInspectionDate}
                      onChange={(e) => setYiInspectionDate(e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>YD Inspection Tarihi</Label>
                    <Input
                      type="date"
                      value={ydInspectionDate}
                      onChange={(e) => setYdInspectionDate(e.target.value)}
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>Teslim Yeri</Label>
                  <Input
                    value={teslimYeri}
                    onChange={(e) => setTeslimYeri(e.target.value)}
                    placeholder="LCWaikiki Depoları"
                  />
                </div>
              </CardContent>
            </Card>

            {/* Price Info */}
            <Card className="modern-card">
              <CardHeader>
                <CardTitle>Fiyat Bilgileri</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <Label>Birim Fiyat (₺)</Label>
                    <Input
                      type="number"
                      value={unitPrice}
                      onChange={(e) => setUnitPrice(Number(e.target.value))}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>KDV Oranı (%)</Label>
                    <Input
                      type="number"
                      value={kdvRate}
                      onChange={(e) => setKdvRate(Number(e.target.value))}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Kar Marjı (%)</Label>
                    <Input
                      type="number"
                      value={profitMargin}
                      onChange={(e) => setProfitMargin(Number(e.target.value))}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Kumaş Fiyatı (₺)</Label>
                    <Input
                      type="number"
                      value={fabricPrice}
                      onChange={(e) => setFabricPrice(Number(e.target.value))}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Option Alım Fiyatı</Label>
                    <Input
                      value={optionPrice}
                      onChange={(e) => setOptionPrice(e.target.value)}
                      placeholder="CREAM: 184,00 ₺"
                    />
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Order Items */}
            <Card className="modern-card">
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle>Sipariş Kalemleri</CardTitle>
                <Button onClick={addItem} size="sm">
                  <Plus className="h-4 w-4 mr-1" />
                  Kalem Ekle
                </Button>
              </CardHeader>
              <CardContent>
                {items.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <p>Henüz kalem eklenmedi</p>
                    <Button variant="outline" onClick={addItem} className="mt-4">
                      <Plus className="h-4 w-4 mr-2" />
                      İlk Kalemi Ekle
                    </Button>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Model</TableHead>
                          <TableHead>Option</TableHead>
                          <TableHead className="text-center" colSpan={4}>Açık Adet</TableHead>
                          <TableHead>Asorti Sayısı</TableHead>
                          <TableHead>Toplam</TableHead>
                          <TableHead></TableHead>
                        </TableRow>
                        <TableRow>
                          <TableHead></TableHead>
                          <TableHead></TableHead>
                          {SIZES.map(size => (
                            <TableHead key={size} className="text-center text-xs">{size}</TableHead>
                          ))}
                          <TableHead></TableHead>
                          <TableHead></TableHead>
                          <TableHead></TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {items.map((item) => (
                          <TableRow key={item.id}>
                            <TableCell>
                              <Input
                                value={item.model}
                                onChange={(e) => updateItem(item.id, "model", e.target.value)}
                                className="w-24"
                                placeholder="S6E713Z1"
                              />
                            </TableCell>
                            <TableCell>
                              <Input
                                value={item.option_name}
                                onChange={(e) => updateItem(item.id, "option_name", e.target.value)}
                                className="w-28"
                                placeholder="CREAM-FRC"
                              />
                            </TableCell>
                            <TableCell>
                              <Input
                                type="number"
                                value={item.size_0m_1m}
                                onChange={(e) => updateItem(item.id, "size_0m_1m", Number(e.target.value))}
                                className="w-16 text-center"
                              />
                            </TableCell>
                            <TableCell>
                              <Input
                                type="number"
                                value={item.size_1m_3m}
                                onChange={(e) => updateItem(item.id, "size_1m_3m", Number(e.target.value))}
                                className="w-16 text-center"
                              />
                            </TableCell>
                            <TableCell>
                              <Input
                                type="number"
                                value={item.size_3m_6m}
                                onChange={(e) => updateItem(item.id, "size_3m_6m", Number(e.target.value))}
                                className="w-16 text-center"
                              />
                            </TableCell>
                            <TableCell>
                              <Input
                                type="number"
                                value={item.size_6m_9m}
                                onChange={(e) => updateItem(item.id, "size_6m_9m", Number(e.target.value))}
                                className="w-16 text-center"
                              />
                            </TableCell>
                            <TableCell>
                              <Input
                                type="number"
                                value={item.asorti_count}
                                onChange={(e) => updateItem(item.id, "asorti_count", Number(e.target.value))}
                                className="w-20 text-center"
                              />
                            </TableCell>
                            <TableCell className="font-medium">
                              {item.total_quantity.toLocaleString()}
                            </TableCell>
                            <TableCell>
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => removeItem(item.id)}
                                className="text-destructive hover:text-destructive"
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Right Column - Image & Summary */}
          <div className="space-y-6">
            {/* Image Upload */}
            <Card className="modern-card">
              <CardHeader>
                <CardTitle>Model Resmi</CardTitle>
              </CardHeader>
              <CardContent>
                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={handleImageUpload}
                  accept="image/*"
                  className="hidden"
                />
                {modelImage ? (
                  <div className="relative">
                    <img
                      src={modelImage}
                      alt="Model"
                      className="w-full h-48 object-contain rounded-lg border"
                    />
                    <Button
                      variant="outline"
                      size="sm"
                      className="absolute bottom-2 right-2"
                      onClick={() => fileInputRef.current?.click()}
                    >
                      Değiştir
                    </Button>
                  </div>
                ) : (
                  <button
                    onClick={() => fileInputRef.current?.click()}
                    className="w-full h-48 border-2 border-dashed border-border rounded-lg flex flex-col items-center justify-center gap-2 text-muted-foreground hover:border-primary hover:text-primary transition-colors"
                  >
                    <Upload className="h-8 w-8" />
                    <span>Resim Yükle</span>
                  </button>
                )}
              </CardContent>
            </Card>

            {/* Summary */}
            <Card className="modern-card">
              <CardHeader>
                <CardTitle>Sipariş Özeti</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Toplam Adet:</span>
                  <span className="font-bold">{totalQuantity.toLocaleString()}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Toplam Tutar:</span>
                  <span className="font-medium">{totalAmount.toLocaleString("tr-TR")} ₺</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">%{kdvRate} KDV:</span>
                  <span>{kdvAmount.toLocaleString("tr-TR")} ₺</span>
                </div>
                <div className="flex justify-between border-t pt-2">
                  <span className="font-medium">KDV'li Toplam:</span>
                  <span className="font-bold text-lg">{totalWithKdv.toLocaleString("tr-TR")} ₺</span>
                </div>
                <div className="flex justify-between text-green-500">
                  <span>Tahmini Kar (%{profitMargin}):</span>
                  <span className="font-medium">{profitAmount.toLocaleString("tr-TR")} ₺</span>
                </div>
              </CardContent>
            </Card>

            {/* Assign & Submit */}
            <Card className="modern-card">
              <CardHeader>
                <CardTitle>Gönderim</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label>Tedarik Sorumlusu</Label>
                  <Select value={assignedTo} onValueChange={setAssignedTo}>
                    <SelectTrigger>
                      <SelectValue placeholder="Seçin..." />
                    </SelectTrigger>
                    <SelectContent>
                      {tedarikSorumlulari.map((ts) => (
                        <SelectItem key={ts.user_id} value={ts.user_id}>
                          {ts.full_name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="flex flex-col gap-2">
                  <Button
                    onClick={() => handleSubmit(true)}
                    disabled={loading}
                    className="gradient-primary hover:opacity-90"
                  >
                    {loading ? (
                      <Loader2 className="h-4 w-4 animate-spin mr-2" />
                    ) : (
                      <Send className="h-4 w-4 mr-2" />
                    )}
                    Gönder
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => handleSubmit(false)}
                    disabled={loading}
                  >
                    <Save className="h-4 w-4 mr-2" />
                    Taslak Kaydet
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </main>
    </div>
  );
}