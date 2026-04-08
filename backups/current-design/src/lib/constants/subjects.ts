export const SUBJECTS = [
  {
    code: '0580',
    name: 'Mathematics',
    color: 'blue',
    icon: '📐',
    description: 'Algebra, Geometry, Trigonometry, Statistics'
  },
  {
    code: '0606',
    name: 'Additional Mathematics',
    color: 'blue',
    icon: '📈',
    description: 'Advanced Algebra, Calculus, Trigonometry'
  },
  {
    code: '0625',
    name: 'Physics',
    color: 'purple',
    icon: '⚛️',
    description: 'Mechanics, Electricity, Waves, Nuclear Physics'
  },
  {
    code: '0620',
    name: 'Chemistry',
    color: 'green',
    icon: '🧪',
    description: 'Organic, Inorganic, Physical Chemistry'
  },
  {
    code: '0610',
    name: 'Biology',
    color: 'emerald',
    icon: '🧬',
    description: 'Cell Biology, Genetics, Ecology, Human Biology'
  },
  {
    code: '0500',
    name: 'English',
    color: 'red',
    icon: '📚',
    description: 'Reading, Writing, Speaking, Listening'
  },
  {
    code: '0549',
    name: 'Hindi',
    color: 'red',
    icon: 'हिन्दी',
    description: 'Reading, Writing, Speaking, Listening'
  },
  {
    code: '0520',
    name: 'French',
    color: 'indigo',
    icon: 'Français',
    description: 'Reading, Writing, Speaking, Listening'
  },
  {
    code: '0455',
    name: 'Economics',
    color: 'yellow',
    icon: '💰',
    description: 'Microeconomics, Macroeconomics, Trade'
  },
  {
    code: '0457',
    name: 'Global Perspectives',
    color: 'indigo',
    icon: '🌍',
    description: 'Critical Thinking, Research, Global Issues'
  },
  {
    code: '0417',
    name: 'ICT',
    color: 'cyan',
    icon: '💻',
    description: 'Programming, Networks, Data, Systems'
  },
  {
    code: '0478',
    name: 'Computer Science',
    color: 'cyan',
    icon: '🖥️',
    description: 'Algorithms, Programming, Data Structures'
  },
  {
    code: '0450',
    name: 'Business Studies',
    color: 'orange',
    icon: '📊',
    description: 'Marketing, Finance, Operations, Management'
  },
] as const;

export type SubjectCode = typeof SUBJECTS[number]['code'];
export type SubjectColor = typeof SUBJECTS[number]['color'];

export const getSubjectByCode = (code: string) => {
  return SUBJECTS.find(subject => subject.code === code);
};

export const getSubjectColor = (color: SubjectColor) => {
  const colorMap = {
    blue: 'bg-blue-100 text-blue-700 border-blue-200',
    purple: 'bg-purple-100 text-purple-700 border-purple-200',
    green: 'bg-green-100 text-green-700 border-green-200',
    emerald: 'bg-emerald-100 text-emerald-700 border-emerald-200',
    red: 'bg-red-100 text-red-700 border-red-200',
    yellow: 'bg-yellow-100 text-yellow-700 border-yellow-200',
    indigo: 'bg-indigo-100 text-indigo-700 border-indigo-200',
    cyan: 'bg-cyan-100 text-cyan-700 border-cyan-200',
    orange: 'bg-orange-100 text-orange-700 border-orange-200',
  };
  return colorMap[color] || colorMap.blue;
};

// Made with Bob
