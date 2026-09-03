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
  // SCIENCES — Bio/Chem/Physics: Papers 1+2 = MCQ (Exam Mode ✓), Papers 3–6 = View only
  '0610': {
    code: '0610', name: 'Biology',
    papers: [1, 2, 3, 4, 5, 6],
    paperDescriptions: {
      1: 'Paper 1 — Core MCQ (40 questions)',
      2: 'Paper 2 — Extended MCQ (40 questions)',
      3: 'Paper 3 — Core Theory (structured)',
      4: 'Paper 4 — Extended Theory (structured)',
      5: 'Paper 5 — Practical Test',
      6: 'Paper 6 — Alternative to Practical'
    }
  },
  '0620': {
    code: '0620', name: 'Chemistry',
    papers: [1, 2, 3, 4, 5, 6],
    paperDescriptions: {
      1: 'Paper 1 — Core MCQ (40 questions)',
      2: 'Paper 2 — Extended MCQ (40 questions)',
      3: 'Paper 3 — Core Theory (structured)',
      4: 'Paper 4 — Extended Theory (structured)',
      5: 'Paper 5 — Practical Test',
      6: 'Paper 6 — Alternative to Practical'
    }
  },
  '0625': {
    code: '0625', name: 'Physics',
    papers: [1, 2, 3, 4, 5, 6],
    paperDescriptions: {
      1: 'Paper 1 — Core MCQ (40 questions)',
      2: 'Paper 2 — Extended MCQ (40 questions)',
      3: 'Paper 3 — Core Theory (structured)',
      4: 'Paper 4 — Extended Theory (structured)',
      5: 'Paper 5 — Practical Test',
      6: 'Paper 6 — Alternative to Practical'
    }
  },

  // MATHEMATICS — View Mode only (no MCQ)
  '0580': {
    code: '0580', name: 'Mathematics',
    papers: [1, 2, 3, 4],
    paperDescriptions: {
      1: 'Paper 1 — Core Short Answer',
      2: 'Paper 2 — Extended Short Answer',
      3: 'Paper 3 — Core Structured',
      4: 'Paper 4 — Extended Structured'
    }
  },
  '0606': {
    code: '0606', name: 'Additional Mathematics',
    papers: [1, 2],
    paperDescriptions: {
      1: 'Paper 1 — Pure Mathematics',
      2: 'Paper 2 — Pure Mathematics'
    }
  },

  // BUSINESS & ECONOMICS
  '0450': {
    code: '0450', name: 'Business Studies',
    papers: [1, 2],
    paperDescriptions: {
      1: 'Paper 1 — Short Answer and Data Response',
      2: 'Paper 2 — Case Study'
    }
  },
  '0452': {
    code: '0452', name: 'Accounting',
    papers: [1, 2],
    paperDescriptions: {
      1: 'Paper 1 — Multiple Choice (35 questions post-2020 / 10 questions pre-2020)',
      2: 'Paper 2 — Structured Written Paper'
    }
  },
  '0455': {
    code: '0455', name: 'Economics',
    papers: [1, 2],
    paperDescriptions: {
      1: 'Paper 1 — Multiple Choice MCQ (30 questions)',
      2: 'Paper 2 — Structured Questions & Data Response (Theory)'
    }
  },

  // LANGUAGES — View Mode only
  '0500': {
    code: '0500', name: 'First Language English',
    papers: [1, 2],
    paperDescriptions: {
      1: 'Paper 1 — Reading',
      2: 'Paper 2 — Directed Writing and Composition'
    }
  },
  '0520': {
    code: '0520', name: 'French - Foreign Language',
    papers: [1, 2, 4],
    paperDescriptions: {
      1: 'Paper 1 — Listening',
      2: 'Paper 2 — Reading',
      4: 'Paper 4 — Writing'
    }
  },
  '0549': {
    code: '0549', name: 'Hindi as a Second Language',
    papers: [1, 2],
    paperDescriptions: {
      1: 'Paper 1 — Reading and Writing',
      2: 'Paper 2 — Listening'
    }
  },

  // TECHNOLOGY & PERSPECTIVES — View Mode only
  '0417': {
    code: '0417', name: 'Information and Communication Technology',
    papers: [1, 2, 3],
    paperDescriptions: {
      1: 'Paper 1 — Theory',
      2: 'Paper 2 — Practical Test A',
      3: 'Paper 3 — Practical Test B'
    }
  },
  '0457': {
    code: '0457', name: 'Global Perspectives',
    papers: [1],
    paperDescriptions: {
      1: 'Paper 1 — Written Examination'
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
export function getPaperDescription(subjectCode: string, paperNumber: number, year?: number): string {
  const config = SUBJECT_PAPER_CONFIG[subjectCode];
  if (!config) return `Paper ${paperNumber}`;

  // Biology/Chemistry/Physics: pre-2016 Paper 2 was theory, only Paper 1 was MCQ
  if (['0610','0620','0625'].includes(subjectCode) && year && year < 2016) {
    if (paperNumber === 1) return 'Paper 1 — Core MCQ (40 questions)';
    if (paperNumber === 2) return 'Paper 2 — Core Theory (pre-2016, structured)';
  }

  // Accounting: pre-2020 Paper 1 had only first 10 questions as MCQ
  if (subjectCode === '0452' && year && year < 2020) {
    if (paperNumber === 1) return 'Paper 1 — First 10 questions MCQ (pre-2020 format)';
  }

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
