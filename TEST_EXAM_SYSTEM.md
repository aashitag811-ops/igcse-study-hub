# Testing the Exam Marking System

## Overview
The exam marking system is ready to test! It currently supports **ICT 0417/12 February/March 2025** paper.

## Quick Test Guide

### 1. Start the Development Server
```bash
npm run dev
```

### 2. Test the API Endpoints

#### A. Get a Question Paper
```bash
curl "http://localhost:3000/api/paper?subject=0417&year=2025&session=feb_march&paper=1&variant=2"
```

**Expected Response:**
```json
{
  "id": "0417_2025_feb_march_12",
  "selector": {
    "subjectCode": "0417",
    "year": 2025,
    "session": "feb_march",
    "paper": 1,
    "variant": 2
  },
  "title": "0417/12 2025 feb_march",
  "questions": [
    {
      "qid": "1",
      "prompt": "Circle two input devices.",
      "marks": 2,
      "answerType": "multi_select",
      "expectedItems": 2,
      "sourcePage": 1
    },
    ...
  ]
}
```

#### B. Mark Student Answers (Perfect Score Example)
```bash
curl -X POST http://localhost:3000/api/mark \
  -H "Content-Type: application/json" \
  -d '{
    "paperId": "0417_2025_feb_march_12",
    "answers": [
      {"qid": "1", "answer": ["keyboard", "mouse"]},
      {"qid": "2ai", "answer": "A computer program that organizes data in rows and columns"},
      {"qid": "2aii", "answer": ["computer program", "structured data"]},
      {"qid": "2aiii", "answer": "A small computer program that runs within a larger application"},
      {"qid": "2b", "answer": ["compiler", "linker", "device driver"]}
    ],
    "mode": "practice_strict"
  }'
```

**Expected Response:**
```json
{
  "mode": "practice_strict",
  "totalAwarded": 11,
  "totalAvailable": 11,
  "percentage": 100,
  "questions": [
    {
      "qid": "1",
      "awarded": 2,
      "maxMarks": 2,
      "matchedPointIds": ["keyboard", "mouse"],
      "feedback": ["✓ keyboard (+1)", "✓ mouse (+1)"]
    },
    ...
  ]
}
```

#### C. Mark with Partial Credit
```bash
curl -X POST http://localhost:3000/api/mark \
  -H "Content-Type: application/json" \
  -d '{
    "paperId": "0417_2025_feb_march_12",
    "answers": [
      {"qid": "1", "answer": ["keyboard", "printer"]},
      {"qid": "2ai", "answer": "software for organizing data"},
      {"qid": "2b", "answer": ["compiler", "operating system"]}
    ],
    "mode": "practice_strict"
  }'
```

## Available Questions in ICT 0417/12 FM 2025

| Question ID | Topic | Max Marks | Answer Type |
|-------------|-------|-----------|-------------|
| 1 | Input devices | 2 | multi_select |
| 2ai | Spreadsheet definition | 2 | short_text |
| 2aii | Database definition | 2 | list_n |
| 2aiii | Applet definition | 2 | short_text |
| 2b | System software types | 3 | list_n |
| 3a | Expert system diagnosis | 4 | list_n |
| 3b | Expert system errors | 2 | list_n |
| 4a | Test data | 1 | list_n |
| 4b | Data protection | 2 | list_n |
| 4c | Test plan | 2 | list_n |
| 5b | Encryption | 2 | list_n |
| 5c | Email security | 3 | list_n |
| 8a | Optical storage reader | 1 | list_n |
| 8b | Magnetic storage reader | 1 | list_n |
| 8c | Solid state storage | 1 | list_n |
| 13a | Generic file formats need | 2 | list_n |
| 13b | Image file formats | 2 | list_n |

## Sample Test Answers

### Question 1: Input Devices (2 marks)
**Correct answers:** keyboard, mouse
**Partial credit:** keyboard + printer (1 mark)
**No credit:** printer + speaker (0 marks)

### Question 2ai: Spreadsheet (2 marks)
**Full credit examples:**
- "A computer program that organizes data in rows and columns"
- "Software application with tabular format"

**Partial credit (1 mark):**
- "Computer program for data" (missing rows/columns)
- "Organizes data in rows and columns" (missing program/software)

### Question 2b: System Software (3 marks)
**Correct answers (any 3):**
- compiler
- linker
- device driver
- operating system / OS
- utility / utility software

### Question 13b: Image Formats (2 marks)
**Correct answers (any 2):**
- GIF / Graphics Interchange Format
- JPEG / JPG / Joint Photographic Experts Group
- PNG / Portable Network Graphics
- SVG / Scalable Vector Graphics

## Marking Modes

### 1. practice_strict (Default)
- Stricter matching for learning
- No fuzzy matching for acronyms
- Higher similarity thresholds
- Best for practice and learning

### 2. cambridge_like
- More lenient matching
- Allows synonyms
- Mimics real Cambridge examiner tolerance
- Best for mock exams

**To use cambridge_like mode:**
```json
{
  "paperId": "0417_2025_feb_march_12",
  "answers": [...],
  "mode": "cambridge_like"
}
```

## Testing Tips

1. **Test exact matches first** - Use the exact acceptable answers from the mark scheme
2. **Test synonyms** - Try alternative phrasings to see fuzzy matching in action
3. **Test partial answers** - Submit incomplete answers to verify partial credit
4. **Test wrong answers** - Submit incorrect answers to ensure they get 0 marks
5. **Test both modes** - Compare strict vs lenient marking

## Common Issues

### Issue: "No mark rules registered for paperId"
**Solution:** Make sure you're using the correct paper ID: `0417_2025_feb_march_12`

### Issue: Getting 0 marks for correct answers
**Solution:** Check if your answer is close enough to acceptable answers. Try `cambridge_like` mode for more lenient matching.

### Issue: API endpoint not found
**Solution:** Make sure the dev server is running on port 3000

## Next Steps

After testing the API:
1. Build a frontend UI for students to answer questions
2. Add more ICT papers (0417/11, 0417/21, etc.)
3. Integrate with Supabase to store student progress
4. Add PDF extraction for automatic paper loading

## Need Help?

Check the detailed documentation:
- `src/lib/exam/README.md` - Full system documentation
- `src/lib/exam/CALIBRATION_NOTES.md` - Marking calibration notes
- `src/lib/exam/STRICT_MARKING_POLICY.md` - Marking policy details