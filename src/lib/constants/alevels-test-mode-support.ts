// A-Level Test Mode (MCQ Exam) Support Configuration
// Only subjects with standalone MCQ question papers can have test mode.

export interface ALevelTestEngineSupport {
  subject: string;
  subjectName: string;
  mcqComponents: string[];  // which paper numbers are MCQ
  questionCount: { [component: string]: number };
  description: string;
  hasImages: boolean;       // whether MCQ questions contain embedded diagrams
}

// Verified MCQ papers in Cambridge AS & A Level:
//   9700 Biology      Paper 1 = 40q MCQ (image-based)
//   9701 Chemistry    Paper 1 = 40q MCQ (image-based)
//   9702 Physics      Paper 1 = 40q MCQ (image-based)
//   9708 Economics    Paper 1 = 30q MCQ AS (text-only)
//                     Paper 3 = 30q MCQ A2 (text-only)
//   9706 Accounting   Paper 1 = 30q MCQ (text-only)
//
// NOT MCQ: 9709/9231 Maths, 9608/9618 CS, 9609 Business, 9093/8021 English

export const ALEVEL_TEST_ENGINES: ALevelTestEngineSupport[] = [
  {
    subject: '9700',
    subjectName: 'Biology',
    mcqComponents: ['1'],
    questionCount: { '1': 40 },
    description: 'Paper 1 — Multiple Choice (40 questions, 1h15m)',
    hasImages: true,
  },
  {
    subject: '9701',
    subjectName: 'Chemistry',
    mcqComponents: ['1'],
    questionCount: { '1': 40 },
    description: 'Paper 1 — Multiple Choice (40 questions, 1h15m)',
    hasImages: true,
  },
  {
    subject: '9702',
    subjectName: 'Physics',
    mcqComponents: ['1'],
    questionCount: { '1': 40 },
    description: 'Paper 1 — Multiple Choice (40 questions, 1h15m)',
    hasImages: true,
  },
  {
    subject: '9708',
    subjectName: 'Economics',
    mcqComponents: ['1', '3'],
    questionCount: { '1': 30, '3': 30 },
    description: 'Paper 1 (AS MCQ) and Paper 3 (A2 MCQ) — 30 questions each. Contains supply/demand diagrams, PPC curves and data tables.',
    hasImages: true,  // supply/demand curves, PPC diagrams, data tables
  },
  {
    subject: '9706',
    subjectName: 'Accounting',
    mcqComponents: ['1'],
    questionCount: { '1': 30 },
    description: 'Paper 1 — Multiple Choice (30 questions, 1h). Contains T-account tables, trial balances and financial statement extracts.',
    hasImages: true,  // T-accounts, trial balances, ledger account tables
  },
];

export function isALevelTestModeAvailable(subjectCode: string, component: string): boolean {
  return ALEVEL_TEST_ENGINES.some(
    e => e.subject === subjectCode && e.mcqComponents.includes(component)
  );
}

export function getALevelTestModeUnavailableMessage(): string {
  const supported = ALEVEL_TEST_ENGINES.map(e =>
    `• ${e.subjectName} (${e.subject}) — Papers ${e.mcqComponents.join(', ')}`
  ).join('\n');

  return `Test mode is not available for this paper.

Interactive MCQ test mode is supported for:

${supported}

All other A-level papers (structured essays, data response, practical)
are available in View Mode with Examiner Report annotations.`;
}

// Made with Bob
