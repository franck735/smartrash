# Trash Pickup Application - Architecture & Data Flow

## System Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                          USERS                                  │
├──────────────────┬──────────────────────────┬───────────────────┤
│   HOUSEHOLD      │        DRIVER            │      ADMIN        │
│   (End User)     │   (Pickup Operator)      │  (Management)     │
└──────────────────┴──────────────────────────┴───────────────────┘
          ↓                    ↓                        ↓
┌─────────────────────────────────────────────────────────────────┐
│             REACT FRONTEND - 3 DASHBOARDS                       │
│                                                                  │
│  ┌─────────────┐  ┌─────────────┐  ┌──────────────┐            │
│  │ Household   │  │   Driver    │  │    Admin     │            │
│  │ Dashboard   │  │  Dashboard  │  │  Dashboard   │            │
│  └─────────────┘  └─────────────┘  └──────────────┘            │
└─────────────────────────────────────────────────────────────────┘
                          ↓ / ↑
                   (React Router)
                          ↓ / ↑
┌─────────────────────────────────────────────────────────────────┐
│      SUPABASE (Database + Authentication)                       │
│                                                                  │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │  Authentication (Auth.users)                             │   │
│  │  - Login/Register                                        │   │
│  │  - Session Management                                    │   │
│  └──────────────────────────────────────────────────────────┘   │
│                          ↓                                       │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │  Database Tables                                         │   │
│  │  ├─ user_roles (Admin/Driver/Household)                 │   │
│  │  ├─ profiles (User info + coordinates)                  │   │
│  │  ├─ subscription_plans (Service plans)                  │   │
│  │  ├─ user_subscriptions (Active subscriptions)           │   │
│  │  ├─ trash_status (Real-time trash state)                │   │
│  │  ├─ pickup_records (Service fee tracking)               │   │
│  │  └─ company_settings (Business config)                  │   │
│  └──────────────────────────────────────────────────────────┘   │
│                          ↓                                       │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │  Row-Level Security (RLS)                                │   │
│  │  - Users only see their own data                         │   │
│  │  - Drivers see only full trash                           │   │
│  │  - Admins see all data                                   │   │
│  └──────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────┘
```

---

## Data Flow: Trash Pickup Workflow

### 1. Household User: Marks Trash as Full

```
User opens app
    ↓
[Household Dashboard]
    ↓
User clicks "Trash is FULL" button
    ↓
Updates: trash_status.status = 'full'
Updates: trash_status.marked_full_at = NOW()
    ↓
Notification sent to drivers
    ↓
[Household sees "Pickup Requested" badge]
```

### 2. Driver: Views Full Trash Locations

```
Driver opens app
    ↓
[Driver Dashboard]
    ↓
Query: SELECT * FROM trash_status WHERE status = 'full'
Join: with profiles (get addresses, coordinates)
    ↓
[Show map with all full trash locations + address list]
    ↓
Route Optimization Algorithm
    ├─ Cluster nearby full trash
    ├─ Calculate optimal pickup order
    └─ Show on map
    ↓
Driver selects pickup to start
```

### 3. Driver: Completes Pickup

```
Driver arrives at household
    ↓
[Tap "Confirm Arrival"]
    ↓
[User confirms trash pickup]
    ↓
Driver taps "Pickup Complete"
    ↓
Creates pickup_records entry:
{
  household_id: UUID,
  driver_id: UUID,
  trash_status_id: UUID,
  fee_rwf: 500,         ← SERVICE FEE (charged to trash company)
  picked_up_at: NOW()
}
    ↓
Updates trash_status:
{
  status: 'picked_up',
  picked_up_at: NOW(),
  picked_up_by: driver_id
}
    ↓
[Household notification: "Trash picked up!"]
    ↓
[Driver earnings updated: +500 RWF]
```

### 4. Admin: Tracks Revenue

```
Admin Dashboard
    ↓
Query pickup_records (all time)
    ↓
Total Revenue = COUNT(pickup_records) × 500 RWF
    ↓
Display:
├─ Total pickups
├─ Total revenue
├─ Driver performance
├─ Active subscriptions
└─ Pending pickups
```

---

## Database Schema Relationships

```
auth.users
    ├─ 1 → N [user_roles]
    ├─ 1 → 1 [profiles]
    ├─ 1 → N [user_subscriptions] → subscription_plans
    ├─ 1 → N [trash_status]
    ├─ 1 → N [pickup_records] (as household_id)
    └─ 1 → N [pickup_records] (as driver_id)

