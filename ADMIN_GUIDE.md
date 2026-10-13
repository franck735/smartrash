# Admin Guide: Managing Subscription Plans & MoMo Payment Code

## Overview
The admin dashboard provides complete control over subscription plans and payment settings. This guide walks you through each feature.

---

## 1. SET MOMO MERCHANT CODE (Critical First Step)

### Location: Admin Dashboard → Settings Tab

**Steps:**
1. Go to Admin Dashboard
2. Click on **Settings** tab
3. Scroll to "Company Settings" section
4. Find "MoMo Merchant Code" field
5. Enter your MoMo merchant code (e.g., `250875321000`)
6. Click **Save Settings**

**What it does:**
- This code is displayed to customers during payment
- Customers will send money to this code via their Mobile Money app
- Without this, customers can't see where to pay!

**Example MoMo Code:**
- MTN: `*182*8*1*XXXXX#` (USSD format)
- Or: `250875321000` (Phone number format)

**Note:** When customer clicks "I've Completed Payment", they will have sent money to this exact code.

---

## 2. CREATE SUBSCRIPTION PLANS

### Location: Admin Dashboard → Plans Tab

### Adding a New Plan

**Steps:**
1. Go to Admin Dashboard
2. Click on **Plans** tab
3. Click **+ Add Plan** button (top right)
4. Fill in the form:
   - **Name**: Plan name (e.g., "Basic Weekly", "Premium Twice Weekly")
   - **Frequency**: How often pickups happen
     - Daily
     - 3x per week
     - 2x per week  
     - Weekly
   - **Price (RWF)**: Monthly price in Rwandan Francs (e.g., 2000, 5000, 10000)
   - **Description**: Optional details (e.g., "Best for small households")
5. Click **Create Plan**

### Example Plans:

**Plan 1: Starter**
- Name: Starter - Weekly
- Frequency: Weekly
- Price: 2,000 RWF
- Description: Single pickup per week

**Plan 2: Standard**
- Name: Standard - Bi-Weekly
- Frequency: 2x per week
- Price: 4,000 RWF
- Description: Twice weekly pickups

**Plan 3: Premium**
- Name: Premium - 3x Weekly
- Frequency: 3x per week
- Price: 6,000 RWF
- Description: Three pickups per week

### Viewing Plans

All created plans appear as cards below the "Add Plan" button, showing:
- Plan name
- Frequency
- Price per month
- Status badge (Active/Inactive)

---

## 3. MANAGE CUSTOMER SUBSCRIPTIONS

### Location: Admin Dashboard → Customers Tab

### Viewing Subscriptions

The Customers tab shows a table of all subscribers with:
- **Name**: Customer full name
- **Plan**: Plan name and monthly price
- **Status**: Paid ✓ or Unpaid ⚠️
- **Action**: Toggle payment status button

### Confirming Payments

**Scenario:** Customer claims they paid via MoMo but system shows "Unpaid"

**Steps:**
1. Go to **Customers** tab
2. Find the customer in the table
3. Look at their Status column
4. If Status = "Unpaid", click **Mark Paid**
5. Confirmation: Row updates to show "Paid" status

**Scenario:** Need to mark customer as unpaid (e.g., chargeback)

**Steps:**
1. Find customer in Customers tab
2. If Status = "Paid", click **Mark Unpaid**
3. Status updates immediately

---

## 4. COMPLETE WORKFLOW EXAMPLE

### Step 1: Setup (One-time)
```
1. Admin Dashboard → Settings
2. Enter MoMo Code: 250875321000
3. Click Save Settings
✓ Customers can now see payment code
```

### Step 2: Create Plans 
```
1. Admin Dashboard → Plans
2. Click + Add Plan
3. Create "Basic Weekly" plan - 2000 RWF
4. Create "Standard Biweekly" plan - 4000 RWF
✓ Customers can now select plans
```

### Step 3: Customer Subscribes
```
Customer action:
1. Go to Customer Dashboard
2. Select plan → "Subscribe to Basic Weekly"
3. Sees payment instructions with code: 250875321000
4. Sends 2000 RWF via MoMo to 250875321000
5. Confirms payment in app

Admin sees:
→ New subscriber in Customers tab
→ Status shows "Unpaid"
```

