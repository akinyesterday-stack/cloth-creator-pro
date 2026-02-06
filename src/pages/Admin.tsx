import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { 
  Shield, 
  Users, 
  Check, 
  X, 
  Clock, 
  ArrowLeft, 
  Loader2,
  UserCheck,
  UserX,
  UserPlus,
  Pencil,
  Trash2,
  ShoppingBag,
  Factory,
  Building,
  Scissors,
  Truck
} from "lucide-react";

const USER_TYPES = [
  { value: "admin", label: "Admin", icon: Shield },
  { value: "buyer", label: "Buyer (Satın Almacı)", icon: ShoppingBag },
  { value: "fabric", label: "Fabric (Kumaş)", icon: Factory },
  { value: "planlama", label: "Planlama", icon: Building },
  { value: "fason", label: "Fason", icon: Factory },
  { value: "kesim_takip", label: "Kesim Takip", icon: Scissors },
  { value: "tedarik_muduru", label: "Tedarik Müdürü", icon: Truck },
  { value: "isletme_muduru", label: "İşletme Müdürü", icon: Building },
  { value: "tedarik_sorumlusu", label: "Tedarik Sorumlusu", icon: UserCheck },
] as const;

interface PendingUser {
  id: string;
  user_id: string;
  username: string;
  full_name: string;
  email: string;
  status: "pending" | "approved" | "rejected";
  user_type: string | null;
  created_at: string;
}

