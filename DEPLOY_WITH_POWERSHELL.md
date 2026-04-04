# Complete Deployment Guide - PowerShell in VS Code

## 🚀 Deploy Your IGCSE Study Hub to Vercel

This guide will walk you through deploying your project from scratch using PowerShell in VS Code.

---

## Prerequisites Checklist

Before starting, make sure you have:

- [ ] Git installed on your computer
- [ ] A GitHub account
- [ ] A Vercel account (free)
- [ ] Your Supabase credentials ready

---

## Step 1: Install Required Tools

### A. Check if Git is Installed

Open PowerShell in VS Code (Terminal → New Terminal) and run:

```powershell
git --version
```

**If you see a version number:** ✅ Git is installed, skip to Step 2

**If you get an error:** Install Git:
1. Go to https://git-scm.com/download/win
2. Download and install Git for Windows
3. Restart VS Code
4. Run `git --version` again to verify

### B. Check if Node.js is Installed

```powershell
node --version
npm --version
```

**If you see version numbers:** ✅ You're good!

**If you get an error:** Install Node.js:
1. Go to https://nodejs.org/
2. Download LTS version
3. Install it
4. Restart VS Code

---

## Step 2: Initialize Git Repository

In VS Code PowerShell terminal, make sure you're in your project directory:

```powershell
# Check current directory
pwd

# Should show: C:\Users\HP\Desktop\igcse-study-hub
# If not, navigate there:
cd C:\Users\HP\Desktop\igcse-study-hub
```

Now initialize Git:

```powershell
# Initialize git repository
git init

# Check status
git status
```

You should see a list of untracked files.

---

## Step 3: Create .gitignore File

**IMPORTANT:** Make sure `.gitignore` file exists and contains:

```
# dependencies
/node_modules
/.pnp
.pnp.js

# testing
/coverage

# next.js
/.next/
/out/

# production
/build

# misc
.DS_Store
*.pem

# debug
npm-debug.log*
yarn-debug.log*
yarn-error.log*

# local env files
.env
.env*.local

# vercel
.vercel

# typescript
*.tsbuildinfo
next-env.d.ts
```

**To check if .gitignore exists:**

```powershell
Get-Content .gitignore
```

**If it doesn't exist, create it:**

```powershell
New-Item -Path .gitignore -ItemType File
```

Then copy the content above into it.

---

## Step 4: Commit Your Code

```powershell
# Add all files to git
git add .

# Check what will be committed
git status

# Commit with a message
git commit -m "Initial commit - IGCSE Study Hub with all features"
```

**Expected output:** Should show files committed successfully.

---

## Step 5: Create GitHub Repository

### Option A: Using GitHub Website (Recommended)

1. Go to https://github.com
2. Click the **+** icon (top right) → **New repository**
3. Repository name: `igcse-study-hub`
4. Description: `IGCSE Study Hub - Resource sharing platform`
5. Keep it **Public** or **Private** (your choice)
6. **DO NOT** check "Initialize with README"
7. Click **Create repository**

### Option B: Using GitHub CLI (Advanced)

```powershell
# Install GitHub CLI first
winget install --id GitHub.cli

# Login to GitHub
gh auth login

# Create repository
gh repo create igcse-study-hub --public --source=. --remote=origin --push
```

---

## Step 6: Connect Local Repository to GitHub

After creating the repository on GitHub, you'll see commands. Use these in PowerShell:

```powershell
# Add GitHub as remote origin
git remote add origin https://github.com/YOUR_USERNAME/igcse-study-hub.git

# Verify remote was added
git remote -v

# Push code to GitHub
git branch -M main
git push -u origin main
```

**Replace `YOUR_USERNAME` with your actual GitHub username!**

**If you get authentication error:**
- GitHub will prompt you to login
- Or use: `gh auth login` if you have GitHub CLI

---

## Step 7: Deploy to Vercel

### A. Install Vercel CLI

```powershell
npm install -g vercel
```

### B. Login to Vercel

```powershell
vercel login
```

This will:
1. Open your browser
2. Ask you to confirm login
3. Return to terminal when done

### C. Deploy Your Project

```powershell
# Make sure you're in project directory
cd C:\Users\HP\Desktop\igcse-study-hub

# Deploy to Vercel
vercel
```

**You'll be asked several questions:**

1. **Set up and deploy?** → Press `Y` (Yes)
2. **Which scope?** → Select your account (press Enter)
3. **Link to existing project?** → Press `N` (No)
4. **What's your project's name?** → Press Enter (use default) or type `igcse-study-hub`
5. **In which directory is your code located?** → Press Enter (current directory)
6. **Want to override settings?** → Press `N` (No)

Vercel will now:
- Build your project
- Deploy it
- Give you a URL

