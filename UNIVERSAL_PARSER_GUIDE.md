# Universal ICT Parser & Renderer System

## Overview
Complete system for parsing all ICT PDF papers and rendering them with auto-expanding input boxes.

## 🎯 Features

### Parser Features
- ✅ Handles ALL question types (tables, circles, ticks, short/long answers)
- ✅ Smart question type detection
- ✅ Image extraction and linking
- ✅ Table detection and parsing
- ✅ Nested subparts (1 → a → i)
- ✅ Clean text extraction (removes copyright, junk)
- ✅ Automatic marks extraction

### Renderer Features
- ✅ Auto-expanding text areas (no scrolling needed!)
- ✅ 10+ question type renderers
- ✅ Responsive design
- ✅ Clean, intuitive UI
- ✅ Real-time answer tracking

## 📁 Files

### Parser
- **Location**: `scripts/universal-ict-parser.py`
- **Purpose**: Parse any ICT PDF into structured JSON

### Renderer
- **Location**: `src/components/exam-new/QuestionRendererV2.tsx`
- **Purpose**: Render questions with auto-expanding inputs

## 🚀 Quick Start

### 1. Parse a Paper

```bash
cd igcse-study-hub
python scripts/universal-ict-parser.py "path/to/paper.pdf" "0417_s20_qp_11"
```

**Example**:
```bash
python scripts/universal-ict-parser.py "C:/Downloads/0417_m20_qp_11.pdf" "0417_m20_qp_11"
```

**Output**:
- JSON: `public/papers/0417_m20_qp_11_parsed.json`
- Images: `public/papers/images/0417_m20_qp_11_*.jpeg`

### 2. Use the Renderer

```tsx
import QuestionRendererV2 from '@/components/exam-new/QuestionRendererV2';

<QuestionRendererV2
  question={question}
  questionId="1.a.i"
  answer={answers["1.a.i"]}
  onAnswerChange={(ans) => handleAnswerChange("1.a.i", ans)}
/>
```

## 📋 Supported Question Types

### 1. Multiple Choice (MCQ)
**Detection**: "which of the following", "select", "choose"
```json
{
  "type": "mcq",
  "options": ["Option A", "Option B", "Option C", "Option D"]
}
```

### 2. Tick Selection
**Detection**: "tick one box", "tick (✓)"
```json
{
  "type": "tick_selection",
  "options": ["True", "False"]
}
```

### 3. Circle Selection
**Detection**: "circle the correct"
```json
{
  "type": "circle_selection",
  "options": ["A", "B", "C", "D"]
}
```

### 4. Matrix Tick Table
**Detection**: "tick" + table structure
```json
{
  "type": "matrix_tick_table",
  "table": {
    "headers": ["True", "False"],
    "rows": [
      ["Statement 1"],
      ["Statement 2"]
    ]
  }
}
```

### 5. Data Table (Fillable)
**Detection**: "complete the table", "fill in"
```json
{
  "type": "data_table",
  "table": {
    "headers": ["Feature", "Description"],
    "rows": [
      ["Feature 1", "..."],
      ["Feature 2", "..."]
    ]
  }
}
```

### 6. Numbered List
**Detection**: "name", "list", "identify" + marks ≥ 2
```json
{
  "type": "numbered_list",
  "listCount": 4,
  "marks": 4
}
```
**Renders**: 4 auto-expanding input lines

### 7. Paired List
**Detection**: "for each", "feature" + "description"
```json
{
  "type": "paired_list",
  "labels": ["Feature", "Description"],
  "listCount": 3
}
```
**Renders**: 3 rows with 2 columns each

### 8. Image-Based Questions
**Detection**: Has images + "diagram", "shown"
```json
{
  "type": "image_based_list",
  "images": [
    {
      "path": "/papers/images/img1.jpeg",
      "description": "Diagram A"
    }
  ]
}
```

### 9. Short Answer
**Detection**: marks ≤ 2
```json
{
  "type": "short_answer",
  "marks": 1
}
```
**Renders**: Single line input

### 10. Essay (Long Answer)
**Detection**: marks ≥ 6 + "describe", "explain"
```json
{
  "type": "essay",
  "marks": 8
}
```
**Renders**: Large auto-expanding textarea

### 11. Default Text
**Fallback**: Any question not matching above
```json
{
  "type": "text",
  "marks": 3
}
```
**Renders**: Medium auto-expanding textarea

## 🎨 Auto-Expanding Feature

### How It Works
```tsx
const handleTextareaChange = (e) => {
  onAnswerChange(e.target.value);
  
  // Auto-expand
  e.target.style.height = 'auto';
  e.target.style.height = e.target.scrollHeight + 'px';
};
```

### Benefits
- ✅ No scrolling inside boxes
- ✅ See all your text at once
- ✅ Grows as you type
- ✅ Shrinks when you delete
- ✅ Smooth, natural feel

