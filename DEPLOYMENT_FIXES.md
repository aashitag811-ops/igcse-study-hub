# Deployment Fixes Required

## Issues Identified

### 1. **Browse & Upload Pages Showing "Coming Soon" Alerts**
**Problem:** The deployed version on Vercel (igcse-study-hub-red.vercel.app) is showing old code with alert popups.

**Solution:** 
- The local code is correct and fully functional
- You need to **redeploy to Vercel** to see the changes
- Run: `vercel --prod` or push to your connected Git repository

### 2. **Display Name Showing Email Instead of Full Name**
**Problem:** Resources show "by aashitag811" (username) instead of the user's full name.

**Root Cause:** The user's profile in the database doesn't have a `full_name` set.

**Solution:**
1. Check your Supabase database `profiles` table
2. Make sure the `full_name` column has values
3. When users sign up, ensure the profile is created with their full name
4. Update existing profiles:
```sql
UPDATE profiles 
SET full_name = 'Your Full Name' 
WHERE email = 'your@email.com';
```

### 3. **Heart Icon Not Blue When Upvoted**
**Status:** ✅ FIXED in local code

**Changes Made:**
- Changed background from `#2563EB` to `#60A5FA` (light blue)
- Applied to browse page, subject pages
- Will be visible after redeployment

### 4. **Recent Resources Carousel**
**Status:** ✅ ADDED in local code

**Features:**
- Shows 6 most recent resources
- Displays 3 at a time
- Left/right arrow navigation
- Only shows if there are resources in the database
- Will be visible after redeployment

### 5. **Resource Count on Subject Cards**
**Status:** ✅ ADDED in local code

**Features:**
- Badge in top-right corner of each subject card
- Shows number of resources for that subject
- Only displays if count > 0
- Will be visible after redeployment

## How to Deploy Changes

### Option 1: Using Vercel CLI
```bash
cd c:\Users\HP\Desktop\igcse-study-hub
vercel --prod
```

### Option 2: Using Git (if connected to Vercel)
```bash
git add .
git commit -m "Fix upvote system, add carousel, and resource counts"
git push origin main
```

### Option 3: Using Vercel Dashboard
1. Go to https://vercel.com/dashboard
2. Find your project
3. Click "Redeploy" on the latest deployment

## Database Setup Required

### Ensure Profiles Have Full Names

When users sign up, make sure to create/update their profile:

```typescript
// After user signs up
const { data: { user } } = await supabase.auth.signUp({
  email,
  password,
  options: {
    data: {
      full_name: fullName // Get this from signup form
    }
  }
});

// Then create profile
await supabase.from('profiles').insert({
  id: user.id,
  email: user.email,
  username: username,
  full_name: fullName // Important!
});
```

### Update Existing Profiles

Run this in Supabase SQL Editor:
```sql
-- Check current profiles
SELECT id, email, username, full_name FROM profiles;

-- Update profiles without full_name
UPDATE profiles 
SET full_name = 'User Full Name'
WHERE full_name IS NULL OR full_name = '';
```

## Testing Locally

Your local development server should already show all the fixes:
1. Open http://localhost:3000
2. You should see:
   - Resource counts on subject cards (top-right badge)
   - Recent resources carousel below subject cards
   - Heart icons (♥) instead of arrows
   - Light blue hearts when upvoted
   - Full names instead of usernames (if profiles have full_name set)

## Summary of Changes

✅ **Completed:**
- Heart icon (♥) for upvotes
- Light blue color when upvoted (#60A5FA)
- Recent resources carousel (6 items, 3 visible)
- Resource count badges on subject cards
- Display name prioritizes full_name over username
- Upvote limit (one per person) with Math.max(0) to prevent negatives

🔄 **Requires:**
- Redeploy to Vercel to see changes on production
- Update database profiles with full_name values

---

**Last Updated:** April 3, 2026
**Status:** Ready for Deployment