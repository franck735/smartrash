# User Role Management

This document describes the user role system in ImyandaSmart and how to manage roles.

## Roles

The system supports the following roles (in order of priority):

1. **super_admin** - Highest privilege, can manage everything
2. **owner** - Business owners, can manage all users and subscriptions
3. **admin** - Application administrators
4. **driver** - Garbage collection drivers
5. **customer** - Regular customers (default for new users)

## Database Schema

### user_roles table

| Column | Type | Description |
|--------|------|-------------|
| id | UUID | Primary key |
| user_id | UUID | References auth.users(id) |
| role | app_role | The role assigned to the user |

A user can have multiple roles, but typically will have only one.

## Functions

### make_super_admin(email)
Assigns super_admin role to a user.

### make_owner(email)
Assigns owner role to a user.

### make_admin(email)
Assigns admin role to a user.

### make_driver(email)
Assigns driver role to a user.

### make_customer(email)
Assigns customer role to a user (removes other non-admin roles).

### has_role(user_id, role)
SQL function to check if a user has a specific role. Used in RLS policies.

## Auto-Assignment

When a new user signs up:
1. A profile is automatically created
2. A trash_status record is created
3. The user is assigned the 'customer' role by default

## Managing Roles

### Using the CLI script

```
bash
# Make a user a driver
npx tsx scripts/manage-roles.ts john@example.com driver

# Make a user an owner
npx tsx scripts/manage-roles.ts jane@example.com owner

# Make a user an admin
npx tsx scripts/manage-roles.ts admin@example.com admin

# Make a user a super_admin
npx tsx scripts/manage-roles.ts superadmin@example.com super_admin
```

### Using SQL directly

```
sql
-- Make a user a driver
SELECT make_driver('driver@example.com');

-- Make a user an owner
SELECT make_owner('owner@example.com');

-- Make a user an admin
SELECT make_user_admin('admin@example.com');

-- Make a user a super_admin
SELECT make_super_admin('superadmin@example.com');
```

### Using the Supabase Dashboard

1. Go to the Supabase Dashboard
2. Navigate to the SQL Editor
3. Run one of the function calls above

## Viewing User Roles

### Using the SQL view

```
sql
SELECT * FROM user_roles_view;
```

This view shows all users with their email and assigned roles.

## RLS Policies

The following tables have role-based access policies:

- **user_roles** - Users can read own roles, admins/super_admins/owners can manage
- **profiles** - Users can manage own, admins/super_admins/owners can manage all
- **trash_status** - Users can manage own, drivers/admins/super_admins/owners can manage all
- **pickup_records** - Users can read own, drivers/admins/super_admins/owners can manage
- **subscription_plans** - Anyone can read active, admins/super_admins/owners can manage
- **user_subscriptions** - Users can manage own, admins/super_admins/owners can manage all
- **company_settings** - Anyone can read, admins/super_admins/owners can manage

## Migration Files

| File | Description |
|------|-------------|
| 20260227095753_*.sql | Initial schema with user_roles, profiles, subscriptions, trash_status, pickups |
| 20260228_add_super_admin_role.sql | Added super_admin role |
| 20260228_make_admin.sql | Added make_admin function |
| 20260228_assign_default_role.sql | Assigns default customer role to existing users |
| 20260228_complete_role_setup.sql | Complete role setup with all functions and RLS policies |
