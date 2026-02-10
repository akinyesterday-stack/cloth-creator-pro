import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { Users, Plus, Trash2, Loader2 } from "lucide-react";

interface Profile {
  id: string;
  user_id: string;
  full_name: string;
  user_type: string | null;
}

interface TeamMember {
  id: string;
  member_id: string;
  role: string;
  profile?: Profile;
}

const TEAM_ROLES = [
  { value: "fabric", label: "Kumaş" },
  { value: "planlama", label: "Planlama" },
  { value: "fason", label: "Fason" },
];

export function TeamManager() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [members, setMembers] = useState<TeamMember[]>([]);
  const [availableUsers, setAvailableUsers] = useState<Profile[]>([]);
  const [selectedUser, setSelectedUser] = useState("");
  const [selectedRole, setSelectedRole] = useState("fabric");
  const [loading, setLoading] = useState(true);
  const [adding, setAdding] = useState(false);

  useEffect(() => {
    if (user) {
      fetchTeamAndUsers();
    }
  }, [user]);

  const fetchTeamAndUsers = async () => {
    setLoading(true);
    try {
      // Fetch team members
      const { data: teamData } = await supabase
        .from("team_members")
        .select("*")
        .eq("team_leader_id", user!.id);

      // Fetch available users (fabric, planlama, fason)
      const { data: usersData } = await supabase
        .from("profiles")
        .select("id, user_id, full_name, user_type")
        .in("user_type", ["fabric", "planlama", "fason"])
        .eq("status", "approved");

      if (teamData && usersData) {
        // Enrich team members with profile info
        const enriched = teamData.map(tm => ({
          ...tm,
          profile: usersData.find(u => u.user_id === tm.member_id),
        }));
        setMembers(enriched);

        // Filter out already added members
        const memberIds = teamData.map(tm => tm.member_id);
        setAvailableUsers(usersData.filter(u => !memberIds.includes(u.user_id)));
      }
    } catch (error) {
      console.error("Error fetching team:", error);
    } finally {
      setLoading(false);
    }
  };

  const addMember = async () => {
    if (!selectedUser) return;
    setAdding(true);
    try {
      const { error } = await supabase.from("team_members").insert({
        team_leader_id: user!.id,
        member_id: selectedUser,
        role: selectedRole,
      });

      if (error) throw error;

      toast({ title: "Eklendi", description: "Ekip üyesi eklendi." });
      setSelectedUser("");
      fetchTeamAndUsers();
    } catch (error: any) {
      toast({ title: "Hata", description: error.message, variant: "destructive" });
    } finally {
      setAdding(false);
    }
  };

  const removeMember = async (id: string) => {
    try {
      await supabase.from("team_members").delete().eq("id", id);
      toast({ title: "Silindi", description: "Ekip üyesi çıkarıldı." });
      fetchTeamAndUsers();
    } catch (error: any) {
      toast({ title: "Hata", description: error.message, variant: "destructive" });
    }
  };

  if (loading) {
    return (
      <Card className="modern-card">
        <CardContent className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="modern-card">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Users className="h-5 w-5" />
          Ekibim
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Add member */}
        <div className="flex gap-2">
          <Select value={selectedUser} onValueChange={setSelectedUser}>
            <SelectTrigger className="flex-1">
              <SelectValue placeholder="Kullanıcı seç..." />
            </SelectTrigger>
            <SelectContent>
              {availableUsers.map(u => (
                <SelectItem key={u.user_id} value={u.user_id}>
                  {u.full_name} ({u.user_type})
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={selectedRole} onValueChange={setSelectedRole}>
            <SelectTrigger className="w-32">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {TEAM_ROLES.map(r => (
                <SelectItem key={r.value} value={r.value}>{r.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button onClick={addMember} disabled={!selectedUser || adding} size="sm">
            <Plus className="h-4 w-4 mr-1" />
            Ekle
          </Button>
        </div>

        {/* Team list */}
        {members.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-4">
            Henüz ekip üyesi eklenmedi
          </p>
        ) : (
          <div className="space-y-2">
            {members.map(m => (
              <div key={m.id} className="flex items-center justify-between p-3 bg-secondary/30 rounded-lg">
                <div className="flex items-center gap-2">
                  <span className="font-medium">{m.profile?.full_name || "Bilinmiyor"}</span>
                  <Badge variant="secondary" className="text-xs">
                    {TEAM_ROLES.find(r => r.value === m.role)?.label || m.role}
                  </Badge>
                </div>
                <Button variant="ghost" size="icon" onClick={() => removeMember(m.id)}>
                  <Trash2 className="h-4 w-4 text-destructive" />
                </Button>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
