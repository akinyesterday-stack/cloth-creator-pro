import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { 
  Plus, X, Calendar, Clock, AlertTriangle, 
  StickyNote, Trash2, GripVertical
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
import { format, differenceInDays, isPast, isToday, addDays } from "date-fns";
import { tr } from "date-fns/locale";

interface StickyNoteData {
  id: string;
  title: string;
  content: string;
  color: string;
  position_x: number;
  position_y: number;
  created_at: string;
}

interface OrderWithTermin {
  id: string;
  order_name: string;
  termin_date: string | null;
  status: string;
  fabric_type: string | null;
}

const noteColors = [
  { name: "yellow", bg: "bg-yellow-100", border: "border-yellow-300", text: "text-yellow-800" },
  { name: "blue", bg: "bg-blue-100", border: "border-blue-300", text: "text-blue-800" },
  { name: "green", bg: "bg-green-100", border: "border-green-300", text: "text-green-800" },
  { name: "pink", bg: "bg-pink-100", border: "border-pink-300", text: "text-pink-800" },
  { name: "purple", bg: "bg-purple-100", border: "border-purple-300", text: "text-purple-800" },
];

export function Dashboard() {
  const { user } = useAuth();
  const [stickyNotes, setStickyNotes] = useState<StickyNoteData[]>([]);
  const [upcomingOrders, setUpcomingOrders] = useState<OrderWithTermin[]>([]);
  const [isLoadingNotes, setIsLoadingNotes] = useState(true);
  const [isLoadingOrders, setIsLoadingOrders] = useState(true);
  const [editingNoteId, setEditingNoteId] = useState<string | null>(null);

  useEffect(() => {
    if (user) {
      loadStickyNotes();
      loadUpcomingOrders();
    }
  }, [user]);

  const loadStickyNotes = async () => {
    if (!user) return;
    
    try {
      const { data, error } = await supabase
        .from("sticky_notes")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });

      if (error) throw error;
      setStickyNotes(data || []);
    } catch (error) {
      console.error("Error loading sticky notes:", error);
    } finally {
      setIsLoadingNotes(false);
    }
  };

  const loadUpcomingOrders = async () => {
    if (!user) return;
    
    try {
      const { data, error } = await supabase
        .from("orders")
        .select("id, order_name, termin_date, status, fabric_type")
        .eq("user_id", user.id)
        .not("termin_date", "is", null)
        .neq("status", "completed")
        .neq("status", "cancelled")
        .order("termin_date", { ascending: true })
        .limit(10);

      if (error) throw error;
      setUpcomingOrders(data || []);
    } catch (error) {
      console.error("Error loading orders:", error);
    } finally {
      setIsLoadingOrders(false);
    }
  };

  const handleAddNote = async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from("sticky_notes")
        .insert({
          user_id: user.id,
          title: "Yeni Not",
          content: "",
          color: "yellow",
          position_x: 0,
          position_y: 0,
        })
        .select()
        .single();

      if (error) throw error;
      
      setStickyNotes([data, ...stickyNotes]);
      setEditingNoteId(data.id);
      toast.success("Not eklendi");
    } catch (error) {
      console.error("Error adding note:", error);
      toast.error("Not eklenemedi");
    }
  };

  const handleUpdateNote = async (noteId: string, updates: Partial<StickyNoteData>) => {
    try {
      const { error } = await supabase
        .from("sticky_notes")
        .update(updates)
        .eq("id", noteId);

      if (error) throw error;
      
      setStickyNotes(stickyNotes.map(n => 
        n.id === noteId ? { ...n, ...updates } : n
      ));
    } catch (error) {
      console.error("Error updating note:", error);
    }
  };

  const handleDeleteNote = async (noteId: string) => {
    try {
      const { error } = await supabase
        .from("sticky_notes")
        .delete()
        .eq("id", noteId);

      if (error) throw error;
      
      setStickyNotes(stickyNotes.filter(n => n.id !== noteId));
      toast.success("Not silindi");
    } catch (error) {
      console.error("Error deleting note:", error);
      toast.error("Not silinemedi");
    }
  };

  const getTerminBadge = (terminDate: string | null) => {
    if (!terminDate) return null;
    
    const date = new Date(terminDate);
    const daysLeft = differenceInDays(date, new Date());
    
    if (isPast(date) && !isToday(date)) {
      return (
        <Badge variant="destructive" className="gap-1">
          <AlertTriangle className="h-3 w-3" />
          Gecikmiş
        </Badge>
      );
    }
    
    if (isToday(date)) {
      return (
        <Badge className="bg-orange-500 hover:bg-orange-600 gap-1">
          <Clock className="h-3 w-3" />
          Bugün!
        </Badge>
      );
    }
    
    if (daysLeft <= 3) {
      return (
        <Badge className="bg-yellow-500 hover:bg-yellow-600 text-black gap-1">
          <AlertTriangle className="h-3 w-3" />
          {daysLeft} gün
        </Badge>
      );
    }
    
    if (daysLeft <= 7) {
      return (
        <Badge variant="secondary" className="gap-1">
          <Calendar className="h-3 w-3" />
          {daysLeft} gün
        </Badge>
      );
    }
    
    return (
      <Badge variant="outline" className="gap-1">
        <Calendar className="h-3 w-3" />
        {daysLeft} gün
      </Badge>
    );
  };

  const getNoteColorClasses = (color: string) => {
    return noteColors.find(c => c.name === color) || noteColors[0];
  };

  return (
    <div className="space-y-6">
      {/* Termin Yaklaşan Siparişler */}
      <Card className="glass-card">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-lg">
            <Clock className="h-5 w-5 text-primary" />
            Yaklaşan Terminler
          </CardTitle>
        </CardHeader>
        <CardContent>
          {isLoadingOrders ? (
            <div className="text-center py-4 text-muted-foreground">Yükleniyor...</div>
          ) : upcomingOrders.length === 0 ? (
            <div className="text-center py-4 text-muted-foreground">
              <Calendar className="h-8 w-8 mx-auto mb-2 opacity-50" />
              <p>Yaklaşan termin bulunmuyor</p>
            </div>
          ) : (
            <div className="space-y-2">
              {upcomingOrders.map((order) => (
                <div 
                  key={order.id} 
                  className="flex items-center justify-between p-3 rounded-lg bg-muted/50 hover:bg-muted transition-colors"
                >
                  <div className="flex-1 min-w-0">
                    <p className="font-medium truncate">{order.order_name}</p>
                    {order.fabric_type && (
                      <p className="text-xs text-muted-foreground truncate">{order.fabric_type}</p>
                    )}
                    {order.termin_date && (
                      <p className="text-xs text-muted-foreground">
                        {format(new Date(order.termin_date), "d MMMM yyyy", { locale: tr })}
                      </p>
                    )}
                  </div>
                  {getTerminBadge(order.termin_date)}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Yapışkan Notlar */}
      <Card className="glass-card">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2 text-lg">
              <StickyNote className="h-5 w-5 text-primary" />
              Hızlı Notlar
            </CardTitle>
            <Button size="sm" onClick={handleAddNote} className="gap-1">
              <Plus className="h-4 w-4" />
              Yeni Not
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {isLoadingNotes ? (
            <div className="text-center py-4 text-muted-foreground">Yükleniyor...</div>
          ) : stickyNotes.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <StickyNote className="h-10 w-10 mx-auto mb-2 opacity-50" />
              <p>Henüz not eklenmemiş</p>
              <p className="text-sm">Maliyetleriniz ve siparişleriniz hakkında notlar alın</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {stickyNotes.map((note) => {
                const colorClasses = getNoteColorClasses(note.color);
                const isEditing = editingNoteId === note.id;
                
                return (
                  <div 
                    key={note.id}
                    className={`relative p-3 rounded-lg border-2 ${colorClasses.bg} ${colorClasses.border} ${colorClasses.text} shadow-sm transition-all hover:shadow-md`}
                  >
                    {/* Color picker */}
                    <div className="flex items-center gap-1 mb-2">
                      {noteColors.map((c) => (
                        <button
                          key={c.name}
                          onClick={() => handleUpdateNote(note.id, { color: c.name })}
                          className={`w-4 h-4 rounded-full ${c.bg} ${c.border} border-2 ${note.color === c.name ? 'ring-2 ring-offset-1 ring-gray-400' : ''}`}
                        />
                      ))}
                      <div className="flex-1" />
                      <button
                        onClick={() => handleDeleteNote(note.id)}
                        className="p-1 rounded hover:bg-black/10 transition-colors"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                    
                    {isEditing ? (
                      <div className="space-y-2">
                        <Input
                          value={note.title}
                          onChange={(e) => handleUpdateNote(note.id, { title: e.target.value })}
                          placeholder="Başlık"
                          className={`h-7 text-sm font-medium border-0 shadow-none bg-transparent ${colorClasses.text} placeholder:opacity-50`}
                          autoFocus
                        />
                        <Textarea
                          value={note.content}
                          onChange={(e) => handleUpdateNote(note.id, { content: e.target.value })}
                          placeholder="Notunuzu yazın..."
                          className={`min-h-[60px] text-sm border-0 shadow-none bg-transparent resize-none ${colorClasses.text} placeholder:opacity-50`}
                        />
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => setEditingNoteId(null)}
                          className="w-full h-7"
                        >
                          Tamam
                        </Button>
                      </div>
                    ) : (
                      <div 
                        className="cursor-pointer min-h-[60px]"
                        onClick={() => setEditingNoteId(note.id)}
                      >
                        <p className="font-medium text-sm mb-1">
                          {note.title || "Başlıksız"}
                        </p>
                        <p className="text-xs opacity-80 whitespace-pre-wrap line-clamp-4">
                          {note.content || "Düzenlemek için tıklayın..."}
                        </p>
                      </div>
                    )}
                    
                    <p className="text-[10px] opacity-50 mt-2">
                      {format(new Date(note.created_at), "d MMM", { locale: tr })}
                    </p>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
