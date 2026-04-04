# 📝 Question Papers & AI Grading Integration Guide

## 🎯 Overview

You want to add:
1. **Question Papers** - Past papers, practice questions
2. **Theory Answer Checking** - AI algorithm to grade written answers
3. **Integration** with existing Supabase database

## 🤔 Two Approaches

### Option 1: Use Same Supabase Project (RECOMMENDED ✅)

**Pros:**
- ✅ Single database, easier management
- ✅ Shared authentication (same users)
- ✅ Unified deployment
- ✅ Lower costs (one project)
- ✅ Easier to link resources and questions

**Cons:**
- ⚠️ Need to migrate existing data
- ⚠️ All features in one codebase

### Option 2: Separate Supabase Project

**Pros:**
- ✅ Keep existing work separate
- ✅ Independent scaling
- ✅ Can develop in parallel

**Cons:**
- ❌ Two databases to manage
- ❌ Duplicate user management
- ❌ More complex deployment
- ❌ Higher costs

## 💡 Recommendation: Option 1 (Same Project)

Let's integrate everything into one project for simplicity and better user experience.

---

## 📊 Database Schema Extension

Add these tables to your existing Supabase project:

```sql
-- Question Papers Table
CREATE TABLE question_papers (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  title TEXT NOT NULL,
  subject TEXT NOT NULL,
  year INTEGER,
  session TEXT, -- 'May/June', 'Oct/Nov', 'Feb/March'
  paper_number TEXT, -- '1', '2', '3', '4'
  variant TEXT, -- '1', '2', '3'
  file_url TEXT NOT NULL,
  mark_scheme_url TEXT,
  uploader_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  download_count INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Questions Table (for individual questions from papers)
CREATE TABLE questions (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  paper_id UUID REFERENCES question_papers(id) ON DELETE CASCADE,
  question_number TEXT NOT NULL,
  question_text TEXT NOT NULL,
  marks INTEGER NOT NULL,
  topic TEXT,
  difficulty TEXT, -- 'easy', 'medium', 'hard'
  question_type TEXT, -- 'mcq', 'short_answer', 'essay', 'calculation'
  correct_answer TEXT, -- For MCQs
  marking_scheme TEXT, -- Detailed marking criteria
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Student Attempts Table
CREATE TABLE question_attempts (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  question_id UUID REFERENCES questions(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  answer_text TEXT NOT NULL,
  marks_awarded DECIMAL(5,2),
  max_marks INTEGER NOT NULL,
  ai_feedback TEXT,
  grading_status TEXT DEFAULT 'pending', -- 'pending', 'graded', 'reviewed'
  submitted_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  graded_at TIMESTAMP WITH TIME ZONE
);

-- AI Grading Results Table
CREATE TABLE ai_grading_results (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  attempt_id UUID REFERENCES question_attempts(id) ON DELETE CASCADE NOT NULL,
  model_used TEXT, -- 'gpt-4', 'claude', etc.
  confidence_score DECIMAL(3,2),
  detailed_feedback JSONB, -- Structured feedback
  strengths TEXT[],
  improvements TEXT[],
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes
CREATE INDEX idx_question_papers_subject ON question_papers(subject);
CREATE INDEX idx_question_papers_year ON question_papers(year);
CREATE INDEX idx_questions_paper ON questions(paper_id);
CREATE INDEX idx_attempts_user ON question_attempts(user_id);
CREATE INDEX idx_attempts_question ON question_attempts(question_id);

-- Enable RLS
ALTER TABLE question_papers ENABLE ROW LEVEL SECURITY;
ALTER TABLE questions ENABLE ROW LEVEL SECURITY;
ALTER TABLE question_attempts ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_grading_results ENABLE ROW LEVEL SECURITY;

-- RLS Policies for Question Papers
CREATE POLICY "Question papers viewable by everyone"
  ON question_papers FOR SELECT
  USING (true);

CREATE POLICY "Authenticated users can upload papers"
  ON question_papers FOR INSERT
  WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Users can update own papers"
  ON question_papers FOR UPDATE
  USING (auth.uid() = uploader_id);

-- RLS Policies for Questions
CREATE POLICY "Questions viewable by everyone"
  ON questions FOR SELECT
  USING (true);

CREATE POLICY "Authenticated users can add questions"
  ON questions FOR INSERT
  WITH CHECK (auth.role() = 'authenticated');

-- RLS Policies for Attempts
CREATE POLICY "Users can view own attempts"
  ON question_attempts FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can submit attempts"
  ON question_attempts FOR INSERT
  WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Users can update own attempts"
  ON question_attempts FOR UPDATE
  USING (auth.uid() = user_id);

-- RLS Policies for AI Results
CREATE POLICY "Users can view own grading results"
  ON ai_grading_results FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM question_attempts
      WHERE question_attempts.id = ai_grading_results.attempt_id
      AND question_attempts.user_id = auth.uid()
    )
  );

-- Function to update download count
CREATE OR REPLACE FUNCTION increment_download_count()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE question_papers
  SET download_count = download_count + 1
  WHERE id = NEW.paper_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger for download tracking (optional)
-- You can call this when a user downloads a paper
```

---

## 🔄 Migrating Your Existing Database

### Step 1: Export Your Current Data

If you have data in your existing Supabase project:

