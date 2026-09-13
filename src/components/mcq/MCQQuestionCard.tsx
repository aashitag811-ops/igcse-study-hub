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
  isOutOfSyllabus?: boolean;
  onToggleOutOfSyllabus?: () => void;
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
  isOutOfSyllabus = false,
  onToggleOutOfSyllabus,
}: MCQQuestionCardProps) {
  const getCircleClassName = (letter: 'A' | 'B' | 'C' | 'D') => {
    const base = 'flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm transition-all duration-150 border-2 cursor-pointer';

    if (isSubmitted) {
      if (correctAnswer === 'DISCOUNTED') {
        return `${base} bg-[#F0EAD6] border-[#C9A84C]/30 text-[#7A6A4A]`;
      }
      if (letter === correctAnswer) {
        return `${base} bg-green-500 border-green-600 text-white shadow-md`;
      }
      if (letter === selectedAnswer && selectedAnswer !== correctAnswer) {
        return `${base} bg-red-500 border-red-600 text-white shadow-md`;
      }
      return `${base} bg-[#F0EAD6] border-[#C9A84C]/20 text-[#7A6A4A]`;
    }

    if (selectedAnswer === letter) {
      return `${base} bg-[#C9A84C] border-[#E2C97A] text-[#0A0806] shadow-md scale-110`;
    }
    return `${base} bg-white border-slate-300 text-slate-700 hover:border-[#C9A84C] hover:bg-[#FAF7F0] hover:scale-105`;
  };

  const isWrong   = isSubmitted && !!selectedAnswer && selectedAnswer !== correctAnswer && correctAnswer !== 'DISCOUNTED';
  const isCorrect = isSubmitted && !!selectedAnswer && selectedAnswer === correctAnswer;

  return (
    <div
      id={`question-${question.questionNumber}`}
      className="w-full max-w-3xl mx-auto my-6 rounded-2xl overflow-hidden shadow-md"
      style={{
        outline: isWrong
          ? '2px solid rgba(239,68,68,0.5)'
          : isCorrect
          ? '2px solid rgba(34,197,94,0.4)'
          : '2px solid transparent',
      }}
    >
      {/* Card header — dark strip */}
      <div className="bg-[#0A0806] px-5 py-3 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <span className="text-[#C9A84C] font-semibold text-sm tracking-wide">
            Question {question.questionNumber}
          </span>
          {/* Flag button */}
          {!isSubmitted && onToggleFlag && (
            <button
              onClick={onToggleFlag}
              title={isFlagged ? 'Remove flag' : 'Flag for review'}
              className="transition-transform duration-150 hover:scale-110 active:scale-95"
              style={{ background: 'none', border: 'none', padding: 0, cursor: 'pointer' }}
            >
              <svg width="14" height="18" viewBox="0 0 18 22" fill="none" xmlns="http://www.w3.org/2000/svg">
                <line x1="2" y1="2" x2="2" y2="21" stroke={isFlagged ? '#b91c1c' : '#7A6A4A'} strokeWidth="2" strokeLinecap="round"/>
                <path d="M2 2 L17 7 L2 14 Z" fill={isFlagged ? '#dc2626' : '#C9A84C'} stroke={isFlagged ? '#b91c1c' : '#C9A84C'} strokeWidth="1.2" strokeLinejoin="round"/>
              </svg>
            </button>
          )}
          {/* After submit: status badge */}
          {isSubmitted && correctAnswer !== 'DISCOUNTED' && (
            <span className={`text-xs font-semibold tracking-wide ${
              !selectedAnswer ? 'text-red-400/70' :
              selectedAnswer === correctAnswer ? 'text-green-400/80' :
              'text-red-400/80'
            }`}>
              {!selectedAnswer ? 'Unanswered' : selectedAnswer === correctAnswer ? 'Correct' : 'Wrong'}
            </span>
          )}
          {isSubmitted && correctAnswer === 'DISCOUNTED' && (
            <span className="text-xs font-semibold text-[#C9A84C]/70 tracking-wide">Free Mark</span>
          )}
        </div>

        {/* MARK OUT OF SYLLABUS button */}
        {onToggleOutOfSyllabus && (
          <button
            onClick={onToggleOutOfSyllabus}
            className={`px-3 py-1 text-xs font-semibold tracking-widest uppercase rounded border transition-colors ${
              isOutOfSyllabus
                ? 'bg-red-900/40 border-red-700/60 text-red-300'
                : 'bg-transparent border-[#C9A84C]/40 text-[#C9A84C]/80 hover:border-[#C9A84C] hover:text-[#C9A84C]'
            }`}
          >
            {isOutOfSyllabus ? 'In Syllabus' : 'Mark Out of Syllabus'}
          </button>
        )}
      </div>

      {/* White paper area — full question image */}
      <div className="bg-white px-4 py-4">
        {question.imageUrl && (
          <div className="w-full flex items-center justify-center">
            <div style={{ width: `${zoomLevel}%`, transition: 'width 0.2s ease' }}>
              <SmartMCQImage
                src={`${imageUrl(question.imageUrl)}?v=25`}
                alt={`Question ${question.questionNumber}`}
                className="select-none w-full h-auto"
              />
            </div>
          </div>
        )}

        {/* Text-based question (e.g. Accounting) */}
        {!question.imageUrl && question.options && question.options.length > 0 && (
          <div className="w-full px-2">
            <div className="flex gap-4 mb-6">
              <span className="font-bold text-base text-slate-800 flex-shrink-0">
                {question.questionNumber}
              </span>
              <p className="text-base text-slate-800 leading-relaxed">{question.questionText}</p>
            </div>
            <div className="flex flex-col gap-3 pl-8">
              {question.options.map((opt) => {
                const isDisc = correctAnswer === 'DISCOUNTED';
                const isC  = isSubmitted && !isDisc && opt.letter === correctAnswer;
                const isW  = isSubmitted && !isDisc && selectedAnswer === opt.letter && selectedAnswer !== correctAnswer;
                const isSel = selectedAnswer === opt.letter;
                return (
                  <div key={opt.letter} className="flex gap-4 items-baseline">
                    <span className={`font-bold text-base flex-shrink-0 w-5 ${
                      isC ? 'text-green-600' : isW ? 'text-red-600' :
                      isSel ? 'text-[#C9A84C]' : 'text-slate-800'
                    }`}>{opt.letter}</span>
                    <span className={`text-base leading-relaxed ${
                      isC ? 'text-green-700 font-medium' : isW ? 'text-red-700' :
                      isSel ? 'text-slate-900 font-medium' : 'text-slate-700'
                    }`}>
                      {opt.text}
                      {isC && <span className="ml-2 text-green-500">✓</span>}
                      {isW && <span className="ml-2 text-red-500">✗</span>}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* A/B/C/D answer dock — below the white area */}
      <div className="bg-[#F0EAD6] px-5 py-4 flex flex-col items-center gap-3">
        <p className="text-xs font-bold uppercase tracking-widest text-[#7A6A4A]">
          Select your answer
        </p>
        <div className="flex gap-4">
          {(['A', 'B', 'C', 'D'] as const).map((letter) => (
            <button
              key={letter}
              onClick={() => !isSubmitted && onAnswerSelect(letter)}
              disabled={isSubmitted}
              className={getCircleClassName(letter) + (isSubmitted ? ' cursor-default' : '')}
              aria-label={`Select option ${letter}`}
            >
              {letter}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
