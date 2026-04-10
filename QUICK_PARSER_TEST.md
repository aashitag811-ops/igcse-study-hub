# 🚀 Quick Parser Testing - Start Here!

## What We're Testing
You shared 4 different parser approaches. Let's test them all on the March 2021 paper to see which works best.

## ⚡ Quick Start (5 Minutes)

### Step 1: Get the PDF
You need the actual PDF file for `0417_m21_qp_12` (March 2021, Paper 12).

**Option A: Download from Cambridge**
- Go to your Supabase storage
- Find `0417_m21_qp_12.pdf`
- Download it to your Desktop

**Option B: Use Any ICT Paper**
If you don't have March 2021, use any ICT Paper 1 PDF you have.

### Step 2: Install Python Dependencies
```powershell
# Open PowerShell in your project folder
cd C:\Users\HP\Desktop\igcse-study-hub

# Install required packages
pip install pdfplumber PyMuPDF
```

### Step 3: Run the Test
```powershell
# Replace with your actual PDF path
python scripts/test-all-parsers.py "C:\Users\HP\Desktop\0417_m21_qp_12.pdf"
```

### Step 4: Review Results
The script creates a folder like `test_results_0417_m21_qp_12/` with:
- `0417_m21_qp_12_v1.json` - Basic parser output
- `0417_m21_qp_12_v2.json` - Image-enhanced parser
- `0417_m21_qp_12_v3.json` - Criticism-aware parser
- `0417_m21_qp_12_v4.json` - Command-word parser
- `v2_assets/images/` - Extracted images (if any)
- `v4_assets/images/` - Extracted images (if any)

---

## 📊 What to Check

Open each JSON file and check:

### ✅ Question Detection
- [ ] Did it find all questions? (Should be ~8-10 questions)
- [ ] Are question numbers correct? (1, 2, 3, etc.)
- [ ] Are subparts detected? (a, b, c, i, ii, iii)

### ✅ Text Quality
- [ ] Is question text readable?
- [ ] Are there weird spacing issues? ("process in g" instead of "processing")
- [ ] Is copyright text removed?

### ✅ Marks Extraction
- [ ] Does each question have correct marks? [1], [2], [4], etc.
- [ ] Total marks should be ~80

### ✅ Type Detection
- [ ] MCQ questions marked as "mcq"?
- [ ] Tick tables marked correctly?
- [ ] Word bank questions identified?

### ✅ Images (V2 & V4 only)
- [ ] Were images extracted?
- [ ] Are they linked to correct questions?
- [ ] Are they readable?

---

## 🎯 Quick Comparison

After running the test, you'll see output like:

```
======================================================================
COMPARISON SUMMARY
======================================================================
Version         Questions    Total Marks  Features
----------------------------------------------------------------------
V1-Basic        8            80           
V2-Images       8            80           3 imgs
V3-Criticism    8            80           validation
V4-Commands     8            80           commands
```

**Tell me:**
1. Which version found the most questions?
2. Which version has the cleanest text?
3. Which version detected types best?
4. Do you want image extraction?
5. Do you want validation features?

---

## 🔍 Example: What Good Output Looks Like

```json
{
  "version": "V1-Basic",
  "paperId": "test_v1",
  "title": "ICT Paper 1 - Basic Parser",
  "duration": 120,
  "totalMarks": 80,
  "questions": [
    {
      "id": "q1",
      "text": "Falyaz uses a diary to record his appointments...",
      "type": "text",
      "marks": 2,
      "subparts": []
    },
    {
      "id": "q2",
      "text": "Circle two items that are input devices...",
      "type": "mcq",
      "marks": 2,
      "subparts": []
    }
  ]
}
```

---

## 🐛 Troubleshooting

### Error: "pdfplumber not found"
```powershell
pip install pdfplumber
```

### Error: "fitz not found"
```powershell
pip install PyMuPDF
```

### Error: "File not found"
Check your PDF path:
```powershell
# Use full path with quotes
python scripts/test-all-parsers.py "C:\Users\HP\Desktop\paper.pdf"
```

### No images extracted
- V1 and V3 don't extract images (by design)
- V2 and V4 extract images to `v2_assets/images/` and `v4_assets/images/`
- Check those folders

---

## 📝 Report Back

After testing, tell me:

**Parser Accuracy:**
- V1 found ___ questions
- V2 found ___ questions  
- V3 found ___ questions
- V4 found ___ questions

**Text Quality:**
- Best text: V___
- Worst text: V___

**Features You Want:**
- [ ] Image extraction (V2/V4)
- [ ] Brand name validation (V3)
- [ ] Command word detection (V4)
- [ ] Format checking (V3)

**Your Choice:**
"I want to use V___ as the base parser because ___________"

---

## 🎬 What Happens Next

Based on your feedback, I'll:

1. **Take the best parser** (the one you choose)
2. **Add features you want** from other versions
3. **Integrate with current UI** (keep all existing features)
4. **Test on March 2021 paper** in the actual interface
5. **Deploy if successful**

---

## 💡 Pro Tips

1. **Test with a paper you know well** - easier to spot errors
2. **Check the first 2-3 questions carefully** - if those are good, rest likely is too
3. **Don't worry about perfect** - we can fix issues after choosing base parser
4. **Images are optional** - current system works without them

---

## ⏱️ Time Estimate

- Installing dependencies: 2 minutes
- Running test: 1 minute
- Reviewing results: 5 minutes
- **Total: ~8 minutes**

Ready? Run the test and report back! 🚀