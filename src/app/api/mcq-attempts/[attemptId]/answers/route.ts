import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

// GET /api/mcq-attempts/[attemptId]/answers
// Returns all question answers for a specific attempt (must belong to the signed-in user).
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ attemptId: string }> }
) {
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: 'Unauthorised' }, { status: 401 });
  }

  const { attemptId } = await params;

  // First verify the attempt belongs to this user
  const { data: attempt, error: attemptError } = await (supabase as any)
    .from('mcq_attempts')
    .select('id, paper_id, score, total, percentage, time_taken_seconds, is_practice, created_at')
    .eq('id', attemptId)
    .eq('user_id', user.id)
    .single();

  if (attemptError || !attempt) {
    return NextResponse.json({ error: 'Attempt not found' }, { status: 404 });
  }

  const { data: answers, error: answersError } = await (supabase as any)
    .from('mcq_question_answers')
    .select('question_number, user_answer, correct_answer, is_correct')
    .eq('attempt_id', attemptId)
    .order('question_number', { ascending: true });

  if (answersError) {
    return NextResponse.json({ error: 'Failed to fetch answers' }, { status: 500 });
  }

  return NextResponse.json({ attempt, answers: answers ?? [] });
}
