'use client';

import React, { useState } from 'react';

interface MCQQuestionSidebarProps {
  totalQuestions: number;
  currentQuestionIndex: number;
  answeredQuestions: Set<number>;
  onQuestionSelect: (index: number) => void;
  isSubmitted: boolean;
  correctAnswers?: Map<number, boolean>; // questionNumber -> isCorrect
}

export function MCQQuestionSidebar({
  totalQuestions,
  currentQuestionIndex,
  answeredQuestions,
  onQuestionSelect,
  isSubmitted,
  correctAnswers,
}: MCQQuestionSidebarProps) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <>
      {/* Sidebar */}
      <div
        className={`
          fixed right-0 top-0 h-full bg-white dark:bg-slate-800 shadow-2xl
          transition-transform duration-300 ease-in-out z-50
          ${isOpen ? 'translate-x-0' : 'translate-x-full'}
        `}
        style={{ width: '320px' }}
      >
        {/* Sidebar Header */}
        <div className="p-4 border-b border-slate-200 dark:border-slate-700">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-bold text-slate-900 dark:text-white">
              Questions
            </h3>
            <button
              onClick={() => setIsOpen(false)}
              className="p-2 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg transition-colors"
            >
              <svg className="w-5 h-5 text-slate-600 dark:text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
          <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">
            {answeredQuestions.size}/{totalQuestions} answered
          </p>
        </div>

        {/* Question Grid */}
        <div className="p-4 overflow-y-auto" style={{ height: 'calc(100% - 80px)' }}>
          <div className="grid grid-cols-5 gap-2">
            {Array.from({ length: totalQuestions }, (_, i) => {
              const questionNumber = i + 1;
              const isAnswered = answeredQuestions.has(questionNumber);
              const isCurrent = i === currentQuestionIndex;
              const isCorrect = correctAnswers?.get(questionNumber);

              return (
                <button
                  key={i}
                  onClick={() => {
                    onQuestionSelect(i);
                    setIsOpen(false);
                  }}
                  className={`
                    aspect-square rounded-lg font-semibold text-sm
                    transition-all duration-200 hover:scale-110
                    ${isCurrent
                      ? 'ring-2 ring-blue-500 ring-offset-2 dark:ring-offset-slate-800'
                      : ''
                    }
                    ${isSubmitted && isCorrect !== undefined
                      ? isCorrect
                        ? 'bg-green-500 text-white'
                        : 'bg-red-500 text-white'
                      : isAnswered
                        ? 'bg-[#C9A84C] text-white'
                        : 'bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300'
                    }
                  `}
                >
                  {questionNumber}
                </button>
              );
            })}
          </div>
        </div>
      </div>


      {/* Overlay when sidebar is open */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-black/20 backdrop-blur-sm z-40"
          onClick={() => setIsOpen(false)}
        />
      )}
    </>
  );
}

// Made with Bob