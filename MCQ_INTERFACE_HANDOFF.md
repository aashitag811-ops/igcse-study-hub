# MCQ Interface & Auto-Corrector - Complete Handoff Document

## Project Overview

A complete MCQ (Multiple Choice Question) practice system for IGCSE Biology Paper 22 with 40 questions. The system extracts questions from PDFs, displays them with high-quality images, provides a timed exam interface, and automatically grades answers with in-place result display.

---

## System Architecture

### Technology Stack
- **Frontend**: Next.js 15 (App Router), React 18, TypeScript
- **Styling**: Tailwind CSS with dark mode support
- **PDF Processing**: Python with PyMuPDF (fitz) at 2x DPI resolution
- **State Management**: React hooks (useState, useEffect, useCallback)
- **Image Storage**: Public directory with cache-busting

### Key Components

```
src/components/mcq/
├── MCQInterface.tsx       # Main exam container (state management, logic)
├── MCQQuestion.tsx        # Question display with answer circles
├── MCQTimer.tsx          # Countdown timer (45:00 format)
├── MCQNavigation.tsx     # Previous/Next/Submit buttons
└── MCQHeader.tsx         # Paper title, timer, calculator, pause

public/
├── papers/
│   └── 0610_m20_qp_22.json    # Question data with correct answers
└── images/biology/questions/
    ├── q1.png - q40.png        # High-res question images (2x DPI)
```

---

## Core Features

### 1. Exam Mode (Before Submission)

**Timer**
- Counts down from 45:00 (45 minutes)
- Format: MM:SS (e.g., "44:18")
- Pauses when user clicks pause button
- Stops when exam is submitted

**Question Display**
- Shows one question at a time
- High-quality PNG image (2x DPI extraction)
- Four answer circles: A, B, C, D (48px diameter)
- Hover effects on circles
- Selected circle highlighted in blue

**Navigation**
- Previous button: Go to previous question
- Next button: Go to next question
- Submit button: Only visible on last question (Q40)
- "Mark Out of Syllabus" button: Flag questions not in syllabus

**Calculator & Pause**
- Calculator icon opens system calculator
- Pause button stops timer temporarily

### 2. Review Mode (After Submission)

**CRITICAL DESIGN**: Same single-question interface, just with updated styling

**Results Summary Banner**
- Appears at top after submission
- Shows: Score (38/40), Percentage (95%), Grade (A*)
- Instruction: "Use Previous/Next buttons to review all questions"

