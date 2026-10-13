
-- Drop all existing RESTRICTIVE policies and recreate as PERMISSIVE

-- ===== user_roles =====
DROP POLICY IF EXISTS "Admins can manage roles" ON public.user_roles;
DROP POLICY IF EXISTS "Admins can read all roles" ON public.user_roles;
DROP POLICY IF EXISTS "Users can read own roles" ON public.user_roles;

CREATE POLICY "Users can read own roles" ON public.user_roles FOR SELECT TO authenticated USING (user_id = auth.uid());
CREATE POLICY "Users can insert own role" ON public.user_roles FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());
CREATE POLICY "Admins can manage roles" ON public.user_roles FOR ALL TO authenticated USING (has_role(auth.uid(), 'admin'::app_role));

-- ===== profiles =====
DROP POLICY IF EXISTS "Admins can read all profiles" ON public.profiles;
DROP POLICY IF EXISTS "Drivers can read household profiles" ON public.profiles;
DROP POLICY IF EXISTS "Users can insert own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can read own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;

CREATE POLICY "Users can read own profile" ON public.profiles FOR SELECT TO authenticated USING (user_id = auth.uid());
CREATE POLICY "Users can insert own profile" ON public.profiles FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());
CREATE POLICY "Users can update own profile" ON public.profiles FOR UPDATE TO authenticated USING (user_id = auth.uid());
CREATE POLICY "Admins can read all profiles" ON public.profiles FOR SELECT TO authenticated USING (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Drivers can read household profiles" ON public.profiles FOR SELECT TO authenticated USING (has_role(auth.uid(), 'driver'::app_role));

-- ===== trash_status =====
DROP POLICY IF EXISTS "Admins can read all trash" ON public.trash_status;
DROP POLICY IF EXISTS "Drivers can read full trash" ON public.trash_status;
DROP POLICY IF EXISTS "Drivers can update trash status" ON public.trash_status;
DROP POLICY IF EXISTS "Users can insert own trash status" ON public.trash_status;
DROP POLICY IF EXISTS "Users can read own trash status" ON public.trash_status;
DROP POLICY IF EXISTS "Users can update own trash status" ON public.trash_status;

CREATE POLICY "Users can read own trash status" ON public.trash_status FOR SELECT TO authenticated USING (user_id = auth.uid());
CREATE POLICY "Users can insert own trash status" ON public.trash_status FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());
CREATE POLICY "Users can update own trash status" ON public.trash_status FOR UPDATE TO authenticated USING (user_id = auth.uid());
CREATE POLICY "Drivers can read full trash" ON public.trash_status FOR SELECT TO authenticated USING (has_role(auth.uid(), 'driver'::app_role));
CREATE POLICY "Drivers can update trash status" ON public.trash_status FOR UPDATE TO authenticated USING (has_role(auth.uid(), 'driver'::app_role));
CREATE POLICY "Admins can read all trash" ON public.trash_status FOR SELECT TO authenticated USING (has_role(auth.uid(), 'admin'::app_role));

-- ===== pickup_records =====
DROP POLICY IF EXISTS "Admins can read all pickups" ON public.pickup_records;
DROP POLICY IF EXISTS "Drivers can insert pickups" ON public.pickup_records;
DROP POLICY IF EXISTS "Drivers can read own pickups" ON public.pickup_records;
DROP POLICY IF EXISTS "Households can read own pickups" ON public.pickup_records;

CREATE POLICY "Households can read own pickups" ON public.pickup_records FOR SELECT TO authenticated USING (household_id = auth.uid());
CREATE POLICY "Drivers can insert pickups" ON public.pickup_records FOR INSERT TO authenticated WITH CHECK (has_role(auth.uid(), 'driver'::app_role));
CREATE POLICY "Drivers can read own pickups" ON public.pickup_records FOR SELECT TO authenticated USING (driver_id = auth.uid());
CREATE POLICY "Admins can read all pickups" ON public.pickup_records FOR SELECT TO authenticated USING (has_role(auth.uid(), 'admin'::app_role));

-- ===== subscription_plans =====
DROP POLICY IF EXISTS "Admins can manage plans" ON public.subscription_plans;
DROP POLICY IF EXISTS "Anyone authenticated can read active plans" ON public.subscription_plans;

CREATE POLICY "Anyone can read active plans" ON public.subscription_plans FOR SELECT TO authenticated USING (is_active = true);
CREATE POLICY "Admins can manage plans" ON public.subscription_plans FOR ALL TO authenticated USING (has_role(auth.uid(), 'admin'::app_role));

-- ===== user_subscriptions =====
DROP POLICY IF EXISTS "Admins can manage all subscriptions" ON public.user_subscriptions;
DROP POLICY IF EXISTS "Users can insert own subscription" ON public.user_subscriptions;
DROP POLICY IF EXISTS "Users can read own subscription" ON public.user_subscriptions;

CREATE POLICY "Users can read own subscription" ON public.user_subscriptions FOR SELECT TO authenticated USING (user_id = auth.uid());
CREATE POLICY "Users can insert own subscription" ON public.user_subscriptions FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());
CREATE POLICY "Admins can manage all subscriptions" ON public.user_subscriptions FOR ALL TO authenticated USING (has_role(auth.uid(), 'admin'::app_role));

-- ===== company_settings =====
DROP POLICY IF EXISTS "Admins can manage settings" ON public.company_settings;
DROP POLICY IF EXISTS "Anyone authenticated can read settings" ON public.company_settings;

CREATE POLICY "Anyone can read settings" ON public.company_settings FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admins can manage settings" ON public.company_settings FOR ALL TO authenticated USING (has_role(auth.uid(), 'admin'::app_role));

-- ===== Create trigger for handle_new_user if missing =====
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created AFTER INSERT ON auth.users FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ===== Update company name =====
UPDATE public.company_settings SET company_name = 'ImyandaSmart' WHERE id = '68a45f4b-7579-48e7-88fc-ac35c92cdcfe';
