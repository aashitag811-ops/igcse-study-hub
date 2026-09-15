'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Image from 'next/image';
import { imageUrl } from '@/lib/assetUrl';
import BackButton from '@/components/BackButton';
import { SmartMCQImage } from '@/components/mcq/SmartMCQImage';

interface MCQQuestion {
  questionNumber: number;
  imageUrl?: string;
  options?: { letter: string; text: string }[];
  correctAnswer: string;
  examinerReportNote?: string | null;
}

interface MCQPaper {
  paperId: string;
  paperName: string;
  subject: string;
  totalQuestions: number;
  questions: MCQQuestion[];
}

export default function PracticePage() {
  const params = useParams();
  const router = useRouter();
  const paperId = params.paperId as string;

  const [paper, setPaper] = useState<MCQPaper | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [currentIndex, setCurrentIndex] = useState(0);
  const [selected, setSelected] = useState<string | null>(null);
  const [submitted, setSubmitted] = useState(false);
  const [showER, setShowER] = useState(false);
  const [score, setScore] = useState(0);
  const [finished, setFinished] = useState(false);
  const [answers, setAnswers] = useState<{ q: number; selected: string; correct: string }[]>([]);
  const [elapsed, setElapsed] = useState(0);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Start timer once paper loads, stop when finished
  useEffect(() => {
    if (!paper || finished) return;
    timerRef.current = setInterval(() => setElapsed(s => s + 1), 1000);
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [paper, finished]);

  useEffect(() => {
    async function load() {
      try {
        const res = await fetch(`/papers/${paperId}.json`);
        if (!res.ok) throw new Error('Paper not found');
        const data = await res.json();
        if (!data.questions?.length) throw new Error('No questions in this paper');
        // Only works for image-based MCQ papers
        if (!data.questions[0].imageUrl && !data.questions[0].options) {
          throw new Error('This paper is not available in Practice Mode');
        }
        setPaper(data);
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Failed to load');
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [paperId]);

  if (loading) return (
    <div className="min-h-screen bg-black flex items-center justify-center">
      <div className="max-w-md w-full mx-auto p-8">
        <div className="bg-black rounded-2xl shadow-2xl p-8 border border-[#1a3a6a]">
          <div className="text-center mb-6">
            <div className="inline-block p-4 bg-black rounded-full mb-4 border border-[#1a3a6a]">
              <svg className="w-12 h-12 animate-spin" fill="none" viewBox="0 0 24 24">
                <circle cx="12" cy="12" r="10" stroke="#1a3a6a" strokeWidth="4"></circle>
                <path fill="#7c6cd8" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
            </div>
            <h2 className="text-2xl font-bold text-white mb-2">Loading Paper</h2>
            <p className="text-gray-400">Preparing your practice session...</p>
          </div>
          <div className="w-full bg-[#1a3a6a]/40 rounded-full h-3 overflow-hidden">
            <div className="h-full bg-gradient-to-r from-[#1a3a6a] via-[#7c6cd8] to-[#a78bfa] animate-pulse rounded-full" style={{ width: '60%' }} />
          </div>
        </div>
      </div>
    </div>
  );

  if (error) return (
    <div className="min-h-screen flex items-center justify-center bg-black">
      <div className="text-center space-y-4 max-w-sm">
        <p className="text-red-400 font-medium">{error}</p>
        <button onClick={() => router.push('/igcse/practice')} className="px-5 py-2.5 border-2 border-indigo-500/60 text-indigo-300 rounded-xl text-sm font-semibold hover:bg-indigo-500/10 hover:border-indigo-400 transition-all">
          ← Back
        </button>
      </div>
    </div>
  );

  if (!paper) return null;

  const questions = paper.questions;
  const q = questions[currentIndex];
  const isLastQuestion = currentIndex === questions.length - 1;

  const handleSelect = (letter: string) => {
    if (submitted) return;
    setSelected(letter);
  };

  const handleSubmit = () => {
    if (!selected) return;
    const isCorrect = selected === q.correctAnswer;
    if (isCorrect) setScore(s => s + 1);
    setAnswers(prev => [...prev, { q: q.questionNumber, selected, correct: q.correctAnswer }]);
    setSubmitted(true);
    setShowER(false);
  };

  const handleNext = () => {
    if (isLastQuestion) {
      setFinished(true);
    } else {
      setCurrentIndex(i => i + 1);
      setSelected(null);
      setSubmitted(false);
      setShowER(false);
    }
  };

  // Finished screen
  if (finished) {
    const total = questions.length;
    const pct = Math.round((score / total) * 100);
    const fmt = (s: number) => `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`;
    return (
      <div className="min-h-screen bg-black flex items-center justify-center p-4">
        <div className="bg-zinc-900 border border-white/10 rounded-3xl shadow-2xl p-10 max-w-md w-full text-center space-y-6">
          <div className="text-6xl">{pct >= 70 ? '🎉' : pct >= 50 ? '👍' : '📚'}</div>
          <h1 className="font-serif text-3xl text-violet-300">Practice Complete</h1>
          <div className="text-5xl font-bold text-white">{score}<span className="text-2xl text-slate-500">/{total}</span></div>
          <div className="text-lg text-slate-400">{pct}% — {pct >= 70 ? 'Great work!' : pct >= 50 ? 'Good effort!' : 'Keep practising!'}</div>
          {/* Time taken */}
          <div className="flex items-center justify-center gap-1.5 text-sm text-slate-500">
            <svg className="w-4 h-4 text-violet-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            Time taken: <span className="font-mono font-medium text-slate-300 ml-1">{fmt(elapsed)}</span>
          </div>
          {/* Per-question breakdown */}
          <div className="grid grid-cols-5 gap-1 max-h-40 overflow-y-auto">
            {answers.map((a, i) => (
              <div key={i} className={`rounded-lg p-1.5 text-xs font-bold ${a.selected === a.correct ? 'bg-green-900/40 text-green-400' : 'bg-red-900/40 text-red-400'}`}>
                Q{a.q}
                <div className="text-xs font-normal">{a.selected === a.correct ? '✓' : `✗${a.correct}`}</div>
              </div>
            ))}
          </div>
          <div className="flex gap-3 justify-center">
            <button onClick={() => { setCurrentIndex(0); setSelected(null); setSubmitted(false); setShowER(false); setScore(0); setAnswers([]); setElapsed(0); setFinished(false); }}
              className="px-6 py-2.5 border-2 border-indigo-500/60 text-indigo-300 hover:bg-indigo-500/10 hover:border-indigo-400 rounded-xl font-semibold text-sm transition-all">
              Retry
            </button>
            <button onClick={() => router.push('/igcse/practice')} className="px-6 py-2.5 border-2 border-white/15 text-slate-400 hover:bg-white/5 hover:border-white/30 rounded-xl font-semibold text-sm transition-all">
              Back
            </button>
          </div>
        </div>
      </div>
    );
  }

  const isCorrect = submitted && selected === q.correctAnswer;
  const isWrong = submitted && selected !== q.correctAnswer;

  const fmt = (s: number) => `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`;

  // Blue→purple gradient border used throughout
  // Toned-down gradient border (50% opacity)
  const gradBorder = { border: '2px solid transparent', background: 'linear-gradient(#09090b, #09090b) padding-box, linear-gradient(135deg, rgba(59,130,246,0.5), rgba(139,92,246,0.5)) border-box' } as React.CSSProperties;
  const gradBorderZinc = { border: '2px solid transparent', background: 'linear-gradient(#18181b, #18181b) padding-box, linear-gradient(135deg, rgba(59,130,246,0.5), rgba(139,92,246,0.5)) border-box' } as React.CSSProperties;

  return (
    <div className="min-h-screen bg-black">
      {/* Header bar */}
      <div className="bg-zinc-900 border-b border-white/10 sticky top-0 z-10">
        <div className="max-w-3xl mx-auto px-4 py-3 flex items-center">
          {/* Logo + exit — hard left */}
          <div className="flex items-center gap-3 flex-shrink-0">
            <Image src="/logo.png" alt="Student Archive" width={56} height={56} className="rounded-md object-contain" />
            <button onClick={() => router.push('/igcse/practice')} style={gradBorder} className="text-slate-200 hover:text-white text-sm font-semibold px-3 py-1.5 rounded-xl flex items-center gap-1 transition-all">
              ← Exit
            </button>
          </div>
          {/* Question count — centred in remaining space */}
          <div className="flex-1 text-sm font-medium text-slate-300 text-center">
            Question <span className="text-purple-300 font-bold">{currentIndex + 1}</span> of {questions.length}
          </div>
          {/* Timer — shrink to content, hard right */}
          <div style={gradBorderZinc} className="flex-shrink-0 flex items-center gap-2 rounded-xl px-4 py-2">
            <svg className="w-4 h-4 text-blue-400 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <span className="font-mono text-white text-lg font-bold tracking-widest">{fmt(elapsed)}</span>
          </div>
        </div>
        {/* Progress bar */}
        <div className="h-0.5 bg-white/5">
          <div className="h-0.5 bg-gradient-to-r from-blue-500 to-purple-500 transition-all duration-300" style={{ width: `${((currentIndex) / questions.length) * 100}%` }} />
        </div>
      </div>

      <div className="max-w-3xl mx-auto px-4 py-8 space-y-4">
        {/* Question card */}
        <div className="bg-zinc-900 rounded-2xl border border-white/10 shadow-lg overflow-hidden">
          {/* Question number badge */}
          <div className="px-8 pt-8 pb-5 flex items-center justify-between">
            <span style={gradBorder} className="text-slate-200 px-4 py-1.5 rounded-full font-bold text-sm">
              Question {q.questionNumber}
            </span>
            {/* ER button — show only if ER note exists */}
            {q.examinerReportNote && (
              <button
                onClick={() => setShowER(v => !v)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all ${showER ? 'bg-violet-500/20 border-violet-500/50 text-violet-300' : 'bg-white/5 border-white/10 text-slate-400 hover:bg-violet-500/10 hover:border-violet-500/40 hover:text-violet-300'}`}
              >
                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                Examiner Report
              </button>
            )}
          </div>

          {/* ER panel */}
          {showER && q.examinerReportNote && (
            <div className="mx-6 mb-4 p-4 bg-violet-500/10 border border-violet-500/30 rounded-xl">
              <p className="text-xs font-bold text-violet-400 uppercase tracking-wide mb-2">Cambridge Examiner Note</p>
              <p className="text-sm text-violet-100 leading-relaxed">{q.examinerReportNote}</p>
            </div>
          )}

          {/* Question image */}
          {q.imageUrl && (
            <div className="px-6 pb-4">
              <SmartMCQImage
                src={`${imageUrl(q.imageUrl)}?v=25`}
                alt={`Question ${q.questionNumber}`}
                className="rounded-lg"
              />
            </div>
          )}

          {/* Text question (if no image) */}
          {!q.imageUrl && q.options && (
            <div className="px-6 pb-4 space-y-3">
              {q.options.map(opt => (
                <div key={opt.letter} className="flex gap-3 items-baseline text-sm text-slate-300">
                  <span className="font-bold w-4 flex-shrink-0 text-blue-400">{opt.letter}</span>
                  <span>{opt.text}</span>
                </div>
              ))}
            </div>
          )}

          {/* Result banner */}
          {submitted && (
            <div className={`mx-6 mb-4 px-4 py-3 rounded-xl text-sm font-medium text-center ${isCorrect ? 'bg-green-900/30 text-green-400 border border-green-500/30' : 'bg-red-900/30 text-red-400 border border-red-500/30'}`}>
              {isCorrect ? '✓ Correct!' : `✗ Incorrect — the answer was ${q.correctAnswer}`}
            </div>
          )}
        </div>

        {/* Answer buttons */}
        <div style={gradBorderZinc} className="bg-zinc-900 rounded-2xl shadow-lg p-4">
          <p className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-3 text-center">Select your answer</p>
          <div className="flex justify-center gap-3">
            {['A', 'B', 'C', 'D'].map(letter => {
              let btnStyle: React.CSSProperties = {};
              let cls = 'w-14 h-14 rounded-xl font-bold text-lg transition-all duration-150 ';
              if (submitted) {
                if (letter === q.correctAnswer) { cls += 'bg-green-500/15 text-green-400'; btnStyle = { border: '2px solid #22c55e' }; }
                else if (letter === selected && selected !== q.correctAnswer) { cls += 'bg-red-500/15 text-red-400'; btnStyle = { border: '2px solid #ef4444' }; }
                else { cls += 'bg-transparent text-slate-600 cursor-default'; btnStyle = { border: '2px solid rgba(255,255,255,0.08)' }; }
              } else {
                if (letter === selected) { cls += 'text-white scale-105'; btnStyle = { border: '2px solid transparent', background: 'linear-gradient(rgba(30,58,138,0.6), rgba(30,58,138,0.6)) padding-box, linear-gradient(135deg, #3b82f6, #8b5cf6) border-box', boxShadow: '0 0 20px rgba(59,130,246,0.25), inset 0 0 20px rgba(59,130,246,0.08)' }; }
                else { cls += 'text-slate-300 hover:text-white hover:scale-105 cursor-pointer'; btnStyle = { border: '2px solid transparent', background: 'linear-gradient(#18181b, #18181b) padding-box, linear-gradient(135deg, #3b82f6, #8b5cf6) border-box' }; }
              }
              return (
                <button key={letter} onClick={() => handleSelect(letter)} disabled={submitted} className={cls} style={btnStyle}>
                  {letter}
                </button>
              );
            })}
          </div>

          {/* Action buttons */}
          <div className="mt-4 flex justify-center gap-3">
            {!submitted ? (
              <button
                onClick={handleSubmit}
                disabled={!selected}
                style={gradBorderZinc}
                className="px-8 py-2.5 text-slate-200 hover:text-white disabled:opacity-30 disabled:cursor-not-allowed rounded-xl font-bold transition-all"
              >
                Check Answer
              </button>
            ) : (
              <button
                onClick={handleNext}
                style={gradBorderZinc}
                className="px-8 py-2.5 text-slate-200 hover:text-white rounded-xl font-bold transition-all"
              >
                {isLastQuestion ? 'See Results' : 'Next Question →'}
              </button>
            )}
          </div>
        </div>

        {/* Question nav dots */}
        <div className="flex flex-wrap justify-center gap-2">
          {questions.map((_, i) => {
            let cls = 'rounded-full transition-all duration-200 ';
            if (i < answers.length) {
              cls += answers[i].selected === answers[i].correct
                ? 'w-3 h-3 bg-green-500'
                : 'w-3 h-3 bg-red-500';
            } else if (i === currentIndex) {
              cls += 'w-4 h-4 bg-violet-500 ring-2 ring-violet-400/50 ring-offset-1 ring-offset-black';
            } else {
              cls += 'w-3 h-3 bg-white/15 hover:bg-white/30 cursor-pointer';
            }
            return (
              <button key={i} onClick={() => { if (i <= currentIndex) {} }} className={cls} aria-label={`Question ${i + 1}`} />
            );
          })}
        </div>
      </div>
    </div>
  );
}

// Made with Bob
