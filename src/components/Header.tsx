import { Scissors } from "lucide-react";
import { ClockWeather } from "./ClockWeather";

export function Header() {
  return (
    <header className="sticky top-0 z-50 w-full bg-card/95 backdrop-blur-md border-b border-border/50 shadow-sm">
      <div className="container mx-auto px-4">
        <div className="flex h-20 items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="relative">
              <div className="absolute inset-0 bg-primary/20 blur-xl rounded-full" />
              <div className="relative p-3 gradient-primary rounded-xl shadow-lg">
                <Scissors className="h-7 w-7 text-primary-foreground" />
              </div>
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gradient">
                Tekstil Maliyet
              </h1>
              <p className="text-xs text-muted-foreground">
                Profesyonel Hesaplama Sistemi
              </p>
            </div>
          </div>
          
          <div className="hidden lg:block">
            <ClockWeather />
          </div>
        </div>

        {/* Mobile Clock/Weather */}
        <div className="lg:hidden pb-4 -mt-2">
          <ClockWeather />
        </div>
      </div>
    </header>
  );
}