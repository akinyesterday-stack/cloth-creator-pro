import { Scissors, User, LogOut, Shield, DollarSign, Archive } from "lucide-react";
import { ClockWeather } from "./ClockWeather";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useNavigate } from "react-router-dom";
import { Badge } from "@/components/ui/badge";

interface HeaderProps {
  onRadioToggle?: () => void;
  isRadioOpen?: boolean;
}

export function Header({ onRadioToggle, isRadioOpen = false }: HeaderProps) {
  const { user, profile, isAdmin, signOut } = useAuth();
  const navigate = useNavigate();

  const handleSignOut = async () => {
    await signOut();
    navigate("/auth");
  };

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
          
          <div className="flex items-center gap-4">
            <div className="hidden sm:block">
              <ClockWeather onRadioToggle={onRadioToggle} isRadioOpen={isRadioOpen} />
            </div>

            {/* User Menu */}
            {user && profile && (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" className="flex items-center gap-2 h-12 px-4 bg-secondary/50 rounded-xl border border-border/50 hover:bg-secondary/80">
                    <User className="h-5 w-5 text-primary" />
                    <div className="flex flex-col items-start">
                      <span className="text-sm font-medium">{profile.full_name}</span>
                      <span className="text-xs text-muted-foreground">@{profile.username}</span>
                    </div>
                    {isAdmin && (
                      <Badge variant="secondary" className="ml-1 bg-primary/20 text-primary text-xs">
                        Admin
                      </Badge>
                    )}
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-56">
                  <DropdownMenuLabel>
                    <div className="flex flex-col">
                      <span>{profile.full_name}</span>
                      <span className="text-xs text-muted-foreground font-normal">{profile.email}</span>
                    </div>
                  </DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={() => navigate("/fabric-prices")} className="cursor-pointer">
                    <DollarSign className="h-4 w-4 mr-2" />
                    Kalite Fiyatları
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => navigate("/saved-costs")} className="cursor-pointer">
                    <Archive className="h-4 w-4 mr-2" />
                    Kayıtlı Maliyetler
                  </DropdownMenuItem>
                  {isAdmin && (
                    <>
                      <DropdownMenuItem onClick={() => navigate("/admin")} className="cursor-pointer">
                        <Shield className="h-4 w-4 mr-2" />
                        Admin Paneli
                      </DropdownMenuItem>
                    </>
                  )}
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={handleSignOut} className="cursor-pointer text-destructive focus:text-destructive">
                    <LogOut className="h-4 w-4 mr-2" />
                    Çıkış Yap
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            )}
          </div>
        </div>

        {/* Mobile Clock/Weather */}
        <div className="sm:hidden pb-4 -mt-2">
          <ClockWeather onRadioToggle={onRadioToggle} isRadioOpen={isRadioOpen} />
        </div>
      </div>
    </header>
  );
}
