
-- Fix all RLS policies to be PERMISSIVE (currently all are RESTRICTIVE)

-- company_settings
DROP POLICY IF EXISTS "Anyone can read settings" ON public.company_settings;
DROP POLICY IF EXISTS "Admins can manage settings" ON public.company_settings;
CREATE POLICY "Anyone can read settings" ON public.company_settings FOR SELECT USING (true);
CREATE POLICY "Admins can manage settings" ON public.company_settings FOR ALL USING (public.has_role(auth.uid(), 'admin'::app_role));

-- pickup_records
DROP POLICY IF EXISTS "Households can read own pickups" ON public.pickup_records;
DROP POLICY IF EXISTS "Drivers can insert pickups" ON public.pickup_records;
DROP POLICY IF EXISTS "Drivers can read own pickups" ON public.pickup_records;
DROP POLICY IF EXISTS "Admins can read all pickups" ON public.pickup_records;
CREATE POLICY "Households can read own pickups" ON public.pickup_records FOR SELECT USING (household_id = auth.uid());
CREATE POLICY "Drivers can insert pickups" ON public.pickup_records FOR INSERT WITH CHECK (public.has_role(auth.uid(), 'driver'::app_role));
CREATE POLICY "Drivers can read own pickups" ON public.pickup_records FOR SELECT USING (driver_id = auth.uid());
CREATE POLICY "Admins can read all pickups" ON public.pickup_records FOR SELECT USING (public.has_role(auth.uid(), 'admin'::app_role));

-- profiles
DROP POLICY IF EXISTS "Users can read own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can insert own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
DROP POLICY IF EXISTS "Admins can read all profiles" ON public.profiles;
DROP POLICY IF EXISTS "Drivers can read household profiles" ON public.profiles;
CREATE POLICY "Users can read own profile" ON public.profiles FOR SELECT USING (user_id = auth.uid());
CREATE POLICY "Users can insert own profile" ON public.profiles FOR INSERT WITH CHECK (user_id = auth.uid());
CREATE POLICY "Users can update own profile" ON public.profiles FOR UPDATE USING (user_id = auth.uid());
CREATE POLICY "Admins can read all profiles" ON public.profiles FOR SELECT USING (public.has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Drivers can read household profiles" ON public.profiles FOR SELECT USING (public.has_role(auth.uid(), 'driver'::app_role));

-- subscription_plans
DROP POLICY IF EXISTS "Anyone can read active plans" ON public.subscription_plans;
DROP POLICY IF EXISTS "Admins can manage plans" ON public.subscription_plans;
CREATE POLICY "Anyone can read active plans" ON public.subscription_plans FOR SELECT USING (is_active = true);
CREATE POLICY "Admins can manage plans" ON public.subscription_plans FOR ALL USING (public.has_role(auth.uid(), 'admin'::app_role));

-- trash_status
DROP POLICY IF EXISTS "Users can read own trash status" ON public.trash_status;
DROP POLICY IF EXISTS "Users can insert own trash status" ON public.trash_status;
DROP POLICY IF EXISTS "Users can update own trash status" ON public.trash_status;
DROP POLICY IF EXISTS "Drivers can read full trash" ON public.trash_status;
DROP POLICY IF EXISTS "Drivers can update trash status" ON public.trash_status;
DROP POLICY IF EXISTS "Admins can read all trash" ON public.trash_status;
CREATE POLICY "Users can read own trash status" ON public.trash_status FOR SELECT USING (user_id = auth.uid());
CREATE POLICY "Users can insert own trash status" ON public.trash_status FOR INSERT WITH CHECK (user_id = auth.uid());
CREATE POLICY "Users can update own trash status" ON public.trash_status FOR UPDATE USING (user_id = auth.uid());
CREATE POLICY "Drivers can read full trash" ON public.trash_status FOR SELECT USING (public.has_role(auth.uid(), 'driver'::app_role));
CREATE POLICY "Drivers can update trash status" ON public.trash_status FOR UPDATE USING (public.has_role(auth.uid(), 'driver'::app_role));
CREATE POLICY "Admins can read all trash" ON public.trash_status FOR SELECT USING (public.has_role(auth.uid(), 'admin'::app_role));

-- user_roles
DROP POLICY IF EXISTS "Users can read own roles" ON public.user_roles;
DROP POLICY IF EXISTS "Users can insert own role" ON public.user_roles;
DROP POLICY IF EXISTS "Admins can manage roles" ON public.user_roles;
CREATE POLICY "Users can read own roles" ON public.user_roles FOR SELECT USING (user_id = auth.uid());
CREATE POLICY "Users can insert own role" ON public.user_roles FOR INSERT WITH CHECK (user_id = auth.uid());
CREATE POLICY "Admins can manage roles" ON public.user_roles FOR ALL USING (public.has_role(auth.uid(), 'admin'::app_role));

-- user_subscriptions
DROP POLICY IF EXISTS "Users can read own subscription" ON public.user_subscriptions;
DROP POLICY IF EXISTS "Users can insert own subscription" ON public.user_subscriptions;
DROP POLICY IF EXISTS "Admins can manage all subscriptions" ON public.user_subscriptions;
CREATE POLICY "Users can read own subscription" ON public.user_subscriptions FOR SELECT USING (user_id = auth.uid());
CREATE POLICY "Users can insert own subscription" ON public.user_subscriptions FOR INSERT WITH CHECK (user_id = auth.uid());
CREATE POLICY "Admins can manage all subscriptions" ON public.user_subscriptions FOR ALL USING (public.has_role(auth.uid(), 'admin'::app_role));

-- Seed initial company settings if none exist
INSERT INTO public.company_settings (company_name, momo_merchant_code)
SELECT 'ImyandaSmart', '*182*8*1*00000#'
WHERE NOT EXISTS (SELECT 1 FROM public.company_settings);
