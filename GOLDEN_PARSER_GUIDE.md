# 🌟 Golden ICT Parser - Simple & Clean System

## Overview

The **Golden ICT Parser** is a simplified, clean approach to parsing Cambridge IGCSE ICT Paper 1 PDFs. It focuses on producing clean, readable JSON files that match the `sample_test.json` format you love.

## ✨ Key Features

### 1. **Simple Question Types**
Only 5 question types - no over-complication:
- `text` - Simple text answer (default)
- `mcq` - Multiple choice with selection chips
- `paired_list` - Method + Description pairs
- `numbered_list` - Numbered lines (1, 2, 3...)
- `essay` - Large text area for 4+ mark questions

### 2. **Clean Text Processing**
- Removes copyright notices and page codes
- Fixes common OCR errors (e.g., "process in g" → "processing")
- Fixes word joining (e.g., "devicesRAM" → "devices RAM")
- Minimal processing - keeps text natural

### 3. **Smart Content Extraction**
- Uses strict bounding box to exclude margins
- Skips "UCLES", "DO NOT WRITE IN THIS MARGIN", etc.
- Preserves question structure (main questions and sub-parts)

## 📁 Files Created

### Parser
- **`scripts/golden-ict-parser.py`** - Main PDF parser
  - Simple, clean code based on your reference
  - Produces JSON matching `sample_test.json` format

### Renderer
- **`src/components/exam-new/QuestionRendererSimple.tsx`** - Clean UI renderer
  - Matches your screenshot designs
  - Simple, elegant styling
  - Dotted lines, selection chips, numbered boxes

### Updated Files
- **`src/components/exam-new/ExamInterface.tsx`** - Now uses QuestionRendererSimple

## 🚀 Usage

### Parse a Single PDF

```bash
python scripts/golden-ict-parser.py path/to/paper.pdf output.json
```

Example:
```bash
python scripts/golden-ict-parser.py pdfs/0417_s21_qp_12.pdf public/papers/0417_s21_qp_12.json
```

### Parse Multiple PDFs

```bash
# Parse all PDFs in a directory
for file in pdfs/*.pdf; do
    filename=$(basename "$file" .pdf)
    python scripts/golden-ict-parser.py "$file" "public/papers/${filename}.json"
done
```

## 📊 Output Format

The parser creates JSON files matching this structure:

```json
{
  "id": "0417_s21_qp_12",
  "subject": "ICT 0417",
  "year": 2021,
  "season": "Summer",
  "variant": 12,
  "totalMarks": 80,
  "duration": 90,
  "questions": [
    {
      "number": "1",
      "text": "Main question text",
      "marks": null,
      "subparts": [
        {
          "number": "a",
          "text": "Sub-question text",
          "marks": 2,
          "type": "text"
        }
      ]
    }
  ]
}
```

## 🎨 Question Type Detection

The parser automatically detects question types:

### MCQ (Multiple Choice)
- **Trigger**: Contains "Circle" in text
- **Renders**: Selection chips (buttons)
- **Example**: "Circle two devices..."

### Paired List
- **Trigger**: Contains "Method", "Benefit", "Rule", or "Feature" with numbering
- **Renders**: Two-column input (Method + Description)
- **Example**: "Method 1... Method 2..."

### Numbered List
- **Trigger**: Contains "1\n2" pattern
- **Renders**: Numbered lines with dotted underlines
- **Example**: Questions asking for multiple points

### Essay
- **Trigger**: 4+ marks AND contains "explain", "describe", or "discuss"
- **Renders**: Large lined text area
- **Example**: "Explain why..." [6 marks]

### Text (Default)
- **Trigger**: Everything else
- **Renders**: Single dotted line
- **Example**: "State what is meant by..." [2 marks]

## 🎯 Rendering Examples

### Selection Chips (MCQ)
```
Circle two input devices:
[Keyboard] [Monitor] [Mouse] [Printer] [Scanner] [Speaker]
```

### Paired List
```
1. Method: ____________  Description: _________________________
2. Method: ____________  Description: _________________________
```

### Numbered List
```
1. _________________________________________________
2. _________________________________________________
3. _________________________________________________
```

### Essay
```
┌─────────────────────────────────────────────────┐
│ Write your answer here...                       │
│ ________________________________________________│
│ ________________________________________________│
│ ________________________________________________│
│ ________________________________________________│
└─────────────────────────────────────────────────┘
```

## 🔧 Configuration

### Content Bounding Box
```python
self.content_bbox = (65, 90, 530, 770)
```
- **Left**: 65px (excludes left margin)
- **Top**: 90px (excludes header)
- **Right**: 530px (excludes right margin)
- **Bottom**: 770px (excludes footer)

### Text Extraction Tolerance
```python
x_tolerance=3
```
- Prevents word joining
- Keeps spacing natural

## 📝 Common OCR Fixes

The parser automatically fixes:
- `process in g` → `processing`
- `word process in g` → `word processing`
- `format t in g` → `formatting`
- `in ternal` → `internal`
- `orig in al` → `original`
- `im age` → `image`
- `Blue to oth` → `Bluetooth`
- `Wi Fi` → `WiFi`
- `devicesRAM` → `devices RAM`
- `1Method` → `1 Method`

## ✅ Advantages Over Complex Parser

### Old Complex Parser
- ❌ 15+ question types
- ❌ Over-complicated detection logic
- ❌ Too much text normalization
- ❌ Hard to maintain
- ❌ Produced empty/broken files

### New Golden Parser
- ✅ 5 simple question types
- ✅ Clean, readable code
- ✅ Minimal text processing
- ✅ Easy to understand and modify
- ✅ Produces clean, working JSON

## 🎓 Best Practices

1. **Always test with sample_test.json first**
   - Make sure the renderer works correctly
   - Check all question types display properly

2. **Parse one paper at a time initially**
   - Verify output quality
   - Check for any parsing issues

3. **Keep the parser simple**
   - Don't add unnecessary complexity
   - Focus on the 5 core question types

4. **Review generated JSON**
   - Check question text is clean
   - Verify marks are correct
   - Ensure sub-parts are nested properly

## 🐛 Troubleshooting

### Empty Questions
- Check PDF is not corrupted
- Verify bounding box coordinates
- Ensure PDF has text layer (not scanned image)

### Wrong Question Types
- Review detection logic in `detect_type()`
- Check for keyword matches
- Adjust patterns if needed

### Text Joining Issues
- Increase `x_tolerance` value
- Check bounding box isn't too narrow
- Review OCR fix patterns

## 📚 Related Files

- `public/papers/sample_test.json` - Reference format
- `src/lib/exam-new/types.ts` - TypeScript definitions
- `src/components/exam-new/ExamInterface.tsx` - Main exam interface
- `src/app/practice/[paperId]/page.tsx` - Practice page

## 🎉 Result

You now have a **clean, simple, maintainable** system that produces beautiful exam interfaces matching your golden reference design!

The system focuses on:
- ✅ Clean, readable code
- ✅ Simple question types
- ✅ Beautiful UI matching your screenshots
- ✅ Easy to use and maintain
- ✅ Produces working JSON files every time

---

**Made with ❤️ by Bob - Keeping it simple and clean!**