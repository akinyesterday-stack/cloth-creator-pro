import { User, LogOut, Shield, DollarSign, Archive, ShoppingCart, ChevronUp, ChevronDown } from "lucide-react";
import { ClockWeather } from "./ClockWeather";
import { NotificationBell } from "./NotificationBell";
import { useAuth } from "@/hooks/useAuth";
import { useMenuOrder } from "@/hooks/useMenuOrder";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
} from "@/components/ui/dropdown-menu";
import { useNavigate } from "react-router-dom";
import { Badge } from "@/components/ui/badge";
import LCWLogo from "@/assets/lcw-logo";

interface HeaderProps {
  onRadioToggle?: () => void;
  isRadioOpen?: boolean;
}

const iconMap: Record<string, React.ComponentType<{ className?: string }>> = {
  ShoppingCart,
  Archive,
  DollarSign,
};

export function Header({ onRadioToggle, isRadioOpen = false }: HeaderProps) {
  const { user, profile, isAdmin, signOut } = useAuth();
  const { getOrderedMenuItems, moveToTop, moveToBottom } = useMenuOrder();
  const navigate = useNavigate();

  const handleSignOut = async () => {
    await signOut();
    navigate("/auth");
  };

  const orderedMenuItems = getOrderedMenuItems();

  return (
    <header className="sticky top-0 z-50 w-full bg-card/95 backdrop-blur-md border-b border-border/50 shadow-sm">
      <div className="container mx-auto px-4">
        <div className="flex h-20 items-center justify-between">
          <div className="flex items-center gap-4">
            {/* LC Waikiki Logo */}
            <div className="flex items-center">
              <LCWLogo className="h-8 w-auto text-primary" />
            </div>
            
            {/* Title */}
            <div className="border-l border-border/50 pl-4">
              <h1 className="text-lg font-bold text-gradient leading-tight">
                Kumaş
              </h1>
              <h1 className="text-lg font-bold text-gradient leading-tight">
                Tedarik
              </h1>
              <h1 className="text-lg font-bold text-gradient leading-tight">
                Sistemi
              </h1>
            </div>
          </div>
          
          <div className="flex items-center gap-4">
            <div className="hidden sm:block">
              <ClockWeather onRadioToggle={onRadioToggle} isRadioOpen={isRadioOpen} />
            </div>
            
            {/* Notification Bell */}
            <NotificationBell />

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
                <DropdownMenuContent align="end" className="w-64">
                  <DropdownMenuLabel>
                    <div className="flex flex-col">
                      <span>{profile.full_name}</span>
                      <span className="text-xs text-muted-foreground font-normal">{profile.email}</span>
                    </div>
                  </DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  
                  {/* Ordered Menu Items */}
                  {orderedMenuItems.map((item) => {
                    const IconComponent = iconMap[item.icon];
                    return (
                      <DropdownMenuSub key={item.id}>
                        <DropdownMenuSubTrigger className="cursor-pointer">
                          {IconComponent && <IconComponent className="h-4 w-4 mr-2" />}
                          {item.label}
                        </DropdownMenuSubTrigger>
                        <DropdownMenuSubContent>
                          <DropdownMenuItem onClick={() => navigate(item.path)} className="cursor-pointer">
                            Aç
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem onClick={() => moveToTop(item.id)} className="cursor-pointer">
                            <ChevronUp className="h-4 w-4 mr-2" />
                            En Üste Al
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => moveToBottom(item.id)} className="cursor-pointer">
                            <ChevronDown className="h-4 w-4 mr-2" />
                            En Alta Al
                          </DropdownMenuItem>
                        </DropdownMenuSubContent>
                      </DropdownMenuSub>
                    );
                  })}

                  {isAdmin && (
                    <>
                      <DropdownMenuSeparator />
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
