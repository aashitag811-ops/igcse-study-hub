// Cambridge IGCSE Syllabus Structural Changes Configuration
// Provides dynamic labels and filtering based on year and subject

export interface ComponentLabel {
  component: string;
  yearRange: { from?: number; to?: number };
  label: string;
  icon?: string;
  disabled?: boolean;
}

export interface SyllabusConfig {
  subjectCode: string;
  componentLabels: ComponentLabel[];
}

export const SYLLABUS_CONFIGURATIONS: SyllabusConfig[] = [
  // Mathematics (0580) - 2025 Calculator Changes
  {
    subjectCode: '0580',
    componentLabels: [
      { component: '1', yearRange: { from: 2025 }, label: 'Non-Calculator Paper' },
      { component: '2', yearRange: { from: 2025 }, label: 'Non-Calculator Paper' },
      { component: '3', yearRange: { from: 2025 }, label: 'Calculator Permitted' },
      { component: '4', yearRange: { from: 2025 }, label: 'Calculator Permitted' },
    ]
  },
  
  // First Language English (0500) - 2020 Restructure
  {
    subjectCode: '0500',
    componentLabels: [
      { component: '1', yearRange: { to: 2019 }, label: 'Reading Passages (Core)' },
      { component: '2', yearRange: { to: 2019 }, label: 'Reading Passages (Extended)' },
      { component: '3', yearRange: { to: 2019 }, label: 'Directed Writing and Composition' },
      { component: '1', yearRange: { from: 2020 }, label: 'Reading' },
      { component: '2', yearRange: { from: 2020 }, label: 'Writing' },
    ]
  },
  
  // Biology (0610) - 2016 MCQ Split
  {
    subjectCode: '0610',
    componentLabels: [
      { component: '1', yearRange: { to: 2015 }, label: 'Multiple Choice' },
      { component: '2', yearRange: { to: 2015 }, label: 'Core Theory' },
      { component: '3', yearRange: { to: 2015 }, label: 'Extended Theory' },
      { component: '1', yearRange: { from: 2016 }, label: 'Core MCQ' },
      { component: '2', yearRange: { from: 2016 }, label: 'Extended MCQ' },
    ]
  },
  
  // Chemistry (0620) - 2015 Structure Change
  {
    subjectCode: '0620',
    componentLabels: [
      { component: '1', yearRange: { to: 2014 }, label: 'Multiple Choice' },
      { component: '2', yearRange: { to: 2014 }, label: 'Core Theory' },
      { component: '3', yearRange: { to: 2014 }, label: 'Extended Theory' },
      { component: '1', yearRange: { from: 2015 }, label: 'Core MCQ' },
      { component: '2', yearRange: { from: 2015 }, label: 'Extended MCQ' },
    ]
  },
  
  // Physics (0625) - 2016 MCQ Split
  {
    subjectCode: '0625',
    componentLabels: [
      { component: '1', yearRange: { to: 2015 }, label: 'Multiple Choice' },
      { component: '2', yearRange: { to: 2015 }, label: 'Core Theory' },
      { component: '3', yearRange: { to: 2015 }, label: 'Extended Theory' },
      { component: '1', yearRange: { from: 2016 }, label: 'Core MCQ' },
      { component: '2', yearRange: { from: 2016 }, label: 'Extended MCQ' },
    ]
  },
  
  // Accounting (0452) - 2020 Consolidation
  {
    subjectCode: '0452',
    componentLabels: [
      { component: '3', yearRange: { to: 2019 }, label: 'Paper 3' },
      { component: '3', yearRange: { from: 2020 }, label: 'Discontinued from 2020', disabled: true },
    ]
  },
  
  // French (0520) - 2021 Listening Digitization
  {
    subjectCode: '0520',
    componentLabels: [
      { component: '1', yearRange: { to: 2020 }, label: 'Listening (Written Answers)' },
      { component: '1', yearRange: { from: 2021 }, label: 'Listening (Multiple Choice)' },
    ]
  },
];

// Helper function to get component label for a specific subject, component, and year
export function getComponentLabel(
  subjectCode: string,
  component: string,
  year: number
): { label: string; icon?: string; disabled?: boolean } | null {
  const config = SYLLABUS_CONFIGURATIONS.find(c => c.subjectCode === subjectCode);
  if (!config) return null;

  const labelConfig = config.componentLabels.find(l => {
    if (l.component !== component) return false;
    
    const { from, to } = l.yearRange;
    if (from !== undefined && year < from) return false;
    if (to !== undefined && year > to) return false;
    
    return true;
  });

  if (!labelConfig) return null;

  return {
    label: labelConfig.label,
    icon: labelConfig.icon,
    disabled: labelConfig.disabled
  };
}

// Helper function to check if a component should be disabled
export function isComponentDisabled(
  subjectCode: string,
  component: string,
  year: number
): boolean {
  const label = getComponentLabel(subjectCode, component, year);
  return label?.disabled === true;
}

// Made with Bob