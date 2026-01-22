-- Fix infinite recursion in chat_group_members RLS policies
DROP POLICY IF EXISTS "Users can view members of groups they belong to" ON public.chat_group_members;
DROP POLICY IF EXISTS "Group creators can add members" ON public.chat_group_members;
DROP POLICY IF EXISTS "Group creators can remove members" ON public.chat_group_members;

-- Create fixed policies without recursion
CREATE POLICY "View group members - creator or member via groups table" 
ON public.chat_group_members 
FOR SELECT 
USING (
  EXISTS (
    SELECT 1 FROM chat_groups 
    WHERE chat_groups.id = chat_group_members.group_id 
    AND chat_groups.created_by = auth.uid()
  )
  OR user_id = auth.uid()
);

CREATE POLICY "Add group members - creator only" 
ON public.chat_group_members 
FOR INSERT 
WITH CHECK (
  EXISTS (
    SELECT 1 FROM chat_groups 
    WHERE chat_groups.id = chat_group_members.group_id 
    AND chat_groups.created_by = auth.uid()
  )
);

CREATE POLICY "Remove group members - creator or self" 
ON public.chat_group_members 
FOR DELETE 
USING (
  EXISTS (
    SELECT 1 FROM chat_groups 
    WHERE chat_groups.id = chat_group_members.group_id 
    AND chat_groups.created_by = auth.uid()
  )
  OR user_id = auth.uid()
);

-- Add FT columns to orders table
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS is_fast_track boolean NOT NULL DEFAULT false;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS fabric_termin_date date;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS po_termin_date date;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS shipped_date date;

-- Update realtime for orders
ALTER PUBLICATION supabase_realtime ADD TABLE public.orders;