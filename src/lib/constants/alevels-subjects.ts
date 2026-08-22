// Cambridge AS & A Level subjects
// Paper structures verified against official Cambridge specifications

export const ALEVEL_SUBJECTS = [
  {
    code: '9700',
    name: 'Biology',
    color: 'emerald',
    icon: '',
    description: 'Cell Biology, Genetics, Ecology, Biochemistry, Physiology',
  },
  {
    code: '9701',
    name: 'Chemistry',
    color: 'green',
    icon: '',
    description: 'Physical, Organic & Inorganic Chemistry, Analysis',
  },
  {
    code: '9702',
    name: 'Physics',
    color: 'purple',
    icon: '',
    description: 'Mechanics, Electricity, Waves, Nuclear & Thermal Physics',
  },
  {
    code: '9709',
    name: 'Mathematics',
    color: 'blue',
    icon: '',
    description: 'Pure Mathematics, Mechanics, Probability & Statistics',
  },
  {
    code: '9231',
    name: 'Further Mathematics',
    color: 'indigo',
    icon: '',
    description: 'Further Pure Maths, Further Statistics, Further Mechanics',
  },
  {
    code: '9608',
    name: 'Computer Science (9608)',
    color: 'cyan',
    icon: '',
    description: 'Theory, Problem-solving, Programming — old syllabus',
  },
  {
    code: '9618',
    name: 'Computer Science (9618)',
    color: 'cyan',
    icon: '',
    description: 'Theory, Problem-solving, Advanced Programming — new syllabus',
  },
  {
    code: '9609',
    name: 'Business',
    color: 'orange',
    icon: '',
    description: 'Marketing, Finance, Operations, HR, Strategy',
  },
  {
    code: '9708',
    name: 'Economics',
    color: 'yellow',
    icon: '',
    description: 'Microeconomics, Macroeconomics, International Trade',
  },
  {
    code: '9706',
    name: 'Accounting',
    color: 'yellow',
    icon: '',
    description: 'Financial Accounting, Management Accounting, Analysis',
  },
  {
    code: '9093',
    name: 'English Language',
    color: 'red',
    icon: '',
    description: 'Reading, Writing, Text Analysis, Language Topics',
  },
  {
    code: '8021',
    name: 'English General Paper',
    color: 'red',
    icon: '',
    description: 'Essay Writing, Comprehension, Critical Thinking',
  },
] as const;

export type ALevelSubjectCode = typeof ALEVEL_SUBJECTS[number]['code'];

export const getALevelSubjectByCode = (code: string) =>
  ALEVEL_SUBJECTS.find(s => s.code === code);

export const getALevelSubjectName = (code: string): string =>
  ALEVEL_SUBJECTS.find(s => s.code === code)?.name ?? code;

// Made with Bob
