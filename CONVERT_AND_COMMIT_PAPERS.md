# Convert and Commit Multiple Papers - Quick Guide

## October/November 2025 Papers (3 Variants)

### Step 1: Convert All 3 Papers

Open a **new PowerShell window** (keep dev server running in the other one):

```powershell
# Navigate to scripts folder
cd C:\Users\HP\Desktop\igcse-study-hub\scripts

# Convert Variant 1
python convert-paper-to-json.py 2025 w 1

# Convert Variant 2
python convert-paper-to-json.py 2025 w 2

# Convert Variant 3
python convert-paper-to-json.py 2025 w 3
```

**Note:** `w` = October/November (winter session)

### Step 2: Verify Files Created

Check that these files exist:
```
public/papers/
├── 0417_w25_qp_11.json
├── 0417_w25_qp_12.json
└── 0417_w25_qp_13.json
```

### Step 3: Commit All Together

```powershell
# Go back to project root
cd ..

# Add all new papers
git add public/papers/

# Commit with descriptive message
git commit -m "Add October/November 2025 papers (variants 1, 2, 3)"

# Push to GitHub
git push origin main
```

## If You Get the "Remote Changes" Error:

```powershell
# Pull remote changes first
git pull origin main

# If conflicts appear, resolve them in VS Code
# Then commit the merge
git add .
git commit -m "Merge remote changes"

# Now push your papers
git push origin main
```

## Quick Reference:

**Season Codes:**
- `m` = February/March
- `s` = May/June
- `w` = October/November

**Convert Command:**
```powershell
python convert-paper-to-json.py <year> <season> <variant>
```

**Examples:**
```powershell
python convert-paper-to-json.py 2025 w 1  # Oct/Nov 2025 Variant 1
python convert-paper-to-json.py 2024 s 2  # May/Jun 2024 Variant 2
python convert-paper-to-json.py 2023 m 3  # Feb/Mar 2023 Variant 3
```

## Batch Convert Multiple Papers:

You can run all commands in sequence:
```powershell
cd scripts
python convert-paper-to-json.py 2025 w 1 && python convert-paper-to-json.py 2025 w 2 && python convert-paper-to-json.py 2025 w 3
cd ..
git add public/papers/
git commit -m "Add Oct/Nov 2025 papers"
git push origin main
```

That's it! All 3 papers will be deployed together! 🚀