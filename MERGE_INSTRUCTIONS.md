# 📌 READ THIS FIRST — Merging UI Changes (11th August Branch)

Hey — this branch contains **UI-only changes** made on the frontend.
Before you push or deploy, you need to merge these with your MCQ logic changes carefully.

The files below are split into three categories so you (or your AI) know exactly what to do with each one.

---

## ✅ SAFE TO COPY DIRECTLY
These are brand new or pure UI files. They don't touch any logic or routes your side.
Just drop them straight into your project folder — no merging needed.

```
public/logo.png
src/app/components/HeroSection.tsx          ← new hero section on the homepage
src/app/components/ScrollsSection.tsx       ← new landing/features section
src/components/Header.tsx                   ← updated header buttons UI + Browse Resources nav item
src/components/BackButton.tsx               ← updated back button UI
src/components/HeartIcon.tsx                ← new minimal blue heart + gold star CreatorBadge
src/app/(igcse)/igcse/login/page.tsx        ← redesigned login page
src/components/past-papers/ViewPastPapersMode.tsx     ← view mode UI redesign
src/components/past-papers/ViewPastPapersPDFMode.tsx  ← PDF view mode UI redesign
src/app/(igcse)/igcse/browse/page.tsx       ← full Browse Resources redesign (dark library aesthetic,
                                               sidebar, 3-col grid cards, SVG icons, dust particles,
                                               cursor glow, gold creator badge, default sort = popular)
```

---

## ⚠️ MIXED — OPEN BOTH VERSIONS AND MERGE MANUALLY
These files have UI changes layered on top of logic/routing.
Do NOT just copy them over — open your version and this version side by side and combine them.

```
src/app/page.tsx
  → UI side: imports HeroSection + ScrollsSection, adds them to homepage layout,
    removes ResourcesSection
  → Your side: check if you changed the homepage structure or added any new sections

src/app/layout.tsx
  → UI side: added Cormorant Garamond + Playfair Display + Inter font imports
  → Your side: check if you changed the ThemeProvider or metadata

src/app/(igcse)/igcse/practice/components/StudyModeSelector.tsx
  → UI side: mode tab cards, launch button, colour/layout overhaul
  → Your side: check if you changed the mode switching logic or added new modes

src/app/(igcse)/igcse/practice/components/PracticeContent.tsx
  → UI side: full page restyled (dust particles, glow, card layout)
  → Your side: THIS IS THE MOST LIKELY CONFLICT — MCQ logic probably lives here too
  → Merge carefully: keep your fetch/routing logic, apply the UI styles around it
```

---

## 🔴 RISKY — MANUAL MERGE REQUIRED
These are global config/style files or routing files. Copying blindly will break things.

```
src/app/globals.css
  → UI side: added global button hover/press animation at the bottom (clearly marked),
    plus CSS vars for gold/parchment theme, grain overlay, shelf styles, etc.
  → Your side: paste your additions into this file — don't overwrite the whole thing

tailwind.config.ts
  → UI side: added custom font variables (--font-heading, --font-display, --font-body)
    and extended the theme with those
  → Your side: if you added custom colours or plugins, merge them in manually

src/app/past-papers/page.tsx
  → UI side: replaced the old white page with a redirect to /igcse/practice
  → Your side: if you haven't touched this file, safe to copy. If you have, just make
    sure it redirects to /igcse/practice instead of rendering the old UI.

src/app/practice/page.tsx
  → UI side: replaced the old white selector with a redirect to /igcse/practice
  → Your side: same as above — just ensure it redirects, don't keep the old component.

src/app/(igcse)/igcse/past-papers/page.tsx
  → UI side: paper selector page was restyled
  → Your side: check if you changed any of the data fetching or routing logic here
```

---

## Summary for your AI (Bob or otherwise)

1. Copy the **SAFE** files as-is.
2. For **MIXED** files — diff both versions, keep the logic from your side, apply the UI styling from this branch.
3. For **RISKY** files — read both versions fully before touching anything. Append/merge, never overwrite.
4. After merging, run `npm run build` to confirm nothing broke before deploying to Vercel.

---

*Branch: 11th-August | Last updated: 11th August (session 2)*
