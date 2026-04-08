# 🚀 Exam Marking System - Quick Start Guide

## What You Have

A fully functional **algorithm-based question paper corrector** for IGCSE ICT papers that:
- ✅ Parses question papers automatically
- ✅ Marks student answers using fuzzy matching algorithms
- ✅ Provides detailed feedback for each question
- ✅ Supports multiple marking modes (strict for practice, lenient for mock exams)
- ✅ Currently loaded with **ICT 0417/12 February/March 2025** paper

## Quick Test (3 Steps)

### Step 1: Start the Server
```bash
npm run dev
```

Wait for: `Ready on http://localhost:3000`

### Step 2: Run the Test Script
Open a new terminal and run:
```bash
node test-exam-api.js
```

This will automatically test:
- ✅ Fetching question papers
- ✅ Marking perfect answers (100% score)
- ✅ Marking partial answers (partial credit)
- ✅ Comparing strict vs lenient modes
- ✅ Testing acronym matching (PNG, JPEG, etc.)

### Step 3: Try Manual Testing
Use these curl commands or Postman:

**Get the question paper:**
```bash
curl "http://localhost:3000/api/paper?subject=0417&year=2025&session=feb_march&paper=1&variant=2"
```

**Mark some answers:**
```bash
curl -X POST http://localhost:3000/api/mark \
  -H "Content-Type: application/json" \
  -d '{
    "paperId": "0417_2025_feb_march_12",
    "answers": [
      {"qid": "1", "answer": ["keyboard", "mouse"]},
      {"qid": "2ai", "answer": "computer program with rows and columns"}
    ]
  }'
```

## What Questions Are Available?

The system has **17 questions** from ICT 0417/12 FM 2025:

| Question | Topic | Marks |
|----------|-------|-------|
| 1 | Input devices | 2 |
| 2ai | Spreadsheet definition | 2 |
| 2aii | Database definition | 2 |
| 2aiii | Applet definition | 2 |
| 2b | System software types | 3 |
| 3a | Expert system diagnosis | 4 |
| 3b | Expert system errors | 2 |
| 4a | Test data | 1 |
| 4b | Data protection | 2 |
| 4c | Test plan | 2 |
| 5b | Encryption | 2 |
| 5c | Email security | 3 |
| 8a | Optical storage | 1 |
| 8b | Magnetic storage | 1 |
| 8c | Solid state storage | 1 |
| 13a | Generic file formats | 2 |
| 13b | Image file formats | 2 |

**Total: 30 marks available**

## Example Test Answers

### Question 1: Input Devices (2 marks)
```json
{"qid": "1", "answer": ["keyboard", "mouse"]}
```
**Result:** ✅ 2/2 marks

### Question 2ai: Spreadsheet (2 marks)
```json
{"qid": "2ai", "answer": "A computer program that organizes data in rows and columns"}
```
**Result:** ✅ 2/2 marks

### Question 2b: System Software (3 marks)
```json
{"qid": "2b", "answer": ["compiler", "linker", "device driver"]}
```
**Result:** ✅ 3/3 marks

### Question 13b: Image Formats (2 marks)
```json
{"qid": "13b", "answer": ["PNG", "JPEG"]}
```
**Result:** ✅ 2/2 marks

## Understanding the Marking

### Strict Mode (Default - `practice_strict`)
- More precise matching required
- Best for learning and practice
- Acronyms must be exact (PNG, not "peng")
- Technical terms need high accuracy

### Lenient Mode (`cambridge_like`)
- More forgiving matching
- Mimics real Cambridge examiners
- Allows more synonyms
- Better for mock exams

**To use lenient mode:**
```json
{
  "paperId": "0417_2025_feb_march_12",
  "answers": [...],
  "mode": "cambridge_like"
}
```

## How the Algorithm Works

1. **Text Normalization**: Converts answers to lowercase, removes punctuation
2. **Fuzzy Matching**: Uses Levenshtein distance to calculate similarity
3. **Token Overlap**: Checks if key words are present
4. **Strictness Levels**:
   - General (82-90% similarity) - Normal text
   - Technical (90-95% similarity) - Technical terms
   - Acronym (97-100% similarity) - Acronyms like PNG, SSD

## File Structure

```
src/lib/exam/
├── types.ts                    # Type definitions
├── marking.ts                  # Core marking algorithm ⭐
├── paper-extraction.ts         # PDF parsing
├── rule-registry.ts            # Paper registry
├── fixtures/
│   └── ict_0417_12_fm_2025.ts # Mark scheme ⭐
└── README.md                   # Full documentation

src/app/api/
├── paper/route.ts              # GET paper endpoint
└── mark/route.ts               # POST marking endpoint ⭐
```

## Next Steps

### 1. Test It Out
Run the test script and try different answers to see how the marking works.

### 2. Add More Papers
To add another ICT paper:
1. Create a new fixture file (e.g., `ict_0417_11_mj_2025.ts`)
2. Define the mark scheme rules
3. Register it in `rule-registry.ts`

### 3. Build a Frontend
Create a UI where students can:
- Select a paper
- Answer questions
- Get instant feedback
- Track their progress

### 4. Integrate with Supabase
- Store student submissions
- Track progress over time
- Identify weak topics
- Generate practice recommendations

## Troubleshooting

### "Cannot connect to server"
Make sure `npm run dev` is running on port 3000

### "No mark rules registered"
You're using the wrong paper ID. Use: `0417_2025_feb_march_12`

### Getting 0 marks for correct answers
Try `cambridge_like` mode for more lenient matching

### Test script not working
Make sure Node.js is installed: `node --version`

## Documentation

- 📖 **Full Documentation**: `src/lib/exam/README.md`
- 🧪 **Testing Guide**: `TEST_EXAM_SYSTEM.md`
- 📝 **Calibration Notes**: `src/lib/exam/CALIBRATION_NOTES.md`

## Support

The system is ready to use! If you need help:
1. Check the documentation files
2. Review the test script output
3. Examine the mark scheme in `fixtures/ict_0417_12_fm_2025.ts`

---

**Built with ❤️ for IGCSE students**