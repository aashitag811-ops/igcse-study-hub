export interface MCQOption {
  letter: 'A' | 'B' | 'C' | 'D';
  text: string;
}

export interface MCQQuestion {
  questionNumber: number;
  questionText: string;
  options: MCQOption[];
  correctAnswer: 'A' | 'B' | 'C' | 'D';
  imageUrl?: string;
}

export interface MCQPaper {
  paperId: string;
  title: string;
  paperName: string;
  subject: string;
  code: string;
  variant: string;
  totalQuestions: number;
  timeLimit: number; // in seconds
  questions: MCQQuestion[];
  questionPaperUrl?: string;
  markingSchemeUrl?: string;
}

export interface ExamState {
  currentQuestionIndex: number;
  userAnswers: Map<number, 'A' | 'B' | 'C' | 'D'>;
  timeRemaining: number;
  isSubmitted: boolean;
  result: ExamResult | null;
}

export interface ExamResult {
  totalQuestions: number;
  correctAnswers: number;
  incorrectAnswers: number;
  score: number;
  answers: {
    questionNumber: number;
    userAnswer: 'A' | 'B' | 'C' | 'D' | null;
    correctAnswer: 'A' | 'B' | 'C' | 'D';
    isCorrect: boolean;
  }[];
}

// Made with Bob
