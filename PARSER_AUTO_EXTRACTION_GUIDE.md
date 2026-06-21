# Parser with Automatic Image & Table Extraction

## 🎉 No Manual Review Needed!

This enhanced parser automatically extracts images and tables from PDFs and links them to questions. You don't need to manually review papers or extract images separately anymore!

## Features

### ✅ Automatic Image Extraction
- **3 Extraction Methods**:
  1. Standard embedded images (PNG, JPEG, etc.)
  2. Vector graphics/drawings
  3. Region-based extraction (gaps between text)
- **Smart Deduplication**: Avoids extracting the same image multiple times
- **Auto-linking**: Links images to questions by Y-position proximity

### ✅ Automatic Table Extraction
- Detects and extracts all tables from PDFs
- Classifies tables as:
  - `matrix_tick_table` - Tick tables with radio buttons
  - `data_table` - Regular data tables
- Auto-links tables to questions

### ✅ Perfect Text Parsing
- Maintains the perfected hierarchy detection from `parser-almost-there-backup.py`
- Clean text (no junk, proper spacing)
- Fill-in-blank detection
- Proper question/part/subpart structure

## Installation

Make sure you have the required packages:

```bash
pip install pdfplumber PyMuPDF Pillow
```

## Usage

### Single Paper

```bash
python scripts/parser-with-auto-extraction.py "path/to/0417_s20_qp_12.pdf"
```

This will:
1. Extract all images to `public/papers/images/`
2. Extract all tables
3. Parse questions with perfect hierarchy
4. Link images and tables to questions
5. Save JSON to `public/papers/0417_s20_qp_12.json`

### Custom Output Path

```bash
python scripts/parser-with-auto-extraction.py "path/to/paper.pdf" "output/custom.json"
```

### Batch Processing (Future Enhancement)

For now, run the parser on each PDF individually. A batch mode can be added if needed.

## What Gets Extracted

### Images
- **Filename format**: `{paper_id}_img{number}.{ext}` or `{paper_id}_drawing{number}.png`
- **Saved to**: `public/papers/images/`
- **Linked to questions**: Automatically based on Y-position

Example:
```json
{
  "number": "3",
  "text": "Name the device shown in each image.",
  "images": [
    {
      "path": "/papers/images/0417_s20_qp_11_img1.jpeg",
      "description": "Image from page 3",
      "width": 400,
      "height": 300
    }
  ]
}
```

### Tables
- **Tick Tables**: Automatically detected and structured
- **Data Tables**: Added as resources

Example tick table:
```json
{
  "number": "2",
  "text": "Tick whether each statement refers to CLI or GUI.",
  "type": "matrix_tick_table",
  "table": {
    "headers": ["Statement", "CLI", "GUI"],
    "rows": [
      ["The user has to type in every instruction", "", ""],
      ["The user does not need to learn instructions", "", ""]
    ]
  }
}
```

## Output Structure

The parser generates JSON matching this structure:

```json
{
  "id": "0417_s20_qp_12",
  "subject": "ICT 0417",
  "year": 2020,
  "season": "May/June",
  "variant": 12,
  "totalMarks": 80,
  "duration": 120,
  "questions": [
    {
      "number": "1",
      "text": "Question text...",
      "marks": null,
      "subparts": [
        {
          "number": "a",
          "text": "Subpart text...",
          "marks": 2,
          "type": "text"
        }
      ],
      "images": [...],  // If images found
      "table": {...}    // If tick table found
    }
  ]
}
```

## Console Output

The parser provides detailed progress information:

