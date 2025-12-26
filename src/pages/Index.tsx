import { Header } from "@/components/Header";
import { CostCalculator } from "@/components/CostCalculator";
import { OrdersTable } from "@/components/OrdersTable";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Calculator, Package, Sparkles } from "lucide-react";

const Index = () => {
  return (
    <div className="min-h-screen bg-background gradient-mesh">
      <Header />
      
      {/* Decorative elements */}
      <div className="fixed top-20 right-10 w-64 h-64 bg-primary/5 rounded-full blur-3xl pointer-events-none animate-pulse-slow" />
      <div className="fixed bottom-20 left-10 w-96 h-96 bg-accent/5 rounded-full blur-3xl pointer-events-none animate-pulse-slow" />
      
      <main className="container mx-auto px-4 py-10 relative z-10">
        <Tabs defaultValue="calculator" className="w-full">
          <TabsList className="grid w-full max-w-lg mx-auto grid-cols-2 mb-10 h-14 p-1.5 bg-card/80 backdrop-blur-sm shadow-lg border border-border/50 rounded-xl">
            <TabsTrigger 
              value="calculator" 
              className="h-full text-base font-semibold rounded-lg data-[state=active]:gradient-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow-md transition-all duration-300 flex items-center gap-2"
            >
              <Sparkles className="h-4 w-4" />
              Maliyet Hesapla
            </TabsTrigger>
            <TabsTrigger 
              value="orders"
              className="h-full text-base font-semibold rounded-lg data-[state=active]:gradient-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow-md transition-all duration-300 flex items-center gap-2"
            >
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
      
      <footer className="border-t border-border/50 py-8 mt-16 bg-card/30 backdrop-blur-sm">
        <div className="container mx-auto px-4 text-center text-sm text-muted-foreground">
          © 2025 Tekstil Sipariş Yönetim Sistemi
        </div>
      </footer>
    </div>
  );
};

export default Index;
