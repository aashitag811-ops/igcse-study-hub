export const RESOURCE_TYPES = [
  {
    value: 'notes',
    label: 'Revision Notes',
    description: 'Study notes and summaries',
    icon: '📝'
  },
  {
    value: 'flashcards',
    label: 'Flashcards',
    description: 'Quick revision flashcards',
    icon: '🎴'
  },
  {
    value: 'hardest-questions',
    label: 'Hardest Questions',
    description: 'Challenging practice problems',
    icon: '🎯'
  },
  {
    value: 'formula-sheets',
    label: 'Formula Sheets',
    description: 'Essential formulas and equations',
    icon: '📐'
  },
  {
    value: 'sample-answers',
    label: 'Sample Answers',
    description: 'Model answers and mark schemes',
    icon: '✅'
  },
  {
    value: 'revision-guides',
    label: 'Revision Guides',
    description: 'Comprehensive revision materials',
    icon: '📖'
  },
  {
    value: 'youtube',
    label: 'YouTube Resources',
    description: 'Video tutorials and explanations',
    icon: '🎥'
  },
] as const;

export type ResourceType = typeof RESOURCE_TYPES[number]['value'];

export const getResourceTypeLabel = (value: string) => {
  const type = RESOURCE_TYPES.find(t => t.value === value);
  return type?.label || value;
};

export const getResourceTypeIcon = (value: string) => {
  const type = RESOURCE_TYPES.find(t => t.value === value);
  return type?.icon || '📄';
};

// Made with Bob