export default function Admin() {
  const navigate = useNavigate();
  const { user, isAdmin, isLoading: authLoading } = useAuth();
  const { toast } = useToast();

  const [pendingUsers, setPendingUsers] = useState<PendingUser[]>([]);
  const [allUsers, setAllUsers] = useState<PendingUser[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [processingId, setProcessingId] = useState<string | null>(null);
  
  // Manual user creation
  const [showAddUser, setShowAddUser] = useState(false);
  const [newUsername, setNewUsername] = useState("");
  const [newFullName, setNewFullName] = useState("");
  const [newEmail, setNewEmail] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [newUserType, setNewUserType] = useState<string>("admin");
  const [isCreating, setIsCreating] = useState(false);

  // Edit user
  const [editingUser, setEditingUser] = useState<PendingUser | null>(null);
  const [editFullName, setEditFullName] = useState("");
  const [editEmail, setEditEmail] = useState("");
  const [editPassword, setEditPassword] = useState("");
  const [editUserType, setEditUserType] = useState<string>("admin");
  const [isSavingEdit, setIsSavingEdit] = useState(false);

  useEffect(() => {
    if (!authLoading && (!user || !isAdmin)) {
      navigate("/");
    }
  }, [user, isAdmin, authLoading, navigate]);

  useEffect(() => {
    if (isAdmin) {
      fetchUsers();
    }
  }, [isAdmin]);

  const fetchUsers = async () => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from("profiles")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) throw error;

      const users = (data || []) as PendingUser[];
      setPendingUsers(users.filter(u => u.status === "pending"));
      setAllUsers(users);
    } catch (error) {
      console.error("Error fetching users:", error);
      toast({
        title: "Hata",
        description: "Kullanıcılar yüklenirken hata oluştu",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleApprove = async (profile: PendingUser) => {
    setProcessingId(profile.id);
    try {
      // Update profile status
      const { error: profileError } = await supabase
        .from("profiles")
        .update({ status: "approved" })
        .eq("id", profile.id);

      if (profileError) throw profileError;

      // Add user role
      const { error: roleError } = await supabase
        .from("user_roles")
        .insert({
          user_id: profile.user_id,
          role: "user",
        });

      if (roleError && !roleError.message.includes("duplicate")) {
        throw roleError;
      }

      toast({
        title: "Kullanıcı Onaylandı",
        description: `${profile.full_name} artık sisteme giriş yapabilir.`,
      });

      fetchUsers();
    } catch (error) {
      console.error("Error approving user:", error);
      toast({
        title: "Hata",
        description: "Kullanıcı onaylanırken hata oluştu",
        variant: "destructive",
      });
    } finally {
      setProcessingId(null);
    }
  };

  const handleReject = async (profile: PendingUser) => {
    setProcessingId(profile.id);
    try {
      // Delete profile so user can re-register
      const { error } = await supabase
        .from("profiles")
        .delete()
        .eq("id", profile.id);

      if (error) throw error;

      toast({
        title: "Kullanıcı Reddedildi",
        description: `${profile.full_name} reddedildi ve tekrar kayıt olabilir.`,
      });

      fetchUsers();
    } catch (error) {
      console.error("Error rejecting user:", error);
      toast({
        title: "Hata",
        description: "Kullanıcı reddedilirken hata oluştu",
        variant: "destructive",
      });
    } finally {
    setProcessingId(null);
    }
  };

  // Delete user (allows re-registration)
  const handleDeleteUser = async (profile: PendingUser) => {
    setProcessingId(profile.id);
    try {
      // Delete profile so user can re-register
      const { error } = await supabase
        .from("profiles")
        .delete()
        .eq("id", profile.id);

      if (error) throw error;

      // Also delete user roles
      await supabase
        .from("user_roles")
        .delete()
        .eq("user_id", profile.user_id);

      toast({
        title: "Kullanıcı Silindi",
        description: `${profile.full_name} silindi ve tekrar kayıt olabilir.`,
      });

      fetchUsers();
    } catch (error) {
      console.error("Error deleting user:", error);
      toast({
        title: "Hata",
        description: "Kullanıcı silinirken hata oluştu",
        variant: "destructive",
      });
    } finally {
      setProcessingId(null);
    }
  };

  // Manual user creation
  const handleCreateUser = async () => {
    if (!newUsername.trim() || !newFullName.trim() || !newEmail.trim() || !newPassword.trim()) {
      toast({
        title: "Hata",
        description: "Tüm alanları doldurun",
        variant: "destructive",
      });
      return;
    }

    setIsCreating(true);
    try {
      // Create auth user
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: newEmail,
        password: newPassword,
      });

      if (authError) throw authError;

      if (authData.user) {
        // Create profile as approved with user_type
        const { error: profileError } = await supabase
          .from("profiles")
          .insert({
            user_id: authData.user.id,
            username: newUsername.trim(),
            full_name: newFullName.trim(),
            email: newEmail.trim(),
            status: "approved",
            user_type: newUserType as "admin" | "buyer" | "fabric" | "planlama" | "fason" | "kesim_takip" | "tedarik_muduru" | "isletme_muduru" | "tedarik_sorumlusu",
          });

        if (profileError) throw profileError;

        // Add user role (admin role for admin type, user role for others)
        await supabase.from("user_roles").insert({
          user_id: authData.user.id,
          role: newUserType === "admin" ? "admin" : "user",
        });

        toast({
          title: "Kullanıcı Oluşturuldu",
          description: `${newFullName} (${USER_TYPES.find(t => t.value === newUserType)?.label}) başarıyla eklendi.`,
        });

        setShowAddUser(false);
        setNewUsername("");
        setNewFullName("");
        setNewEmail("");
        setNewPassword("");
        setNewUserType("admin");
        fetchUsers();
      }
    } catch (error: any) {
      console.error("Error creating user:", error);
      toast({
        title: "Hata",
        description: error.message || "Kullanıcı oluşturulurken hata oluştu",
        variant: "destructive",
      });
    } finally {
      setIsCreating(false);
    }
  };

  // Edit user profile
  const handleStartEdit = (profile: PendingUser) => {
    setEditingUser(profile);
    setEditFullName(profile.full_name);
    setEditEmail(profile.email);
    setEditPassword("");
    setEditUserType(profile.user_type || "admin");
  };

  const handleSaveEdit = async () => {
    if (!editingUser) return;

    setIsSavingEdit(true);
    try {
      // Update profile
      const { error } = await supabase
        .from("profiles")
        .update({
          full_name: editFullName.trim(),
          email: editEmail.trim(),
          user_type: editUserType as "admin" | "buyer" | "fabric" | "planlama" | "fason" | "kesim_takip" | "tedarik_muduru" | "isletme_muduru" | "tedarik_sorumlusu",
        })
        .eq("id", editingUser.id);

      if (error) throw error;

      // Update password if provided
      if (editPassword.trim()) {
        const { data, error: fnError } = await supabase.functions.invoke("update-user-password", {
          body: {
            userId: editingUser.user_id,
            newPassword: editPassword.trim(),
          },
        });

        if (fnError) {
          toast({
            title: "Şifre Güncelenemedi",
            description: fnError.message || "Şifre değiştirme sırasında hata oluştu",
            variant: "destructive",
          });
        } else {
          toast({
            title: "Güncellendi",
            description: "Kullanıcı bilgileri ve şifresi güncellendi.",
          });
        }
      } else {
        toast({
          title: "Güncellendi",
          description: "Kullanıcı bilgileri güncellendi.",
        });
      }

      setEditingUser(null);
      setEditPassword("");
      fetchUsers();
    } catch (error) {
      console.error("Error updating user:", error);
      toast({
        title: "Hata",
        description: "Kullanıcı güncellenirken hata oluştu",
        variant: "destructive",
      });
    } finally {
      setIsSavingEdit(false);
    }
  };

  if (authLoading || (!user || !isAdmin)) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="fixed inset-0 gradient-mesh pointer-events-none" />
      
      <header className="sticky top-0 z-40 border-b border-border/50 bg-card/80 backdrop-blur-xl">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" onClick={() => navigate("/")}>
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div className="flex items-center gap-3">
              <div className="p-2 bg-primary/20 rounded-lg">
                <Shield className="h-6 w-6 text-primary" />
              </div>
              <h1 className="text-2xl font-display font-bold tracking-wide">Admin Paneli</h1>
            </div>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8 relative z-10">
        <div className="grid gap-6">
          {/* Pending Users */}
          <Card className="modern-card">
            <CardHeader className="bg-gradient-to-r from-warning/10 via-warning/5 to-transparent border-b border-border/50">
              <CardTitle className="flex items-center gap-3">
                <Clock className="h-6 w-6 text-warning" />
                <span>Onay Bekleyen Kullanıcılar</span>
                {pendingUsers.length > 0 && (
                  <Badge variant="secondary" className="bg-warning/20 text-warning">
                    {pendingUsers.length}
                  </Badge>
                )}
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              {isLoading ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2 className="h-8 w-8 animate-spin text-primary" />
                </div>
              ) : pendingUsers.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
                  <UserCheck className="h-12 w-12 mb-4 opacity-30" />
                  <p>Onay bekleyen kullanıcı yok</p>
                </div>
              ) : (
                <ScrollArea className="max-h-[400px]">
                  <div className="divide-y divide-border/50">
                    {pendingUsers.map((profile) => (
                      <div
                        key={profile.id}
                        className="flex items-center justify-between p-4 hover:bg-secondary/30 transition-colors"
                      >
                        <div className="space-y-1">
                          <p className="font-medium">{profile.full_name}</p>
                          <p className="text-sm text-muted-foreground">{profile.email}</p>
                          <p className="text-xs text-muted-foreground">
                            @{profile.username} • {new Date(profile.created_at).toLocaleDateString("tr-TR")}
                          </p>
                        </div>
                        <div className="flex items-center gap-2">
                          <Button
                            size="sm"
                            className="bg-success hover:bg-success/90 text-success-foreground"
                            onClick={() => handleApprove(profile)}
                            disabled={processingId === profile.id}
                          >
                            {processingId === profile.id ? (
                              <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                              <>
                                <Check className="h-4 w-4 mr-1" />
                                Onayla
                              </>
                            )}
                          </Button>
                          <Button
                            size="sm"
                            variant="destructive"
                            onClick={() => handleReject(profile)}
                            disabled={processingId === profile.id}
                          >
                            {processingId === profile.id ? (
                              <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                              <>
                                <X className="h-4 w-4 mr-1" />
                                Reddet
                              </>
                            )}
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              )}
            </CardContent>
          </Card>

          {/* All Users */}
          <Card className="modern-card">
            <CardHeader className="bg-gradient-to-r from-primary/10 via-primary/5 to-transparent border-b border-border/50">
              <CardTitle className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Users className="h-6 w-6 text-primary" />
                  <span>Tüm Kullanıcılar</span>
                  <Badge variant="secondary">{allUsers.length}</Badge>
                </div>
                <Dialog open={showAddUser} onOpenChange={setShowAddUser}>
                  <DialogTrigger asChild>
                    <Button size="sm" className="gap-2">
                      <UserPlus className="h-4 w-4" />
                      Kullanıcı Ekle
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Yeni Kullanıcı Ekle</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4">
                      <div>
                        <Label htmlFor="new-username">Kullanıcı Adı</Label>
                        <Input
                          id="new-username"
                          value={newUsername}
                          onChange={(e) => setNewUsername(e.target.value)}
                          placeholder="kullanici123"
                        />
                      </div>
                      <div>
                        <Label htmlFor="new-fullname">Ad Soyad</Label>
                        <Input
                          id="new-fullname"
                          value={newFullName}
                          onChange={(e) => setNewFullName(e.target.value)}
                          placeholder="Ahmet Yılmaz"
                        />
                      </div>
                      <div>
                        <Label htmlFor="new-email">E-posta</Label>
                        <Input
                          id="new-email"
                          type="email"
                          value={newEmail}
                          onChange={(e) => setNewEmail(e.target.value)}
                          placeholder="ornek@email.com"
                        />
                      </div>
                      <div>
                        <Label htmlFor="new-password">Şifre</Label>
                        <Input
                          id="new-password"
                          type="password"
                          value={newPassword}
                          onChange={(e) => setNewPassword(e.target.value)}
                          placeholder="••••••••"
                        />
                      </div>
                      <div>
                        <Label>Kullanıcı Tipi</Label>
                        <Select value={newUserType} onValueChange={setNewUserType}>
                          <SelectTrigger>
                            <SelectValue placeholder="Kullanıcı tipi seçin" />
                          </SelectTrigger>
                          <SelectContent>
                            {USER_TYPES.map((type) => (
                              <SelectItem key={type.value} value={type.value}>
                                <div className="flex items-center gap-2">
                                  <type.icon className="h-4 w-4" />
                                  {type.label}
                                </div>
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <Button
                        className="w-full"
                        onClick={handleCreateUser}
                        disabled={isCreating}
                      >
                        {isCreating ? (
                          <Loader2 className="h-4 w-4 animate-spin mr-2" />
                        ) : (
                          <UserPlus className="h-4 w-4 mr-2" />
                        )}
                        Kullanıcı Oluştur
                      </Button>
                    </div>
                  </DialogContent>
                </Dialog>
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              {isLoading ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2 className="h-8 w-8 animate-spin text-primary" />
                </div>
              ) : (
                <ScrollArea className="max-h-[500px]">
                  <div className="divide-y divide-border/50">
                    {allUsers.map((profile) => (
                      <div
                        key={profile.id}
                        className="flex items-center justify-between p-4 hover:bg-secondary/30 transition-colors"
                      >
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            <p className="font-medium">{profile.full_name}</p>
                            {profile.user_type && (
                              <Badge variant="outline" className="text-xs">
                                {USER_TYPES.find(t => t.value === profile.user_type)?.label || profile.user_type}
                              </Badge>
                            )}
                          </div>
                          <p className="text-sm text-muted-foreground">{profile.email}</p>
                          <p className="text-xs text-muted-foreground">
                            @{profile.username}
                          </p>
                        </div>
                        <div className="flex items-center gap-2">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleStartEdit(profile)}
                            className="h-8 w-8"
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleDeleteUser(profile)}
                            disabled={processingId === profile.id}
                            className="h-8 w-8 text-destructive hover:text-destructive hover:bg-destructive/10"
                          >
                            {processingId === profile.id ? (
                              <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                              <Trash2 className="h-4 w-4" />
                            )}
                          </Button>
                          {profile.status === "approved" && (
                            <Badge className="bg-success/20 text-success border-success/30">
                              <UserCheck className="h-3 w-3 mr-1" />
                              Onaylı
                            </Badge>
                          )}
                          {profile.status === "pending" && (
                            <Badge className="bg-warning/20 text-warning border-warning/30">
                              <Clock className="h-3 w-3 mr-1" />
                              Bekliyor
                            </Badge>
                          )}
                          {profile.status === "rejected" && (
                            <Badge className="bg-destructive/20 text-destructive border-destructive/30">
                              <UserX className="h-3 w-3 mr-1" />
                              Reddedildi
                            </Badge>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Edit User Dialog */}
        <Dialog open={!!editingUser} onOpenChange={(open) => !open && setEditingUser(null)}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Kullanıcı Düzenle</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label>Kullanıcı Adı</Label>
                <Input value={editingUser?.username || ""} disabled />
              </div>
              <div>
                <Label htmlFor="edit-fullname">Ad Soyad</Label>
                <Input
                  id="edit-fullname"
                  value={editFullName}
                  onChange={(e) => setEditFullName(e.target.value)}
                />
              </div>
              <div>
                <Label htmlFor="edit-email">E-posta</Label>
                <Input
                  id="edit-email"
                  type="email"
                  value={editEmail}
                  onChange={(e) => setEditEmail(e.target.value)}
                />
              </div>
              <div>
                <Label>Kullanıcı Tipi</Label>
                <Select value={editUserType} onValueChange={setEditUserType}>
                  <SelectTrigger>
                    <SelectValue placeholder="Kullanıcı tipi seçin" />
                  </SelectTrigger>
                  <SelectContent>
                    {USER_TYPES.map((type) => (
                      <SelectItem key={type.value} value={type.value}>
                        <div className="flex items-center gap-2">
                          <type.icon className="h-4 w-4" />
                          {type.label}
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="edit-password">Yeni Şifre (opsiyonel)</Label>
                <Input
                  id="edit-password"
                  type="password"
                  placeholder="Değiştirmek için yeni şifre girin"
                  value={editPassword}
                  onChange={(e) => setEditPassword(e.target.value)}
                />
                <p className="text-xs text-muted-foreground mt-1">
                  Şifreler güvenlik nedeniyle görüntülenemez, sadece değiştirilebilir.
                </p>
              </div>
              <Button
                className="w-full"
                onClick={handleSaveEdit}
                disabled={isSavingEdit}
              >
                {isSavingEdit ? (
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                ) : (
                  <Check className="h-4 w-4 mr-2" />
                )}
                Kaydet
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </main>
    </div>
  );
}
