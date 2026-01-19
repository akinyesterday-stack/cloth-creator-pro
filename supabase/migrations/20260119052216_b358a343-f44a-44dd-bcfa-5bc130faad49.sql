-- Add recipient_user_id for sending notes to other users
-- Add is_read, is_completed, completed_at, reply columns for note workflow
ALTER TABLE public.sticky_notes 
ADD COLUMN recipient_user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
ADD COLUMN is_read BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN is_completed BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN completed_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN reply TEXT;

-- Update RLS policies to allow users to see notes sent to them
DROP POLICY IF EXISTS "Users can view their own sticky notes" ON public.sticky_notes;
CREATE POLICY "Users can view their own or received sticky notes" 
ON public.sticky_notes 
FOR SELECT 
USING (auth.uid() = user_id OR auth.uid() = recipient_user_id);

-- Update policy - users can update notes they created or notes sent to them (for marking as read/completed)
DROP POLICY IF EXISTS "Users can update their own sticky notes" ON public.sticky_notes;
CREATE POLICY "Users can update their own or received sticky notes" 
ON public.sticky_notes 
FOR UPDATE 
USING (auth.uid() = user_id OR auth.uid() = recipient_user_id);

-- Create notifications table for tracking unread notes and alerts
CREATE TABLE public.notifications (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  type TEXT NOT NULL DEFAULT 'note', -- 'note', 'note_completed', 'note_reply'
  title TEXT NOT NULL,
  message TEXT,
  related_note_id UUID REFERENCES public.sticky_notes(id) ON DELETE CASCADE,
  is_read BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on notifications
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

-- Policies for notifications
CREATE POLICY "Users can view their own notifications" 
ON public.notifications 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert notifications" 
ON public.notifications 
FOR INSERT 
WITH CHECK (true);

CREATE POLICY "Users can update their own notifications" 
ON public.notifications 
FOR UPDATE 
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own notifications" 
ON public.notifications 
FOR DELETE 
USING (auth.uid() = user_id);