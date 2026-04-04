# 🗺️ Supabase Navigation Guide

## Quick Answers

### Q1: Should I enable OAuth support in Supabase?
**Answer:** Yes, if you want Google sign-in to work! It's optional but recommended for better user experience.

### Q2: Where can I see stored login data in Supabase?
**Answer:** In the **Authentication** section and **Table Editor**. See detailed instructions below.

---

## 📍 Finding Your Data in Supabase

### 1. View User Accounts (Authentication Data)

**Location:** Authentication → Users

**Steps:**
1. Go to [Supabase Dashboard](https://supabase.com/dashboard)
2. Select your project: **IGCSE Study Hub**
3. In the left sidebar, click **"Authentication"**
4. Click **"Users"** (should be selected by default)

**What You'll See:**
- List of all registered users
- Email addresses
- Sign-up dates
- Last sign-in times
- Authentication providers used (email, Google, etc.)
- User IDs (UUID)

**Actions You Can Do:**
- View user details
- Delete users
- Reset passwords
- Send password reset emails
- View user metadata

---

### 2. View User Profiles (Database Data)

**Location:** Table Editor → profiles

**Steps:**
1. In Supabase Dashboard, click **"Table Editor"** in the left sidebar
2. Click on the **"profiles"** table
3. You'll see all user profile data

**What You'll See:**
- User IDs
- Emails
- Usernames
- Full names
- Avatar URLs (if set)
- Created dates

**Actions You Can Do:**
- View all profiles
- Edit profile data
- Delete profiles
- Add new columns
- Run SQL queries

---

### 3. View Uploaded Resources

**Location:** Table Editor → resources

**Steps:**
1. Click **"Table Editor"** in the left sidebar
2. Click on the **"resources"** table

**What You'll See:**
- All uploaded resources
- Titles, descriptions, links
- Subject codes
- Resource types
- Upvote counts
- Uploader IDs
- Created dates

---

### 4. View Upvotes

**Location:** Table Editor → votes

**Steps:**
1. Click **"Table Editor"** in the left sidebar
2. Click on the **"votes"** table

**What You'll See:**
- All upvotes
- Resource IDs
- User IDs who upvoted
- Vote timestamps

---

## 🔐 Enabling Google OAuth

### Should You Enable It?

**Pros:**
- ✅ Easier for users (one-click sign-in)
- ✅ No password to remember
- ✅ Faster signup process
- ✅ More professional
- ✅ Better user experience

**Cons:**
- ⏱️ Takes 15 minutes to set up
- 🔧 Requires Google Cloud Console account
- 📝 More configuration steps

**Recommendation:** **YES, enable it!** It's worth the setup time for better UX.

---

## 📊 How to Enable Google OAuth

### Quick Steps:

1. **In Supabase:**
   - Go to **Authentication** → **Providers**
   - Find **Google** in the list
   - Toggle it **ON** (enable it)
   - You'll see fields for Client ID and Client Secret

2. **Get Google Credentials:**
   - Follow the detailed guide in `GOOGLE_OAUTH_SETUP.md`
   - It walks you through:
     - Creating Google Cloud project
     - Enabling Google+ API
     - Setting up OAuth consent screen
     - Creating OAuth 2.0 credentials
     - Getting Client ID and Secret

3. **Add Credentials to Supabase:**
   - Paste Client ID and Client Secret
   - Click **Save**

4. **Test:**
   - Go to your app's login page
   - Click "Continue with Google"
   - Should work! 🎉

---

## 🔍 Monitoring Your App

### Real-Time Stats

**Location:** Authentication → Users

**What to Monitor:**
- Total users
- New signups today
- Active users
- Sign-in methods used

### Database Stats

**Location:** Table Editor

**What to Monitor:**
- Total resources uploaded
- Total upvotes
- Most popular resources
- Active uploaders

### Usage Stats

**Location:** Settings → Usage

**What to Monitor:**
- Database size
- API requests
- Bandwidth usage
- Active connections

---

## 🛠️ Common Tasks

### Task 1: View All Users
1. Authentication → Users
2. See list of all registered users

### Task 2: Delete a User
1. Authentication → Users
2. Click on user
3. Click "Delete user"
4. Confirm deletion

### Task 3: View User's Uploads
1. Table Editor → resources
2. Filter by `uploader_id`
3. Enter user's ID

### Task 4: View User's Upvotes
1. Table Editor → votes
2. Filter by `user_id`
3. Enter user's ID

### Task 5: Run Custom Query
1. SQL Editor (in left sidebar)
2. Write your SQL query
3. Click "Run"

**Example Queries:**

```sql
-- Get total users
SELECT COUNT(*) FROM auth.users;

-- Get total resources
SELECT COUNT(*) FROM resources;

-- Get most upvoted resources
SELECT title, upvote_count 
FROM resources 
ORDER BY upvote_count DESC 
LIMIT 10;

-- Get user with most uploads
SELECT uploader_id, COUNT(*) as upload_count
FROM resources
GROUP BY uploader_id
ORDER BY upload_count DESC
LIMIT 10;
```

---

## 📱 Testing Your Setup

### After Enabling Google OAuth:

1. **Test Email Signup:**
   - Go to `/login`
   - Click "Sign Up"
   - Enter email and password
   - Check Supabase → Authentication → Users
   - You should see the new user!

2. **Test Google Sign-In:**
   - Go to `/login`
   - Click "Continue with Google"
   - Sign in with Google
   - Check Supabase → Authentication → Users
   - You should see the new user with "google" provider!

3. **Test Profile Creation:**
   - After signup, check Table Editor → profiles
   - You should see a new profile created automatically

4. **Test Resource Upload:**
   - Upload a resource
   - Check Table Editor → resources
   - You should see the new resource!

5. **Test Upvoting:**
   - Upvote a resource
   - Check Table Editor → votes
   - You should see the new vote!

---

## 🎯 Quick Navigation Cheat Sheet

| What You Want to See | Where to Go |
|---------------------|-------------|
| User accounts | Authentication → Users |
| User profiles | Table Editor → profiles |
| Uploaded resources | Table Editor → resources |
| Upvotes | Table Editor → votes |
| Database structure | Table Editor (see all tables) |
| Run SQL queries | SQL Editor |
| API settings | Settings → API |
| Usage stats | Settings → Usage |
| Enable Google OAuth | Authentication → Providers |
| Configure URLs | Authentication → URL Configuration |

---

## 💡 Pro Tips

1. **Use Filters:**
   - In Table Editor, use the filter icon to search
   - Filter by email, username, date, etc.

2. **Export Data:**
   - In Table Editor, click "Export" to download CSV
   - Great for backups or analysis

3. **Real-Time Updates:**
   - Table Editor updates in real-time
   - Refresh to see latest data

4. **SQL Editor:**
   - Use for complex queries
   - Save frequently used queries
   - Export results to CSV

5. **Logs:**
   - Check Logs section for errors
   - Useful for debugging

---

## 🆘 Troubleshooting

### Can't see users?
- Check Authentication → Users
- Make sure you're in the right project
- Try refreshing the page

### Can't see profiles?
- Check Table Editor → profiles
- Make sure the table exists
- Check if trigger is working (creates profile on signup)

### Google OAuth not working?
- Check Authentication → Providers → Google
- Make sure it's enabled
- Verify Client ID and Secret are correct
- Check redirect URLs are configured

### Data not showing?
- Refresh the page
- Check filters are not hiding data
- Verify RLS policies allow viewing

---

**Now you know how to navigate Supabase and find all your data!** 🎉

**Next Step:** Follow `GOOGLE_OAUTH_SETUP.md` to enable Google sign-in (recommended but optional).