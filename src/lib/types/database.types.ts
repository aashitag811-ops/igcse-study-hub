export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: Profile;
        Insert: Omit<Profile, 'created_at' | 'updated_at'>;
        Update: Partial<Omit<Profile, 'id' | 'created_at'>>;
      };
      resources: {
        Row: Resource;
        Insert: Omit<Resource, 'id' | 'created_at' | 'updated_at' | 'upvote_count'>;
        Update: Partial<Omit<Resource, 'id' | 'created_at' | 'uploader_id'>>;
      };
      votes: {
        Row: Vote;
        Insert: Omit<Vote, 'id' | 'created_at'>;
        Update: never;
      };
      mcq_attempts: {
        Row: McqAttempt;
        Insert: Omit<McqAttempt, 'id' | 'created_at'>;
        Update: never;
      };
      mcq_wrong_questions: {
        Row: McqWrongQuestion;
        Insert: Omit<McqWrongQuestion, 'id' | 'created_at'>;
        Update: never;
      };
      mcq_question_answers: {
        Row: McqQuestionAnswer;
        Insert: Omit<McqQuestionAnswer, 'id' | 'created_at'>;
        Update: never;
      };
    };
  };
}

export interface Profile {
  id: string;
  email: string;
  username: string;
  full_name: string | null;
  avatar_url: string | null;
  created_at: string;
  updated_at: string;
}

export interface Resource {
  id: string;
  title: string;
  subject: string;
  resource_type: string;
  link: string;
  description: string | null;
  uploader_id: string;
  upvote_count: number;
  created_at: string;
  updated_at: string;
}

export interface Vote {
  id: string;
  resource_id: string;
  user_id: string;
  created_at: string;
}

// Extended types with relations
export interface ResourceWithProfile extends Resource {
  profiles: Profile;
}

export interface ResourceWithVotes extends Resource {
  votes: Vote[];
  user_voted: boolean;
}

// Form types
export interface CreateResourceInput {
  title: string;
  subject: string;
  resource_type: string;
  link: string;
  description?: string;
}

export interface UpdateResourceInput {
  title?: string;
  subject?: string;
  resource_type?: string;
  link?: string;
  description?: string;
}

export interface McqAttempt {
  id: string;
  user_id: string;
  paper_id: string;
  subject_code: string;
  score: number;
  total: number;
  percentage: number;
  time_taken_seconds: number;
  is_practice: boolean;
  created_at: string;
}

export interface McqWrongQuestion {
  id: string;
  attempt_id: string;
  user_id: string;
  paper_id: string;
  subject_code: string;
  question_number: number;
  user_answer: string | null;
  correct_answer: string;
  created_at: string;
}

export interface McqQuestionAnswer {
  id: string;
  attempt_id: string;
  user_id: string;
  paper_id: string;
  question_number: number;
  user_answer: string | null;
  correct_answer: string;
  is_correct: boolean;
  created_at: string;
}

// Made with Bob
