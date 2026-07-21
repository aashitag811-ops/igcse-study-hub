# Unified MCQ Parser System - Complete Guide

## 🎯 Overview

This guide documents the **Unified MCQ Parsing Pipeline** for Cambridge IGCSE papers (2010-2025). The system processes Biology, Chemistry, Physics, Economics, and Accounting MCQ papers automatically.

## 📁 System Architecture

```
[Raw MCQ PDF] ──► [Subject Filter Config] ──► [Regex Tokenizer] ──► [Database JSON]
```

### Core Components

1. **`subject_config.py`** - Subject-specific rules and configurations
2. **`mark_scheme_parser.py`** - Extracts answer keys from mark schemes
3. **`unified_mcq_parser.py`** - Main parsing engine
4. **`batch_parser.py`** - Batch processing for multiple papers

## 🔧 Component Details

### 1. Subject Configuration (`subject_config.py`)

Defines rules for each subject:

```python
SUBJECT_RULES = {
    "0610": {  # Biology
        "name": "Biology",
        "total_questions": 40,
        "core_paper": "1",      # Paper 1 = Core
        "extended_paper": "2",   # Paper 2 = Extended
        "time_limit": 2700,      # 45 minutes
        "has_diagrams": True
    },
    "0455": {  # Economics
        "name": "Economics",
        "total_questions": 30,
        "core_paper": "1",
        "extended_paper": "1",   # No separate extended
        "time_limit": 2700,
        "has_diagrams": False
    }
}
```

**Key Features:**
- Paper code parsing: `0610_m20_qp_22` → metadata
- Session mapping: `m` = Feb/March, `s` = May/June, `w` = Oct/Nov
- Tier detection: Paper 1 = Core, Paper 2 = Extended

### 2. Mark Scheme Parser (`mark_scheme_parser.py`)

Handles two distinct mark scheme layouts:

#### Layout Type A: Matrix Grid (2010-2017)
```
1  A      11  C      21  D      31  B
2  B      12  A      22  A      32  C
3  D      13  B      23  C      33  A
```

#### Layout Type B: Single Column (2018-2025)
```
Question Number    Key
      1             A
      2             C
      3             D
```

**Usage:**
```python
from mark_scheme_parser import parse_mark_scheme

answer_key = parse_mark_scheme("0610_m20_ms_22.pdf", expected_questions=40)
# Returns: {"1": "A", "2": "B", "3": "D", ...}
```

### 3. Unified Parser (`unified_mcq_parser.py`)

Main parsing engine with 4-step process:

#### Step 1: Parse Mark Scheme
Extracts answer keys using `mark_scheme_parser.py`

#### Step 2: Extract Images (if applicable)
- Uses PyMuPDF (fitz) for coordinate-based extraction
- Saves images to `/public/images/{subject_code}/`
- Tracks bounding boxes for question matching

#### Step 3: Parse Questions
Uses regex patterns to extract:
- **Question Number Anchor:** `^([1-3][0-9]|40)\s+`
- **Option Blocks:** `^A\s+`, `^B\s+`, `^C\s+`, `^D\s+`
- **Footer Filtering:** Ignores "Turn over", "© UCLES", etc.

#### Step 4: Merge Data
Combines questions, options, images, and answer keys into final JSON

**Usage:**
```python
from unified_mcq_parser import parse_paper

data = parse_paper(
    qp_pdf="0610_m20_qp_22.pdf",
    ms_pdf="0610_m20_ms_22.pdf",
    output_dir="../public/papers"
)
```

### 4. Batch Parser (`batch_parser.py`)

Processes multiple papers automatically:

```bash
# Parse all Biology papers
python batch_parser.py /path/to/pdfs --subjects 0610

# Parse all MCQ subjects
python batch_parser.py /path/to/pdfs --subjects 0610 0620 0625 0455

# Force reprocess existing files
python batch_parser.py /path/to/pdfs --force

# Generate processing report
python batch_parser.py /path/to/pdfs --report
```

## 📊 Output Format

The parser generates JSON files with this structure:

```json
{
  "paperCode": "0610_m20_qp_22",
  "paperName": "Biology Paper 2 (Extended) - Feb/March 2020",
  "subject": "Biology",
  "subjectCode": "0610",
  "year": 2020,
  "session": "Feb/March",
  "variant": 2,
  "tier": "Extended",
  "totalQuestions": 40,
  "timeLimit": 2700,
  "questions": [
    {
      "questionNumber": 1,
      "questionText": "Which process provides an organism with energy?",
      "options": {
        "A": "excretion",
        "B": "nutrition",
        "C": "respiration",
        "D": "sensitivity"
      },
      "correctAnswer": "C",
      "hasImage": false,
      "imagePath": null
    }
  ]
}
```

## 🔍 Regex Patterns Explained

