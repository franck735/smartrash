-- Fix: Assign default 'customer' role to new users on signup

-- Also assign customer role to existing users who don't have any role
INSERT INTO public.user_roles (user_id, role)
SELECT id, 'customer'
FROM auth.users
WHERE NOT EXISTS (
  SELECT 1 FROM public.user_roles WHERE user_roles.user_id = auth.users.id
);
