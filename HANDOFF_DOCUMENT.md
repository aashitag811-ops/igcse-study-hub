# IGCSE Study Hub - Development Handoff Document

## 📋 Project Overview

**Project Name:** IGCSE Study Hub  
**Purpose:** Resource-sharing platform for IGCSE students  
**Tech Stack:** Next.js 15, TypeScript, Supabase, Vercel  
**Live URL:** https://igcse-study-hub-red.vercel.app  
**Local Dev:** http://localhost:3000

---

## 🗂️ Project Structure

```
igcse-study-hub/
├── src/
│   ├── app/
│   │   ├── page.tsx                    # Homepage with stats, subject cards
│   │   ├── layout.tsx                  # Root layout
│   │   ├── globals.css                 # Global styles + cursive fonts
│   │   ├── login/
│   │   │   └── page.tsx               # Login/Signup page
│   │   └── auth/
│   │       └── callback/
│   │           └── route.ts           # OAuth callback handler
│   ├── lib/
│   │   ├── supabase/
│   │   │   ├── client.ts              # Client-side Supabase
│   │   │   └── server.ts              # Server-side Supabase
│   │   ├── constants/
│   │   │   ├── subjects.ts            # 9 IGCSE subjects
│   │   │   └── resourceTypes.ts       # 7 resource types
│   │   └── types/
│   │       └── database.types.ts      # Supabase types
├── .env.local                          # Environment variables
├── package.json
├── next.config.js
└── tailwind.config.ts
```

---

## 🔑 Environment Variables

**File:** `.env.local`

```env
NEXT_PUBLIC_SUPABASE_URL=https://tqwnbuamhcqhzxexmdft.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=<your-anon-key>
```

**Note:** These are also configured in Vercel project settings.

---

## 🗄️ Database Schema (Supabase)

### Tables:

1. **profiles**
   - `id` (uuid, primary key, references auth.users)
   - `email` (text)
   - `username` (text, unique)
   - `full_name` (text)
   - `avatar_url` (text)
   - `created_at` (timestamp)

2. **resources**
   - `id` (uuid, primary key)
   - `title` (text)
   - `subject` (text) - Subject code (e.g., '0580')
   - `resource_type` (text) - Type (e.g., 'notes', 'flashcards')
   - `link` (text) - URL to resource
   - `description` (text)
   - `uploader_id` (uuid, references profiles)
   - `upvote_count` (integer, default 0)
   - `created_at` (timestamp)

3. **votes**
   - `id` (uuid, primary key)
   - `resource_id` (uuid, references resources)
   - `user_id` (uuid, references profiles)
   - `created_at` (timestamp)
   - Unique constraint on (resource_id, user_id)

### RLS Policies:
- All tables have Row Level Security enabled
- Public read access for resources and profiles
- Authenticated users can insert/update their own data

---

## 📚 Constants & Data

### Subjects (9 total):
1. Mathematics (0580) - Blue
2. Physics (0625) - Purple
3. Chemistry (0620) - Green
4. Biology (0610) - Emerald
5. English (0500) - Red
6. Economics (0455) - Yellow
7. Global Perspectives (0457) - Indigo
8. ICT (0417) - Cyan
9. Business Studies (0450) - Orange

### Resource Types (7 total):
1. Revision Notes 📝
2. Flashcards 🎴
3. Hardest Questions 🎯
4. Formula Sheets 📐
5. Sample Answers ✅
6. Revision Guides 📖
7. YouTube Resources 🎥

