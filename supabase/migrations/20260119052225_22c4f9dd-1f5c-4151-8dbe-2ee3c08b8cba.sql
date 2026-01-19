-- Fix permissive INSERT policy on notifications
DROP POLICY IF EXISTS "Users can insert notifications" ON public.notifications;

-- Only authenticated users can insert notifications (for themselves or others)
CREATE POLICY "Authenticated users can insert notifications" 
ON public.notifications 
FOR INSERT 
WITH CHECK (auth.uid() IS NOT NULL);