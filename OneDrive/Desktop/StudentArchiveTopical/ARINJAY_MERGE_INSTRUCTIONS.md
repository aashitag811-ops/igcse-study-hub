# 📌 Instructions for Arinjay — Merging into Preview Branch

Hey! To get both your latest changes from `main` and Aashita's MCQ UI changes together in one Vercel preview, follow these steps:

---

## What You Need to Do

You need to open a **Pull Request on GitHub** that merges `main` into `mcq-ui-changes-15th-sept`. This will let Vercel auto-generate a preview URL with both sets of changes combined.

---

## Step-by-Step

### 1. Go to the GitHub repo
Open: **https://github.com/aashitag811-ops/igcse-study-hub**

### 2. Open a Pull Request
- Click the **"Pull requests"** tab → **"New pull request"**
- Set it up like this:
  - **base:** `mcq-ui-changes-15th-sept`
  - **compare:** `main`
- Click **"Create pull request"**

### 3. Handle any conflicts
- If GitHub says there are merge conflicts, click **"Resolve conflicts"**
- For any conflicted file, keep **both sets of changes** — don't delete Aashita's MCQ UI code or your own changes
- Once resolved, click **"Mark as resolved"** → **"Commit merge"**

### 4. Check the Vercel preview URL
- Once the PR is open, Vercel will automatically post a **preview deployment URL** in the PR comments (usually within 1–2 minutes)
- Share that URL with Aashita so she can review the combined changes

### 5. Do NOT merge the PR into main yet
- This PR is just for **preview purposes**
- Wait for Aashita to review before merging anything into `main`

---

## Summary

| Field | Value |
|-------|-------|
| Repo | https://github.com/aashitag811-ops/igcse-study-hub |
| Base branch | `mcq-ui-changes-15th-sept` |
| Compare branch | `main` |
| Goal | Vercel preview URL with both your changes combined |

---

> ⚠️ **Don't push directly to `mcq-ui-changes-15th-sept`** — use a PR so conflicts can be reviewed safely.
