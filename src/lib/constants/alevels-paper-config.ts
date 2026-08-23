/**
 * Cambridge AS & A Level Paper Component Configuration
 * Verified against official Cambridge International specifications.
 *
 * Key differences from IGCSE:
 *  - No Core/Extended split — AS level papers vs A2 level papers instead
 *  - Sciences: Paper 3 = Advanced Practical Skills — IS a real written PDF exam
 *  - Sciences: Paper 5 = Planning, Analysis & Evaluation (IS a PDF)
 *  - CS: Paper 4 = computer-based practical (no PDF)
 *  - Economics has TWO MCQ papers: Paper 1 (AS) and Paper 3 (A2)
 *  - Mathematics 9709 post-2020: 7 papers (Pure 1,2,3; Mechanics; Stats 1,2; Further Mech)
 */

export interface ALevelSubjectConfig {
  code: string;
  name: string;
  papers: number[];
  paperDescriptions: { [key: number]: string };
  mcqPapers: number[];   // which paper numbers are MCQ
  mcqQuestions: { [paper: number]: number };  // question count per MCQ paper
}

export const ALEVEL_PAPER_CONFIG: { [key: string]: ALevelSubjectConfig } = {

  // ── Sciences ────────────────────────────────────────────────────────────────
  // Paper 1 = MCQ (40q, 1h15m) — image-based
  // Paper 2 = AS Level Structured Questions (1h15m, 60 marks)
  // Paper 3 = Advanced Practical Skills (2h) — written exam with real PDF
  // Paper 4 = A Level Structured Questions (2h, 100 marks)
  // Paper 5 = Planning, Analysis and Evaluation (1h15m, 30 marks)

  '9700': {
    code: '9700', name: 'Biology',
    papers: [1, 2, 3, 4, 5],
    paperDescriptions: {
      1: 'Paper 1 — Multiple Choice (40 questions, 1h15m)',
      2: 'Paper 2 — AS Level Structured Questions (1h15m)',
      3: 'Paper 3 — Advanced Practical Skills (2h)',
      4: 'Paper 4 — A Level Structured Questions (2h)',
      5: 'Paper 5 — Planning, Analysis and Evaluation (1h15m)',
    },
    mcqPapers: [1],
    mcqQuestions: { 1: 40 },
  },
  '9701': {
    code: '9701', name: 'Chemistry',
    papers: [1, 2, 3, 4, 5],
    paperDescriptions: {
      1: 'Paper 1 — Multiple Choice (40 questions, 1h15m)',
      2: 'Paper 2 — AS Level Structured Questions (1h15m)',
      3: 'Paper 3 — Advanced Practical Skills (2h)',
      4: 'Paper 4 — A Level Structured Questions (2h)',
      5: 'Paper 5 — Planning, Analysis and Evaluation (1h15m)',
    },
    mcqPapers: [1],
    mcqQuestions: { 1: 40 },
  },
  '9702': {
    code: '9702', name: 'Physics',
    papers: [1, 2, 3, 4, 5],
    paperDescriptions: {
      1: 'Paper 1 — Multiple Choice (40 questions, 1h15m)',
      2: 'Paper 2 — AS Level Structured Questions (1h15m)',
      3: 'Paper 3 — Advanced Practical Skills (2h)',
      4: 'Paper 4 — A Level Structured Questions (2h)',
      5: 'Paper 5 — Planning, Analysis and Evaluation (1h15m)',
    },
    mcqPapers: [1],
    mcqQuestions: { 1: 40 },
  },

  // ── Mathematics ─────────────────────────────────────────────────────────────
  // No MCQ papers at all — all structured calculation papers
  // Post-2020 syllabus structure (Papers 1–7)
  '9709': {
    code: '9709', name: 'Mathematics',
    papers: [1, 2, 3, 4, 5, 6, 7],
    paperDescriptions: {
      1: 'Paper 1 — Pure Mathematics 1 (AS, 1h50m)',
      2: 'Paper 2 — Pure Mathematics 2 (AS, 1h15m)',
      3: 'Paper 3 — Pure Mathematics 3 (A2, 1h50m)',
      4: 'Paper 4 — Mechanics (AS, 1h15m)',
      5: 'Paper 5 — Probability & Statistics 1 (AS, 1h15m)',
      6: 'Paper 6 — Probability & Statistics 2 (A2, 1h15m)',
      7: 'Paper 7 — Further Mechanics (A2, 1h15m)',
    },
    mcqPapers: [],
    mcqQuestions: {},
  },

  // ── Further Mathematics ──────────────────────────────────────────────────────
  '9231': {
    code: '9231', name: 'Further Mathematics',
    papers: [1, 2, 3, 4],
    paperDescriptions: {
      1: 'Paper 1 — Further Pure Mathematics 1 (AS, 2h)',
      2: 'Paper 2 — Further Pure Mathematics 2 (A2, 2h)',
      3: 'Paper 3 — Further Statistics (A2, 1h15m)',
      4: 'Paper 4 — Further Mechanics (A2, 1h15m)',
    },
    mcqPapers: [],
    mcqQuestions: {},
  },

  // ── Computer Science ─────────────────────────────────────────────────────────
  // Paper 4 = computer-based practical — no PDF on PapaCambridge
  // NO standalone MCQ papers in either syllabus
  '9608': {
    code: '9608', name: 'Computer Science (9608)',
    papers: [1, 2, 3],
    paperDescriptions: {
      1: 'Paper 1 — Theory Fundamentals (1h45m)',
      2: 'Paper 2 — Fundamental Problem-solving & Programming (1h45m)',
      3: 'Paper 3 — Further Problem-solving & Programming (1h45m)',
    },
    mcqPapers: [],
    mcqQuestions: {},
  },
  '9618': {
    code: '9618', name: 'Computer Science (9618)',
    papers: [1, 2, 3],
    paperDescriptions: {
      1: 'Paper 1 — Theory Fundamentals (1h30m)',
      2: 'Paper 2 — Fundamental Problem-solving & Programming (1h30m)',
      3: 'Paper 3 — Advanced Theory (1h30m)',
    },
    mcqPapers: [],
    mcqQuestions: {},
  },

  // ── Business ─────────────────────────────────────────────────────────────────
  '9609': {
    code: '9609', name: 'Business',
    papers: [1, 2, 3],
    paperDescriptions: {
      1: 'Paper 1 — Short Answer & Essay (AS, 1h30m)',
      2: 'Paper 2 — Data Response (AS, 1h30m)',
      3: 'Paper 3 — Case Study (A2, 3h)',
    },
    mcqPapers: [],
    mcqQuestions: {},
  },

  // ── Economics ────────────────────────────────────────────────────────────────
  // Paper 1 = MCQ AS (30q, 1h) — image-based (supply/demand diagrams, PPC curves, tables)
  // Paper 3 = MCQ A2 (30q, 1h) — image-based ← second MCQ paper!
  '9708': {
    code: '9708', name: 'Economics',
    papers: [1, 2, 3, 4],
    paperDescriptions: {
      1: 'Paper 1 — Multiple Choice AS (30 questions, 1h)',
      2: 'Paper 2 — Data Response & Essay AS (2h)',
      3: 'Paper 3 — Multiple Choice A2 (30 questions, 1h)',
      4: 'Paper 4 — Data Response & Essay A2 (2h15m)',
    },
    mcqPapers: [1, 3],
    mcqQuestions: { 1: 30, 3: 30 },
  },

  // ── Accounting ───────────────────────────────────────────────────────────────
  // Paper 1 = MCQ (30q, 1h) — image-based (T-accounts, trial balances, ledger extracts)
  '9706': {
    code: '9706', name: 'Accounting',
    papers: [1, 2, 3],
    paperDescriptions: {
      1: 'Paper 1 — Multiple Choice (30 questions, 1h)',
      2: 'Paper 2 — Structured Questions AS (1h30m)',
      3: 'Paper 3 — Structured Questions A2 (3h)',
    },
    mcqPapers: [1],
    mcqQuestions: { 1: 30 },
  },

  // ── Languages ────────────────────────────────────────────────────────────────
  '9093': {
    code: '9093', name: 'English Language',
    papers: [1, 2, 3, 4],
    paperDescriptions: {
      1: 'Paper 1 — Reading (2h15m)',
      2: 'Paper 2 — Writing (2h)',
      3: 'Paper 3 — Text Analysis (A2, 2h15m)',
      4: 'Paper 4 — Language Topics (A2, 2h)',
    },
    mcqPapers: [],
    mcqQuestions: {},
  },
  '8021': {
    code: '8021', name: 'English General Paper',
    papers: [1, 2],
    paperDescriptions: {
      1: 'Paper 1 — Essay (1h45m)',
      2: 'Paper 2 — Comprehension (1h45m)',
    },
    mcqPapers: [],
    mcqQuestions: {},
  },
};

