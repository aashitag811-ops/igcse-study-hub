# View Past Papers Mode - PDF Setup Guide

## 📁 How to Organize Your PDF Files

The View Past Papers Mode now displays PDFs directly in a dual-pane layout. Here's how to set up your PDF files so the system can find them automatically.

## 🗂️ Required Folder Structure

Create this folder structure in your `public/` directory:

```
public/
└── pdfs/
    ├── 0417/  (ICT)
    │   ├── 0417_m20_qp_12.pdf
    │   ├── 0417_m20_ms_12.pdf
    │   ├── 0417_s21_qp_22.pdf
    │   ├── 0417_s21_ms_22.pdf
    │   └── ...
    ├── 0450/  (Business Studies)
    │   └── ...
    ├── 0455/  (Economics)
    │   └── ...
    ├── 0610/  (Biology)
    │   ├── 0610_m20_qp_22.pdf
    │   ├── 0610_m20_ms_22.pdf
    │   └── ...
    ├── 0620/  (Chemistry)
    │   └── ...
    └── 0625/  (Physics)
        └── ...
```

## 📝 File Naming Convention

**Format:** `{subjectCode}_{session}{year}_qp_{component}{variant}.pdf`

**Examples:**
- `0610_m20_qp_22.pdf` - Biology May 2020 Paper 2 Variant 2 (Question Paper)
- `0610_m20_ms_22.pdf` - Biology May 2020 Paper 2 Variant 2 (Marking Scheme)
- `0417_s21_qp_12.pdf` - ICT May/June 2021 Paper 1 Variant 2 (Question Paper)
- `0417_s21_ms_12.pdf` - ICT May/June 2021 Paper 1 Variant 2 (Marking Scheme)

## 🔤 Code Breakdown

### Subject Codes (4 digits)
- `0417` - Information and Communication Technology
- `0450` - Business Studies
- `0452` - Accounting
- `0455` - Economics
- `0457` - Global Perspectives
- `0500` - First Language English
- `0520` - French - Foreign Language
- `0549` - Hindi as a Second Language
- `0580` - Mathematics
- `0606` - Additional Mathematics
- `0610` - Biology
- `0620` - Chemistry
- `0625` - Physics

### Session Codes (1 letter)
- `m` - February/March
- `s` - May/June
- `w` - October/November

### Year (2 digits)
- `20` - 2020
- `21` - 2021
- `22` - 2022
- `23` - 2023
- `24` - 2024
- `25` - 2025

### Paper Type
- `qp` - Question Paper
- `ms` - Marking Scheme

### Component (1 digit)
- `1` - Paper 1 (Core MCQ)
- `2` - Paper 2 (Extended MCQ)
- `4` - Paper 4 (Extended Theory)
- `6` - Paper 6 (Alternative to Practical)

### Variant (1 digit)
- `1` - Variant 1
- `2` - Variant 2
- `3` - Variant 3

## 🚀 Quick Setup Steps

### Step 1: Create Folder Structure
```bash
# In your project root
cd public
mkdir pdfs
cd pdfs
mkdir 0417 0450 0452 0455 0457 0500 0520 0549 0580 0606 0610 0620 0625
```

### Step 2: Copy Your PDFs
From your `pastpapers` folder, copy PDFs into the appropriate subject folders:

**Example for Biology (0610):**
```bash
# Copy all Biology PDFs
cp "path/to/pastpapers/0610-Biology/*.pdf" public/pdfs/0610/
```

### Step 3: Verify File Names
Make sure all files follow the naming convention:
- ✅ `0610_m20_qp_22.pdf`
- ✅ `0610_m20_ms_22.pdf`
- ❌ `0610_m20_qp_2_2.pdf` (wrong format)
- ❌ `Biology_May_2020_Paper_2.pdf` (wrong format)

## 🎯 How the System Works

When a student selects a paper in the practice page:
1. They choose: Subject, Year, Session, Paper Component, Variant
2. System generates paper ID: `0610_m20_qp_22`
3. System constructs PDF paths:
   - QP: `/pdfs/0610/0610_m20_qp_22.pdf`
   - MS: `/pdfs/0610/0610_m20_ms_22.pdf`
4. PDFs display side-by-side in dual-pane viewer

## 📊 Example: Setting Up Biology Papers

If you have these files in `pastpapers/0610-Biology/`:
```
0610_m20_qp_22.pdf
0610_m20_ms_22.pdf
0610_s21_qp_22.pdf
0610_s21_ms_22.pdf
0610_w22_qp_22.pdf
0610_w22_ms_22.pdf
```

Copy them to:
```
public/pdfs/0610/0610_m20_qp_22.pdf
public/pdfs/0610/0610_m20_ms_22.pdf
public/pdfs/0610/0610_s21_qp_22.pdf
public/pdfs/0610/0610_s21_ms_22.pdf
public/pdfs/0610/0610_w22_qp_22.pdf
public/pdfs/0610/0610_w22_ms_22.pdf
```

## ✅ Testing

1. Navigate to: `http://localhost:3002/practice`
2. Select:
   - Subject: Biology 0610
   - Year: 2020
   - Session: February/March
   - Paper Component: Paper 2 (Extended MCQ)
   - Variant: Variant 2
3. Click "View Past Papers"
4. You should see the dual-pane PDF viewer with QP on left, MS on right

## 🔧 Troubleshooting

**PDF not loading?**
- Check file exists in correct folder: `public/pdfs/{subjectCode}/{paperId}.pdf`
- Verify file name matches exactly (case-sensitive)
- Check browser console for 404 errors
- Ensure PDF is not corrupted

**Wrong paper showing?**
- Verify the paper ID in the URL matches your file name
- Check that QP and MS files have matching names (except `qp` vs `ms`)

## 📝 Batch Renaming Script

If your files have different names, use this PowerShell script to rename them:

```powershell
# Example: Rename Biology papers
cd "public/pdfs/0610"

# If files are named like: Biology_May_2020_Paper_2_Variant_2_QP.pdf
Get-ChildItem *.pdf | ForEach-Object {
    $newName = $_.Name -replace 'Biology_May_2020_Paper_2_Variant_2_QP', '0610_m20_qp_22'
    $newName = $newName -replace 'Biology_May_2020_Paper_2_Variant_2_MS', '0610_m20_ms_22'
    Rename-Item $_.FullName $newName
}
```

## 🎓 Ready to Use!

Once your PDFs are organized, the View Past Papers Mode will automatically:
- ✅ Display PDFs side-by-side
- ✅ Allow toggling QP/MS visibility
- ✅ Provide clean, professional study interface
- ✅ Work with all 13 subjects
- ✅ Support all years, sessions, and variants

No JSON conversion needed - just organize your PDFs and go! 🚀