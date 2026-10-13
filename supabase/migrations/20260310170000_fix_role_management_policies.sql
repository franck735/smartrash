-- Ensure role management works for admin, owner, and super_admin users.
-- Also provide secure RPC helpers for assigning roles from the app.

CREATE OR REPLACE FUNCTION public.is_role_manager(_user_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND role IN ('admin', 'owner', 'super_admin')
  );
$$;

DROP POLICY IF EXISTS "Admins can manage roles" ON public.user_roles;
DROP POLICY IF EXISTS "Managers can manage roles" ON public.user_roles;
CREATE POLICY "Managers can manage roles" ON public.user_roles
  FOR ALL TO authenticated
  USING (public.is_role_manager(auth.uid()))
  WITH CHECK (public.is_role_manager(auth.uid()));

DROP POLICY IF EXISTS "Managers can read all roles" ON public.user_roles;
CREATE POLICY "Managers can read all roles" ON public.user_roles
  FOR SELECT TO authenticated
  USING (public.is_role_manager(auth.uid()));

DROP POLICY IF EXISTS "Managers can read all profiles" ON public.profiles;
CREATE POLICY "Managers can read all profiles" ON public.profiles
  FOR SELECT TO authenticated
  USING (public.is_role_manager(auth.uid()));

CREATE OR REPLACE FUNCTION public.assign_user_role(_target_user_id UUID, _target_role app_role)
RETURNS TABLE (success BOOLEAN, message TEXT)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
DECLARE
  v_actor_id UUID := auth.uid();
  v_actor_is_super_admin BOOLEAN := false;
  v_actor_is_owner BOOLEAN := false;
  v_actor_is_admin BOOLEAN := false;
  v_target_is_protected BOOLEAN := false;
BEGIN
  IF v_actor_id IS NULL THEN
    RETURN QUERY SELECT false, 'Not authenticated';
    RETURN;
  END IF;

  SELECT
    EXISTS(SELECT 1 FROM public.user_roles WHERE user_id = v_actor_id AND role = 'super_admin'),
    EXISTS(SELECT 1 FROM public.user_roles WHERE user_id = v_actor_id AND role = 'owner'),
    EXISTS(SELECT 1 FROM public.user_roles WHERE user_id = v_actor_id AND role = 'admin')
  INTO v_actor_is_super_admin, v_actor_is_owner, v_actor_is_admin;

  IF NOT (v_actor_is_super_admin OR v_actor_is_owner OR v_actor_is_admin) THEN
    RETURN QUERY SELECT false, 'Only managers can assign roles';
    RETURN;
  END IF;

  IF _target_user_id IS NULL THEN
    RETURN QUERY SELECT false, 'Target user is required';
    RETURN;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM auth.users WHERE id = _target_user_id) THEN
    RETURN QUERY SELECT false, 'Target user does not exist';
    RETURN;
  END IF;

  IF _target_user_id = v_actor_id THEN
    RETURN QUERY SELECT false, 'You cannot change your own role';
    RETURN;
  END IF;

  IF v_actor_is_admin THEN
    IF _target_role IN ('owner', 'super_admin') THEN
      RETURN QUERY SELECT false, 'Admins cannot assign owner or super admin roles';
      RETURN;
    END IF;

    SELECT EXISTS(
      SELECT 1
      FROM public.user_roles
      WHERE user_id = _target_user_id
        AND role IN ('owner', 'super_admin')
    ) INTO v_target_is_protected;

    IF v_target_is_protected THEN
      RETURN QUERY SELECT false, 'Admins cannot modify owner or super admin accounts';
      RETURN;
    END IF;
  END IF;

  DELETE FROM public.user_roles WHERE user_id = _target_user_id;
  INSERT INTO public.user_roles (user_id, role) VALUES (_target_user_id, _target_role);

  RETURN QUERY SELECT true, 'Role updated successfully';
END;
$$;

CREATE OR REPLACE FUNCTION public.assign_user_role_by_email(_email TEXT, _target_role app_role)
RETURNS TABLE (success BOOLEAN, message TEXT)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
DECLARE
  v_target_user_id UUID;
BEGIN
  SELECT id
  INTO v_target_user_id
  FROM auth.users
  WHERE lower(email) = lower(trim(_email))
  LIMIT 1;

  IF v_target_user_id IS NULL THEN
    RETURN QUERY SELECT false, 'User not found for that email. Ask them to sign up first.';
    RETURN;
  END IF;

  RETURN QUERY SELECT * FROM public.assign_user_role(v_target_user_id, _target_role);
END;
$$;

GRANT EXECUTE ON FUNCTION public.is_role_manager(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.assign_user_role(UUID, app_role) TO authenticated;
GRANT EXECUTE ON FUNCTION public.assign_user_role_by_email(TEXT, app_role) TO authenticated;
