import { useState, useEffect, useRef } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { 
  Plus, X, Calendar, Clock, AlertTriangle, 
  StickyNote, Trash2, Mail, MailOpen, Check, Reply,
  Send, User, GripVertical, Loader2, Zap, BarChart3
} from "lucide-react";
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
import { format, differenceInDays, isPast, isToday } from "date-fns";
import { tr } from "date-fns/locale";
import { useNavigate } from "react-router-dom";

interface StickyNoteData {
  id: string;
  title: string;
  content: string;
  color: string;
  position_x: number;
  position_y: number;
  created_at: string;
  user_id: string;
  recipient_user_id: string | null;
  is_read: boolean;
  is_completed: boolean;
  completed_at: string | null;
  reply: string | null;
  sender_name?: string;
  recipient_name?: string;
}

interface OrderWithTermin {
  id: string;
  order_name: string;
  termin_date: string | null;
  po_termin_date: string | null;
  fabric_termin_date: string | null;
  status: string;
  fabric_type: string | null;
  is_fast_track: boolean;
}

interface UserProfile {
  user_id: string;
  full_name: string;
  username: string;
}

const noteColors = [
  { name: "yellow", bg: "bg-amber-100", border: "border-amber-400", text: "text-amber-900", shadow: "shadow-amber-200/50" },
  { name: "blue", bg: "bg-sky-100", border: "border-sky-400", text: "text-sky-900", shadow: "shadow-sky-200/50" },
  { name: "green", bg: "bg-emerald-100", border: "border-emerald-400", text: "text-emerald-900", shadow: "shadow-emerald-200/50" },
  { name: "pink", bg: "bg-rose-100", border: "border-rose-400", text: "text-rose-900", shadow: "shadow-rose-200/50" },
  { name: "purple", bg: "bg-violet-100", border: "border-violet-400", text: "text-violet-900", shadow: "shadow-violet-200/50" },
];

