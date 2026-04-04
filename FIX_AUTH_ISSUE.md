# 🔧 Fix Authentication Issue

## Problem
Your `.env.local` file has a placeholder value instead of the actual Supabase anon key, which is causing the "Invalid API key" error.

## Solution

### Step 1: Get Your Supabase Credentials

1. Go to your Supabase dashboard: https://supabase.com/dashboard
2. Select your project: **IGCSE Study Hub** (or the project at `https://tqwnbuamhcqhzxexmdft.supabase.co`)
3. Click on **Settings** (gear icon in the left sidebar)
4. Click on **API** in the settings menu
5. You'll see two important values:
   - **Project URL**: `https://tqwnbuamhcqhzxexmdft.supabase.co` (you already have this)
   - **anon public key**: A long string starting with `eyJ...` (you need this!)

### Step 2: Update Your `.env.local` File

Replace the contents of your `.env.local` file with:

```env
NEXT_PUBLIC_SUPABASE_URL=https://tqwnbuamhcqhzxexmdft.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.YOUR_ACTUAL_KEY_HERE
```

**Important:** Replace `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.YOUR_ACTUAL_KEY_HERE` with the actual anon public key from your Supabase dashboard.

### Step 3: Restart Your Development Server

After updating the `.env.local` file:

1. Stop the current dev server (press `Ctrl+C` in the terminal)
2. Start it again:
   ```bash
   npm run dev
   ```

### Step 4: Test Authentication

1. Go to http://localhost:3000/login
2. Try signing up with a new account
3. You should now be able to create an account successfully!

---

## Google OAuth Setup (Optional)

If you want Google sign-in to work, follow these additional steps:

### 1. Get Google OAuth Credentials

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select existing one
3. Enable Google+ API
4. Go to **Credentials** → **Create Credentials** → **OAuth 2.0 Client ID**
5. Configure consent screen if prompted
6. For **Application type**, select **Web application**
7. Add authorized redirect URIs:
   - `https://tqwnbuamhcqhzxexmdft.supabase.co/auth/v1/callback`
   - `http://localhost:3000/auth/callback` (for local testing)
8. Copy the **Client ID** and **Client Secret**

### 2. Configure in Supabase

1. Go to your Supabase dashboard
2. Navigate to **Authentication** → **Providers**
3. Find **Google** and enable it
4. Paste your Google **Client ID** and **Client Secret**
5. Click **Save**

### 3. Update Site URL in Supabase

1. In Supabase, go to **Authentication** → **URL Configuration**
2. Set **Site URL** to: `http://localhost:3000` (for local) or your Vercel URL (for production)
3. Add **Redirect URLs**:
   - `http://localhost:3000/**`
   - `https://your-app.vercel.app/**`

---

## Troubleshooting

### Still getting "Invalid API key"?
- Make sure you copied the **anon public** key, not the service_role key
- Check for extra spaces or line breaks in the `.env.local` file
- Ensure the file is named exactly `.env.local` (not `.env.local.txt`)
- Restart your dev server after making changes

### Can't find the anon key?
- It's in Supabase Dashboard → Settings → API → Project API keys → anon public

### Email signup not working?
- Check if email provider is enabled in Supabase: Authentication → Providers → Email
- Make sure you ran the database setup SQL from `SUPABASE_SETUP.md`

---

## Quick Test

After fixing the `.env.local` file, test with these steps:

1. ✅ Homepage loads without errors
2. ✅ Click "Sign In" → "Sign Up"
3. ✅ Enter email and password
4. ✅ Click "Sign Up"
5. ✅ Check your email for confirmation link (if email confirmation is enabled)
6. ✅ You should be logged in!

---

**Need help?** Check the `SUPABASE_SETUP.md` file for more detailed setup instructions.