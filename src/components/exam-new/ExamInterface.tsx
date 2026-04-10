'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { ExamPaper, StudentAnswer } from '@/lib/exam-new/types';
import QuestionRendererSimple from './QuestionRendererSimple';

interface ExamInterfaceProps {
  examPaper: ExamPaper;
  onSubmit: (answers: { [questionId: string]: StudentAnswer }) => void;
}

export function ExamInterface({ examPaper, onSubmit }: ExamInterfaceProps) {
  // Generate unique storage key for this paper
  const storageKey = `exam_answers_${examPaper.subject}_${examPaper.season}_${examPaper.year}_${examPaper.variant}`;
  
  // Load saved answers from localStorage on mount
  const [answers, setAnswers] = useState<{ [questionId: string]: StudentAnswer }>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem(storageKey);
      if (saved) {
        try {
          return JSON.parse(saved);
        } catch (e) {
          console.error('Failed to parse saved answers:', e);
        }
      }
    }
    return {};
  });
  
  const [timeRemaining, setTimeRemaining] = useState(examPaper.duration * 60); // Convert to seconds
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [showSubmitConfirm, setShowSubmitConfirm] = useState(false);

  // Auto-save answers to localStorage whenever they change
  useEffect(() => {
    if (typeof window !== 'undefined') {
      localStorage.setItem(storageKey, JSON.stringify(answers));
    }
  }, [answers, storageKey]);

  // Timer countdown
  useEffect(() => {
    const timer = setInterval(() => {
      setTimeRemaining((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          // Auto-submit when time runs out
          handleSubmit();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  // Format time as HH:MM:SS
  const formatTime = (seconds: number) => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  // Handle answer change with auto-save
  const handleAnswerChange = useCallback((questionId: string, answer: string | string[], flagged?: boolean) => {
    setAnswers(prev => {
      const newAnswers = {
        ...prev,
        [questionId]: {
          questionId,
          answer,
          flagged: flagged || prev[questionId]?.flagged || false
        }
      };
      return newAnswers;
    });
  }, []);

  // Toggle flag for review
  const toggleFlag = (questionId: string) => {
    setAnswers(prev => ({
      ...prev,
      [questionId]: {
        ...prev[questionId],
        questionId,
        answer: prev[questionId]?.answer || '',
        flagged: !prev[questionId]?.flagged
      }
    }));
  };

  // Get all question IDs recursively
  const getAllQuestionIds = (questions: any[], prefix = ''): string[] => {
    let ids: string[] = [];
    questions.forEach((q) => {
      const qId = prefix ? `${prefix}.${q.number}` : q.number;
      
      // Only add terminal questions (those with marks and no subparts)
      if ((q.marks !== null && q.marks !== undefined) && (!q.subparts || q.subparts.length === 0)) {
        ids.push(qId);
      }
      
      if (q.subparts && q.subparts.length > 0) {
        ids = ids.concat(getAllQuestionIds(q.subparts, qId));
      }
    });
    return ids;
  };

  const allQuestionIds = getAllQuestionIds(examPaper.questions);

  // Get question status
  const getQuestionStatus = (questionId: string) => {
    const answer = answers[questionId];
    
    // Check if answered first
    const isAnswered = answer?.answer && (
      (typeof answer.answer === 'string' && answer.answer.trim().length > 0) ||
      (Array.isArray(answer.answer) && answer.answer.some(item =>
        item && typeof item === 'string' && item.trim().length > 0
      ))
    );
    
    // Answered questions show as answered even if flagged
    if (isAnswered) return 'answered';
    
    // Only show flagged if not answered
    if (answer?.flagged) return 'flagged';
    
    return 'unanswered';
  };

  // Handle submit and clear localStorage
  const handleSubmit = () => {
    if (typeof window !== 'undefined') {
      localStorage.removeItem(storageKey);
    }
    onSubmit(answers);
  };

  // Calculate progress percentage
  const calculateProgress = () => {
    const totalQuestions = allQuestionIds.length;
    const answeredQuestions = allQuestionIds.filter(qId => {
      const answer = answers[qId];
      if (!answer?.answer) return false;
      
      // For string answers
      if (typeof answer.answer === 'string') {
        return answer.answer.trim().length > 0;
      }
      
      // For array answers (MCQ, numbered lists, etc.)
      if (Array.isArray(answer.answer)) {
        // Check if at least one item has content
        return answer.answer.some(item =>
          item && typeof item === 'string' && item.trim().length > 0
        );
      }
      
      return false;
    }).length;
    return totalQuestions > 0 ? Math.round((answeredQuestions / totalQuestions) * 100) : 0;
  };

  const progress = calculateProgress();

  // Get time color based on remaining time
  const getTimeColor = () => {
    const percentage = (timeRemaining / (examPaper.duration * 60)) * 100;
    if (percentage <= 10) return '#ef4444'; // Red
    if (percentage <= 25) return '#f59e0b'; // Orange
    return '#22c55e'; // Green
  };

  return (
    <div style={{ display: 'flex', minHeight: '100vh', background: '#f8fafc' }}>
      {/* Side Navigation */}
      <div style={{
        width: '280px',
        background: 'white',
        borderRight: '2px solid #e2e8f0',
        padding: '20px',
        position: 'fixed',
        height: '100vh',
        overflowY: 'auto',
        boxShadow: '2px 0 10px rgba(0,0,0,0.05)'
      }}>
        {/* Timer */}
        <div style={{
          background: 'linear-gradient(135deg, #4F46E5 0%, #7C3AED 100%)',
          padding: '20px',
          borderRadius: '12px',
          marginBottom: '24px',
          textAlign: 'center',
          color: 'white'
        }}>
          <div style={{ fontSize: '0.85rem', opacity: 0.9, marginBottom: '8px' }}>
            Time Remaining
          </div>
          <div style={{
            fontSize: '1.8rem',
            fontWeight: '700',
            fontFamily: 'monospace',
            color: getTimeColor()
          }}>
            {formatTime(timeRemaining)}
          </div>
        </div>

        {/* Progress Bar */}
        <div style={{ marginBottom: '24px' }}>
          <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: '8px'
          }}>
            <span style={{ fontSize: '0.85rem', fontWeight: '600', color: '#475569' }}>
              Progress
            </span>
            <span style={{ fontSize: '0.85rem', fontWeight: '700', color: '#4F46E5' }}>
              {progress}%
            </span>
          </div>
          <div style={{
            height: '8px',
            background: '#e2e8f0',
            borderRadius: '5px',
            overflow: 'hidden'
          }}>
            <div style={{
              height: '100%',
              background: 'linear-gradient(90deg, #4F46E5 0%, #7C3AED 100%)',
              borderRadius: '5px',
              width: `${progress}%`,
              transition: 'width 0.3s ease'
            }} />
          </div>
        </div>

        {/* Paper Info */}
        <div style={{ marginBottom: '24px' }}>
          <h3 style={{ fontSize: '1rem', fontWeight: '600', color: '#1e293b', marginBottom: '8px' }}>
            {examPaper.subject}
          </h3>
          <div style={{ fontSize: '0.85rem', color: '#64748b' }}>
            {examPaper.season} {examPaper.year} • Variant {examPaper.variant}
          </div>
          <div style={{ fontSize: '0.85rem', color: '#64748b', marginTop: '4px' }}>
            Total: {examPaper.totalMarks} marks
          </div>
        </div>

        {/* Question Navigation */}
        <div>
          <h4 style={{ fontSize: '0.9rem', fontWeight: '600', color: '#475569', marginBottom: '12px' }}>
            Questions
          </h4>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '8px' }}>
            {allQuestionIds.map((qId, idx) => {
              const status = getQuestionStatus(qId);
              let bgColor = '#f1f5f9'; // unanswered
              let textColor = '#64748b';
              
              if (status === 'answered') {
                bgColor = '#dcfce7';
                textColor = '#16a34a';
              } else if (status === 'flagged') {
                bgColor = '#fef3c7';
                textColor = '#d97706';
              }

              return (
                <button
                  key={qId}
                  onClick={() => {
                    const element = document.getElementById(`question-${qId}`);
                    element?.scrollIntoView({ behavior: 'smooth', block: 'start' });
                  }}
                  style={{
                    padding: '10px',
                    background: bgColor,
                    color: textColor,
                    border: 'none',
                    borderRadius: '8px',
                    fontSize: '0.85rem',
                    fontWeight: '600',
                    cursor: 'pointer',
                    transition: 'all 0.2s'
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.transform = 'scale(1.05)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.transform = 'scale(1)';
                  }}
                >
                  {qId}
                </button>
              );
            })}
          </div>
        </div>

        {/* Legend */}
        <div style={{ marginTop: '24px', padding: '16px', background: '#f8fafc', borderRadius: '10px' }}>
          <div style={{ fontSize: '0.85rem', color: '#64748b', marginBottom: '10px', fontWeight: '600' }}>
            Legend
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', fontSize: '0.8rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <div style={{ width: '16px', height: '16px', background: '#dcfce7', borderRadius: '4px' }}></div>
              <span style={{ color: '#64748b' }}>Answered</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <div style={{ width: '16px', height: '16px', background: '#fef3c7', borderRadius: '4px' }}></div>
              <span style={{ color: '#64748b' }}>Flagged</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <div style={{ width: '16px', height: '16px', background: '#f1f5f9', borderRadius: '4px' }}></div>
              <span style={{ color: '#64748b' }}>Unanswered</span>
            </div>
          </div>
        </div>

        {/* Submit Button */}
        <button
          onClick={() => setShowSubmitConfirm(true)}
          style={{
            width: '100%',
            marginTop: '24px',
            padding: '14px',
            background: 'linear-gradient(135deg, #22c55e 0%, #16a34a 100%)',
            color: 'white',
            border: 'none',
            borderRadius: '10px',
            fontSize: '1rem',
            fontWeight: '600',
            cursor: 'pointer',
            transition: 'all 0.3s',
            boxShadow: '0 4px 12px rgba(34, 197, 94, 0.3)'
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.transform = 'translateY(-2px)';
            e.currentTarget.style.boxShadow = '0 6px 16px rgba(34, 197, 94, 0.4)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.transform = 'translateY(0)';
            e.currentTarget.style.boxShadow = '0 4px 12px rgba(34, 197, 94, 0.3)';
          }}
        >
          Submit Exam
        </button>
      </div>

      {/* Main Content */}
      <div style={{ marginLeft: '280px', flex: 1, padding: '40px', maxWidth: '900px' }}>
        <div style={{ background: 'white', padding: '40px', borderRadius: '16px', boxShadow: '0 2px 8px rgba(0,0,0,0.05)' }}>
          {examPaper.questions.map((question, idx) => (
            <div key={idx} id={`question-${question.number}`}>
              <QuestionRendererSimple
                question={question}
                questionPath={question.number}
                answers={answers}
                onAnswerChange={handleAnswerChange}
                level={0}
              />
            </div>
          ))}
        </div>
      </div>

      {/* Submit Confirmation Modal */}
      {showSubmitConfirm && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(0, 0, 0, 0.5)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000
        }}>
          <div style={{
            background: 'white',
            padding: '40px',
            borderRadius: '16px',
            maxWidth: '400px',
            textAlign: 'center'
          }}>
            <div style={{ fontSize: '3rem', marginBottom: '20px' }}>⚠️</div>
            <h3 style={{ fontSize: '1.5rem', color: '#1e293b', marginBottom: '12px' }}>
              Submit Exam?
            </h3>
            <p style={{ color: '#64748b', marginBottom: '24px' }}>
              Are you sure you want to submit? You won't be able to change your answers after submission.
            </p>
            <div style={{ display: 'flex', gap: '12px' }}>
              <button
                onClick={() => setShowSubmitConfirm(false)}
                style={{
                  flex: 1,
                  padding: '12px',
                  background: '#f1f5f9',
                  color: '#475569',
                  border: 'none',
                  borderRadius: '10px',
                  fontSize: '1rem',
                  fontWeight: '600',
                  cursor: 'pointer'
                }}
              >
                Cancel
              </button>
              <button
                onClick={handleSubmit}
                style={{
                  flex: 1,
                  padding: '12px',
                  background: 'linear-gradient(135deg, #22c55e 0%, #16a34a 100%)',
                  color: 'white',
                  border: 'none',
                  borderRadius: '10px',
                  fontSize: '1rem',
                  fontWeight: '600',
                  cursor: 'pointer'
                }}
              >
                Submit
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// Made with Bob
