# IGCSE Exam Marking System - Complete Guide

## 🎯 Overview

An intelligent exam marking system that automatically grades IGCSE past papers using advanced fuzzy matching algorithms. The system can understand paraphrased answers, handle spelling errors, and provide instant detailed feedback.

## ✨ Key Features

### 1. **Fuzzy Matching Algorithm**
- Uses Levenshtein distance to calculate similarity between student answers and mark scheme
- Handles spelling errors and typos automatically
- Configurable similarity thresholds based on content type

### 2. **Paraphrase Detection**
- Token overlap checking to understand alternative phrasings
- Accepts answers that convey the same meaning in different words
- Example: "stores data" ≈ "saves information"

### 3. **Strictness Profiles**
Three levels of matching strictness:
- **General (82-90% similarity)**: Normal text, allows more variation
- **Technical (90-95% similarity)**: Technical terms require higher accuracy
- **Acronym (97-100% similarity)**: Acronyms like PNG, JPEG, SSD need near-exact match

### 4. **Synonym Support**
- Mark schemes can include synonyms for acceptable answers
- Example: "spreadsheet" can accept "Excel", "Google Sheets", etc.

### 5. **Multiple Answer Types**
- **Selection List**: Circle/tick multiple options (checkboxes)
- **Short Text**: Single line answers
- **Long Text**: Detailed explanations
- **Numbered List**: Multiple points (e.g., "State three...")
- **Paired List**: Method + Description format
- **Numeric**: Number-only answers

## 🏗️ Architecture

```
src/
├── lib/exam/                          # Core marking engine
│   ├── types.ts                       # TypeScript interfaces
│   ├── marking.ts                     # Fuzzy matching algorithm
│   ├── paper-extraction.ts            # PDF text → structured questions
│   ├── rule-registry.ts               # Paper ID → mark scheme mapping
│   ├── storage-discovery.ts           # Supabase file parsing
│   └── fixtures/                      # Mark scheme definitions
│       └── ict_0417_12_fm_2025.ts    # Example mark scheme
│
├── components/exam/                   # UI Components
│   ├── PaperRenderer.tsx             # Main exam interface
│   ├── InputFactory.tsx              # Dynamic input fields
│   └── ExamStyles.css                # IGCSE-style design
│
└── app/
    ├── practice/page.tsx             # Practice page
    └── api/
        ├── paper/route.ts            # GET paper endpoint
        └── mark/route.ts             # POST marking endpoint
```

## 🚀 How It Works

### Step 1: Question Paper Extraction
```typescript
// Paper is parsed from PDF text into structured format
{
  "id": "0417_2025_feb_march_12",
  "questions": [
    {
      "qid": "1",
      "prompt": "Circle two input devices.",
      "marks": 2,
      "answerType": "multi_select"
    }
  ]
}
```

### Step 2: Student Answers Questions
```typescript
// Student provides answers through the UI
{
  "qid": "1",
  "answer": ["keyboard", "mouse"]
}
```

### Step 3: Fuzzy Matching
```typescript
// Algorithm compares answer to mark scheme
function isAcceptable(studentAnswer, markSchemeAnswer) {
  // 1. Exact match check
  if (studentAnswer === markSchemeAnswer) return true;
  
  // 2. Calculate similarity (Levenshtein distance)
  const similarity = calculateSimilarity(studentAnswer, markSchemeAnswer);
  if (similarity < threshold) return false;
  
  // 3. Token overlap check
  const overlap = tokenOverlap(studentAnswer, markSchemeAnswer);
  if (overlap < minOverlap) return false;
  
  return true;
}
```

### Step 4: Instant Feedback
```json
{
  "totalAwarded": 4,
  "totalAvailable": 4,
  "percentage": 100,
  "questions": [
    {
      "qid": "1",
      "awarded": 2,
      "maxMarks": 2,
      "feedback": ["✓ keyboard (+1)", "✓ mouse (+1)"]
    }
  ]
}
```

## 📝 Usage

### For Students

1. Navigate to `/practice`
2. Select a paper from the dropdown
3. Answer all questions
4. Click "Submit for Marking"
5. Review your results and feedback

### For Developers - Adding New Papers

#### 1. Create Mark Scheme Fixture

```typescript
// src/lib/exam/fixtures/ict_0417_11_mj_2025.ts
import { MarkRule } from '@/lib/exam/types';

export const ICT_0417_11_MJ_2025_PAPER_ID = '0417_2025_may_june_11';

export const ICT_0417_11_MJ_2025_RULES: MarkRule[] = [
  {
    qid: '1',
    answerType: 'multi_select',
    maxMarks: 2,
    selectCount: 2, // Only accept first 2 correct answers
    points: [
      {
        id: 'keyboard',
        acceptable: ['keyboard'],
        synonyms: ['keys', 'keypad'],
        marks: 1,
        strictness: 'general'
      },
      {
        id: 'mouse',
        acceptable: ['mouse'],
        synonyms: ['pointing device'],
        marks: 1,
        strictness: 'general'
      }
    ]
  },
  {
    qid: '2a',
    answerType: 'short_text',
    maxMarks: 2,
    components: [
      {
        id: 'spreadsheet_program',
        description: 'Mentions spreadsheet/program',
        marks: 1,
        acceptable: ['spreadsheet', 'program', 'software', 'application']
      },
      {
        id: 'rows_columns',
        description: 'Mentions rows and columns',
        marks: 1,
        acceptable: ['rows and columns', 'rows columns', 'grid', 'table']
      }
    ]
  }
];
```

