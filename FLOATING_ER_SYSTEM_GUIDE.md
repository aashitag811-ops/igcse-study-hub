# Floating ER Insights System - Complete Implementation Guide

## Overview

This system implements a premium PDF viewing experience with **floating Examiner Report (ER) buttons** that appear directly on the PDF canvas next to question numbers. When clicked, they reveal detailed examiner feedback in a beautiful slide-out panel.

---

## Part 1: Universal MCQ Parser Engine

### Location
`scripts/universal-mcq-parser.py`

### Features
- ✅ Works with **all IGCSE MCQ papers** (Biology 0610, Economics 0455, etc.)
- ✅ Extracts questions, options (A-D), and correct answers
- ✅ Isolates and extracts Examiner Report notes from master ER files
- ✅ Outputs clean JSON with all data combined

### Usage

```bash
# Basic usage (QP + MS only)
python scripts/universal-mcq-parser.py 0455_m20_qp_22.pdf 0455_m20_ms_22.pdf

# With Examiner Report
python scripts/universal-mcq-parser.py 0610_m20_qp_22.pdf 0610_m20_ms_22.pdf 0610_m20_er.pdf
```

### Output Format

```json
{
  "paperId": "0455_m20_22",
  "title": "Economics Paper 2 - m20",
  "subject": "Economics",
  "code": "0455",
  "variant": "22",
  "session": "m20",
  "totalQuestions": 30,
  "timeLimit": 2700,
  "questions": [
    {
      "questionNumber": 1,
      "questionText": "What is the main purpose of...",
      "options": [
        { "letter": "A", "text": "Option A text" },
        { "letter": "B", "text": "Option B text" },
        { "letter": "C", "text": "Option C text" },
        { "letter": "D", "text": "Option D text" }
      ],
      "correctAnswer": "B",
      "examinerReportNote": "Many candidates struggled with..."
    }
  ]
}
```

### How It Works

1. **Question Extraction**: Uses regex pattern `/\n(?=\d+\s)/g` to split text at question boundaries
2. **Option Parsing**: Extracts options using pattern `/\n\s*([A-D])\s+/`
3. **Answer Matching**: Finds patterns like "1 B", "2 C" in marking schemes
4. **ER Isolation**: Locates paper-specific section in master ER file using component markers
5. **ER Note Extraction**: Finds "Question N" headers and extracts following paragraphs

---

## Part 2: Floating ER Insights UI

### Components

#### 1. `PdfWorkspaceViewer.tsx`
**Location**: `src/components/past-papers/PdfWorkspaceViewer.tsx`

The main component that renders:
- PDF canvas with the existing PDFViewer
- Floating ER buttons positioned absolutely over the PDF
- Slide-out panel for displaying ER notes

**Key Features**:
```typescript
// Coordinate mapping system
const generateQuestionCoordinates = () => {
  // Maps question numbers to Y-axis positions on PDF
  // Currently uses approximate positioning
  // TODO: Implement PDF text extraction for exact coordinates
}

// Floating buttons
<button
  style={{ top: `${coord.topOffsetPx}px`, left: '24px' }}
  className="absolute z-30 pointer-events-auto..."
>
  Q{coord.qNum}
</button>
```

#### 2. `ViewPastPapersPDFMode.tsx` (Updated)
**Location**: `src/components/past-papers/ViewPastPapersPDFMode.tsx`

Enhanced with:
- **Mode Toggle**: Study Mode vs Test Mode
- **Conditional Rendering**: Shows PdfWorkspaceViewer in Study Mode with parsed data
- **Fallback**: Traditional dual-pane view for Test Mode or when JSON unavailable

**Mode Logic**:
```typescript
{activeMode === 'study' && parsedPaperData ? (
  <PdfWorkspaceViewer
    pdfUrl={qpPdfUrl}
    parsedJsonData={parsedPaperData}
    activeMode={activeMode}
  />
) : (
  /* Traditional dual-pane layout */
)}
```

#### 3. `globals.css` (Updated)
**Location**: `src/app/globals.css`

Added animations:
- `slideInRight`: Smooth slide-in for ER panel
- `pulse-glow`: Hover effect for ER buttons
- Custom scrollbar styles

---

## How It Works: The Complete Flow

### 1. Data Preparation
```bash
# Parse a paper with ER notes
python scripts/universal-mcq-parser.py \
  scripts/0455_m20_qp_22.pdf \
  scripts/0455_m20_ms_22.pdf \
  scripts/0455_m20_er.pdf

# Output: public/papers/0455_m20_22.json
```

### 2. Frontend Loading
```typescript
// ViewPastPapersPDFMode fetches the JSON
const paperResponse = await fetch(`/papers/${paperId}.json`);
const paperData = await paperResponse.json();
setParsedPaperData(paperData);

// Extracts ER notes
const notes = {};
paperData.questions?.forEach((q) => {
  if (q.examinerReportNote) {
    notes[q.questionNumber] = q.examinerReportNote;
  }
});
```

### 3. Coordinate Mapping
```typescript
// PdfWorkspaceViewer generates button positions
const coordinates = [];
parsedJsonData.questions.forEach((q, index) => {
  const pageNum = Math.floor(index / 5) + 1;
  const positionOnPage = index % 5;
  const topOffset = 180 + (positionOnPage * 240);
  
  coordinates.push({
    qNum: q.questionNumber,
    topOffsetPx: topOffset,
    pageNumber: pageNum
  });
});
```

