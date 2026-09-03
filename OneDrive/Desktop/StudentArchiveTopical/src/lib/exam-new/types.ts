// Type definitions for the exam interface system

export interface QuestionImage {
  url: string;              // Image URL or path
  alt: string;              // Alt text for accessibility
  caption?: string;         // Optional caption
}

export interface QuestionTable {
  headers: string[];        // Table header row
  rows: string[][];         // Table data rows
}

export interface ExamTableData {
  headers: string[];
  rows: string[][];
  kind?: 'selection' | 'data' | 'reference';
  maxSelectionsPerRow?: number;
}

export interface PairedAnswerItem {
  label?: string;
  answer?: string;
  method?: string;
  description?: string;
  [key: string]: string | undefined;
}

export interface ExamQuestion {
  id?: string;              // Optional unique identifier
  number: string;           // Question number (1, a, i, etc.)
  text: string;             // Question text
  marks: number | null;     // Marks for this question (null if parent)
  type?: 'text' | 'mcq' | 'list' | 'selection' | 'circle_selection' | 'tick_selection' | 'paired_list' | 'paired_notebook' | 'grid' | 'grid_table' | 'numbered_list' | 'essay' | 'standard_notebook' | 'box_answer' | 'short_answer' | 'matrix_tick_table' | 'data_table' | 'word_bank' | 'sentence_completion' | 'selection_table';    // Answer type
  options?: string[];       // MCQ/Selection options
  maxSelections?: number;   // Max selections for MCQ/Selection
  listCount?: number;       // For list/numbered_list type - how many numbered answers required
  labels?: string[];        // For paired_list/paired_notebook type - labels for each column
  image?: QuestionImage;    // Question image with metadata
  imageUrl?: string;        // Plain image URL (alternative to image object)
  imageAlt?: string;        // Alt text for image when imageUrl is used
  imageMode?: 'full-width' | 'inline' | 'side'; // Image display mode
  hasImage?: boolean;       // Whether question has an associated image
  table?: QuestionTable;    // Question table data
  tableData?: ExamTableData; // Structured table data for rendering
  diagrams?: string[];      // Array of diagram identifiers
  wordBankItems?: string[]; // Word bank items for sentence completion
  promptImage?: { src: string; alt?: string; mode?: string; caption?: string }; // Explicit prompt image
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
  answer: string | string[]; // Text answer or selected options
  flagged?: boolean;        // Marked for review
}

export interface ExamState {
  answers: { [questionId: string]: StudentAnswer };
  timeRemaining: number;    // Seconds remaining
  startTime: number;        // Timestamp when exam started
}

// Made with Bob
