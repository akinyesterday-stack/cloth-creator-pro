import { Header } from "@/components/Header";
import { CostCalculator } from "@/components/CostCalculator";

const Index = () => {
  return (
    <div className="min-h-screen bg-background">
      {/* Soft gradient overlay */}
      <div className="fixed inset-0 gradient-mesh pointer-events-none" />
      
      <Header />
      
      <main className="container mx-auto px-4 py-8 relative z-10">
        <CostCalculator />
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