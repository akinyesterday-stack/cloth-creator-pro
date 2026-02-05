import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { LogIn, Loader2, Clock, Users, ShoppingBag, Factory, Truck, Scissors, Building, UserCheck } from "lucide-react";
import { Badge } from "@/components/ui/badge";

interface UserProfile {
  id: string;
  user_id: string;
  username: string;
  full_name: string;
  email: string;
  status: string;
  user_type: string;
}

const USER_TYPE_INFO: Record<string, { label: string; icon: React.ReactNode; color: string }> = {
  admin: { label: "Admin", icon: <Users className="h-5 w-5" />, color: "bg-red-500" },
  buyer: { label: "Buyer", icon: <ShoppingBag className="h-5 w-5" />, color: "bg-blue-500" },
  fabric: { label: "Fabric", icon: <Factory className="h-5 w-5" />, color: "bg-purple-500" },
  planlama: { label: "Planlama", icon: <Building className="h-5 w-5" />, color: "bg-green-500" },
  fason: { label: "Fason", icon: <Factory className="h-5 w-5" />, color: "bg-orange-500" },
  kesim_takip: { label: "Kesim Takip", icon: <Scissors className="h-5 w-5" />, color: "bg-pink-500" },
  tedarik_muduru: { label: "Tedarik Müdürü", icon: <Truck className="h-5 w-5" />, color: "bg-indigo-500" },
  isletme_muduru: { label: "İşletme Müdürü", icon: <Building className="h-5 w-5" />, color: "bg-teal-500" },
  tedarik_sorumlusu: { label: "Tedarik Sorumlusu", icon: <UserCheck className="h-5 w-5" />, color: "bg-cyan-500" },
};