**In-Place Answer Feedback**
- Green circle: Correct answer
- Red circle: Incorrect answer (user's choice)
- Green circle: Correct answer (if user was wrong)
- Text below question: "Your answer: B | Correct answer: C"

**Navigation**
- Previous/Next buttons remain functional
- Can review all 40 questions
- Submit button disappears
- Cannot change answers (clicking disabled)

---

## Data Structure

### Paper JSON Format (`0610_m20_qp_22.json`)

```json
{
  "paperId": "0610_m20_qp_22",
  "title": "Biology Paper 2 - Feb/March 2020",
  "subject": "Biology",
  "syllabus": "0610",
  "year": 2020,
  "session": "m",
  "paper": "22",
  "totalQuestions": 40,
  "timeLimit": 45,
  "questions": [
    {
      "questionNumber": 1,
      "imagePath": "/images/biology/questions/q1.png?v=13",
      "correctAnswer": "B",
      "marks": 1
    }
    // ... 39 more questions
  ]
}
```

### Exam State Interface

```typescript
interface ExamState {
  currentQuestionIndex: number;           // 0-39
  userAnswers: Map<number, 'A'|'B'|'C'|'D'>; // Question index -> Answer
  timeRemaining: number;                  // Seconds remaining
  isSubmitted: boolean;                   // Triggers review mode
  result: ExamResult | null;              // Calculated after submission
}

interface ExamResult {
  totalQuestions: number;
  correctAnswers: number;
  score: number;                          // Percentage
  answers: Array<{
    questionNumber: number;
    userAnswer: string | null;
    correctAnswer: string;
    isCorrect: boolean;
  }>;
}
```

---

## PDF Extraction Process

### Python Parser (`scripts/perfect-sample-parser.py`)

**Key Features:**
- Extracts questions at 2x DPI (300 DPI) for sharp images
- Handles special cases (Q20, Q40 with different boundaries)
- Crops to exact question boundaries
- Saves as PNG with cache-busting version number

**Extraction Logic:**
```python
# Standard question extraction
y_start = 100  # Top margin
y_end = 750    # Bottom margin (before next question)

# Special cases
if question_num == 20:
    y_end = 820  # Extends lower
if question_num == 40:
    y_end = page_height - 50  # Last question to page bottom
```

**Output:**
- 40 PNG files: `q1.png` to `q40.png`
- Location: `public/images/biology/questions/`
- Cache-busting: `?v=13` appended to URLs

---

## Component Details

### MCQInterface.tsx (Main Container)

**State Management:**
```typescript
const [examState, setExamState] = useState<ExamState>({
  currentQuestionIndex: 0,
  userAnswers: new Map(),
  timeRemaining: paper.timeLimit * 60,
  isSubmitted: false,
  result: null
});
```

**Key Functions:**
- `handleAnswerSelect(answer)`: Records user's answer
- `handleSubmit()`: Calculates results, sets isSubmitted=true
- `handlePrevious()`: Navigate to previous question
- `handleNext()`: Navigate to next question
- `toggleOutOfSyllabus()`: Mark question as out of syllabus

**Conditional Rendering:**
```typescript
// SAME layout for both modes
<MCQQuestion
  question={currentQuestion}
  selectedAnswer={currentAnswer}
  onAnswerSelect={examState.isSubmitted ? () => {} : handleAnswerSelect}
  isSubmitted={examState.isSubmitted}
  correctAnswer={examState.isSubmitted ? currentQuestion.correctAnswer : undefined}
/>
```

### MCQQuestion.tsx (Question Display)

**Props:**
```typescript
interface MCQQuestionProps {
  question: Question;
  selectedAnswer?: 'A' | 'B' | 'C' | 'D';
  onAnswerSelect: (answer: 'A' | 'B' | 'C' | 'D') => void;
  isSubmitted?: boolean;
  correctAnswer?: string;
}
```

**Color Logic:**
```typescript
// During exam: Blue if selected
// After submission:
//   - Green if correct answer
//   - Red if user's wrong answer
//   - Gray if not selected

const getCircleColor = (option: string) => {
  if (isSubmitted && correctAnswer) {
    if (option === correctAnswer) return 'green'; // Correct answer
    if (option === selectedAnswer) return 'red';  // User's wrong answer
    return 'gray';                                 // Not selected
  }
  return option === selectedAnswer ? 'blue' : 'gray'; // Exam mode
};
```

### MCQTimer.tsx (Countdown Timer)

**Format Function:**
```typescript
const formatTime = (seconds: number): string => {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins}:${secs.toString().padStart(2, '0')}`;
};
// Output: "44:18" not "44 hrs"
```

**Timer Logic:**
```typescript
useEffect(() => {
  if (isPaused || timeRemaining <= 0) return;
  
  const interval = setInterval(() => {
    setTimeRemaining(prev => Math.max(0, prev - 1));
  }, 1000);
  
  return () => clearInterval(interval);
}, [isPaused, timeRemaining]);
```

### MCQNavigation.tsx (Navigation Buttons)

**Props:**
```typescript
interface MCQNavigationProps {
  currentIndex: number;
  totalQuestions: number;
  isLastQuestion: boolean;
  hasAnswer: boolean;
  onPrevious: () => void;
  onNext: () => void;
  onSubmit?: () => void;  // Undefined after submission
}
```

**Button Logic:**
- Previous: Disabled on Q1
- Next: Disabled on Q40 (show Submit instead)
- Submit: Only visible on Q40, disappears after submission

---

## Styling & Design

### Color Scheme

**Light Mode:**
- Background: White (`bg-white`)
- Text: Gray-900 (`text-gray-900`)
- Circles: Blue (selected), Gray (unselected)
- Results: Green (correct), Red (incorrect)

**Dark Mode:**
- Background: Slate-900 (`dark:bg-slate-900`)
- Text: Gray-100 (`dark:text-gray-100`)
- Circles: Blue (selected), Slate-700 (unselected)
- Results: Green-400 (correct), Red-400 (incorrect)

### Answer Circle Styling

```css
/* Base circle */
width: 48px;
height: 48px;
border-radius: 50%;
font-size: 20px;
font-weight: 600;

/* Hover effect (exam mode only) */
transform: scale(1.05);
box-shadow: 0 4px 12px rgba(0,0,0,0.15);

