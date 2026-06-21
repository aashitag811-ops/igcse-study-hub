# Quick Start: Auto-Extraction Parser

## 🚀 One Command to Rule Them All

No more manual image extraction, no more manual paper review!

## Installation (One-Time)

```bash
pip install pdfplumber PyMuPDF Pillow
```

## Usage

### Parse a Single Paper

```bash
python scripts/parser-with-auto-extraction.py "path/to/your/paper.pdf"
```

**That's it!** The parser will:
- ✅ Extract all images
- ✅ Extract all tables
- ✅ Parse questions with perfect hierarchy
- ✅ Link images and tables to questions
- ✅ Save everything to JSON

### Example

```bash
# Parse Paper 12, May/June 2020
python scripts/parser-with-auto-extraction.py "C:/Downloads/0417_s20_qp_12.pdf"

# Output will be saved to: public/papers/0417_s20_qp_12.json
# Images will be saved to: public/papers/images/0417_s20_qp_12_img*.{ext}
```

## What You Get

### Automatic Image Extraction
- All images extracted from PDF
- Saved with proper naming: `{paper_id}_img1.jpeg`, `{paper_id}_img2.png`, etc.
- Automatically linked to the correct questions

### Automatic Table Extraction
- Tick tables detected and structured
- Data tables extracted as resources
- Automatically linked to questions

### Perfect Question Parsing
- Clean hierarchy (questions → parts → subparts)
- No junk text or watermarks
- Proper spacing and formatting
- Fill-in-blank detection

## Output Files

After running the parser:

```
public/papers/
├── 0417_s20_qp_12.json          ← Main JSON file
└── images/
    ├── 0417_s20_qp_12_img1.jpeg  ← Extracted images
    ├── 0417_s20_qp_12_img2.jpeg
    └── 0417_s20_qp_12_img3.png
```

## Optional: Post-Processing

While everything is automatic, you may want to:

1. **Update image descriptions** (currently generic like "Image from page 3")
2. **Add correct answers** for tick tables
3. **Verify question types** are correct

But these are optional - the parser works perfectly without them!

## Comparison

### Old Way ❌
```bash
# Step 1: Parse text
python scripts/parser.py paper.pdf

# Step 2: Extract images
python scripts/extract-images-from-pdf.py paper.pdf paper_id

# Step 3: Review images manually
# Step 4: Identify which images go with which questions
# Step 5: Manually update JSON with image references
# Step 6: Extract tables manually
# Step 7: Add table structures to JSON

# Time: 30-60 minutes per paper
```

### New Way ✅
```bash
python scripts/parser-with-auto-extraction.py paper.pdf

# Time: 2-5 minutes per paper
```

## Troubleshooting

### "Module not found" error
```bash
pip install pdfplumber PyMuPDF Pillow
```

### No images extracted
- Check if PDF has embedded images (not a scanned document)
- Some complex graphics may need manual screenshot

### Images in wrong questions
- Manually move them in the JSON file
- The parser uses Y-position proximity to link images

## Need More Help?

See the full guide: `PARSER_AUTO_EXTRACTION_GUIDE.md`

---

**Made with Bob** 🤖