### Upvote System:
- Heart icon (♥) instead of arrow
- Light blue (#60A5FA to #3B82F6) when upvoted
- One vote per user (enforced by database unique constraint)
- Users can toggle their vote on/off

---

## ✅ Completed Features

### 1. Homepage (`/`)
- ✅ Navigation bar with login/logout
- ✅ Hero section with cursive fonts
- ✅ Embossed 3D buttons (press-down effect)
- ✅ Live counters from Supabase (resources, students, subjects)
- ✅ Student counter hidden until 50+ students
- ✅ 9 subject cards (clickable, navigate to `/subject/[code]`)
- ✅ Recent resources carousel (6 items, 3 visible at a time with arrows)
- ✅ Responsive design

### 2. Authentication (`/login`)
- ✅ Email/password signup and login
- ✅ Google OAuth integration (needs Supabase config)
- ✅ Toggle between Sign In and Sign Up
- ✅ Error and success messages
- ✅ OAuth callback handler (`/auth/callback`)
- ✅ Session management
- ✅ Auto-redirect after login

### 3. Design & UX
- ✅ Cursive fonts (Pacifico, Dancing Script, Righteous)
- ✅ Embossed button effects (3D press-down)
- ✅ Gradient backgrounds
- ✅ Color-coded subject cards
- ✅ Smooth transitions and hover effects
- ✅ Glassmorphism navbar

### 4. Deployment
- ✅ Deployed to Vercel
- ✅ Environment variables configured
- ✅ Production URL: https://igcse-study-hub-red.vercel.app

---

## ✅ Recently Completed Features

### 1. Subject Detail Pages (`/subject/[code]`)
**Status:** ✅ COMPLETE
**Features:**
- Subject header with name, code, icon
- Sidebar filters (resource type, sort by)
- Resource cards with heart upvote system
- Display uploader's full name (prioritized over username)
- Pagination with page numbers
- Fully functional and tested

### 2. Browse Resources Page (`/browse`)
**Status:** ✅ COMPLETE
**Features:**
- Subject and resource type filters
- Sort by newest/most popular
- Search bar (title, description, uploader)
- Heart upvote system (light blue when upvoted)
- Display uploader's full name
- Pagination
- Results counter

### 3. Upload Resource Page (`/upload`)
**Status:** ✅ COMPLETE
**Features:**
- Complete form with validation
- Subject and resource type dropdowns
- URL validation
- Success/error messages
- Auto-redirect after upload
- Authentication required
- Upload guidelines

### 4. User Profile Page (`/profile`)
**Status:** ✅ COMPLETE
**Features:**
- User's uploaded resources
- Edit profile functionality
- Delete own resources
- View upvoted resources
- Profile statistics

### 5. Upvoting System
**Status:** ✅ COMPLETE
**Features:**
- Heart icon (♥) instead of arrow
- Light blue gradient when upvoted (#60A5FA to #3B82F6)
- One vote per user (database enforced)
- Toggle vote on/off
- Real-time counter updates
- Requires login to vote

### 6. Recent Resources Carousel
**Status:** ✅ COMPLETE
**Features:**
- Shows 6 most recent resources
- Displays 3 at a time
- Left/right arrow navigation
- Smooth scrolling animation
- Shows subject, resource type, uploader name, and upvote count
- Clickable cards navigate to subject page

## 🚧 Future Enhancements

### 1. Search Functionality
**Priority:** MEDIUM
**Description:**
- Global search bar in navbar
- Advanced search filters
- Search results page
- Search history

### 2. Notifications System
**Priority:** LOW
**Description:**
- Notify users when their resources get upvoted
- New resources in followed subjects
- Weekly digest emails

### 3. Resource Comments
**Priority:** LOW
**Description:**
- Allow users to comment on resources
- Reply to comments
- Moderation system

---

## 🎨 Design System

### Colors:
- **Primary Blue:** #2563EB
- **Secondary Purple:** #9333EA
- **Accent Pink:** #EC4899
- **Success Green:** #10B981
- **Background:** Linear gradient (blue → purple → pink)

### Fonts:
- **Headings:** Pacifico, Dancing Script (cursive)
- **Numbers:** Righteous (display)
- **Body:** Inter (sans-serif)

### Button Styles:
```typescript
// Embossed effect
boxShadow: isPressed
  ? 'inset 0 4px 8px rgba(0, 0, 0, 0.3)'
  : '0 8px 16px rgba(37, 99, 235, 0.4)'
transform: isPressed 
  ? 'translateY(2px) scale(0.98)' 
  : 'translateY(0) scale(1)'
```

---

## 🔧 Development Commands

```bash
# Install dependencies
npm install

# Run development server
npm run dev

# Build for production
npm run build

# Deploy to Vercel
vercel --prod

# Type checking
npm run type-check
```

---

## 📦 Key Dependencies

```json
{
  "@supabase/supabase-js": "^2.x",
  "@supabase/ssr": "^0.x",
  "next": "15.x",
  "react": "19.x",
  "typescript": "^5.x"
}
```

---

## 🐛 Known Issues

1. **Google OAuth:** Needs configuration in Supabase dashboard
   - Go to Authentication → Providers → Google
   - Add OAuth credentials
   - Add redirect URLs

2. **Student Counter:** Currently hidden (shows only when ≥50 students)
   - Can be adjusted in `src/app/page.tsx` line 30

3. **Mobile Responsiveness:** Some pages may need optimization for smaller screens
   - Test on mobile devices
   - Adjust carousel for mobile view

---

## 📝 To Resume in New Chat

### Provide this information:

1. **Project Context:**
   - "I'm building an IGCSE Study Hub - a resource-sharing platform for students"
   - "Tech stack: Next.js 15, TypeScript, Supabase, deployed on Vercel"

2. **Current Status:**
   - "Homepage is complete with subject cards, stats, and authentication"
   - "Login/signup pages are working with email/password and Google OAuth"
   - "Need to build: subject detail pages, browse page, upload page"

3. **Files to Share:**
   - This handoff document (`HANDOFF_DOCUMENT.md`)
   - `src/lib/constants/subjects.ts` (subject definitions)
   - `src/lib/constants/resourceTypes.ts` (resource type definitions)
   - `src/app/page.tsx` (homepage for reference)

4. **Next Task:**
   - "Let's build the subject detail pages at `/subject/[code]`"
   - OR "Let's build the browse resources page with filters"
   - OR "Let's build the upload form"

5. **Important Context:**
   - Supabase URL: `https://tqwnbuamhcqhzxexmdft.supabase.co`
   - Project uses embossed button effects (3D press-down)
   - Cursive fonts for headings (Pacifico, Dancing Script)
   - Student counter hidden until 50+ students

---

## 🎯 Recommended Next Steps

1. **Subject Detail Pages** (Highest Priority)
   - Create dynamic route `/subject/[code]/page.tsx`
   - Fetch resources filtered by subject
   - Add sidebar filters (resource type, sort)
   - Implement upvoting

2. **Browse Resources Page**
   - Create `/browse/page.tsx`
   - Add subject and resource type dropdowns
   - Implement search functionality
   - Show all resources with filters

3. **Upload Form**
   - Create `/upload/page.tsx`
   - Form validation
   - Insert into Supabase
   - Success/error handling

4. **User Profile**
   - Create `/profile/page.tsx`
   - Show user's uploads
   - Edit profile functionality
   - Delete resources

---

## 📞 Support & Resources

- **Supabase Dashboard:** https://supabase.com/dashboard
- **Vercel Dashboard:** https://vercel.com/dashboard
- **Next.js Docs:** https://nextjs.org/docs
- **Supabase Docs:** https://supabase.com/docs

---

**Last Updated:** April 3, 2026
**Version:** 2.0
**Status:** Core Features Complete - Ready for Testing

---

## 🔐 Security Notes

- All Supabase queries use RLS (Row Level Security)
- Environment variables stored in Vercel
- OAuth redirect URLs configured
- User authentication required for uploads and votes

---

**Made with Bob** 🤖