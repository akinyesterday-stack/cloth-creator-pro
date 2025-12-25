import { useState, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { fabricTypes, usageAreas, calculatePrice, suppliers } from "@/data/fabricData";
import { Calculator, Plus, Trash2 } from "lucide-react";

interface CostItem {
  id: string;
  fabricType: string;
  usageArea: string;
  quantity: number;
  unitPrice: number;
  total: number;
}

export function CostCalculator() {
  const [items, setItems] = useState<CostItem[]>([]);
  const [selectedFabric, setSelectedFabric] = useState("");
  const [selectedUsage, setSelectedUsage] = useState("");
  const [quantity, setQuantity] = useState<number>(0);
  const [selectedSupplier, setSelectedSupplier] = useState("");

  const unitPrice = useMemo(() => {
    if (!selectedFabric || !selectedUsage) return 0;
    return calculatePrice(selectedFabric, selectedUsage);
  }, [selectedFabric, selectedUsage]);

  const totalCost = useMemo(() => {
    return items.reduce((sum, item) => sum + item.total, 0);
  }, [items]);

  const handleAddItem = () => {
    if (!selectedFabric || !selectedUsage || quantity <= 0) return;

    const newItem: CostItem = {
      id: Date.now().toString(),
      fabricType: selectedFabric,
      usageArea: selectedUsage,
      quantity,
      unitPrice,
      total: unitPrice * quantity,
    };

    setItems([...items, newItem]);
    setSelectedFabric("");
    setSelectedUsage("");
    setQuantity(0);
  };

  const handleRemoveItem = (id: string) => {
    setItems(items.filter((item) => item.id !== id));
  };

  const handleClearAll = () => {
    setItems([]);
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <Card className="border-none shadow-lg">
        <CardHeader className="gradient-primary rounded-t-lg">
          <CardTitle className="text-primary-foreground flex items-center gap-2">
            <Calculator className="h-5 w-5" />
            Maliyet Hesaplayıcı
          </CardTitle>
        </CardHeader>
        <CardContent className="p-6 space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="space-y-2">
              <Label htmlFor="fabric-type">Kumaş Türü</Label>
              <Select value={selectedFabric} onValueChange={setSelectedFabric}>
                <SelectTrigger id="fabric-type">
                  <SelectValue placeholder="Kumaş seçin..." />
                </SelectTrigger>
                <SelectContent className="max-h-[300px]">
                  {fabricTypes.map((fabric) => (
                    <SelectItem key={fabric} value={fabric}>
                      {fabric}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="usage-area">Kullanım Yeri</Label>
              <Select value={selectedUsage} onValueChange={setSelectedUsage}>
                <SelectTrigger id="usage-area">
                  <SelectValue placeholder="Kullanım yeri seçin..." />
                </SelectTrigger>
                <SelectContent className="max-h-[300px]">
                  {usageAreas.map((usage) => (
                    <SelectItem key={usage} value={usage}>
                      {usage}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="supplier">Kumaşçı</Label>
              <Select value={selectedSupplier} onValueChange={setSelectedSupplier}>
                <SelectTrigger id="supplier">
                  <SelectValue placeholder="Kumaşçı seçin..." />
                </SelectTrigger>
                <SelectContent>
                  {suppliers.map((supplier) => (
                    <SelectItem key={supplier} value={supplier}>
                      {supplier}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="quantity">Miktar (kg)</Label>
              <Input
                id="quantity"
                type="number"
                min="0"
                value={quantity || ""}
                onChange={(e) => setQuantity(Number(e.target.value))}
                placeholder="0"
              />
            </div>
          </div>

          <div className="flex flex-col sm:flex-row items-start sm:items-end gap-4 p-4 bg-secondary/50 rounded-lg">
            <div className="flex-1 space-y-1">
              <span className="text-sm text-muted-foreground">Birim Fiyat</span>
              <p className="text-2xl font-bold text-primary">
                {unitPrice > 0 ? `₺${unitPrice.toFixed(2)}` : "—"}
              </p>
            </div>
            <div className="flex-1 space-y-1">
              <span className="text-sm text-muted-foreground">Hesaplanan Tutar</span>
              <p className="text-2xl font-bold text-accent">
                {unitPrice > 0 && quantity > 0
                  ? `₺${(unitPrice * quantity).toFixed(2)}`
                  : "—"}
              </p>
            </div>
            <Button
              onClick={handleAddItem}
              disabled={!selectedFabric || !selectedUsage || quantity <= 0}
              className="gradient-accent text-accent-foreground hover:opacity-90"
            >
              <Plus className="h-4 w-4 mr-2" />
              Ekle
            </Button>
          </div>
        </CardContent>
      </Card>

      {items.length > 0 && (
        <Card className="border-none shadow-lg animate-slide-in">
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-lg">Maliyet Listesi</CardTitle>
            <Button variant="outline" size="sm" onClick={handleClearAll}>
              <Trash2 className="h-4 w-4 mr-2" />
              Temizle
            </Button>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-border">
                    <th className="text-left py-3 px-4 font-medium text-muted-foreground">
                      Kumaş Türü
                    </th>
                    <th className="text-left py-3 px-4 font-medium text-muted-foreground">
                      Kullanım Yeri
                    </th>
                    <th className="text-right py-3 px-4 font-medium text-muted-foreground">
                      Miktar
                    </th>
                    <th className="text-right py-3 px-4 font-medium text-muted-foreground">
                      Birim Fiyat
                    </th>
                    <th className="text-right py-3 px-4 font-medium text-muted-foreground">
                      Toplam
                    </th>
                    <th className="w-12"></th>
                  </tr>
                </thead>
                <tbody>
                  {items.map((item) => (
                    <tr
                      key={item.id}
                      className="border-b border-border/50 hover:bg-secondary/30 transition-colors"
                    >
                      <td className="py-3 px-4 text-sm">{item.fabricType}</td>
                      <td className="py-3 px-4 text-sm">{item.usageArea}</td>
                      <td className="py-3 px-4 text-sm text-right">
                        {item.quantity} kg
                      </td>
                      <td className="py-3 px-4 text-sm text-right">
                        ₺{item.unitPrice.toFixed(2)}
                      </td>
                      <td className="py-3 px-4 text-sm text-right font-semibold">
                        ₺{item.total.toFixed(2)}
                      </td>
                      <td className="py-3 px-4">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleRemoveItem(item.id)}
                          className="h-8 w-8 text-destructive hover:text-destructive hover:bg-destructive/10"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr className="bg-primary/5">
                    <td
                      colSpan={4}
                      className="py-4 px-4 text-right font-semibold text-lg"
                    >
                      Toplam Maliyet:
                    </td>
                    <td className="py-4 px-4 text-right font-bold text-xl text-primary">
                      ₺{totalCost.toFixed(2)}
                    </td>
                    <td></td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
