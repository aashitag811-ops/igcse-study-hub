'use client';

import React from 'react';
import { MCQQuestion as MCQQuestionType } from '@/lib/types/mcq.types';
import { imageUrl } from '@/lib/assetUrl';
import { SmartMCQImage } from './SmartMCQImage';

interface MCQQuestionCardProps {
  question: MCQQuestionType;
  selectedAnswer?: 'A' | 'B' | 'C' | 'D';
  onAnswerSelect: (answer: 'A' | 'B' | 'C' | 'D') => void;
  isSubmitted: boolean;
  correctAnswer?: 'A' | 'B' | 'C' | 'D' | 'DISCOUNTED';
  zoomLevel?: number;
  isFlagged?: boolean;
  onToggleFlag?: () => void;
}

export function MCQQuestionCard({
  question,
  selectedAnswer,
  onAnswerSelect,
  isSubmitted,
  correctAnswer,
  zoomLevel = 100,
  isFlagged = false,
  onToggleFlag,
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

  const isWrongAnswer  = isSubmitted && !!selectedAnswer && selectedAnswer !== correctAnswer && correctAnswer !== 'DISCOUNTED';
  const isRightAnswer  = isSubmitted && !!selectedAnswer && selectedAnswer === correctAnswer;
  const isDiscountedQ  = isSubmitted && correctAnswer === 'DISCOUNTED';

  const borderGradient = isWrongAnswer
    ? 'linear-gradient(135deg, #7f1d1d, #b91c1c)'
    : isRightAnswer || isDiscountedQ
    ? 'linear-gradient(135deg, #14532d, #16a34a)'
    : 'linear-gradient(135deg, #1a3a6a, #4a2a7a)';

  const cardBg = `linear-gradient(#1A1510, #1A1510) padding-box, ${borderGradient} border-box`;

  return (
    <div
      id={`question-${question.questionNumber}`}
      className="w-full max-w-3xl mx-auto my-8 px-6 pt-8 pb-10 bg-white dark:bg-[#1A1510] rounded-2xl shadow-sm flex flex-col items-center justify-start transition-all duration-200 relative"
      style={{
        height: 'auto', minHeight: '0px', maxHeight: 'none', zIndex: 10,
        border: '2px solid transparent',
        background: cardBg,
        ...(isWrongAnswer && { boxShadow: '0 0 0 1px rgba(185,28,28,0.4), 0 0 32px 8px rgba(185,28,28,0.18), 0 0 64px 16px rgba(185,28,28,0.08)' }),
      }}
    >
      {/* Question Number Badge + Flag */}
      <div className="flex items-center justify-center gap-3 mb-6">
        <div
          className="px-6 py-2 rounded-full font-bold text-lg text-white"
          style={{ border: '2px solid transparent', background: cardBg }}
        >
          Question {question.questionNumber}
        </div>
        {!isSubmitted && onToggleFlag && (
          <button
            onClick={onToggleFlag}
            title={isFlagged ? 'Remove flag' : 'Flag for review'}
            className="transition-transform duration-150 hover:scale-110 active:scale-95 flex-shrink-0"
            style={{ background: 'none', border: 'none', padding: 0, cursor: 'pointer' }}
          >
            <svg width="18" height="22" viewBox="0 0 18 22" fill="none" xmlns="http://www.w3.org/2000/svg">
              {/* pole */}
              <line x1="2" y1="2" x2="2" y2="21" stroke={isFlagged ? '#b91c1c' : '#475569'} strokeWidth="2" strokeLinecap="round"/>
              {/* flag triangle */}
              <path d="M2 2 L17 7 L2 14 Z" fill={isFlagged ? '#dc2626' : '#334155'} stroke={isFlagged ? '#b91c1c' : '#475569'} strokeWidth="1.2" strokeLinejoin="round"/>
            </svg>
          </button>
        )}
      </div>

      {/* Full Question as Image - Width controlled by zoom, height follows naturally */}
      {question.imageUrl && (
        <div className="w-full h-auto flex items-center justify-center">
          <div style={{ width: `${zoomLevel}%`, transition: 'width 0.2s ease' }}>
            <SmartMCQImage
              src={`${imageUrl(question.imageUrl!)}?v=25`}
              alt={`Question ${question.questionNumber}`}
              className="select-none"
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
      <div
        className="mt-6 w-full max-w-sm flex flex-col items-center rounded-xl p-4"
        style={{ border: '2px solid transparent', background: cardBg }}
      >
        <p className="text-xs font-bold uppercase tracking-wider text-gray-400 mb-3">
          Select your answer
        </p>
        <div className="flex gap-3">
          {['A', 'B', 'C', 'D'].map((letter) => {
            const isDiscounted = correctAnswer === 'DISCOUNTED';
            const isSelected = selectedAnswer === letter;
            const isCorrect = isSubmitted && !isDiscounted && letter === correctAnswer;
            const isWrong = isSubmitted && !isDiscounted && letter === selectedAnswer && selectedAnswer !== correctAnswer;

            let btnStyle: React.CSSProperties = {};
            let btnClass = 'w-12 h-12 rounded-xl font-bold text-lg transition-all duration-200 ';

            if (isCorrect) {
              btnStyle = { background: 'transparent', border: '2px solid #16a34a', color: '#86efac', boxShadow: '0 0 8px rgba(34,197,94,0.2)' };
              btnClass += 'scale-110';
            } else if (isWrong) {
              btnStyle = { background: 'transparent', border: '2px solid #b91c1c', color: '#fca5a5', boxShadow: '0 0 8px rgba(239,68,68,0.2)' };
            } else if (isSelected) {
              btnStyle = { background: 'transparent', border: '2px solid transparent', backgroundClip: 'padding-box', outline: '2px solid #4a7aff', color: 'white', boxShadow: '0 0 8px rgba(74,122,255,0.3)' };
              btnClass += 'scale-110';
            } else {
              btnStyle = { background: 'transparent', border: '2px solid transparent', backgroundImage: 'linear-gradient(#1A1510, #1A1510), linear-gradient(135deg, #1a3a6a, #4a2a7a)', backgroundOrigin: 'border-box', backgroundClip: 'padding-box, border-box', color: '#94a3b8' };
              btnClass += 'hover:scale-105 cursor-pointer active:scale-95';
            }

            return (
              <button
                key={letter}
                onClick={() => !isSubmitted && onAnswerSelect(letter as 'A' | 'B' | 'C' | 'D')}
                disabled={isSubmitted}
                className={btnClass + (isSubmitted ? ' cursor-default' : '')}
                style={btnStyle}
                aria-label={`Select option ${letter}`}
              >
                {letter}
              </button>
            );
          })}
        </div>
      </div>
      )}

      {/* Status badge — top-right, shown after submission */}
      {isSubmitted && correctAnswer !== 'DISCOUNTED' && (
        <div
          className="absolute top-3 right-4 text-sm font-medium tracking-wide"
          style={{
            color: !selectedAnswer
              ? 'rgba(239,68,68,0.55)'
              : selectedAnswer === correctAnswer
              ? 'rgba(34,197,94,0.6)'
              : 'rgba(239,68,68,0.6)',
          }}
        >
          {!selectedAnswer ? 'Unanswered' : selectedAnswer === correctAnswer ? 'Correct' : 'Wrong'}
        </div>
      )}
    </div>
  );
}

// Made with Bob
