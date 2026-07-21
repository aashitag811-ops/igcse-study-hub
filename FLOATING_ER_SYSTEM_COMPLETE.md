# 🎯 Floating ER Button System - Complete Implementation Guide

## Overview
This document describes the complete implementation of the Floating Examiner Report (ER) button overlay system for the PDF viewer, integrated with the Biology MCQ parser system.

---

## 📦 System Components

### 1. **Biology MCQ Parser** (✅ Complete)
- **Script**: `scripts/master-image-mcq-parser.py`
- **Batch Processor**: `scripts/batch-parse-biology.py`
- **Status**: All 86 Biology papers parsed (100% success rate)
- **Output**: 3,440 question images + 86 JSON files with 40/40 questions each

### 2. **ER Notes Extractor** (🔄 Running)
- **Script**: `scripts/extract-biology-er-notes.py`
- **Status**: Currently processing 36 Biology ER PDF files
- **Output**: Component-specific JSON cache files in `public/er-cache/`
- **Format**: `0610_m20_er_22.json` (subject_session_er_component.json)

### 3. **Frontend PDF Viewer with Floating ER Buttons** (✅ Complete)
- **Component**: `src/components/past-papers/PdfWorkspaceViewer.tsx`
- **Technology**: React-PDF (canvas-based rendering)
- **Features**:
  - Canvas-based PDF rendering (replaces iframe)
  - Floating ER buttons overlaid directly on PDF
  - Absolute positioning using coordinate mapping
  - Scrolls naturally with document
  - Click to open ER modal

### 4. **Integration Layer** (✅ Complete)
- **Component**: `src/components/past-papers/ViewPastPapersPDFMode.tsx`
- **API Route**: `src/app/api/er-notes/[paperId]/route.ts`
- **Modal**: `src/components/past-papers/ExaminerReportModal.tsx`

---

## 🏗️ Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    User Views Paper                          │
└─────────────────────────────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────┐
│         ViewPastPapersPDFMode Component                      │
│  - Fetches ER notes from API                                 │
│  - Conditionally renders PdfWorkspaceViewer if ER available  │
└─────────────────────────────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────┐
│         PdfWorkspaceViewer Component                         │
│  - Renders PDF using react-pdf (canvas-based)                │
│  - Maps question coordinates to page positions               │
│  - Overlays floating ER buttons at question locations        │
│  - Handles button clicks → triggers ER modal                 │
└─────────────────────────────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────┐
│         ExaminerReportModal Component                        │
│  - Displays ER note for selected question                    │
│  - Slide-out panel with formatted content                    │
└─────────────────────────────────────────────────────────────┘
```

---

## 📊 Data Flow

### 1. **ER Notes Extraction** (Python)
```
Biology ER PDF (0610_m20_er.pdf)
    ↓
[Python Script: extract-biology-er-notes.py]
    ↓
Component-specific JSON files
    ↓
public/er-cache/0610_m20_er_22.json
```

**JSON Structure:**
```json
{
  "1": "Examiner note for question 1...",
  "2": "Examiner note for question 2...",
  ...
  "40": "Examiner note for question 40..."
}
```

### 2. **Frontend ER Fetching** (TypeScript)
```
User opens paper (0610_m20_qp_22)
    ↓
[API Route: /api/er-notes/0610_m20_qp_22]
    ↓
Parses paper ID → component code (22)
    ↓
Reads: public/er-cache/0610_m20_er_22.json
    ↓
Returns: { notes: { "1": "...", "2": "...", ... } }
    ↓
Component stores in state: erNotes
```

### 3. **Floating Button Rendering** (React)
```
PdfWorkspaceViewer receives:
  - pdfUrl: "/api/pdfs/0610_m20_qp_22.pdf"
  - erNotes: { "1": "...", "2": "...", ... }
  - onERClick: (qNum) => openModal(qNum)
    ↓
For each PDF page:
  1. Render page canvas
  2. Filter questionCoordinates for this page
  3. For each question with ER note:
     - Render floating button at (x, y) position
     - Button positioned absolutely over canvas
    ↓
User clicks button
    ↓
onERClick(questionNumber) triggered
    ↓
