'use client';

import React from 'react';
import { MCQQuestion as MCQQuestionType } from '@/lib/types/mcq.types';
import Image from 'next/image';
import { imageUrl } from '@/lib/assetUrl';

interface MCQQuestionCardProps {
  question: MCQQuestionType;
  selectedAnswer?: 'A' | 'B' | 'C' | 'D';
  onAnswerSelect: (answer: 'A' | 'B' | 'C' | 'D') => void;
  isSubmitted: boolean;
  correctAnswer?: 'A' | 'B' | 'C' | 'D' | 'DISCOUNTED';
  zoomLevel?: number;
}

export function MCQQuestionCard({
  question,
  selectedAnswer,
  onAnswerSelect,
  isSubmitted,
  correctAnswer,
  zoomLevel = 100,
}: MCQQuestionCardProps) {
  const getCircleButtonClassName = (optionLetter: 'A' | 'B' | 'C' | 'D') => {
    const baseClasses = 'rounded-full flex items-center justify-center font-bold cursor-pointer transition-all duration-200';
    
    if (isSubmitted) {
      // Discounted question — all answers neutral/green
      if (correctAnswer === 'DISCOUNTED') {
        return `${baseClasses} bg-gray-100 dark:bg-[#2A1F0E] border-2 border-gray-300 dark:border-[#C9A84C]/20 text-gray-400 dark:text-[#7A6A4A]`;
      }
      if (optionLetter === correctAnswer) {
        return `${baseClasses} bg-green-500 dark:bg-green-600 border-2 border-green-600 dark:border-green-500 text-white shadow-lg`;
      }
      if (optionLetter === selectedAnswer && selectedAnswer !== correctAnswer) {
        return `${baseClasses} bg-red-500 dark:bg-red-600 border-2 border-red-600 dark:border-red-500 text-white shadow-lg`;
      }
      return `${baseClasses} bg-gray-50 dark:bg-[#2A1F0E] border-2 border-gray-200 dark:border-[#C9A84C]/20 text-gray-400 dark:text-[#7A6A4A]`;
    }
    
    // During exam
    if (selectedAnswer === optionLetter) {
      return `${baseClasses} bg-[#C9A84C] dark:bg-[#E2C97A] border-2 border-[#E2C97A] dark:border-[#C9A84C] text-[#0A0806] dark:text-[#0A0806] shadow-lg scale-110`;
    }
    
    return `${baseClasses} bg-white dark:bg-[#1A1510] border-2 border-[#e5e7eb] dark:border-[#C9A84C]/30 text-[#2A1F0E] dark:text-[#E2C97A] hover:bg-[#f9fafb] dark:hover:bg-[#2A1F0E] hover:scale-105`;
  };

  return (
    <div
      id={`question-${question.questionNumber}`}
      className="w-full max-w-3xl mx-auto my-6 p-6 bg-white dark:bg-[#1A1510] rounded-2xl border border-gray-100 dark:border-[#C9A84C]/25 shadow-sm flex flex-col items-center justify-start transition-all duration-200 relative"
      style={{ height: 'auto', minHeight: '0px', maxHeight: 'none', zIndex: 10 }}
    >
      {/* Question Number Badge */}
      <div className="flex items-center justify-center mb-4">
        <div className="bg-[#C9A84C] dark:bg-[#E2C97A] text-[#0A0806] px-6 py-2 rounded-full font-bold text-lg shadow-md">
          Question {question.questionNumber}
        </div>
      </div>

      {/* Full Question as Image - Width controlled by zoom, height follows naturally */}
      {question.imageUrl && (
        <div className="w-full h-auto flex items-center justify-center">
          <div style={{ width: `${zoomLevel}%`, transition: 'width 0.2s ease' }}>
            <Image
              src={`${imageUrl(question.imageUrl!)}?v=25`}
              alt={`Question ${question.questionNumber}`}
              width={1200}
              height={1000}
              className="w-full h-auto object-contain block select-none"
              priority
              unoptimized
            />
          </div>
        </div>
      )}

      {/* Text-based question (e.g. Accounting) — Cambridge printed layout */}
      {!question.imageUrl && question.options && question.options.length > 0 && (
        <div className="w-full mb-2 px-2">
          {/* Question number + stem */}
          <div className="flex gap-4 mb-6">
            <span className="font-bold text-base text-slate-800 dark:text-[#E2C97A] flex-shrink-0">
              {question.questionNumber}
            </span>
            <p className="text-base text-slate-800 dark:text-[#E2C97A] leading-relaxed">
              {question.questionText}
            </p>
          </div>
          {/* A B C D — Cambridge indented list */}
          <div className="flex flex-col gap-3 pl-8">
            {question.options.map((opt) => {
              const isDiscounted = correctAnswer === 'DISCOUNTED';
              const isCorrect  = isSubmitted && !isDiscounted && opt.letter === correctAnswer;
              const isWrong    = isSubmitted && !isDiscounted && selectedAnswer === opt.letter && selectedAnswer !== correctAnswer;
              const isSelected = selectedAnswer === opt.letter;
              return (
                <div key={opt.letter} className="flex gap-4 items-baseline">
                  <span className={`font-bold text-base flex-shrink-0 w-5 ${
                    isCorrect  ? 'text-green-600 dark:text-green-400' :
                    isWrong    ? 'text-red-600 dark:text-red-400' :
                    isSelected ? 'text-[#C9A84C] dark:text-[#E2C97A]' :
                                 'text-slate-800 dark:text-[#E2C97A]'
                  }`}>
                    {opt.letter}
                  </span>
                  <span className={`text-base leading-relaxed ${
                    isCorrect  ? 'text-green-700 dark:text-green-300 font-medium' :
                    isWrong    ? 'text-red-700 dark:text-red-300' :
                    isSelected ? 'text-[#2A1F0E] dark:text-[#E2C97A] font-medium' :
                                 'text-slate-700 dark:text-[#C9A84C]/80'
                  }`}>
                    {opt.text}
                    {isCorrect && <span className="ml-2 text-green-500">✓</span>}
                    {isWrong   && <span className="ml-2 text-red-500">✗</span>}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* A B C D bubble dock — shown for ALL question types */}
      {(question.imageUrl || (question.options && question.options.length > 0)) && (
      <div className="mt-6 w-full max-w-sm flex flex-col items-center bg-gray-50/50 dark:bg-[#1A1510] rounded-xl p-4 border border-gray-100 dark:border-[#C9A84C]/30">
        <p className="text-xs font-bold uppercase tracking-wider text-gray-400 dark:text-[#7A6A4A] mb-3">
          Select your answer
        </p>
        <div className="flex gap-3">
          {['A', 'B', 'C', 'D'].map((letter) => {
            const isDiscounted = correctAnswer === 'DISCOUNTED';
            const isSelected = selectedAnswer === letter;
            const isCorrect = isSubmitted && !isDiscounted && letter === correctAnswer;
            const isWrong = isSubmitted && !isDiscounted && letter === selectedAnswer && selectedAnswer !== correctAnswer;
            
            return (
              <button
                key={letter}
                onClick={() => !isSubmitted && onAnswerSelect(letter as 'A' | 'B' | 'C' | 'D')}
                disabled={isSubmitted}
                className={`
                  w-12 h-12 rounded-xl font-bold text-lg transition-all duration-200
                  ${isCorrect ? 'bg-green-500 text-white border-4 border-green-600 shadow-lg scale-110' :
                    isWrong ? 'bg-red-500 text-white border-4 border-red-600 shadow-lg' :
                    isSelected ? 'bg-[#C9A84C] text-[#0A0806] border-4 border-[#E2C97A] shadow-lg scale-110' :
                    'bg-white dark:bg-[#2A1F0E] text-[#2A1F0E] dark:text-[#E2C97A] border-2 border-gray-200 dark:border-[#C9A84C]/30 hover:border-[#C9A84C] hover:scale-105'
                  }
                  ${!isSubmitted && 'cursor-pointer active:scale-95'}
                  ${isSubmitted && 'cursor-default'}
                `}
                aria-label={`Select option ${letter}`}
              >
                {letter}
                {isCorrect && ' ✓'}
              </button>
            );
          })}
        </div>
      </div>
      )}

      {/* Show result text after submission */}
      {isSubmitted && correctAnswer && (
        correctAnswer === 'DISCOUNTED' ? (
          <div className="mt-4 p-3 rounded-lg text-center text-sm font-medium border bg-blue-50 dark:bg-[#1A1F2E] text-blue-800 dark:text-blue-300 border-blue-200 dark:border-blue-900/50">
            <span className="font-semibold">Question Discounted by Cambridge</span> — Full mark awarded automatically ✓
          </div>
        ) : (
          <div className={`mt-4 p-3 rounded-lg text-center text-sm font-medium border ${
            selectedAnswer === correctAnswer
              ? 'bg-green-50 dark:bg-[#2A1F0E] text-green-800 dark:text-green-400 border-green-200 dark:border-green-900/50'
              : 'bg-red-50 dark:bg-[#2A1F0E] text-red-800 dark:text-red-400 border-red-200 dark:border-red-900/50'
          }`}>
            <span className="font-semibold">Your answer:</span> {selectedAnswer || 'Not answered'} |
            <span className="font-semibold"> Correct answer:</span> {correctAnswer}
            {selectedAnswer === correctAnswer && ' ✓'}
          </div>
        )
      )}
    </div>
  );
}

// Made with Bob
