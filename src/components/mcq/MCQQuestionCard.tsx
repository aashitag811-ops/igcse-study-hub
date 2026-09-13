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
  isOutOfSyllabus = false,
  onToggleOutOfSyllabus,
}: MCQQuestionCardProps) {

  const getCircleStyle = (letter: 'A' | 'B' | 'C' | 'D'): React.CSSProperties => {
    const isDiscounted = correctAnswer === 'DISCOUNTED';
    const isCorrect  = isSubmitted && !isDiscounted && letter === correctAnswer;
    const isWrong    = isSubmitted && !isDiscounted && letter === selectedAnswer && selectedAnswer !== correctAnswer;
    const isSelected = !isSubmitted && selectedAnswer === letter;

    if (isCorrect)  return { background: '#22c55e', borderColor: '#16a34a', color: '#fff', transform: 'scale(1.12)', boxShadow: '0 0 0 3px rgba(34,197,94,0.25)' };
    if (isWrong)    return { background: '#ef4444', borderColor: '#dc2626', color: '#fff', boxShadow: '0 0 0 3px rgba(239,68,68,0.25)' };
    if (isDiscounted && isSubmitted) return { background: 'rgba(200,168,76,0.08)', borderColor: 'rgba(200,168,76,0.2)', color: 'rgba(200,168,76,0.4)', cursor: 'default' };
    if (isSelected) return { background: '#C9A84C', borderColor: '#E2C97A', color: '#0A0806', transform: 'scale(1.12)', boxShadow: '0 0 0 3px rgba(201,168,76,0.3)' };

    return {
      background: 'rgba(255,255,255,0.04)',
      borderColor: 'rgba(200,168,76,0.25)',
      color: '#C9A84C',
    };
  };

  return (
    <div
      id={`question-${question.questionNumber}`}
      style={{
        background: 'linear-gradient(160deg, rgba(14,20,12,0.97) 0%, rgba(8,12,8,0.99) 100%)',
        border: isOutOfSyllabus
          ? '1px solid rgba(251,146,60,0.4)'
          : '1px solid rgba(200,168,76,0.14)',
        borderTop: isOutOfSyllabus
          ? '1px solid rgba(251,146,60,0.5)'
          : '1px solid rgba(200,168,76,0.22)',
        borderRadius: '16px',
        marginBottom: '12px',
        overflow: 'hidden',
        boxShadow: '0 8px 32px rgba(0,0,0,0.45), inset 0 1px 0 rgba(200,168,76,0.08)',
      }}
    >
      {/* Top bar: question number + out-of-syllabus toggle */}
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '12px 18px',
        borderBottom: '1px solid rgba(200,168,76,0.07)',
      }}>
        <span style={{
          fontFamily: "'Cormorant Garamond', Georgia, serif",
          fontSize: '15px', fontWeight: 600,
          color: '#C9A84C', letterSpacing: '0.04em',
        }}>
          Question {question.questionNumber}
          {correctAnswer === 'DISCOUNTED' && (
            <span style={{ marginLeft: 8, fontSize: 11, color: 'rgba(200,168,76,0.5)', fontStyle: 'italic' }}>discounted</span>
          )}
        </span>

        {!isSubmitted && onToggleOutOfSyllabus && (
          <button
            onClick={onToggleOutOfSyllabus}
            style={{
              fontFamily: "'DM Sans', system-ui, sans-serif",
              fontSize: '10px', fontWeight: 600, letterSpacing: '0.12em',
              textTransform: 'uppercase',
              padding: '4px 10px', borderRadius: '6px',
              background: isOutOfSyllabus ? 'rgba(251,146,60,0.18)' : 'transparent',
              border: isOutOfSyllabus ? '1px solid rgba(251,146,60,0.5)' : '1px solid rgba(200,168,76,0.2)',
              color: isOutOfSyllabus ? '#fb923c' : 'rgba(200,168,76,0.5)',
              cursor: 'pointer', transition: 'all 0.15s',
            }}
          >
            {isOutOfSyllabus ? '✓ Out of syllabus' : 'Mark out of syllabus'}
          </button>
        )}
      </div>

      {/* Question content */}
      <div style={{ padding: '20px 18px 0' }}>

        {/* Image-based question */}
        {question.imageUrl && (
          <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '8px' }}>
            <div style={{ width: `${zoomLevel}%`, transition: 'width 0.2s ease' }}>
              <Image
                src={`${imageUrl(question.imageUrl)}?v=25`}
                alt={`Question ${question.questionNumber}`}
                width={1200}
                height={1000}
                style={{ width: '100%', height: 'auto', objectFit: 'contain', display: 'block' }}
                priority
                unoptimized
              />
            </div>
          </div>
        )}

        {/* Text-based question (no image) */}
        {!question.imageUrl && question.questionText && (
          <div style={{ marginBottom: '16px' }}>
            <p style={{
              fontFamily: "'DM Sans', system-ui, sans-serif",
              fontSize: '15px', lineHeight: 1.7,
              color: 'rgba(232,220,196,0.9)',
            }}>
              {question.questionText}
            </p>

            {/* Parsed A/B/C/D text options */}
            {question.options && Array.isArray(question.options) && question.options.length > 0 && (
              <div style={{ marginTop: '16px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
                {question.options.map((opt: any) => {
                  const letter = opt.letter as 'A' | 'B' | 'C' | 'D';
                  const isDiscounted = correctAnswer === 'DISCOUNTED';
                  const isCorrect  = isSubmitted && !isDiscounted && letter === correctAnswer;
                  const isWrong    = isSubmitted && !isDiscounted && letter === selectedAnswer && selectedAnswer !== correctAnswer;
                  const isSelected = selectedAnswer === letter;
                  return (
                    <div
                      key={letter}
                      onClick={() => !isSubmitted && onAnswerSelect(letter)}
                      style={{
                        display: 'flex', alignItems: 'flex-start', gap: '12px',
                        padding: '10px 14px', borderRadius: '10px', cursor: isSubmitted ? 'default' : 'pointer',
                        background: isCorrect ? 'rgba(34,197,94,0.1)' : isWrong ? 'rgba(239,68,68,0.1)' : isSelected ? 'rgba(201,168,76,0.08)' : 'transparent',
                        border: isCorrect ? '1px solid rgba(34,197,94,0.3)' : isWrong ? '1px solid rgba(239,68,68,0.3)' : isSelected ? '1px solid rgba(201,168,76,0.25)' : '1px solid transparent',
                        transition: 'all 0.15s',
                      }}
                    >
                      <span style={{
                        fontFamily: 'monospace', fontSize: '13px', fontWeight: 700, flexShrink: 0,
                        color: isCorrect ? '#22c55e' : isWrong ? '#ef4444' : isSelected ? '#C9A84C' : 'rgba(200,168,76,0.5)',
                      }}>{letter}</span>
                      <span style={{
                        fontFamily: "'DM Sans', system-ui, sans-serif", fontSize: '14px', lineHeight: 1.6,
                        color: isCorrect ? '#86efac' : isWrong ? '#fca5a5' : 'rgba(232,220,196,0.85)',
                      }}>{opt.text}</span>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </div>

      {/* A B C D answer dock */}
      <div style={{ padding: '16px 18px 20px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '10px' }}>
        <p style={{
          fontFamily: "'DM Sans', system-ui, sans-serif",
          fontSize: '9px', fontWeight: 700, letterSpacing: '0.22em',
          textTransform: 'uppercase', color: 'rgba(200,168,76,0.35)',
        }}>
          Select your answer
        </p>
        <div style={{ display: 'flex', gap: '12px' }}>
          {(['A','B','C','D'] as const).map(letter => (
            <button
              key={letter}
              onClick={() => !isSubmitted && onAnswerSelect(letter)}
              disabled={isSubmitted}
              aria-label={`Select option ${letter}`}
              style={{
                width: 48, height: 48, borderRadius: '50%',
                fontFamily: "'DM Sans', system-ui, sans-serif",
                fontSize: '16px', fontWeight: 700,
                border: '2px solid',
                cursor: isSubmitted ? 'default' : 'pointer',
                transition: 'all 0.15s ease',
                ...getCircleStyle(letter),
              }}
            >
              {letter}
            </button>
          ))}
        </div>

        {/* Result line after submission */}
        {isSubmitted && (
          correctAnswer === 'DISCOUNTED' ? (
            <p style={{ fontFamily: "'DM Sans', system-ui, sans-serif", fontSize: '12px', color: '#93c5fd', marginTop: 4 }}>
              Question discounted by Cambridge — mark awarded automatically ✓
            </p>
          ) : (
            <p style={{
              fontFamily: "'DM Sans', system-ui, sans-serif", fontSize: '12px', marginTop: 4,
              color: selectedAnswer === correctAnswer ? '#86efac' : '#fca5a5',
            }}>
              {selectedAnswer === correctAnswer
                ? `Correct ✓`
                : `Your answer: ${selectedAnswer ?? '—'}  ·  Correct: ${correctAnswer}`}
            </p>
          )
        )}
      </div>
    </div>
  );
}

// Made with Bob
