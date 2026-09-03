import { NextRequest, NextResponse } from 'next/server';
import { markSubmission, PRACTICE_STRICT_POLICY } from '@/lib/exam/marking';
import { getRulesForPaper } from '@/lib/exam/rule-registry';
import { MarkingMode, StudentAnswer } from '@/lib/exam/types';

interface MarkRequestBody {
  paperId: string;
  answers: StudentAnswer[];
  mode?: MarkingMode;
}

export async function POST(request: NextRequest) {
  const body = (await request.json()) as MarkRequestBody;

  if (!body.paperId || !Array.isArray(body.answers)) {
    return NextResponse.json({ error: 'Invalid payload. Expected paperId and answers[]' }, { status: 400 });
  }

  const rules = getRulesForPaper(body.paperId);
  if (rules.length === 0) {
    return NextResponse.json(
      { error: `No mark rules registered for paperId '${body.paperId}'.` },
      { status: 404 },
    );
  }

  const mode: MarkingMode = body.mode === 'cambridge_like' ? 'cambridge_like' : 'practice_strict';
  const policy = {
    ...PRACTICE_STRICT_POLICY,
    mode,
    allowSynonyms: mode === 'cambridge_like',
    minTokenOverlapGeneral: mode === 'cambridge_like' ? 0.45 : PRACTICE_STRICT_POLICY.minTokenOverlapGeneral,
    minTokenOverlapTechnical: mode === 'cambridge_like' ? 0.6 : PRACTICE_STRICT_POLICY.minTokenOverlapTechnical,
  };

  const result = markSubmission(body.answers, rules, policy);
  return NextResponse.json({ mode, ...result });
}

// Made with Bob