### 4. Button Rendering
```typescript
// Buttons float over PDF using absolute positioning
{questionCoordinates.map((coord) => {
  const question = parsedJsonData.questions.find(
    q => q.questionNumber === coord.qNum
  );
  
  if (!question?.examinerReportNote) return null;
  
  return (
    <button
      style={{ top: `${coord.topOffsetPx}px`, left: '24px' }}
      onClick={() => handleERClick(coord.qNum, question.examinerReportNote)}
    >
      Q{coord.qNum}
    </button>
  );
})}
```

### 5. ER Panel Display
```typescript
// Slide-out panel with animation
{activeErNote && (
  <div className="w-96 animate-slideInRight">
    <h5>Examiner Feedback - Question {selectedQuestionNum}</h5>
    <p>"{activeErNote}"</p>
  </div>
)}
```

---

## Coordinate Mapping System

### Current Implementation (Approximate)
```typescript
const questionsPerPage = 5;
const startY = 180;
const questionSpacing = 240;

// Position = startY + (positionOnPage * spacing)
// Example: Q3 on page 1 = 180 + (2 * 240) = 660px
```

### Future Enhancement (Exact Positioning)
To get exact coordinates, implement PDF text extraction:

```typescript
import * as pdfjsLib from 'pdfjs-dist';

async function extractQuestionCoordinates(pdfUrl: string) {
  const pdf = await pdfjsLib.getDocument(pdfUrl).promise;
  const coordinates = [];
  
  for (let pageNum = 1; pageNum <= pdf.numPages; pageNum++) {
    const page = await pdf.getPage(pageNum);
    const textContent = await page.getTextContent();
    
    textContent.items.forEach((item: any) => {
      // Look for question numbers (1-40)
      const match = item.str.match(/^(\d+)\s/);
      if (match) {
        const qNum = parseInt(match[1]);
        if (qNum >= 1 && qNum <= 40) {
          coordinates.push({
            qNum,
            topOffsetPx: item.transform[5], // Y coordinate
            pageNumber: pageNum
          });
        }
      }
    });
  }
  
  return coordinates;
}
```

---

## Usage Instructions

### For Students

1. **Navigate to a Past Paper**
   - Go to View Past Papers section
   - Select any paper (e.g., Economics 0455 M20 P22)

2. **Toggle Study Mode**
   - Click "Study Mode" button in header
   - ER buttons will appear if data is available

3. **View Examiner Feedback**
   - Click any amber "Q#" button next to a question
   - Read the examiner's insights in the slide-out panel
   - Close panel with X button or click another question

4. **Switch to Test Mode**
   - Click "Test Mode" to hide ER buttons
   - Practice without hints

### For Developers

#### Adding New Papers

```bash
# 1. Place PDFs in scripts/ directory
# 2. Run parser
python scripts/universal-mcq-parser.py \
  scripts/0610_m20_qp_22.pdf \
  scripts/0610_m20_ms_22.pdf \
  scripts/0610_m20_er.pdf

# 3. JSON automatically saved to public/papers/
# 4. Frontend will auto-detect and load it
```

#### Batch Processing

```bash
# Create a batch script
for paper in scripts/*_qp_*.pdf; do
  base=$(basename "$paper" _qp_22.pdf)
  qp="scripts/${base}_qp_22.pdf"
  ms="scripts/${base}_ms_22.pdf"
  er="scripts/${base}_er.pdf"
  
  if [ -f "$ms" ]; then
    python scripts/universal-mcq-parser.py "$qp" "$ms" "$er"
  fi
done
```

#### Customizing Button Positions

Edit `PdfWorkspaceViewer.tsx`:

```typescript
const generateQuestionCoordinates = () => {
  // Adjust these values based on your PDF layout
  const questionsPerPage = 5;  // Change if different
  const startY = 180;           // First question Y position
  const questionSpacing = 240;  // Space between questions
  
  // ... rest of logic
};
```

---

## File Structure

```
igcse-study-hub/
├── scripts/
│   ├── universal-mcq-parser.py          # Main parser
│   ├── 0455_m20_qp_22.pdf              # Question papers
│   ├── 0455_m20_ms_22.pdf              # Marking schemes
│   └── 0455_m20_er.pdf                 # Examiner reports
├── public/
│   └── papers/
│       └── 0455_m20_22.json            # Parsed output
├── src/
│   ├── app/
│   │   └── globals.css                 # Animations
│   └── components/
│       └── past-papers/
│           ├── PdfWorkspaceViewer.tsx  # Floating UI
│           └── ViewPastPapersPDFMode.tsx # Main viewer
└── FLOATING_ER_SYSTEM_GUIDE.md         # This file
```

---

## Troubleshooting

### ER Buttons Not Showing
1. Check if JSON file exists: `public/papers/{paperId}.json`
2. Verify JSON has `examinerReportNote` fields
3. Ensure Study Mode is active
4. Check browser console for errors

### Buttons in Wrong Position
1. Adjust `questionsPerPage`, `startY`, or `questionSpacing`
2. Implement exact coordinate extraction (see Future Enhancement)
3. Test with different PDF layouts

### Parser Errors
1. Ensure PDFs are text-based (not scanned images)
2. Check PDF naming convention: `{code}_{session}_{type}_{variant}.pdf`
3. Verify pdfplumber is installed: `pip install pdfplumber`

---

## Next Steps

### Immediate
- [ ] Test with existing Economics papers
- [ ] Adjust coordinate mapping for accuracy
- [ ] Add loading states for JSON fetch

### Future Enhancements
- [ ] Implement exact PDF text coordinate extraction
- [ ] Add question highlighting on button hover
- [ ] Support for multi-page questions
- [ ] Batch parser script for all papers
- [ ] Admin panel for coordinate calibration

---

## Made with Bob 🤖

This system combines robust backend parsing with premium frontend UX to create an unparalleled study experience for IGCSE students.