export default function Auth() {
  const navigate = useNavigate();
  const { user, profile, isApproved, signIn, signOut, isLoading: authLoading } = useAuth();
  const { toast } = useToast();

  const [isLoading, setIsLoading] = useState(false);
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [selectedUser, setSelectedUser] = useState<UserProfile | null>(null);
  const [password, setPassword] = useState("");
  const [loadingUsers, setLoadingUsers] = useState(true);

  // Fetch all approved users
  useEffect(() => {
    const fetchUsers = async () => {
      setLoadingUsers(true);
      const { data, error } = await supabase
        .from("profiles")
        .select("*")
        .eq("status", "approved")
        .order("full_name");

      if (!error && data) {
        setUsers(data as UserProfile[]);
      }
      setLoadingUsers(false);
    };

    fetchUsers();
  }, []);

  // Redirect if already logged in and approved
  useEffect(() => {
    if (user && profile && isApproved) {
      navigate("/");
    }
  }, [user, profile, isApproved, navigate]);

  const handleUserSelect = (userProfile: UserProfile) => {
    setSelectedUser(userProfile);
    setPassword("");
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedUser) return;

    setIsLoading(true);
    const { error } = await signIn(selectedUser.email, password);
    setIsLoading(false);

    if (error) {
      toast({
        title: "Giriş Hatası",
        description: error.message.includes("Invalid login credentials")
          ? "Şifre hatalı"
          : error.message,
        variant: "destructive",
      });
    }
  };

  const handleBack = () => {
    setSelectedUser(null);
    setPassword("");
  };

  // Show pending approval message
  if (user && profile && !isApproved) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <div className="fixed inset-0 gradient-mesh pointer-events-none" />
        
        <Card className="w-full max-w-md modern-card relative z-10">
          <CardHeader className="text-center space-y-4">
            <div className="mx-auto p-4 bg-warning/20 rounded-full w-fit">
              <Clock className="h-10 w-10 text-warning" />
            </div>
            <CardTitle className="text-2xl font-display">Onay Bekleniyor</CardTitle>
            <CardDescription className="text-base">
              Hesabınız admin onayı bekliyor. Onaylandığında sisteme giriş yapabileceksiniz.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="p-4 bg-secondary/50 rounded-lg space-y-2">
              <p className="text-sm text-muted-foreground">
                <span className="font-medium text-foreground">İsim:</span> {profile.full_name}
              </p>
              <p className="text-sm text-muted-foreground">
                <span className="font-medium text-foreground">E-posta:</span> {profile.email}
              </p>
              <p className="text-sm text-muted-foreground">
                <span className="font-medium text-foreground">Durum:</span>{" "}
                <span className="text-warning">Onay bekliyor</span>
              </p>
            </div>
            <Button
              variant="outline"
              className="w-full"
              onClick={() => {
                window.location.reload();
              }}
            >
              Durumu Kontrol Et
            </Button>
            <Button
              variant="ghost"
              className="w-full"
              onClick={async () => {
                await signOut();
              }}
            >
              <LogIn className="h-4 w-4 mr-2" />
              Giriş Sayfasına Dön
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (authLoading || loadingUsers) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  // Password entry screen
  if (selectedUser) {
    const typeInfo = USER_TYPE_INFO[selectedUser.user_type] || USER_TYPE_INFO.admin;
    
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <div className="fixed inset-0 gradient-mesh pointer-events-none" />
        
        <Card className="w-full max-w-md modern-card relative z-10">
          <CardHeader className="text-center">
            <div className={`mx-auto p-4 ${typeInfo.color} text-white rounded-full w-fit mb-4`}>
              {typeInfo.icon}
            </div>
            <CardTitle className="text-2xl font-display">
              {selectedUser.full_name}
            </CardTitle>
            <CardDescription className="flex items-center justify-center gap-2">
              <Badge variant="secondary">{typeInfo.label}</Badge>
              <span className="text-muted-foreground">@{selectedUser.username}</span>
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleLogin} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="password">Şifre</Label>
                <Input
                  id="password"
                  type="password"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  autoFocus
                />
              </div>
              <Button
                type="submit"
                className="w-full h-12 gradient-primary hover:opacity-90"
                disabled={isLoading || !password}
              >
                {isLoading ? (
                  <Loader2 className="h-5 w-5 animate-spin" />
                ) : (
                  <>
                    <LogIn className="h-5 w-5 mr-2" />
                    Giriş Yap
                  </>
                )}
              </Button>
              <Button
                type="button"
                variant="ghost"
                className="w-full"
                onClick={handleBack}
              >
                Geri Dön
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    );
  }

  // User selection screen
  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="fixed inset-0 gradient-mesh pointer-events-none" />
      
      <Card className="w-full max-w-2xl modern-card relative z-10">
        <CardHeader className="text-center">
          <CardTitle className="text-3xl font-display tracking-wide">
            TAHA GİYİM
          </CardTitle>
          <CardDescription>
            Kullanıcı seçin ve giriş yapın
          </CardDescription>
        </CardHeader>
        <CardContent>
          {users.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Users className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>Henüz onaylanmış kullanıcı yok</p>
            </div>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              {users.map((userProfile) => {
                const typeInfo = USER_TYPE_INFO[userProfile.user_type] || USER_TYPE_INFO.admin;
                
                return (
                  <button
                    key={userProfile.id}
                    onClick={() => handleUserSelect(userProfile)}
                    className="flex flex-col items-center p-4 rounded-xl border border-border/50 bg-card hover:bg-accent/50 hover:border-primary/50 transition-all duration-200 hover:scale-105 active:scale-95"
                  >
                    <div className={`p-3 ${typeInfo.color} text-white rounded-full mb-3`}>
                      {typeInfo.icon}
                    </div>
                    <span className="font-medium text-sm text-center line-clamp-1">
                      {userProfile.full_name}
                    </span>
                    <span className="text-xs text-muted-foreground mt-1">
                      @{userProfile.username}
                    </span>
                    <Badge variant="outline" className="mt-2 text-xs">
                      {typeInfo.label}
                    </Badge>
                  </button>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
