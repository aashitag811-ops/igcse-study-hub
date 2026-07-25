/**
 * Cambridge IGCSE Subject Paper Component Configuration
 * 
 * This file defines which paper components exist for each subject.
 * Each subject has a unique paper structure based on Cambridge IGCSE specifications.
 */

export interface SubjectConfig {
  code: string;
  name: string;
  papers: number[];
  paperDescriptions: { [key: number]: string };
}

export const SUBJECT_PAPER_CONFIG: { [key: string]: SubjectConfig } = {
  // SCIENCES — Bio/Chem/Physics share identical structure
  // Paper 1 = Core MCQ (40q, 40 marks, 45min) — Exam Mode ✓
  // Paper 2 = Extended MCQ (40q, 40 marks, 45min) — Exam Mode ✓
  // Paper 3 = Core Theory (80 marks, 1h15m) — View Mode only
  // Paper 4 = Extended Theory (80 marks, 1h15m) — View Mode only
  // Paper 5 = Practical Test (40 marks, 1h) — View Mode only
  // Paper 6 = Alternative to Practical (40 marks, 1h) — View Mode only
  '0610': {
    code: '0610',
    name: 'Biology',
    papers: [1, 2, 3, 4, 5, 6],
    paperDescriptions: {
      1: 'Core MCQ (40 questions)',
      2: 'Extended MCQ (40 questions)',
      3: 'Core Theory',
      4: 'Extended Theory',
      5: 'Practical Test',
      6: 'Alternative to Practical'
    }
  },
  '0620': {
    code: '0620',
    name: 'Chemistry',
    papers: [1, 2, 3, 4, 5, 6],
    paperDescriptions: {
      1: 'Core MCQ (40 questions)',
      2: 'Extended MCQ (40 questions)',
      3: 'Core Theory',
      4: 'Extended Theory',
      5: 'Practical Test',
      6: 'Alternative to Practical'
    }
  },
  '0625': {
    code: '0625',
    name: 'Physics',
    papers: [1, 2, 3, 4, 5, 6],
    paperDescriptions: {
      1: 'Core MCQ (40 questions)',
      2: 'Extended MCQ (40 questions)',
      3: 'Core Theory',
      4: 'Extended Theory',
      5: 'Practical Test',
      6: 'Alternative to Practical'
    }
  },

  // MATHEMATICS
  // Pre-2025: Core P1(35%)+P3(65%), Extended P2(35%)+P4(65%), all calculator
  // 2025+: Core P1(Non-Calc,50%)+P3(Calc,50%), Extended P2(Non-Calc,70m)+P4(Calc,130m)
  // MCQ Count: 0
  '0580': {
    code: '0580',
    name: 'Mathematics',
    papers: [1, 2, 3, 4],
    paperDescriptions: {
      1: 'Core / Non-Calculator',
      2: 'Extended / Non-Calculator',
      3: 'Core / Calculator',
      4: 'Extended / Calculator'
    }
  },
  // Additional Mathematics — unchanged two-paper pure math, 80 marks each, MCQ: 0
  '0606': {
    code: '0606',
    name: 'Additional Mathematics',
    papers: [1, 2],
    paperDescriptions: {
      1: 'Pure Mathematics 1 (80 marks)',
      2: 'Pure Mathematics 2 (80 marks)'
    }
  },

  // BUSINESS & ECONOMICS
  '0450': {
    code: '0450',
    name: 'Business Studies',
    papers: [1, 2],
    paperDescriptions: {
      1: 'Short Answer and Data Response',
      2: 'Case Study'
    }
  },
  // Accounting: Pre-2020 P1 was mixed theory+MCQ. Post-2020 P1 = 35 MCQ standalone — Exam Mode ✓
  // Paper 2 = Structured ledger paper (120 marks, 1h45m) — View Mode only
  '0452': {
    code: '0452',
    name: 'Accounting',
    papers: [1, 2],
    paperDescriptions: {
      1: 'Multiple Choice (35 questions, post-2020)',
      2: 'Structured Written Paper'
    }
  },
  // Economics: Paper 1 = 30 MCQ (30 marks, 45min) — Exam Mode ✓
  // Paper 2 = Structured data response + essays (80 marks, 2h15m) — View Mode only
  '0455': {
    code: '0455',
    name: 'Economics',
    papers: [1, 2],
    paperDescriptions: {
      1: 'Multiple Choice (30 questions)',
      2: 'Structured Questions & Essays'
    }
  },

  // LANGUAGES
  // First Language English — MCQ: 0
  // Pre-2020: shorter texts. 2020+: P1 Reading (80m, 2h), P2 Directed Writing (80m, 2h)
  '0500': {
    code: '0500',
    name: 'First Language English',
    papers: [1, 2],
    paperDescriptions: {
      1: 'Reading (80 marks)',
      2: 'Directed Writing and Composition (80 marks)'
    }
  },
  // French: P1 Listening (MCQ sections present), P2 Reading, P4 Writing — View Mode only
  '0520': {
    code: '0520',
    name: 'French - Foreign Language',
    papers: [1, 2, 4],
    paperDescriptions: {
      1: 'Listening',
      2: 'Reading',
      4: 'Writing'
    }
  },
  // Hindi: P1 Reading & Writing, P2 Listening, Component 3 Speaking — View Mode only
  '0549': {
    code: '0549',
    name: 'Hindi as a Second Language',
    papers: [1, 2],
    paperDescriptions: {
      1: 'Reading and Writing',
      2: 'Listening'
    }
  },

  // TECHNOLOGY & PERSPECTIVES
  // ICT: P1 Theory (80m, 2h), P2 Practical A (70m, 2h15m), P3 Practical B (70m, 2h15m) — View Mode only
  '0417': {
    code: '0417',
    name: 'Information and Communication Technology',
    papers: [1, 2, 3],
    paperDescriptions: {
      1: 'Theory (80 marks)',
      2: 'Practical Test A (70 marks)',
      3: 'Practical Test B (70 marks)'
    }
  },
  // Global Perspectives: Component 1 Written Exam (70m, 1h15m), Components 2&3 = coursework — View Mode only
  '0457': {
    code: '0457',
    name: 'Global Perspectives',
    papers: [1],
    paperDescriptions: {
      1: 'Written Examination (70 marks)'
    }
  }
};

/**
 * Get valid paper components for a subject
 */
export function getValidPapersForSubject(subjectCode: string): number[] {
  const config = SUBJECT_PAPER_CONFIG[subjectCode];
  return config ? config.papers : [];
}

/**
 * Get paper description for a subject and paper number
 */
export function getPaperDescription(subjectCode: string, paperNumber: number): string {
  const config = SUBJECT_PAPER_CONFIG[subjectCode];
  if (!config) return `Paper ${paperNumber}`;
  return config.paperDescriptions[paperNumber] || `Paper ${paperNumber}`;
}

/**
 * Check if a paper component is valid for a subject
 */
export function isValidPaperForSubject(subjectCode: string, paperNumber: number): boolean {
  const validPapers = getValidPapersForSubject(subjectCode);
  return validPapers.includes(paperNumber);
}

/**
 * Get all subject codes
 */
export function getAllSubjectCodes(): string[] {
  return Object.keys(SUBJECT_PAPER_CONFIG);
}

/**
 * Get subject name by code
 */
export function getSubjectName(subjectCode: string): string {
  const config = SUBJECT_PAPER_CONFIG[subjectCode];
  return config ? config.name : subjectCode;
}

// Made with Bob
