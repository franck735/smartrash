-- Complete Role Setup Migration
-- This migration adds:
-- 1. Functions to assign owner, driver, and customer roles
-- 2. Default role assignment on user signup
-- 3. RLS policies for super_admin and owner roles

-- ============================================
-- PART 0: Add enum values conditionally (if not already exist)
-- ============================================

-- Add super_admin role to enum (if not exists)
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

-- Add owner role to enum (if not exists)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_type t
    JOIN pg_enum e ON t.oid = e.enumtypid
    WHERE t.typname = 'app_role' AND e.enumlabel = 'owner'
  ) THEN
    ALTER TYPE public.app_role ADD VALUE 'owner';
  END IF;
END$$;

-- Add customer role to enum (if not exists)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_type t
    JOIN pg_enum e ON t.oid = e.enumtypid
    WHERE t.typname = 'app_role' AND e.enumlabel = 'customer'
  ) THEN
    ALTER TYPE public.app_role ADD VALUE 'customer';
  END IF;
END$$;

-- ============================================
-- PART 1: Create role assignment functions
-- ============================================

-- Function to make a user an owner
CREATE OR REPLACE FUNCTION public.make_owner(_email TEXT)
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
  
  -- Insert owner role if not already present
  INSERT INTO public.user_roles (user_id, role)
  VALUES (v_user_id, 'owner')
  ON CONFLICT (user_id, role) DO NOTHING;
  
  RETURN QUERY SELECT true, 'User ' || _email || ' is now an owner';
END;
$$;

-- Function to make a user a driver
CREATE OR REPLACE FUNCTION public.make_driver(_email TEXT)
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
  
  -- Insert driver role if not already present
  INSERT INTO public.user_roles (user_id, role)
  VALUES (v_user_id, 'driver')
  ON CONFLICT (user_id, role) DO NOTHING;
  
  RETURN QUERY SELECT true, 'User ' || _email || ' is now a driver';
END;
$$;

-- Function to make a user a customer
CREATE OR REPLACE FUNCTION public.make_customer(_email TEXT)
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
  
  -- Remove any existing roles for this user (except keep if they're super_admin or admin)
  DELETE FROM public.user_roles 
  WHERE user_id = v_user_id 
  AND role NOT IN ('super_admin', 'admin', 'owner');
  
  -- Insert customer role if not already present
  INSERT INTO public.user_roles (user_id, role)
  VALUES (v_user_id, 'customer')
  ON CONFLICT (user_id, role) DO NOTHING;
  
  RETURN QUERY SELECT true, 'User ' || _email || ' is now a customer';
END;
$$;

-- ============================================
-- PART 2: Update handle_new_user trigger to assign default role
-- ============================================

-- Drop and recreate the trigger function to include default role
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Insert into profiles
  INSERT INTO public.profiles (user_id) VALUES (NEW.id);
  
  -- Insert into trash_status
  INSERT INTO public.trash_status (user_id) VALUES (NEW.id);
  
  -- Assign default 'customer' role to new users
  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.id, 'customer')
  ON CONFLICT (user_id, role) DO NOTHING;
  
  RETURN NEW;
END;
$$;

-- Ensure trigger exists
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ============================================
-- PART 3: Add RLS policies for super_admin and owner roles
-- ============================================

-- Update has_role function to handle super_admin and owner
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role app_role)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id AND role = _role
  )
$$;

-- Add super_admin policies for user_roles
-- Super admins can manage all roles
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE policyname = 'Super admins can manage all roles' AND tablename = 'user_roles'
  ) THEN
    CREATE POLICY "Super admins can manage all roles" ON public.user_roles
      FOR ALL TO authenticated
      USING (public.has_role(auth.uid(), 'super_admin'))
      WITH CHECK (public.has_role(auth.uid(), 'super_admin'));
  END IF;
END $$;

-- Add owner policies for user_roles
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE policyname = 'Owners can manage user roles' AND tablename = 'user_roles'
  ) THEN
    CREATE POLICY "Owners can manage user roles" ON public.user_roles
      FOR ALL TO authenticated
      USING (public.has_role(auth.uid(), 'owner'))
      WITH CHECK (public.has_role(auth.uid(), 'owner'));
  END IF;
END $$;

-- Add super_admin policies for profiles
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE policyname = 'Super admins can manage all profiles' AND tablename = 'profiles'
  ) THEN
    CREATE POLICY "Super admins can manage all profiles" ON public.profiles
      FOR ALL TO authenticated
      USING (public.has_role(auth.uid(), 'super_admin'))
      WITH CHECK (public.has_role(auth.uid(), 'super_admin'));
  END IF;
END $$;

-- Add owner policies for profiles
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE policyname = 'Owners can manage profiles' AND tablename = 'profiles'
  ) THEN
    CREATE POLICY "Owners can manage profiles" ON public.profiles
      FOR ALL TO authenticated
      USING (public.has_role(auth.uid(), 'owner'))
      WITH CHECK (public.has_role(auth.uid(), 'owner'));
  END IF;
