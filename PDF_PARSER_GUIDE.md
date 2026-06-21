# ICT PDF Parser - Usage Guide

## 📋 Overview

The `ict-pdf-parser.py` script converts Cambridge IGCSE ICT Paper 1 PDFs into the JSON format used by the exam interface.

## 🚀 Quick Start

### 1. Install Dependencies

```bash
pip install pdfplumber
```

### 2. Run the Parser

```bash
python scripts/ict-pdf-parser.py path/to/paper.pdf
```

### 3. Output

Creates a JSON file with the same name as the PDF:
- Input: `0417_s24_qp_12.pdf`
- Output: `0417_s24_qp_12.json`

## 📊 Features

### Automatic Detection
- ✅ **Question hierarchy**: Main → Part (a,b,c) → Sub-part (i,ii,iii)
- ✅ **Marks extraction**: Finds `[2]`, `[4]`, etc.
- ✅ **Question types**: text, mcq, paired_list, numbered_list, selection_table, word_bank
- ✅ **Text normalization**: Fixes PDF extraction errors
- ✅ **Copyright removal**: Strips UCLES copyright text

### Text Normalization
Automatically fixes:
- `process in g` → `processing`
- `us in g` → `using`
- `d at a` → `data`
- `in form at i on` → `information`
- Multiple spaces → single space
- And 10+ more common errors

### Question Type Detection

**MCQ (Multiple Choice)**
- Triggers: "which of the following", "select", "choose"
- Output: `"type": "mcq"`

**Numbered List**
- Triggers: "state two", "give two", "identify two"
- Output: `"type": "numbered_list"`

**Paired List**
- Triggers: "describe" + "method"
- Output: `"type": "paired_list"`

**Selection Table**
- Triggers: "tick", "✓", "circle" + table structure
- Output: `"type": "selection_table"`

**Word Bank**
- Triggers: "from the list", "word bank"
- Output: `"type": "word_bank"`

## 📝 Output Format

```json
{
  "id": "0417_s24_qp_12",
  "subject": "ICT 0417",
  "year": 2024,
  "season": "Summer",
  "variant": 1,
  "totalMarks": 50,
  "duration": 75,
  "questions": [
    {
      "number": "1",
      "text": "Main question text",
      "marks": null,
      "subparts": [
        {
          "number": "a",
          "text": "Part (a) text",
          "marks": 2,
          "type": "text",
          "subparts": []
        }
      ]
    }
  ]
}
```

## 🔧 Advanced Usage

### Batch Processing

Process multiple PDFs:

```bash
# Windows PowerShell
Get-ChildItem *.pdf | ForEach-Object { python scripts/ict-pdf-parser.py $_.FullName }

# Linux/Mac
for file in *.pdf; do python scripts/ict-pdf-parser.py "$file"; done
```

### Custom Output Location

```python
# Modify the script to save to specific folder
output_path = f"public/papers/{Path(pdf_path).stem}.json"
```

## 🐛 Troubleshooting

### Issue: "Import pdfplumber could not be resolved"
**Solution:** Install pdfplumber
```bash
pip install pdfplumber
```

### Issue: Text extraction is garbled
**Solution:** The normalizeText() function should fix most issues. If not, add more patterns to the fixes list.

### Issue: Question hierarchy is wrong
**Solution:** Check the regex patterns for main questions, parts, and subparts. Adjust spacing requirements.

### Issue: Marks not detected
**Solution:** Ensure marks are in format `[X]` with square brackets.

### Issue: Wrong question type
**Solution:** Update the `detect_question_type()` function with better keywords.

## 📚 Examples

### Example 1: Basic Paper

```bash
python scripts/ict-pdf-parser.py papers/0417_s24_qp_12.pdf
```

Output:
```
Parsing papers/0417_s24_qp_12.pdf...
✅ Successfully parsed!
📄 Output: 0417_s24_qp_12.json
📊 Total marks: 50
❓ Questions: 8
```

### Example 2: With Errors

If parsing fails, you'll see:
```
❌ Error: [error message]
[stack trace]
```

## 🎯 Best Practices

### 1. Verify Output
Always check the generated JSON:
```bash
# View the JSON
cat 0417_s24_qp_12.json

# Or open in editor
code 0417_s24_qp_12.json
```

### 2. Test in Browser
Copy to public/papers and test:
```bash
cp 0417_s24_qp_12.json public/papers/
# Then visit: http://localhost:3000/practice/0417_s24_qp_12
```

### 3. Manual Fixes
If automatic detection fails, manually edit the JSON:
- Fix question types
- Add missing marks
- Correct text errors
- Add images/tables if needed

### 4. Add Images
If question has images:
1. Extract image from PDF
2. Save to `public/images/papers/`
3. Add to JSON:
```json
"image": {
  "url": "/images/papers/diagram.png",
  "alt": "System diagram",
  "caption": "Figure 1"
}
```

### 5. Add Tables
If question has comparison tables:
```json
"table": {
  "headers": ["Feature", "Option A", "Option B"],
  "rows": [
    ["Speed", "Fast", "Slow"],
    ["Cost", "$100", "$50"]
  ]
}
```

## 🔄 Workflow

### Complete Paper Conversion Process

1. **Get PDF**
   ```bash
   # Download from Supabase or local file
   ```

2. **Parse PDF**
   ```bash
   python scripts/ict-pdf-parser.py paper.pdf
   ```

3. **Review JSON**
   ```bash
   code paper.json
   # Check for errors, fix if needed
   ```

4. **Add Images/Tables**
   ```bash
   # Extract images from PDF
   # Add image/table data to JSON
   ```

5. **Copy to Public**
   ```bash
   cp paper.json public/papers/
   ```

6. **Test in Browser**
   ```bash
   npm run dev
   # Visit: http://localhost:3000/practice/paper
   ```

7. **Fix Issues**
   - If text is wrong, update normalization
   - If type is wrong, update detection
   - If structure is wrong, check regex patterns

8. **Commit**
   ```bash
   git add public/papers/paper.json
   git commit -m "Add paper: 0417_s24_qp_12"
   ```

## 📖 Reference Code

The parser is based on the reference code you provided, with enhancements:
- Better text normalization
- Automatic type detection
- Copyright removal
- Proper hierarchy handling
- Error handling

## 🎉 Success Criteria

A successfully parsed paper should:
- ✅ Have all questions with correct numbers
- ✅ Have proper hierarchy (main → part → subpart)
- ✅ Have correct marks for each part
- ✅ Have appropriate question types
- ✅ Have clean, readable text (no spacing errors)
- ✅ Have no copyright text
- ✅ Total marks match the paper

## 🚀 Next Steps

After parsing papers:
1. Test each paper in the browser
2. Report any parsing errors
3. Update parser to fix common issues
4. Build a library of parsed papers
5. Deploy to production

---

**Created:** 2026-04-10
**Version:** 1.0
**Status:** ✅ Ready to use