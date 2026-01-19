import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { 
  Plus, X, Calendar, Clock, AlertTriangle, 
  StickyNote, Trash2, Mail, MailOpen, Check, Reply,
  Send, User
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
  status: string;
  fabric_type: string | null;
}

interface UserProfile {
  user_id: string;
  full_name: string;
  username: string;
}

const noteColors = [
  { name: "yellow", bg: "bg-yellow-100", border: "border-yellow-300", text: "text-yellow-800" },
  { name: "blue", bg: "bg-blue-100", border: "border-blue-300", text: "text-blue-800" },
  { name: "green", bg: "bg-green-100", border: "border-green-300", text: "text-green-800" },
  { name: "pink", bg: "bg-pink-100", border: "border-pink-300", text: "text-pink-800" },
  { name: "purple", bg: "bg-purple-100", border: "border-purple-300", text: "text-purple-800" },
];

export function Dashboard() {
  const { user, isAdmin } = useAuth();
  const [myNotes, setMyNotes] = useState<StickyNoteData[]>([]);
  const [receivedNotes, setReceivedNotes] = useState<StickyNoteData[]>([]);
  const [upcomingOrders, setUpcomingOrders] = useState<OrderWithTermin[]>([]);
  const [allUsers, setAllUsers] = useState<UserProfile[]>([]);
  const [isLoadingNotes, setIsLoadingNotes] = useState(true);
  const [isLoadingOrders, setIsLoadingOrders] = useState(true);
  const [editingNoteId, setEditingNoteId] = useState<string | null>(null);
  
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
    // Admin can see all users, regular users see approved users
    const { data, error } = await supabase
      .from("profiles")
      .select("user_id, full_name, username")
      .eq("status", "approved");

    if (!error && data) {
      setAllUsers(data.filter(u => u.user_id !== user?.id));
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
      {/* Gelen Notlar (Mektup Görünümü) */}
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

      {/* Yapışkan Notlar (Kendi Notlarım) */}
      <Card className="glass-card">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2 text-lg">
              <StickyNote className="h-5 w-5 text-primary" />
              Hızlı Notlar
            </CardTitle>
            <Button size="sm" onClick={() => setIsNewNoteOpen(true)} className="gap-1">
              <Plus className="h-4 w-4" />
              Yeni Not
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {isLoadingNotes ? (
            <div className="text-center py-4 text-muted-foreground">Yükleniyor...</div>
          ) : myNotes.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <StickyNote className="h-10 w-10 mx-auto mb-2 opacity-50" />
              <p>Henüz not eklenmemiş</p>
              <p className="text-sm">Maliyetleriniz ve siparişleriniz hakkında notlar alın</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {myNotes.map((note) => {
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
                          className={`h-8 text-sm font-medium border-0 shadow-none bg-white/50 ${colorClasses.text} placeholder:opacity-50`}
                          autoFocus
                        />
                        <Textarea
                          value={note.content}
                          onChange={(e) => handleUpdateNote(note.id, { content: e.target.value })}
                          placeholder="Notunuzu yazın..."
                          className={`min-h-[80px] text-sm border-0 shadow-none bg-white/50 resize-none ${colorClasses.text} placeholder:opacity-50`}
                          rows={4}
                        />
                        <Button
                          size="sm"
                          variant="secondary"
                          onClick={() => setEditingNoteId(null)}
                          className="w-full h-7"
                        >
                          Tamam
                        </Button>
                      </div>
                    ) : (
                      <div 
                        className="cursor-pointer min-h-[80px]"
                        onClick={() => setEditingNoteId(note.id)}
                      >
                        <p className="font-semibold text-sm mb-1">
                          {note.title || "Başlıksız"}
                        </p>
                        <p className="text-sm opacity-80 whitespace-pre-wrap">
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
              <label className="text-sm font-medium mb-1 block">Kime</label>
              <Select value={newNoteRecipient} onValueChange={setNewNoteRecipient}>
                <SelectTrigger>
                  <SelectValue placeholder="Seçin" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="self">Kendime (Not)</SelectItem>
                  {allUsers.map(u => (
                    <SelectItem key={u.user_id} value={u.user_id}>
                      {u.full_name} (@{u.username})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
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
