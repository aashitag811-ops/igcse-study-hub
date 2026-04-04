# Testing Guide - Hearts & Creator Badges

## 🎯 What to Test

### 1. Heart Icons (SVG-based)

**Browse Page & Subject Pages:**
- **Not upvoted:** Outline heart (stroke only, gray)
- **Upvoted:** Filled heart (solid blue #60A5FA)
- **Hover:** Heart scales up to 115%
- **Size:** 28px (bigger than before)

**Homepage Carousel:**
- **Always:** Filled blue heart (20px)
- **Shows:** Upvote count in blue

### 2. Creator Badges

**Who gets it:**
- Arinjay Saha ⭐
- Aashita Gupta ⭐

**Where it appears:**
- Next to name on browse page
- Next to name on subject pages  
- Next to name in homepage carousel

**Design:**
- Golden circle background
- Star emoji inside
- Appears after the name

## 📝 How to Test

### Step 1: Add Test Data

Go to Supabase SQL Editor and run:

```sql
-- First, get your user ID
SELECT id, email FROM auth.users;

-- Update your profile with full name
UPDATE profiles 
SET full_name = 'Arinjay Saha'  -- or 'Aashita Gupta'
WHERE id = 'your-user-id-here';

-- Add test resources
INSERT INTO resources (title, subject, resource_type, link, description, uploader_id, upvote_count)
VALUES 
  ('Test Resource 1', '0580', 'notes', 'https://example.com/1', 'Math notes', 'your-user-id', 5),
  ('Test Resource 2', '0625', 'flashcards', 'https://example.com/2', 'Physics cards', 'your-user-id', 3),
  ('Test Resource 3', '0620', 'revision_guides', 'https://example.com/3', 'Chem guide', 'your-user-id', 8),
  ('Test Resource 4', '0610', 'notes', 'https://example.com/4', 'Bio notes', 'your-user-id', 12),
  ('Test Resource 5', '0500', 'sample_answers', 'https://example.com/5', 'English essays', 'your-user-id', 6),
  ('Test Resource 6', '0455', 'notes', 'https://example.com/6', 'Econ notes', 'your-user-id', 4);
```

### Step 2: Test Locally

1. **Open:** http://localhost:3000
2. **Check Homepage:**
   - Scroll down to see "Recently Added" section
   - Should see 6 resources in carousel
   - Each should have blue filled heart + count
   - Your name should have golden star ⭐

3. **Click a Subject Card:**
   - Should see resource count badge (top-right)
   - Click to go to subject page

4. **On Subject Page:**
   - See resources with outline hearts (if not logged in)
   - Login and hearts should fill when clicked
   - Your name should have golden star ⭐

5. **Go to Browse Page:**
   - Click "Browse Resources" button
   - See all resources
   - Test upvoting (heart fills, turns blue)
   - Your name should have golden star ⭐

### Step 3: Test Heart Interactions

**Not Logged In:**
- Hearts show as outline (gray stroke)
- Clicking redirects to login

**Logged In:**
- Click heart → fills with blue
- Click again → returns to outline
- Hover → scales up
- Count updates immediately

### Step 4: Test Creator Badges

**Your Resources:**
- Should see ⭐ after "by Arinjay Saha"
- Or ⭐ after "by Aashita Gupta"
- Badge is golden circle with star
- Appears on all pages

**Other Users:**
- No star badge
- Just shows name

## 🐛 Troubleshooting

### Hearts Not Showing
- Check browser console for errors
- Make sure you're on http://localhost:3000 (not Vercel)
- Try hard refresh (Ctrl+Shift+R)

### Creator Badge Not Showing
- Check database: `SELECT full_name FROM profiles WHERE id = 'your-id'`
- Must be exactly "Arinjay Saha" or "Aashita Gupta"
- Case sensitive!

### Carousel Not Showing
- Need at least 1 resource in database
- Check: `SELECT COUNT(*) FROM resources`
- Add test resources (see Step 1)

### Display Name Shows Email
- Profile needs `full_name` set
- Run: `UPDATE profiles SET full_name = 'Your Name' WHERE email = 'your@email.com'`

## ✅ Expected Results

### Homepage
- [x] Resource count badges on subject cards
- [x] "Recently Added" carousel visible
- [x] 6 resources showing (3 at a time)
- [x] Blue filled hearts in carousel
- [x] Creator badges (⭐) next to your names
- [x] Arrow navigation works

### Browse Page
- [x] Outline hearts when not upvoted
- [x] Filled blue hearts when upvoted
- [x] Hearts scale on hover
- [x] Creator badges visible
- [x] Full names showing (not emails)

### Subject Pages
- [x] Same heart behavior as browse
- [x] Creator badges visible
- [x] Resource count in sidebar
- [x] Full names showing

## 🚀 Deploy to See on Production

Once everything works locally:

```powershell
cd C:\Users\HP\Desktop\igcse-study-hub
vercel --prod
```

Then check your live site!

---

**Last Updated:** April 3, 2026  
**Status:** Ready for Testing