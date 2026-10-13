# ImyandaSmart

ImyandaSmart is a React + Supabase application with Capacitor support for native Android and iOS builds.

## Roles Ready in the App

- `customer`: Marks trash as full, subscribes to plans, sees pickup/payment status.
- `driver`: Sees pending pickups and marks them completed.
- `admin` (company admin): Manages plans, subscriptions, fees, and company settings.
- `owner`: Full admin capabilities plus role assignment across all users.

Legacy `household` users are supported and treated as `customer` in the UI.

## Prerequisites

- Node.js 20+
- npm 10+
- Supabase project configured with:
  - `VITE_SUPABASE_URL`
  - `VITE_SUPABASE_PUBLISHABLE_KEY`
- Android Studio (for Android)
- Xcode on macOS (for iOS)

## Web Setup

```bash
npm install
npm run dev
```

## Database Migration

Apply Supabase migrations, including:

- `20260227095753_257ae872-1a3f-4c53-a336-9be8c7d24b00.sql`
- `20260228113000_add_customer_owner_roles.sql`

The second migration adds `customer` and `owner` roles and owner-level access policies.

## Capacitor Setup

Capacitor is configured with:

- `appId`: `com.imyandasmart.app`
- `appName`: `ImyandaSmart`
- `webDir`: `dist`

### First-time platform add

```bash
npx cap add android
npx cap add ios
```

### Build and sync

```bash
npm run build:native
```

This syncs Android by default. For iOS (macOS with CocoaPods):

```bash
npm run build:native:ios
```

### Open native projects

```bash
npm run cap:open:android
npm run cap:open:ios
```

## Native Auth Redirect

Email auth redirect for native builds uses:

- `imyandasmart://auth/callback`

Ensure this scheme is configured in the native projects after running `npx cap add ...`.

## Useful Scripts

- `npm run dev`
- `npm run build`
- `npm run build:native`
- `npm run build:native:ios`
- `npm run cap:sync`
- `npm run cap:sync:android`
- `npm run cap:sync:ios`
- `npm run native:android`
- `npm run native:ios`
- `npm run lint`
- `npm run test`
