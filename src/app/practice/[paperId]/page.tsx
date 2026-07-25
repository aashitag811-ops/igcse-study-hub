'use client';

import React, { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Image from 'next/image';
import { imageUrl } from '@/lib/assetUrl';
import BackButton from '@/components/BackButton';

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
    <div className="min-h-screen flex items-center justify-center bg-slate-50">
      <div className="text-center space-y-4">
        <div className="w-16 h-16 border-4 border-amber-500/30 border-t-amber-500 rounded-full animate-spin mx-auto" />
        <p className="text-slate-600 font-light">Loading paper...</p>
      </div>
    </div>
  );

  if (error) return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50">
      <div className="text-center space-y-4 max-w-sm">
        <p className="text-red-600 font-medium">{error}</p>
        <button onClick={() => router.push('/practice')} className="px-4 py-2 bg-amber-600 text-white rounded-lg text-sm">
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
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-3xl shadow-xl p-10 max-w-md w-full text-center space-y-6">
          <div className="text-6xl">{pct >= 70 ? '🎉' : pct >= 50 ? '👍' : '📚'}</div>
          <h1 className="font-serif text-3xl text-amber-600">Practice Complete</h1>
          <div className="text-5xl font-bold text-slate-900">{score}<span className="text-2xl text-slate-400">/{total}</span></div>
          <div className="text-lg text-slate-600">{pct}% — {pct >= 70 ? 'Great work!' : pct >= 50 ? 'Good effort!' : 'Keep practising!'}</div>
          {/* Per-question breakdown */}
          <div className="grid grid-cols-5 gap-1 max-h-40 overflow-y-auto">
            {answers.map((a, i) => (
              <div key={i} className={`rounded-lg p-1.5 text-xs font-bold ${a.selected === a.correct ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                Q{a.q}
                <div className="text-xs font-normal">{a.selected === a.correct ? '✓' : `✗${a.correct}`}</div>
              </div>
            ))}
          </div>
          <div className="flex gap-3 justify-center">
            <button onClick={() => { setCurrentIndex(0); setSelected(null); setSubmitted(false); setShowER(false); setScore(0); setAnswers([]); setFinished(false); }}
              className="px-5 py-2.5 bg-amber-600 hover:bg-amber-700 text-white rounded-xl font-semibold text-sm transition-colors">
              Retry
            </button>
            <button onClick={() => router.push('/practice')} className="px-5 py-2.5 bg-slate-200 hover:bg-slate-300 text-slate-700 rounded-xl font-semibold text-sm transition-colors">
              Back
            </button>
          </div>
        </div>
      </div>
    );
  }

  const isCorrect = submitted && selected === q.correctAnswer;
  const isWrong = submitted && selected !== q.correctAnswer;

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header bar */}
      <div className="bg-white border-b border-slate-200 sticky top-0 z-10">
        <div className="max-w-3xl mx-auto px-4 py-3 flex items-center justify-between">
          <button onClick={() => router.push('/practice')} className="text-slate-500 hover:text-slate-700 text-sm font-medium flex items-center gap-1">
            ← Exit
          </button>
          <div className="text-sm font-medium text-slate-700">
            Question <span className="text-amber-600 font-bold">{currentIndex + 1}</span> of {questions.length}
          </div>
          <div className="text-sm font-medium text-slate-500">
            Score: <span className="text-green-600 font-bold">{score}</span>/{currentIndex}
          </div>
        </div>
        {/* Progress bar */}
        <div className="h-1 bg-slate-100">
          <div className="h-1 bg-amber-500 transition-all duration-300" style={{ width: `${((currentIndex) / questions.length) * 100}%` }} />
        </div>
      </div>

      <div className="max-w-3xl mx-auto px-4 py-8 space-y-6">
        {/* Question card */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          {/* Question number badge */}
          <div className="px-6 pt-6 pb-4 flex items-center justify-between">
            <span className="bg-amber-600 text-white px-4 py-1.5 rounded-full font-bold text-sm">
              Question {q.questionNumber}
            </span>
            {/* ER button — show only if ER note exists */}
            {q.examinerReportNote && (
              <button
                onClick={() => setShowER(v => !v)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all ${showER ? 'bg-purple-100 border-purple-300 text-purple-700' : 'bg-slate-100 border-slate-200 text-slate-600 hover:bg-purple-50 hover:border-purple-200 hover:text-purple-600'}`}
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
            <div className="mx-6 mb-4 p-4 bg-purple-50 border border-purple-200 rounded-xl">
              <p className="text-xs font-bold text-purple-700 uppercase tracking-wide mb-2">Cambridge Examiner Note</p>
              <p className="text-sm text-purple-900 leading-relaxed">{q.examinerReportNote}</p>
            </div>
          )}

          {/* Question image */}
          {q.imageUrl && (
            <div className="px-6 pb-4">
              <Image
                src={`${imageUrl(q.imageUrl)}?v=25`}
                alt={`Question ${q.questionNumber}`}
                width={1200}
                height={1000}
                className="w-full h-auto object-contain rounded-lg"
                priority
                unoptimized
              />
            </div>
          )}

          {/* Text question (if no image) */}
          {!q.imageUrl && q.options && (
            <div className="px-6 pb-4 space-y-3">
              {q.options.map(opt => (
                <div key={opt.letter} className="flex gap-3 items-baseline text-sm text-slate-700">
                  <span className="font-bold w-4 flex-shrink-0">{opt.letter}</span>
                  <span>{opt.text}</span>
                </div>
              ))}
            </div>
          )}

          {/* Result banner */}
          {submitted && (
            <div className={`mx-6 mb-4 px-4 py-3 rounded-xl text-sm font-medium text-center ${isCorrect ? 'bg-green-50 text-green-700 border border-green-200' : 'bg-red-50 text-red-700 border border-red-200'}`}>
              {isCorrect ? '✓ Correct!' : `✗ Incorrect — the answer was ${q.correctAnswer}`}
            </div>
          )}
        </div>

        {/* Answer buttons */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6">
          <p className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-4 text-center">Select your answer</p>
          <div className="flex justify-center gap-4">
            {['A', 'B', 'C', 'D'].map(letter => {
              let cls = 'w-14 h-14 rounded-xl font-bold text-lg transition-all duration-150 border-2 ';
              if (submitted) {
                if (letter === q.correctAnswer) cls += 'bg-green-500 text-white border-green-600 scale-110';
                else if (letter === selected && selected !== q.correctAnswer) cls += 'bg-red-500 text-white border-red-600';
                else cls += 'bg-slate-100 text-slate-400 border-slate-200 cursor-default';
              } else {
                if (letter === selected) cls += 'bg-amber-500 text-white border-amber-600 scale-110 shadow-lg';
                else cls += 'bg-white text-slate-700 border-slate-300 hover:border-amber-400 hover:scale-105 cursor-pointer';
              }
              return (
                <button key={letter} onClick={() => handleSelect(letter)} disabled={submitted} className={cls}>
                  {letter}
                  {submitted && letter === q.correctAnswer && ' ✓'}
                </button>
              );
            })}
          </div>

          {/* Action buttons */}
          <div className="mt-6 flex justify-center gap-3">
            {!submitted ? (
              <button
                onClick={handleSubmit}
                disabled={!selected}
                className="px-8 py-3 bg-amber-600 hover:bg-amber-700 disabled:opacity-40 disabled:cursor-not-allowed text-white rounded-xl font-bold transition-colors"
              >
                Check Answer
              </button>
            ) : (
              <button
                onClick={handleNext}
                className="px-8 py-3 bg-amber-600 hover:bg-amber-700 text-white rounded-xl font-bold transition-colors"
              >
                {isLastQuestion ? 'See Results' : 'Next Question →'}
              </button>
            )}
          </div>
        </div>

        {/* Question nav dots */}
        <div className="flex flex-wrap justify-center gap-1.5">
          {questions.map((_, i) => {
            let cls = 'w-7 h-7 rounded-full text-xs font-bold transition-all ';
            if (i < answers.length) {
              cls += answers[i].selected === answers[i].correct
                ? 'bg-green-500 text-white'
                : 'bg-red-400 text-white';
            } else if (i === currentIndex) {
              cls += 'bg-amber-600 text-white ring-2 ring-amber-300';
            } else {
              cls += 'bg-slate-200 text-slate-500 hover:bg-slate-300 cursor-pointer';
            }
            return (
              <button key={i} onClick={() => { if (i <= currentIndex) {} }} className={cls}>
                {i + 1}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}

// Made with Bob
