# 🚀 Complete Deployment Guide

## Prerequisites

- ✅ Supabase project set up (see SUPABASE_SETUP.md)
- ✅ GitHub account
- ✅ Vercel account (free tier is fine)

## Step-by-Step Deployment

### 1. Prepare Your Code

Make sure all changes are committed:

```bash
cd c:/Users/HP/Desktop/igcse-study-hub
git add .
git commit -m "Ready for deployment"
```

### 2. Push to GitHub

If you haven't already:

```bash
# Initialize git (if not done)
git init

# Add remote repository
git remote add origin https://github.com/YOUR_USERNAME/igcse-study-hub.git

# Push to GitHub
git branch -M main
git push -u origin main
```

### 3. Deploy to Vercel

#### Option A: Using Vercel Dashboard (Recommended)

1. Go to [vercel.com](https://vercel.com)
2. Click "Add New" → "Project"
3. Import your GitHub repository
4. Configure project:
   - **Framework Preset**: Next.js
   - **Root Directory**: `./` (leave as is)
   - **Build Command**: `npm run build`
   - **Output Directory**: `.next`

5. Add Environment Variables:
   ```
   NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
   NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
   ```

6. Click "Deploy"
7. Wait 2-3 minutes for deployment to complete

#### Option B: Using Vercel CLI

```bash
# Install Vercel CLI
npm i -g vercel

# Login to Vercel
vercel login

# Deploy
vercel

# Follow prompts and add environment variables when asked
```

### 4. Configure Supabase for Production

1. Go to your Supabase project
2. Navigate to **Authentication** → **URL Configuration**
3. Add your Vercel URL to:
   - **Site URL**: `https://your-app.vercel.app`
   - **Redirect URLs**: `https://your-app.vercel.app/**`

### 5. Test Your Deployment

Visit your deployed URL and test:
- ✅ Homepage loads
- ✅ Can sign up
- ✅ Can log in
- ✅ Can upload resources
- ✅ Can view resources by subject
- ✅ Can upvote resources

### 6. Share Your Link!

Your app is now live at: `https://your-app.vercel.app`

Share this link with anyone - they can:
- Browse resources
- Sign up for an account
- Upload their own resources
- Upvote helpful content

## Automatic Deployments

Every time you push to GitHub, Vercel will automatically:
1. Build your app
2. Run tests
3. Deploy if successful
4. Give you a preview URL

## Custom Domain (Optional)

1. In Vercel dashboard, go to your project
2. Click "Settings" → "Domains"
3. Add your custom domain
4. Follow DNS configuration instructions

## Monitoring

### View Logs
- Vercel Dashboard → Your Project → "Logs"
- See real-time errors and requests

### Analytics
- Vercel Dashboard → Your Project → "Analytics"
- Track visitors, page views, performance

## Troubleshooting

### Build Fails
- Check build logs in Vercel dashboard
- Ensure all dependencies are in package.json
- Verify environment variables are set

### Authentication Not Working
- Check Supabase redirect URLs
- Verify environment variables in Vercel
- Check browser console for errors

### Database Errors
- Verify Supabase connection
- Check Row Level Security policies
- Review SQL logs in Supabase

## Updating Your App

```bash
# Make changes locally
# Test with: npm run dev

# Commit and push
git add .
git commit -m "Your update message"
git push

# Vercel automatically deploys!
```

## Performance Tips

1. **Enable Caching**: Vercel automatically caches static assets
2. **Image Optimization**: Use Next.js Image component
3. **Database Indexes**: Already set up in SQL schema
4. **Edge Functions**: Consider for frequently accessed data

## Security Checklist

- ✅ Environment variables not in code
- ✅ Row Level Security enabled
- ✅ HTTPS enforced (automatic with Vercel)
- ✅ API keys kept secret
- ✅ User input validated

## Cost Estimate

### Free Tier Limits
- **Vercel**: 100GB bandwidth, unlimited deployments
- **Supabase**: 500MB database, 2GB bandwidth, 50,000 monthly active users

This is more than enough for starting out!

## Support

If you encounter issues:
1. Check Vercel deployment logs
2. Review Supabase logs
3. Check browser console
4. Review this guide

## Next Steps

- Add more features
- Customize design
- Add analytics
- Promote your site!

---

**Congratulations! Your IGCSE Study Hub is now live! 🎉**