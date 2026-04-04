# Supabase Setup Guide

## Step 1: Create Supabase Project

1. Go to [supabase.com](https://supabase.com)
2. Sign up or log in
3. Click "New Project"
4. Fill in:
   - **Name**: IGCSE Study Hub
   - **Database Password**: (create a strong password)
   - **Region**: Choose closest to you
5. Click "Create new project"
6. Wait for project to be ready (2-3 minutes)

## Step 2: Get API Credentials

1. In your Supabase project dashboard, go to **Settings** → **API**
2. Copy these values:
   - **Project URL** (looks like: `https://xxxxx.supabase.co`)
   - **anon public** key (long string starting with `eyJ...`)

## Step 3: Set Environment Variables

1. In your project root, create `.env.local` file:
   ```bash
   NEXT_PUBLIC_SUPABASE_URL=your_project_url_here
   NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key_here
   ```

2. Replace the values with your actual credentials

## Step 4: Run Database Migrations

1. In Supabase dashboard, go to **SQL Editor**
2. Click "New Query"
3. Copy and paste the SQL below
4. Click "Run" to execute

```sql
-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create profiles table
CREATE TABLE profiles (
  id UUID REFERENCES auth.users(id) PRIMARY KEY,
  email TEXT UNIQUE NOT NULL,
  username TEXT UNIQUE NOT NULL,
  full_name TEXT,
  avatar_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create resources table
CREATE TABLE resources (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  title TEXT NOT NULL,
  subject TEXT NOT NULL,
  resource_type TEXT NOT NULL,
  link TEXT NOT NULL,
  description TEXT,
  uploader_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  upvote_count INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create votes table
CREATE TABLE votes (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  resource_id UUID REFERENCES resources(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(resource_id, user_id)
);

-- Create indexes for better performance
CREATE INDEX idx_resources_subject ON resources(subject);
CREATE INDEX idx_resources_uploader ON resources(uploader_id);
CREATE INDEX idx_resources_created ON resources(created_at DESC);
CREATE INDEX idx_votes_resource ON votes(resource_id);
CREATE INDEX idx_votes_user ON votes(user_id);

-- Enable Row Level Security
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE resources ENABLE ROW LEVEL SECURITY;
ALTER TABLE votes ENABLE ROW LEVEL SECURITY;

-- Profiles policies
CREATE POLICY "Public profiles are viewable by everyone"
  ON profiles FOR SELECT
  USING (true);

CREATE POLICY "Users can update own profile"
  ON profiles FOR UPDATE
  USING (auth.uid() = id);

-- Resources policies
CREATE POLICY "Resources are viewable by everyone"
  ON resources FOR SELECT
  USING (true);

CREATE POLICY "Authenticated users can create resources"
  ON resources FOR INSERT
  WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Users can update own resources"
  ON resources FOR UPDATE
  USING (auth.uid() = uploader_id);

CREATE POLICY "Users can delete own resources"
  ON resources FOR DELETE
  USING (auth.uid() = uploader_id);

-- Votes policies
CREATE POLICY "Votes are viewable by everyone"
  ON votes FOR SELECT
  USING (true);

CREATE POLICY "Authenticated users can vote"
  ON votes FOR INSERT
  WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Users can delete own votes"
  ON votes FOR DELETE
  USING (auth.uid() = user_id);

-- Function to create profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, email, username, full_name)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'username', SPLIT_PART(NEW.email, '@', 1)),
    COALESCE(NEW.raw_user_meta_data->>'full_name', '')
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to create profile on signup
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Function to update resource upvote count
CREATE OR REPLACE FUNCTION update_resource_upvote_count()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE resources
    SET upvote_count = upvote_count + 1
    WHERE id = NEW.resource_id;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE resources
    SET upvote_count = upvote_count - 1
    WHERE id = OLD.resource_id;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- Trigger to update upvote count
CREATE TRIGGER update_upvote_count
  AFTER INSERT OR DELETE ON votes
  FOR EACH ROW EXECUTE FUNCTION update_resource_upvote_count();

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Triggers for updated_at
CREATE TRIGGER update_profiles_updated_at
  BEFORE UPDATE ON profiles
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_resources_updated_at
  BEFORE UPDATE ON resources
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
```

## Step 5: Configure Authentication

1. In Supabase dashboard, go to **Authentication** → **Providers**
2. Enable **Email** provider (should be enabled by default)
3. For **Google OAuth** (optional):
   - Enable Google provider
   - Add your Google OAuth credentials
   - Add authorized redirect URL: `https://your-project.supabase.co/auth/v1/callback`

## Step 6: Test Connection

Run your Next.js app:
```bash
npm run dev
```

Visit `http://localhost:3000` - if no errors, Supabase is connected!

## Step 7: Deploy to Vercel

1. Push your code to GitHub
2. Go to [vercel.com](https://vercel.com)
3. Import your repository
4. Add environment variables:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
5. Deploy!

## Troubleshooting

### "Invalid API key" error
- Check that your `.env.local` file has the correct values
- Restart your dev server after adding environment variables

### "Row Level Security" errors
- Make sure you ran all the SQL policies
- Check that authentication is working

### Can't sign up
- Verify email provider is enabled in Supabase
- Check browser console for errors

## Next Steps

- Test signup/login functionality
- Upload a test resource
- Try upvoting resources
- Share your deployed link!