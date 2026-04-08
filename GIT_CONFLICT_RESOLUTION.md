# Git Conflict Resolution Guide

You're seeing this error because someone (maybe your friend or you from another computer) pushed changes to GitHub that you don't have locally.

## Quick Fix (3 Steps):

### Step 1: Pull Remote Changes
```powershell
git pull origin main
```

If you see merge conflicts, continue to Step 2. If not, skip to Step 3.

### Step 2: Resolve Conflicts (If Any)

If you see conflict messages, open the conflicted files in VS Code. You'll see sections like:

```
<<<<<<< HEAD
Your local changes
=======
Remote changes
>>>>>>> origin/main
```

**Choose which version to keep:**
- Keep your changes: Delete the remote version and conflict markers
- Keep remote changes: Delete your version and conflict markers
- Keep both: Manually combine them

Then:
```powershell
git add .
git commit -m "Resolve merge conflicts"
```

### Step 3: Push Your Changes
```powershell
git push origin main
```

## Alternative: Force Push (Use Carefully!)

⚠️ **WARNING:** This will overwrite remote changes. Only use if you're sure you want to discard remote changes.

```powershell
git push origin main --force
```

## Recommended Workflow to Avoid This:

Always pull before making changes:
```powershell
# Start of work session
git pull origin main

# Make your changes
# ...

# Commit and push
git add .
git commit -m "Your changes"
git push origin main
```

## Current Situation:

You have local changes (color palette + fonts) that need to be pushed, but there are remote changes you don't have yet.

**Safest approach:**
1. Pull remote changes: `git pull origin main`
2. Resolve any conflicts if they appear
3. Push your changes: `git push origin main`

Need help? Just send me the error message and I'll guide you through it!