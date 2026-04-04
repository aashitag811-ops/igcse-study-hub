# ⚠️ URGENT: Get Login Working - Setup Checklist

## Why Login Isn't Working

Your `.env.local` file has a placeholder instead of the real Supabase API key. This is causing the "Invalid API key" error.

---

## ✅ Quick Fix (5 Minutes)

### Step 1: Get Your Supabase Anon Key

1. **Go to Supabase Dashboard:**
   - Open: https://supabase.com/dashboard
   - Sign in if needed

2. **Select Your Project:**
   - Click on your project: **IGCSE Study Hub**
   - (The one at `https://tqwnbuamhcqhzxexmdft.supabase.co`)

3. **Get the API Key:**
   - Click **"Settings"** (gear icon) in the left sidebar
   - Click **"API"** in the settings menu
   - You'll see two keys:
     - ✅ **anon public** - This is what you need!
     - ❌ **service_role** - Don't use this one
   - Copy the **anon public** key (it's a long string starting with `eyJ...`)

### Step 2: Update Your .env.local File

1. **Open `.env.local` file** in your project root
2. **Replace the placeholder** with your actual key:

**Current (NOT WORKING):**
```env
NEXT_PUBLIC_SUPABASE_URL=https://tqwnbuamhcqhzxexmdft.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key_here
```

**Fixed (WILL WORK):**
```env
NEXT_PUBLIC_SUPABASE_URL=https://tqwnbuamhcqhzxexmdft.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.YOUR_ACTUAL_KEY_HERE
```

3. **Save the file**

### Step 3: Restart Your Dev Server

1. **Stop the server:**
   - Go to your terminal
   - Press `Ctrl+C`

2. **Start it again:**
   ```bash
   npm run dev
   ```

3. **Wait for it to start** (should say "Ready" or show localhost:3000)

### Step 4: Test Login

1. **Open your browser:**
   - Go to: http://localhost:3000/login

2. **Try signing up:**
   - Click "Sign Up" tab
   - Enter an email and password
   - Click "Sign Up"

3. **It should work now!** ✅
   - You'll see "Account created!" message
   - Check your email for verification (if enabled)
   - You can now log in!

---

## 🔍 How to Verify It's Working

### Check 1: No Error Messages
- ❌ Before: "Invalid API key" error
- ✅ After: No errors, smooth signup/login

### Check 2: See Users in Supabase
1. Go to Supabase Dashboard
2. Click **Authentication** → **Users**
3. You should see your new user account!

### Check 3: Profile Created
1. In Supabase, click **Table Editor**
2. Click **profiles** table
3. You should see your profile!

---

## 🆘 Still Not Working?

### Problem 1: Still Getting "Invalid API key"

**Possible Causes:**
- ❌ Copied the wrong key (service_role instead of anon public)
- ❌ Extra spaces in the `.env.local` file
- ❌ Didn't restart the dev server
- ❌ File is named wrong (should be `.env.local` not `.env.local.txt`)

**Solution:**
1. Double-check you copied the **anon public** key
2. Make sure there are no spaces before or after the key
3. Restart dev server: `Ctrl+C` then `npm run dev`
4. Check file name is exactly `.env.local`

### Problem 2: "Failed to fetch" or Network Error

**Possible Causes:**
- ❌ Supabase URL is wrong
- ❌ Internet connection issue
- ❌ Supabase project is paused

**Solution:**
1. Check the URL is: `https://tqwnbuamhcqhzxexmdft.supabase.co`
2. Check your internet connection
3. Go to Supabase Dashboard and make sure project is active

### Problem 3: Can Sign Up But Can't Log In

**Possible Causes:**
- ❌ Email confirmation required
- ❌ Wrong password

**Solution:**
1. Check your email for confirmation link
2. Click the link to verify your email
3. Try logging in again
4. Or disable email confirmation in Supabase:
   - Go to Authentication → Providers → Email
   - Toggle off "Confirm email"

---

## 📋 Complete Setup Checklist

Before testing, make sure:

- [ ] Supabase project is created
- [ ] Database tables are created (run SQL from `SUPABASE_SETUP.md`)
- [ ] Got the **anon public** key from Supabase
- [ ] Updated `.env.local` with the real key
- [ ] Saved the `.env.local` file
- [ ] Restarted dev server (`Ctrl+C` then `npm run dev`)
- [ ] Opened http://localhost:3000/login
- [ ] Tried signing up with email/password

---

## 🎯 What You Need to Do RIGHT NOW

### Priority 1: Fix the API Key (REQUIRED - 5 minutes)

1. ✅ Go to Supabase Dashboard → Settings → API
2. ✅ Copy the **anon public** key
3. ✅ Open `.env.local` file
4. ✅ Replace `your_anon_key_here` with the real key
5. ✅ Save file
6. ✅ Restart dev server
7. ✅ Test login - IT WILL WORK! 🎉

### Priority 2: Set Up Database (If Not Done - 5 minutes)

If you haven't run the database setup SQL:

1. ✅ Go to Supabase Dashboard → SQL Editor
2. ✅ Click "New Query"
3. ✅ Open `SUPABASE_SETUP.md` file
4. ✅ Copy all the SQL code
5. ✅ Paste into Supabase SQL Editor
6. ✅ Click "Run"
7. ✅ Should see "Success. No rows returned"

### Priority 3: Enable Google OAuth (OPTIONAL - 15 minutes)

Only do this if you want Google sign-in:

1. ✅ Follow `GOOGLE_OAUTH_SETUP.md`
2. ✅ Set up Google Cloud Console
3. ✅ Configure Supabase
4. ✅ Test Google sign-in

---

## 💡 Quick Visual Guide

```
Current State (NOT WORKING):
.env.local file:
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key_here  ❌

↓ GET THE REAL KEY FROM SUPABASE ↓

Fixed State (WORKING):
.env.local file:
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRxd25idWFtaGNxaHp4ZXhtZGZ0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE2OTg3NTQ4MDAsImV4cCI6MjAxNDMzMDgwMH0.YOUR_ACTUAL_KEY  ✅

↓ RESTART DEV SERVER ↓

Login Works! 🎉
```

---

## 🚀 After Setup

Once login works, you can:
- ✅ Sign up new users
- ✅ Log in existing users
- ✅ Upload resources
- ✅ Browse resources
- ✅ Upvote resources
- ✅ Edit profile
- ✅ Delete own resources
- ✅ View uploaded and upvoted resources

**Everything will work perfectly once you add the real API key!**

---

## 📞 Need Help?

If you're still stuck:

1. **Check the error message** in browser console (F12 → Console tab)
2. **Read the error** - it usually tells you what's wrong
3. **Double-check** you followed all steps above
4. **Try again** - sometimes it just needs a fresh restart

**The most common issue is forgetting to restart the dev server after updating `.env.local`!**

---

**DO THIS NOW:** Get your Supabase anon key and update `.env.local` - it takes 5 minutes and fixes everything! 🚀