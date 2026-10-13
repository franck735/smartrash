-- Fix RLS policies to ensure basic functionality
-- This makes policies more permissive so users can read their own data

-- First, assign default 'customer' role to existing users who don't have any role
INSERT INTO public.user_roles (user_id, role)
SELECT id, 'customer'
FROM auth.users
WHERE NOT EXISTS (
  SELECT 1 FROM public.user_roles WHERE user_roles.user_id = auth.users.id
);

DROP POLICY IF EXISTS "Users can read own roles" ON public.user_roles;
DROP POLICY IF EXISTS "Users can insert own role" ON public.user_roles;
DROP POLICY IF EXISTS "Admins can manage roles" ON public.user_roles;

-- Allow all authenticated users to read roles
CREATE POLICY "Anyone authenticated can read roles" ON public.user_roles 
  FOR SELECT TO authenticated USING (true);

-- Allow users to insert their own role
CREATE POLICY "Users can insert own role" ON public.user_roles 
  FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());

-- Allow users to update their own role
CREATE POLICY "Users can update own role" ON public.user_roles 
  FOR UPDATE TO authenticated USING (user_id = auth.uid());

-- Allow admins to manage all roles
CREATE POLICY "Admins can manage roles" ON public.user_roles 
  FOR ALL TO authenticated USING (
    EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role IN ('admin', 'owner', 'super_admin'))
  );

-- ===== Fix profiles policies =====
DROP POLICY IF EXISTS "Users can read own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can insert own profile" ON public.profiles;
DROP POLICY IF EXISTS "Admins can read all profiles" ON public.profiles;
DROP POLICY IF EXISTS "Drivers can read household profiles" ON public.profiles;

-- Allow authenticated users to read all profiles (needed for driver routing)
CREATE POLICY "Anyone authenticated can read profiles" ON public.profiles 
  FOR SELECT TO authenticated USING (true);

-- Allow users to insert their own profile
CREATE POLICY "Users can insert own profile" ON public.profiles 
  FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());

-- Allow users to update their own profile
CREATE POLICY "Users can update own profile" ON public.profiles 
  FOR UPDATE TO authenticated USING (user_id = auth.uid());

-- ===== Fix trash_status policies =====
DROP POLICY IF EXISTS "Users can read own trash status" ON public.trash_status;
DROP POLICY IF EXISTS "Users can update own trash status" ON public.trash_status;
DROP POLICY IF EXISTS "Users can insert own trash status" ON public.trash_status;
DROP POLICY IF EXISTS "Drivers can read full trash" ON public.trash_status;
DROP POLICY IF EXISTS "Drivers can update trash status" ON public.trash_status;
DROP POLICY IF EXISTS "Admins can read all trash" ON public.trash_status;

-- Allow authenticated users to read all trash status (needed for drivers)
CREATE POLICY "Anyone authenticated can read trash status" ON public.trash_status 
  FOR SELECT TO authenticated USING (true);

-- Allow users to insert their own trash status
CREATE POLICY "Users can insert own trash status" ON public.trash_status 
  FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());

-- Allow users to update their own trash status
CREATE POLICY "Users can update own trash status" ON public.trash_status 
  FOR UPDATE TO authenticated USING (user_id = auth.uid());

-- ===== Fix pickup_records policies =====
DROP POLICY IF EXISTS "Households can read own pickups" ON public.pickup_records;
DROP POLICY IF EXISTS "Drivers can insert pickups" ON public.pickup_records;
DROP POLICY IF EXISTS "Drivers can read own pickups" ON public.pickup_records;
DROP POLICY IF EXISTS "Admins can read all pickups" ON public.pickup_records;

-- Allow authenticated users to read all pickups
CREATE POLICY "Anyone authenticated can read pickups" ON public.pickup_records 
  FOR SELECT TO authenticated USING (true);

-- Allow drivers to insert pickups
CREATE POLICY "Drivers can insert pickups" ON public.pickup_records 
  FOR INSERT TO authenticated WITH CHECK (driver_id = auth.uid());

-- ===== Fix subscription_plans policies =====
DROP POLICY IF EXISTS "Anyone can read active plans" ON public.subscription_plans;
DROP POLICY IF EXISTS "Admins can manage plans" ON public.subscription_plans;

-- Allow anyone to read active plans
CREATE POLICY "Anyone can read plans" ON public.subscription_plans 
  FOR SELECT TO authenticated USING (true);

-- Allow admins to manage plans
CREATE POLICY "Admins can manage plans" ON public.subscription_plans 
  FOR ALL TO authenticated USING (
    EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role IN ('admin', 'owner', 'super_admin'))
  );

-- ===== Fix user_subscriptions policies =====
DROP POLICY IF EXISTS "Users can read own subscription" ON public.user_subscriptions;
DROP POLICY IF EXISTS "Users can insert own subscription" ON public.user_subscriptions;
DROP POLICY IF EXISTS "Admins can manage all subscriptions" ON public.user_subscriptions;

-- Allow authenticated users to read all subscriptions
CREATE POLICY "Anyone can read subscriptions" ON public.user_subscriptions 
  FOR SELECT TO authenticated USING (true);

-- Allow users to insert their own subscription
CREATE POLICY "Users can insert own subscription" ON public.user_subscriptions 
  FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());

-- Allow admins to manage subscriptions
CREATE POLICY "Admins can manage subscriptions" ON public.user_subscriptions 
  FOR ALL TO authenticated USING (
    EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role IN ('admin', 'owner', 'super_admin'))
  );
