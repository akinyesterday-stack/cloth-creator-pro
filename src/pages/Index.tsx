import { useState } from "react";
import { Header } from "@/components/Header";
import { CostCalculator } from "@/components/CostCalculator";

const Index = () => {
  const [isRadioOpen, setIsRadioOpen] = useState(false);
  const [isRadioMinimized, setIsRadioMinimized] = useState(false);

  const handleRadioToggle = () => {
    if (isRadioOpen) {
      // If open and not minimized, minimize it
      if (!isRadioMinimized) {
        setIsRadioMinimized(true);
      } else {
        // If minimized, expand it
        setIsRadioMinimized(false);
      }
    } else {
      // If closed, open it
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
        <CostCalculator 
          isRadioOpen={isRadioOpen}
          isRadioMinimized={isRadioMinimized}
          onRadioClose={handleRadioClose}
          onRadioMinimize={handleRadioMinimize}
        />
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

export default Index;