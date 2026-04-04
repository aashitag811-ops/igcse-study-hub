# IGCSE Exam Engine - Rule-Based Marking System

## Overview

A sophisticated rule-based automated marking system for IGCSE past papers. This system parses question papers, compares student answers against predefined mark schemes, and provides instant feedback with detailed scoring.

## Architecture

### Core Components

1. **Type System** (`types.ts`)
   - Defines all TypeScript interfaces for papers, questions, answers, and marking rules
   - Supports multiple answer types: multi-select, short text, list, numeric, long response

2. **Paper Extraction** (`paper-extraction.ts`)
   - Parses PDF text into structured question format
   - Identifies questions (1, 2, 3...), subparts (a, b, c...), and sub-subparts (i, ii, iii...)
   - Extracts mark allocations `[2]`, `[3]`, etc.
   - Infers answer types automatically

3. **Marking Engine** (`marking.ts`)
   - Core algorithm for comparing student answers to mark schemes
   - Fuzzy matching with configurable strictness levels:
     - **General** (82-90% similarity) - Normal text
     - **Technical** (90-95% similarity) - Technical terms
     - **Acronym** (97-100% similarity) - Acronyms like PNG, JPEG, SSD
   - Token overlap checking to prevent false matches
   - Synonym support
   - Two marking modes:
     - `practice_strict` - Stricter for learning (default)
     - `cambridge_like` - More lenient, mimics real Cambridge marking

4. **Rule Registry** (`rule-registry.ts`)
   - Central registry mapping paper IDs to mark scheme rules
   - Easy to add new papers

5. **Storage Discovery** (`storage-discovery.ts`)
   - Parses Supabase storage filenames (e.g., `0417_m25_qp_12.pdf`)
   - Groups related files (QP, MS, GT, ER)
   - Creates paper bundles

6. **Mark Scheme Fixtures** (`fixtures/`)
   - Pre-encoded mark schemes for specific papers
   - Currently includes: ICT 0417/12 February/March 2025

## API Endpoints

### GET /api/paper

Fetches a parsed question paper.

**Query Parameters:**
- `subject` - Subject code (e.g., "0417")
- `year` - Year (e.g., 2025)
- `session` - Session: "feb_march", "may_june", or "oct_nov"
- `paper` - Paper number (e.g., 1)
- `variant` - Variant number (e.g., 2)

**Example:**
```bash
GET /api/paper?subject=0417&year=2025&session=feb_march&paper=1&variant=2
```

**Response:**
```json
{
  "id": "0417_2025_feb_march_12",
  "selector": { "subjectCode": "0417", "year": 2025, "session": "feb_march", "paper": 1, "variant": 2 },
  "title": "0417/12 2025 feb_march",
  "questions": [
    {
      "qid": "1",
      "prompt": "Circle two input devices.",
      "marks": 2,
      "answerType": "multi_select",
      "expectedItems": 2,
      "sourcePage": 1
    }
  ]
}
```

### POST /api/mark

Marks a student submission.

**Request Body:**
```json
{
  "paperId": "0417_2025_feb_march_12",
  "answers": [
    { "qid": "1", "answer": ["keyboard", "mouse"] },
    { "qid": "2ai", "answer": "A computer program that organizes data in rows and columns" }
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
  "questions": [
    {
      "qid": "1",
      "awarded": 2,
      "maxMarks": 2,
      "matchedPointIds": ["keyboard", "mouse"],
      "feedback": ["✓ keyboard (+1)", "✓ mouse (+1)"]
    },
    {
      "qid": "2ai",
      "awarded": 2,
      "maxMarks": 2,
      "matchedPointIds": [],
      "feedback": ["✓ component:spreadsheet_program (+1)", "✓ component:rows_columns (+1)"]
    }
  ]
}
```

### POST /api/papers/discover

Discovers papers from Supabase storage filenames.

**Request Body:**
```json
{
  "filenames": [
    "0417_m25_qp_12.pdf",
    "0417_m25_ms_12.pdf",
    "0417_m25_gt.pdf"
  ]
}
```

**Response:**
```json
{
  "count": 1,
  "papers": [
    {
      "selector": { "subjectCode": "0417", "year": 2025, "session": "may_june", "paper": 1, "variant": 2 },
      "paperId": "0417_2025_may_june_12",
      "questionPaper": "0417_m25_qp_12.pdf",
      "markScheme": "0417_m25_ms_12.pdf",
      "gradeThreshold": "0417_m25_gt.pdf"
    }
  ]
}
```

## Usage Example

