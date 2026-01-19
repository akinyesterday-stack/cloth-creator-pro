import { useState } from "react";
import { Header } from "@/components/Header";
import { CostCalculator } from "@/components/CostCalculator";
import { Dashboard } from "@/components/Dashboard";
import { SpreadsheetOrders } from "@/components/SpreadsheetOrders";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Calculator, LayoutDashboard, ShoppingCart } from "lucide-react";

const Index = () => {
  const [isRadioOpen, setIsRadioOpen] = useState(false);
  const [isRadioMinimized, setIsRadioMinimized] = useState(false);
  const [activeTab, setActiveTab] = useState("dashboard");
  const [tabOrder, setTabOrder] = useState(["dashboard", "orders", "calculator"]);

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

  const tabConfig = {
    dashboard: {
      label: "Dashboard",
      icon: <LayoutDashboard className="h-4 w-4" />,
      content: <Dashboard />
    },
    orders: {
      label: "Siparişler",
      icon: <ShoppingCart className="h-4 w-4" />,
      content: <SpreadsheetOrders />
    },
    calculator: {
      label: "Maliyet Hesaplama",
      icon: <Calculator className="h-4 w-4" />,
      content: (
        <CostCalculator 
          isRadioOpen={isRadioOpen}
          isRadioMinimized={isRadioMinimized}
          onRadioClose={handleRadioClose}
          onRadioMinimize={handleRadioMinimize}
        />
      )
    }
  };

  const handleDragStart = (e: React.DragEvent, index: number) => {
    e.dataTransfer.setData("tabIndex", index.toString());
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleDrop = (e: React.DragEvent, dropIndex: number) => {
    e.preventDefault();
    const dragIndex = parseInt(e.dataTransfer.getData("tabIndex"));
    if (dragIndex === dropIndex) return;

    const newOrder = [...tabOrder];
    const [removed] = newOrder.splice(dragIndex, 1);
    newOrder.splice(dropIndex, 0, removed);
    setTabOrder(newOrder);
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
            {tabOrder.map((tabKey, index) => {
              const tab = tabConfig[tabKey as keyof typeof tabConfig];
              return (
                <TabsTrigger 
                  key={tabKey}
                  value={tabKey} 
                  className="gap-2 cursor-grab active:cursor-grabbing"
                  draggable
                  onDragStart={(e) => handleDragStart(e, index)}
                  onDragOver={handleDragOver}
                  onDrop={(e) => handleDrop(e, index)}
                >
                  {tab.icon}
                  {tab.label}
                </TabsTrigger>
              );
            })}
          </TabsList>
          
          {Object.entries(tabConfig).map(([key, tab]) => (
            <TabsContent key={key} value={key} className="mt-0">
              {tab.content}
            </TabsContent>
          ))}
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
