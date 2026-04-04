# How to Deploy to Vercel - Step by Step Guide

## Prerequisites
- Make sure you have a Vercel account (https://vercel.com)
- Install Vercel CLI (if not already installed)

## Step 1: Install Vercel CLI (if needed)

Open PowerShell or Command Prompt and run:
```powershell
npm install -g vercel
```

## Step 2: Login to Vercel

```powershell
vercel login
```

This will open your browser to authenticate.

## Step 3: Deploy Your Project

Navigate to your project directory and deploy:

```powershell
cd C:\Users\HP\Desktop\igcse-study-hub
vercel --prod
```

The CLI will ask you a few questions:
1. **Set up and deploy?** → Yes
2. **Which scope?** → Select your account
3. **Link to existing project?** → Yes (if you have one) or No (to create new)
4. **Project name?** → igcse-study-hub (or your preferred name)
5. **Directory?** → ./ (just press Enter)
6. **Override settings?** → No (just press Enter)

## Step 4: Wait for Deployment

Vercel will:
- Upload your files
- Build your project
- Deploy to production
- Give you a URL (e.g., https://igcse-study-hub.vercel.app)

## Alternative: Deploy via Git

If you have your project on GitHub:

1. Go to https://vercel.com/dashboard
2. Click "Add New" → "Project"
3. Import your GitHub repository
4. Vercel will auto-deploy on every push to main branch

## Environment Variables

Make sure to add your environment variables in Vercel:

1. Go to your project in Vercel Dashboard
2. Click "Settings" → "Environment Variables"
3. Add:
   - `NEXT_PUBLIC_SUPABASE_URL` = your Supabase URL
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY` = your Supabase anon key

## After Deployment

Your site will be live at: `https://your-project-name.vercel.app`

---

# Why You Can't See the Recent Resources Carousel

## The Issue

The carousel shows the 6 most recent resources from your database. If you don't see it, it means:

**Your database has NO resources yet!**

## Solution: Add Test Resources

### Option 1: Use the Upload Form

1. Go to http://localhost:3000
2. Sign in
3. Click "Upload Resource"
4. Fill in the form and submit
5. Repeat 5-6 times to create test data

### Option 2: Add Directly to Database

Go to your Supabase SQL Editor and run:

```sql
-- First, make sure you have a profile
INSERT INTO profiles (id, email, username, full_name)
VALUES (
  'your-user-id-here',  -- Get this from auth.users table
  'test@example.com',
  'testuser',
  'Test User'
) ON CONFLICT (id) DO NOTHING;

-- Then add some test resources
INSERT INTO resources (title, subject, resource_type, link, description, uploader_id, upvote_count)
VALUES 
  ('Complete Algebra Notes', '0580', 'notes', 'https://example.com/algebra', 'Comprehensive algebra revision notes', 'your-user-id-here', 5),
  ('Physics Formula Sheet', '0625', 'formula_sheets', 'https://example.com/physics', 'All important physics formulas', 'your-user-id-here', 3),
  ('Chemistry Flashcards', '0620', 'flashcards', 'https://example.com/chem', 'Periodic table flashcards', 'your-user-id-here', 8),
  ('Biology Revision Guide', '0610', 'revision_guides', 'https://example.com/bio', 'Complete biology guide', 'your-user-id-here', 12),
  ('English Sample Essays', '0500', 'sample_answers', 'https://example.com/english', 'Grade A essay examples', 'your-user-id-here', 6),
  ('Economics Notes', '0455', 'notes', 'https://example.com/econ', 'Microeconomics notes', 'your-user-id-here', 4);
```

**Important:** Replace `'your-user-id-here'` with your actual user ID from the `auth.users` table.

### How to Get Your User ID

Run this in Supabase SQL Editor:
```sql
SELECT id, email FROM auth.users;
```

Copy the `id` value and use it in the INSERT statements above.

## After Adding Resources

1. Refresh your homepage (http://localhost:3000)
2. You should now see:
   - Resource count badges on subject cards
   - Recent resources carousel below the subject cards
3. Then deploy to Vercel to see it live!

---

# Quick Checklist

- [ ] Install Vercel CLI: `npm install -g vercel`
- [ ] Login: `vercel login`
- [ ] Add test resources to database (see above)
- [ ] Test locally: http://localhost:3000
- [ ] Deploy: `vercel --prod`
- [ ] Check environment variables in Vercel dashboard
- [ ] Visit your live site!

---

**Need Help?**
- Vercel Docs: https://vercel.com/docs
- Supabase Docs: https://supabase.com/docs