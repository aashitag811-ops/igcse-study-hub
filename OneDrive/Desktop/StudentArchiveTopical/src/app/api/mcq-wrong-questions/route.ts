import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

// ── GET /api/mcq-wrong-questions ──────────────────────────────────────────────
// Returns all wrong questions for the signed-in user, newest first.
// Groups by subject_code on the client side.
export async function GET() {
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: 'Unauthorised' }, { status: 401 });
  }

  const { data, error } = await (supabase as any)
    .from('mcq_wrong_questions')
    .select('*')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false });

  if (error) {
    return NextResponse.json({ error: 'Failed to fetch wrong questions' }, { status: 500 });
  }

  return NextResponse.json({ wrongQuestions: data });
}

// Made with Bob
