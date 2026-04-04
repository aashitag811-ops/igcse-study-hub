# 🔐 Google OAuth Setup - Complete Guide

## Current Issue
Google sign-in button is not working. This is because Google OAuth needs to be configured in both Google Cloud Console and Supabase.

---

## ✅ Step-by-Step Setup

### Part 1: Google Cloud Console Setup

#### 1. Create/Select a Google Cloud Project

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Sign in with your Google account
3. Click on the project dropdown at the top
4. Click **"New Project"**
5. Name it: `IGCSE Study Hub`
6. Click **"Create"**
7. Wait for the project to be created (takes ~30 seconds)

#### 2. Enable Google+ API (Required for OAuth)

1. In the left sidebar, click **"APIs & Services"** → **"Library"**
2. Search for: `Google+ API`
3. Click on it
4. Click **"Enable"**
5. Wait for it to enable

#### 3. Configure OAuth Consent Screen

1. Go to **"APIs & Services"** → **"OAuth consent screen"**
2. Select **"External"** (unless you have a Google Workspace)
3. Click **"Create"**

**Fill in the form:**
- **App name:** `IGCSE Study Hub`
- **User support email:** Your email
- **App logo:** (optional, skip for now)
- **App domain:** (leave blank for now)
- **Authorized domains:** (leave blank for now)
- **Developer contact information:** Your email
- Click **"Save and Continue"**

**Scopes:**
- Click **"Add or Remove Scopes"**
- Select these scopes:
  - `userinfo.email`
  - `userinfo.profile`
  - `openid`
- Click **"Update"**
- Click **"Save and Continue"**

**Test users:**
- Click **"Add Users"**
- Add your email address (and any other test users)
- Click **"Save and Continue"**
- Click **"Back to Dashboard"**

#### 4. Create OAuth 2.0 Credentials

1. Go to **"APIs & Services"** → **"Credentials"**
2. Click **"Create Credentials"** → **"OAuth 2.0 Client ID"**
3. If prompted to configure consent screen, you already did this in step 3

**Configure the OAuth client:**
- **Application type:** `Web application`
- **Name:** `IGCSE Study Hub Web Client`

**Authorized JavaScript origins:**
- Click **"Add URI"**
- Add: `http://localhost:3000`
- Click **"Add URI"** again
- Add: `https://tqwnbuamhcqhzxexmdft.supabase.co`

**Authorized redirect URIs:**
- Click **"Add URI"**
- Add: `http://localhost:3000/auth/callback`
- Click **"Add URI"** again
- Add: `https://tqwnbuamhcqhzxexmdft.supabase.co/auth/v1/callback`

4. Click **"Create"**

#### 5. Copy Your Credentials

A popup will appear with:
- **Client ID** (looks like: `123456789-abc123.apps.googleusercontent.com`)
- **Client Secret** (looks like: `GOCSPX-abc123xyz`)

**IMPORTANT:** Copy both of these! You'll need them in the next step.

---

### Part 2: Supabase Configuration

#### 1. Enable Google Provider

