# 🚀 Quick Start: Universal ICT Parser & Auto-Expanding Renderer

## What You Get

✅ **Universal Parser** - Parses ALL ICT papers (tables, ticks, circles, short/long answers)  
✅ **Auto-Expanding Inputs** - Text boxes grow as you type (no scrolling!)  
✅ **10+ Question Types** - MCQ, tables, lists, essays, images, and more  
✅ **Smart Detection** - Automatically identifies question types  

---

## 📦 Files Created

### Parser
- `scripts/universal-ict-parser.py` - Main parser script

### Renderer  
- `src/components/exam-new/QuestionRendererV2.tsx` - Enhanced renderer with auto-expand

### Documentation
- `UNIVERSAL_PARSER_GUIDE.md` - Complete guide (476 lines!)
- `QUICK_START_UNIVERSAL_PARSER.md` - This file

### Test
- `scripts/test-universal-parser.py` - Test script

---

## ⚡ Quick Usage

### 1. Parse a Paper (3 seconds)

```bash
cd igcse-study-hub
python scripts/universal-ict-parser.py "path/to/paper.pdf" "paper_id"
```

**Example:**
```bash
python scripts/universal-ict-parser.py "C:/Downloads/0417_m20_qp_11.pdf" "0417_m20_qp_11"
```

**Output:**
- ✅ `public/papers/0417_m20_qp_11_parsed.json`
- ✅ `public/papers/images/0417_m20_qp_11_*.jpeg`

### 2. Use the Renderer

```tsx
import QuestionRendererV2 from '@/components/exam-new/QuestionRendererV2';

<QuestionRendererV2
  question={question}
  questionId="1.a"
  answer={answers["1.a"]}
  onAnswerChange={(ans) => setAnswers({...answers, "1.a": ans})}
/>
```

---

## 🎯 Key Features

### Auto-Expanding Text Areas
```tsx
// Automatically grows as you type!
<textarea 
  className="resize-none overflow-hidden"
  onChange={handleTextareaChange}
/>
```

**Before:** 📦 Fixed height, need to scroll  
**After:** 📈 Grows with content, no scrolling!

### Supported Question Types

| Type | Example | Renderer |
|------|---------|----------|
| MCQ | "Which of the following..." | Radio buttons |
| Tick Selection | "Tick one box" | Checkboxes |
| Circle Selection | "Circle the correct" | Radio in boxes |
| Matrix Tick Table | Table with tick columns | Radio grid |
| Data Table | "Complete the table" | Fillable cells |
| Numbered List | "Name 3 devices" | 3 auto-expand lines |
| Paired List | "Feature & Description" | 2-column inputs |
| Image-Based | Questions with diagrams | Image + textarea |
| Short Answer | 1-2 marks | Single line |
| Essay | 6+ marks | Large textarea |
| Default | Any other | Medium textarea |

---

## 📋 Example Output

### Input PDF
```
1. (a) Name three input devices. [3]
   (b) Describe how a scanner works. [4]
```

### Output JSON
```json
{
  "id": "0417_s20_qp_11",
  "questions": [
    {
      "number": "1",
      "text": "",
      "marks": null,
      "subparts": [
        {
          "number": "a",
          "text": "Name three input devices.",
          "marks": 3,
          "type": "numbered_list",
          "listCount": 3
        },
        {
          "number": "b",
          "text": "Describe how a scanner works.",
          "marks": 4,
          "type": "text"
        }
      ]
    }
  ]
}
```

### Rendered UI
```
1. (a) Name three input devices. [3 marks]
   1. [auto-expanding input]
   2. [auto-expanding input]
   3. [auto-expanding input]

1. (b) Describe how a scanner works. [4 marks]
   [large auto-expanding textarea]
```

---

## 🔧 Installation

### Prerequisites
```bash
pip install PyMuPDF
```

### Verify Installation
```bash
python -c "import fitz; print('PyMuPDF installed!')"
```

