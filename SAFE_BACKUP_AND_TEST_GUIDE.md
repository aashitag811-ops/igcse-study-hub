# 🛡️ Safe Backup & Test Guide

## 🎯 Goal

**Safely backup your current JSON files, view them on GitHub, and test them locally before making any changes.**

## 📦 Step 1: Backup Current Files

Create a backup folder to preserve your current JSON files:

```powershell
# Create backup folder
New-Item -ItemType Directory -Path "public/papers-backup" -Force

# Copy all JSON files to backup
Copy-Item "public/papers/*.json" -Destination "public/papers-backup/" -Force

# Verify backup
Get-ChildItem "public/papers-backup/*.json" | Measure-Object | Select-Object Count
```

**This keeps your current files safe!** ✅

## 🔍 Step 2: Check What You Have

### View File Sizes (to see which have data)

```powershell
Get-ChildItem "public/papers/*.json" | Select-Object Name, @{Name="Size(KB)";Expression={[math]::Round($_.Length/1KB,2)}} | Sort-Object Name
```

**What to look for:**
- ✅ **Good files**: 50-150 KB (have questions)
- ❌ **Empty files**: < 1 KB (no questions)
- ⭐ **sample_test.json**: Your reference file

### Peek Inside a File

```powershell
# View first 30 lines of a file
Get-Content "public/papers/sample_test.json" -Head 30

# Or view a specific paper
Get-Content "public/papers/0417_s21_qp_12.json" -Head 30
```

## 🌐 Step 3: View on GitHub

If your project is on GitHub, you can view the files online:

### Option A: GitHub Web Interface
1. Go to your repository on GitHub
2. Navigate to `public/papers/`
3. Click on any `.json` file
4. GitHub will show you the formatted JSON

### Option B: GitHub Raw View
```
https://github.com/YOUR_USERNAME/YOUR_REPO/blob/main/public/papers/sample_test.json
```

### Option C: Download from GitHub
```powershell
# Download a specific file from GitHub
$url = "https://raw.githubusercontent.com/YOUR_USERNAME/YOUR_REPO/main/public/papers/sample_test.json"
Invoke-WebRequest -Uri $url -OutFile "downloaded_sample.json"
```

## 🖥️ Step 4: Test Current Papers Locally

### Start the Dev Server

```bash
npm run dev
```

### Test Each Paper

Open your browser and test these URLs:

```
http://localhost:3000/practice/sample_test
http://localhost:3000/practice/0417_s20_qp_11
http://localhost:3000/practice/0417_s20_qp_12
http://localhost:3000/practice/0417_s21_qp_12
```

### What to Check

For each paper, verify:
- ✅ Questions display properly
- ✅ Text is readable (not garbled)
- ✅ Question numbers show correctly (1, 1a, 1a(i))
- ✅ Input types are correct (checkboxes, text boxes, etc.)
- ✅ Tables render properly
- ✅ No errors in browser console

### Take Screenshots

If you like how a paper looks:
1. Press `Windows + Shift + S` to take a screenshot
2. Save it to a folder like `screenshots/good-papers/`
3. Note which paper it is

## 📋 Step 5: Create an Inventory

Make a list of which papers are good:

```powershell
# Create a report
$report = @()
Get-ChildItem "public/papers/*.json" | ForEach-Object {
    $size = [math]::Round($_.Length/1KB, 2)
    $status = if ($size -lt 1) { "EMPTY" } elseif ($size -gt 50) { "GOOD" } else { "CHECK" }
    $report += [PSCustomObject]@{
        Name = $_.Name
        SizeKB = $size
        Status = $status
    }
}
$report | Format-Table -AutoSize
```

## 🔄 Step 6: Restore from Git (If Needed)

If you want to get back to a previous version:

### View Git History

```bash
# See recent commits
git log --oneline -20

# See what changed in a specific commit
git show COMMIT_HASH --name-only
```

