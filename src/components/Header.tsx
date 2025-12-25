import { Scissors } from "lucide-react";

export function Header() {
  return (
    <header className="gradient-primary text-primary-foreground shadow-lg">
      <div className="container mx-auto px-4 py-6">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-xl bg-white/10 flex items-center justify-center backdrop-blur-sm">
            <Scissors className="h-7 w-7" />
          </div>
          <div>
            <h1 className="text-2xl font-bold">Tekstil Sipariş Yönetimi</h1>
            <p className="text-primary-foreground/70 text-sm">
              Kumaş Takip & Maliyet Hesaplama Sistemi
            </p>
          </div>
        </div>
      </div>
    </header>
  );
}