---

## 🎨 Customization

### Change Question Type Detection

Edit `scripts/universal-ict-parser.py`:

```python
def detect_question_type(self, text: str, marks: Optional[int], has_image: bool = False) -> str:
    text_lower = text.lower()
    
    # Add your custom pattern
    if "your_keyword" in text_lower:
        return "your_custom_type"
    
    # ... rest of code
```

### Add New Renderer Type

Edit `src/components/exam-new/QuestionRendererV2.tsx`:

```tsx
// Add before default case
if (question.type === 'your_custom_type') {
  return (
    <div>
      {/* Your custom renderer */}
    </div>
  );
}
```

---

## 🐛 Troubleshooting

### Parser Not Working?

```bash
# Check Python version (need 3.7+)
python --version

# Reinstall PyMuPDF
pip uninstall PyMuPDF
pip install PyMuPDF

# Test with simple PDF
python scripts/universal-ict-parser.py "test.pdf" "test"
```

### Renderer Not Expanding?

Check CSS classes:
```tsx
className="resize-none overflow-hidden"  // ✅ Correct
className="resize-vertical"              // ❌ Wrong
```

### Wrong Question Types?

Manually edit the JSON:
```json
{
  "type": "numbered_list",  // Change this
  "listCount": 3            // Add this if needed
}
```

---

## 📊 Batch Processing

Parse multiple papers at once:

```bash
# Windows PowerShell
$papers = @("0417_s20_qp_11", "0417_s20_qp_12", "0417_m20_qp_11")
foreach ($paper in $papers) {
    python scripts/universal-ict-parser.py "pdfs/$paper.pdf" $paper
}
```

```bash
# Linux/Mac
for paper in 0417_s20_qp_11 0417_s20_qp_12 0417_m20_qp_11; do
    python scripts/universal-ict-parser.py "pdfs/${paper}.pdf" "$paper"
done
```

---

## 🎓 Next Steps

1. ✅ Parse your first paper
2. ✅ Review the JSON output
3. ✅ Test the renderer in your app
4. ✅ Adjust question types if needed
5. ✅ Parse all your papers
6. ✅ Add correct answers for grading

---

## 📚 Full Documentation

See `UNIVERSAL_PARSER_GUIDE.md` for:
- Complete API reference
- All question type examples
- Advanced customization
- Grading system setup
- Contributing guidelines

---

## 💡 Tips

### For Best Results
- ✅ Use high-quality PDFs
- ✅ Review parsed JSON before using
- ✅ Test renderer with different screen sizes
- ✅ Add correct answers for auto-grading

### Common Patterns
```python
# Parse
python scripts/universal-ict-parser.py "paper.pdf" "paper_id"

# Review
code public/papers/paper_id_parsed.json

# Adjust types if needed
# Then use in your app!
```

---

## 🤝 Support

**Issues?**
1. Check `UNIVERSAL_PARSER_GUIDE.md`
2. Review code comments
3. Test with simple paper first
4. Check console for errors

**Working?**
- Parse all your papers!
- Enjoy auto-expanding inputs!
- No more scrolling in tiny boxes!

---

## ✨ What Makes This Special

### Before
- ❌ Manual JSON creation
- ❌ Fixed-height textareas
- ❌ Scrolling in tiny boxes
- ❌ One parser per paper type

### After
- ✅ Automatic parsing
- ✅ Auto-expanding inputs
- ✅ See all your text
- ✅ One parser for ALL papers

---

**Made with Bob** 🤖

*Last Updated: 2026-04-16*

---

## 🎯 TL;DR

```bash
# Parse
python scripts/universal-ict-parser.py "paper.pdf" "paper_id"

# Use
import QuestionRendererV2 from '@/components/exam-new/QuestionRendererV2';

# Enjoy!
# ✅ Auto-expanding inputs
# ✅ All question types
# ✅ No scrolling
```

**That's it!** 🚀