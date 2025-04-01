-- Enable Row Level Security (RLS) on users table
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;

-- Create policies for the users table

-- 1. Allow admins to do anything with all rows
CREATE POLICY "Admins can do anything with users"
  ON public.users
  FOR ALL
  USING (auth.jwt() ->> 'role' = 'admin'::text);

-- 2. Allow users to view other active users
CREATE POLICY "Users can view active users"
  ON public.users
  FOR SELECT
  USING (accountStatus = 'active');

-- 3. Allow users to see and update their own data
CREATE POLICY "Users can see and update their own data"
  ON public.users
  FOR ALL
  USING (auth.uid() = "userID");

-- 4. Create a database function to check if the user is active
CREATE OR REPLACE FUNCTION public.is_active_user()
RETURNS BOOLEAN AS $$
DECLARE
  is_active BOOLEAN;
BEGIN
  SELECT (accountStatus = 'active') INTO is_active
  FROM public.users
  WHERE "userID" = auth.uid();
  
  RETURN COALESCE(is_active, FALSE); -- Default to FALSE if not found
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 5. Create a database trigger to enforce accountStatus on login
CREATE OR REPLACE FUNCTION public.enforce_account_status()
RETURNS TRIGGER AS $$
BEGIN
  -- If the account status is being set to inactive or suspended
  IF NEW.accountStatus IN ('inactive', 'suspended') AND OLD.accountStatus = 'active' THEN
    -- You could add additional logic here if needed
    -- For example, logging the status change
    NEW.modified_at = NOW();
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER enforce_account_status
  BEFORE UPDATE ON public.users
  FOR EACH ROW
  EXECUTE FUNCTION public.enforce_account_status();

-- 6. Create a function to check if a user has admin privileges
CREATE OR REPLACE FUNCTION public.is_admin_user()
RETURNS BOOLEAN AS $$
DECLARE
  is_admin BOOLEAN;
BEGIN
  SELECT (role = 'admin') INTO is_admin
  FROM public.users
  WHERE "userID" = auth.uid();
  
  RETURN COALESCE(is_admin, FALSE); -- Default to FALSE if not found
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 7. Default policies for other tables
-- For each table that should respect user status, add a policy like:

-- Example for products table:
-- CREATE POLICY "Only active users can insert/update products"
--   ON public.products
--   FOR INSERT
--   WITH CHECK (public.is_active_user());

-- CREATE POLICY "Only active users can update their own products"
--   ON public.products
--   FOR UPDATE
--   USING ("userID" = auth.uid() AND public.is_active_user());

-- 8. Add a policy for admin access to all tables
-- This is a generic example - adapt for your specific tables
-- CREATE POLICY "Admins can do anything"
--   ON public.table_name
--   FOR ALL
--   USING (public.is_admin_user()); 