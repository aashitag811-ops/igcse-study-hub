// Extended types for View Past Papers Mode - The Premium Study Suite

export interface ExaminerReport {
  questionNumber: number;
  globalPassRatePercent: number;
  commonMistakesNoted: string;
  examinerTip: string;
  difficultyRating?: 'Easy' | 'Medium' | 'Hard';
  topicsCovered?: string[];
}

export interface MarkingSchemeData {
  questionNumber: number;
  correctKey: 'A' | 'B' | 'C' | 'D';
  marksAllocated: number;
  assessmentCriteria: string;
  partialCreditNotes?: string;
  commonErrors?: string[];
}

export interface QuestionPaperAsset {
  questionNumber: number;
  questionImgUrl: string;
  pageNumber: number;
  boundingBox?: {
    x: number;
    y: number;
    width: number;
    height: number;
  };
}

export interface PastPaperData {
  subjectCode: string;
  subjectName: string;
  yearSession: string; // e.g., "m20_qp_22"
  displayName: string; // e.g., "May/June 2020 Paper 22"
  totalQuestions: number;
  questionPaperPdfUrl: string;
  markingSchemePdfUrl: string;
  examinerReportPdfUrl?: string;
  questions: QuestionPaperAsset[];
  markingScheme: MarkingSchemeData[];
  examinerReports: ExaminerReport[];
}

export interface ViewPastPapersState {
  currentQuestionIndex: number;
  showQP: boolean;
  showMS: boolean;
  isERDrawerOpen: boolean;
  selectedERQuestion: number | null;
  scrollSyncEnabled: boolean;
}

export interface PaneVisibility {
  qp: boolean;
  ms: boolean;
}

// Made with Bob