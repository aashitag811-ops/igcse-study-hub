# Production Parser Guide

## Overview
`parser-production.py` is a comprehensive, production-ready parser for IGCSE ICT papers that handles all discovered question types and features.

## Supported Question Types

### 1. **text**
- Essay-style answers
- Long-form responses (typically 4+ marks)
- Example: "Describe the advantages and disadvantages..."

### 2. **numbered_list**
- Numbered answer lines
- Detected by keywords: "Identify", "Name", "List", "State"
- `listCount` set to marks value
- Example: "List four principles..." [4 marks]

### 3. **matrix_tick_table**
- Tick tables with radio buttons
- Detected by "tick" keyword + table structure
- Requires manual addition of `correctAnswers` and `markingScheme`
- Example: CLI/GUI comparison table

### 4. **image_based_list**
- Multiple images with answer lines below each
- Auto-detected when multiple images found
- `listCount` set to number of images
- Example: "Name the device used to read..." with 3 images

### 5. **text_with_example**
- Text answer with example code/query box
- Detected by keywords: "query", "type in", "following query"
- Requires manual addition of `example` object
- Example: Database query questions

### 6. **mcq**
- Multiple choice questions
- Detected by keywords: "circle", "underline", "choose"
- Requires manual addition of `options` array

## Features

### Multi-Method Image Extraction
1. **Standard Extraction**: Embedded images using `get_images()`
2. **Drawing Extraction**: Vector graphics using `get_drawings()`
3. **Region-Based Extraction**: Gaps between text blocks

### Smart Image Linking
- Images linked to questions by Y-position proximity
- Bounding box overlap detection
- Automatic deduplication using xref tracking

### Table Detection
- Identifies table structures
- Links tables to questions
- Supports tick tables

### Automatic Type Detection
- Analyzes question text for keywords
- Considers marks allocation
- Detects image presence
- Identifies table structures

## Usage

### Single Paper
```bash
python scripts/parser-production.py "C:/path/to/0417_s20_qp_12.pdf" 0417_s20_qp_12
```

### Bulk Processing
```bash
python scripts/parser-production.py --bulk "C:/path/to/papers/"
```

## Output Structure

The parser generates JSON files matching this structure:

```json
{
  "id": "0417_s20_qp_11",
  "subject": "ICT 0417",
  "year": 2020,
  "season": "May/June",
  "variant": 11,
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
      ]
    }
  ]
}
```

## Post-Processing Steps

After parsing, you need to manually:

### 1. Review Question Types
Check that auto-detected types are correct:
- `text` → Essay answers
- `numbered_list` → Numbered lines
- `matrix_tick_table` → Tick tables
- `image_based_list` → Images with answers
- `text_with_example` → Code/query examples

### 2. Add Correct Answers (for tick tables)
```json
{
  "type": "matrix_tick_table",
  "correctAnswers": {
    "Statement 1": "Column A",
    "Statement 2": "Column B"
  },
  "markingScheme": {
    "total": 2,
    "breakdown": "1 mark per 2 correct"
  }
}
```

### 3. Add Table Structures (for tick tables)
```json
{
  "table": {
    "headers": ["Statement", "CLI", "GUI"],
    "rows": [
      ["Statement 1", "", ""],
      ["Statement 2", "", ""]
    ]
  }
}
```

### 4. Add Example Boxes (for text_with_example)
```json
{
  "type": "text_with_example",
  "example": {
    "title": "Example query:",
    "code": "Health_number = 9434765919"
  },
  "instruction": "Write a query to find..."
}
```

### 5. Add Image Descriptions
Update auto-generated descriptions with meaningful content:
```json
{
  "images": [
    {
      "path": "/papers/images/0417_s20_qp_11_img1.jpeg",
      "description": "RFID tag with spiral antenna pattern",
      "answerLine": true
    }
  ]
}
```

### 6. Verify Image Placement
- Check that images are linked to correct questions
- Move images between questions if needed
- Delete duplicate or unwanted images

## Quality Checklist

Before using a parsed paper:

- [ ] All questions parsed correctly
- [ ] Question types are appropriate
- [ ] Images are linked to correct questions
- [ ] Image descriptions are meaningful
- [ ] Tick tables have `correctAnswers`
- [ ] Tick tables have `markingScheme`
- [ ] Tick tables have `table` structure
- [ ] Example boxes added where needed
- [ ] List counts match marks
- [ ] No duplicate images
- [ ] Test in application

## Known Limitations

1. **Table Extraction**: Basic detection only - requires manual structure addition
2. **MCQ Options**: Not auto-extracted - must be added manually
3. **Complex Layouts**: May need manual adjustment for unusual formats
4. **Image Descriptions**: Auto-generated - should be updated with meaningful content
5. **Correct Answers**: Must be added manually for all question types

## Troubleshooting

### No Questions Found
- Check if PDF has text layer (not scanned image)
- Verify question numbering format (1, 2, 3...)
- Check if page 1 is being skipped correctly

### Missing Images
- Review all three extraction methods in output
- Check `public/papers/images/` directory
- Look for blank/white regions that were filtered out
- Consider manual screenshot for missing images

### Wrong Question Types
- Review auto-detection keywords
- Manually adjust types in JSON
- Add to parser if pattern is common

### Images in Wrong Questions
- Check Y-position proximity threshold (currently 200 points)
- Manually move images in JSON
- Adjust proximity threshold if needed

## Example Workflow

1. **Parse paper**:
   ```bash
   python scripts/parser-production.py "paper.pdf" 0417_s20_qp_12
   ```

2. **Review output**:
   - Check `public/papers/0417_s20_qp_12.json`
   - Check `public/papers/images/` for extracted images

3. **Manual corrections**:
   - Add tick table structures
   - Add correct answers
   - Update image descriptions
   - Adjust question types

4. **Test in app**:
   - Load paper in application
   - Verify all questions render correctly
   - Test all question types

5. **Iterate**:
   - Fix any issues
   - Re-test
   - Deploy when ready

## Future Enhancements

Potential improvements:
- Better table structure extraction
- MCQ option detection
- Automatic correct answer extraction from mark schemes
- Image OCR for better descriptions
- Support for more question types
- Validation against mark scheme PDFs

---

Made with Bob