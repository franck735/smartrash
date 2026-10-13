-- Create or update admin user function
CREATE OR REPLACE FUNCTION public.make_user_admin(_email TEXT)
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
  
  -- Insert admin role if not already present
  INSERT INTO public.user_roles (user_id, role)
  VALUES (v_user_id, 'admin')
  ON CONFLICT (user_id, role) DO NOTHING;
  
  RETURN QUERY SELECT true, 'User ' || _email || ' is now an admin';
END;
$$;

-- Execute function to make marcelinkyambo@gmail.com admin
SELECT public.make_user_admin('marcelinkyambo@gmail.com');