END $$;

-- Add super_admin policies for trash_status
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE policyname = 'Super admins can manage all trash' AND tablename = 'trash_status'
  ) THEN
    CREATE POLICY "Super admins can manage all trash" ON public.trash_status
      FOR ALL TO authenticated
      USING (public.has_role(auth.uid(), 'super_admin'))
      WITH CHECK (public.has_role(auth.uid(), 'super_admin'));
  END IF;
END $$;

-- Add owner policies for trash_status
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE policyname = 'Owners can manage trash' AND tablename = 'trash_status'
  ) THEN
    CREATE POLICY "Owners can manage trash" ON public.trash_status
      FOR ALL TO authenticated
      USING (public.has_role(auth.uid(), 'owner'))
      WITH CHECK (public.has_role(auth.uid(), 'owner'));
  END IF;
END $$;

-- Add super_admin policies for pickup_records
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE policyname = 'Super admins can manage all pickups' AND tablename = 'pickup_records'
  ) THEN
    CREATE POLICY "Super admins can manage all pickups" ON public.pickup_records
      FOR ALL TO authenticated
      USING (public.has_role(auth.uid(), 'super_admin'))
      WITH CHECK (public.has_role(auth.uid(), 'super_admin'));
  END IF;
END $$;

-- Add owner policies for pickup_records
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE policyname = 'Owners can manage pickups' AND tablename = 'pickup_records'
  ) THEN
    CREATE POLICY "Owners can manage pickups" ON public.pickup_records
      FOR ALL TO authenticated
      USING (public.has_role(auth.uid(), 'owner'))
      WITH CHECK (public.has_role(auth.uid(), 'owner'));
  END IF;
END $$;

-- Add super_admin policies for subscription_plans
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE policyname = 'Super admins can manage all plans' AND tablename = 'subscription_plans'
  ) THEN
    CREATE POLICY "Super admins can manage all plans" ON public.subscription_plans
      FOR ALL TO authenticated
      USING (public.has_role(auth.uid(), 'super_admin'))
      WITH CHECK (public.has_role(auth.uid(), 'super_admin'));
  END IF;
END $$;

-- Add owner policies for subscription_plans
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE policyname = 'Owners can manage subscription plans' AND tablename = 'subscription_plans'
  ) THEN
    CREATE POLICY "Owners can manage subscription plans" ON public.subscription_plans
      FOR ALL TO authenticated
      USING (public.has_role(auth.uid(), 'owner'))
      WITH CHECK (public.has_role(auth.uid(), 'owner'));
  END IF;
END $$;

-- Add super_admin policies for user_subscriptions
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE policyname = 'Super admins can manage all user subscriptions' AND tablename = 'user_subscriptions'
  ) THEN
    CREATE POLICY "Super admins can manage all user subscriptions" ON public.user_subscriptions
      FOR ALL TO authenticated
      USING (public.has_role(auth.uid(), 'super_admin'))
      WITH CHECK (public.has_role(auth.uid(), 'super_admin'));
  END IF;
END $$;

-- Add owner policies for user_subscriptions
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE policyname = 'Owners can manage user subscriptions' AND tablename = 'user_subscriptions'
  ) THEN
    CREATE POLICY "Owners can manage user subscriptions" ON public.user_subscriptions
      FOR ALL TO authenticated
      USING (public.has_role(auth.uid(), 'owner'))
      WITH CHECK (public.has_role(auth.uid(), 'owner'));
  END IF;
END $$;

-- Add super_admin policies for company_settings
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE policyname = 'Super admins can manage company settings' AND tablename = 'company_settings'
  ) THEN
    CREATE POLICY "Super admins can manage company settings" ON public.company_settings
      FOR ALL TO authenticated
      USING (public.has_role(auth.uid(), 'super_admin'))
      WITH CHECK (public.has_role(auth.uid(), 'super_admin'));
  END IF;
END $$;

-- ============================================
-- PART 4: Assign default customer role to existing users
-- ============================================

-- Assign customer role to existing users who don't have any role
INSERT INTO public.user_roles (user_id, role)
SELECT id, 'customer'
FROM auth.users
WHERE NOT EXISTS (
  SELECT 1 FROM public.user_roles WHERE user_roles.user_id = auth.users.id
);

-- ============================================
-- PART 5: Create helper view for user role management
-- ============================================

-- Create a view to easily see all users with their roles
CREATE OR REPLACE VIEW public.user_roles_view AS
SELECT 
  u.id as user_id,
  u.email,
  COALESCE(
    json_agg(DISTINCT ur.role) FILTER (WHERE ur.role IS NOT NULL),
    '[]'::json
  ) as roles,
  COUNT(DISTINCT ur.role) as role_count
FROM auth.users u
LEFT JOIN public.user_roles ur ON u.id = ur.user_id
GROUP BY u.id, u.email;

-- Grant access to the view
GRANT SELECT ON public.user_roles_view TO authenticated;
GRANT SELECT ON public.user_roles_view TO anon;

-- ============================================
-- Done!
-- ============================================
