'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { MCQQuestionCard } from '@/components/mcq/MCQQuestionCard';
import { pdfUrl } from '@/lib/assetUrl';
import { SUBJECTS } from '@/lib/constants/subjects';
import type { MCQQuestion, MCQPaper } from '@/lib/types/mcq.types';
import type { McqQuestionAnswer } from '@/lib/types/database.types';

// ── Helpers ────────────────────────────────────────────────────────────────────

const SUBJECT_NAME: Record<string, string> = Object.fromEntries(
  SUBJECTS.map(s => [s.code, s.name])
);

function paperLabel(paperId: string) {
  const m = paperId.match(/^(\d{4})_([msw])(\d{2})(?:_qp)?_(\d)(\d)/);
  if (!m) return paperId;
  const [, code, seas, yr, comp, vari] = m;
  const season = seas === 'm' ? 'Feb/Mar' : seas === 's' ? 'May/Jun' : 'Oct/Nov';
  return `${SUBJECT_NAME[code] ?? code} · ${season} 20${yr} · P${comp}V${vari}`;
}

function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString(undefined, {
    day: 'numeric', month: 'short', year: 'numeric',
  });
}

function fmtTime(secs: number) {
  const m = Math.floor(secs / 60);
  const s = secs % 60;
  return `${m}m ${String(s).padStart(2, '0')}s`;
}

function gradeFromPct(pct: number) {
  if (pct >= 90) return 'A*';
  if (pct >= 80) return 'A';
  if (pct >= 70) return 'B';
  if (pct >= 60) return 'C';
  if (pct >= 50) return 'D';
  return 'E';
}

// ── Page ───────────────────────────────────────────────────────────────────────

interface AttemptMeta {
  id: string;
  paper_id: string;
  score: number;
  total: number;
  percentage: number;
  time_taken_seconds: number;
  is_practice: boolean;
  created_at: string;
}

type LoadState = 'loading' | 'ready' | 'error';