/* Selected (exam mode) */
background: blue-500;
color: white;
border: 3px solid blue-600;

/* Correct (review mode) */
background: green-500;
color: white;
border: 3px solid green-600;

/* Incorrect (review mode) */
background: red-500;
color: white;
border: 3px solid red-600;
```

### Responsive Design

- Max width: 5xl (1280px)
- Padding: Responsive (px-4 sm:px-6 lg:px-8)
- No scrolling required for questions
- Mobile-friendly button sizes

---

## File Locations

### Frontend Components
```
src/components/mcq/
├── MCQInterface.tsx       # Lines 1-380 (main logic)
├── MCQQuestion.tsx        # Lines 1-150 (question display)
├── MCQTimer.tsx          # Lines 1-80 (timer logic)
├── MCQNavigation.tsx     # Lines 1-100 (navigation)
└── MCQHeader.tsx         # Lines 1-120 (header with timer)
```

### Data Files
```
public/papers/0610_m20_qp_22.json          # Question data
public/images/biology/questions/q1.png     # Question 1 image
public/images/biology/questions/q2.png     # Question 2 image
...
public/images/biology/questions/q40.png    # Question 40 image
```

### Python Scripts
```
scripts/perfect-sample-parser.py           # Main parser (2x DPI)
scripts/biology-mcq-parser.py             # Alternative parser
scripts/requirements.txt                   # Python dependencies
```

---

## How to Add New Papers

### Step 1: Prepare PDF Files
1. Place question paper PDF in `scripts/` folder
2. Place marking scheme PDF in `scripts/` folder
3. Name format: `0610_m20_qp_22.pdf` and `0610_m20_ms_22.pdf`

### Step 2: Run Parser
```bash
cd scripts
python perfect-sample-parser.py
```

**Parser will:**
- Extract all 40 questions as PNG images
- Save to `public/images/biology/questions/`
- Create JSON file with correct answers from marking scheme
- Save to `public/papers/0610_m20_qp_22.json`

### Step 3: Update Cache Version
In JSON file, increment version number:
```json
"imagePath": "/images/biology/questions/q1.png?v=14"
```

### Step 4: Test
```bash
npm run dev
# Navigate to: http://localhost:3000/mcq-exam/0610_m20_qp_22
```

---

## Common Issues & Solutions

### Issue 1: Timer Shows "45 hrs"
**Cause:** Incorrect time formatting
**Solution:** Use `formatTime()` function in MCQTimer.tsx
```typescript
const formatTime = (seconds: number): string => {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins}:${secs.toString().padStart(2, '0')}`;
};
```

### Issue 2: Blurry Question Images
**Cause:** Low DPI extraction
**Solution:** Use 2x DPI in parser
```python
mat = fitz.Matrix(2, 2)  # 2x zoom = 300 DPI
pix = page.get_pixmap(matrix=mat, clip=rect)
```

### Issue 3: Wrong Question Boundaries
**Cause:** Standard crop doesn't fit all questions
**Solution:** Add special cases in parser
```python
if question_num == 20:
    y_end = 820
if question_num == 40:
    y_end = page_height - 50
```

### Issue 4: Results Show New Layout
**Cause:** Conditional rendering creates separate view
**Solution:** Keep same component, pass `isSubmitted` prop
```typescript
// WRONG
{isSubmitted ? <ResultsView /> : <ExamView />}

// CORRECT
<MCQQuestion isSubmitted={isSubmitted} />
```

### Issue 5: Can Still Click After Submission
**Cause:** `onAnswerSelect` still active
**Solution:** Pass empty function after submission
```typescript
onAnswerSelect={examState.isSubmitted ? () => {} : handleAnswerSelect}
```

---

## Testing Checklist

### Exam Mode Testing
- [ ] Timer starts at 45:00
- [ ] Timer counts down correctly (MM:SS format)
- [ ] Pause button stops timer
- [ ] Calculator button opens calculator
- [ ] Can select answers (circles turn blue)
- [ ] Can change answers
- [ ] Previous/Next navigation works
- [ ] "Mark Out of Syllabus" button works
- [ ] Submit button only shows on Q40
- [ ] All 40 questions display correctly
- [ ] Images are sharp and clear

