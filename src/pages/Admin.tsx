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
  Pencil
} from "lucide-react";

interface PendingUser {
  id: string;
  user_id: string;
  username: string;
  full_name: string;
  email: string;
  status: "pending" | "approved" | "rejected";
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
  const [isCreating, setIsCreating] = useState(false);

  // Edit user
  const [editingUser, setEditingUser] = useState<PendingUser | null>(null);
  const [editFullName, setEditFullName] = useState("");
  const [editEmail, setEditEmail] = useState("");
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
              <CardTitle className="flex items-center gap-3">
                <Users className="h-6 w-6 text-primary" />
                <span>Tüm Kullanıcılar</span>
                <Badge variant="secondary">{allUsers.length}</Badge>
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
                          <p className="font-medium">{profile.full_name}</p>
                          <p className="text-sm text-muted-foreground">{profile.email}</p>
                          <p className="text-xs text-muted-foreground">
                            @{profile.username}
                          </p>
                        </div>
                        <div className="flex items-center gap-2">
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
      </main>
    </div>
  );
}
