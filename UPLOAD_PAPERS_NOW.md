# Upload Papers Right Now - Step by Step

Let's get your first papers uploaded! Follow these exact steps.

## Current Situation

You tried to convert October/November 2025 papers but got a PDF error. That's okay - let's try different papers that work better.

## Step-by-Step Upload Process

### Step 1: Open a New PowerShell Window

Keep your dev server running in the current terminal. Open a new one:
- Press `Windows Key`
- Type "PowerShell"
- Open "Windows PowerShell"

### Step 2: Navigate to Scripts Folder

```powershell
cd C:\Users\HP\Desktop\igcse-study-hub\scripts
```

### Step 3: Try Converting Papers (One at a Time)

Let's start with May/June 2024 (these usually work well):

```powershell
python convert-paper-to-json.py 2024 s 1
```

**What you'll see:**
```
📥 Downloading from: https://...
✅ Downloaded 234567 bytes
📄 Extracting text from PDF...
🔍 Parsing questions...
✅ SUCCESS!
📁 Saved to: C:\...\public\papers\0417_s24_qp_11.json
📊 Total questions: 8
📝 Total marks: 80
```

**If it works:** Great! Continue to next variant.

**If it fails with "EOF marker not found":** That specific paper has issues. Try the next one.

### Step 4: Convert More Papers

```powershell
# Try variant 2
python convert-paper-to-json.py 2024 s 2

# Try variant 3
python convert-paper-to-json.py 2024 s 3
```

### Step 5: Check What You Have

```powershell
# Go to papers folder
cd ..\public\papers

# List all JSON files
dir *.json
```

You should see files like:
```
0417_s24_qp_11.json
0417_s24_qp_12.json
0417_s24_qp_13.json
```

### Step 6: Commit to Git

```powershell
# Go back to project root
cd ..\..

# Check what changed
git status

# Add all new papers
git add public/papers/

# Commit with a message
git commit -m "Add May/June 2024 papers"

# Push to GitHub
git push origin main
```

### Step 7: Wait for Deployment

- Vercel will automatically deploy (2-3 minutes)
- Check your live site
- Papers should appear in the dropdown!

## If You Get Errors

### "EOF marker not found"
**Solution:** That specific paper has issues. Skip it and try another year/season.

```powershell
# Try February/March instead
python convert-paper-to-json.py 2024 m 1
python convert-paper-to-json.py 2024 m 2
python convert-paper-to-json.py 2024 m 3
```

### "Module not found"
**Solution:** Install dependencies again.

```powershell
cd scripts
pip install -r requirements.txt
cd ..
```

### "Git push rejected"
**Solution:** Pull remote changes first.

```powershell
git pull origin main
# Resolve any conflicts
git push origin main
```

## Recommended Upload Strategy

### Phase 1: Upload Working Papers First

Try these in order (usually work well):

```powershell
cd scripts

# 2024 May/June
python convert-paper-to-json.py 2024 s 1
python convert-paper-to-json.py 2024 s 2
python convert-paper-to-json.py 2024 s 3

# 2023 May/June
python convert-paper-to-json.py 2023 s 1
python convert-paper-to-json.py 2023 s 2
python convert-paper-to-json.py 2023 s 3

# 2022 May/June
python convert-paper-to-json.py 2022 s 1
python convert-paper-to-json.py 2022 s 2
python convert-paper-to-json.py 2022 s 3
```

### Phase 2: Commit All Together

```powershell
cd ..
git add public/papers/
git commit -m "Add 2022-2024 May/June papers"
git push origin main
```

### Phase 3: Try Other Seasons

Once you have some working papers, try:
- February/March (`m`)
- October/November (`w`)

## Quick Commands Reference

```powershell
# Convert a paper
cd scripts
python convert-paper-to-json.py <year> <season> <variant>

# Check what you have
cd ..\public\papers
dir *.json

# Commit and push
cd ..\..
git add public/papers/
git commit -m "Add papers"
git push origin main
```

## Where Papers Are Stored

```
Your Computer:
└── igcse-study-hub/
    └── public/
        └── papers/
            ├── 0417_s24_qp_11.json  ← Here!
            ├── 0417_s24_qp_12.json
            └── ...

After git push:
└── GitHub (your repo)
    └── Same files

After Vercel deploys:
└── Live website
    └── Papers available at /papers/*.json
```

**Supabase:** NOT used for papers! Only for user data.

## Let's Do It!

Ready to upload your first paper? Run this now:

```powershell
cd C:\Users\HP\Desktop\igcse-study-hub\scripts
python convert-paper-to-json.py 2024 s 1
```

If it works, you'll see ✅ SUCCESS! Then continue with more papers! 🚀