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
  // SCIENCES
  '0610': {
    code: '0610',
    name: 'Biology',
    papers: [1, 2, 3, 4, 5, 6],
    paperDescriptions: {
      1: 'Paper 1',
      2: 'Paper 2',
      3: 'Paper 3',
      4: 'Paper 4',
      5: 'Paper 5',
      6: 'Paper 6'
    }
  },
  '0620': {
    code: '0620',
    name: 'Chemistry',
    papers: [1, 2, 3, 4, 5, 6],
    paperDescriptions: {
      1: 'Paper 1',
      2: 'Paper 2',
      3: 'Paper 3',
      4: 'Paper 4',
      5: 'Paper 5',
      6: 'Paper 6'
    }
  },
  '0625': {
    code: '0625',
    name: 'Physics',
    papers: [1, 2, 3, 4, 5, 6],
    paperDescriptions: {
      1: 'Paper 1',
      2: 'Paper 2',
      3: 'Paper 3',
      4: 'Paper 4',
      5: 'Paper 5',
      6: 'Paper 6'
    }
  },

  // MATHEMATICS
  '0580': {
    code: '0580',
    name: 'Mathematics',
    papers: [1, 2, 3, 4],
    paperDescriptions: {
      1: 'Core Short-Answer',
      2: 'Extended Short-Answer',
      3: 'Core Structured',
      4: 'Extended Structured'
    }
  },
  '0606': {
    code: '0606',
    name: 'Additional Mathematics',
    papers: [1, 2],
    paperDescriptions: {
      1: 'Pure Mathematics 1',
      2: 'Pure Mathematics 2'
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
  '0452': {
    code: '0452',
    name: 'Accounting',
    papers: [1, 2],
    paperDescriptions: {
      1: 'Multiple Choice & Structured',
      2: 'Structured Written Paper'
    }
  },
  '0455': {
    code: '0455',
    name: 'Economics',
    papers: [1, 2],
    paperDescriptions: {
      1: 'Multiple Choice',
      2: 'Structured Essay Paper'
    }
  },

  // LANGUAGES
  '0500': {
    code: '0500',
    name: 'First Language English',
    papers: [1, 2],
    paperDescriptions: {
      1: 'Reading',
      2: 'Directed Writing and Composition'
    }
  },
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
  '0417': {
    code: '0417',
    name: 'Information and Communication Technology',
    papers: [1, 2, 3],
    paperDescriptions: {
      1: 'Theory Paper',
      2: 'Practical Test A',
      3: 'Practical Test B'
    }
  },
  '0457': {
    code: '0457',
    name: 'Global Perspectives',
    papers: [1],
    paperDescriptions: {
      1: 'Written Examination'
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
