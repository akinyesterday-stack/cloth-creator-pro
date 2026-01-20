-- Create chat_groups table for group conversations
CREATE TABLE public.chat_groups (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  created_by UUID NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create chat_group_members table for group membership
CREATE TABLE public.chat_group_members (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  group_id UUID NOT NULL REFERENCES public.chat_groups(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  joined_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(group_id, user_id)
);

-- Create chat_messages table for all messages (1-1 and group)
CREATE TABLE public.chat_messages (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  sender_id UUID NOT NULL,
  recipient_id UUID, -- NULL for group messages
  group_id UUID REFERENCES public.chat_groups(id) ON DELETE CASCADE, -- NULL for 1-1 messages
  content TEXT NOT NULL,
  is_read BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  CONSTRAINT check_recipient_or_group CHECK (
    (recipient_id IS NOT NULL AND group_id IS NULL) OR 
    (recipient_id IS NULL AND group_id IS NOT NULL)
  )
);

-- Enable RLS
ALTER TABLE public.chat_groups ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chat_group_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chat_messages ENABLE ROW LEVEL SECURITY;

-- Chat Groups Policies
CREATE POLICY "Users can view groups they belong to"
ON public.chat_groups FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.chat_group_members 
    WHERE group_id = chat_groups.id AND user_id = auth.uid()
  )
);

CREATE POLICY "Users can create groups"
ON public.chat_groups FOR INSERT
WITH CHECK (auth.uid() = created_by);

CREATE POLICY "Group creators can update their groups"
ON public.chat_groups FOR UPDATE
USING (auth.uid() = created_by);

CREATE POLICY "Group creators can delete their groups"
ON public.chat_groups FOR DELETE
USING (auth.uid() = created_by);

-- Chat Group Members Policies
CREATE POLICY "Users can view members of groups they belong to"
ON public.chat_group_members FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.chat_group_members cgm 
    WHERE cgm.group_id = chat_group_members.group_id AND cgm.user_id = auth.uid()
  )
);

CREATE POLICY "Group creators can add members"
ON public.chat_group_members FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.chat_groups 
    WHERE id = chat_group_members.group_id AND created_by = auth.uid()
  ) OR auth.uid() = user_id
);

CREATE POLICY "Group creators can remove members"
ON public.chat_group_members FOR DELETE
USING (
  EXISTS (
    SELECT 1 FROM public.chat_groups 
    WHERE id = chat_group_members.group_id AND created_by = auth.uid()
  ) OR auth.uid() = user_id
);

-- Chat Messages Policies
CREATE POLICY "Users can view their own messages"
ON public.chat_messages FOR SELECT
USING (
  auth.uid() = sender_id OR 
  auth.uid() = recipient_id OR
  EXISTS (
    SELECT 1 FROM public.chat_group_members 
    WHERE group_id = chat_messages.group_id AND user_id = auth.uid()
  )
);

CREATE POLICY "Users can send messages"
ON public.chat_messages FOR INSERT
WITH CHECK (auth.uid() = sender_id);

CREATE POLICY "Users can update their own messages"
ON public.chat_messages FOR UPDATE
USING (auth.uid() = sender_id OR auth.uid() = recipient_id);

CREATE POLICY "Users can delete their own messages"
ON public.chat_messages FOR DELETE
USING (auth.uid() = sender_id);

-- Create triggers for updated_at
CREATE TRIGGER update_chat_groups_updated_at
BEFORE UPDATE ON public.chat_groups
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Enable realtime for chat
ALTER PUBLICATION supabase_realtime ADD TABLE public.chat_messages;
ALTER PUBLICATION supabase_realtime ADD TABLE public.chat_groups;