subscription_plans
    ← N [user_subscriptions]

trash_status
    └─ 1 → N [pickup_records]

company_settings
    (global configuration)
```

---

## User Roles & Permissions

### HOUSEHOLD Role
```
Can:
├─ View own profile
├─ View/update own trash status
├─ View own subscription
├─ View own pickup history
└─ View own payments

Cannot:
├─ See other households' data
└─ Access driver/admin features
```

### DRIVER Role
```
Can:
├─ View own profile
├─ View all "full" trash locations
├─ Update trash status to "picked_up"
├─ Create pickup_records
├─ View own pickups
└─ View own earnings (from fees)

Cannot:
├─ See other household details (except full trash addresses)
└─ Access admin features
```

### ADMIN Role
```
Can:
├─ View/manage all users
├─ Create/edit subscription plans
├─ View all trash status
├─ View all pickup records & revenue
├─ Manage company settings
└─ Access analytics & reports

Cannot:
├─ (Can do everything - use carefully!)
```

---

## Key Features to Implement

### Feature 1: Real-time Trash Status Updates
```typescript
// Household marks trash as full
supabase
  .from('trash_status')
  .on('UPDATE', (payload) => {
    // Notify drivers in real-time
    // Update list of pickups needed
  })
  .subscribe();
```

### Feature 2: Automated Subscription Billing
- Check subscriptions where `end_date < TODAY`
- Charge for next month
- Renew: `start_date = TODAY`, `end_date = TODAY + 30 days`
- Update `is_paid` status

### Feature 3: Driver Route Optimization
```typescript
// Algorithm:
const clusters = groupByProximity(fullTrashLocations, 1kmRadius);
const optimizedRoute = clusters.map(cluster => 
  calculateShorestPath(cluster)
);
```

### Feature 4: Revenue Tracking
```sql
-- Each pickup = 500 RWF fee
-- Admin sees total from pickup_records
SELECT 
  DATE(picked_up_at) as date,
  COUNT(*) as pickups,
  COUNT(*) * 500 as revenue_rwf
FROM pickup_records
GROUP BY DATE(picked_up_at)
```

---

## API Endpoints (Supabase Functions - Optional to Add)

```typescript
// POST /functions/v1/calculate-route
// Input: [locations with coordinates]
// Output: optimized route with order

// POST /functions/v1/process-subscription
// Input: user_id
// Output: charge subscription, send receipt

// POST /functions/v1/generate-report
// Input: date_range
// Output: revenue, pickups, driver stats

// POST /functions/v1/notify-drivers
// Input: [driver_ids, full_trash_locations]
// Output: push notification
```

---

## Security Considerations

✅ Already Implemented:
- Row-Level Security (RLS) on all tables
- Auth-based access control
- User isolation (households can't see other households)
- Driver isolation (drivers can't see non-full trash)

⏳ To Implement:
- Rate limiting on API calls
- Validate coordinates are reasonable (Rwanda bounds)
- Verify driver location before marking pickup as complete
- Encrypt payment/MoMo data
- Audit logging for admin actions

---

## Scalability Considerations

Current Setup:
- Supabase handles up to 100K queries/day comfortably
- Real-time subscriptions for live updates
- PostgreSQL for complex queries

For 10K+ households, consider:
- Add database indexing on `trash_status`, `pickup_records`
- Implement caching for subscription plans
- Use Supabase edge functions for real-time route calculations
- Geospatial indexing for location queries

---

## Technology Stack Summary

| Layer | Technology | Status |
|-------|-----------|--------|
| Frontend | React 18 + TypeScript | ✅ Ready |
| Styling | Tailwind CSS | ✅ Ready |
| UI Components | shadcn UI | ✅ Ready |
| State Management | React Query + Hooks | ✅ Ready |
| Database | Supabase (PostgreSQL) | ✅ Ready |
| Authentication | Supabase Auth | ✅ Ready |
| Mobile | Capacitor | ⚙️ Partial |
| Maps | Leaflet (to add) | ⏳ Optional |
| Build Tool | Vite | ✅ Ready |
| Testing | Vitest | ✅ Ready |

---

## Next Steps

1. **Week 1**: Build Household Dashboard (core feature)
2. **Week 2**: Implement Driver Dashboard + Route Optimization
3. **Week 3**: Build Admin Dashboard + Revenue Tracking
4. **Week 4**: Testing, Optimization, Deployment
5. **Week 5+**: Mobile builds + additional features

Your environment is ready. All infrastructure is in place. Time to code! 🚀