### Restore Specific Files

```bash
# Restore papers from a specific commit
git checkout COMMIT_HASH -- public/papers/

# Or restore just one file
git checkout COMMIT_HASH -- public/papers/0417_s21_qp_12.json
```

### Find the "Good" Commit

```bash
# See commits that modified papers
git log --oneline -- public/papers/

# View a specific commit's changes
git show COMMIT_HASH:public/papers/sample_test.json
```

## 🎨 Step 7: Compare Versions

### Create a Test Branch

```bash
# Create a new branch to test changes
git checkout -b test-new-papers

# Make changes here without affecting main
# If you like it, merge back
# If not, just switch back to main
```

### Side-by-Side Testing

1. **Keep current version running** on `localhost:3000`
2. **Copy project to another folder** for testing new version
3. **Run new version** on different port:

```bash
# In the copied folder
npm run dev -- -p 3001
```

Now you can compare:
- Current version: `http://localhost:3000/practice/sample_test`
- New version: `http://localhost:3001/practice/sample_test`

## 📊 Step 8: Decision Matrix

Create a simple checklist:

```markdown
## Paper Quality Checklist

### sample_test.json
- [ ] Text is clean
- [ ] Questions display correctly
- [ ] All question types work
- [ ] No errors
- **Decision**: KEEP ✅

### 0417_s21_qp_12.json
- [ ] Text is clean
- [ ] Questions display correctly
- [ ] All question types work
- [ ] No errors
- **Decision**: REPLACE / KEEP

(Repeat for each paper)
```

## 🚀 Step 9: Safe Conversion Process

Once you know which papers to keep:

### Option A: Keep Good Papers, Convert Bad Ones

```powershell
# Move good papers to safe location
New-Item -ItemType Directory -Path "public/papers-keep" -Force
Move-Item "public/papers/sample_test.json" -Destination "public/papers-keep/"
Move-Item "public/papers/0417_s20_qp_11.json" -Destination "public/papers-keep/"
# ... move other good papers

# Convert only the bad/empty papers from Supabase
python scripts/convert-from-supabase-simple.py

# Move good papers back
Move-Item "public/papers-keep/*.json" -Destination "public/papers/" -Force
```

### Option B: Convert All, Then Cherry-Pick

```powershell
# Backup current papers
Copy-Item "public/papers" -Destination "public/papers-old" -Recurse

# Convert all from Supabase
python scripts/convert-from-supabase-simple.py

# Compare and choose best version of each paper
# Keep whichever looks better
```

## 💡 Pro Tips

### 1. Use Git to Track Changes

```bash
# Before making changes
git add .
git commit -m "Backup before converting papers"

# After changes, if you don't like them
git reset --hard HEAD
```

### 2. Test One Paper at a Time

Don't convert all 36 papers at once. Test with 2-3 first.

### 3. Keep a "Golden" Set

Always keep your best-looking papers in a separate folder:

```powershell
New-Item -ItemType Directory -Path "public/papers-golden" -Force
Copy-Item "public/papers/sample_test.json" -Destination "public/papers-golden/"
```

### 4. Document What Works

Create a file `GOOD_PAPERS.md`:

```markdown
# Papers That Look Good

## sample_test.json
- Source: Manual creation
- Quality: Perfect ⭐
- Keep this format

## 0417_s20_qp_11.json
- Source: Supabase conversion (Date: 2024-01-15)
- Quality: Good ✅
- Text is clean, tables work
```

## ✅ Summary

**You are now safe to:**
1. ✅ Backup your current files
2. ✅ View them on GitHub
3. ✅ Test them locally
4. ✅ Compare versions
5. ✅ Restore if needed
6. ✅ Convert selectively

**You will NOT lose:**
- Your current working files (backed up)
- Your Git history (can restore)
- Your sample_test.json (protected)

---

**Made with ❤️ by Bob - Your files are safe!**