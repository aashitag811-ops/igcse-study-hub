import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

// ── POST /api/mcq-attempts ────────────────────────────────────────────────────
// Body: {
//   paperId, subjectCode, score, total, percentage,
//   timeTakenSeconds, isPractice,
//   wrongQuestions: [{ questionNumber, userAnswer, correctAnswer }]
// }
export async function POST(request: NextRequest) {
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: 'Unauthorised' }, { status: 401 });
  }

  const body = await request.json();
  const {
    paperId, subjectCode, score, total, percentage,
    timeTakenSeconds = 0, isPractice = false,
    wrongQuestions = [],
  } = body;

  if (!paperId || subjectCode == null || score == null || total == null || percentage == null) {
    return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
  }

  // Insert the attempt row
  const { data: attempt, error: attemptError } = await (supabase as any)
    .from('mcq_attempts')
    .insert({
      user_id: user.id,
      paper_id: paperId,
      subject_code: subjectCode,
      score,
      total,
      percentage,
      time_taken_seconds: timeTakenSeconds,
      is_practice: isPractice,
    })
    .select('id')
    .single();

  if (attemptError || !attempt) {
    console.error('mcq_attempts insert error:', attemptError);
    return NextResponse.json({ error: 'Failed to save attempt' }, { status: 500 });
  }

  // Insert wrong questions (if any)
  if (wrongQuestions.length > 0) {
    const rows = wrongQuestions.map((wq: {
      questionNumber: number;
      userAnswer: string | null;
      correctAnswer: string;
    }) => ({
      attempt_id: (attempt as any).id,
      user_id: user.id,
      paper_id: paperId,
      subject_code: subjectCode,
      question_number: wq.questionNumber,
      user_answer: wq.userAnswer ?? null,
      correct_answer: wq.correctAnswer,
    }));

    const { error: wqError } = await (supabase as any)
      .from('mcq_wrong_questions')
      .insert(rows);

    if (wqError) {
      // Non-fatal — attempt is saved, just log
      console.error('mcq_wrong_questions insert error:', wqError);
    }
  }

  return NextResponse.json({ attemptId: (attempt as any).id });
}

// ── GET /api/mcq-attempts ─────────────────────────────────────────────────────
// Returns all attempts for the signed-in user, newest first.
export async function GET() {
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: 'Unauthorised' }, { status: 401 });
  }

  const { data, error } = await (supabase as any)
    .from('mcq_attempts')
    .select('*')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false });

  if (error) {
    return NextResponse.json({ error: 'Failed to fetch attempts' }, { status: 500 });
  }

  return NextResponse.json({ attempts: data });
}

// Made with Bob