#### 2. Register in Rule Registry

```typescript
// src/lib/exam/rule-registry.ts
import { ICT_0417_11_MJ_2025_PAPER_ID, ICT_0417_11_MJ_2025_RULES } from './fixtures/ict_0417_11_mj_2025';

const RULE_SETS: Record<string, MarkRule[]> = {
  [ICT_0417_11_MJ_2025_PAPER_ID]: ICT_0417_11_MJ_2025_RULES,
  // ... other papers
};
```

#### 3. Add to Practice Page

```typescript
// src/app/practice/page.tsx
const availablePapers = [
  {
    id: '0417_2025_may_june_11',
    label: 'ICT 0417/11 - May/June 2025',
    subject: 'ICT',
    code: '0417'
  }
];
```

## 🎨 UI Components

### PaperRenderer
Main component that:
- Fetches paper from API
- Manages answer state
- Submits for marking
- Displays results

### InputFactory
Dynamically renders appropriate input based on question type:
- Checkboxes for multi-select
- Text inputs for short answers
- Textareas for long responses
- Numbered lists for multiple points
- Paired inputs for method+description

### ExamStyles.css
IGCSE-authentic styling:
- Dotted underlines for text inputs
- Professional color scheme (#005eb8)
- Clear question numbering
- Instant feedback colors (green/yellow/red)

## 🔧 API Endpoints

### GET /api/paper
Fetch a parsed question paper.

**Query Parameters:**
- `subject`: Subject code (e.g., "0417")
- `year`: Year (e.g., 2025)
- `session`: "feb_march", "may_june", or "oct_nov"
- `paper`: Paper number (e.g., 1)
- `variant`: Variant number (e.g., 2)

**Example:**
```bash
GET /api/paper?subject=0417&year=2025&session=feb_march&paper=1&variant=2
```

### POST /api/mark
Mark a student submission.

**Request Body:**
```json
{
  "paperId": "0417_2025_feb_march_12",
  "answers": [
    { "qid": "1", "answer": ["keyboard", "mouse"] },
    { "qid": "2a", "answer": "spreadsheet with rows and columns" }
  ],
  "mode": "practice_strict"
}
```

**Response:**
```json
{
  "mode": "practice_strict",
  "totalAwarded": 4,
  "totalAvailable": 4,
  "percentage": 100,
  "questions": [...]
}
```

## 🧪 Testing

### Test the API
```bash
# Get a paper
curl "http://localhost:3000/api/paper?subject=0417&year=2025&session=feb_march&paper=1&variant=2"

# Mark answers
curl -X POST http://localhost:3000/api/mark \
  -H "Content-Type: application/json" \
  -d '{
    "paperId": "0417_2025_feb_march_12",
    "answers": [
      {"qid": "1", "answer": ["keyboard", "mouse"]}
    ]
  }'
```

### Test the UI
1. Start dev server: `npm run dev`
2. Navigate to: `http://localhost:3000/practice`
3. Answer questions and submit

## 📊 Marking Modes

### Practice Strict (Default)
- Higher similarity thresholds (90%, 95%, 100%)
- No fuzzy matching for acronyms
- Stricter token overlap (55%, 70%)
- Best for learning and practice

### Cambridge Like
- More lenient thresholds (82%, 90%, 97%)
- Allows fuzzy matching for most terms
- Lower token overlap (45%, 60%)
- Mimics real examiner tolerance

## 🎯 Algorithm Details

### Levenshtein Distance
Calculates minimum edits needed to transform one string to another:
```typescript
levenshteinDistance("keyboard", "keybord") // = 1 (one deletion)
similarity = 1 - (distance / maxLength) // = 87.5%
```

### Token Overlap
Measures word-level similarity:
```typescript
tokenOverlap("stores data", "saves information") // = 0%
tokenOverlap("stores data", "stores information") // = 50%
tokenOverlap("stores data in memory", "stores data") // = 66%
```

### Combined Approach
Both checks must pass:
1. ✅ Similarity ≥ threshold (e.g., 90%)
2. ✅ Token overlap ≥ minimum (e.g., 55%)

This prevents false positives like:
- "RAM" matching "ROM" (high similarity, low overlap)
- "the quick brown fox" matching "fox" (low similarity)

## 🚀 Future Enhancements

- [ ] OCR support for image-based PDFs
- [ ] More subject support (Math, Physics, Chemistry)
- [ ] Progress tracking and analytics
- [ ] Weak topic detection
- [ ] Practice question generator
- [ ] Export results to PDF
- [ ] Mobile app version

## 📚 Resources

- [IGCSE Past Papers](https://www.cambridgeinternational.org/programmes-and-qualifications/cambridge-igcse/)
- [Levenshtein Distance](https://en.wikipedia.org/wiki/Levenshtein_distance)
- [Fuzzy String Matching](https://en.wikipedia.org/wiki/Approximate_string_matching)

## 🤝 Contributing

To add support for a new paper:
1. Create mark scheme fixture in `src/lib/exam/fixtures/`
2. Register in `src/lib/exam/rule-registry.ts`
3. Add to practice page dropdown
4. Test thoroughly with sample answers

---

**Built with ❤️ for IGCSE students**