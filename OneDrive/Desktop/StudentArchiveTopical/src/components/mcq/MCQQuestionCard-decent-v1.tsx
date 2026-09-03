'use client';

import React from 'react';
import { MCQQuestion as MCQQuestionType } from '@/lib/types/mcq.types';
import Image from 'next/image';

interface MCQQuestionCardProps {
  question: MCQQuestionType;
  selectedAnswer?: 'A' | 'B' | 'C' | 'D';
  onAnswerSelect: (answer: 'A' | 'B' | 'C' | 'D') => void;
  isSubmitted: boolean;
  correctAnswer?: 'A' | 'B' | 'C' | 'D';
}

export function MCQQuestionCard({
  question,
  selectedAnswer,
  onAnswerSelect,
  isSubmitted,
  correctAnswer,
}: MCQQuestionCardProps) {
  const getCircleClassName = (optionLetter: 'A' | 'B' | 'C' | 'D') => {
    const baseClasses = 'flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm transition-all cursor-pointer border-2';
    
    if (isSubmitted) {
      // Show results
      if (optionLetter === correctAnswer) {
        return `${baseClasses} bg-green-500 border-green-600 text-white`;
      }
      if (optionLetter === selectedAnswer && selectedAnswer !== correctAnswer) {
        return `${baseClasses} bg-red-500 border-red-600 text-white`;
      }
      return `${baseClasses} bg-slate-100 border-slate-300 text-slate-400`;
    }
    
    // During exam
    if (selectedAnswer === optionLetter) {
      return `${baseClasses} bg-teal-500 border-teal-600 text-white shadow-md`;
    }
    
    return `${baseClasses} bg-white border-slate-300 text-slate-700 hover:border-teal-400 hover:bg-teal-50`;
  };

  return (
    <div className="bg-white rounded-xl shadow-md border border-slate-200 p-6 mb-4">
      {/* Card Header */}
      <div className="flex items-center justify-between mb-4">
        <button className="px-3 py-1 text-xs font-medium text-slate-600 border border-slate-300 rounded-md hover:bg-slate-50 transition-colors">
          MARK OUT OF SYLLABUS
        </button>
        <button className="p-2 text-slate-400 hover:text-slate-600 transition-colors">
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </button>
      </div>

      {/* Full Question as Image */}
      {question.imageUrl && (
        <div className="mb-6 flex justify-center">
          <div className="relative max-w-4xl w-full">
            <Image
              src={question.imageUrl}
              alt={`Question ${question.questionNumber}`}
              width={1200}
              height={800}
              className="w-full h-auto object-contain"
              priority
            />
          </div>
        </div>
      )}

      {/* Clickable Letter Circles Only */}
      <div className="flex items-center justify-center gap-4 mt-6">
        {['A', 'B', 'C', 'D'].map((letter) => (
          <button
            key={letter}
            onClick={() => !isSubmitted && onAnswerSelect(letter as 'A' | 'B' | 'C' | 'D')}
            disabled={isSubmitted}
            className={getCircleClassName(letter as 'A' | 'B' | 'C' | 'D')}
            aria-label={`Select option ${letter}`}
          >
            {letter}
            {/* Show checkmark or X in results */}
            {isSubmitted && letter === correctAnswer && (
              <svg className="absolute inset-0 w-full h-full p-1 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
              </svg>
            )}
            {isSubmitted && letter === selectedAnswer && selectedAnswer !== correctAnswer && (
              <svg className="absolute inset-0 w-full h-full p-1 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M6 18L18 6M6 6l12 12" />
              </svg>
            )}
          </button>
        ))}
      </div>
    </div>
  );
}

// Made with Bob
