-- Create new users for the multi-role system
-- First, we need to create auth users and their profiles

-- Note: We'll create profiles for users that will be created via the app
-- The admin can create these users from the admin panel

-- For now, let's ensure the user_type enum has all the needed values
-- and update existing admin users to have proper user_type

-- Update existing users to have admin user_type if not set
UPDATE public.profiles 
SET user_type = 'admin' 
WHERE user_type IS NULL;

-- Ensure all existing approved users have the admin role in user_roles
INSERT INTO public.user_roles (user_id, role)
SELECT user_id, 'admin'::app_role
FROM public.profiles
WHERE status = 'approved'
ON CONFLICT (user_id, role) DO NOTHING;