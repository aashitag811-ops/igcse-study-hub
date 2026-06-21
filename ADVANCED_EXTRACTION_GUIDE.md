# Advanced PDF Extraction Guide

This guide explains how to use the advanced PDF extractor that handles images, formulas, spacing, and intelligent question type detection.

## Features

✅ **Image Extraction** - Extracts and embeds images as base64 data URLs
✅ **Smart Spacing** - Fixes merged words like "Explainwhatismeant" → "Explain what is meant"
✅ **MCQ Detection** - Automatically detects "Circle/Tick" questions and creates button options
✅ **List Answer Detection** - Detects "1 2 3" patterns and creates multiple answer slots
✅ **Formula Handling** - Detects formula regions (basic implementation)
✅ **Copyright Removal** - Strips Cambridge copyright notices and page navigation
✅ **Hierarchy Preservation** - Maintains question structure (1, (a), (i))

## Installation

```bash
# Install required packages
pip install -r scripts/requirements-advanced.txt
```

## Usage

### Extract a Single Paper

```bash
python scripts/advanced-pdf-extractor.py path/to/paper.pdf
```

This will:
1. Extract all text and images from the PDF
2. Fix spacing issues automatically
3. Detect question types (text, MCQ, list)
4. Extract MCQ options
5. Embed images as base64
6. Save to `public/papers/[filename].json`

### Example Output

```json
{
  "metadata": {
    "subject": "ICT",
    "code": "0417",
    "year": 2025,
    "season": "May/June",
    "variant": "12",
    "duration": 90,
    "totalMarks": 80
  },
  "questions": [
    {
      "number": "1",
      "text": "Explain what is meant by the term hacking.",
      "marks": 2,
      "type": "text"
    },
    {
      "number": "2",
      "text": "Tick TWO benefits of parallel implementation.",
      "marks": 2,
      "type": "mcq",
      "maxSelections": 2,
      "options": [
        "Direct",
        "Parallel",
        "Pilot",
        "All benefits are immediate"
      ]
    },
    {
      "number": "3",
      "text": "Describe three measures to protect data.",
      "marks": 3,
      "type": "list",
      "listCount": 3
    },
    {
      "number": "4",
      "text": "Study the diagram below:",
      "marks": 4,
      "type": "text",
      "hasImage": true,
      "image": "data:image/png;base64,iVBORw0KGgoAAAANS..."
    }
  ]
}
```

## How It Works

### 1. Image Extraction

The extractor:
- Scans each PDF page for embedded images
- Extracts image data using pdfplumber
- Converts to PNG format
- Encodes as base64 data URL
- Embeds in the question JSON

### 2. Text Spacing Fix

Detects merged words using patterns:
- `camelCase` → `camel Case`
- `word123` → `word 123`
- Common word boundaries (the, and, for, etc.)

### 3. MCQ Detection

Looks for keywords:
- "Tick one", "Tick two"
- "Circle the correct answer"
- "Select", "Choose"

Then extracts options from:
- Bullet points (•, ○)
- Letter lists (A. B. C.)
- Simple line-by-line lists

### 4. List Answer Detection

Detects patterns like:
```
Describe three measures...
1 2 3
```

Converts to:
```json
{
  "type": "list",
  "listCount": 3
}
```

The interface will render 3 separate answer boxes.

### 5. Copyright Removal

Removes:
- "© Cambridge Assessment..."
- "Permission to reproduce..."
- "[Turn over]"
- "DO NOT WRITE IN THIS MARGIN"
- "Question 14 starts on page 16"

## Limitations

### Current Limitations

1. **Formula Extraction** - Basic detection only. Complex formulas may need manual review.
2. **Image Positioning** - Images are associated with questions but exact positioning may vary.
3. **Table Data** - Complex tables may not extract perfectly.
4. **Scanned PDFs** - Only works with text-based PDFs, not scanned images.

### When to Use Manual Entry

Use manual entry if:
- PDF is scanned (no text layer)
- Extraction quality is poor (<80% accurate)
- Paper has complex layouts or tables
- You need perfect accuracy for important papers

## Rendering in Interface

The interface automatically handles all question types:

### Text Questions
```typescript
// Renders a text box sized by marks
<textarea rows={marks <= 2 ? 2 : marks <= 4 ? 4 : 8} />
```

### MCQ Questions
```typescript
// Renders clickable buttons
{options.map(opt => (
  <button onClick={() => selectOption(opt)}>
    {opt}
  </button>
))}
```

### List Questions
```typescript
// Renders multiple numbered boxes
{Array.from({length: listCount}).map((_, i) => (
  <div>
    <label>{i + 1}.</label>
    <textarea />
  </div>
))}
```

### Image Questions
```typescript
// Renders image above question
{hasImage && <img src={image} alt="Question diagram" />}
```

## Troubleshooting

### Issue: No images extracted
**Cause**: PDF may have images as background or scanned content
**Solution**: Use manual entry or OCR tool

### Issue: Poor spacing
**Cause**: Complex PDF layout or unusual fonts
**Solution**: Adjust spacing patterns in `fix_spacing()` method

### Issue: Wrong question type
**Cause**: Keywords not detected
**Solution**: Add more patterns to `detect_mcq()` or `detect_list_answer()`

### Issue: Missing options
**Cause**: Options formatted unusually
**Solution**: Add more patterns to `extract_mcq_options()`

## Next Steps

After extraction:

1. **Review the JSON** - Check for accuracy
2. **Test in interface** - Load at `/practice`
3. **Fix issues** - Edit JSON manually if needed
4. **Add marking scheme** - Use `add-marking-scheme.py`

## Manual Entry Template

If extraction fails, use this template:

```json
{
  "metadata": {
    "subject": "ICT",
    "code": "0417",
    "year": 2025,
    "season": "May/June",
    "variant": "12",
    "duration": 90,
    "totalMarks": 80
  },
  "questions": [
    {
      "number": "1",
      "text": "Question text here",
      "marks": 2,
      "type": "text",
      "subparts": [
        {
          "number": "(a)",
          "text": "Subpart text",
          "marks": 1,
          "type": "text"
        }
      ]
    }
  ]
}
```

## Support

For issues or questions:
1. Check the JSON output for errors
2. Review this guide
3. Try manual entry for problematic papers
4. Consider using a professional PDF extraction service for bulk conversion