**Expected output:**
```
✅ Production: https://igcse-study-hub-xxx.vercel.app
```

---

## Step 8: Configure Environment Variables on Vercel

Your app won't work yet because it needs Supabase credentials!

### A. Go to Vercel Dashboard

1. Open the URL Vercel gave you
2. Or go to https://vercel.com/dashboard
3. Click on your project: `igcse-study-hub`

### B. Add Environment Variables

1. Click **Settings** tab
2. Click **Environment Variables** in sidebar
3. Add these variables one by one:

**Variable 1:**
- Name: `NEXT_PUBLIC_SUPABASE_URL`
- Value: Your Supabase URL (from `.env.local`)
- Environment: Check all (Production, Preview, Development)
- Click **Save**

**Variable 2:**
- Name: `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- Value: Your Supabase anon key (from `.env.local`)
- Environment: Check all
- Click **Save**

### C. Get Your Supabase Credentials

If you don't have them handy:

```powershell
# View your .env.local file
Get-Content .env.local
```

Copy the values after `=` signs.

---

## Step 9: Redeploy with Environment Variables

After adding environment variables, redeploy:

```powershell
vercel --prod
```

This will:
- Rebuild with environment variables
- Deploy to production
- Update your live site

---

## Step 10: Update Supabase Redirect URLs

Your app needs to tell Supabase about the new URL!

### A. Go to Supabase Dashboard

1. Go to https://supabase.com/dashboard
2. Select your project
3. Go to **Authentication** → **URL Configuration**

### B. Add Vercel URL to Redirect URLs

In **Redirect URLs**, add:
```
https://your-vercel-url.vercel.app/auth/callback
```

**Replace `your-vercel-url` with your actual Vercel URL!**

Example:
```
https://igcse-study-hub-abc123.vercel.app/auth/callback
```

### C. Update Site URL

Set **Site URL** to:
```
https://your-vercel-url.vercel.app
```

Click **Save**.

---

## Step 11: Test Your Deployed Site

1. Open your Vercel URL in browser
2. Try to sign in with Google
3. Test uploading a resource
4. Test browsing resources
5. Test upvoting

**If something doesn't work:**
- Check Vercel logs: `vercel logs`
- Check browser console (F12)
- Verify environment variables are set correctly

---

## Common PowerShell Commands

### Check Project Status
```powershell
# See current directory
pwd

# List files
ls

# Check git status
git status

# Check Vercel deployments
vercel ls
```

### Update Deployment
```powershell
# After making changes:
git add .
git commit -m "Description of changes"
git push

# Deploy to Vercel
vercel --prod
```

### View Logs
```powershell
# See deployment logs
vercel logs

# See latest deployment
vercel logs --follow
```

### Rollback Deployment
```powershell
# List all deployments
vercel ls

# Rollback to previous
vercel rollback
```

---

## Troubleshooting

### Issue: "git is not recognized"
**Solution:** Install Git and restart VS Code

### Issue: "vercel is not recognized"
**Solution:** 
```powershell
npm install -g vercel
```
Then restart VS Code

### Issue: "Permission denied"
**Solution:** Run PowerShell as Administrator
1. Close VS Code
2. Right-click VS Code icon
3. Select "Run as administrator"

### Issue: Build fails on Vercel
**Solution:**
1. Check Vercel logs: `vercel logs`
2. Verify environment variables are set
3. Check for TypeScript errors locally: `npm run build`

### Issue: Authentication not working
**Solution:**
1. Verify Supabase redirect URLs include your Vercel URL
2. Check environment variables on Vercel
3. Redeploy: `vercel --prod`

---

## Quick Reference Card

```powershell
# Navigate to project
cd C:\Users\HP\Desktop\igcse-study-hub

# Check status
git status

# Commit changes
git add .
git commit -m "Your message"
git push

# Deploy to Vercel
vercel --prod

# View logs
vercel logs

# List deployments
vercel ls
```

---

## Next Steps After Deployment

1. **Custom Domain (Optional)**
   - Go to Vercel Dashboard → Settings → Domains
   - Add your custom domain
   - Follow DNS configuration instructions

2. **Set up Analytics**
   - Vercel provides free analytics
   - Enable in project settings

3. **Configure Email Templates**
   - Follow `EMAIL_CUSTOMIZATION_GUIDE.md`
   - Update Supabase email templates

4. **Monitor Performance**
   - Check Vercel dashboard regularly
   - Monitor error logs
   - Track user activity

---

## Support

If you encounter issues:

1. Check Vercel logs: `vercel logs`
2. Check browser console (F12)
3. Review `TROUBLESHOOTING.md`
4. Check Vercel documentation: https://vercel.com/docs

---

**Made with Bob** 🤖

**Your site is now live! Share it with your classmates! 🎉**