## 📊 JSON Structure

### Complete Example
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
      "text": "Main question text",
      "marks": null,
      "subparts": [
        {
          "number": "a",
          "text": "Subpart text",
          "marks": 2,
          "type": "short_answer"
        },
        {
          "number": "b",
          "text": "Another subpart",
          "marks": null,
          "subparts": [
            {
              "number": "i",
              "text": "Nested subpart",
              "marks": 3,
              "type": "numbered_list",
              "listCount": 3
            }
          ]
        }
      ]
    }
  ]
}
```

## 🔧 Parser Configuration

### Customize Question Type Detection

Edit `detect_question_type()` in `universal-ict-parser.py`:

```python
def detect_question_type(self, text: str, marks: Optional[int], has_image: bool = False) -> str:
    text_lower = text.lower()
    
    # Add your custom patterns
    if "your_keyword" in text_lower:
        return "your_custom_type"
    
    # ... rest of detection logic
```

### Add New Question Type

1. **Parser**: Add detection in `detect_question_type()`
2. **Types**: Add to `types.ts`
3. **Renderer**: Add case in `QuestionRendererV2.tsx`

## 🎯 Best Practices

### For Parsing
1. Always check PDF quality first
2. Review parsed JSON for accuracy
3. Manually adjust question types if needed
4. Add correct answers for grading

### For Rendering
1. Use `questionId` prop (full path like "1.a.i")
2. Handle all answer types (string, array, object)
3. Test with different screen sizes
4. Ensure accessibility (labels, ARIA)

## 🐛 Troubleshooting

### Parser Issues

**Problem**: Images not extracted
```bash
# Check PyMuPDF installation
pip install PyMuPDF

# Verify PDF is not corrupted
python -c "import fitz; doc = fitz.open('paper.pdf'); print(len(doc))"
```

**Problem**: Wrong question types detected
- Manually edit JSON after parsing
- Update detection patterns in parser
- Add custom keywords for your papers

**Problem**: Text is messy
- Check `JUNK_PATTERNS` in parser
- Add more cleaning patterns
- Use `clean_text()` function

### Renderer Issues

**Problem**: Textarea not expanding
```tsx
// Ensure these CSS properties are set
className="resize-none overflow-hidden"
```

**Problem**: Answer not saving
```tsx
// Check onAnswerChange is called
onChange={(e) => {
  console.log('Answer changed:', e.target.value);
  onAnswerChange(e.target.value);
}}
```

## 📚 Examples

### Parse Multiple Papers
```bash
# Create a batch script
for paper in 0417_s20_qp_11 0417_s20_qp_12 0417_m20_qp_11; do
  python scripts/universal-ict-parser.py "pdfs/${paper}.pdf" "$paper"
done
```

### Custom Renderer Usage
```tsx
import { ExamQuestion } from '@/lib/exam-new/types';
import QuestionRendererV2 from '@/components/exam-new/QuestionRendererV2';

function ExamPage() {
  const [answers, setAnswers] = useState({});
  
  const handleAnswerChange = (questionId: string, answer: any) => {
    setAnswers(prev => ({
      ...prev,
      [questionId]: answer
    }));
  };
  
  return (
    <div>
      {questions.map(q => (
        <QuestionRendererV2
          key={q.number}
          question={q}
          questionId={q.number}
          answer={answers[q.number]}
          onAnswerChange={(ans) => handleAnswerChange(q.number, ans)}
        />
      ))}
    </div>
  );
}
```

## 🎓 Advanced Features

### Add Grading Support
```json
{
  "number": "1",
  "text": "What is ICT?",
  "marks": 2,
  "type": "short_answer",
  "correctAnswers": ["Information and Communication Technology"],
  "markingScheme": {
    "total": 2,
    "breakdown": "1 mark for 'Information', 1 mark for 'Communication Technology'"
  }
}
```

### Add Hints
```json
{
  "number": "2",
  "text": "Name three input devices",
  "marks": 3,
  "type": "numbered_list",
  "listCount": 3,
  "instruction": "Think about devices you use to enter data"
}
```

## 📝 Next Steps

1. **Parse your papers**: Use the universal parser on all ICT PDFs
2. **Review JSONs**: Check accuracy and adjust types
3. **Test renderer**: Ensure all question types display correctly
4. **Add grading**: Include correct answers for auto-marking
5. **Deploy**: Push to production

## 🤝 Contributing

To add support for new question types:

1. Update `detect_question_type()` in parser
2. Add type to `types.ts`
3. Add renderer case in `QuestionRendererV2.tsx`
4. Update this documentation
5. Test with real papers

## 📞 Support

If you encounter issues:
1. Check this guide first
2. Review the code comments
3. Test with a simple paper first
4. Check console for errors

---

**Made with Bob** 🤖

Last Updated: 2026-04-16