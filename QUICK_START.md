# Trash Pickup Application - Quick Start Guide

## 🚀 Start Development Server

```bash
npm run dev
# Opens at http://localhost:8080
```

---

## 📋 Building the Trash Pickup App - Feature Checklist

### Phase 1: Core User Features (Week 1-2)

#### 1. Household (End User) Dashboard
- [ ] Create `src/pages/HouseholdDashboard.tsx`
- [ ] Display current subscription status
- [ ] Show next pickup date
- [ ] Mark trash as "FULL" button (toggle trash_status)
- [ ] View trash status history
- [ ] Display pickup history from `pickup_records`

#### 2. Trash Status Management
- [ ] Create utility `src/lib/trashStatus.ts` for managing status updates
- [ ] Real-time trash status tracking via Supabase subscriptions
- [ ] Hook: `useTrashStatus()` - get/update trash status
- [ ] Component: `TrashStatusToggle` - UI for marking trash full

#### 3. Subscription Selection Flow
- [ ] Create `src/pages/SubscriptionPlans.tsx`
- [ ] Fetch available plans from `subscription_plans` table
- [ ] Allow users to select and subscribe
- [ ] Insert into `user_subscriptions` table
- [ ] Payment status indicator

---

### Phase 2: Driver Features (Week 2-3)

#### 1. Driver Dashboard
- [ ] Create `src/pages/DriverDashboard.tsx`
- [ ] Query all households with `trash_status = 'full'`
- [ ] Display map with full trash locations
- [ ] List view of pickups needed (from `trash_status` where status = 'full')

#### 2. Route Optimization
- [ ] Create `src/lib/routeOptimization.ts`
- [ ] Algorithm: Cluster "full" trash locations
- [ ] Calculate optimal pickup order
- [ ] Generate suggested route for driver
- [ ] Display on map (use Leaflet or Google Maps with Capacitor plugin)

#### 3. Pickup Execution
- [ ] Component: `PickupItem` - individual trash pickup card
- [ ] "Arrive at location" button - confirm arrival
- [ ] "Pickup Complete" button - mark as picked_up
- [ ] Create `pickup_records` entry automatically
- [ ] Take photo (optional but recommended)
- [ ] Auto-calculate and record 500 RWF fee

---

### Phase 3: Admin Dashboard (Week 3-4)

#### 1. Admin Dashboard
- [ ] Create `src/pages/AdminDashboard.tsx`
- [ ] User management (view all users by role)
- [ ] Revenue dashboard showing:
  - Total pickups
  - Total fees collected (pickup_records count × 500 RWF)
  - Driver performance
  - Subscription status

#### 2. Subscription Plan Management
- [ ] CRUD for `subscription_plans`
- [ ] Create, edit, delete plans
- [ ] Set frequency (daily, thrice_weekly, twice_weekly, weekly)
- [ ] Set price in RWF

#### 3. Company Settings
- [ ] Update `company_settings`
- [ ] MoMo merchant code management
- [ ] Company name
- [ ] Other configuration

---

## 🛠 Implementation Patterns

### Get Household's Trash Status
```typescript
// src/hooks/useHouseholdTrash.ts
import { supabase } from '@/integrations/supabase/client';
import { useQuery, useMutation } from '@tanstack/react-query';

export function useHouseholdTrash(userId: string) {
  return useQuery({
    queryKey: ['trash_status', userId],
    queryFn: async () => {
      const { data } = await supabase
        .from('trash_status')
        .select('*')
        .eq('user_id', userId)
        .single();
      return data;
    }
  });
}

export function useUpdateTrashStatus() {
  return useMutation({
    mutationFn: async (data: { status: string; userId: string }) => {
      const { error } = await supabase
        .from('trash_status')
        .update({ status: data.status, updated_at: new Date() })
        .eq('user_id', data.userId);
      if (error) throw error;
    }
  });
}
```

### Get Full Trash Locations for Driver
```typescript
// For route planning
const { data: fullTrash } = await supabase
  .from('trash_status')
  .select(`
    id,
    user_id,
    status,
    marked_full_at,
    profiles (
      latitude,
      longitude,
      address,
      phone
    )
  `)
  .eq('status', 'full');
```

### Record Pickup
```typescript
// After driver completes pickup
await supabase
  .from('pickup_records')
  .insert({
    household_id: householdId,
    driver_id: driverId,
    trash_status_id: trashStatusId,
    fee_rwf: 500,
    picked_up_at: new Date()
  });

// Update trash status
await supabase
  .from('trash_status')
  .update({
    status: 'picked_up',
    picked_up_at: new Date(),
    picked_up_by: driverId
  })
  .eq('id', trashStatusId);
```

---

## 📊 Database Queries for Key Metrics

### Total Revenue (for admin)
```sql
SELECT SUM(fee_rwf) as total_revenue FROM pickup_records;
```

### Pickups by Driver
```sql
SELECT driver_id, COUNT(*) as pickup_count 
FROM pickup_records 
GROUP BY driver_id;
```

### Active Subscribers
```sql
SELECT COUNT(*) as active_subscribers 
FROM user_subscriptions 
WHERE is_paid = true AND end_date > CURRENT_DATE;
```

### Pending Pickups
```sql
SELECT COUNT(*) as pending_pickups 
FROM trash_status 
WHERE status = 'full';
```

---

## 🎨 UI Components to Use (Already Installed)

- `Button` - Actions
- `Card` - Data containers
- `Badge` - Status indicators (Full/Empty/Picked Up)
- `Dialog` - Modals for confirmations
- `Tabs` - Household/Driver/Admin views
- `Table` - List of pickups/users
- `Toast` - Notifications
- `Map` - Route visualization (add Leaflet)
- `Charts` - Analytics (already have `recharts`)

---

## 🗺 Map Integration (Recommended)

For route visualization, add:
```bash
npm install leaflet react-leaflet lucide-react
npm install -D @types/leaflet
```

Then use in driver route view:
```typescript
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';

// Display full trash locations
// Show optimized route path
// Show driver current location
```

---

## 💳 Payment Integration (Future)

The database has `momo_merchant_code` in `company_settings` ready for:
1. MTN MoMo integration
2. User payment for subscriptions
3. Track `is_paid` status in `user_subscriptions`

---

## 🧪 Testing

Sample test file: [src/test/example.test.ts](src/test/example.test.ts)

Run tests:
```bash
npm run test          # Run once
npm run test:watch   # Watch mode
```

---

## 📱 Mobile Build (When Ready)

```bash
npm run build              # Build web first
npm run native:android     # Open in Android Studio
npm run native:ios         # Open in Xcode
```

---

## 🚀 Deployment Ready

Your app can be deployed to:
- **Web**: Vercel, Netlify, GitHub Pages (static files in `dist/`)
- **Mobile**: Google Play Store (Android), Apple App Store (iOS)
- **Backend**: Already hosted with Supabase

---

## ✅ Current Status

- ✅ Database: Fully configured
- ✅ Authentication: Setup ready
- ✅ UI Components: All installed
- ✅ Build Tools: Vite, TypeScript, Tailwind
- ⏳ Features: Ready to implement

**Start with**: Building the Household Dashboard - it's the core value proposition!
