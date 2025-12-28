import { Scissors } from "lucide-react";

export function Header() {
  return (
    <header className="sticky top-0 z-50 w-full bg-background/95 backdrop-blur-md border-b border-border/30">
      <div className="container mx-auto px-4">
        <div className="flex h-20 items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="relative">
              <div className="absolute inset-0 bg-primary/30 blur-xl rounded-full" />
              <div className="relative p-3 bg-gradient-to-br from-primary to-primary/80 rounded-xl glow-primary-sm">
                <Scissors className="h-7 w-7 text-primary-foreground" />
              </div>
            </div>
            <div>
              <h1 className="text-3xl font-display tracking-widest text-gradient">
                TEKSTİL MALİYET
              </h1>
              <p className="text-xs text-muted-foreground tracking-wider uppercase">
                Profesyonel Maliyet Hesaplama
              </p>
            </div>
          </div>
          
          <div className="hidden md:flex items-center gap-8">
            <div className="flex items-center gap-2 px-4 py-2 bg-secondary/50 rounded-lg border border-border/30">
              <div className="w-2 h-2 bg-success rounded-full animate-pulse" />
              <span className="text-sm text-muted-foreground">Sistem Aktif</span>
            </div>
          </div>
        </div>
      </div>
    </header>
  );
}