export default function MCQReviewPage() {
  const params = useParams();
  const router = useRouter();
  const attemptId = params.attemptId as string;

  const [loadState, setLoadState] = useState<LoadState>('loading');
  const [attempt, setAttempt] = useState<AttemptMeta | null>(null);
  const [questions, setQuestions] = useState<MCQQuestion[]>([]);
  const [answers, setAnswers] = useState<Map<number, string | null>>(new Map());
  const [zoomLevel, setZoomLevel] = useState(100);
  const [isNavOpen, setIsNavOpen] = useState(false);

  useEffect(() => {
    const load = async () => {
      try {
        // 1. Fetch stored answers for this attempt
        const res = await fetch(`/api/mcq-attempts/${attemptId}/answers`);
        if (!res.ok) {
          setLoadState('error');
          return;
        }
        const { attempt: meta, answers: storedAnswers } = await res.json() as {
          attempt: AttemptMeta;
          answers: McqQuestionAnswer[];
        };

        if (!meta || !storedAnswers) {
          setLoadState('error');
          return;
        }

        setAttempt(meta);

        // 2. Fetch the original paper JSON for question text/images
        const paperRes = await fetch(`/papers/${meta.paper_id}.json?t=${Date.now()}`);
        let paperQuestions: MCQQuestion[] = [];
        if (paperRes.ok) {
          const paperData: MCQPaper = await paperRes.json();
          paperQuestions = paperData.questions ?? [];
        }

        // 3. Merge stored answers into the questions.
        //    If the paper JSON loaded, use its rich question data.
        //    Otherwise synthesise minimal question objects from the stored answers.
        const answerMap = new Map(storedAnswers.map(a => [a.question_number, a]));

        let mergedQuestions: MCQQuestion[];
        if (paperQuestions.length > 0) {
          // Override correctAnswer from storage (source of truth for this attempt)
          mergedQuestions = paperQuestions.map(q => ({
            ...q,
            correctAnswer: (answerMap.get(q.questionNumber)?.correct_answer as any) ?? q.correctAnswer,
          }));
        } else {
          // No paper JSON — build minimal questions from stored answer rows
          mergedQuestions = storedAnswers.map(a => ({
            questionNumber: a.question_number,
            questionText: '',
            options: [],
            correctAnswer: a.correct_answer as any,
          }));
        }

        // Build user-answer map
        const uAnswers = new Map<number, string | null>(
          storedAnswers.map(a => [a.question_number, a.user_answer])
        );

        setQuestions(mergedQuestions);
        setAnswers(uAnswers);
        setLoadState('ready');
      } catch {
        setLoadState('error');
      }
    };

    load();
  }, [attemptId]);

  // ── Loading ──────────────────────────────────────────────────────────────────
  if (loadState === 'loading') {
    return (
      <div className="min-h-screen bg-[#FAF7F0] dark:bg-[#0A0806] flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-[#C9A84C]/30 border-t-[#C9A84C] rounded-full animate-spin mx-auto mb-4" />
          <p className="text-[#7A6A4A] dark:text-[#C4B08A] font-medium">Loading review…</p>
        </div>
      </div>
    );
  }

  if (loadState === 'error' || !attempt) {
    return (
      <div className="min-h-screen bg-[#FAF7F0] dark:bg-[#0A0806] flex items-center justify-center">
        <div className="text-center max-w-sm">
          <div className="text-5xl mb-4">⚠️</div>
          <h2 className="text-xl font-bold text-[#2A1F0E] dark:text-[#E2C97A] mb-2">Review not available</h2>
          <p className="text-[#7A6A4A] dark:text-[#C4B08A] mb-6 text-sm">
            This attempt may be too old (answers were not stored) or could not be loaded.
          </p>
          <button
            onClick={() => router.push('/igcse/profile')}
            className="px-5 py-2 bg-[#C9A84C] text-[#0A0806] rounded-lg font-semibold hover:bg-[#E2C97A] transition-colors"
          >
            ← Back to Profile
          </button>
        </div>
      </div>
    );
  }

  // ── Stats ────────────────────────────────────────────────────────────────────
  const pct = Number(attempt.percentage);
  const grade = gradeFromPct(pct);
  const gradeColor = pct >= 80 ? '#6EE7A0' : pct >= 60 ? '#E2C97A' : '#F09090';

  const getQuestionStatus = (qNum: number) => {
    const q = questions.find(q => q.questionNumber === qNum);
    const ua = answers.get(qNum);
    if (q?.correctAnswer === 'DISCOUNTED') return 'correct';
    return ua === q?.correctAnswer ? 'correct' : ua ? 'incorrect' : 'unanswered';
  };

  return (
    <div className="min-h-screen bg-[#FAF7F0] dark:bg-[#0A0806]">

      {/* ── Fixed Header ─────────────────────────────────────────────────────── */}
      <div className="fixed top-0 left-0 right-0 bg-[#FAF7F0] dark:bg-[#1A1510] border-b border-[#E5DCC8] dark:border-[#C9A84C]/25 shadow-sm z-50">
        <div className="max-w-7xl mx-auto px-4 py-3">

          {/* Back button */}
          <button
            onClick={() => router.push('/igcse/profile')}
            className="absolute top-3 left-4 px-3 py-1.5 bg-[#C9A84C] hover:bg-[#E2C97A] text-[#0A0806] rounded-lg font-bold text-sm transition-colors flex items-center gap-1"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
            Profile
          </button>

          <div className="flex items-center justify-between pl-20 pr-2">

            {/* Left — score chips */}
            <div className="flex items-center gap-3 flex-wrap">
              {/* Review Mode badge */}
              <div className="px-3 py-1.5 bg-[#C9A84C]/15 dark:bg-[#2A1F0E] border border-[#C9A84C]/40 rounded-lg">
                <span className="text-xs font-bold text-[#C9A84C] tracking-widest uppercase">Review Mode</span>
              </div>

              {attempt.is_practice && (
                <div className="px-3 py-1.5 bg-orange-100 dark:bg-[#3D2E15] border border-orange-300 dark:border-[#C9A84C]/40 rounded-lg">
                  <span className="text-xs font-bold text-orange-700 dark:text-[#E2C97A]">Practice</span>
                </div>
              )}

              <div className="px-3 py-1.5 bg-[#2A1F0E]/10 dark:bg-[#2A1F0E] border border-[#C9A84C]/30 rounded-lg">
                <span className="text-sm text-[#7A6A4A] dark:text-[#C4B08A]">Score </span>
                <span className="text-base font-bold text-[#2A1F0E] dark:text-[#E2C97A]">{attempt.score}/{attempt.total}</span>
              </div>

              <div className="px-3 py-1.5 bg-[#2A1F0E]/10 dark:bg-[#2A1F0E] border border-[#C9A84C]/30 rounded-lg">
                <span className="text-sm text-[#7A6A4A] dark:text-[#C4B08A]">% </span>
                <span className="text-base font-bold text-[#2A1F0E] dark:text-[#E2C97A]">{pct}%</span>
              </div>

              <div className="px-3 py-1.5 rounded-lg border" style={{ background: `${gradeColor}18`, borderColor: `${gradeColor}40` }}>
                <span className="text-sm" style={{ color: gradeColor }}>Grade </span>
                <span className="text-base font-bold" style={{ color: gradeColor }}>{grade}</span>
              </div>

              <div className="px-3 py-1.5 bg-[#2A1F0E]/10 dark:bg-[#2A1F0E] border border-[#C9A84C]/30 rounded-lg">
                <span className="text-sm text-[#7A6A4A] dark:text-[#C4B08A]">Time </span>
                <span className="text-base font-bold text-[#2A1F0E] dark:text-[#E2C97A]">{fmtTime(attempt.time_taken_seconds)}</span>
              </div>
            </div>

            {/* Right — controls */}
            <div className="flex items-center gap-2">

              {/* Question navigator */}
              <div className="relative">
                <button
                  onClick={() => setIsNavOpen(v => !v)}
                  className="px-3 py-2 bg-[#C9A84C] hover:bg-[#E2C97A] text-[#0A0806] rounded-lg font-semibold text-sm transition-colors flex items-center gap-1"
                >
                  Questions
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </button>

                {isNavOpen && (
                  <div
                    className="absolute top-full mt-2 right-0 bg-white dark:bg-[#1A1510] rounded-xl shadow-2xl p-4 border-2 border-[#C9A84C]/30 z-50"
                    style={{ width: 320 }}
                  >
                    <h3 className="text-sm font-bold text-[#2A1F0E] dark:text-[#E2C97A] mb-3 text-center">Jump to Question</h3>
                    <div className="grid grid-cols-5 gap-2 max-h-96 overflow-y-auto">
                      {questions.map(q => {
                        const status = getQuestionStatus(q.questionNumber);
                        const colors =
                          status === 'correct'   ? { bg: '#dcfce7', text: '#16a34a', border: '#86efac' } :
                          status === 'incorrect' ? { bg: '#fee2e2', text: '#dc2626', border: '#fca5a5' } :
                                                   { bg: '#f1f5f9', text: '#64748b', border: '#e2e8f0' };
                        return (
                          <button
                            key={q.questionNumber}
                            onClick={() => {
                              document.getElementById(`question-${q.questionNumber}`)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
                              setIsNavOpen(false);
                            }}
                            style={{ padding: 10, background: colors.bg, color: colors.text, border: `2px solid ${colors.border}`, borderRadius: 8, fontSize: '0.85rem', fontWeight: 600, cursor: 'pointer' }}
                          >
                            {q.questionNumber}
                          </button>
                        );
                      })}
                    </div>
                    {/* Legend */}
                    <div className="flex items-center gap-3 mt-3 pt-3 border-t border-gray-100 dark:border-[#C9A84C]/20 text-xs text-[#7A6A4A] dark:text-[#C4B08A]">
                      <span className="w-3 h-3 rounded-sm bg-green-200 inline-block" /> Correct
                      <span className="w-3 h-3 rounded-sm bg-red-200 inline-block ml-2" /> Wrong
                      <span className="w-3 h-3 rounded-sm bg-slate-200 inline-block ml-2" /> Skipped
                    </div>
                  </div>
                )}
              </div>

              {/* Zoom controls */}
              <div className="flex items-center gap-1 px-2 py-1 bg-[#C4B08A]/20 dark:bg-[#2A1F0E] border border-[#C9A84C]/30 rounded-lg">
                <button
                  onClick={() => setZoomLevel(v => Math.max(50, v - 10))}
                  className="px-2 py-1 hover:bg-[#C4B08A]/30 dark:hover:bg-[#3D2E15] rounded font-bold text-[#2A1F0E] dark:text-[#E2C97A]"
                >−</button>
                <span className="px-2 text-xs font-medium text-[#7A6A4A] dark:text-[#C4B08A] min-w-[42px] text-center">{zoomLevel}%</span>
                <button
                  onClick={() => setZoomLevel(v => Math.min(200, v + 10))}
                  className="px-2 py-1 hover:bg-[#C4B08A]/30 dark:hover:bg-[#3D2E15] rounded font-bold text-[#2A1F0E] dark:text-[#E2C97A]"
                >+</button>
              </div>

              {/* PDF links */}
              <a
                href={pdfUrl(attempt.paper_id)}
                target="_blank"
                rel="noopener noreferrer"
                className="px-3 py-2 bg-blue-100 dark:bg-[#2A1F0E] hover:bg-blue-200 text-blue-700 dark:text-[#E2C97A] border border-blue-200 dark:border-[#C9A84C]/30 rounded-lg text-sm font-medium transition-colors"
                title="Open Question Paper PDF"
              >QP</a>
              <a
                href={pdfUrl(attempt.paper_id.replace('qp', 'ms'))}
                target="_blank"
                rel="noopener noreferrer"
                className="px-3 py-2 bg-green-100 dark:bg-[#2A1F0E] hover:bg-green-200 text-green-700 dark:text-[#E2C97A] border border-green-200 dark:border-[#C9A84C]/30 rounded-lg text-sm font-medium transition-colors"
                title="Open Marking Scheme PDF"
              >MS</a>

              {/* Retry */}
              <button
                onClick={() => router.push(`/igcse/mcq-exam/${attempt.paper_id}`)}
                className="px-3 py-2 bg-[#C9A84C] hover:bg-[#E2C97A] text-[#0A0806] rounded-lg font-semibold text-sm transition-colors"
              >
                🔄 Retry
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* ── Questions ─────────────────────────────────────────────────────────── */}
      <div className="pt-20 pb-32 w-full flex flex-col items-center overflow-y-auto">
        <div
          style={{
            transform: `scale(${zoomLevel / 100})`,
            transformOrigin: 'top center',
            width: `${100 / (zoomLevel / 100)}%`,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
          }}
          className="transition-transform duration-150 ease-out"
        >
          <div className="w-full max-w-4xl px-4 sm:px-6 lg:px-8 space-y-6">

            {/* Paper title banner */}
            <div className="bg-[#C9A84C]/10 dark:bg-[#2A1F0E] border-2 border-[#C9A84C]/30 rounded-xl p-4 text-center">
              <p className="text-xs font-bold uppercase tracking-widest text-[#C9A84C] mb-1">Review Mode</p>
              <h1 className="text-lg font-bold text-[#2A1F0E] dark:text-[#E2C97A]">
                {paperLabel(attempt.paper_id)}
              </h1>
              <p className="text-sm text-[#7A6A4A] dark:text-[#C4B08A] mt-1">
                Attempted on {fmtDate(attempt.created_at)}
              </p>
            </div>

            {/* Summary row */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {[
                ['Score', `${attempt.score}/${attempt.total}`],
                ['Percentage', `${pct}%`],
                ['Grade', grade],
                ['Time Taken', fmtTime(attempt.time_taken_seconds)],
              ].map(([label, value]) => (
                <div key={label} className="bg-white dark:bg-[#1A1510] border border-[#C9A84C]/25 rounded-xl p-3 text-center">
                  <p className="text-xs text-[#7A6A4A] dark:text-[#C4B08A] uppercase tracking-wider mb-1">{label}</p>
                  <p className="text-xl font-bold text-[#2A1F0E] dark:text-[#E2C97A]">{value}</p>
                </div>
              ))}
            </div>

            {/* Questions */}
            {questions.length === 0 ? (
              <div className="text-center py-16">
                <p className="text-[#7A6A4A] dark:text-[#C4B08A]">
                  No question data found for this attempt.
                </p>
              </div>
            ) : (
              questions.map((question, index) => (
                <MCQQuestionCard
                  key={`rev-${index}-${question.questionNumber}`}
                  question={question}
                  selectedAnswer={(answers.get(question.questionNumber) ?? undefined) as 'A' | 'B' | 'C' | 'D' | undefined}
                  onAnswerSelect={() => {}} // read-only
                  isSubmitted={true}
                  correctAnswer={question.correctAnswer}
                  zoomLevel={100}
                />
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
