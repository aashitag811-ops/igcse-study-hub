'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { MCQPaper, ExamState, ExamResult } from '@/lib/types/mcq.types';
import { pdfUrl } from '@/lib/assetUrl';
import { MCQQuestion } from './MCQQuestion';
import { MCQResults } from './MCQResults';
import { MCQTimer } from './MCQTimer';
import { MCQNavigation } from './MCQNavigation';
import { MCQQuestionSidebar } from './MCQQuestionSidebar';

interface MCQInterfaceProps {
  paper: MCQPaper;
  onExit?: () => void;
}

export function MCQInterface({ paper, onExit }: MCQInterfaceProps) {
  const [examState, setExamState] = useState<ExamState>({
    currentQuestionIndex: 0,
    userAnswers: new Map(),
    timeRemaining: paper.timeLimit * 60, // Convert minutes to seconds
    isSubmitted: false,
    result: null,
  });
  const [isPaused, setIsPaused] = useState(false);
  const [outOfSyllabusQuestions, setOutOfSyllabusQuestions] = useState<Set<number>>(new Set());
  const [showCalculator, setShowCalculator] = useState(false);
  const [expandedQuestions, setExpandedQuestions] = useState<Set<number>>(new Set());
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  // Handle keyboard events for pause overlay
  useEffect(() => {
    const handleKeyPress = (e: KeyboardEvent) => {
      if (isPaused) {
        setIsPaused(false);
      }
    };

    if (isPaused) {
      window.addEventListener('keydown', handleKeyPress);
      return () => window.removeEventListener('keydown', handleKeyPress);
    }
  }, [isPaused]);

  // Timer countdown
  useEffect(() => {
    if (examState.isSubmitted || examState.timeRemaining <= 0 || isPaused) return;

    const timer = setInterval(() => {
      setExamState(prev => {
        const newTime = prev.timeRemaining - 1;
        if (newTime <= 0) {
          // Auto-submit when time runs out
          handleSubmit();
          return prev;
        }
        return { ...prev, timeRemaining: newTime };
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [examState.isSubmitted, examState.timeRemaining]);

  const handleAnswerSelect = useCallback((answer: 'A' | 'B' | 'C' | 'D') => {
    setExamState(prev => {
      const newAnswers = new Map(prev.userAnswers);
      const questionNumber = paper.questions[prev.currentQuestionIndex].questionNumber;
      newAnswers.set(questionNumber, answer);
      return { ...prev, userAnswers: newAnswers };
    });
  }, [paper.questions]);

  const handleNext = useCallback(() => {
    setExamState(prev => ({
      ...prev,
      currentQuestionIndex: Math.min(prev.currentQuestionIndex + 1, paper.questions.length - 1),
    }));
  }, [paper.questions.length]);

  const handlePrevious = useCallback(() => {
    setExamState(prev => ({
      ...prev,
      currentQuestionIndex: Math.max(prev.currentQuestionIndex - 1, 0),
    }));
  }, []);

  const handleSubmit = useCallback(() => {
    // Calculate results - mark out of syllabus questions as wrong if blank
    const answers = paper.questions.map(q => {
      const userAnswer = examState.userAnswers.get(q.questionNumber) || null;
      const isOutOfSyllabus = outOfSyllabusQuestions.has(q.questionNumber);
      const isCorrect = isOutOfSyllabus && userAnswer === null ? false : userAnswer === q.correctAnswer;
      return {
        questionNumber: q.questionNumber,
        userAnswer,
        correctAnswer: q.correctAnswer,
        isCorrect,
      };
    });

    const correctAnswers = answers.filter(a => a.isCorrect).length;
    const incorrectAnswers = answers.filter(a => !a.isCorrect && a.userAnswer !== null).length;

    const result: ExamResult = {
      totalQuestions: paper.questions.length,
      correctAnswers,
      incorrectAnswers,
      score: Math.round((correctAnswers / paper.questions.length) * 100),
      answers,
    };

    setExamState(prev => ({
      ...prev,
      isSubmitted: true,
      result,
    }));
  }, [paper.questions, examState.userAnswers, outOfSyllabusQuestions]);

  const toggleOutOfSyllabus = useCallback(() => {
    setOutOfSyllabusQuestions(prev => {
      const newSet = new Set(prev);
      const questionNumber = paper.questions[examState.currentQuestionIndex].questionNumber;
      if (newSet.has(questionNumber)) {
        newSet.delete(questionNumber);
      } else {
        newSet.add(questionNumber);
      }
      return newSet;
    });
  }, [paper.questions, examState.currentQuestionIndex]);

  const currentQuestion = paper.questions[examState.currentQuestionIndex];
  const currentAnswer = examState.userAnswers.get(currentQuestion.questionNumber);
  const isLastQuestion = examState.currentQuestionIndex === paper.questions.length - 1;
  const answeredCount = examState.userAnswers.size;
  const isCurrentOutOfSyllabus = outOfSyllabusQuestions.has(currentQuestion.questionNumber);

  // Prepare data for sidebar
  const answeredQuestions = new Set(Array.from(examState.userAnswers.keys()));
  const correctAnswersMap = examState.result
    ? new Map(examState.result.answers.map(a => [a.questionNumber, a.isCorrect]))
    : undefined;

  const handleQuestionSelect = useCallback((index: number) => {
    setExamState(prev => ({
      ...prev,
      currentQuestionIndex: index,
    }));
    setIsSidebarOpen(false); // Close sidebar after selection
  }, []);

  return (
    <div className="min-h-screen bg-white dark:bg-gradient-to-br dark:from-slate-900 dark:to-slate-800 relative">
      {/* Question Sidebar */}
      <MCQQuestionSidebar
        totalQuestions={paper.totalQuestions}
        currentQuestionIndex={examState.currentQuestionIndex}
        answeredQuestions={answeredQuestions}
        onQuestionSelect={handleQuestionSelect}
        isSubmitted={examState.isSubmitted}
        correctAnswers={correctAnswersMap}
      />
      {/* Pause Overlay - Covers everything, press any key to resume */}
      {isPaused && (
        <div className="fixed inset-0 bg-white dark:bg-slate-900 z-[9999] flex items-center justify-center">
          <div className="flex flex-col items-center gap-6">
            {/* Play button icon in rounded square */}
            <div className="w-32 h-32 rounded-3xl border-4 border-slate-900 dark:border-white bg-white dark:bg-slate-900 flex items-center justify-center">
              <svg className="w-16 h-16 text-slate-900 dark:text-white ml-2" fill="currentColor" viewBox="0 0 24 24">
                <path d="M8 5v14l11-7z"/>
              </svg>
            </div>
            <div className="text-center">
              <h2 className="text-3xl font-bold text-slate-900 dark:text-white mb-2">Exam Paused</h2>
              <p className="text-slate-600 dark:text-slate-400">Press any key to resume your exam.</p>
            </div>
          </div>
        </div>
      )}

      {/* Calculator Modal */}
      {showCalculator && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-40 flex items-center justify-center" onClick={() => setShowCalculator(false)}>
          <div className="bg-white dark:bg-slate-800 rounded-2xl p-6 shadow-2xl" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold text-slate-900 dark:text-white">Calculator</h3>
              <button onClick={() => setShowCalculator(false)} className="text-slate-500 hover:text-slate-700 dark:hover:text-slate-300">
                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <iframe
              src="https://www.desmos.com/scientific"
              className="w-[400px] h-[600px] border-0 rounded-lg"
              title="Scientific Calculator"
            />
          </div>
        </div>
      )}
      {/* Header */}
      <div className="bg-white dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div>
                <h1 className="text-xl font-bold text-slate-900 dark:text-white">
                  {paper.paperName}
                </h1>
                {!examState.isSubmitted && (
                  <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">
                    Question {currentQuestion.questionNumber} of {paper.totalQuestions}
                  </p>
                )}
              </div>
              
              {/* QP and MS buttons - Link to local PDFs */}
              <div className="flex items-center gap-2 ml-4">
                <a
                  href={pdfUrl(paper.paperId)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-3 py-1.5 text-sm font-medium bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 rounded-lg hover:bg-blue-200 dark:hover:bg-blue-900/50 transition-colors border border-blue-300 dark:border-blue-700"
                  title="Open Question Paper PDF"
                >
                  QP
                </a>
                <a
                  href={pdfUrl(paper.paperId.replace('qp', 'ms'))}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-3 py-1.5 text-sm font-medium bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300 rounded-lg hover:bg-green-200 dark:hover:bg-green-900/50 transition-colors border border-green-300 dark:border-green-700"
                  title="Open Marking Scheme PDF"
                >
                  MS
                </a>
              </div>

              {/* Review Mode: Score Badge and Filter */}
              {examState.isSubmitted && examState.result && (
                <div className="flex items-center gap-2 ml-4">
                  <div className="px-3 py-1.5 bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300 rounded-lg border border-red-300 dark:border-red-700 flex items-center gap-2">
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                    <span className="text-sm font-semibold">{examState.result.incorrectAnswers}/{paper.totalQuestions}</span>
                  </div>
                  <button className="px-3 py-1.5 bg-gray-100 dark:bg-slate-700 text-gray-700 dark:text-gray-300 rounded-lg border border-gray-300 dark:border-slate-600 hover:bg-gray-200 dark:hover:bg-slate-600 transition-colors flex items-center gap-2">
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
                    </svg>
                    <span className="text-sm font-semibold">{examState.result.incorrectAnswers} wrong</span>
                  </button>
                </div>
              )}
            </div>
            
            <div className="flex items-center gap-4">
              {/* Review Mode: RESET and SHARE buttons */}
              {examState.isSubmitted && examState.result ? (
                <>
                  <button
                    onClick={() => {
                      setExamState({
                        currentQuestionIndex: 0,
                        userAnswers: new Map(),
                        timeRemaining: paper.timeLimit * 60,
                        isSubmitted: false,
                        result: null,
                      });
                      setOutOfSyllabusQuestions(new Set());
                    }}
                    className="px-4 py-2 bg-white dark:bg-slate-800 text-slate-900 dark:text-white rounded-lg border border-slate-300 dark:border-slate-600 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors font-semibold text-sm"
                  >
                    RESET
                  </button>
                  <button className="px-4 py-2 bg-white dark:bg-slate-800 text-slate-900 dark:text-white rounded-lg border border-slate-300 dark:border-slate-600 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors font-semibold text-sm">
                    SHARE
                  </button>
                </>
              ) : (
                <>
                  <div className="text-sm text-slate-600 dark:text-slate-400">
                    <span className="font-medium">Answered:</span>{' '}
                    <span className="text-slate-900 dark:text-white font-bold">
                      {answeredCount}/{paper.totalQuestions}
                    </span>
                  </div>
                  
                  {/* Calculator Button */}
                  <button
                    onClick={() => setShowCalculator(true)}
                    className="p-3 rounded-lg bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 dark:hover:bg-slate-600 transition-colors"
                    title="Open Calculator"
                  >
                    <svg className="w-5 h-5 text-slate-700 dark:text-slate-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                    </svg>
                  </button>

                  {/* Pause Button */}
                  <button
                    onClick={() => setIsPaused(true)}
                    className="p-3 rounded-lg bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 dark:hover:bg-slate-600 transition-colors"
                    title="Pause Exam"
                  >
                    <svg className="w-5 h-5 text-slate-700 dark:text-slate-300" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M6 4h4v16H6V4zm8 0h4v16h-4V4z"/>
                    </svg>
                  </button>
                  
                  <MCQTimer timeRemaining={examState.timeRemaining} />
                </>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Main Content - SAME for both exam and review mode */}
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Results Summary Banner - Only show after submission */}
        {examState.isSubmitted && examState.result && (
          <div className="mb-6 bg-white dark:bg-slate-800 rounded-xl p-6 shadow-sm">
            <h2 className="text-2xl font-bold text-center text-gray-800 dark:text-gray-200 mb-4">Exam Complete</h2>
            <div className="grid grid-cols-3 gap-4">
              <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-4 text-center">
                <p className="text-blue-600 dark:text-blue-400 text-xs font-medium mb-1">Score</p>
                <p className="text-3xl font-bold text-blue-900 dark:text-blue-100">
                  {examState.result.correctAnswers}/{examState.result.totalQuestions}
                </p>
              </div>
              <div className="bg-green-50 dark:bg-green-900/20 rounded-lg p-4 text-center">
                <p className="text-green-600 dark:text-green-400 text-xs font-medium mb-1">Percentage</p>
                <p className="text-3xl font-bold text-green-900 dark:text-green-100">
                  {examState.result.score}%
                </p>
              </div>
              <div className="bg-purple-50 dark:bg-purple-900/20 rounded-lg p-4 text-center">
                <p className="text-purple-600 dark:text-purple-400 text-xs font-medium mb-1">Grade</p>
                <p className="text-3xl font-bold text-purple-900 dark:text-purple-100">
                  {examState.result.score >= 90 ? 'A*' : examState.result.score >= 80 ? 'A' : examState.result.score >= 70 ? 'B' : examState.result.score >= 60 ? 'C' : examState.result.score >= 50 ? 'D' : 'E'}
                </p>
              </div>
            </div>
            <p className="text-center text-sm text-gray-600 dark:text-gray-400 mt-4">
              Use Previous/Next buttons to review all questions
            </p>
          </div>
        )}

        {/* Mark Out of Syllabus Button - Only show during exam */}
        {!examState.isSubmitted && (
          <div className="mb-4 flex justify-end">
            <button
              onClick={toggleOutOfSyllabus}
              className={`
                px-4 py-2 rounded-lg font-medium text-sm transition-all
                ${isCurrentOutOfSyllabus
                  ? 'bg-orange-500 text-white hover:bg-orange-600'
                  : 'bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-300 dark:hover:bg-slate-600'
                }
              `}
            >
              {isCurrentOutOfSyllabus ? '✓ Marked Out of Syllabus' : 'Mark Out of Syllabus'}
            </button>
          </div>
        )}

        {/* Current Question - SAME component, just pass isSubmitted flag */}
        <MCQQuestion
          question={currentQuestion}
          selectedAnswer={currentAnswer}
          onAnswerSelect={examState.isSubmitted ? () => {} : handleAnswerSelect}
          isSubmitted={examState.isSubmitted}
          correctAnswer={examState.isSubmitted ? (currentQuestion.correctAnswer as 'A' | 'B' | 'C' | 'D' | 'DISCOUNTED') : undefined}
        />

        {/* Show result text after submission */}
        {examState.isSubmitted && examState.result && (
          <div className="mt-4 p-4 bg-slate-100 dark:bg-slate-800 rounded-lg">
            <p className="text-sm text-slate-700 dark:text-slate-300">
              <span className="font-semibold">Your answer:</span> {currentAnswer || 'Not answered'} |
              <span className="font-semibold"> Correct answer:</span> {currentQuestion.correctAnswer}
            </p>
          </div>
        )}

        {/* Navigation - SAME for both modes */}
        <MCQNavigation
          currentIndex={examState.currentQuestionIndex}
          totalQuestions={paper.totalQuestions}
          isLastQuestion={isLastQuestion}
          hasAnswer={currentAnswer !== undefined}
          onPrevious={handlePrevious}
          onNext={handleNext}
          onSubmit={examState.isSubmitted ? undefined : handleSubmit}
        />
      </div>
    </div>
  );
}

// Made with Bob