export function Dashboard() {
  const { user, isAdmin } = useAuth();
  const navigate = useNavigate();
  const [myNotes, setMyNotes] = useState<StickyNoteData[]>([]);
  const [receivedNotes, setReceivedNotes] = useState<StickyNoteData[]>([]);
  const [upcomingOrders, setUpcomingOrders] = useState<OrderWithTermin[]>([]);
  const [ftOrders, setFtOrders] = useState<OrderWithTermin[]>([]);
  const [allUsers, setAllUsers] = useState<UserProfile[]>([]);
  const [isLoadingNotes, setIsLoadingNotes] = useState(true);
  const [isLoadingOrders, setIsLoadingOrders] = useState(true);
  const [isLoadingUsers, setIsLoadingUsers] = useState(true);
  const [editingNoteId, setEditingNoteId] = useState<string | null>(null);
  const [draggingNoteId, setDraggingNoteId] = useState<string | null>(null);
  const notesContainerRef = useRef<HTMLDivElement>(null);
  
  // New note dialog state
  const [isNewNoteOpen, setIsNewNoteOpen] = useState(false);
  const [newNoteTitle, setNewNoteTitle] = useState("");
  const [newNoteContent, setNewNoteContent] = useState("");
  const [newNoteColor, setNewNoteColor] = useState("yellow");
  const [newNoteRecipient, setNewNoteRecipient] = useState<string>("self");
  
  // Reply dialog state
  const [replyingNote, setReplyingNote] = useState<StickyNoteData | null>(null);
  const [replyText, setReplyText] = useState("");

  useEffect(() => {
    if (user) {
      loadStickyNotes();
      loadUpcomingOrders();
      loadAllUsers();
    }
  }, [user]);

  const loadAllUsers = async () => {
    if (!user) return;
    setIsLoadingUsers(true);
    
    try {
      const { data, error } = await supabase
        .from("profiles")
        .select("user_id, full_name, username")
        .eq("status", "approved");

      if (error) {
        console.error("Error loading users:", error);
        return;
      }
      
      // Filter out current user
      const otherUsers = (data || []).filter(u => u.user_id !== user.id);
      setAllUsers(otherUsers);
    } catch (error) {
      console.error("Error loading users:", error);
    } finally {
      setIsLoadingUsers(false);
    }
  };

  const loadStickyNotes = async () => {
    if (!user) return;
    
    try {
      // Load notes I created (for myself)
      const { data: myData, error: myError } = await supabase
        .from("sticky_notes")
        .select("*")
        .eq("user_id", user.id)
        .is("recipient_user_id", null)
        .order("created_at", { ascending: false });

      if (myError) throw myError;
      setMyNotes(myData || []);

      // Load notes sent to me
      const { data: receivedData, error: receivedError } = await supabase
        .from("sticky_notes")
        .select("*")
        .eq("recipient_user_id", user.id)
        .order("created_at", { ascending: false });

      if (receivedError) throw receivedError;
      
      // Get sender names for received notes
      const notesWithSenders = await Promise.all(
        (receivedData || []).map(async (note) => {
          const { data: profile } = await supabase
            .from("profiles")
            .select("full_name")
            .eq("user_id", note.user_id)
            .single();
          return {
            ...note,
            sender_name: profile?.full_name || "Bilinmeyen"
          };
        })
      );
      
      setReceivedNotes(notesWithSenders);
    } catch (error) {
      console.error("Error loading sticky notes:", error);
    } finally {
      setIsLoadingNotes(false);
    }
  };

  const loadUpcomingOrders = async () => {
    if (!user) return;
    
    try {
      // Load upcoming orders (not FT specific)
      const { data, error } = await supabase
        .from("orders")
        .select("id, order_name, termin_date, po_termin_date, fabric_termin_date, status, fabric_type, is_fast_track")
        .eq("user_id", user.id)
        .neq("status", "completed")
        .neq("status", "cancelled")
        .order("po_termin_date", { ascending: true, nullsFirst: false })
        .limit(10);

      if (error) throw error;
      
      const mappedOrders = (data || []).map((o: any) => ({
        ...o,
        is_fast_track: o.is_fast_track || false,
      }));
      
      setUpcomingOrders(mappedOrders.filter((o: any) => !o.is_fast_track));
      
      // Load ALL FT orders (from all users) - these are important
      const { data: allFtData, error: ftError } = await supabase
        .from("orders")
        .select("id, order_name, termin_date, po_termin_date, fabric_termin_date, status, fabric_type, is_fast_track")
        .eq("is_fast_track", true)
        .neq("status", "completed")
        .neq("status", "cancelled")
        .order("po_termin_date", { ascending: true, nullsFirst: false })
        .limit(20);
        
      if (!ftError) {
        setFtOrders(allFtData || []);
      }
    } catch (error) {
      console.error("Error loading orders:", error);
    } finally {
      setIsLoadingOrders(false);
    }
  };

  const handleCreateNote = async () => {
    if (!user) return;
    if (!newNoteTitle.trim()) {
      toast.error("Başlık giriniz");
      return;
    }

    try {
      const isForSelf = newNoteRecipient === "self";
      
      const { data, error } = await supabase
        .from("sticky_notes")
        .insert({
          user_id: user.id,
          title: newNoteTitle,
          content: newNoteContent,
          color: newNoteColor,
          position_x: 0,
          position_y: 0,
          recipient_user_id: isForSelf ? null : newNoteRecipient,
        })
        .select()
        .single();

      if (error) throw error;
      
      if (isForSelf) {
        setMyNotes([data, ...myNotes]);
      } else {
        // Send notification to recipient
        const { data: senderProfile } = await supabase
          .from("profiles")
          .select("full_name")
          .eq("user_id", user.id)
          .single();

        await supabase
          .from("notifications")
          .insert({
            user_id: newNoteRecipient,
            type: "note",
            title: `${senderProfile?.full_name || "Birisi"} size bir not gönderdi`,
            message: newNoteTitle,
            related_note_id: data.id,
          });
      }
      
      setIsNewNoteOpen(false);
      setNewNoteTitle("");
      setNewNoteContent("");
      setNewNoteColor("yellow");
      setNewNoteRecipient("self");
      toast.success(isForSelf ? "Not eklendi" : "Not gönderildi");
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
      
      setMyNotes(myNotes.map(n => 
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
      
      setMyNotes(myNotes.filter(n => n.id !== noteId));
      toast.success("Not silindi");
    } catch (error) {
      console.error("Error deleting note:", error);
      toast.error("Not silinemedi");
    }
  };

  const handleMarkAsRead = async (note: StickyNoteData) => {
    if (note.is_read) return;
    
    await supabase
      .from("sticky_notes")
      .update({ is_read: true })
      .eq("id", note.id);

    setReceivedNotes(prev =>
      prev.map(n => n.id === note.id ? { ...n, is_read: true } : n)
    );
  };

  const handleCompleteNote = async (note: StickyNoteData, withReply: boolean = false) => {
    try {
      const updates: Partial<StickyNoteData> = {
        is_completed: true,
        completed_at: new Date().toISOString(),
      };
      
      if (withReply && replyText.trim()) {
        updates.reply = replyText;
        
        // Send notification to sender
        const { data: myProfile } = await supabase
          .from("profiles")
          .select("full_name")
          .eq("user_id", user?.id)
          .single();

        await supabase
          .from("notifications")
          .insert({
            user_id: note.user_id,
            type: "note_completed",
            title: `${myProfile?.full_name || "Birisi"} notunuzu tamamladı`,
            message: replyText || note.title,
            related_note_id: note.id,
          });
      }

      await supabase
        .from("sticky_notes")
        .update(updates)
        .eq("id", note.id);

      setReceivedNotes(prev =>
        prev.map(n => n.id === note.id ? { ...n, ...updates } : n)
      );
      
      setReplyingNote(null);
      setReplyText("");
      toast.success(withReply ? "Not tamamlandı ve cevap gönderildi" : "Not tamamlandı");
    } catch (error) {
      console.error("Error completing note:", error);
      toast.error("İşlem başarısız");
    }
  };

  const handleCloseNote = async (note: StickyNoteData) => {
    // Just mark as completed without notifying sender
    await supabase
      .from("sticky_notes")
      .update({ is_completed: true, completed_at: new Date().toISOString() })
      .eq("id", note.id);

    setReceivedNotes(prev =>
      prev.map(n => n.id === note.id ? { ...n, is_completed: true } : n)
    );
    toast.success("Not kapatıldı");
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
      {/* Grid: Gelen Notlar + FT Siparişler */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Gelen Notlar (Mektup Görünümü) */}
        <Card className="glass-card border-primary/20">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-lg">
              <Mail className="h-5 w-5 text-primary" />
              Gelen Notlar
              <Badge variant="secondary" className="ml-2">
                {receivedNotes.filter(n => !n.is_completed).length}
              </Badge>
            </CardTitle>
          </CardHeader>
          <CardContent className="max-h-[400px] overflow-y-auto">
            {receivedNotes.filter(n => !n.is_completed).length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <Mail className="h-8 w-8 mx-auto mb-2 opacity-50" />
                <p>Gelen not bulunmuyor</p>
              </div>
            ) : (
              <div className="space-y-3">
                {receivedNotes.filter(n => !n.is_completed).map((note) => {
                  const colorClasses = getNoteColorClasses(note.color);
                  return (
                    <div 
                      key={note.id}
                      className={`relative p-3 rounded-lg border ${colorClasses.bg} ${colorClasses.border} shadow-sm`}
                      onClick={() => handleMarkAsRead(note)}
                    >
                      <div className="flex items-start gap-2">
                        {note.is_read ? (
                          <MailOpen className="h-4 w-4 text-muted-foreground mt-1" />
                        ) : (
                          <Mail className="h-4 w-4 text-primary animate-pulse mt-1" />
                        )}
                        <div className="flex-1 min-w-0">
                          <p className="text-xs text-muted-foreground">{note.sender_name}</p>
                          <h4 className={`font-medium text-sm ${colorClasses.text}`}>{note.title}</h4>
                          <p className={`text-xs ${colorClasses.text} opacity-70 truncate`}>{note.content}</p>
                        </div>
                      </div>
                      <div className="flex gap-2 mt-2">
                        <Button size="sm" variant="outline" className="flex-1 h-7 text-xs" onClick={(e) => { e.stopPropagation(); setReplyingNote(note); }}>
                          <Reply className="h-3 w-3 mr-1" /> Cevapla
                        </Button>
                        <Button size="sm" variant="secondary" className="h-7 text-xs" onClick={(e) => { e.stopPropagation(); handleCloseNote(note); }}>
                          <X className="h-3 w-3" />
                        </Button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>

        {/* FT Siparişler */}
        <Card className="glass-card border-amber-400/50 bg-amber-50/30 dark:bg-amber-950/20">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2 text-lg">
                <Zap className="h-5 w-5 text-amber-500" />
                Fast Track Siparişler
                <Badge className="ml-2 bg-amber-500/20 text-amber-700">{ftOrders.length}</Badge>
              </CardTitle>
              <Button variant="outline" size="sm" onClick={() => navigate("/reports")} className="gap-1">
                <BarChart3 className="h-4 w-4" /> Raporlar
              </Button>
            </div>
          </CardHeader>
          <CardContent className="max-h-[400px] overflow-y-auto">
            {isLoadingOrders ? (
              <div className="text-center py-4"><Loader2 className="h-6 w-6 animate-spin mx-auto" /></div>
            ) : ftOrders.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <Zap className="h-8 w-8 mx-auto mb-2 opacity-50" />
                <p>FT sipariş bulunmuyor</p>
              </div>
            ) : (
              <div className="space-y-2">
                {ftOrders.map((order) => (
                  <div key={order.id} className="flex items-center justify-between p-3 rounded-lg bg-amber-100/50 dark:bg-amber-900/30 border border-amber-300/50">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <Zap className="h-4 w-4 text-amber-500" />
                        <p className="font-medium text-sm truncate">{order.order_name}</p>
                      </div>
                      {order.fabric_type && <p className="text-xs text-muted-foreground truncate">{order.fabric_type}</p>}
                      {order.po_termin_date && (
                        <p className="text-xs text-muted-foreground">PO: {format(new Date(order.po_termin_date), "d MMM", { locale: tr })}</p>
                      )}
                    </div>
                    {getTerminBadge(order.po_termin_date)}
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Termin Yaklaşan Siparişler */}
      {receivedNotes.filter(n => !n.is_completed).length > 0 && (
        <Card className="glass-card border-primary/20">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-lg">
              <Mail className="h-5 w-5 text-primary" />
              Gelen Notlar
              <Badge variant="secondary" className="ml-2">
                {receivedNotes.filter(n => !n.is_completed).length}
              </Badge>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {receivedNotes.filter(n => !n.is_completed).map((note) => {
                const colorClasses = getNoteColorClasses(note.color);
                
                return (
                  <div 
                    key={note.id}
                    className={`relative p-4 rounded-lg border-2 ${colorClasses.bg} ${colorClasses.border} shadow-md transition-all hover:shadow-lg`}
                    onClick={() => handleMarkAsRead(note)}
                  >
                    {/* Mektup simgesi */}
                    <div className="absolute -top-3 -left-3 bg-white rounded-full p-2 shadow-md border">
                      {note.is_read ? (
                        <MailOpen className="h-5 w-5 text-muted-foreground" />
                      ) : (
                        <Mail className="h-5 w-5 text-primary animate-pulse" />
                      )}
                    </div>
                    
                    <div className="pt-2">
                      <div className="flex items-center gap-2 mb-2">
                        <User className="h-4 w-4 text-muted-foreground" />
                        <span className="text-sm font-medium">{note.sender_name}</span>
                      </div>
                      
                      <h4 className={`font-semibold ${colorClasses.text} mb-1`}>
                        {note.title}
                      </h4>
                      <p className={`text-sm ${colorClasses.text} opacity-80 whitespace-pre-wrap`}>
                        {note.content || "İçerik yok"}
                      </p>
                      
                      <p className="text-[10px] opacity-50 mt-2">
                        {format(new Date(note.created_at), "d MMMM yyyy, HH:mm", { locale: tr })}
                      </p>
                      
                      <div className="flex gap-2 mt-3">
                        <Button
                          size="sm"
                          variant="outline"
                          className="flex-1 gap-1"
                          onClick={(e) => {
                            e.stopPropagation();
                            setReplyingNote(note);
                          }}
                        >
                          <Reply className="h-3 w-3" />
                          Cevapla
                        </Button>
                        <Button
                          size="sm"
                          variant="secondary"
                          className="gap-1"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleCloseNote(note);
                          }}
                        >
                          <X className="h-3 w-3" />
                          Kapat
                        </Button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}

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

      {/* Yapışkan Notlar (Kendi Notlarım) - Sürüklenebilir */}
      <Card className="glass-card overflow-hidden">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2 text-lg">
              <StickyNote className="h-5 w-5 text-primary" />
              Hızlı Notlar
              <span className="text-xs font-normal text-muted-foreground ml-2">
                (sürükleyerek taşıyabilirsiniz)
              </span>
            </CardTitle>
            <Button size="sm" onClick={() => setIsNewNoteOpen(true)} className="gap-1">
              <Plus className="h-4 w-4" />
              Yeni Not
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {isLoadingNotes ? (
            <div className="text-center py-4 text-muted-foreground">
              <Loader2 className="h-6 w-6 animate-spin mx-auto mb-2" />
              Yükleniyor...
            </div>
          ) : myNotes.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <StickyNote className="h-10 w-10 mx-auto mb-2 opacity-50" />
              <p>Henüz not eklenmemiş</p>
              <p className="text-sm">Maliyetleriniz ve siparişleriniz hakkında notlar alın</p>
            </div>
          ) : (
            <div 
              ref={notesContainerRef}
              className="relative min-h-[400px] bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800 rounded-xl p-4 border border-dashed border-slate-300 dark:border-slate-600"
            >
              {myNotes.map((note, index) => {
                const colorClasses = getNoteColorClasses(note.color);
                const isEditing = editingNoteId === note.id;
                const isDragging = draggingNoteId === note.id;
                
                // Calculate position based on stored position or default grid
                const defaultX = (index % 3) * 220 + 10;
                const defaultY = Math.floor(index / 3) * 200 + 10;
                const posX = note.position_x || defaultX;
                const posY = note.position_y || defaultY;
                
                return (
                  <div 
                    key={note.id}
                    className={`absolute w-[200px] transition-shadow duration-200 ${isDragging ? 'z-50 scale-105' : 'z-10'}`}
                    style={{
                      left: `${posX}px`,
                      top: `${posY}px`,
                      cursor: isDragging ? 'grabbing' : 'grab',
                    }}
                    onMouseDown={(e) => {
                      if (isEditing) return;
                      const startX = e.clientX - posX;
                      const startY = e.clientY - posY;
                      setDraggingNoteId(note.id);
                      
                      const handleMouseMove = (moveEvent: MouseEvent) => {
                        const containerRect = notesContainerRef.current?.getBoundingClientRect();
                        if (!containerRect) return;
                        
                        let newX = moveEvent.clientX - startX;
                        let newY = moveEvent.clientY - startY;
                        
                        // Constrain to container bounds
                        newX = Math.max(0, Math.min(newX, containerRect.width - 210));
                        newY = Math.max(0, Math.min(newY, containerRect.height - 150));
                        
                        setMyNotes(prev => prev.map(n => 
                          n.id === note.id ? { ...n, position_x: newX, position_y: newY } : n
                        ));
                      };
                      
                      const handleMouseUp = () => {
                        setDraggingNoteId(null);
                        // Save position to database
                        const currentNote = myNotes.find(n => n.id === note.id);
                        if (currentNote) {
                          supabase
                            .from("sticky_notes")
                            .update({ 
                              position_x: currentNote.position_x, 
                              position_y: currentNote.position_y 
                            })
                            .eq("id", note.id)
                            .then(() => {});
                        }
                        document.removeEventListener('mousemove', handleMouseMove);
                        document.removeEventListener('mouseup', handleMouseUp);
                      };
                      
                      document.addEventListener('mousemove', handleMouseMove);
                      document.addEventListener('mouseup', handleMouseUp);
                    }}
                  >
                    <div 
                      className={`
                        p-3 rounded-xl border-2 
                        ${colorClasses.bg} ${colorClasses.border} ${colorClasses.text}
                        shadow-lg ${colorClasses.shadow}
                        transform rotate-[${(index % 3 - 1) * 2}deg]
                        hover:rotate-0 hover:scale-105 transition-all duration-200
                        ${isDragging ? 'shadow-2xl ring-2 ring-primary' : ''}
                      `}
                      style={{
                        transform: isDragging ? 'rotate(0deg) scale(1.05)' : `rotate(${(index % 3 - 1) * 2}deg)`,
                        boxShadow: isDragging 
                          ? '0 25px 50px -12px rgba(0, 0, 0, 0.25)' 
                          : '0 10px 25px -5px rgba(0, 0, 0, 0.1), 0 8px 10px -6px rgba(0, 0, 0, 0.1)',
                      }}
                    >
                      {/* Header with drag handle and actions */}
                      <div className="flex items-center gap-1 mb-2">
                        <GripVertical className="h-4 w-4 opacity-50 cursor-grab" />
                        {noteColors.map((c) => (
                          <button
                            key={c.name}
                            onClick={(e) => {
                              e.stopPropagation();
                              handleUpdateNote(note.id, { color: c.name });
                            }}
                            className={`w-3 h-3 rounded-full ${c.bg} border ${c.border} ${note.color === c.name ? 'ring-2 ring-offset-1 ring-gray-500' : ''}`}
                          />
                        ))}
                        <div className="flex-1" />
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDeleteNote(note.id);
                          }}
                          className="p-1 rounded-full hover:bg-black/10 transition-colors"
                        >
                          <Trash2 className="h-3 w-3" />
                        </button>
                      </div>
                      
                      {isEditing ? (
                        <div className="space-y-2" onClick={(e) => e.stopPropagation()}>
                          <Input
                            value={note.title}
                            onChange={(e) => handleUpdateNote(note.id, { title: e.target.value })}
                            placeholder="Başlık"
                            className={`h-8 text-sm font-bold border-0 shadow-none bg-white/70 ${colorClasses.text} placeholder:opacity-50 rounded-lg`}
                            autoFocus
                          />
                          <Textarea
                            value={note.content}
                            onChange={(e) => handleUpdateNote(note.id, { content: e.target.value })}
                            placeholder="Notunuzu yazın..."
                            className={`min-h-[100px] text-sm border-0 shadow-none bg-white/70 resize-none ${colorClasses.text} placeholder:opacity-50 rounded-lg`}
                            rows={5}
                          />
                          <Button
                            size="sm"
                            variant="secondary"
                            onClick={() => setEditingNoteId(null)}
                            className="w-full h-7 text-xs"
                          >
                            ✓ Tamam
                          </Button>
                        </div>
                      ) : (
                        <div 
                          className="cursor-pointer min-h-[100px]"
                          onClick={(e) => {
                            e.stopPropagation();
                            setEditingNoteId(note.id);
                          }}
                        >
                          <p className="font-bold text-sm mb-2 border-b border-current/20 pb-1">
                            {note.title || "Başlıksız"}
                          </p>
                          <p className="text-xs leading-relaxed whitespace-pre-wrap break-words">
                            {note.content || "Düzenlemek için tıklayın..."}
                          </p>
                        </div>
                      )}
                      
                      {/* Footer with date */}
                      <div className="flex items-center justify-between mt-3 pt-2 border-t border-current/10">
                        <p className="text-[10px] opacity-60">
                          📅 {format(new Date(note.created_at), "d MMM yyyy", { locale: tr })}
                        </p>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Yeni Not Dialog */}
      <Dialog open={isNewNoteOpen} onOpenChange={setIsNewNoteOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <StickyNote className="h-5 w-5" />
              Yeni Not Oluştur
            </DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium mb-2 block">Kime</label>
              {isLoadingUsers ? (
                <div className="flex items-center gap-2 text-muted-foreground text-sm py-2">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Kullanıcılar yükleniyor...
                </div>
              ) : (
                <Select value={newNoteRecipient} onValueChange={setNewNoteRecipient}>
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Seçin" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="self">
                      <div className="flex items-center gap-2">
                        <User className="h-4 w-4" />
                        Kendime (Not)
                      </div>
                    </SelectItem>
                    {allUsers.length > 0 ? (
                      allUsers.map(u => (
                        <SelectItem key={u.user_id} value={u.user_id}>
                          <div className="flex items-center gap-2">
                            <Send className="h-4 w-4 text-primary" />
                            {u.full_name} (@{u.username})
                          </div>
                        </SelectItem>
                      ))
                    ) : (
                      <div className="px-2 py-1.5 text-sm text-muted-foreground">
                        Başka onaylı kullanıcı yok
                      </div>
                    )}
                  </SelectContent>
                </Select>
              )}
            </div>
            
            <div>
              <label className="text-sm font-medium mb-1 block">Renk</label>
              <div className="flex gap-2">
                {noteColors.map((c) => (
                  <button
                    key={c.name}
                    onClick={() => setNewNoteColor(c.name)}
                    className={`w-8 h-8 rounded-full ${c.bg} ${c.border} border-2 ${newNoteColor === c.name ? 'ring-2 ring-offset-2 ring-primary' : ''}`}
                  />
                ))}
              </div>
            </div>
            
            <div>
              <label className="text-sm font-medium mb-1 block">Başlık</label>
              <Input
                value={newNoteTitle}
                onChange={(e) => setNewNoteTitle(e.target.value)}
                placeholder="Not başlığı"
              />
            </div>
            
            <div>
              <label className="text-sm font-medium mb-1 block">İçerik</label>
              <Textarea
                value={newNoteContent}
                onChange={(e) => setNewNoteContent(e.target.value)}
                placeholder="Not içeriği..."
                rows={4}
                className="resize-none"
              />
            </div>
          </div>
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsNewNoteOpen(false)}>
              İptal
            </Button>
            <Button onClick={handleCreateNote} className="gap-1">
              {newNoteRecipient === "self" ? (
                <>
                  <Plus className="h-4 w-4" />
                  Ekle
                </>
              ) : (
                <>
                  <Send className="h-4 w-4" />
                  Gönder
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Reply Dialog */}
      <Dialog open={!!replyingNote} onOpenChange={() => setReplyingNote(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Reply className="h-5 w-5" />
              Notu Cevapla ve Tamamla
            </DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4">
            {replyingNote && (
              <div className={`p-3 rounded-lg ${getNoteColorClasses(replyingNote.color).bg} ${getNoteColorClasses(replyingNote.color).border} border`}>
                <p className="font-medium text-sm">{replyingNote.title}</p>
                <p className="text-sm opacity-80">{replyingNote.content}</p>
              </div>
            )}
            
            <div>
              <label className="text-sm font-medium mb-1 block">Cevabınız</label>
              <Textarea
                value={replyText}
                onChange={(e) => setReplyText(e.target.value)}
                placeholder="Cevabınızı yazın..."
                rows={3}
                className="resize-none"
              />
            </div>
          </div>
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setReplyingNote(null)}>
              İptal
            </Button>
            <Button onClick={() => replyingNote && handleCompleteNote(replyingNote, true)} className="gap-1">
              <Check className="h-4 w-4" />
              Tamamla ve Gönder
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
