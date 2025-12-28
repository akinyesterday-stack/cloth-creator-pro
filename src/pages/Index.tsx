import { Header } from "@/components/Header";
import { CostCalculator } from "@/components/CostCalculator";

const Index = () => {
  return (
    <div className="min-h-screen bg-background">
      {/* Netflix-style gradient overlay */}
      <div className="fixed inset-0 gradient-mesh pointer-events-none" />
      
      {/* Ambient glow effects */}
      <div className="fixed top-0 left-1/4 w-96 h-96 bg-primary/10 rounded-full blur-[120px] pointer-events-none" />
      <div className="fixed bottom-0 right-1/4 w-96 h-96 bg-primary/5 rounded-full blur-[120px] pointer-events-none" />
      
      <Header />
      
      <main className="container mx-auto px-4 py-12 relative z-10">
        <CostCalculator />
      </main>
      
      <footer className="border-t border-border/30 py-8 mt-16 bg-background/80 backdrop-blur-sm relative z-10">
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