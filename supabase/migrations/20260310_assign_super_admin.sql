-- Make user 51996fbd-3d5b-4ff7-8361-04f5ce687b9c a super admin
-- This migration runs after the original setup migrations

-- First, remove any existing roles for this user
DELETE FROM public.user_roles WHERE user_id = '51996fbd-3d5b-4ff7-8361-04f5ce687b9c';

-- Insert super_admin role for the user
INSERT INTO public.user_roles (user_id, role)
VALUES ('51996fbd-3d5b-4ff7-8361-04f5ce687b9c', 'super_admin');

-- Verify the assignment
SELECT user_id, role FROM public.user_roles WHERE user_id = '51996fbd-3d5b-4ff7-8361-04f5ce687b9c';
