# MCQ System Setup & Paper Naming Convention

## 📋 Overview
This document explains the MCQ system setup for the IGCSE Study Hub, focusing on the 4 subjects with actual Multiple Choice Question papers.

## 🎯 Subjects with MCQ Papers

### Science Subjects (Core & Extended)
These subjects have **separate MCQ papers** for Core and Extended tiers:

| Subject Code | Subject Name | Core Paper | Extended Paper |
|--------------|--------------|------------|----------------|
| **0610** | Biology | Paper 1 (11, 12, 13) | Paper 2 (21, 22, 23) |
| **0620** | Chemistry | Paper 1 (11, 12, 13) | Paper 2 (21, 22, 23) |
| **0625** | Physics | Paper 1 (11, 12, 13) | Paper 2 (21, 22, 23) |

### Business & Humanities
| Subject Code | Subject Name | MCQ Paper | Notes |
|--------------|--------------|-----------|-------|
| **0455** | Economics | Paper 1 (all variants) | No Core/Extended split |

## 📝 Paper Naming Convention

### Format: `{code}_{session}{year}_qp_{paper}{variant}`

**Examples:**
- `0610_m20_qp_22` = Biology, March 2020, Paper 2 (Extended), Variant 2
- `0610_s21_qp_11` = Biology, May/June 2021, Paper 1 (Core), Variant 1
- `0455_w23_qp_12` = Economics, Oct/Nov 2023, Paper 1, Variant 2

### Session Codes
- `m` = Feb/March
- `s` = May/June  
- `w` = Oct/Nov (Winter)

### Paper Numbers (Sciences Only)
- **Paper 1** = Core (40 MCQs, grades C-G target)
- **Paper 2** = Extended (40 MCQs, grades A*-C target)

### Variant Numbers
- `1`, `2`, `3` = Different time zones (same difficulty)

## 🚫 Subjects WITHOUT MCQ Papers

The following subjects in your folder structure do **NOT** have standalone MCQ papers:

| Subject Code | Subject Name | Assessment Type |
|--------------|--------------|-----------------|
| 0450 | Business Studies | Short answer & case studies |
| 0452 | Accounting | Structured accounting tasks |
| 0580 | Mathematics | Written working (Core: Papers 1&3, Extended: Papers 2&4) |
| 0606 | Additional Mathematics | Written working only |
| 0417 | ICT | Theory + practical exams |
| 0457 | Global Perspectives | Research & projects |
| 0500 | First Language English | Essays & comprehension |
| 0520 | French | Listening/reading/writing |
| 0549 | Hindi | Listening/reading/writing |

## 🔧 Current System Status

### ✅ Working
- MCQ selection dashboard at `/mcq-test`
- MCQ exam interface at `/mcq-exam/[paperId]`
- Economics (0455) added to subject selection
- Timer, pause, submit functionality
- Zoom controls and question navigation

### 📦 Available Papers
Currently parsed and available:
- **Biology (0610)**: 5 papers (m20_22, m25_22, s25_22, w25_22)
- **Chemistry (0620)**: 0 papers ❌
- **Physics (0625)**: 0 papers ❌
- **Economics (0455)**: 0 papers ❌
- **ICT (0417)**: 28 papers (but ICT has no MCQs - these need review)

### 🎯 Next Steps
1. Parse Chemistry MCQ papers (Paper 1 & 2)
2. Parse Physics MCQ papers (Paper 1 & 2)
3. Parse Economics MCQ papers (Paper 1 only)
4. Review ICT papers (may not be true MCQs)

## 🖥️ Running Locally

### Start Development Server
```bash
npm run dev
```
Server runs on: `http://localhost:3002`

### Access MCQ System
1. Navigate to: `http://localhost:3002/mcq-test`
2. Select subject, year, and session
3. Click "Load Question Paper"

### Test with Available Papers
- Biology March 2020 Extended: `0610_m20_qp_22`
- Biology March 2025 Extended: `0610_m25_qp_22`
- Biology May/June 2025 Extended: `0610_s25_qp_22`

## 📁 File Structure

```
public/
├── papers/           # JSON files with parsed MCQs
│   ├── 0610_m20_qp_22.json
│   ├── 0610_m25_qp_22.json
│   └── ...
└── pdfs/            # Original PDF files (QP & MS)
    ├── 0610_m20_qp_22.pdf
    ├── 0610_m20_ms_22.pdf
    └── ...

src/
├── app/
│   ├── mcq-test/           # Selection dashboard
│   │   └── page.tsx
│   └── mcq-exam/           # Exam interface
│       └── [paperId]/
│           └── page.tsx
└── components/
    └── mcq/
        ├── MCQQuestionCard.tsx
        ├── MCQTimer.tsx
        └── MCQNavigation.tsx
```

## 🔍 Parser Requirements

For parsing new papers, the JSON format must include:

```json
{
  "paperCode": "0610_m20_qp_22",
  "paperName": "Biology Paper 2 (Extended) - March 2020",
  "subject": "Biology",
  "subjectCode": "0610",
  "year": 2020,
  "session": "March",
  "variant": 2,
  "tier": "Extended",
  "totalQuestions": 40,
  "timeLimit": 2700,
  "questions": [
    {
      "questionNumber": 1,
      "questionText": "...",
      "options": {
        "A": "...",
        "B": "...",
        "C": "...",
        "D": "..."
      },
      "correctAnswer": "A",
      "hasImage": false,
      "imagePath": null
    }
  ]
}
```

## 🎓 Core vs Extended Guidance

### When to Use Core (Paper 1)
- Target grades: C, D, E, F, G
- Foundation level content
- Suitable for students needing more support

### When to Use Extended (Paper 2)
- Target grades: A*, A, B, C
- Advanced content
- Suitable for higher-achieving students

**Note:** Both papers have 40 MCQs and 45-minute time limits.

---

**Made with Bob** 🤖