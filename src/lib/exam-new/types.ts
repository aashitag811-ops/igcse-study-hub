// Type definitions for the exam interface system

export interface QuestionImage {
  url?: string;             // Image URL or path
  path?: string;            // Alternative path property
  alt?: string;             // Alt text for accessibility
  description?: string;     // Alternative description property
  caption?: string;         // Optional caption
  answerLine?: boolean;     // Whether to show answer line below image
}

export interface QuestionTable {
  headers: string[];        // Table header row
  rows: string[][];         // Table data rows
}

export interface ExamQuestion {
  number: string;           // Question number (1, a, i, etc.)
  text: string;             // Question text
  marks: number | null;     // Marks for this question (null if parent)
  type?: 'text' | 'mcq' | 'list' | 'selection' | 'circle_selection' | 'tick_selection' | 'paired_list' | 'paired_notebook' | 'grid' | 'grid_table' | 'numbered_list' | 'essay' | 'standard_notebook' | 'box_answer' | 'short_answer' | 'matrix_tick_table' | 'data_table' | 'word_bank' | 'sentence_completion' | 'image_based_list' | 'text_with_example' | 'fill_in_blank';    // Answer type
  options?: string[];       // MCQ/Selection options
  maxSelections?: number;   // Max selections for MCQ/Selection
  listCount?: number;       // For list/numbered_list type - how many numbered answers required
  labels?: string[];        // For paired_list/paired_notebook type - labels for each column
  image?: QuestionImage;    // Question image with metadata
  images?: QuestionImage[]; // Multiple images for image_based_list
  table?: QuestionTable;    // Question table data
  diagrams?: string[];      // Array of diagram identifiers
  example?: {               // For text_with_example type
    title?: string;
    code?: string;
  };
  instruction?: string;     // Additional instruction text
  correctAnswers?: string[] | { [key: string]: string }; // Correct answers for grading
  markingScheme?: {         // Marking scheme details
    total: number;
    breakdown: string;
  };
  note?: string;            // Additional notes
  subparts?: ExamQuestion[]; // Nested subquestions
}

export interface ExamPaper {
  id: string;
  subject: string;
  year: number;
  season: string;
  variant: number;
  totalMarks: number;
  duration: number;         // Duration in minutes
  questions: ExamQuestion[];
}

export interface StudentAnswer {
  questionId: string;       // Full path like "1.a.i"
  answer: string | string[] | { [key: string]: string }; // Text answer, array, or object for matrix
  flagged?: boolean;        // Marked for review
}

export interface ExamState {
  answers: { [questionId: string]: StudentAnswer };
  timeRemaining: number;    // Seconds remaining
  startTime: number;        // Timestamp when exam started
}

// Made with Bob