### Step 4: Confirm Payment
```
Admin Action:
1. Go to Customers tab
2. Find customer name
3. See Status = "Unpaid"
4. Click "Mark Paid"

Customer experience:
→ Can now request pickups
→ "My Trash is Full" button is enabled
```

---

## Dashboard Tabs Explained

### 📊 Stats Cards (Top of Dashboard)
- **Subscribers**: Total number of paying customers
- **Pending Pickups**: Trash marked as "full" waiting for driver
- **Total Pickups**: All pickups completed
- **Service Fees**: Total revenue (500 RWF per pickup)

### 📋 Plans Tab
- View all subscription plans
- Create new plans
- See which plans are active/inactive

### 👥 Customers Tab  
- View all subscribers
- See subscription details (name, plan, cost)
- Toggle payment status

### 💰 Service Fees Tab
- Track all pickup fees collected
- See dates and amounts
- View total revenue

### ⚙️ Settings Tab
- Set company name
- Set MoMo merchant code
- Save changes

### 🛡️ Team Tab (Admin/Owner only)
- Manage admin and driver team members
- Assign roles (Admin, Driver, Customer)
- Register new team members by email

---

## Important Notes

### ✓ Best Practices

1. **Set MoMo code BEFORE customers buy plans**
   - Customers need it to pay
   - Update anytime if code changes

2. **Create at least 2-3 plans**
   - Gives customers options
   - Caters to different household sizes

3. **Review payment status regularly**
   - Check Customers tab weekly
   - Mark payments when received
   - System doesn't auto-verify (manual for now)

4. **Keep MoMo code current**
   - If account number changes, update immediately
   - All customers use the same code

### ⚠️ Common Issues

**Problem: Customers can't see MoMo code**
- Solution: Check Settings tab - is MoMo code filled in?
- Solution: Click Save Settings after entering code

**Problem: Customers can't enable "My Trash is Full" button**
- Solution: Check Customers tab - is is_paid status = "Paid"?
- Solution: Click "Mark Paid" if payment received

**Problem: Plan won't create**
- Solution: Check all fields are filled (Name, Frequency, Price)
- Solution: Price must be a number (no letters)

**Problem: Can't see subscriber in Customers tab**
- Solution: Page might need refresh
- Solution: Check if they actually subscribed (not just browsed)

---

## Quick Reference

### MoMo Code Setting Path:
**Admin Dashboard** → **Settings** → **MoMo Merchant Code** → **Save Settings**

### Create Plan Path:
**Admin Dashboard** → **Plans** → **+ Add Plan** → Fill form → **Create Plan**

### Confirm Payment Path:
**Admin Dashboard** → **Customers** → Find name → **Mark Paid**

---

## Permissions

### Who can manage plans?
✓ Super Admin
✓ Owner  
✓ Sub Admin

### Who can manage settings?
✓ Super Admin
✓ Owner
✓ Sub Admin

### Who can see customer list?
✓ Super Admin
✓ Owner
✓ Sub Admin

---

## Payment Flow (For Reference)

```
Customer Journey:
1. No subscription → Browse plans
2. Selects plan → is_paid=false created
3. Sees MoMo code
4. Makes payment externally
5. Clicks "I've Completed Payment"
6. Admin confirms in Customers tab
7. is_paid=true
8. Can request pickups

Admin Confirmation:
Admin Dashboard → Customers tab → "Mark Paid"
```

---

## Troubleshooting Checklist

Before customer can request pickups, check:
- [ ] Customer has active subscription (created in Customers tab)
- [ ] Subscription is_paid = "Paid" (not "Unpaid")
- [ ] Subscription end_date hasn't expired
- [ ] MoMo code is set in Settings

If "My Trash is Full" button is disabled:
- [ ] Does customer have subscription? (No = must subscribe)
- [ ] Is subscription paid? (No = mark as paid after payment)
- [ ] Is subscription active? (Check calendar icon - not expired)

---

## Support

For technical issues:
1. Check this guide above
2. Review the database
3. Check browser console for errors
4. Verify all required fields are filled

For payment verification:
1. Ask customer to screenshot MoMo confirmation
2. Verify the amount matches subscription price
3. Check MoMo merchant code is correct
4. Update is_paid status once confirmed