### Question Number Detection
```regex
^([1-3][0-9]|40)\s+
```
- `^` - Start of line
- `([1-3][0-9]|40)` - Numbers 1-40
- `\s+` - One or more spaces

### Option Detection
```regex
^([A-D])\s+(.+)$
```
- `^([A-D])` - Letter A, B, C, or D at start
- `\s+` - Spaces
- `(.+)$` - Option text until end of line

### Footer Patterns (to ignore)
```regex
^\[Turn over$
^© UCLES
^\d{4}/\d{2}/[A-Z]/\d{2}$  # Paper codes
```

## 🖼️ Image Extraction Logic

For subjects with diagrams (Biology, Chemistry, Physics):

1. **Extract all images** from PDF using PyMuPDF
2. **Get bounding box coordinates** (x0, y0, x1, y1)
3. **Save images** to `/public/images/{subject_code}/`
4. **Match to questions** using Y-coordinate heuristics:
   - If image Y-coordinate is between question stem and Option A
   - Assign image to that question

## 📋 Subject-Specific Rules

### Sciences (Biology, Chemistry, Physics)
- **Questions:** 40 MCQs
- **Time:** 45 minutes (2700 seconds)
- **Papers:** Core (Paper 1) and Extended (Paper 2)
- **Diagrams:** Yes
- **Variants:** 1, 2, 3 (different time zones)

### Economics
- **Questions:** 30 MCQs
- **Time:** 45 minutes
- **Papers:** Paper 1 only (no Core/Extended split)
- **Diagrams:** No
- **Variants:** 1, 2, 3

### Accounting (0452)
- **Questions:** 35 MCQs
- **Time:** 45 minutes
- **Papers:** Paper 1 only
- **Diagrams:** No
- **Note:** Syllabus changed significantly - verify format

## 🚀 Quick Start

### 1. Install Dependencies
```bash
cd scripts
pip install -r requirements.txt
```

Required packages:
- `pdfplumber` - Text extraction
- `PyMuPDF` (fitz) - Image extraction
- `Pillow` - Image processing

### 2. Parse a Single Paper
```bash
python unified_mcq_parser.py 0610_m20_qp_22.pdf 0610_m20_ms_22.pdf
```

### 3. Batch Process Multiple Papers
```bash
# Parse all Biology papers in a directory
python batch_parser.py /path/to/pdfs --subjects 0610

# Parse all MCQ subjects
python batch_parser.py /path/to/pdfs --subjects 0610 0620 0625 0455
```

### 4. Test Configuration
```bash
python subject_config.py
```

## 🔧 Troubleshooting

### Common Issues

**1. Missing Mark Scheme**
```
⚠ Missing mark scheme for: 0610_m20_qp_22.pdf
```
**Solution:** Ensure MS file exists with matching name: `0610_m20_ms_22.pdf`

**2. Wrong Question Count**
```
Expected 40 questions, got 38
```
**Solution:** Check for:
- Page breaks splitting questions
- Footer text being parsed as questions
- Missing question numbers in PDF

**3. Image Extraction Fails**
```
Error extracting images
```
**Solution:** 
- Verify PDF is not corrupted
- Check if subject actually has diagrams
- Ensure write permissions for `/public/images/`

**4. Invalid Answer Key**
```
Warning: Missing question numbers: [5, 12, 23]
```
**Solution:**
- Check mark scheme PDF quality
- Verify layout type detection
- Manually inspect mark scheme format

## 📈 Performance Tips

1. **Use batch processing** for multiple papers
2. **Skip existing files** with `--skip-existing` flag
3. **Process by subject** to organize outputs
4. **Generate reports** to track errors

## 🎓 Best Practices

1. **Always validate** parsed data before deployment
2. **Keep PDFs organized** by subject and year
3. **Use consistent naming** for QP and MS files
4. **Test with sample papers** before batch processing
5. **Review error logs** after batch runs

## 📝 File Naming Convention

**Question Papers:**
```
{subject}_{session}{year}_qp_{paper}{variant}.pdf
Example: 0610_m20_qp_22.pdf
```

**Mark Schemes:**
```
{subject}_{session}{year}_ms_{paper}{variant}.pdf
Example: 0610_m20_ms_22.pdf
```

**Output JSON:**
```
{subject}_{session}{year}_qp_{paper}{variant}.json
Example: 0610_m20_qp_22.json
```

## 🔮 Future Enhancements

1. **OCR Support** for scanned PDFs
2. **Better image matching** using ML
3. **Multi-language support** for non-English papers
4. **Automatic quality checking** with confidence scores
5. **Web interface** for manual corrections

## 📚 Additional Resources

- [Cambridge IGCSE Syllabus](https://www.cambridgeinternational.org/programmes-and-qualifications/cambridge-igcse/)
- [PDF Parsing with Python](https://realpython.com/pdf-python/)
- [Regex Tutorial](https://regexone.com/)

---

**Made with Bob** 🤖

Last Updated: 2026-05-27