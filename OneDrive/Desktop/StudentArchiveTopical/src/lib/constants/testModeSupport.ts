// Test Mode Eligibility Configuration
// Defines which subject-component combinations have interactive test engines

export interface TestEngineSupport {
  subject: string;
  subjectName: string;
  components: string[];
  description: string;
  supportsTheory?: boolean; // NEW: Flag for theory paper support
}

export const SUPPORTED_TEST_ENGINES: TestEngineSupport[] = [
  {
    subject: '0610',
    subjectName: 'Biology',
    components: ['1', '2', '4'], // Paper 2 = Extended MCQ from 2016+; Paper 4 = Interactive Theory
    description: 'MCQ Papers (Core & Extended) + Interactive Theory Papers',
    supportsTheory: true
  },
  {
    subject: '0620',
    subjectName: 'Chemistry',
    components: ['1', '2'],    // Paper 2 = Extended MCQ from 2016+
    description: 'MCQ Papers (Core & Extended)'
  },
  {
    subject: '0625',
    subjectName: 'Physics',
    components: ['1', '2'],    // Paper 2 = Extended MCQ from 2016+
    description: 'MCQ Papers (Core & Extended)'
  },
  {
    subject: '0455',
    subjectName: 'Economics',
    components: ['1'],         // Paper 1 only — Paper 2 is Structured Questions (no MCQ)
    description: 'MCQ Paper 1 only'
  },
  {
    subject: '0452',
    subjectName: 'Accounting',
    components: ['1'],         // Paper 1 only — MCQ with text-based A/B/C/D options (no images needed)
    description: 'MCQ Paper 1 only'
  }
];

// Helper function to check if test mode is available for a subject-component combination
export function isTestModeAvailable(subjectCode: string, component: string): boolean {
  return SUPPORTED_TEST_ENGINES.some(
    engine => engine.subject === subjectCode && engine.components.includes(component)
  );
}

// Helper function to get supported test engines list for tooltip
export function getSupportedTestEnginesList(): string {
  return SUPPORTED_TEST_ENGINES.map(engine => 
    `${engine.subjectName} (${engine.subject}) — ${engine.description}`
  ).join('\n');
}

// Helper function to get test mode unavailable message
export function getTestModeUnavailableMessage(): string {
  return `Test mode is currently unavailable for this specific paper selection.

Interactive testing engines are currently supported for:

${SUPPORTED_TEST_ENGINES.map(engine => 
  `• ${engine.subjectName} (${engine.subject}) — Papers ${engine.components.join(', ')}`
).join('\n')}`;
}

// Made with Bob