1. Go to your [Supabase Dashboard](https://supabase.com/dashboard)
2. Select your project: **IGCSE Study Hub**
3. In the left sidebar, click **"Authentication"**
4. Click **"Providers"**
5. Find **"Google"** in the list
6. Toggle it **ON** (enable it)

#### 2. Add Google Credentials

In the Google provider settings:
- **Client ID:** Paste the Client ID from Google Cloud Console
- **Client Secret:** Paste the Client Secret from Google Cloud Console
- Click **"Save"**

#### 3. Configure Redirect URLs

1. Still in Supabase, go to **"Authentication"** → **"URL Configuration"**
2. Set **Site URL:**
   - For local development: `http://localhost:3000`
   - For production: `https://igcse-study-hub-red.vercel.app`
3. Add **Redirect URLs:**
   - `http://localhost:3000/**`
   - `https://igcse-study-hub-red.vercel.app/**`
   - `https://tqwnbuamhcqhzxexmdft.supabase.co/auth/v1/callback`
4. Click **"Save"**

---

### Part 3: Test Google OAuth

#### 1. Restart Your Dev Server

```bash
# Stop the server (Ctrl+C)
# Start it again
npm run dev
```

#### 2. Test the Flow

1. Go to http://localhost:3000/login
2. Click **"Continue with Google"**
3. You should be redirected to Google's sign-in page
4. Select your Google account
5. Grant permissions
6. You should be redirected back to your app and logged in!

---

## 🐛 Troubleshooting

### Error: "redirect_uri_mismatch"

**Problem:** The redirect URI doesn't match what's configured in Google Cloud Console.

**Solution:**
1. Go back to Google Cloud Console → Credentials
2. Click on your OAuth 2.0 Client ID
3. Make sure these URIs are added:
   - `http://localhost:3000/auth/callback`
   - `https://tqwnbuamhcqhzxexmdft.supabase.co/auth/v1/callback`
4. Save and try again

### Error: "Access blocked: This app's request is invalid"

**Problem:** OAuth consent screen not properly configured.

**Solution:**
1. Go to Google Cloud Console → OAuth consent screen
2. Make sure you added your email as a test user
3. Make sure the app status is "Testing" (not "In production")
4. Try again

### Google button does nothing

**Problem:** Supabase credentials not configured or incorrect.

**Solution:**
1. Check your `.env.local` file has the correct Supabase URL and anon key
2. Restart your dev server
3. Check browser console for errors (F12 → Console tab)
4. Make sure Google provider is enabled in Supabase

### Error: "Invalid API key"

**Problem:** Supabase anon key is missing or incorrect.

**Solution:**
1. Go to Supabase Dashboard → Settings → API
2. Copy the **anon public** key
3. Update `.env.local`:
   ```env
   NEXT_PUBLIC_SUPABASE_ANON_KEY=your_actual_key_here
   ```
4. Restart dev server

### Still not working?

**Check these:**
- [ ] Google+ API is enabled in Google Cloud Console
- [ ] OAuth consent screen is configured
- [ ] OAuth 2.0 Client ID is created with correct redirect URIs
- [ ] Google provider is enabled in Supabase
- [ ] Client ID and Secret are correctly pasted in Supabase
- [ ] `.env.local` has correct Supabase credentials
- [ ] Dev server was restarted after changes
- [ ] You're added as a test user in Google Cloud Console

---

## 📝 Quick Checklist

Before testing, make sure:

- [ ] Google Cloud project created
- [ ] Google+ API enabled
- [ ] OAuth consent screen configured
- [ ] OAuth 2.0 Client ID created
- [ ] Redirect URIs added in Google Cloud Console
- [ ] Client ID and Secret copied
- [ ] Google provider enabled in Supabase
- [ ] Client ID and Secret pasted in Supabase
- [ ] Redirect URLs configured in Supabase
- [ ] `.env.local` has correct Supabase credentials
- [ ] Dev server restarted

---

## 🎯 Expected Behavior

When everything is set up correctly:

1. User clicks "Continue with Google"
2. Redirected to Google sign-in page
3. User selects Google account
4. User grants permissions
5. Redirected back to app at `/auth/callback`
6. Callback handler processes the authentication
7. User is redirected to homepage, logged in
8. Profile is automatically created in database

---

## 🚀 For Production (Vercel)

When deploying to Vercel:

1. Add environment variables in Vercel:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`

2. Update Google Cloud Console redirect URIs:
   - Add: `https://your-app.vercel.app/auth/callback`

3. Update Supabase redirect URLs:
   - Add: `https://your-app.vercel.app/**`

4. Update Supabase Site URL:
   - Set to: `https://your-app.vercel.app`

---

**Need more help?** Check the browser console (F12) for specific error messages and search for them in the Supabase documentation.