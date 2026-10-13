-- Add super_admin role to app_role enum (if not exists)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_type t
    JOIN pg_enum e ON t.oid = e.enumtypid
    WHERE t.typname = 'app_role' AND e.enumlabel = 'super_admin'
  ) THEN
    ALTER TYPE public.app_role ADD VALUE 'super_admin';
  END IF;
END$$;

-- Create or update super admin assignment function
CREATE OR REPLACE FUNCTION public.make_super_admin(_email TEXT)
RETURNS TABLE (success BOOLEAN, message TEXT)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id UUID;
BEGIN
  -- Get the user ID from the email
  SELECT id INTO v_user_id FROM auth.users WHERE email = _email;
  
  IF v_user_id IS NULL THEN
    RETURN QUERY SELECT false, 'User not found with email: ' || _email;
    RETURN;
  END IF;
  
  -- Remove any existing roles for this user
  DELETE FROM public.user_roles WHERE user_id = v_user_id;
  
  -- Insert only super_admin role
  INSERT INTO public.user_roles (user_id, role)
  VALUES (v_user_id, 'super_admin');
  
  RETURN QUERY SELECT true, 'User ' || _email || ' is now a SUPER ADMIN';
END;
$$;

-- Execute to make marcelinkyambo@gmail.com super admin
SELECT public.make_super_admin('marcelinkyambo@gmail.com');
