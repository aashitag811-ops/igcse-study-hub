# How to Get Your Supabase Credentials

Quick guide to find your Supabase URL and Anon Key.

## Method 1: From .env.local File (Easiest)

### Step 1: Open .env.local

In your project root, open the `.env.local` file.

### Step 2: Copy the Values

You'll see something like:

```env
NEXT_PUBLIC_SUPABASE_URL=https://tqwnbuamhcqhzxexmdft.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

**Copy these exact values!**

### Important:
- ✅ URL should end with `.supabase.co` (NOT `.com/dashboard`)
- ✅ Key is a long string starting with `eyJ`
- ❌ Don't use the dashboard URL

## Method 2: From Supabase Dashboard

### Step 1: Go to Supabase Dashboard

https://supabase.com/dashboard

### Step 2: Select Your Project

Click on your project: `igcse-study-hub`

### Step 3: Go to Settings

Click the gear icon (⚙️) at the bottom left

### Step 4: Go to API

In the left sidebar, click "API"

### Step 5: Copy Credentials

You'll see:

**Project URL:**
```
https://tqwnbuamhcqhzxexmdft.supabase.co
```

**anon public key:**
```
eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRxd25idWFtaGNxaHp4ZXhtZGZ0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE2ODk1MjQ4MDAsImV4cCI6MjAwNTEwMDgwMH0...
```

Copy both of these!

## Example of Correct vs Wrong URL

### ✅ Correct (API URL):
```
https://tqwnbuamhcqhzxexmdft.supabase.co
```

### ❌ Wrong (Dashboard URL):
```
https://supabase.com/dashboard/project/tqwnbuamhcqhzxexmdft
```

## Visual Guide

```
Supabase Dashboard
├── Projects
│   └── igcse-study-hub (click here)
│       ├── Table Editor
│       ├── Storage
│       └── Settings ⚙️ (click here)
│           └── API (click here)
│               ├── Project URL ← Copy this!
│               └── anon public ← Copy this!
```

## Quick Test

Your URL should look like:
```
https://[PROJECT-ID].supabase.co
```

Where `[PROJECT-ID]` is a random string like `tqwnbuamhcqhzxexmdft`

## Common Mistakes

❌ Using dashboard URL: `https://supabase.com/dashboard/...`
✅ Use API URL: `https://[project-id].supabase.co`

❌ Using service_role key (secret!)
✅ Use anon public key (safe to use)

❌ Adding `/storage/v1` to the URL
✅ Just use the base URL

## Once You Have Them:

Run the script again:
```powershell
python convert-from-supabase-simple.py
```

And paste:
1. **URL:** `https://tqwnbuamhcqhzxexmdft.supabase.co`
2. **Key:** `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...`

That's it! 🎯