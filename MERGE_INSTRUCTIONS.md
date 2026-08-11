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
src/app/components/HeroSection.tsx        ← new hero section on the homepage
src/app/components/ScrollsSection.tsx     ← new landing/features section
src/components/Header.tsx                 ← updated header buttons UI
src/components/BackButton.tsx             ← updated back button UI
src/app/(igcse)/igcse/login/page.tsx      ← redesigned login page
src/components/past-papers/ViewPastPapersMode.tsx     ← view mode UI redesign
src/components/past-papers/ViewPastPapersPDFMode.tsx  ← PDF view mode UI redesign
src/app/components/ResourcesSection.tsx  ← resources section UI
```

---

## ⚠️ MIXED — OPEN BOTH VERSIONS AND MERGE MANUALLY
These files have UI changes layered on top of logic/routing.
Do NOT just copy them over — open your version and this version side by side and combine them.

```
src/app/page.tsx
  → UI side: imports HeroSection + ScrollsSection and adds them to the homepage layout
  → Your side: check if you changed the homepage structure or added any new sections

src/app/layout.tsx
  → UI side: added Cormorant Garamond + Playfair Display + Inter font imports
  → Your side: check if you changed the ThemeProvider or metadata

src/app/(igcse)/igcse/past-papers/page.tsx
  → UI side: paper selector page was restyled
  → Your side: check if you changed any of the data fetching or routing logic here

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
These are global config/style files. If you've touched either of these, copying blindly will break things.

```
src/app/globals.css
  → UI side: added global button hover/press animation at the bottom (clearly marked),
    plus CSS vars for gold/parchment theme, grain overlay, shelf styles, etc.
  → Your side: paste your additions into this file — don't overwrite the whole thing

tailwind.config.ts
  → UI side: added custom font variables (--font-heading, --font-display, --font-body)
    and extended the theme with those
  → Your side: if you added custom colours or plugins, merge them in manually
```

---

## Summary for your AI (Bob or otherwise)

1. Copy the **SAFE** files as-is.
2. For **MIXED** files — diff both versions, keep the logic from your side, apply the UI styling from this branch.
3. For **RISKY** files — read both versions fully before touching anything. Append/merge, never overwrite.
4. After merging, run `npm run build` to confirm nothing broke before deploying to Vercel.

---

*Branch: 11th-August | Created by: Aashita*
