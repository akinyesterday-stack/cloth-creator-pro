-- Allow approved users to see other approved users for note sending
CREATE POLICY "Approved users can view other approved users" 
ON public.profiles 
FOR SELECT 
USING (
  status = 'approved' 
  AND is_approved(auth.uid())
);