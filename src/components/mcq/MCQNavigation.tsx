'use client';

import React from 'react';

interface MCQNavigationProps {
  currentIndex: number;
  totalQuestions: number;
  isLastQuestion: boolean;
  hasAnswer: boolean;
  onPrevious: () => void;
  onNext: () => void;
  onSubmit: () => void;
}

export function MCQNavigation({
  currentIndex,
  totalQuestions,
  isLastQuestion,
  hasAnswer,
  onPrevious,
  onNext,
  onSubmit,
}: MCQNavigationProps) {
  return (
    <div className="flex items-center justify-between mt-8 pt-6 border-t border-slate-200 dark:border-slate-700">
      {/* Previous Button */}
      <button
        onClick={onPrevious}
        disabled={currentIndex === 0}
        className={`
          px-8 py-4 rounded-xl font-semibold text-lg transition-all duration-200
          ${currentIndex === 0
            ? 'bg-slate-100 dark:bg-slate-800 text-slate-400 dark:text-slate-600 cursor-not-allowed'
            : 'bg-slate-200 dark:bg-slate-700 text-slate-900 dark:text-white hover:bg-slate-300 dark:hover:bg-slate-600 hover:shadow-lg'
          }
        `}
      >
        <div className="flex items-center gap-2">
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
          Previous
        </div>
      </button>

      {/* Question Indicator */}
      <div className="text-center">
        <p className="text-sm text-slate-600 dark:text-slate-400 mb-2">
          Question Progress
        </p>
        <div className="flex items-center gap-2">
          {Array.from({ length: totalQuestions }, (_, i) => (
            <div
              key={i}
              className={`
                w-2 h-2 rounded-full transition-all duration-200
                ${i === currentIndex
                  ? 'w-8 bg-blue-500'
                  : i < currentIndex
                  ? 'bg-green-500'
                  : 'bg-slate-300 dark:bg-slate-600'
                }
              `}
            />
          ))}
        </div>
      </div>

      {/* Next/Submit Button */}
      {isLastQuestion ? (
        <button
          onClick={onSubmit}
          className="
            px-8 py-4 rounded-xl font-semibold text-lg
            bg-gradient-to-r from-green-500 to-emerald-600
            text-white hover:from-green-600 hover:to-emerald-700
            shadow-lg hover:shadow-xl transform hover:scale-105
            transition-all duration-200
          "
        >
          <div className="flex items-center gap-2">
            Submit Exam
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          </div>
        </button>
      ) : (
        <button
          onClick={onNext}
          className="
            px-8 py-4 rounded-xl font-semibold text-lg
            bg-gradient-to-r from-blue-500 to-indigo-600
            text-white hover:from-blue-600 hover:to-indigo-700
            shadow-lg hover:shadow-xl transform hover:scale-105
            transition-all duration-200
          "
        >
          <div className="flex items-center gap-2">
            Next
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </div>
        </button>
      )}
    </div>
  );
}

// Made with Bob
