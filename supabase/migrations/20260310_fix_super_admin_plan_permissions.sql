-- Fix: Allow super_admin to manage subscription plans
-- The latest migration dropped the super_admin policy, this restores it

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE policyname = 'Super admins can manage plans' AND tablename = 'subscription_plans'
  ) THEN
    CREATE POLICY "Super admins can manage plans" ON public.subscription_plans
      FOR ALL TO authenticated
      USING (public.has_role(auth.uid(), 'super_admin'))
      WITH CHECK (public.has_role(auth.uid(), 'super_admin'));
  END IF;
END $$;

-- Also fix company_settings to allow super_admin
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE policyname = 'Super admins can manage settings' AND tablename = 'company_settings'
  ) THEN
    CREATE POLICY "Super admins can manage settings" ON public.company_settings
      FOR ALL TO authenticated
      USING (public.has_role(auth.uid(), 'super_admin'))
      WITH CHECK (public.has_role(auth.uid(), 'super_admin'));
  END IF;
END $$;

-- Also fix user_subscriptions to allow super_admin to view and manage
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE policyname = 'Super admins can manage subscriptions' AND tablename = 'user_subscriptions'
  ) THEN
    CREATE POLICY "Super admins can manage subscriptions" ON public.user_subscriptions
      FOR ALL TO authenticated
      USING (public.has_role(auth.uid(), 'super_admin'))
      WITH CHECK (public.has_role(auth.uid(), 'super_admin'));
  END IF;
END $$;

-- Critical: Add DELETE policy for users to cancel their own subscriptions
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE policyname = 'Users can delete own subscription' AND tablename = 'user_subscriptions'
  ) THEN
    CREATE POLICY "Users can delete own subscription" ON public.user_subscriptions
      FOR DELETE TO authenticated
      USING (user_id = auth.uid());
  END IF;
END $$;

-- Also allow users to UPDATE their own subscription (for future edits)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE policyname = 'Users can update own subscription' AND tablename = 'user_subscriptions'
  ) THEN
    CREATE POLICY "Users can update own subscription" ON public.user_subscriptions
      FOR UPDATE TO authenticated
      USING (user_id = auth.uid())
      WITH CHECK (user_id = auth.uid());
  END IF;
END $$;
