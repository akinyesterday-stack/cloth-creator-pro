import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { LogIn, UserPlus, Loader2, AlertCircle, Clock } from "lucide-react";
import { z } from "zod";

const loginSchema = z.object({
  email: z.string().email("Geçerli bir e-posta adresi girin"),
  password: z.string().min(6, "Şifre en az 6 karakter olmalı"),
});

const signupSchema = z.object({
  email: z.string().email("Geçerli bir e-posta adresi girin"),
  password: z.string().min(6, "Şifre en az 6 karakter olmalı"),
  username: z.string().min(3, "Kullanıcı adı en az 3 karakter olmalı"),
  fullName: z.string().min(2, "İsim en az 2 karakter olmalı"),
});

export default function Auth() {
  const navigate = useNavigate();
  const { user, profile, isApproved, signIn, signUp, signOut, isLoading: authLoading } = useAuth();
  const { toast } = useToast();

  const [isLoading, setIsLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  // Login form
  const [loginEmail, setLoginEmail] = useState("");
  const [loginPassword, setLoginPassword] = useState("");

  // Signup form
  const [signupEmail, setSignupEmail] = useState("");
  const [signupPassword, setSignupPassword] = useState("");
  const [signupUsername, setSignupUsername] = useState("");
  const [signupFullName, setSignupFullName] = useState("");

  // Redirect if already logged in and approved
  useEffect(() => {
    if (user && profile && isApproved) {
      navigate("/");
    }
  }, [user, profile, isApproved, navigate]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrors({});
    
    // Special case: allow "admin" username to login
    let emailToUse = loginEmail;
    if (loginEmail.toLowerCase() === "admin") {
      emailToUse = "admin@tekstil.com";
    }
    
    // Skip email validation if it's admin shortcut
    if (loginEmail.toLowerCase() !== "admin") {
      try {
        loginSchema.parse({ email: loginEmail, password: loginPassword });
      } catch (error) {
        if (error instanceof z.ZodError) {
          const fieldErrors: Record<string, string> = {};
          error.errors.forEach((err) => {
            if (err.path[0]) {
              fieldErrors[err.path[0] as string] = err.message;
            }
          });
          setErrors(fieldErrors);
          return;
        }
      }
    }

    setIsLoading(true);
    const { error } = await signIn(emailToUse, loginPassword);
    setIsLoading(false);

    if (error) {
      toast({
        title: "Giriş Hatası",
        description: error.message.includes("Invalid login credentials")
          ? "E-posta veya şifre hatalı"
          : error.message,
        variant: "destructive",
      });
    }
  };

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrors({});

    try {
      signupSchema.parse({
        email: signupEmail,
        password: signupPassword,
        username: signupUsername,
        fullName: signupFullName,
      });
    } catch (error) {
      if (error instanceof z.ZodError) {
        const fieldErrors: Record<string, string> = {};
        error.errors.forEach((err) => {
          if (err.path[0]) {
            fieldErrors[`signup_${err.path[0]}`] = err.message;
          }
        });
        setErrors(fieldErrors);
        return;
      }
    }

    setIsLoading(true);
    const { error } = await signUp(signupEmail, signupPassword, signupUsername, signupFullName);
    setIsLoading(false);

    if (error) {
      toast({
        title: "Kayıt Hatası",
        description: error.message.includes("already registered")
          ? "Bu e-posta zaten kayıtlı"
          : error.message,
        variant: "destructive",
      });
    } else {
      toast({
        title: "Kayıt Başarılı",
        description: "Hesabınız oluşturuldu. Admin onayı bekleniyor.",
      });
    }
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

  if (authLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="fixed inset-0 gradient-mesh pointer-events-none" />
      
      <Card className="w-full max-w-md modern-card relative z-10">
        <CardHeader className="text-center">
          <CardTitle className="text-3xl font-display tracking-wide">
            Tekstil Maliyet
          </CardTitle>
          <CardDescription>
            Hesabınıza giriş yapın veya yeni hesap oluşturun
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="login" className="w-full">
            <TabsList className="grid w-full grid-cols-2 mb-6">
              <TabsTrigger value="login" className="flex items-center gap-2">
                <LogIn className="h-4 w-4" />
                Giriş
              </TabsTrigger>
              <TabsTrigger value="signup" className="flex items-center gap-2">
                <UserPlus className="h-4 w-4" />
                Kayıt
              </TabsTrigger>
            </TabsList>

            <TabsContent value="login">
              <form onSubmit={handleLogin} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="login-email">E-posta</Label>
                  <Input
                    id="login-email"
                    type="email"
                    placeholder="ornek@email.com"
                    value={loginEmail}
                    onChange={(e) => setLoginEmail(e.target.value)}
                    className={errors.email ? "border-destructive" : ""}
                  />
                  {errors.email && (
                    <p className="text-xs text-destructive flex items-center gap-1">
                      <AlertCircle className="h-3 w-3" />
                      {errors.email}
                    </p>
                  )}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="login-password">Şifre</Label>
                  <Input
                    id="login-password"
                    type="password"
                    placeholder="••••••••"
                    value={loginPassword}
                    onChange={(e) => setLoginPassword(e.target.value)}
                    className={errors.password ? "border-destructive" : ""}
                  />
                  {errors.password && (
                    <p className="text-xs text-destructive flex items-center gap-1">
                      <AlertCircle className="h-3 w-3" />
                      {errors.password}
                    </p>
                  )}
                </div>
                <Button
                  type="submit"
                  className="w-full h-12 gradient-primary hover:opacity-90"
                  disabled={isLoading}
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
              </form>
            </TabsContent>

            <TabsContent value="signup">
              <form onSubmit={handleSignup} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="signup-fullname">Ad Soyad</Label>
                  <Input
                    id="signup-fullname"
                    type="text"
                    placeholder="Ad Soyad"
                    value={signupFullName}
                    onChange={(e) => setSignupFullName(e.target.value)}
                    className={errors.signup_fullName ? "border-destructive" : ""}
                  />
                  {errors.signup_fullName && (
                    <p className="text-xs text-destructive flex items-center gap-1">
                      <AlertCircle className="h-3 w-3" />
                      {errors.signup_fullName}
                    </p>
                  )}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="signup-username">Kullanıcı Adı</Label>
                  <Input
                    id="signup-username"
                    type="text"
                    placeholder="kullanici_adi"
                    value={signupUsername}
                    onChange={(e) => setSignupUsername(e.target.value)}
                    className={errors.signup_username ? "border-destructive" : ""}
                  />
                  {errors.signup_username && (
                    <p className="text-xs text-destructive flex items-center gap-1">
                      <AlertCircle className="h-3 w-3" />
                      {errors.signup_username}
                    </p>
                  )}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="signup-email">E-posta</Label>
                  <Input
                    id="signup-email"
                    type="email"
                    placeholder="ornek@email.com"
                    value={signupEmail}
                    onChange={(e) => setSignupEmail(e.target.value)}
                    className={errors.signup_email ? "border-destructive" : ""}
                  />
                  {errors.signup_email && (
                    <p className="text-xs text-destructive flex items-center gap-1">
                      <AlertCircle className="h-3 w-3" />
                      {errors.signup_email}
                    </p>
                  )}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="signup-password">Şifre</Label>
                  <Input
                    id="signup-password"
                    type="password"
                    placeholder="••••••••"
                    value={signupPassword}
                    onChange={(e) => setSignupPassword(e.target.value)}
                    className={errors.signup_password ? "border-destructive" : ""}
                  />
                  {errors.signup_password && (
                    <p className="text-xs text-destructive flex items-center gap-1">
                      <AlertCircle className="h-3 w-3" />
                      {errors.signup_password}
                    </p>
                  )}
                </div>
                <Button
                  type="submit"
                  className="w-full h-12 gradient-primary hover:opacity-90"
                  disabled={isLoading}
                >
                  {isLoading ? (
                    <Loader2 className="h-5 w-5 animate-spin" />
                  ) : (
                    <>
                      <UserPlus className="h-5 w-5 mr-2" />
                      Kayıt Ol
                    </>
                  )}
                </Button>
                <p className="text-xs text-center text-muted-foreground">
                  Kayıt sonrası admin onayı gereklidir
                </p>
              </form>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
}
