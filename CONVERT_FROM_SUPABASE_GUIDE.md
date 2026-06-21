# 🔄 Convert Papers from Supabase - Complete Guide

## 📋 Overview

You have papers stored in Supabase that need to be converted to JSON format for the exam interface.

## 🗑️ Step 1: Delete Empty JSON Files

First, let's remove the empty JSON files that were created:

```powershell
# Navigate to papers directory
cd public/papers

# Delete all JSON files (they're empty anyway)
Remove-Item *.json

# Or keep sample_test.json if it has data
Remove-Item *.json -Exclude sample_test.json
```

## 📥 Step 2: Convert from Supabase

You have **two converter scripts**:

### Option A: Simple Converter (Recommended)
Uses the advanced PDF extractor with image and table support.

```bash
python scripts/convert-from-supabase-simple.py
```

**What it does:**
1. Asks for your Supabase URL and Key
2. Lists all papers in your "Past Papers" bucket
3. Lets you choose which to convert
4. Downloads PDFs and converts them
5. Saves to `public/papers/`

**Features:**
- ✅ Extracts images from PDFs
- ✅ Detects tables
- ✅ Preserves question structure
- ✅ Applies text normalization

### Option B: Full Converter
Uses the Cambridge ICT algorithm.

```bash
python scripts/convert-from-supabase.py
```

**What it does:**
1. Uses Supabase Python client
2. Parses with CambridgeICTConverter
3. Maintains strict hierarchy (1 → a → i)

## 🔑 Step 3: Get Your Supabase Credentials

You'll need:
1. **Supabase URL**: `https://your-project.supabase.co`
2. **Anon Key**: Found in Project Settings → API

### Where to find them:
1. Go to https://supabase.com/dashboard
2. Select your project
3. Click "Settings" (gear icon)
4. Click "API"
5. Copy:
   - Project URL
   - anon/public key

## 🚀 Step 4: Run the Conversion

### Using Simple Converter:

```bash
# 1. Navigate to project
cd c:/Users/HP/Desktop/igcse-study-hub

# 2. Run converter
python scripts/convert-from-supabase-simple.py

# 3. Enter credentials when prompted
# Supabase URL: https://your-project.supabase.co
# Anon Key: your-anon-key-here

# 4. Choose papers to convert
# Type "all" to convert all papers
# Or type "1,2,3" to convert specific papers
```

### Example Session:

```
============================================================
Convert Papers from Supabase with Advanced Extraction
============================================================

Enter your Supabase URL: https://abc123.supabase.co
Enter your Supabase Anon Key: eyJhbGc...

Listing papers in Supabase...

Found 36 papers:
  1. 0417_s20_qp_11.pdf
  2. 0417_s20_qp_12.pdf
  3. 0417_s20_qp_13.pdf
  ...

Options:
  all
  1,2,3
  q

Your choice: all

============================================================
Converting: 0417_s20_qp_11.pdf
============================================================
Downloading: ICT 0417 Paper 1/May June 2020/0417_s20_qp_11.pdf
Downloaded 2456789 bytes
Saved to: public/papers/0417_s20_qp_11.json

...

============================================================
Converted 36/36 papers
Output: public/papers
============================================================
```

## ✅ Step 5: Verify the Conversion

Check that JSON files have data:

```powershell
# Check file sizes
Get-ChildItem public/papers/*.json | Select-Object Name, Length

# View a sample file
Get-Content public/papers/0417_s20_qp_11.json | Select-Object -First 50
```

**Good JSON should have:**
- `"questions": [...]` with actual questions
- `"totalMarks": 80`
- Question text without garbled spacing
- Proper hierarchy (main → subparts)

## 🎨 Step 6: Test the Interface

```bash
# Start dev server
npm run dev

# Open browser
# Go to: http://localhost:3000/practice/0417_s20_qp_11
```

**What you should see:**
- ✅ Clean question text (no "process in g")
- ✅ Proper question numbering (1, 1a, 1a(i))
- ✅ Checkboxes for MCQ questions
- ✅ Text inputs for short answers
- ✅ Text areas for essays
- ✅ Tables rendered properly
- ✅ Flag button for each question
- ✅ Timer and navigation sidebar

## 🐛 Troubleshooting

### Problem: "No papers found in Supabase"
**Solution:** Check your bucket structure:
- Bucket name should be: `Past Papers`
- Folder structure: `ICT 0417 Paper 1/Season Year/filename.pdf`

### Problem: "Failed to download"
**Solution:** 
- Verify your Supabase credentials
- Check bucket permissions (should be public or accessible with anon key)
- Try downloading one file manually from Supabase dashboard

### Problem: "Empty JSON files"
**Solution:**
- The PDF might be scanned images (no text layer)
- Try a different paper
- Check if PDF opens correctly

### Problem: "Garbled text in questions"
**Solution:**
- The QuestionRenderer already has text normalization
- If text is still garbled, the PDF extraction failed
- Try re-converting that specific paper

## 📊 Expected Output

After conversion, you should have:

```
public/papers/
├── 0417_s20_qp_11.json  (✅ 50-100 KB)
├── 0417_s20_qp_12.json  (✅ 50-100 KB)
├── 0417_s20_qp_13.json  (✅ 50-100 KB)
├── 0417_s21_qp_11.json  (✅ 50-100 KB)
...
└── sample_test.json     (✅ Keep this)
```

Each JSON file should contain:
- Paper metadata (year, season, variant)
- 8-12 main questions
- Subparts with proper hierarchy
- Clean, readable text
- Question types detected

## 🎯 Next Steps

Once papers are converted:

1. **Test one paper** - Make sure it displays correctly
2. **Check text quality** - Verify no garbled text
3. **Test all question types** - MCQ, text, essay, tables
4. **Deploy** - Push to production when ready

## 💡 Tips

- **Convert in batches** - Don't do all 36 at once, test with 3-5 first
- **Keep sample_test.json** - It's your reference for the correct format
- **Check file sizes** - Empty files are usually < 1 KB
- **Use "all" carefully** - Only after testing a few papers successfully

---

**Made with ❤️ by Bob - Your papers will look beautiful!**