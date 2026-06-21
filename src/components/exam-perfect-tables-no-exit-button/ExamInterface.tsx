'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { ExamPaper, StudentAnswer } from '@/lib/exam-new/types';
import QuestionRendererSimple from './QuestionRendererSimple';
import { TableRenderer } from '../exam/TableRenderer';
import '../exam/ExamStyles.css'; // Import table styles

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
  const [isPaused, setIsPaused] = useState(false);
  const [sidebarWidth, setSidebarWidth] = useState(220);
  const [isResizing, setIsResizing] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);

  // Toggle fullscreen
  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen();
      setIsFullscreen(true);
    } else {
      document.exitFullscreen();
      setIsFullscreen(false);
    }
  };

  // Listen for fullscreen changes
  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };
    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => document.removeEventListener('fullscreenchange', handleFullscreenChange);
  }, []);

  // Auto-save answers to localStorage whenever they change
  useEffect(() => {
    if (typeof window !== 'undefined') {
      localStorage.setItem(storageKey, JSON.stringify(answers));
    }
  }, [answers, storageKey]);

  // Timer countdown (pauses when isPaused is true)
  useEffect(() => {
    if (isPaused) return; // Don't run timer when paused
    
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
  }, [isPaused]);

  // Handle sidebar resizing
  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!isResizing) return;
      const newWidth = e.clientX;
      if (newWidth >= 180 && newWidth <= 400) {
        setSidebarWidth(newWidth);
      }
    };

    const handleMouseUp = () => {
      setIsResizing(false);
    };

    if (isResizing) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
    }

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isResizing]);

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
      
      // For fill-in-blank questions, add the parent question, not subparts
      if (q.type === 'fill_in_blank') {
        ids.push(qId);
        return; // Don't recurse into subparts
      }
      
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
    // For fill-in-blank questions, check if any subpart is answered
    const subpartAnswers = Object.keys(answers).filter(key => key.startsWith(questionId + '.'));
    
    if (subpartAnswers.length > 0) {
      // Check if any subpart is flagged
      const anyFlagged = subpartAnswers.some(key => answers[key]?.flagged);
      if (anyFlagged) return 'flagged';
      
      // Check if any subpart is answered
      const anyAnswered = subpartAnswers.some(key => {
        const answer = answers[key];
        return answer?.answer && (
          (typeof answer.answer === 'string' && answer.answer.trim().length > 0) ||
          (Array.isArray(answer.answer) && answer.answer.some(item =>
            item && typeof item === 'string' && item.trim().length > 0
          ))
        );
      });
      
      if (anyAnswered) return 'answered';
      return 'unanswered';
    }
    
    // For regular questions, check the question itself
    const answer = answers[questionId];
    
    // If flagged, always show as flagged regardless of answer status
    if (answer?.flagged) return 'flagged';
    
    // Check if answered
    const isAnswered = answer?.answer && (
      (typeof answer.answer === 'string' && answer.answer.trim().length > 0) ||
      (Array.isArray(answer.answer) && answer.answer.some(item =>
        item && typeof item === 'string' && item.trim().length > 0
      ))
    );
    
    // Show as answered only if not flagged
    if (isAnswered) return 'answered';
    
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
    <div style={{ display: 'flex', minHeight: '100vh', background: '#f8fafc', position: 'relative' }}>
      {/* Full Screen Pause Overlay - Covers Everything */}
      {isPaused && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'white',
          zIndex: 9999,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif'
        }}>
          <div style={{
            width: '120px',
            height: '120px',
            border: '3px solid #1f2937',
            borderRadius: '50%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            marginBottom: '32px',
            cursor: 'pointer',
            transition: 'all 0.15s',
            position: 'relative',
            background: 'white',
            boxShadow: '0 6px 0 #d1d5db, 0 8px 16px rgba(0, 0, 0, 0.2)',
            top: '0'
          }}
          onClick={() => setIsPaused(false)}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = '#f9fafb';
            e.currentTarget.style.boxShadow = '0 8px 0 #d1d5db, 0 10px 20px rgba(0, 0, 0, 0.25)';
            e.currentTarget.style.top = '-2px';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = 'white';
            e.currentTarget.style.boxShadow = '0 6px 0 #d1d5db, 0 8px 16px rgba(0, 0, 0, 0.2)';
            e.currentTarget.style.top = '0';
          }}
          onMouseDown={(e) => {
            e.currentTarget.style.boxShadow = '0 3px 0 #d1d5db, 0 4px 8px rgba(0, 0, 0, 0.2)';
            e.currentTarget.style.top = '3px';
          }}
          onMouseUp={(e) => {
            e.currentTarget.style.boxShadow = '0 6px 0 #d1d5db, 0 8px 16px rgba(0, 0, 0, 0.2)';
            e.currentTarget.style.top = '0';
          }}
          >
            {/* CSS Triangle - properly centered */}
            <div style={{
              width: 0,
              height: 0,
              borderLeft: '30px solid #1f2937',
              borderTop: '20px solid transparent',
              borderBottom: '20px solid transparent',
              marginLeft: '8px' // Slight offset to visually center the triangle
            }} />
          </div>
          <h1 style={{
            fontSize: '2rem',
            color: '#1f2937',
            marginBottom: '12px',
            fontWeight: '600',
            fontFamily: 'inherit'
          }}>
            Exam Paused
          </h1>
          <p style={{
            fontSize: '1rem',
            color: '#6b7280',
            marginBottom: '40px',
            textAlign: 'center',
            maxWidth: '500px',
            fontFamily: 'inherit'
          }}>
            Take a break. Your progress is saved.<br/>
            Click the play button to resume.
          </p>
          <div style={{
            padding: '16px 32px',
            background: '#f9fafb',
            border: '1px solid #e5e7eb',
            borderRadius: '8px',
            fontSize: '0.875rem',
            color: '#6b7280',
            fontFamily: 'inherit'
          }}>
            Time Remaining: <strong style={{ color: '#1f2937', fontSize: '1.25rem', marginLeft: '8px' }}>{formatTime(timeRemaining)}</strong>
          </div>
        </div>
      )}
      
      {/* Side Navigation */}
      <div style={{
        width: `${sidebarWidth}px`,
        background: 'white',
        borderRight: '1px solid #e5e7eb',
        padding: '20px',
        position: 'fixed',
        height: '100vh',
        overflowY: 'auto',
        transition: isResizing ? 'none' : 'width 0.2s ease',
        fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif'
      }}>
        {/* Timer */}
        <div style={{
          background: '#f9fafb',
          border: '1px solid #e5e7eb',
          padding: '16px',
          borderRadius: '8px',
          marginBottom: '20px',
          textAlign: 'center'
        }}>
          <div style={{ fontSize: '0.75rem', color: '#6b7280', marginBottom: '8px', fontFamily: 'inherit' }}>
            Time Remaining
          </div>
          <div style={{
            fontSize: '1.5rem',
            fontWeight: '600',
            fontFamily: 'monospace',
            color: '#1f2937'
          }}>
            {formatTime(timeRemaining)}
          </div>
        </div>

        {/* Progress Bar */}
        <div style={{ marginBottom: '20px' }}>
          <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: '8px'
          }}>
            <span style={{ fontSize: '0.75rem', fontWeight: '500', color: '#6b7280', fontFamily: 'inherit' }}>
              Progress
            </span>
            <span style={{ fontSize: '0.75rem', fontWeight: '600', color: '#1f2937', fontFamily: 'inherit' }}>
              {progress}%
            </span>
          </div>
          <div style={{
            height: '6px',
            background: '#e5e7eb',
            borderRadius: '3px',
            overflow: 'hidden'
          }}>
            <div style={{
              height: '100%',
              background: '#22c55e',
              borderRadius: '3px',
              width: `${progress}%`,
              transition: 'width 0.3s ease'
            }} />
          </div>
        </div>

        {/* Paper Info */}
        <div style={{ marginBottom: '20px', paddingBottom: '20px', borderBottom: '1px solid #e5e7eb' }}>
          <h3 style={{ fontSize: '0.875rem', fontWeight: '600', color: '#1f2937', marginBottom: '8px', fontFamily: 'inherit' }}>
            {examPaper.subject}
          </h3>
          <div style={{ fontSize: '0.75rem', color: '#6b7280', fontFamily: 'inherit' }}>
            {examPaper.season} {examPaper.year} • Variant {examPaper.variant}
          </div>
          <div style={{ fontSize: '0.75rem', color: '#6b7280', marginTop: '4px', fontFamily: 'inherit' }}>
            Total: {examPaper.totalMarks} marks
          </div>
        </div>

        {/* Question Navigation */}
        <div>
          <h4 style={{ fontSize: '0.75rem', fontWeight: '600', color: '#6b7280', marginBottom: '12px', fontFamily: 'inherit' }}>
            Questions
          </h4>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '6px' }}>
            {allQuestionIds.map((qId, idx) => {
              const status = getQuestionStatus(qId);
              let bgColor = '#f9fafb'; // unanswered
              let textColor = '#6b7280';
              let borderColor = '#e5e7eb';
              
              if (status === 'answered') {
                bgColor = '#f0fdf4';
                textColor = '#16a34a';
                borderColor = '#bbf7d0';
              } else if (status === 'flagged') {
                bgColor = '#fef3c7';
                textColor = '#d97706';
                borderColor = '#fde68a';
              }

              return (
                <button
                  key={qId}
                  onClick={() => {
                    const element = document.getElementById(`question-${qId}`);
                    element?.scrollIntoView({ behavior: 'smooth', block: 'start' });
                  }}
                  style={{
                    padding: '8px',
                    background: bgColor,
                    color: textColor,
                    border: `1px solid ${borderColor}`,
                    borderRadius: '4px',
                    fontSize: '0.75rem',
                    fontWeight: '500',
                    cursor: 'pointer',
                    transition: 'all 0.2s',
                    fontFamily: 'inherit'
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.borderColor = textColor;
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.borderColor = borderColor;
                  }}
                >
                  {qId}
                </button>
              );
            })}
          </div>
        </div>

        {/* Legend */}
        <div style={{ marginTop: '20px', padding: '12px', background: '#f9fafb', border: '1px solid #e5e7eb', borderRadius: '6px' }}>
          <div style={{ fontSize: '0.75rem', color: '#6b7280', marginBottom: '10px', fontWeight: '600', fontFamily: 'inherit' }}>
            Legend
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', fontSize: '0.75rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <div style={{ width: '14px', height: '14px', background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: '3px' }}></div>
              <span style={{ color: '#6b7280', fontFamily: 'inherit' }}>Answered</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <div style={{ width: '14px', height: '14px', background: '#fef3c7', border: '1px solid #fde68a', borderRadius: '3px' }}></div>
              <span style={{ color: '#6b7280', fontFamily: 'inherit' }}>Flagged</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <div style={{ width: '14px', height: '14px', background: '#f9fafb', border: '1px solid #e5e7eb', borderRadius: '3px' }}></div>
              <span style={{ color: '#6b7280', fontFamily: 'inherit' }}>Unanswered</span>
            </div>
          </div>
        </div>

        
        {/* Resize Handle */}
        <div
          onMouseDown={() => setIsResizing(true)}
          style={{
            position: 'absolute',
            right: 0,
            top: 0,
            bottom: 0,
            width: '8px',
            cursor: 'ew-resize',
            background: isResizing ? '#4F46E5' : 'transparent',
            transition: 'background 0.2s',
            zIndex: 10
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = '#e2e8f0';
          }}
          onMouseLeave={(e) => {
            if (!isResizing) e.currentTarget.style.background = 'transparent';
          }}
        />
      </div>

      {/* Main Content */}
      <div style={{ marginLeft: `${sidebarWidth}px`, flex: 1, display: 'flex', flexDirection: 'column', height: '100vh', transition: isResizing ? 'none' : 'margin-left 0.2s ease' }}>
        
        {/* Fixed Header Bar with 3 Buttons */}
        <div style={{
          position: 'sticky',
          top: 0,
          zIndex: 100,
          background: 'white',
          borderBottom: '1px solid #e5e7eb',
          padding: '16px 40px',
          display: 'flex',
          alignItems: 'center',
          gap: '12px',
          fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif'
        }}>
          {/* Submit Button */}
          <button
            onClick={() => setShowSubmitConfirm(true)}
            style={{
              padding: '10px 20px',
              background: '#1f2937',
              color: 'white',
              border: 'none',
              borderRadius: '12px',
              fontSize: '0.875rem',
              fontWeight: '500',
              cursor: 'pointer',
              transition: 'all 0.15s',
              whiteSpace: 'nowrap',
              fontFamily: 'inherit',
              boxShadow: '0 4px 0 #111827, 0 6px 12px rgba(0, 0, 0, 0.2)',
              position: 'relative',
              top: '0'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.boxShadow = '0 6px 0 #111827, 0 8px 16px rgba(0, 0, 0, 0.25)';
              e.currentTarget.style.top = '-2px';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.boxShadow = '0 4px 0 #111827, 0 6px 12px rgba(0, 0, 0, 0.2)';
              e.currentTarget.style.top = '0';
            }}
            onMouseDown={(e) => {
              e.currentTarget.style.boxShadow = '0 2px 0 #111827, 0 3px 6px rgba(0, 0, 0, 0.2)';
              e.currentTarget.style.top = '2px';
            }}
            onMouseUp={(e) => {
              e.currentTarget.style.boxShadow = '0 4px 0 #111827, 0 6px 12px rgba(0, 0, 0, 0.2)';
              e.currentTarget.style.top = '0';
            }}
          >
            Submit
          </button>

          {/* Pause/Resume Button */}
          <button
            onClick={() => setIsPaused(!isPaused)}
            style={{
              padding: '10px 20px',
              background: 'white',
              color: '#1f2937',
              border: '2px solid #e5e7eb',
              borderRadius: '12px',
              fontSize: '0.875rem',
              fontWeight: '500',
              cursor: 'pointer',
              transition: 'all 0.15s',
              whiteSpace: 'nowrap',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              fontFamily: 'inherit',
              boxShadow: '0 4px 0 #d1d5db, 0 6px 12px rgba(0, 0, 0, 0.15)',
              position: 'relative',
              top: '0'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = '#f9fafb';
              e.currentTarget.style.boxShadow = '0 6px 0 #d1d5db, 0 8px 16px rgba(0, 0, 0, 0.2)';
              e.currentTarget.style.top = '-2px';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = 'white';
              e.currentTarget.style.boxShadow = '0 4px 0 #d1d5db, 0 6px 12px rgba(0, 0, 0, 0.15)';
              e.currentTarget.style.top = '0';
            }}
            onMouseDown={(e) => {
              e.currentTarget.style.boxShadow = '0 2px 0 #d1d5db, 0 3px 6px rgba(0, 0, 0, 0.15)';
              e.currentTarget.style.top = '2px';
            }}
            onMouseUp={(e) => {
              e.currentTarget.style.boxShadow = '0 4px 0 #d1d5db, 0 6px 12px rgba(0, 0, 0, 0.15)';
              e.currentTarget.style.top = '0';
            }}
          >
            <div style={{
              width: '18px',
              height: '18px',
              border: '2px solid #1f2937',
              borderRadius: '50%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '10px',
              color: '#1f2937'
            }}>
              {isPaused ? '▶' : '❚❚'}
            </div>
            {isPaused ? 'Resume' : 'Pause'}
          </button>

          {/* Spacer */}
          <div style={{ flex: 1 }}></div>

          {/* Fullscreen Toggle */}
          <button
            onClick={toggleFullscreen}
            style={{
              padding: '10px 20px',
              background: 'white',
              color: '#6b7280',
              border: '2px solid #e5e7eb',
              borderRadius: '12px',
              fontSize: '0.875rem',
              fontWeight: '500',
              cursor: 'pointer',
              transition: 'all 0.15s',
              whiteSpace: 'nowrap',
              fontFamily: 'inherit',
              boxShadow: '0 4px 0 #d1d5db, 0 6px 12px rgba(0, 0, 0, 0.15)',
              position: 'relative',
              top: '0'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = '#f9fafb';
              e.currentTarget.style.boxShadow = '0 6px 0 #d1d5db, 0 8px 16px rgba(0, 0, 0, 0.2)';
              e.currentTarget.style.top = '-2px';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = 'white';
              e.currentTarget.style.boxShadow = '0 4px 0 #d1d5db, 0 6px 12px rgba(0, 0, 0, 0.15)';
              e.currentTarget.style.top = '0';
            }}
            onMouseDown={(e) => {
              e.currentTarget.style.boxShadow = '0 2px 0 #d1d5db, 0 3px 6px rgba(0, 0, 0, 0.15)';
              e.currentTarget.style.top = '2px';
            }}
            onMouseUp={(e) => {
              e.currentTarget.style.boxShadow = '0 4px 0 #d1d5db, 0 6px 12px rgba(0, 0, 0, 0.15)';
              e.currentTarget.style.top = '0';
            }}
          >
            {isFullscreen ? 'Exit Fullscreen' : 'Fullscreen'}
          </button>
        </div>

        {/* Scrollable Content Area */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '24px', maxWidth: '1200px' }}>
            <div style={{ background: 'white', padding: '24px', borderRadius: '8px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
              {examPaper.questions.map((question, idx) => {
                // Calculate which page this question is likely on
                // Rough estimate: ~2-3 questions per page
                const estimatedPage = Math.floor(idx / 2.5) + 2; // +2 because page 1 is cover
                
                // Get tables for this question's estimated page and adjacent pages
                const questionTables: { [page: string]: any[] } = {};
                if ((examPaper as any).tables) {
                  for (let p = estimatedPage - 1; p <= estimatedPage + 1; p++) {
                    const pageKey = p.toString();
                    if ((examPaper as any).tables[pageKey]) {
                      questionTables[pageKey] = (examPaper as any).tables[pageKey];
                    }
                  }
                }
                
                const hasTables = Object.keys(questionTables).length > 0;
                
                return (
                  <div key={idx} id={`question-${question.number}`}>
                    <QuestionRendererSimple
                      question={question}
                      questionPath={question.number}
                      answers={answers}
                      onAnswerChange={handleAnswerChange}
                      level={0}
                      hasTables={hasTables}
                    />
                    
                    {/* Render tables associated with this question */}
                    {hasTables && (
                      <TableRenderer
                        tables={questionTables}
                        onAnswerChange={(tableId, tableAnswers) => {
                          handleAnswerChange(`table_${tableId}`, JSON.stringify(tableAnswers));
                        }}
                        savedAnswers={
                          Object.keys(answers)
                            .filter(key => key.startsWith('table_'))
                            .reduce((acc, key) => {
                              const tableId = key.replace('table_', '');
                              try {
                                acc[tableId] = JSON.parse(answers[key].answer as string);
                              } catch (e) {
                                // Invalid JSON, skip
                              }
                              return acc;
                            }, {} as { [tableId: string]: { [rowIndex: number]: number } })
                        }
                      />
                    )}
                  </div>
                );
              })}
            </div>
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
          background: 'rgba(0, 0, 0, 0.4)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000,
          fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif'
        }}>
          <div style={{
            background: 'white',
            padding: '32px',
            borderRadius: '8px',
            maxWidth: '400px',
            textAlign: 'center',
            border: '1px solid #e5e7eb'
          }}>
            <div style={{
              fontSize: '2.5rem',
              marginBottom: '16px',
              color: '#f59e0b'
            }}>⚠</div>
            <h3 style={{
              fontSize: '1.25rem',
              color: '#1f2937',
              marginBottom: '12px',
              fontWeight: '600',
              fontFamily: 'inherit'
            }}>
              Submit Exam?
            </h3>
            <p style={{
              color: '#6b7280',
              marginBottom: '24px',
              fontSize: '0.875rem',
              lineHeight: '1.5',
              fontFamily: 'inherit'
            }}>
              Are you sure you want to submit? You won't be able to change your answers after submission.
            </p>
            <div style={{ display: 'flex', gap: '12px' }}>
              <button
                onClick={() => setShowSubmitConfirm(false)}
                style={{
                  flex: 1,
                  padding: '10px 20px',
                  background: 'white',
                  color: '#6b7280',
                  border: '1px solid #e5e7eb',
                  borderRadius: '6px',
                  fontSize: '0.875rem',
                  fontWeight: '500',
                  cursor: 'pointer',
                  transition: 'all 0.2s',
                  fontFamily: 'inherit'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = '#f9fafb';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = 'white';
                }}
              >
                Cancel
              </button>
              <button
                onClick={handleSubmit}
                style={{
                  flex: 1,
                  padding: '10px 20px',
                  background: '#22c55e',
                  color: 'white',
                  border: 'none',
                  borderRadius: '6px',
                  fontSize: '0.875rem',
                  fontWeight: '500',
                  cursor: 'pointer',
                  transition: 'all 0.2s',
                  fontFamily: 'inherit'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = '#16a34a';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = '#22c55e';
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
