import { Header } from "@/components/Header";
import { StatsCards } from "@/components/StatsCards";
import { CostCalculator } from "@/components/CostCalculator";
import { OrdersTable } from "@/components/OrdersTable";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Calculator, Package } from "lucide-react";

const Index = () => {
  return (
    <div className="min-h-screen bg-background">
      <Header />
      
      <main className="container mx-auto px-4 py-8 space-y-8">
        <StatsCards />
        
        <Tabs defaultValue="calculator" className="w-full">
          <TabsList className="grid w-full max-w-md grid-cols-2 mb-6">
            <TabsTrigger value="calculator" className="flex items-center gap-2">
              <Calculator className="h-4 w-4" />
              Maliyet Hesapla
            </TabsTrigger>
            <TabsTrigger value="orders" className="flex items-center gap-2">
              <Package className="h-4 w-4" />
              Siparişler
            </TabsTrigger>
          </TabsList>
          
          <TabsContent value="calculator" className="mt-0">
            <CostCalculator />
          </TabsContent>
          
          <TabsContent value="orders" className="mt-0">
            <OrdersTable />
          </TabsContent>
        </Tabs>
      </main>
      
      <footer className="border-t border-border py-6 mt-12">
        <div className="container mx-auto px-4 text-center text-sm text-muted-foreground">
          © 2025 Tekstil Sipariş Yönetim Sistemi
        </div>
      </footer>
    </div>
  );
};

export default Index;
