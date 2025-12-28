import { Header } from "@/components/Header";
import { CostCalculator } from "@/components/CostCalculator";

const Index = () => {
  return (
    <div className="min-h-screen bg-background gradient-mesh">
      <Header />
      
      {/* Decorative elements */}
      <div className="fixed top-20 right-10 w-64 h-64 bg-primary/5 rounded-full blur-3xl pointer-events-none animate-pulse-slow" />
      <div className="fixed bottom-20 left-10 w-96 h-96 bg-accent/5 rounded-full blur-3xl pointer-events-none animate-pulse-slow" />
      
      <main className="container mx-auto px-4 py-10 relative z-10">
        <CostCalculator />
      </main>
      
      <footer className="border-t border-border/50 py-8 mt-16 bg-card/30 backdrop-blur-sm">
        <div className="container mx-auto px-4 text-center text-sm text-muted-foreground">
          © 2025 Tekstil Maliyet Hesaplama Sistemi
        </div>
      </footer>
    </div>
  );
};

export default Index;
