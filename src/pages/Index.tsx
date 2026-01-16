import { useState } from "react";
import { Header } from "@/components/Header";
import { CostCalculator } from "@/components/CostCalculator";
import { Dashboard } from "@/components/Dashboard";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Calculator, LayoutDashboard } from "lucide-react";

const Index = () => {
  const [isRadioOpen, setIsRadioOpen] = useState(false);
  const [isRadioMinimized, setIsRadioMinimized] = useState(false);
  const [activeTab, setActiveTab] = useState("dashboard");

  const handleRadioToggle = () => {
    if (isRadioOpen) {
      if (!isRadioMinimized) {
        setIsRadioMinimized(true);
      } else {
        setIsRadioMinimized(false);
      }
    } else {
      setIsRadioOpen(true);
      setIsRadioMinimized(false);
    }
  };

  const handleRadioClose = () => {
    setIsRadioOpen(false);
    setIsRadioMinimized(false);
  };

  const handleRadioMinimize = () => {
    setIsRadioMinimized(!isRadioMinimized);
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Soft gradient overlay */}
      <div className="fixed inset-0 gradient-mesh pointer-events-none" />
      
      <Header 
        onRadioToggle={handleRadioToggle}
        isRadioOpen={isRadioOpen}
      />
      
      <main className="container mx-auto px-4 py-8 relative z-10">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="mb-6 bg-card/80 backdrop-blur-sm border">
            <TabsTrigger value="dashboard" className="gap-2">
              <LayoutDashboard className="h-4 w-4" />
              Dashboard
            </TabsTrigger>
            <TabsTrigger value="calculator" className="gap-2">
              <Calculator className="h-4 w-4" />
              Maliyet Hesaplama
            </TabsTrigger>
          </TabsList>
          
          <TabsContent value="dashboard" className="mt-0">
            <Dashboard />
          </TabsContent>
          
          <TabsContent value="calculator" className="mt-0">
            <CostCalculator 
              isRadioOpen={isRadioOpen}
              isRadioMinimized={isRadioMinimized}
              onRadioClose={handleRadioClose}
              onRadioMinimize={handleRadioMinimize}
            />
          </TabsContent>
        </Tabs>
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

export default Index;