export function getALevelPaperConfig(code: string): ALevelSubjectConfig | undefined {
  return ALEVEL_PAPER_CONFIG[code];
}

export function getALevelPaperDescription(
  subjectCode: string,
  paperNumber: number,
  year?: number,
): string {
  const cfg = ALEVEL_PAPER_CONFIG[subjectCode];
  if (!cfg) return `Paper ${paperNumber}`;

  // 9709 pre-2020 had a different paper structure
  if (subjectCode === '9709' && year && year < 2020) {
    const pre2020: { [k: number]: string } = {
      1: 'Paper 1 — Pure Mathematics 1',
      2: 'Paper 2 — Pure Mathematics 2',
      3: 'Paper 3 — Pure Mathematics 3',
      4: 'Paper 4 — Mechanics 1',
      5: 'Paper 5 — Mechanics 2 / Statistics 1',
      6: 'Paper 6 — Probability & Statistics 1',
      7: 'Paper 7 — Probability & Statistics 2',
    };
    return pre2020[paperNumber] ?? `Paper ${paperNumber}`;
  }

  return cfg.paperDescriptions[paperNumber] ?? `Paper ${paperNumber}`;
}

export function isALevelMcqPaper(subjectCode: string, paperNumber: number): boolean {
  return ALEVEL_PAPER_CONFIG[subjectCode]?.mcqPapers.includes(paperNumber) ?? false;
}

export function getALevelMcqQuestionCount(subjectCode: string, paperNumber: number): number {
  return ALEVEL_PAPER_CONFIG[subjectCode]?.mcqQuestions[paperNumber] ?? 0;
}

// Made with Bob
