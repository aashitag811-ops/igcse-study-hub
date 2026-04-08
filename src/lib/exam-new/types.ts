// Question structure types
export interface QuestionPart {
  id: string; // e.g., "1a", "1ai", "1aii", "1b", "2"
  text: string;
  marks: number;
  level: number; // 0 = main question, 1 = a/b/c, 2 = i/ii/iii
  parentId?: string; // parent question id
  answer?: string; // user's answer
}

export interface Question {
  number: number;
  parts: QuestionPart[];
  totalMarks: number;
}

export interface ExamPaper {
  id: string;
  subject: string;
  year: number;
  season: string;
  variant: number;
  totalMarks: number;
  duration: number; // in minutes
  questions: Question[];
}

export interface QuestionStatus {
  attempted: boolean;
  flagged: boolean;
  answered: boolean;
}

export interface ExamState {
  answers: { [questionId: string]: string };
  statuses: { [questionId: string]: QuestionStatus };
  startTime: number;
  timeRemaining: number; // in seconds
}

// Made with Bob
