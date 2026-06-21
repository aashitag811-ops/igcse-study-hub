# Storage Explained - Where Everything Lives

Clear explanation of where exam papers and data are stored.

## TL;DR

✅ **Supabase is UNTOUCHED** - Your 5MB is safe!
✅ **Papers stored in your code** - Part of your Git repo
✅ **Deployed with your website** - FREE on Vercel
✅ **No storage costs** - Everything is part of your codebase

## Detailed Breakdown

### 1. Exam Papers (JSON Files)

**Where:** `public/papers/` folder in your project

**Example:**
```
your-project/
└── public/
    └── papers/
        ├── 0417_m25_qp_12.json  (~5KB)
        ├── 0417_s24_qp_11.json  (~5KB)
        └── 0417_w23_qp_13.json  (~5KB)
```

**Storage:**
- ✅ In your Git repository
- ✅ Deployed to Vercel with your code
- ✅ Served as static files (like images)
- ✅ FREE - no storage costs

**Size:**
- Each paper: ~5KB
- 100 papers: ~500KB (0.5MB)
- 1000 papers: ~5MB

### 2. User Data (Answers, Progress)

**Where:** Supabase database

**What's stored:**
- User profiles
- User's exam attempts
- User's answers
- User's scores
- User's progress

**Storage:**
- ✅ Uses your 5MB Supabase limit
- ✅ Only user-generated data
- ✅ NOT the exam papers themselves

### 3. PDFs (Original Papers)

**Where:** NOT stored anywhere!

**How it works:**
1. You download PDF from PapaCambridge
2. Script converts it to JSON
3. JSON saved to `public/papers/`
4. PDF is deleted (not needed anymore)

**Result:**
- ✅ No PDF storage needed
- ✅ Only small JSON files stored
- ✅ Much more efficient

## Visual Storage Map

```
┌─────────────────────────────────────────┐
│ Your Computer                           │
│                                         │
│ igcse-study-hub/                       │
│ ├── public/papers/                     │
│ │   ├── 0417_m25_qp_12.json  (5KB)    │
│ │   ├── 0417_s24_qp_11.json  (5KB)    │
│ │   └── ...                            │
│ └── src/                               │
│     └── (your code)                    │
└─────────────────────────────────────────┘
                 ↓ git push
┌─────────────────────────────────────────┐
│ GitHub Repository                       │
│                                         │
│ All your code + JSON papers             │
│ FREE (unlimited for public repos)       │
└─────────────────────────────────────────┘
                 ↓ auto-deploy
┌─────────────────────────────────────────┐
│ Vercel (Your Live Website)             │
│                                         │
│ Serves papers as static files          │
│ FREE (100GB bandwidth/month)            │
└─────────────────────────────────────────┘

┌─────────────────────────────────────────┐
│ Supabase (Database)                    │
│                                         │
│ ONLY stores:                           │
│ - User profiles                        │
│ - User answers                         │
│ - User progress                        │
│                                         │
│ Uses: ~1-2MB of your 5MB limit         │
│ (NOT the exam papers!)                 │
└─────────────────────────────────────────┘
```

## Storage Costs

| Item | Location | Cost | Size |
|------|----------|------|------|
| Exam Papers (JSON) | Git/Vercel | FREE | ~5KB each |
| Your Code | Git/Vercel | FREE | ~10MB |
| User Data | Supabase | FREE | ~1-2MB |
| PDFs | Nowhere | FREE | Not stored |

**Total Cost: $0.00** 🎉

## How Papers Are Accessed

### When a user selects a paper:

1. **Browser requests:** `https://your-site.com/papers/0417_m25_qp_12.json`
2. **Vercel serves:** The JSON file (like serving an image)
3. **App displays:** Questions to the user
4. **User answers:** Saved to Supabase database

### No downloads, no processing, instant loading!

## Supabase Usage Breakdown

Your 5MB Supabase storage is used for:

```
User Profiles:        ~100KB  (1000 users)
User Exam Attempts:   ~500KB  (5000 attempts)
User Answers:         ~1MB    (detailed answers)
Other Data:           ~500KB  (misc)
─────────────────────────────
Total:                ~2.1MB  (42% of 5MB limit)

EXAM PAPERS:          0 MB    (stored in Git/Vercel)
```

## Why This Approach?

### ✅ Advantages:
1. **No storage costs** - Papers are part of your code
2. **Fast loading** - Static files load instantly
3. **Version control** - Papers tracked in Git
4. **Easy updates** - Just commit and push
5. **Scalable** - Can add thousands of papers
6. **Supabase saved** - Only for user data

### ❌ Alternative (NOT recommended):
Storing papers in Supabase would:
- Use up your 5MB limit quickly
- Cost money for more storage
- Be slower to load
- Harder to manage

## Summary

**Your Supabase is SAFE!** 🛡️

- Exam papers: Stored in Git/Vercel (FREE)
- User data: Stored in Supabase (~2MB used)
- You have ~3MB free in Supabase for user growth
- No storage costs at all

Think of it like this:
- **Exam papers** = Like images on your website (static files)
- **User data** = Like user accounts (database)

Both are needed, but stored in different places for efficiency! 🎯