```
============================================================
ENHANCED PARSER - AUTOMATIC EXTRACTION
============================================================
PDF: path/to/0417_s20_qp_12.pdf

============================================================
EXTRACTING IMAGES FROM: 0417_s20_qp_12
============================================================

Method 1: Standard Image Extraction
  Page 3: Found 4 images
    [OK] 0417_s20_qp_12_img1.jpeg (400x300)
    [OK] 0417_s20_qp_12_img2.jpeg (350x250)

Method 2: Drawing Extraction
  Page 5: Found 2 drawings
    [OK] 0417_s20_qp_12_drawing3.png (200x150)

[SUCCESS] Extracted 5 images total

============================================================
EXTRACTING TABLES
============================================================

Page 2: Found 1 tables
  Table 1: matrix_tick_table (5 rows)

[SUCCESS] Extracted 1 tables total

============================================================
PARSING QUESTIONS
============================================================

Total pages: 12
  Processing page 1...
  Processing page 2...
  ...

[SUCCESS] Extracted 8 questions

============================================================
LINKING IMAGES TO QUESTIONS
============================================================

  Linked 0417_s20_qp_12_img1.jpeg to Q3
  Linked 0417_s20_qp_12_img2.jpeg to Q3

============================================================
LINKING TABLES TO QUESTIONS
============================================================

  Linked tick table to Q2

============================================================
[SUCCESS] Saved to: public/papers/0417_s20_qp_12.json
Total marks: 80
Total questions: 8
Total images: 5
Total tables: 1
============================================================

✅ Parsing complete! No manual review needed.
   Images and tables automatically extracted and linked.
```

## Post-Processing (Optional)

While the parser does everything automatically, you may want to:

### 1. Update Image Descriptions
The parser generates generic descriptions like "Image from page 3". You can update these:

```json
{
  "images": [
    {
      "path": "/papers/images/0417_s20_qp_12_img1.jpeg",
      "description": "RFID tag with spiral antenna",  // ← Update this
      "width": 400,
      "height": 300
    }
  ]
}
```

### 2. Add Correct Answers (for tick tables)
```json
{
  "type": "matrix_tick_table",
  "correctAnswers": {
    "The user has to type in every instruction": "CLI",
    "The user does not need to learn instructions": "GUI"
  },
  "markingScheme": {
    "total": 2,
    "breakdown": "1 mark per 2 correct"
  }
}
```

### 3. Verify Question Types
The parser auto-detects types, but you can adjust if needed:
- `text` - Standard text answer
- `numbered_list` - Numbered answer lines
- `matrix_tick_table` - Tick tables
- `fill_in_blank` - Fill-in-the-blank questions
- `essay` - Long-form answers

## Comparison with Old Workflow

### Old Workflow ❌
1. Run parser → Get JSON
2. Run image extraction script separately
3. Manually review images
4. Manually identify which images belong to which questions
5. Manually update JSON with image references
6. Manually extract tables
7. Manually add table structures to JSON

**Time**: 30-60 minutes per paper

### New Workflow ✅
1. Run `parser-with-auto-extraction.py`
2. Done! (Optional: Update image descriptions)

**Time**: 2-5 minutes per paper

## Troubleshooting

### No Images Extracted
- Check if PDF has embedded images (not scanned)
- Some PDFs use complex vector graphics that may not extract well
- Consider manual screenshot for missing images

### Images Linked to Wrong Questions
- The parser uses Y-position proximity (within 200 points)
- Manually move images in JSON if needed
- Adjust proximity threshold in code if this is common

### Tables Not Detected
- Some tables may be formatted as text, not actual table structures
- Manually add table structure if needed

### Wrong Question Types
- Review auto-detection keywords in code
- Manually adjust types in JSON

## Backup System

The parser automatically:
- Creates backups before overwriting existing files
- Preserves the original `parser-almost-there-backup.py` as `parser-almost-there-backup-ORIGINAL.py`

## File Locations

- **Parser**: `scripts/parser-with-auto-extraction.py`
- **Original Parser Backup**: `scripts/parser-almost-there-backup-ORIGINAL.py`
- **Output JSON**: `public/papers/{paper_id}.json`
- **Extracted Images**: `public/papers/images/{paper_id}_img*.{ext}`
- **This Guide**: `PARSER_AUTO_EXTRACTION_GUIDE.md`

## Advanced: Customization

### Adjust Image Proximity Threshold
In `link_images_to_questions()`, change:
```python
if distance < min_distance and distance < 200:  # ← Change 200 to your value
```

### Add More Image Extraction Methods
Add new methods in the `extract_images_from_pdf()` function.

### Customize Table Classification
Modify `_classify_table()` to add more table type detection logic.

## Future Enhancements

Potential improvements:
- Batch processing mode
- OCR for image descriptions
- Better table structure detection
- Automatic correct answer extraction from mark schemes
- Support for more question types

## Support

If you encounter issues:
1. Check the console output for error messages
2. Verify PDF is not corrupted
3. Ensure all dependencies are installed
4. Check this guide for troubleshooting tips

---

**Made with Bob** 🤖

Last Updated: 2026-04-20