```sql
-- In your OLD Supabase project, run:
-- This exports your data as SQL

-- For each table, run:
COPY (SELECT * FROM your_table_name) TO STDOUT WITH CSV HEADER;
```

### Step 2: Import to New Project

1. Copy the data
2. In your IGCSE Study Hub Supabase project, go to SQL Editor
3. Paste the schema above
4. Import your data using the Supabase dashboard or SQL

---

## 🏗️ TypeScript Types Extension

Add to `src/lib/types/database.types.ts`:

```typescript
export interface QuestionPaper {
  id: string;
  title: string;
  subject: string;
  year: number | null;
  session: string | null;
  paper_number: string | null;
  variant: string | null;
  file_url: string;
  mark_scheme_url: string | null;
  uploader_id: string;
  download_count: number;
  created_at: string;
  updated_at: string;
}

export interface Question {
  id: string;
  paper_id: string | null;
  question_number: string;
  question_text: string;
  marks: number;
  topic: string | null;
  difficulty: string | null;
  question_type: string | null;
  correct_answer: string | null;
  marking_scheme: string | null;
  created_at: string;
}

export interface QuestionAttempt {
  id: string;
  question_id: string;
  user_id: string;
  answer_text: string;
  marks_awarded: number | null;
  max_marks: number;
  ai_feedback: string | null;
  grading_status: 'pending' | 'graded' | 'reviewed';
  submitted_at: string;
  graded_at: string | null;
}

export interface AIGradingResult {
  id: string;
  attempt_id: string;
  model_used: string;
  confidence_score: number;
  detailed_feedback: any; // JSONB
  strengths: string[];
  improvements: string[];
  created_at: string;
}
```

---

## 🤖 AI Grading Integration Options

### Option A: OpenAI GPT-4 (Recommended)

**Pros:**
- ✅ Excellent at understanding context
- ✅ Good at marking schemes
- ✅ Detailed feedback

**Setup:**
```bash
npm install openai
```

**Cost:** ~$0.03 per 1K tokens (very affordable)

### Option B: Anthropic Claude

**Pros:**
- ✅ Great for longer answers
- ✅ More detailed analysis

**Setup:**
```bash
npm install @anthropic-ai/sdk
```

### Option C: Google Gemini (Free Tier Available)

**Pros:**
- ✅ Free tier available
- ✅ Good performance

**Setup:**
```bash
npm install @google/generative-ai
```

---

## 📁 New File Structure

```
igcse-study-hub/
├── src/
│   ├── app/
│   │   ├── papers/
│   │   │   ├── page.tsx              # Browse papers
│   │   │   ├── [id]/
│   │   │   │   └── page.tsx          # View paper details
│   │   │   └── upload/
│   │   │       └── page.tsx          # Upload paper
│   │   ├── practice/
│   │   │   ├── page.tsx              # Practice questions
│   │   │   └── [id]/
│   │   │       └── page.tsx          # Answer question
│   │   └── my-attempts/
│   │       └── page.tsx              # View your attempts
│   ├── lib/
│   │   ├── ai/
│   │   │   ├── grading.ts            # AI grading logic
│   │   │   └── feedback.ts           # Generate feedback
│   │   └── utils/
│   │       └── paperParser.ts        # Parse PDF papers
```

---

## 🎯 Implementation Phases

### Phase 1: Basic Question Papers (Week 1)
- ✅ Upload question papers
- ✅ Browse by subject/year
- ✅ Download papers
- ✅ View mark schemes

### Phase 2: Question Bank (Week 2)
- ✅ Extract questions from papers
- ✅ Tag by topic/difficulty
- ✅ Practice mode
- ✅ Track attempts

### Phase 3: AI Grading (Week 3)
- ✅ Integrate AI API
- ✅ Grade short answers
- ✅ Provide feedback
- ✅ Show improvement areas

### Phase 4: Advanced Features (Week 4)
- ✅ Progress tracking
- ✅ Weak topic identification
- ✅ Personalized practice
- ✅ Leaderboards

---

## 🚀 Quick Start Steps

### 1. Decide on Approach
**Recommended:** Use same Supabase project

### 2. Add Database Schema
- Copy SQL from above
- Run in Supabase SQL Editor
- Verify tables created

### 3. Update TypeScript Types
- Add new interfaces
- Update Database type

### 4. Choose AI Provider
- OpenAI (recommended)
- Get API key
- Add to environment variables

### 5. Build Features Incrementally
- Start with paper upload
- Then browsing
- Then practice mode
- Finally AI grading

---

## 💰 Cost Estimate

### Supabase (Free Tier)
- 500MB database ✅
- 2GB bandwidth ✅
- 50K monthly active users ✅

### AI Grading (OpenAI)
- ~$0.03 per grading
- 1000 gradings = $30/month
- Can optimize with caching

### Total: ~$0-50/month depending on usage

---

## 📝 Next Steps

1. **Tell me:**
   - Do you want to use the same Supabase project? (Recommended: Yes)
   - Which AI provider? (Recommended: OpenAI GPT-4)
   - Do you have data to migrate?

2. **I'll create:**
   - Paper upload page
   - Browse papers page
   - Practice question interface
   - AI grading integration
   - Progress tracking

3. **You'll get:**
   - Complete question paper system
   - AI-powered grading
   - Student progress tracking
   - All integrated with your study hub

---

**Ready to integrate? Let me know your choices and I'll build it!** 🚀