// Cambridge AS & A Level Syllabus Structural Changes
// Tracks paper renames, restructures, and discontinuations by year

export interface ALevelComponentLabel {
  component: string;
  yearRange: { from?: number; to?: number };
  label: string;
  disabled?: boolean;
}

export interface ALevelSyllabusConfig {
  subjectCode: string;
  componentLabels: ALevelComponentLabel[];
}

export const ALEVEL_SYLLABUS_CONFIGURATIONS: ALevelSyllabusConfig[] = [

  // ── Mathematics 9709 — 2020 Restructure ─────────────────────────────────────
  // Pre-2020: Papers had different numbering (e.g. Paper 6 = Stats 1, Paper 7 = Stats 2)
  // Post-2020: Cleaner structure — Papers 1-3 Pure, 4 Mech, 5-6 Stats, 7 Further Mech
  {
    subjectCode: '9709',
    componentLabels: [
      // AS Level papers — available both pre and post restructure
      { component: '1', yearRange: { to: 2019 },   label: 'Pure Mathematics 1' },
      { component: '2', yearRange: { to: 2019 },   label: 'Pure Mathematics 2' },
      { component: '3', yearRange: { to: 2019 },   label: 'Pure Mathematics 3' },
      { component: '4', yearRange: { to: 2019 },   label: 'Mechanics 1' },
      { component: '5', yearRange: { to: 2019 },   label: 'Mechanics 2 / Statistics 1' },
      { component: '6', yearRange: { to: 2019 },   label: 'Probability & Statistics 1' },
      { component: '7', yearRange: { to: 2019 },   label: 'Probability & Statistics 2' },
      // Post-2020 structure
      { component: '1', yearRange: { from: 2020 }, label: 'Pure Mathematics 1 (AS)' },
      { component: '2', yearRange: { from: 2020 }, label: 'Pure Mathematics 2 (AS)' },
      { component: '3', yearRange: { from: 2020 }, label: 'Pure Mathematics 3 (A2)' },
      { component: '4', yearRange: { from: 2020 }, label: 'Mechanics (AS)' },
      { component: '5', yearRange: { from: 2020 }, label: 'Probability & Statistics 1 (AS)' },
      { component: '6', yearRange: { from: 2020 }, label: 'Probability & Statistics 2 (A2)' },
      { component: '7', yearRange: { from: 2020 }, label: 'Further Mechanics (A2)' },
    ],
  },

  // ── Computer Science 9608 — discontinued after 2022 ─────────────────────────
  {
    subjectCode: '9608',
    componentLabels: [
      { component: '1', yearRange: { to: 2022 }, label: 'Theory Fundamentals' },
      { component: '2', yearRange: { to: 2022 }, label: 'Problem-solving & Programming' },
      { component: '3', yearRange: { to: 2022 }, label: 'Further Problem-solving' },
      { component: '1', yearRange: { from: 2023 }, label: 'Discontinued — use 9618', disabled: true },
      { component: '2', yearRange: { from: 2023 }, label: 'Discontinued — use 9618', disabled: true },
      { component: '3', yearRange: { from: 2023 }, label: 'Discontinued — use 9618', disabled: true },
    ],
  },

  // ── Computer Science 9618 — from 2021 ───────────────────────────────────────
  {
    subjectCode: '9618',
    componentLabels: [
      { component: '1', yearRange: { from: 2021 }, label: 'Theory Fundamentals' },
      { component: '2', yearRange: { from: 2021 }, label: 'Fundamental Problem-solving & Programming' },
      { component: '3', yearRange: { from: 2021 }, label: 'Advanced Theory' },
    ],
  },

  // ── Economics 9708 — component clarification ─────────────────────────────────
  {
    subjectCode: '9708',
    componentLabels: [
      { component: '1', yearRange: {}, label: 'Multiple Choice — AS Level' },
      { component: '2', yearRange: {}, label: 'Data Response & Essay — AS Level' },
      { component: '3', yearRange: {}, label: 'Multiple Choice — A2 Level' },
      { component: '4', yearRange: {}, label: 'Data Response & Essay — A2 Level' },
    ],
  },

  // ── Accounting 9706 — component clarification ───────────────────────────────
  {
    subjectCode: '9706',
    componentLabels: [
      { component: '1', yearRange: {}, label: 'Multiple Choice (AS & A2)' },
      { component: '2', yearRange: {}, label: 'Structured Questions — AS Level' },
      { component: '3', yearRange: {}, label: 'Structured Questions — A2 Level' },
    ],
  },

  // ── Sciences — paper clarification ──────────────────────────────────────────
  {
    subjectCode: '9700',
    componentLabels: [
      { component: '1', yearRange: {}, label: 'Multiple Choice (AS & A2)' },
      { component: '2', yearRange: {}, label: 'AS Level Structured' },
      { component: '3', yearRange: {}, label: 'Advanced Practical Skills' },
      { component: '4', yearRange: {}, label: 'A Level Structured' },
      { component: '5', yearRange: {}, label: 'Planning, Analysis & Evaluation' },
    ],
  },
  {
    subjectCode: '9701',
    componentLabels: [
      { component: '1', yearRange: {}, label: 'Multiple Choice (AS & A2)' },
      { component: '2', yearRange: {}, label: 'AS Level Structured' },
      { component: '3', yearRange: {}, label: 'Advanced Practical Skills' },
      { component: '4', yearRange: {}, label: 'A Level Structured' },
      { component: '5', yearRange: {}, label: 'Planning, Analysis & Evaluation' },
    ],
  },
  {
    subjectCode: '9702',
    componentLabels: [
      { component: '1', yearRange: {}, label: 'Multiple Choice (AS & A2)' },
      { component: '2', yearRange: {}, label: 'AS Level Structured' },
      { component: '3', yearRange: {}, label: 'Advanced Practical Skills' },
      { component: '4', yearRange: {}, label: 'A Level Structured' },
      { component: '5', yearRange: {}, label: 'Planning, Analysis & Evaluation' },
    ],
  },
];

export function getALevelComponentLabel(
  subjectCode: string,
  component: string,
  year: number,
): { label: string; disabled?: boolean } | null {
  const cfg = ALEVEL_SYLLABUS_CONFIGURATIONS.find(c => c.subjectCode === subjectCode);
  if (!cfg) return null;

  const match = cfg.componentLabels.find(l => {
    if (l.component !== component) return false;
    const { from, to } = l.yearRange;
    if (from !== undefined && year < from) return false;
    if (to   !== undefined && year > to)   return false;
    return true;
  });

  return match ? { label: match.label, disabled: match.disabled } : null;
}

export function isALevelComponentDisabled(
  subjectCode: string,
  component: string,
  year: number,
): boolean {
  return getALevelComponentLabel(subjectCode, component, year)?.disabled === true;
}

// Made with Bob