### Review Mode Testing
- [ ] Submit calculates correct score
- [ ] Results banner shows at top
- [ ] Score, percentage, grade display correctly
- [ ] Same question interface remains
- [ ] Correct answers show in green
- [ ] Incorrect answers show in red
- [ ] Text shows "Your answer" vs "Correct answer"
- [ ] Previous/Next still work
- [ ] Can review all 40 questions
- [ ] Cannot change answers
- [ ] Submit button disappears
- [ ] Timer stops

### Dark Mode Testing
- [ ] All colors work in dark mode
- [ ] Text is readable
- [ ] Circles have proper contrast
- [ ] Results banner looks good
- [ ] No white flashes

---

## Performance Optimization

### Image Loading
- Use Next.js Image component for optimization
- Cache-busting with version numbers
- Preload next question image

### State Management
- Use Map for userAnswers (O(1) lookup)
- Memoize expensive calculations
- Use useCallback for event handlers

### Bundle Size
- Code splitting by route
- Lazy load calculator component
- Minimize dependencies

---

## Future Enhancements

### Planned Features
1. **Multiple Papers**: Support for all Biology papers (2020-2024)
2. **Subject Expansion**: Physics, Chemistry, ICT papers
3. **Progress Saving**: Save exam state to localStorage
4. **Review Mode Filters**: Show only incorrect answers
5. **Statistics Dashboard**: Track performance over time
6. **Timed Practice**: Custom time limits
7. **Randomize Questions**: Shuffle question order
8. **Explanation Mode**: Add explanations for answers
9. **Print Results**: Export results as PDF
10. **Mobile App**: React Native version

### Technical Improvements
1. **Database Integration**: Store papers in Supabase
2. **User Accounts**: Track individual progress
3. **Analytics**: Question difficulty analysis
4. **Accessibility**: Screen reader support
5. **Offline Mode**: PWA with service workers
6. **Multi-language**: Support for other languages

---

## Deployment

### Production Build
```bash
npm run build
npm start
```

### Environment Variables
```env
NEXT_PUBLIC_SITE_URL=https://your-domain.com
```

### Hosting Options
- **Vercel**: Recommended (automatic deployments)
- **Netlify**: Alternative with similar features
- **AWS Amplify**: For AWS infrastructure
- **Self-hosted**: Docker container

---

## Support & Maintenance

### Regular Tasks
1. **Weekly**: Check for new papers to add
2. **Monthly**: Review user feedback
3. **Quarterly**: Update dependencies
4. **Yearly**: Refresh question database

### Monitoring
- Error tracking: Sentry or similar
- Analytics: Google Analytics or Plausible
- Performance: Lighthouse CI
- Uptime: UptimeRobot or Pingdom

---

## Contact & Resources

### Documentation
- Next.js: https://nextjs.org/docs
- Tailwind CSS: https://tailwindcss.com/docs
- PyMuPDF: https://pymupdf.readthedocs.io

### Support
- GitHub Issues: For bug reports
- Discussions: For feature requests
- Email: For urgent issues

---

## Changelog

### Version 1.0.0 (Current)
- ✅ Complete MCQ interface with timer
- ✅ 40-question Biology Paper 22 (Feb/March 2020)
- ✅ High-quality image extraction (2x DPI)
- ✅ Auto-grading with in-place results
- ✅ Dark mode support
- ✅ Calculator and pause functionality
- ✅ Mark out of syllabus feature
- ✅ Results summary banner
- ✅ Previous/Next navigation in review mode

### Version 0.9.0 (Previous)
- Separate results view with accordion bars
- Lower resolution images (1x DPI)
- Timer format issues

---

## License

This project is part of the IGCSE Study Hub platform.

---

**Document Created:** April 20, 2026  
**Last Updated:** April 20, 2026  
**Version:** 1.0.0  
**Author:** Bob (AI Assistant)

---

## Quick Reference

### Start Development Server
```bash
npm run dev
```

### Access MCQ Interface
```
http://localhost:3000/mcq-exam/0610_m20_qp_22
```

### Extract New Paper
```bash
cd scripts
python perfect-sample-parser.py
```

### Key Files to Edit
- **Add features**: `src/components/mcq/MCQInterface.tsx`
- **Change styling**: `src/components/mcq/MCQQuestion.tsx`
- **Modify timer**: `src/components/mcq/MCQTimer.tsx`
- **Update parser**: `scripts/perfect-sample-parser.py`

---

**End of Handoff Document**