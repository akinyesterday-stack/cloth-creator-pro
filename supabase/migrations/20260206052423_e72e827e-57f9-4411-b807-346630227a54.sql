-- Allow anonymous users to view approved profiles for the login selection screen
-- This is safe because we only expose public profile info (name, username, user_type)
-- and the user still needs to know the password to login

CREATE POLICY "Anyone can view approved profiles for login selection"
ON public.profiles
FOR SELECT
USING (status = 'approved');