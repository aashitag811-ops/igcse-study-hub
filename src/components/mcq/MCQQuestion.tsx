'use client';

import React from 'react';
import { MCQQuestion as MCQQuestionType } from '@/lib/types/mcq.types';
import Image from 'next/image';

interface MCQQuestionProps {
  question: MCQQuestionType;
  selectedAnswer?: 'A' | 'B' | 'C' | 'D';
  onAnswerSelect: (answer: 'A' | 'B' | 'C' | 'D') => void;
  isSubmitted: boolean;
  correctAnswer?: 'A' | 'B' | 'C' | 'D';
}

export function MCQQuestion({
  question,
  selectedAnswer,
  onAnswerSelect,
  isSubmitted,
  correctAnswer,
}: MCQQuestionProps) {
  const getOptionClassName = (optionLetter: 'A' | 'B' | 'C' | 'D') => {
    const baseClasses = 'w-full p-4 text-left rounded-lg border-2 transition-all duration-200 font-medium';
    
    if (isSubmitted) {
      // Show results
      if (optionLetter === correctAnswer) {
        return `${baseClasses} bg-green-50 dark:bg-green-900/20 border-green-500 text-green-900 dark:text-green-100`;
      }
      if (optionLetter === selectedAnswer && selectedAnswer !== correctAnswer) {
        return `${baseClasses} bg-red-50 dark:bg-red-900/20 border-red-500 text-red-900 dark:text-red-100`;
      }
      return `${baseClasses} bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400`;
    }
    
    // During exam
    if (selectedAnswer === optionLetter) {
      return `${baseClasses} bg-blue-50 dark:bg-blue-900/20 border-blue-500 text-blue-900 dark:text-blue-100 shadow-md`;
    }
    
    return `${baseClasses} bg-white dark:bg-slate-800 border-slate-300 dark:border-slate-600 text-slate-900 dark:text-white hover:border-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/10 cursor-pointer`;
  };

  const getLetterBadgeClassName = (optionLetter: 'A' | 'B' | 'C' | 'D') => {
    const baseClasses = 'flex-shrink-0 w-8 h-8 rounded-md flex items-center justify-center font-bold transition-all';
    
    if (isSubmitted) {
      if (optionLetter === correctAnswer) {
        return `${baseClasses} bg-green-600 text-white`;
      }
      if (optionLetter === selectedAnswer && selectedAnswer !== correctAnswer) {
        return `${baseClasses} bg-red-600 text-white`;
      }
      return `${baseClasses} bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-400`;
    }
    
    if (selectedAnswer === optionLetter) {
      return `${baseClasses} bg-blue-600 text-white`;
    }
    
    return `${baseClasses} bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300`;
  };

  return (
    <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-xl p-8 mb-6">
      {/* Question Text */}
      <div className="mb-8">
        <div className="flex items-start gap-4">
          <span className="flex-shrink-0 w-10 h-10 bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 rounded-full flex items-center justify-center font-bold text-lg">
            {question.questionNumber}
          </span>
          <p className="text-xl text-slate-900 dark:text-white leading-relaxed flex-1 pt-1">
            {question.questionText}
          </p>
        </div>
      </div>

      {/* Question Image (if exists) */}
      {question.imageUrl && (
        <div className="mb-8 flex justify-center">
          <div className="relative max-w-2xl w-full bg-slate-50 dark:bg-slate-900 rounded-xl p-6 border border-slate-200 dark:border-slate-700">
            <Image
              src={question.imageUrl}
              alt={`Diagram for question ${question.questionNumber}`}
              width={800}
              height={600}
              className="w-full h-auto object-contain"
              priority
            />
          </div>
        </div>
      )}

      {/* Answer Options */}
      <div className="grid grid-cols-1 gap-4">
        {question.options.map((option) => (
          <button
            key={option.letter}
            onClick={() => !isSubmitted && onAnswerSelect(option.letter)}
            disabled={isSubmitted}
            className={getOptionClassName(option.letter)}
          >
            <div className="flex items-center gap-3">
              <span className={getLetterBadgeClassName(option.letter)}>
                {option.letter}
              </span>
              <span className="flex-1 text-base">{option.text}</span>
              
              {/* Show checkmark or X in results */}
              {isSubmitted && (
                <span className="flex-shrink-0">
                  {option.letter === correctAnswer && (
                    <svg className="w-5 h-5 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                  )}
                  {option.letter === selectedAnswer && selectedAnswer !== correctAnswer && (
                    <svg className="w-5 h-5 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  )}
                </span>
              )}
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}

// Made with Bob
