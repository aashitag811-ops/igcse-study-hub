# ⚡ Quick Start Guide

Get your IGCSE Study Hub running in 15 minutes!

## 🎯 What You'll Get

- ✅ Fully functional website
- ✅ User authentication (signup/login)
- ✅ Resource upload and browsing
- ✅ Real-time counters from database
- ✅ Deployed and shareable link

## 📋 Prerequisites

- Node.js 18+ installed
- A Supabase account (free)
- A Vercel account (free)
- 15 minutes of your time

## 🚀 Step 1: Set Up Supabase (5 minutes)

### 1.1 Create Project
1. Go to [supabase.com](https://supabase.com) and sign up
2. Click "New Project"
3. Name it "IGCSE Study Hub"
4. Choose a password and region
5. Click "Create new project"
6. Wait 2-3 minutes

### 1.2 Run Database Setup
1. In Supabase, go to **SQL Editor**
2. Click "New Query"
3. Open `SUPABASE_SETUP.md` in this project
4. Copy the entire SQL code (starting from `CREATE EXTENSION...`)
5. Paste into Supabase SQL Editor
6. Click "Run" ▶️
7. You should see "Success. No rows returned"

### 1.3 Get Your Credentials
1. Go to **Settings** → **API**
2. Copy:
   - **Project URL** (e.g., `https://xxxxx.supabase.co`)
   - **anon public** key (long string starting with `eyJ...`)

## 🔧 Step 2: Configure Your App (2 minutes)

### 2.1 Create Environment File
1. In your project root (`igcse-study-hub` folder)
2. Create a file named `.env.local`
3. Add these lines (replace with your actual values):

```env
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key_here
```

### 2.2 Install Dependencies
```bash
cd c:/Users/HP/Desktop/igcse-study-hub
npm install
```

## 🧪 Step 3: Test Locally (3 minutes)

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000)

Test:
- ✅ Page loads
- ✅ Counters show "0"
- ✅ Click "Sign Up" (we'll add this page next)

Press `Ctrl+C` to stop the server.

## 🌐 Step 4: Deploy to Vercel (5 minutes)

### 4.1 Push to GitHub
```bash
# If you haven't initialized git yet:
git init
git add .
git commit -m "Initial commit"

# Create a new repository on GitHub, then:
git remote add origin https://github.com/YOUR_USERNAME/igcse-study-hub.git
git branch -M main
git push -u origin main
```

### 4.2 Deploy on Vercel
1. Go to [vercel.com](https://vercel.com) and sign up
2. Click "Add New" → "Project"
3. Import your GitHub repository
4. Click "Deploy" (don't change any settings yet)
5. Wait for deployment to fail (it will - we need env variables)

### 4.3 Add Environment Variables
1. In Vercel, go to your project
2. Click "Settings" → "Environment Variables"
3. Add both variables:
   - `NEXT_PUBLIC_SUPABASE_URL` = your Supabase URL
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY` = your Supabase key
4. Click "Redeploy" from the Deployments tab

### 4.4 Configure Supabase
1. Back in Supabase, go to **Authentication** → **URL Configuration**
2. Add your Vercel URL:
   - **Site URL**: `https://your-app.vercel.app`
   - **Redirect URLs**: `https://your-app.vercel.app/**`

## 🎉 Step 5: You're Live!

Your app is now deployed at: `https://your-app-name.vercel.app`

Share this link with anyone!

## 🔍 What's Working Now

- ✅ Homepage with hero section
- ✅ Subject cards (showing 0 resources initially)
- ✅ Database connection
- ✅ Ready for authentication
- ✅ Ready for resource uploads

## 📝 Next Steps

Now that your foundation is ready, you need to:

1. **Add Authentication Pages** - I'll create these for you
2. **Add Resource Upload** - I'll create this too
3. **Add Subject Pages** - I'll create these as well
4. **Test Everything** - Make sure it all works

## 🆘 Troubleshooting

### "Invalid API key"
- Check your `.env.local` file
- Restart dev server: `Ctrl+C` then `npm run dev`

### "Failed to fetch"
- Check Supabase URL is correct
- Verify you ran the SQL setup

### Deployment fails
- Check environment variables in Vercel
- Review build logs

## 💡 Tips

- Every push to GitHub auto-deploys to Vercel
- Check Vercel logs if something breaks
- Supabase has a free tier (plenty for starting)
- You can add a custom domain later

## ✅ Checklist

- [ ] Supabase project created
- [ ] SQL schema executed
- [ ] `.env.local` file created
- [ ] App runs locally (`npm run dev`)
- [ ] Code pushed to GitHub
- [ ] Deployed to Vercel
- [ ] Environment variables added to Vercel
- [ ] Supabase redirect URLs configured
- [ ] Deployment successful

---

**Ready for the next phase? Let me know and I'll build the authentication and resource pages!**