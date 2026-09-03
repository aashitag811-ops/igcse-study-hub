export type Session = 'feb_march' | 'may_june' | 'oct_nov';

export interface PaperSelector {
  subjectCode: string;
  year: number;
  session: Session;
  paper: number;
  variant: number;
}

export type AnswerType =
  | 'single_select'
  | 'multi_select'
  | 'short_text'
  | 'list_n'
  | 'numeric'
  | 'long_response';

export interface BBox {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface PaperQuestion {
  qid: string;
  prompt: string;
  marks: number;
  answerType: AnswerType;
  expectedItems?: number;
  sourcePage?: number;
  bbox?: BBox;
  children?: PaperQuestion[];
}

export interface ParsedPaper {
  id: string;
  selector: PaperSelector;
  title: string;
  questions: PaperQuestion[];
}

export type StrictnessProfile = 'general' | 'technical' | 'acronym';

export interface MarkPoint {
  id: string;
  acceptable: string[];
  synonyms?: string[];
  marks: number;
  strictness?: StrictnessProfile;
  requires?: string[];
}

export interface ComponentRule {
  id: string;
  description: string;
  marks: number;
  acceptable: string[];
}

export interface MarkRule {
  qid: string;
  answerType: AnswerType;
  maxMarks: number;
  selectCount?: number;
  cap?: number;
  points?: MarkPoint[];
  components?: ComponentRule[];
  allowFollowThrough?: boolean;
}

export interface StudentAnswer {
  qid: string;
  answer: string | string[] | number;
}

export type MarkingMode = 'cambridge_like' | 'practice_strict';

export interface MarkingPolicy {
  mode: MarkingMode;
  allowSynonyms: boolean;
  disallowAcronymFuzzy: boolean;
  minTokenOverlapGeneral: number;
  minTokenOverlapTechnical: number;
}

export interface QuestionScore {
  qid: string;
  awarded: number;
  maxMarks: number;
  matchedPointIds: string[];
  feedback: string[];
}

export interface MarkingResult {
  totalAwarded: number;
  totalAvailable: number;
  percentage: number;
  questions: QuestionScore[];
}

// Made with Bob
