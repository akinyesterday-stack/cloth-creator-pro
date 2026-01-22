import { useState, useEffect, useRef, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  Sheet,
  SheetContent,
} from "@/components/ui/sheet";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";
import { Checkbox } from "@/components/ui/checkbox";
import {
  MessageCircle, Send, Plus, Users, Search, X, 
  Loader2, Check, CheckCheck, Edit2, ArrowLeft
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
import { format } from "date-fns";
import { cn } from "@/lib/utils";

interface ChatMessage {
  id: string;
  sender_id: string;
  recipient_id: string | null;
  group_id: string | null;
  content: string;
  is_read: boolean;
  created_at: string;
  sender_name?: string;
}

interface ChatGroup {
  id: string;
  name: string;
  created_by: string;
  created_at: string;
  members?: GroupMember[];
  lastMessage?: ChatMessage;
  unreadCount?: number;
}

interface GroupMember {
  user_id: string;
  full_name: string;
  username: string;
}

interface UserProfile {
  user_id: string;
  full_name: string;
  username: string;
}

interface Conversation {
  id: string;
  type: "user" | "group";
  name: string;
  lastMessage?: ChatMessage;
  unreadCount: number;
  avatar?: string;
  members?: GroupMember[];
}

export function LiveChat() {
  const { user } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [selectedConversation, setSelectedConversation] = useState<Conversation | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [allUsers, setAllUsers] = useState<UserProfile[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSending, setIsSending] = useState(false);
  
  // Message/Group creation
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [groupName, setGroupName] = useState("");
  const [selectedMembers, setSelectedMembers] = useState<string[]>([]);
  const [isEditingGroupName, setIsEditingGroupName] = useState(false);
  const [editedGroupName, setEditedGroupName] = useState("");
  const [userSearchQuery, setUserSearchQuery] = useState("");
  
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (user && isOpen) {
      loadUsers();
      loadConversations();
      setupRealtimeSubscription();
    }
  }, [user, isOpen]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const setupRealtimeSubscription = () => {
    const channel = supabase
      .channel("chat-messages")
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "chat_messages",
        },
        (payload) => {
          const newMsg = payload.new as ChatMessage;
          
          if (newMsg.recipient_id === user?.id || newMsg.sender_id === user?.id) {
            loadConversations();
            if (selectedConversation) {
              loadMessages(selectedConversation);
            }
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  };

  const loadUsers = async () => {
    if (!user) return;
    try {
      const { data, error } = await supabase
        .from("profiles")
        .select("user_id, full_name, username")
        .eq("status", "approved");

      if (error) throw error;
      setAllUsers((data || []).filter(u => u.user_id !== user.id));
    } catch (error) {
      console.error("Error loading users:", error);
    }
  };

  const loadConversations = async () => {
    if (!user) return;
    setIsLoading(true);

    try {
      // Load groups user belongs to
      const { data: memberData } = await supabase
        .from("chat_group_members")
        .select("group_id")
        .eq("user_id", user.id);

      const groupIds = (memberData || []).map(m => m.group_id);
      
      let groups: ChatGroup[] = [];
      if (groupIds.length > 0) {
        const { data: groupsData } = await supabase
          .from("chat_groups")
          .select("*")
          .in("id", groupIds);
        groups = groupsData || [];
      }

      // Load 1-1 conversations
      const { data: messagesData } = await supabase
        .from("chat_messages")
        .select("*")
        .or(`sender_id.eq.${user.id},recipient_id.eq.${user.id}`)
        .is("group_id", null)
        .order("created_at", { ascending: false });

      const userIds = new Set<string>();
      (messagesData || []).forEach(msg => {
        if (msg.sender_id !== user.id) userIds.add(msg.sender_id);
        if (msg.recipient_id && msg.recipient_id !== user.id) userIds.add(msg.recipient_id);
      });

      const convList: Conversation[] = [];

      // Add groups first
      for (const group of groups) {
        const { data: groupMsgs } = await supabase
          .from("chat_messages")
          .select("*")
          .eq("group_id", group.id)
          .order("created_at", { ascending: false })
          .limit(1);
        
        const lastMessage = groupMsgs?.[0];

        convList.push({
          id: group.id,
          type: "group",
          name: group.name,
          lastMessage,
          unreadCount: 0,
        });
      }

      // Add 1-1 conversations
      for (const userId of userIds) {
        const userProfile = allUsers.find(u => u.user_id === userId);
        if (!userProfile) continue;

        const userMessages = (messagesData || []).filter(
          m => (m.sender_id === userId || m.recipient_id === userId) && !m.group_id
        );
        const lastMessage = userMessages[0];
        const unreadCount = userMessages.filter(m => !m.is_read && m.sender_id === userId).length;

        convList.push({
          id: userId,
          type: "user",
          name: userProfile.full_name,
          lastMessage,
          unreadCount,
        });
      }

      // Sort by last message time, groups first
      convList.sort((a, b) => {
        if (a.type === "group" && b.type !== "group") return -1;
        if (a.type !== "group" && b.type === "group") return 1;
        const timeA = a.lastMessage?.created_at || "";
        const timeB = b.lastMessage?.created_at || "";
        return timeB.localeCompare(timeA);
      });

      setConversations(convList);
    } catch (error) {
      console.error("Error loading conversations:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const loadMessages = async (conversation: Conversation) => {
    if (!user) return;

    try {
      let query = supabase.from("chat_messages").select("*");

      if (conversation.type === "group") {
        query = query.eq("group_id", conversation.id);
      } else {
        query = query
          .is("group_id", null)
          .or(`and(sender_id.eq.${user.id},recipient_id.eq.${conversation.id}),and(sender_id.eq.${conversation.id},recipient_id.eq.${user.id})`);
      }

      const { data, error } = await query.order("created_at", { ascending: true });

      if (error) throw error;

      const senderIds = [...new Set((data || []).map(m => m.sender_id))];
      const { data: profiles } = await supabase
        .from("profiles")
        .select("user_id, full_name")
        .in("user_id", senderIds);

      const messagesWithNames = (data || []).map(msg => ({
        ...msg,
        sender_name: profiles?.find(p => p.user_id === msg.sender_id)?.full_name || "Bilinmeyen",
      }));

      setMessages(messagesWithNames);

      const unreadIds = (data || [])
        .filter(m => !m.is_read && m.sender_id !== user.id)
        .map(m => m.id);

      if (unreadIds.length > 0) {
        await supabase
          .from("chat_messages")
          .update({ is_read: true })
          .in("id", unreadIds);
      }
    } catch (error) {
      console.error("Error loading messages:", error);
    }
  };

  const handleSendMessage = async () => {
    if (!user || !selectedConversation || !newMessage.trim()) return;
    setIsSending(true);

    try {
      const messageData: any = {
        sender_id: user.id,
        content: newMessage.trim(),
      };

      if (selectedConversation.type === "group") {
        messageData.group_id = selectedConversation.id;
      } else {
        messageData.recipient_id = selectedConversation.id;
      }

      const { data, error } = await supabase
        .from("chat_messages")
        .insert(messageData)
        .select()
        .single();

      if (error) throw error;

      setMessages([...messages, { ...data, sender_name: "Ben" }]);
      setNewMessage("");
      inputRef.current?.focus();
    } catch (error) {
      console.error("Error sending message:", error);
      toast.error("Mesaj gönderilemedi");
    } finally {
      setIsSending(false);
    }
  };

  const handleCreateMessageOrGroup = async () => {
    if (!user || selectedMembers.length === 0) {
      toast.error("En az bir kişi seçin");
      return;
    }

    try {
      // If only one member selected, start direct conversation
      if (selectedMembers.length === 1) {
        const userId = selectedMembers[0];
        const userProfile = allUsers.find(u => u.user_id === userId);
        if (!userProfile) return;

        const newConv: Conversation = {
          id: userId,
          type: "user",
          name: userProfile.full_name,
          unreadCount: 0,
        };

        setSelectedConversation(newConv);
        setMessages([]);
        setIsCreateDialogOpen(false);
        setSelectedMembers([]);
        setGroupName("");
        setUserSearchQuery("");
        return;
      }

      // Multiple members - create group
      const finalGroupName = groupName.trim() || selectedMembers
        .map(id => allUsers.find(u => u.user_id === id)?.full_name)
        .filter(Boolean)
        .slice(0, 3)
        .join(", ");

      // Create group
      const { data: group, error: groupError } = await supabase
        .from("chat_groups")
        .insert({
          name: finalGroupName,
          created_by: user.id,
        })
        .select()
        .single();

      if (groupError) throw groupError;

      // Add members (including creator)
      const members = [...selectedMembers, user.id].map(userId => ({
        group_id: group.id,
        user_id: userId,
      }));

      const { error: membersError } = await supabase
        .from("chat_group_members")
        .insert(members);

      if (membersError) throw membersError;

      toast.success("Grup oluşturuldu");
      setIsCreateDialogOpen(false);
      setGroupName("");
      setSelectedMembers([]);
      setUserSearchQuery("");
      loadConversations();
      
      // Open the new group
      const newConv: Conversation = {
        id: group.id,
        type: "group",
        name: finalGroupName,
        unreadCount: 0,
      };
      setSelectedConversation(newConv);
      setMessages([]);
    } catch (error) {
      console.error("Error creating group:", error);
      toast.error("Oluşturulamadı");
    }
  };

  const handleRenameGroup = async () => {
    if (!selectedConversation || !editedGroupName.trim()) return;

    try {
      const { error } = await supabase
        .from("chat_groups")
        .update({ name: editedGroupName.trim() })
        .eq("id", selectedConversation.id);

      if (error) throw error;

      setSelectedConversation({
        ...selectedConversation,
        name: editedGroupName.trim(),
      });
      setIsEditingGroupName(false);
      loadConversations();
      toast.success("Grup adı güncellendi");
    } catch (error) {
      console.error("Error renaming group:", error);
    }
  };

  const handleStartConversation = (userId: string) => {
    const userProfile = allUsers.find(u => u.user_id === userId);
    if (!userProfile) return;

    const newConv: Conversation = {
      id: userId,
      type: "user",
      name: userProfile.full_name,
      unreadCount: 0,
    };

    setSelectedConversation(newConv);
    setMessages([]);
    setSearchQuery("");
  };

  const filteredUsers = useMemo(() => {
    if (!searchQuery.trim()) return [];
    const query = searchQuery.toLowerCase();
    return allUsers.filter(
      u => u.full_name.toLowerCase().includes(query) || u.username.toLowerCase().includes(query)
    );
  }, [allUsers, searchQuery]);

  const filteredConversations = useMemo(() => {
    if (!searchQuery.trim()) return conversations;
    const query = searchQuery.toLowerCase();
    return conversations.filter(c => c.name.toLowerCase().includes(query));
  }, [conversations, searchQuery]);

  const filteredDialogUsers = useMemo(() => {
    if (!userSearchQuery.trim()) return allUsers;
    const query = userSearchQuery.toLowerCase();
    return allUsers.filter(
      u => u.full_name.toLowerCase().includes(query) || u.username.toLowerCase().includes(query)
    );
  }, [allUsers, userSearchQuery]);

  const totalUnread = conversations.reduce((acc, c) => acc + c.unreadCount, 0);

  return (
    <>
      {/* Chat Trigger Button */}
      <div className="fixed bottom-6 right-6 z-50">
        <Button
          onClick={() => setIsOpen(true)}
          size="lg"
          className="h-14 w-14 rounded-full shadow-lg bg-primary hover:bg-primary/90"
        >
          <MessageCircle className="h-6 w-6" />
          {totalUnread > 0 && (
            <Badge 
              variant="destructive" 
              className="absolute -top-1 -right-1 h-5 min-w-[20px] px-1 text-xs"
            >
              {totalUnread > 99 ? "99+" : totalUnread}
            </Badge>
          )}
        </Button>
      </div>

      {/* Chat Panel - Semi-transparent */}
      <Sheet open={isOpen} onOpenChange={setIsOpen}>
        <SheetContent 
          side="right" 
          className="w-full sm:w-[380px] p-0 flex flex-col bg-background/80 backdrop-blur-xl border-l border-border/50"
        >
          {selectedConversation ? (
            // Chat View
            <>
              <div className="p-4 border-b bg-muted/30 flex items-center gap-3">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setSelectedConversation(null);
                    setMessages([]);
                  }}
                >
                  <ArrowLeft className="h-4 w-4" />
                </Button>
                
                <Avatar className="h-10 w-10">
                  <AvatarFallback className={selectedConversation.type === "group" ? "bg-primary" : "bg-secondary"}>
                    {selectedConversation.type === "group" ? (
                      <Users className="h-5 w-5 text-primary-foreground" />
                    ) : (
                      selectedConversation.name.charAt(0).toUpperCase()
                    )}
                  </AvatarFallback>
                </Avatar>
                
                <div className="flex-1 min-w-0">
                  {isEditingGroupName ? (
                    <div className="flex items-center gap-2">
                      <Input
                        value={editedGroupName}
                        onChange={(e) => setEditedGroupName(e.target.value)}
                        className="h-8"
                        autoFocus
                      />
                      <Button size="sm" onClick={handleRenameGroup}>
                        <Check className="h-4 w-4" />
                      </Button>
                    </div>
                  ) : (
                    <div className="flex items-center gap-2">
                      <h3 className="font-semibold truncate">{selectedConversation.name}</h3>
                      {selectedConversation.type === "group" && (
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-6 w-6 p-0"
                          onClick={() => {
                            setEditedGroupName(selectedConversation.name);
                            setIsEditingGroupName(true);
                          }}
                        >
                          <Edit2 className="h-3 w-3" />
                        </Button>
                      )}
                    </div>
                  )}
                  <p className="text-xs text-muted-foreground">
                    {selectedConversation.type === "group" ? "Grup Sohbeti" : "1-1 Sohbet"}
                  </p>
                </div>
              </div>

              <ScrollArea className="flex-1 p-4">
                <div className="space-y-4">
                  {messages.length === 0 ? (
                    <div className="text-center py-8 text-muted-foreground">
                      <MessageCircle className="h-12 w-12 mx-auto mb-3 opacity-30" />
                      <p>Henüz mesaj yok</p>
                      <p className="text-sm">İlk mesajı gönderin!</p>
                    </div>
                  ) : (
                    messages.map((msg) => {
                      const isMe = msg.sender_id === user?.id;
                      return (
                        <div
                          key={msg.id}
                          className={cn(
                            "flex flex-col max-w-[80%]",
                            isMe ? "ml-auto items-end" : "items-start"
                          )}
                        >
                          {!isMe && selectedConversation.type === "group" && (
                            <span className="text-xs text-muted-foreground mb-1 px-1">
                              {msg.sender_name}
                            </span>
                          )}
                          <div
                            className={cn(
                              "px-3 py-2 rounded-2xl text-sm",
                              isMe
                                ? "bg-primary text-primary-foreground rounded-br-sm"
                                : "bg-muted rounded-bl-sm"
                            )}
                          >
                            {msg.content}
                          </div>
                          <div className="flex items-center gap-1 mt-1 px-1">
                            <span className="text-[10px] text-muted-foreground">
                              {format(new Date(msg.created_at), "HH:mm")}
                            </span>
                            {isMe && (
                              msg.is_read ? (
                                <CheckCheck className="h-3 w-3 text-primary" />
                              ) : (
                                <Check className="h-3 w-3 text-muted-foreground" />
                              )
                            )}
                          </div>
                        </div>
                      );
                    })
                  )}
                  <div ref={messagesEndRef} />
                </div>
              </ScrollArea>

              <div className="p-4 border-t bg-background/50">
                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    handleSendMessage();
                  }}
                  className="flex items-center gap-2"
                >
                  <Input
                    ref={inputRef}
                    value={newMessage}
                    onChange={(e) => setNewMessage(e.target.value)}
                    placeholder="Mesaj yazın..."
                    className="flex-1 bg-background"
                    disabled={isSending}
                  />
                  <Button type="submit" size="icon" disabled={isSending || !newMessage.trim()}>
                    {isSending ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Send className="h-4 w-4" />
                    )}
                  </Button>
                </form>
              </div>
            </>
          ) : (
            // Conversations List
            <>
              <div className="p-4 border-b bg-muted/30">
                <h2 className="font-semibold flex items-center gap-2">
                  <MessageCircle className="h-5 w-5" />
                  Canlı Sohbet
                </h2>
              </div>

              <div className="p-3 border-b space-y-2">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Kullanıcı veya grup ara..."
                    className="pl-9 bg-background"
                  />
                  {searchQuery && (
                    <Button
                      variant="ghost"
                      size="sm"
                      className="absolute right-1 top-1/2 -translate-y-1/2 h-6 w-6 p-0"
                      onClick={() => setSearchQuery("")}
                    >
                      <X className="h-3 w-3" />
                    </Button>
                  )}
                </div>
                <Button
                  variant="outline"
                  className="w-full gap-2"
                  onClick={() => setIsCreateDialogOpen(true)}
                >
                  <Plus className="h-4 w-4" />
                  Yeni Mesaj
                </Button>
              </div>

              <ScrollArea className="flex-1">
                {isLoading ? (
                  <div className="flex items-center justify-center py-8">
                    <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                  </div>
                ) : (
                  <div className="p-2">
                    {/* Search Results */}
                    {searchQuery && filteredUsers.length > 0 && (
                      <div className="mb-4">
                        <p className="text-xs text-muted-foreground px-2 py-1">Kullanıcılar</p>
                        {filteredUsers.map((u) => (
                          <button
                            key={u.user_id}
                            onClick={() => handleStartConversation(u.user_id)}
                            className="w-full p-3 flex items-center gap-3 rounded-lg hover:bg-muted transition-colors"
                          >
                            <Avatar className="h-10 w-10">
                              <AvatarFallback>{u.full_name.charAt(0)}</AvatarFallback>
                            </Avatar>
                            <div className="text-left">
                              <p className="font-medium text-sm">{u.full_name}</p>
                              <p className="text-xs text-muted-foreground">@{u.username}</p>
                            </div>
                          </button>
                        ))}
                      </div>
                    )}

                    {/* Conversations */}
                    {filteredConversations.length === 0 ? (
                      <div className="text-center py-8 text-muted-foreground">
                        <Users className="h-12 w-12 mx-auto mb-3 opacity-30" />
                        <p>Henüz sohbet yok</p>
                        <p className="text-sm">Yeni Mesaj ile başlayın</p>
                      </div>
                    ) : (
                      filteredConversations.map((conv) => (
                        <button
                          key={conv.id}
                          onClick={() => {
                            setSelectedConversation(conv);
                            loadMessages(conv);
                          }}
                          className="w-full p-3 flex items-center gap-3 rounded-lg hover:bg-muted transition-colors"
                        >
                          <Avatar className="h-11 w-11">
                            <AvatarFallback className={conv.type === "group" ? "bg-primary text-primary-foreground" : ""}>
                              {conv.type === "group" ? (
                                <Users className="h-5 w-5" />
                              ) : (
                                conv.name.charAt(0).toUpperCase()
                              )}
                            </AvatarFallback>
                          </Avatar>
                          <div className="flex-1 min-w-0 text-left">
                            <div className="flex items-center justify-between">
                              <p className="font-medium text-sm truncate">{conv.name}</p>
                              {conv.lastMessage && (
                                <span className="text-[10px] text-muted-foreground">
                                  {format(new Date(conv.lastMessage.created_at), "HH:mm")}
                                </span>
                              )}
                            </div>
                            {conv.lastMessage && (
                              <p className="text-xs text-muted-foreground truncate">
                                {conv.lastMessage.content}
                              </p>
                            )}
                          </div>
                          {conv.unreadCount > 0 && (
                            <Badge variant="destructive" className="h-5 min-w-[20px] px-1.5">
                              {conv.unreadCount}
                            </Badge>
                          )}
                        </button>
                      ))
                    )}
                  </div>
                )}
              </ScrollArea>
            </>
          )}
        </SheetContent>
      </Sheet>

      {/* Create Message/Group Dialog */}
      <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <MessageCircle className="h-5 w-5" />
              Yeni Mesaj
            </DialogTitle>
            <DialogDescription>
              Bir kişi seçerek mesaj gönderin veya birden fazla kişi seçerek grup oluşturun.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            {/* User Search */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                value={userSearchQuery}
                onChange={(e) => setUserSearchQuery(e.target.value)}
                placeholder="İsim veya kullanıcı adı ara..."
                className="pl-9"
              />
            </div>

            {/* Group Name (shown if more than 1 selected) */}
            {selectedMembers.length > 1 && (
              <div>
                <label className="text-sm font-medium mb-2 block">Grup Adı (opsiyonel)</label>
                <Input
                  value={groupName}
                  onChange={(e) => setGroupName(e.target.value)}
                  placeholder="Grup adı girin..."
                />
              </div>
            )}

            <div>
              <label className="text-sm font-medium mb-2 block">
                Kişiler ({selectedMembers.length} seçildi)
              </label>
              <ScrollArea className="h-[250px] border rounded-lg p-2">
                {filteredDialogUsers.map((u) => (
                  <label
                    key={u.user_id}
                    className="flex items-center gap-3 p-2 rounded-lg hover:bg-muted cursor-pointer"
                  >
                    <Checkbox
                      checked={selectedMembers.includes(u.user_id)}
                      onCheckedChange={(checked) => {
                        if (checked) {
                          setSelectedMembers([...selectedMembers, u.user_id]);
                        } else {
                          setSelectedMembers(selectedMembers.filter(id => id !== u.user_id));
                        }
                      }}
                    />
                    <Avatar className="h-8 w-8">
                      <AvatarFallback>{u.full_name.charAt(0)}</AvatarFallback>
                    </Avatar>
                    <div>
                      <p className="text-sm font-medium">{u.full_name}</p>
                      <p className="text-xs text-muted-foreground">@{u.username}</p>
                    </div>
                  </label>
                ))}
              </ScrollArea>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => {
              setIsCreateDialogOpen(false);
              setSelectedMembers([]);
              setGroupName("");
              setUserSearchQuery("");
            }}>
              İptal
            </Button>
            <Button onClick={handleCreateMessageOrGroup} disabled={selectedMembers.length === 0}>
              {selectedMembers.length > 1 ? (
                <>
                  <Users className="h-4 w-4 mr-1" />
                  Grup Oluştur
                </>
              ) : (
                <>
                  <MessageCircle className="h-4 w-4 mr-1" />
                  Mesaj Gönder
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
