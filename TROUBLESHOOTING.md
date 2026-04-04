# Troubleshooting Guide

## Issue: New Subjects Not Showing

### Solution:
The new subjects have been added to the code. To see them:

1. **Hard Refresh the Browser**
   - Windows/Linux: `Ctrl + Shift + R` or `Ctrl + F5`
   - Mac: `Cmd + Shift + R`

2. **Clear Browser Cache**
   - Chrome: Settings → Privacy → Clear browsing data
   - Select "Cached images and files"
   - Click "Clear data"

3. **Restart Dev Server**
   - Stop the current dev server (Ctrl+C in terminal)
   - Run: `npm run dev`
   - Wait for compilation to complete
   - Refresh browser

4. **Check Terminal Output**
   - Look for compilation errors
   - Ensure it says "✓ Compiled successfully"

### New Subjects Added:
- 📈 Additional Mathematics (0606)
- 🇮🇳 Hindi (0549)
- 🇫🇷 French (0520)
- 🖥️ Computer Science (0478)

**Total: 13 subjects** (was 9)

---

## Issue: Carousel Hearts Showing Blue for 0 Upvotes

### Root Cause:
The carousel hearts are correctly coded to show:
- **Gray outline** = Not voted (or not logged in)
- **Blue gradient** = Voted by current user

### Why You Might See Blue Hearts:

1. **You're Logged In and Have Voted**
   - The system remembers your votes
   - Blue hearts indicate YOU upvoted those resources
   - This is correct behavior!

2. **Browser Cache**
   - Old vote data might be cached
   - Solution: Hard refresh (Ctrl+Shift+R)

3. **Not Logged In**
   - Hearts should show gray outline
   - If you see blue, it's a cache issue

### How to Test:

1. **Log Out**
   - All hearts should be gray outline
   - Vote counts still visible

2. **Log In**
   - Hearts you've upvoted show blue gradient
   - Others show gray outline

3. **Upvote a Resource**
   - Heart turns blue immediately
   - Count increases by 1

4. **Remove Upvote**
   - Heart turns gray
   - Count decreases by 1

### Code Verification:

The carousel fetches user votes on page load:
```typescript
// Fetch user's votes if logged in
if (user) {
  const { data: votes } = await supabase
    .from('votes')
    .select('resource_id')
    .eq('user_id', user.id);
  
  if (votes) {
    setUserVotes(new Set(votes.map((v: UserVote) => v.resource_id)));
  }
}
```

Then displays hearts based on vote status:
```typescript
const hasVoted = userVotes.has(resource.id);
// Blue if hasVoted is true, gray if false
```

---

## Issue: Subject Pages Not Sorting by Upvotes

### Solution:
The default sort has been changed to "popular" (most upvotes first).

**To verify:**
1. Go to any subject page (e.g., `/subject/0580`)
2. Check the "Sort By" dropdown
3. It should show "Most Popular" selected by default
4. Resources with most upvotes appear first

**If not working:**
1. Hard refresh the page
2. Clear browser cache
3. Check browser console for errors (F12)

---

## General Troubleshooting Steps

### 1. Check Dev Server
```bash
# In terminal, you should see:
✓ Compiled in XXXms
```

### 2. Check Browser Console
- Press F12
- Go to Console tab
- Look for errors (red text)
- Share any errors you see

### 3. Check Network Tab
- Press F12
- Go to Network tab
- Refresh page
- Look for failed requests (red)

### 4. Verify File Changes
Files that were modified:
- `src/lib/constants/subjects.ts` - Added 4 new subjects
- `src/app/page.tsx` - Updated subject count to 13
- `src/app/subject/[code]/page.tsx` - Changed default sort to "popular"
- `src/app/login/page.tsx` - Added forgot password/username
- `src/app/page.tsx` - Fixed carousel hearts logic

### 5. Database Check
If issues persist, check Supabase:
1. Go to Supabase Dashboard
2. Check if resources exist in database
3. Verify votes table has correct data
4. Check profiles table has email field

---

## Quick Fixes

### Clear Everything and Start Fresh:
```bash
# Stop dev server (Ctrl+C)
# Clear Next.js cache
rm -rf .next

# Restart
npm run dev
```

### Browser Hard Reset:
1. Close all browser tabs
2. Clear cache completely
3. Restart browser
4. Open site in incognito/private mode
5. Test functionality

---

## Still Having Issues?

### Check These:

1. **Are you on the right URL?**
   - Should be: `http://localhost:3000`
   - Not the deployed Vercel URL

2. **Is the dev server running?**
   - Check terminal for "ready" message
   - Port 3000 should be in use

3. **Any TypeScript errors?**
   - Check terminal output
   - Look for red error messages

4. **Database connection?**
   - Check `.env.local` file exists
   - Verify Supabase credentials are correct

### Share This Info:
- Browser console errors (F12 → Console)
- Terminal output
- Screenshot of the issue
- Which page you're on
- Whether you're logged in or not

---

**Made with Bob** 🤖