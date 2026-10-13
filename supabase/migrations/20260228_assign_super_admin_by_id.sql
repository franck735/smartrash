-- Assign super_admin role to marcelinkyambo@gmail.com
-- Uses email lookup so it works regardless of user UUID

-- Remove any existing roles for this user
DELETE FROM public.user_roles
WHERE user_id = (SELECT id FROM auth.users WHERE email = 'marcelinkyambo@gmail.com');

-- Insert super_admin role
INSERT INTO public.user_roles (user_id, role)
SELECT id, 'super_admin'
FROM auth.users
WHERE email = 'marcelinkyambo@gmail.com'
ON CONFLICT (user_id, role) DO NOTHING;
