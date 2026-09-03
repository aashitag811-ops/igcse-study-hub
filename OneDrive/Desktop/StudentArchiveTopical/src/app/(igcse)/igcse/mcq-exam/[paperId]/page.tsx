'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { MCQPaper } from '@/lib/types/mcq.types';
import { MCQQuestionCard } from '@/components/mcq/MCQQuestionCard';
import BackButton from '@/components/BackButton';
import { pdfUrl } from '@/lib/assetUrl';
import { createClient } from '@/lib/supabase/client';

type ExamPhase = 'loading' | 'ready' | 'active' | 'completed';

export default function MCQExamPage() {
  const params = useParams();
  const router = useRouter();
  const paperId = params.paperId as string;
  
  const [paper, setPaper] = useState<MCQPaper | null>(null);
  const [phase, setPhase] = useState<ExamPhase>('loading');
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [userAnswers, setUserAnswers] = useState<Map<number, 'A' | 'B' | 'C' | 'D'>>(new Map());
  const [timeRemaining, setTimeRemaining] = useState(45 * 60); // 45 minutes in seconds
  const [isPaused, setIsPaused] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [showSubmitConfirm, setShowSubmitConfirm] = useState(false);
  const [showTimeUpModal, setShowTimeUpModal] = useState(false);
  const [isExtraTime, setIsExtraTime] = useState(false);
  const [zoomLevel, setZoomLevel] = useState(100); // Zoom percentage (100 = normal)
  const [isNavPanelOpen, setIsNavPanelOpen] = useState(false); // Question navigation panel state
  const [flaggedQuestions, setFlaggedQuestions] = useState<Set<number>>(new Set());

  const toggleFlag = (questionNumber: number) => {
    setFlaggedQuestions(prev => {
      const next = new Set(prev);
      if (next.has(questionNumber)) next.delete(questionNumber);
      else next.add(questionNumber);
      return next;
    });
  };

  // Handle keyboard events and clicks for pause overlay
  useEffect(() => {
    const handleKeyPress = (e: KeyboardEvent) => {
      if (isPaused && !isSubmitted) {
        setIsPaused(false);
      }
    };

    if (isPaused) {
      window.addEventListener('keydown', handleKeyPress);
      return () => window.removeEventListener('keydown', handleKeyPress);
    }
  }, [isPaused, isSubmitted]);

  // Auto-pause when tab loses focus (alt-tab or switching tabs)
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.hidden && !isSubmitted && !isPaused) {
        setIsPaused(true);
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, [isSubmitted, isPaused]);

  // Loading phase with progress bar
  useEffect(() => {
    const loadPaper = async () => {
      try {
        // Validate paper ID format and check if it's an MCQ paper
        // Format 1: 0455_m25_qp_22  (with _qp_)
        // Format 2: 0610_m25_12     (without _qp_)
        const paperIdParts = paperId.split('_');
        if (paperIdParts.length < 3) {
          throw new Error('Invalid paper ID format');
        }

        const subjectCode = paperIdParts[0];
        const sessionYear = paperIdParts[1]; // e.g., "m25", "s25"
        const year = parseInt('20' + sessionYear.substring(1)); // Extract year: "m25" -> 2025
        // Handle both formats: _qp_22 (part[3]) and _12 (part[2])
        const componentStr = paperIdParts.length >= 4 ? paperIdParts[3] : paperIdParts[2]; // e.g., "22", "12"
        const component = parseInt(componentStr.substring(0, 1)); // First digit is component: "22" -> 2, "12" -> 1
        
        // Only redirect papers that are structurally never MCQ regardless of year
        // Economics Paper 2 = structured essay questions, never MCQ
        const isEconTheory = (subjectCode === '0455' && component === 2);
        // Biology Paper 4 = interactive theory workspace
        const isInteractiveTheoryPaper = (subjectCode === '0610' && component === 4);

        if (isInteractiveTheoryPaper) {
          router.push(`/igcse/theory-exam/${paperId}`);
          return;
        }
        if (isEconTheory) {
          router.push(`/igcse/view-papers/${paperId}`);
          return;
        }
        
        // Simulate extraction progress
        const progressInterval = setInterval(() => {
          setProgress(prev => {
            if (prev >= 100) {
              clearInterval(progressInterval);
              return 100;
            }
            return prev + 10;
          });
        }, 200);

        const response = await fetch(`/papers/${paperId}.json?t=${Date.now()}`);
        
        if (!response.ok) {
          throw new Error('Paper not found');
        }
        
        const paperData = await response.json();

        // Guard: if every question has an empty correctAnswer, this paper
        // has no answer key — redirect to View Mode instead of a silent broken exam
        const questions = paperData.questions || [];
        const hasAnyAnswer = questions.some((q: any) => q.correctAnswer && q.correctAnswer.trim() !== '');
        if (questions.length > 0 && !hasAnyAnswer) {
          router.push(`/igcse/view-papers/${paperId}`);
          return;
        }

        // Wait for progress to complete
        await new Promise(resolve => setTimeout(resolve, 2500));
        
        setPaper(paperData);
        setTimeRemaining(paperData.timeLimit); // timeLimit is already in seconds
        setPhase('ready');
      } catch (err) {
        console.error('Error loading paper:', err);
        setError('Failed to load the exam paper. Please try again.');
        setPhase('loading');
      }
    };

    loadPaper();
  }, [paperId, router]);

  // Timer countdown
  useEffect(() => {
    if (phase !== 'active' || isPaused || timeRemaining <= 0 || isSubmitted) return;

    const timer = setInterval(() => {
      setTimeRemaining(prev => {
        if (prev <= 1) {
          setShowTimeUpModal(true);
          setIsPaused(true);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [phase, isPaused, timeRemaining, isSubmitted]);

  const handleAnswerSelect = (questionNumber: number, answer: 'A' | 'B' | 'C' | 'D') => {
    if (isSubmitted) return; // Prevent changes after submission
    setUserAnswers(prev => {
      const newAnswers = new Map(prev);
      newAnswers.set(questionNumber, answer);
      return newAnswers;
    });
  };

  // ── Persist attempt to Supabase (fire-and-forget) ──────────
  const saveAttempt = (isPracticeMode: boolean) => {
    if (!paper) return;
    const scorable = paper.questions.filter(q => q.correctAnswer !== 'DISCOUNTED');
    const discounted = paper.questions.length - scorable.length;
    const correct = scorable.filter(q => userAnswers.get(q.questionNumber) === q.correctAnswer).length;
    const pct = Math.round(((correct + discounted) / paper.questions.length) * 100);
    const subjectCode = paper.code ?? paperId.split('_')[0];
    const timeLimit = paper.timeLimit ?? 45 * 60;
    const timeTaken = timeLimit - timeRemaining;

    const wrongQuestions = paper.questions
      .filter(q => q.correctAnswer !== 'DISCOUNTED' && userAnswers.get(q.questionNumber) !== q.correctAnswer)
      .map(q => ({
        questionNumber: q.questionNumber,
        userAnswer: userAnswers.get(q.questionNumber) ?? null,
        correctAnswer: q.correctAnswer,
      }));

    // All answers (right + wrong) — needed for Review Mode
    const allAnswers = paper.questions.map(q => ({
      questionNumber: q.questionNumber,
      userAnswer: userAnswers.get(q.questionNumber) ?? null,
      correctAnswer: q.correctAnswer,
      isCorrect: q.correctAnswer === 'DISCOUNTED' || userAnswers.get(q.questionNumber) === q.correctAnswer,
    }));

    // Only save if signed in — silently skip if not
    const supabase = createClient();
    supabase.auth.getUser().then(({ data }) => {
      if (!data.user) return;
      fetch('/api/mcq-attempts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          paperId,
          subjectCode,
          score: correct,
          total: paper.questions.length,
          percentage: pct,
          timeTakenSeconds: Math.max(0, timeTaken),
          isPractice: isPracticeMode,
          wrongQuestions,
          allAnswers,
        }),
      }).catch(() => { /* non-fatal */ });
    });
  };

  const handleSubmitClick = () => {
    setShowSubmitConfirm(true);
  };

  const handleConfirmSubmit = () => {
    saveAttempt(isExtraTime);
    setIsSubmitted(true);
    setIsPaused(true); // Stop timer
    setShowSubmitConfirm(false);
  };

  const handleCancelSubmit = () => {
    setShowSubmitConfirm(false);
  };

  const handleExtraTime = () => {
    setIsExtraTime(true);
    setShowTimeUpModal(false);
    setIsPaused(false);
    setTimeRemaining(10 * 60); // Add 10 more minutes
  };

  const handleTimeUpSubmit = () => {
    saveAttempt(isExtraTime);
    setIsSubmitted(true);
    setShowTimeUpModal(false);
  };

  const handleStartExam = () => {
    setPhase('active');
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
  };

  // Loading/Extraction Phase
  if (phase === 'loading') {
    if (error) {
      return (
        <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 flex items-center justify-center">
          <div className="max-w-md mx-auto text-center p-8 bg-white rounded-2xl shadow-xl">
            <div className="text-6xl mb-4">⚠️</div>
            <h2 className="text-2xl font-bold text-slate-900 mb-4">Paper Not Available</h2>
            <p className="text-slate-600 mb-6">{error}</p>
            <button
              onClick={() => router.push('/igcse/mcq-test')}
              className="px-6 py-3 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700 transition-colors"
            >
              ← Back to Selection
            </button>
          </div>
        </div>
      );
    }

    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="max-w-md w-full mx-auto p-8">
          <div className="bg-black rounded-2xl shadow-2xl p-8 border border-[#1a3a6a]">
            <div className="text-center mb-6">
              {/* Spinner: navy blue track, purple/indigo arc */}
              <div className="inline-block p-4 bg-black rounded-full mb-4 border border-[#1a3a6a]">
                <svg className="w-12 h-12 animate-spin" fill="none" viewBox="0 0 24 24">
                  <circle cx="12" cy="12" r="10" stroke="#1a3a6a" strokeWidth="4"></circle>
                  <path fill="#7c6cd8" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
              </div>
              <h2 className="text-2xl font-bold text-white mb-2">Extracting Questions</h2>
              <p className="text-gray-400">Processing your exam paper...</p>
            </div>

            {/* Progress Bar */}
            <div className="mb-4">
              <div className="flex justify-between text-sm font-medium text-gray-300 mb-2">
                <span>Progress</span>
                <span>{progress}%</span>
              </div>
              <div className="w-full bg-[#1a3a6a]/40 rounded-full h-3 overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-[#1a3a6a] via-[#7c6cd8] to-[#a78bfa] transition-all duration-300 ease-out"
                  style={{ width: `${progress}%` }}
                ></div>
              </div>
            </div>

            <p className="text-xs text-gray-500 text-center">
              Parsing questions and matching with marking scheme...
            </p>
          </div>
        </div>
      </div>
    );
  }

  // Ready to Start Phase
  if (phase === 'ready' && paper) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="max-w-2xl w-full mx-auto p-8">
          <div className="bg-black rounded-2xl shadow-2xl p-12 text-center border border-[#1a2a4a]">
            {/* Icon — hollow navy+purple ring, filled gold triangle */}
            <div className="inline-block p-6 rounded-full mb-6 border-2" style={{ borderColor: 'transparent', background: 'linear-gradient(black, black) padding-box, linear-gradient(135deg, #1a3a6a, #4a2a7a) border-box' }}>
              <svg className="w-20 h-20" viewBox="0 0 24 24">
                <defs>
                  <linearGradient id="playGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" stopColor="#1a3a6a" />
                    <stop offset="100%" stopColor="#4a2a7a" />
                  </linearGradient>
                </defs>
                <polygon points="9,6 9,18 19,12" fill="url(#playGrad)" />
              </svg>
            </div>

            <h1 className="text-3xl font-bold text-white mb-3">Ready to Start</h1>
            <p className="text-lg text-gray-300 mb-8">{paper.paperName}</p>

            <div className="grid grid-cols-2 gap-4 mb-8 text-left">
              <div className="p-4 bg-black rounded-xl border border-[#1a3a6a]">
                <p className="text-xs font-semibold uppercase tracking-wider text-gray-400 mb-1">Questions</p>
                <p className="text-3xl font-bold text-white">{paper.totalQuestions}</p>
              </div>
              <div className="p-4 bg-black rounded-xl border border-[#1a3a6a]">
                <p className="text-xs font-semibold uppercase tracking-wider text-gray-400 mb-1">Time Limit</p>
                <p className="text-3xl font-bold text-white">{Math.floor(paper.timeLimit / 60)} min</p>
              </div>
            </div>

            {/* Tip */}
            <div className="mb-6 p-3 bg-black border border-[#1a3a6a] rounded-xl">
              <p className="text-xs text-gray-400 text-center">
                <span style={{ filter: 'drop-shadow(0 0 6px #C9A84C)' }}>💡</span>{' '}
                <strong className="text-white">Tip:</strong> If all {paper.totalQuestions} questions don't load properly, please exit and try again.
              </p>
            </div>

            <button
              onClick={handleStartExam}
              className="w-full py-4 bg-black text-white rounded-xl font-bold text-lg border border-emerald-400/60 hover:bg-emerald-950/40 transition-all duration-200 shadow-lg"
            >
              Start Exam
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Active Exam Phase - Continuous Scroll (includes submitted state)
  if (phase === 'active' && paper) {
    const answeredCount = userAnswers.size;
    // Exclude discounted questions from scoring — they count as free marks
    const scorableQuestions = paper.questions.filter(q => q.correctAnswer !== 'DISCOUNTED');
    const discountedCount = paper.questions.length - scorableQuestions.length;
    const correctCount = isSubmitted
      ? scorableQuestions.filter(q => userAnswers.get(q.questionNumber) === q.correctAnswer).length
      : 0;
    const score = isSubmitted ? Math.round(((correctCount + discountedCount) / paper.questions.length) * 100) : 0;
    
    // Get question status for navigation
    const getQuestionStatus = (questionNumber: number) => {
      const answer = userAnswers.get(questionNumber);
      const q = paper.questions.find(q => q.questionNumber === questionNumber);
      if (isSubmitted) {
        if (q?.correctAnswer === 'DISCOUNTED') return 'correct'; // free mark
        return answer === q?.correctAnswer
          ? 'correct'
          : answer
          ? 'incorrect'
          : 'unanswered';
      }
      return answer ? 'answered' : 'unanswered';
    };
    
    return (
      <div className="min-h-screen bg-black">
        {/* Pause Overlay */}
        {isPaused && !isSubmitted && (
          <div
            className="fixed inset-0 bg-black z-[9999] flex items-center justify-center cursor-pointer"
            onClick={() => setIsPaused(false)}
          >
            <div className="flex flex-col items-center gap-6">
              {/* Play icon — hollow navy+purple outline, white triangle */}
              <div className="w-32 h-32 rounded-3xl flex items-center justify-center shadow-2xl"
                style={{ border: '3px solid transparent', background: 'linear-gradient(black, black) padding-box, linear-gradient(135deg, #1a3a6a, #4a2a7a) border-box' }}>
                <svg className="w-16 h-16 ml-2" viewBox="0 0 24 24">
                  <polygon points="6,4 6,20 20,12" fill="white" />
                </svg>
              </div>
              <div className="text-center">
                <h2 className="text-3xl font-bold text-white mb-2">Exam Paused</h2>
                <p className="text-gray-400">Press any key or click anywhere to resume.</p>
              </div>
            </div>
          </div>
        )}

        {/* Time's Up Modal */}
        {showTimeUpModal && (
          <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-[9999] flex items-center justify-center p-4">
            <div className="bg-[#FAF7F0] dark:bg-[#1A1510] rounded-2xl p-8 shadow-2xl max-w-md w-full border-2 border-[#C9A84C]/50" onClick={(e) => e.stopPropagation()}>
              <div className="text-center mb-6">
                <div className="inline-block p-4 bg-red-100 dark:bg-[#2A1F0E] rounded-full mb-4 border-2 border-red-300 dark:border-red-900/50">
                  <svg className="w-12 h-12 text-red-600 dark:text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <h3 className="text-3xl font-bold text-[#2A1F0E] dark:text-[#E2C97A] mb-2">⏰ Time's Up!</h3>
                <p className="text-[#7A6A4A] dark:text-[#C4B08A] mb-4">
                  Your exam time has ended.
                </p>
                <div className="bg-blue-50 dark:bg-[#2A1F0E] rounded-lg p-4 mb-6 border border-blue-200 dark:border-[#C9A84C]/30">
                  <p className="text-sm text-blue-900 dark:text-[#C4B08A] font-medium">
                    You have answered <span className="text-2xl font-bold text-[#2A1F0E] dark:text-[#E2C97A]">{answeredCount}</span> out of <span className="text-2xl font-bold text-[#2A1F0E] dark:text-[#E2C97A]">{paper.totalQuestions}</span> questions
                  </p>
                </div>
              </div>
              <div className="space-y-3">
                <button
                  onClick={handleTimeUpSubmit}
                  className="w-full px-6 py-3 bg-gradient-to-r from-[#C9A84C] to-[#E2C97A] text-[#0A0806] rounded-lg font-semibold hover:from-[#E2C97A] hover:to-[#C9A84C] shadow-lg transition-all"
                >
                  Submit Now
                </button>
                <button
                  onClick={handleExtraTime}
                  className="w-full px-6 py-3 bg-orange-100 dark:bg-[#3D2E15] text-orange-700 dark:text-[#E2C97A] rounded-lg font-semibold hover:bg-orange-200 dark:hover:bg-[#5C4520] transition-colors border-2 border-orange-300 dark:border-[#C9A84C]/40"
                >
                  Get Extra Time (+10 min) - Practice Mode
                </button>
                <p className="text-xs text-center text-[#7A6A4A] dark:text-[#C4B08A]">
                  ⚠️ Extra time will mark this as practice (not counted)
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Submit Confirmation Modal */}
        {showSubmitConfirm && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[9998] flex items-center justify-center p-4">
            <div className="bg-[#0d1117] rounded-2xl p-8 shadow-2xl max-w-md w-full border-2 border-[#2a5aaa]/60" onClick={(e) => e.stopPropagation()}>
              <div className="text-center mb-6">
                <div className="inline-block p-4 rounded-full mb-4 border-2 border-[#2a5aaa]/60" style={{ background: 'transparent' }}>
                  <svg className="w-12 h-12 text-[#4a7aff]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                  </svg>
                </div>
                <h3 className="text-2xl font-bold text-white mb-2">Submit Exam?</h3>
                <p className="text-gray-400 mb-4">
                  Are you sure you want to submit your exam?
                </p>
                <div className="rounded-lg p-4 mb-6 border border-[#2a5aaa]/40" style={{ background: 'transparent' }}>
                  <p className="text-sm text-gray-300 font-medium">
                    You have answered <span className="text-2xl font-bold text-white">{answeredCount}</span> out of <span className="text-2xl font-bold text-white">{paper.totalQuestions}</span> questions
                  </p>
                  {answeredCount < paper.totalQuestions && (
                    <p className="text-xs text-[#7a9aff] mt-2">
                      ⚠️ {paper.totalQuestions - answeredCount} question(s) remain unanswered
                    </p>
                  )}
                </div>
              </div>
              <div className="flex gap-3">
                <button
                  onClick={handleCancelSubmit}
                  className="flex-1 px-6 py-3 rounded-lg font-semibold text-white border-2 border-[#2a5aaa]/60 hover:border-[#4a7aff]/80 transition-colors"
                  style={{ background: 'transparent' }}
                >
                  Cancel
                </button>
                <button
                  onClick={handleConfirmSubmit}
                  className="flex-1 px-6 py-3 rounded-lg font-semibold text-white border-2 border-[#2a5aaa]/60 hover:border-[#4a7aff]/80 transition-colors"
                  style={{ background: 'transparent' }}
                >
                  Submit
                </button>
              </div>
            </div>
          </div>
        )}
        {/* Fixed Header */}
        <div className="fixed top-0 left-0 right-0 bg-black border-b border-[#1a3a6a] shadow-sm z-50">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-2">
            <div className="flex items-center justify-between gap-3">
              {/* Logo */}
              <a href="/" title="Back to Student Archive" className="flex-shrink-0 group relative">
                <div
                  className="absolute inset-0 rounded-md opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none"
                  style={{ boxShadow: '0 0 0 1.5px #C9A84C, 0 0 14px 4px rgba(201,168,76,0.65), 0 0 28px 8px rgba(201,168,76,0.25)' }}
                />
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src="/logo.png" alt="Student Archive" className="h-[77px] w-auto object-contain transition-transform duration-300 group-hover:scale-110" />
              </a>
              {/* Results Summary or Timer */}
              {isSubmitted ? (
                <div className="flex items-center gap-3">
                  {isExtraTime && (
                    <div className="px-3 py-2 rounded-lg border-2 border-[#2a5aaa]/60" style={{ background: 'transparent' }}>
                      <span className="text-xs font-bold text-[#7a9aff]">PRACTICE MODE</span>
                    </div>
                  )}
                  <div className="px-3 py-2 rounded-lg border-2 border-[#2a5aaa]/60" style={{ background: 'transparent' }}>
                    <span className="text-sm font-medium text-gray-400">Score: </span>
                    <span className="text-lg font-bold text-white">{correctCount}/{paper.totalQuestions}</span>
                  </div>
                  <div className="px-3 py-2 rounded-lg border-2 border-[#2a5aaa]/60" style={{ background: 'transparent' }}>
                    <span className="text-sm font-medium text-gray-400">Percentage: </span>
                    <span className="text-lg font-bold text-white">{score}%</span>
                  </div>
                  <div className="px-3 py-2 rounded-lg border-2 border-[#2a5aaa]/60" style={{ background: 'transparent' }}>
                    <span className="text-sm font-medium text-gray-400">Grade: </span>
                    <span className="text-lg font-bold text-white">
                      {score >= 90 ? 'A*' : score >= 80 ? 'A' : score >= 70 ? 'B' : score >= 60 ? 'C' : 'D'}
                    </span>
                  </div>
                </div>
              ) : (
                <div className="flex items-center gap-2">
                  {isExtraTime && (
                    <div className="px-2 py-1 bg-orange-900/40 rounded-lg border border-orange-500/40">
                      <span className="text-xs font-bold text-orange-300">PRACTICE</span>
                    </div>
                  )}
                  {/* Timer — always visible, prominent */}
                  <div className={`flex items-center gap-2 px-4 py-2 rounded-lg font-mono text-xl font-bold border-2 ${
                    timeRemaining < 300
                      ? 'text-red-400 border-red-600/70'
                      : timeRemaining < 600
                      ? 'text-orange-300 border-orange-500/70'
                      : 'text-white border-[#2a5aaa]'
                  }`} style={{ background: 'transparent' }}>
                    <svg className="w-5 h-5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    {formatTime(timeRemaining)}
                  </div>

                  {/* Question Navigation Dropdown */}
                  <div className="relative">
                    <button
                      onClick={() => setIsNavPanelOpen(!isNavPanelOpen)}
                      className="px-3 py-2 rounded-lg font-semibold transition-colors flex items-center gap-1.5 text-sm border-2 border-[#2a5aaa]/60 text-white hover:border-[#4a7aff]/80"
                      style={{ background: 'transparent' }}
                    >
                      <span>Questions</span>
                      <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                      </svg>
                    </button>
                    
                    {isNavPanelOpen && (
                      <div
                        className="absolute top-full mt-2 left-0 bg-black rounded-xl shadow-2xl p-3 border border-[#1a3a6a] z-[100]"
                        style={{ width: '280px', maxWidth: 'calc(100vw - 16px)' }}
                      >
                        <p className="text-xs font-bold text-gray-400 mb-2 text-center tracking-widest uppercase">Jump to Question</p>
                        <div className="grid grid-cols-8 gap-1 max-h-[320px] overflow-y-auto">
                          {paper.questions.map((question) => {
                            const status = getQuestionStatus(question.questionNumber);
                            const isFlagged = flaggedQuestions.has(question.questionNumber);
                            let bg = '#0d1f3a';
                            let color = '#94a3b8';
                            let border = '#1a3a6a';
                            if (isFlagged) { bg = '#3b0a0a'; color = '#fca5a5'; border = '#b91c1c'; }
                            else if (status === 'answered') { bg = '#052e16'; color = '#4ade80'; border = '#16a34a'; }
                            else if (status === 'correct') { bg = '#052e16'; color = '#4ade80'; border = '#16a34a'; }
                            else if (status === 'incorrect') { bg = '#2d0a0a'; color = '#f87171'; border = '#dc2626'; }
                            return (
                              <button
                                key={question.questionNumber}
                                onClick={() => {
                                  document.getElementById(`question-${question.questionNumber}`)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
                                  setIsNavPanelOpen(false);
                                }}
                                style={{ background: bg, color, border: `1px solid ${border}`, borderRadius: '6px', fontSize: '0.7rem', fontWeight: '700', cursor: 'pointer', padding: '5px 2px', lineHeight: 1 }}
                                className="hover:scale-110 transition-transform"
                              >
                                {question.questionNumber}
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Controls */}
              <div className="flex items-center gap-2">
                {/* Zoom Controls */}
                <div className="flex items-center gap-0.5 px-1.5 py-1.5 border-2 border-[#2a5aaa]/60 rounded-lg" style={{ background: 'transparent' }}>
                  <button
                    onClick={() => setZoomLevel(prev => Math.max(50, prev - 10))}
                    className="px-2 py-0.5 hover:text-[#7a9aff] rounded transition-colors text-white font-bold text-sm"
                    title="Zoom Out"
                  >−</button>
                  <span className="px-1.5 text-xs font-medium text-gray-300 min-w-[40px] text-center">{zoomLevel}%</span>
                  <button
                    onClick={() => setZoomLevel(prev => Math.min(200, prev + 10))}
                    className="px-2 py-0.5 hover:text-[#7a9aff] rounded transition-colors text-white font-bold text-sm"
                    title="Zoom In"
                  >+</button>
                </div>

                {!isSubmitted && (
                  <button
                    onClick={() => setIsPaused(!isPaused)}
                    className="px-2.5 py-1.5 rounded-lg transition-colors border-2 border-[#2a5aaa]/60 hover:border-[#4a7aff]/80"
                    style={{ background: 'transparent' }}
                    title={isPaused ? 'Resume' : 'Pause'}
                  >
                    <svg className="w-4 h-4" viewBox="0 0 24 24">
                      {isPaused
                        ? <polygon points="6,4 6,20 20,12" fill="white" />
                        : <><rect x="5" y="4" width="4" height="16" rx="1" fill="white" /><rect x="15" y="4" width="4" height="16" rx="1" fill="white" /></>
                      }
                    </svg>
                  </button>
                )}
                {isSubmitted && (
                  <button
                    onClick={() => window.location.reload()}
                    className="px-3 py-2 text-white rounded-lg font-semibold transition-colors text-sm border-2 border-[#2a5aaa]/60 hover:border-[#4a7aff]/80"
                    style={{ background: 'transparent' }}
                    title="Retry Exam"
                  >
                    Retry
                  </button>
                )}
                <a
                  href={pdfUrl(paperId)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-3 py-2 text-white rounded-lg transition-colors text-sm font-semibold border-2 border-[#2a5aaa]/60 hover:border-[#4a7aff]/80"
                  style={{ background: 'transparent' }}
                  title="Open Question Paper PDF"
                >QP</a>
                <a
                  href={pdfUrl(paperId.replace('qp', 'ms'))}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-3 py-2 text-white rounded-lg transition-colors text-sm font-semibold border-2 border-[#2a5aaa]/60 hover:border-[#4a7aff]/80"
                  style={{ background: 'transparent' }}
                  title="Open Marking Scheme PDF"
                >MS</a>
                {!isSubmitted && (
                  <button
                    onClick={handleSubmitClick}
                     className="px-3 py-2 rounded-lg font-semibold text-sm transition-all duration-200 border-2 border-[#2a5aaa]/60 hover:border-[#4a7aff]/80 text-white"
                    style={{ background: 'transparent' }}
                    title="Submit Exam"
                  >
                    Submit
                  </button>
                )}
              </div>

              {/* Answered Counter */}
              {!isSubmitted && (
                <div className="px-3 py-2 rounded-lg border-2 border-[#2a5aaa]/60" style={{ background: 'transparent' }}>
                  <span className="text-xs font-medium text-gray-400">Answered: </span>
                  <span className="text-sm font-bold text-white">{answeredCount}/{paper.totalQuestions}</span>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Continuous Scroll Questions with Zoom Transform Wrapper */}
        <div className="pt-20 pb-32 w-full flex flex-col items-center overflow-y-auto">
          <div
            style={{
              transform: `scale(${zoomLevel / 100})`,
              transformOrigin: 'top center',
              width: `${(100 / (zoomLevel / 100))}%`,
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center'
            }}
            className="transition-transform duration-150 ease-out"
          >
            <div className="w-full max-w-4xl px-4 sm:px-6 lg:px-8 space-y-6">
              {isSubmitted && (
                <div className="mb-6 rounded-xl p-4 text-center border-2 border-[#2a5aaa]/60" style={{ background: 'transparent' }}>
                  <p className="text-white font-medium">
                    Exam submitted! Scroll through all questions to review your answers.
                  </p>
                </div>
              )}

              {paper.questions.map((question, index) => (
                <MCQQuestionCard
                  key={`q-${index}-${question.questionNumber}`}
                  question={question}
                  selectedAnswer={userAnswers.get(question.questionNumber)}
                  onAnswerSelect={(answer) => handleAnswerSelect(question.questionNumber, answer)}
                  isSubmitted={isSubmitted}
                  correctAnswer={isSubmitted ? question.correctAnswer : undefined}
                  zoomLevel={100}
                  isFlagged={flaggedQuestions.has(question.questionNumber)}
                  onToggleFlag={() => toggleFlag(question.questionNumber)}
                />
              ))}

              {/* Submit Button - Natural flow at end, not sticky */}
              {!isSubmitted && (
                <div className="mt-12 pt-8 border-t-2 border-dashed border-[#2a5aaa]/30">
                  <div className="text-center mb-6">
                    <h3 className="text-xl font-bold text-white mb-2">
                      Finished with your exam?
                    </h3>
                    <p className="text-sm text-gray-400">
                      Make sure you have answered all questions before submitting.
                    </p>
                  </div>
                  <button
                    onClick={handleSubmitClick}
                    className="w-full py-4 rounded-xl font-bold text-lg text-white border-2 border-[#2a5aaa]/60 hover:border-[#4a7aff]/80 transition-all duration-200"
                    style={{ background: 'transparent' }}
                  >
                    Submit Exam
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  }

  return null;
}

// Made with Bob