```typescript
// Fetch a paper
const paperResponse = await fetch('/api/paper?subject=0417&year=2025&session=feb_march&paper=1&variant=2');
const paper = await paperResponse.json();

// Student answers questions
const answers = [
  { qid: '1', answer: ['keyboard', 'mouse'] },
  { qid: '2ai', answer: 'spreadsheet software with rows and columns' }
];

// Submit for marking
const markResponse = await fetch('/api/mark', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    paperId: paper.id,
    answers,
    mode: 'practice_strict'
  })
});

const result = await markResponse.json();
console.log(`Score: ${result.totalAwarded}/${result.totalAvailable} (${result.percentage}%)`);
```

## Adding New Papers

To add a new paper's mark scheme:

1. Create a new fixture file in `fixtures/` (e.g., `ict_0417_11_mj_2025.ts`)
2. Define the paper ID and rules array
3. Register in `rule-registry.ts`

**Example:**
```typescript
// fixtures/ict_0417_11_mj_2025.ts
export const ICT_0417_11_MJ_2025_PAPER_ID = '0417_2025_may_june_11';

export const ICT_0417_11_MJ_2025_RULES: MarkRule[] = [
  {
    qid: '1',
    answerType: 'multi_select',
    maxMarks: 2,
    selectCount: 2,
    points: [
      { id: 'actuator', acceptable: ['actuator'], marks: 1, strictness: 'technical' },
      { id: 'printer', acceptable: ['printer'], marks: 1, strictness: 'technical' }
    ]
  }
];

// rule-registry.ts
import { ICT_0417_11_MJ_2025_PAPER_ID, ICT_0417_11_MJ_2025_RULES } from './fixtures/ict_0417_11_mj_2025';

const RULE_SETS: Record<string, MarkRule[]> = {
  [ICT_0417_11_MJ_2025_PAPER_ID]: ICT_0417_11_MJ_2025_RULES,
  // ... other papers
};
```

## Features

### Strictness Profiles

- **General** - Normal text matching (e.g., "stores data", "saves information")
- **Technical** - Technical terms requiring higher accuracy (e.g., "database", "spreadsheet")
- **Acronym** - Exact or near-exact match for acronyms (e.g., "PNG", "JPEG", "SSD")

### Marking Modes

- **practice_strict** (default)
  - Higher similarity thresholds
  - No fuzzy matching for acronyms
  - Stricter token overlap requirements
  - Best for learning and practice

- **cambridge_like**
  - More lenient thresholds
  - Allows fuzzy matching for most terms
  - Mimics real Cambridge examiner tolerance
  - Best for mock exams

### Advanced Features

- **Component-based marking** - Multiple criteria per question
- **Dependency tracking** - Some points require others first
- **Cap limits** - Maximum marks even if more points matched
- **Select count** - Limit number of acceptable points
- **Synonym support** - Alternative acceptable phrasings
- **Follow-through marking** - Credit for consistent errors (future)

## File Structure

```
src/lib/exam/
├── types.ts                    # TypeScript type definitions
├── regex.ts                    # Pattern matching regexes
├── paper-extraction.ts         # PDF → structured questions
├── marking.ts                  # Core marking algorithm
├── rule-registry.ts            # Paper ID → rules mapping
├── storage-discovery.ts        # Supabase filename parsing
├── fixtures/
│   └── ict_0417_12_fm_2025.ts # Mark scheme for 0417/12 FM 2025
├── CALIBRATION_NOTES.md        # Calibration documentation
├── STRICT_MARKING_POLICY.md    # Policy documentation
└── README.md                   # This file

src/app/api/
├── paper/route.ts              # GET paper endpoint
├── mark/route.ts               # POST marking endpoint
└── papers/discover/route.ts    # POST discovery endpoint
```

## Future Enhancements

- [ ] Add more mark scheme fixtures (0417/11 MJ 2025, 0417/12 MJ 2025)
- [ ] Frontend UI for students to answer questions
- [ ] PDF text extraction from Supabase storage
- [ ] OCR support for image-based PDFs
- [ ] Answer history and progress tracking
- [ ] Weak topic detection
- [ ] Practice question generator
- [ ] Export results to PDF

## Testing

Test the API endpoints:

```bash
# Get a paper
curl "http://localhost:3000/api/paper?subject=0417&year=2025&session=feb_march&paper=1&variant=2"

# Mark answers
curl -X POST http://localhost:3000/api/mark \
  -H "Content-Type: application/json" \
  -d '{
    "paperId": "0417_2025_feb_march_12",
    "answers": [
      {"qid": "1", "answer": ["keyboard", "mouse"]},
      {"qid": "2ai", "answer": "computer program with rows and columns"}
    ]
  }'

# Discover papers
curl -X POST http://localhost:3000/api/papers/discover \
  -H "Content-Type: application/json" \
  -d '{"filenames": ["0417_m25_qp_12.pdf", "0417_m25_ms_12.pdf"]}'
```

## Credits

Built with ❤️ for IGCSE students