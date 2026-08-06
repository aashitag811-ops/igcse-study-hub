'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { MCQPaper } from '@/lib/types/mcq.types';
import { MCQQuestionCard } from '@/components/mcq/MCQQuestionCard';
import BackButton from '@/components/BackButton';
import { pdfUrl } from '@/lib/assetUrl';

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

  const handleSubmitClick = () => {
    setShowSubmitConfirm(true);
  };

  const handleConfirmSubmit = () => {
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
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-50 flex items-center justify-center">
        <div className="max-w-md w-full mx-auto p-8">
          <div className="bg-white rounded-2xl shadow-2xl p-8">
            <div className="text-center mb-6">
              <div className="inline-block p-4 bg-blue-100 rounded-full mb-4">
                <svg className="w-12 h-12 text-blue-600 animate-spin" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
              </div>
              <h2 className="text-2xl font-bold text-slate-900 mb-2">Extracting Questions</h2>
              <p className="text-slate-600">Processing your exam paper...</p>
            </div>
            
            {/* Progress Bar */}
            <div className="mb-4">
              <div className="flex justify-between text-sm font-medium text-slate-700 mb-2">
                <span>Progress</span>
                <span>{progress}%</span>
              </div>
              <div className="w-full bg-slate-200 rounded-full h-3 overflow-hidden">
                <div 
                  className="h-full bg-gradient-to-r from-blue-500 to-indigo-600 transition-all duration-300 ease-out"
                  style={{ width: `${progress}%` }}
                ></div>
              </div>
            </div>
            
            <p className="text-xs text-slate-500 text-center">
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
      <div className="min-h-screen bg-gradient-to-br from-green-50 to-emerald-50 flex items-center justify-center">
        <div className="max-w-2xl w-full mx-auto p-8">
          <div className="bg-white rounded-2xl shadow-2xl p-12 text-center">
            <div className="inline-block p-6 bg-green-100 rounded-full mb-6">
              <svg className="w-16 h-16 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            
            <h1 className="text-3xl font-bold text-slate-900 mb-4">Ready to Start</h1>
            <p className="text-xl text-slate-700 mb-8">{paper.paperName}</p>
            
            <div className="grid grid-cols-2 gap-4 mb-8 text-left">
              <div className="p-4 bg-slate-50 rounded-lg">
                <p className="text-sm text-slate-600 mb-1">Questions</p>
                <p className="text-2xl font-bold text-slate-900">{paper.totalQuestions}</p>
              </div>
              <div className="p-4 bg-slate-50 rounded-lg">
                <p className="text-sm text-slate-600 mb-1">Time Limit</p>
                <p className="text-2xl font-bold text-slate-900">{Math.floor(paper.timeLimit / 60)} min</p>
              </div>
            </div>
            
            {/* Helpful message for incomplete papers */}
            <div className="mb-6 p-3 bg-amber-50 border border-amber-200 rounded-lg">
              <p className="text-xs text-amber-800 text-center">
                💡 <strong>Tip:</strong> If all {paper.totalQuestions} questions don't load properly, please exit and try again.
              </p>
            </div>
            
            <button
              onClick={handleStartExam}
              className="w-full py-4 bg-gradient-to-r from-green-600 to-emerald-600 text-white rounded-xl font-bold text-lg hover:from-green-700 hover:to-emerald-700 shadow-lg hover:shadow-xl transform hover:scale-[1.02] transition-all duration-200"
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
      <div className="min-h-screen bg-[#FAF7F0] dark:bg-[#0A0806]">
        <BackButton />
        {/* Pause Overlay - Covers everything, press any key or click to resume */}
        {isPaused && !isSubmitted && (
          <div
            className="fixed inset-0 bg-[#FAF7F0] dark:bg-[#0A0806] z-[9999] flex items-center justify-center cursor-pointer"
            onClick={() => setIsPaused(false)}
          >
            <div className="flex flex-col items-center gap-6">
              {/* Play button icon in rounded square */}
              <div className="w-32 h-32 rounded-3xl border-4 border-[#C9A84C] bg-[#FAF7F0] dark:bg-[#1A1510] flex items-center justify-center shadow-2xl">
                <svg className="w-16 h-16 text-[#C9A84C] ml-2" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M8 5v14l11-7z"/>
                </svg>
              </div>
              <div className="text-center">
                <h2 className="text-3xl font-bold text-[#2A1F0E] dark:text-[#E2C97A] mb-2">Exam Paused</h2>
                <p className="text-[#7A6A4A] dark:text-[#C4B08A]">Press any key or click anywhere to resume.</p>
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
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[9998] flex items-center justify-center p-4">
            <div className="bg-[#FAF7F0] dark:bg-[#1A1510] rounded-2xl p-8 shadow-2xl max-w-md w-full border-2 border-[#C9A84C]/50" onClick={(e) => e.stopPropagation()}>
              <div className="text-center mb-6">
                <div className="inline-block p-4 bg-orange-100 dark:bg-[#3D2E15] rounded-full mb-4 border-2 border-orange-300 dark:border-[#C9A84C]/40">
                  <svg className="w-12 h-12 text-orange-600 dark:text-[#E2C97A]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                  </svg>
                </div>
                <h3 className="text-2xl font-bold text-[#2A1F0E] dark:text-[#E2C97A] mb-2">Submit Exam?</h3>
                <p className="text-[#7A6A4A] dark:text-[#C4B08A] mb-4">
                  Are you sure you want to submit your exam?
                </p>
                <div className="bg-blue-50 dark:bg-[#2A1F0E] rounded-lg p-4 mb-6 border border-blue-200 dark:border-[#C9A84C]/30">
                  <p className="text-sm text-blue-900 dark:text-[#C4B08A] font-medium">
                    You have answered <span className="text-2xl font-bold text-[#2A1F0E] dark:text-[#E2C97A]">{answeredCount}</span> out of <span className="text-2xl font-bold text-[#2A1F0E] dark:text-[#E2C97A]">{paper.totalQuestions}</span> questions
                  </p>
                  {answeredCount < paper.totalQuestions && (
                    <p className="text-xs text-blue-700 dark:text-[#E2C97A] mt-2">
                      ⚠️ {paper.totalQuestions - answeredCount} question(s) remain unanswered
                    </p>
                  )}
                </div>
              </div>
              <div className="flex gap-3">
                <button
                  onClick={handleCancelSubmit}
                  className="flex-1 px-6 py-3 bg-[#C4B08A]/30 dark:bg-[#2A1F0E] text-[#2A1F0E] dark:text-[#C4B08A] rounded-lg font-semibold hover:bg-[#C4B08A]/50 dark:hover:bg-[#3D2E15] border border-[#C9A84C]/30 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleConfirmSubmit}
                  className="flex-1 px-6 py-3 bg-gradient-to-r from-[#C9A84C] to-[#E2C97A] text-[#0A0806] rounded-lg font-semibold hover:from-[#E2C97A] hover:to-[#C9A84C] shadow-lg transition-all"
                >
                  Submit
                </button>
              </div>
            </div>
          </div>
        )}
        {/* Fixed Header */}
        <div className="fixed top-0 left-0 right-0 bg-[#FAF7F0] dark:bg-[#1A1510] border-b border-[#E5DCC8] dark:border-[#C9A84C]/25 shadow-sm z-50">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3">
            {/* Student Archive Link */}
            <a
              href="/"
              className="absolute top-3 left-4 px-3 py-1.5 bg-[#C9A84C] hover:bg-[#E2C97A] text-[#0A0806] rounded-lg font-bold text-sm transition-colors shadow-sm flex items-center gap-1"
              title="Back to Student Archive"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
              </svg>
              SA
            </a>
            <div className="flex items-center justify-between">
              {/* Results Summary or Timer */}
              {isSubmitted ? (
                <div className="flex items-center gap-4">
                  {isExtraTime && (
                    <div className="px-4 py-2 bg-orange-100 dark:bg-[#3D2E15] rounded-lg border-2 border-orange-300 dark:border-[#C9A84C]/40">
                      <span className="text-sm font-bold text-orange-700 dark:text-[#E2C97A]">🏃 PRACTICE MODE</span>
                    </div>
                  )}
                  <div className="px-4 py-2 bg-blue-100 dark:bg-[#2A1F0E] rounded-lg border border-blue-200 dark:border-[#C9A84C]/30">
                    <span className="text-sm font-medium text-blue-600 dark:text-[#C4B08A]">Score: </span>
                    <span className="text-lg font-bold text-blue-900 dark:text-[#E2C97A]">{correctCount}/{paper.totalQuestions}</span>
                  </div>
                  <div className="px-4 py-2 bg-green-100 dark:bg-[#2A1F0E] rounded-lg border border-green-200 dark:border-[#C9A84C]/30">
                    <span className="text-sm font-medium text-green-600 dark:text-[#C4B08A]">Percentage: </span>
                    <span className="text-lg font-bold text-green-900 dark:text-[#E2C97A]">{score}%</span>
                  </div>
                  <div className="px-4 py-2 bg-purple-100 dark:bg-[#2A1F0E] rounded-lg border border-purple-200 dark:border-[#C9A84C]/30">
                    <span className="text-sm font-medium text-purple-600 dark:text-[#C4B08A]">Grade: </span>
                    <span className="text-lg font-bold text-purple-900 dark:text-[#E2C97A]">
                      {score >= 90 ? 'A*' : score >= 80 ? 'A' : score >= 70 ? 'B' : score >= 60 ? 'C' : 'D'}
                    </span>
                  </div>
                </div>
              ) : (
                <div className="flex items-center gap-3">
                  {isExtraTime && (
                    <div className="px-3 py-2 bg-orange-100 dark:bg-[#3D2E15] rounded-lg border border-orange-300 dark:border-[#C9A84C]/40">
                      <span className="text-xs font-bold text-orange-700 dark:text-[#E2C97A]">PRACTICE</span>
                    </div>
                  )}
                  <div className={`flex items-center gap-2 px-4 py-2 rounded-lg font-mono text-lg font-bold border ${
                    timeRemaining < 300
                      ? 'bg-red-100 dark:bg-[#2A1F0E] text-red-700 dark:text-red-400 border-red-200 dark:border-red-900/50'
                      : timeRemaining < 600
                      ? 'bg-orange-100 dark:bg-[#2A1F0E] text-orange-700 dark:text-[#E2C97A] border-orange-200 dark:border-[#C9A84C]/40'
                      : 'bg-green-100 dark:bg-[#2A1F0E] text-green-700 dark:text-green-400 border-green-200 dark:border-green-900/50'
                  }`}>
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    {formatTime(timeRemaining)}
                  </div>
                  
                  {/* Question Navigation Dropdown */}
                  <div className="relative">
                    <button
                      onClick={() => setIsNavPanelOpen(!isNavPanelOpen)}
                      className="px-4 py-2 bg-[#C9A84C] hover:bg-[#E2C97A] text-[#0A0806] rounded-lg font-semibold transition-colors flex items-center gap-2"
                    >
                      <span>Questions</span>
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                      </svg>
                    </button>
                    
                    {isNavPanelOpen && (
                      <div className="absolute top-full mt-2 right-0 bg-white dark:bg-[#1A1510] rounded-xl shadow-2xl p-4 border-2 border-[#C9A84C]/30 z-50" style={{ width: '320px' }}>
                        <h3 className="text-sm font-bold text-[#2A1F0E] dark:text-[#E2C97A] mb-3 text-center">Jump to Question</h3>
                        <div className="grid grid-cols-5 gap-2 max-h-[400px] overflow-y-auto">
                          {paper.questions.map((question) => {
                            const status = getQuestionStatus(question.questionNumber);
                            let bgColor = '#f1f5f9';
                            let textColor = '#64748b';
                            let borderColor = '#e2e8f0';
                            
                            if (status === 'answered') {
                              bgColor = '#dcfce7';
                              textColor = '#16a34a';
                              borderColor = '#86efac';
                            } else if (status === 'correct') {
                              bgColor = '#dcfce7';
                              textColor = '#16a34a';
                              borderColor = '#86efac';
                            } else if (status === 'incorrect') {
                              bgColor = '#fee2e2';
                              textColor = '#dc2626';
                              borderColor = '#fca5a5';
                            }

                            return (
                              <button
                                key={question.questionNumber}
                                onClick={() => {
                                  const element = document.getElementById(`question-${question.questionNumber}`);
                                  element?.scrollIntoView({ behavior: 'smooth', block: 'start' });
                                  setIsNavPanelOpen(false);
                                }}
                                style={{
                                  padding: '10px',
                                  background: bgColor,
                                  color: textColor,
                                  border: `2px solid ${borderColor}`,
                                  borderRadius: '8px',
                                  fontSize: '0.85rem',
                                  fontWeight: '600',
                                  cursor: 'pointer',
                                  transition: 'all 0.2s'
                                }}
                                className="hover:scale-105 hover:shadow-md"
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
              <div className="flex items-center gap-3">
                {/* Zoom Controls */}
                <div className="flex items-center gap-1 px-2 py-1 bg-[#C4B08A]/20 dark:bg-[#2A1F0E] border border-[#C9A84C]/30 rounded-lg">
                  <button
                    onClick={() => setZoomLevel(prev => Math.max(50, prev - 10))}
                    className="px-2 py-1 hover:bg-[#C4B08A]/30 dark:hover:bg-[#3D2E15] rounded transition-colors text-[#2A1F0E] dark:text-[#E2C97A] font-bold"
                    title="Zoom Out"
                  >
                    −
                  </button>
                  <span className="px-2 text-xs font-medium text-[#7A6A4A] dark:text-[#C4B08A] min-w-[45px] text-center">
                    {zoomLevel}%
                  </span>
                  <button
                    onClick={() => setZoomLevel(prev => Math.min(200, prev + 10))}
                    className="px-2 py-1 hover:bg-[#C4B08A]/30 dark:hover:bg-[#3D2E15] rounded transition-colors text-[#2A1F0E] dark:text-[#E2C97A] font-bold"
                    title="Zoom In"
                  >
                    +
                  </button>
                </div>
                
                {!isSubmitted && (
                  <button
                    onClick={() => setIsPaused(!isPaused)}
                    className="px-3 py-2 bg-[#C4B08A]/20 dark:bg-[#2A1F0E] hover:bg-[#C4B08A]/30 dark:hover:bg-[#3D2E15] border border-[#C9A84C]/30 rounded-lg transition-colors"
                    title={isPaused ? 'Resume' : 'Pause'}
                  >
                    {isPaused ? '▶️' : '⏸️'}
                  </button>
                )}
                {isSubmitted && (
                  <button
                    onClick={() => window.location.reload()}
                    className="px-4 py-2 bg-[#C9A84C] text-[#0A0806] rounded-lg font-semibold hover:bg-[#E2C97A] transition-colors shadow-lg"
                    title="Retry Exam"
                  >
                    🔄 Retry
                  </button>
                )}
                <a
                  href={pdfUrl(paperId)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-3 py-2 bg-blue-100 dark:bg-[#2A1F0E] hover:bg-blue-200 dark:hover:bg-[#3D2E15] text-blue-700 dark:text-[#E2C97A] border border-blue-200 dark:border-[#C9A84C]/30 rounded-lg transition-colors text-sm font-medium"
                  title="Open Question Paper PDF"
                >
                  QP
                </a>
                <a
                  href={pdfUrl(paperId.replace('qp', 'ms'))}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-3 py-2 bg-green-100 dark:bg-[#2A1F0E] hover:bg-green-200 dark:hover:bg-[#3D2E15] text-green-700 dark:text-[#E2C97A] border border-green-200 dark:border-[#C9A84C]/30 rounded-lg transition-colors text-sm font-medium"
                  title="Open Marking Scheme PDF"
                >
                  MS
                </a>
              </div>

              {/* Answered Counter (only during exam) */}
              {!isSubmitted && (
                <div className="px-4 py-2 bg-[#C4B08A]/20 dark:bg-[#2A1F0E] rounded-lg border border-[#C9A84C]/30">
                  <span className="text-sm font-medium text-[#7A6A4A] dark:text-[#C4B08A]">Answered: </span>
                  <span className="text-lg font-bold text-[#2A1F0E] dark:text-[#E2C97A]">{answeredCount}/{paper.totalQuestions}</span>
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
                <div className="mb-6 bg-blue-50 dark:bg-[#2A1F0E] border-2 border-blue-200 dark:border-[#C9A84C]/40 rounded-xl p-4 text-center">
                  <p className="text-blue-900 dark:text-[#E2C97A] font-medium">
                    ✅ Exam submitted! Scroll through all questions to review your answers.
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
                />
              ))}

              {/* Submit Button - Natural flow at end, not sticky */}
              {!isSubmitted && (
                <div className="mt-12 pt-8 border-t-2 border-dashed border-[#C9A84C]/30">
                  <div className="text-center mb-6">
                    <h3 className="text-xl font-bold text-[#2A1F0E] dark:text-[#E2C97A] mb-2">
                      Finished with your exam?
                    </h3>
                    <p className="text-sm text-[#7A6A4A] dark:text-[#C4B08A]">
                      Make sure you have answered all questions before submitting.
                    </p>
                  </div>
                  <button
                    onClick={handleSubmitClick}
                    className="w-full py-4 bg-gradient-to-r from-[#C9A84C] to-[#E2C97A] text-[#0A0806] rounded-xl font-bold text-lg hover:from-[#E2C97A] hover:to-[#C9A84C] shadow-lg hover:shadow-xl transition-all duration-200"
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