ExaminerReportModal opens with note
```

---

## 🎨 UI/UX Features

### Floating ER Buttons
- **Appearance**: Dark background with amber accent
- **Position**: Left margin, aligned with question numbers
- **Behavior**: 
  - Hover: Scale up slightly
  - Click: Open ER modal
  - Scroll: Moves naturally with PDF content
- **Visibility**: Only shown when ER notes exist for that question

### ER Modal
- **Layout**: Slide-out panel from right
- **Content**: Formatted examiner feedback
- **Close**: Click backdrop or close button

---

## 🔧 Configuration

### Question Coordinate Mapping
Currently using mock coordinates in `PdfWorkspaceViewer.tsx`:

```typescript
const questionCoordinates = [
  { qNum: 1, topPx: 180, page: 1 },
  { qNum: 2, topPx: 420, page: 1 },
  { qNum: 3, topPx: 710, page: 1 },
  // ... more coordinates
];
```

**Future Enhancement**: Auto-generate coordinates by:
1. Parsing PDF text layer
2. Detecting question number positions
3. Calculating pixel offsets
4. Storing in JSON alongside paper data

---

## 📝 Usage Example

### For Students:
1. Navigate to Past Papers section
2. Select a Biology MCQ paper (e.g., 0610 Feb/March 2020 Paper 22)
3. If ER notes available, see amber "ER Available" badge
4. Scroll through PDF - floating ER buttons appear next to questions
5. Click any ER button to view examiner feedback
6. Read insights about common mistakes and tips
7. Close modal and continue studying

### For Developers:
```typescript
// Use the PdfWorkspaceViewer component
<PdfWorkspaceViewer
  pdfUrl="/api/pdfs/0610_m20_qp_22.pdf"
  erNotes={erNotesObject}
  onERClick={(qNum) => handleERClick(qNum)}
/>
```

---

## 🚀 Deployment Checklist

- [x] Install react-pdf and pdfjs-dist
- [x] Create PdfWorkspaceViewer component
- [x] Integrate with ViewPastPapersPDFMode
- [x] Create ER extraction script
- [ ] Run ER extraction for all Biology papers (in progress)
- [ ] Generate accurate question coordinates
- [ ] Test on multiple papers
- [ ] Optimize performance for large PDFs
- [ ] Add loading states
- [ ] Handle edge cases (missing ER, PDF load errors)

---

## 🔮 Future Enhancements

### Phase 1: Complete Biology
- [ ] Finish ER extraction for all 36 Biology ER files
- [ ] Generate accurate coordinate maps for all papers
- [ ] Test with real users

### Phase 2: Expand to Other Subjects
- [ ] Economics (0455) - 86+ papers
- [ ] Chemistry (0620) - 86+ papers
- [ ] Physics (0625) - 86+ papers
- [ ] ICT (0417) - Already has some ER files

### Phase 3: Advanced Features
- [ ] Auto-coordinate detection using PDF.js text layer
- [ ] ER note search/filter
- [ ] Highlight common mistake patterns
- [ ] Track which ER notes user has read
- [ ] Export ER notes as study guide

---

## 📚 Related Documentation

- `IMAGE_MCQ_PARSER_SYSTEM.md` - MCQ parser documentation
- `MCQ_PARSER_COMPLETE_SUMMARY.md` - Parser implementation summary
- `BIOLOGY_MCQ_COMPLETE_SUMMARY.md` - Biology parsing results

---

## 🐛 Known Issues

1. **TypeScript CSS Import Warnings**: 
   - Issue: react-pdf CSS imports show TS errors
   - Impact: None (warnings only, functionality works)
   - Fix: Add type declarations or ignore warnings

2. **Mock Coordinates**:
   - Issue: Using hardcoded question positions
   - Impact: Buttons may not align perfectly with all papers
   - Fix: Implement auto-coordinate detection

3. **Performance**:
   - Issue: Large PDFs may load slowly
   - Impact: Initial render delay
   - Fix: Implement lazy loading, page virtualization

---

## 💡 Tips for Maintenance

1. **Adding New Papers**: Run the ER extraction script on new ER PDFs
2. **Updating Coordinates**: Modify `questionCoordinates` array in PdfWorkspaceViewer
3. **Styling Changes**: Update Tailwind classes in component
4. **API Changes**: Modify `/api/er-notes/[paperId]/route.ts`

---

**Last Updated**: June 6, 2026  
**Status**: Phase 4 In Progress - ER extraction running, frontend complete  
**Next Step**: Complete ER extraction, then test with real papers