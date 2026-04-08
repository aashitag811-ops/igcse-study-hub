'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { ExamPaper, QuestionPart, ExamState, QuestionStatus } from '@/lib/exam-new/types';

interface ExamInterfaceProps {
  examPaper: ExamPaper;
  onSubmit?: (answers: { [questionId: string]: string }) => void;
}

export function ExamInterface({ examPaper, onSubmit }: ExamInterfaceProps) {
  const [examState, setExamState] = useState<ExamState>({
    answers: {},
    statuses: {},
    startTime: Date.now(),
    timeRemaining: examPaper.duration * 60 // Convert minutes to seconds
  });

  const [activeQuestionId, setActiveQuestionId] = useState<string | null>(null);
  const questionRefs = useRef<{ [key: string]: HTMLDivElement | null }>({});

  // Initialize statuses for all question parts
  useEffect(() => {
    const initialStatuses: { [key: string]: QuestionStatus } = {};
    examPaper.questions.forEach(q => {
      q.parts.forEach(part => {
        initialStatuses[part.id] = {
          attempted: false,
          flagged: false,
          answered: false
        };
      });
    });
    setExamState(prev => ({ ...prev, statuses: initialStatuses }));
  }, [examPaper]);

  // Timer countdown
  useEffect(() => {
    const interval = setInterval(() => {
      setExamState(prev => {
        const newTimeRemaining = prev.timeRemaining - 1;
        if (newTimeRemaining <= 0) {
          clearInterval(interval);
          // Auto-submit when time runs out
          if (onSubmit) {
            onSubmit(prev.answers);
          }
          return { ...prev, timeRemaining: 0 };
        }
        return { ...prev, timeRemaining: newTimeRemaining };
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [onSubmit]);

  // Format time as HH:MM:SS
  const formatTime = (seconds: number): string => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  // Handle answer change
  const handleAnswerChange = (questionId: string, value: string) => {
    setExamState(prev => ({
      ...prev,
      answers: { ...prev.answers, [questionId]: value },
      statuses: {
        ...prev.statuses,
        [questionId]: {
          ...prev.statuses[questionId],
          attempted: true,
          answered: value.trim().length > 0
        }
      }
    }));
  };

  // Toggle flag status
  const toggleFlag = (questionId: string) => {
    setExamState(prev => ({
      ...prev,
      statuses: {
        ...prev.statuses,
        [questionId]: {
          ...prev.statuses[questionId],
          flagged: !prev.statuses[questionId]?.flagged
        }
      }
    }));
  };

  // Scroll to question
  const scrollToQuestion = (questionId: string) => {
    const element = questionRefs.current[questionId];
    if (element) {
      element.scrollIntoView({ behavior: 'smooth', block: 'center' });
      setActiveQuestionId(questionId);
    }
  };

  // Get all question IDs for navigation
  const getAllQuestionIds = (): string[] => {
    const ids: string[] = [];
    examPaper.questions.forEach(q => {
      q.parts.forEach(part => {
        if (part.level === 0 || part.level === 1) {
          ids.push(part.id);
        }
      });
    });
    return ids;
  };

  // Get status color
  const getStatusColor = (questionId: string): string => {
    const status = examState.statuses[questionId];
    if (!status) return '#e2e8f0'; // gray - not loaded
    if (status.flagged) return '#fbbf24'; // yellow - flagged
    if (status.answered) return '#10b981'; // green - answered
    if (status.attempted) return '#f59e0b'; // orange - attempted but not answered
    return '#ef4444'; // red - not attempted
  };

  // Check if a part has children (sub-parts)
  const hasChildren = (partId: string, allParts: QuestionPart[]): boolean => {
    return allParts.some(p => p.parentId === partId);
  };

  // Render question part with proper indentation
  const renderQuestionPart = (part: QuestionPart, question: any, allParts: QuestionPart[]) => {
    const indentLevel = part.level * 30; // 30px per level
    const hasSubParts = hasChildren(part.id, allParts);
    const shouldShowInput = !hasSubParts && part.marks > 0; // Only show input if no children and has marks
    
    return (
      <div
        key={part.id}
        ref={el => { questionRefs.current[part.id] = el; }}
        style={{
          marginLeft: `${indentLevel}px`,
          marginBottom: shouldShowInput ? '20px' : '10px',
          position: 'relative'
        }}
      >
        {/* Question label and text */}
        <div style={{ marginBottom: shouldShowInput ? '10px' : '5px' }}>
          {part.level === 0 && (
            <div style={{
              fontSize: '1.2rem',
              fontWeight: '700',
              color: '#1a202c',
              marginBottom: '10px'
            }}>
              Question {question.number}
            </div>
          )}
          {part.level === 1 && (
            <div style={{
              fontSize: '1rem',
              fontWeight: '600',
              color: '#2d3748',
              marginBottom: '8px'
            }}>
              ({part.id.slice(-1)})
            </div>
          )}
          {part.level === 2 && (
            <div style={{
              fontSize: '0.95rem',
              fontWeight: '600',
              color: '#4a5568',
              marginBottom: '8px'
            }}>
              ({part.id.slice(-2)})
            </div>
          )}
          
          {part.text && (
            <div style={{
              fontSize: '0.95rem',
              color: '#4a5568',
              lineHeight: '1.6',
              marginBottom: shouldShowInput ? '12px' : '8px'
            }}>
              {part.text}
            </div>
          )}
        </div>

        {/* Answer input box - only show if this is a leaf node */}
        {shouldShowInput && (
          <>
            <div style={{ position: 'relative' }}>
              <textarea
                value={examState.answers[part.id] || ''}
                onChange={(e) => handleAnswerChange(part.id, e.target.value)}
                placeholder="Type your answer here..."
                style={{
                  width: '100%',
                  minHeight: '80px',
                  padding: '12px',
                  fontSize: '0.95rem',
                  border: '2px solid #e2e8f0',
                  borderRadius: '8px',
                  background: '#f0f9ff',
                  resize: 'vertical',
                  fontFamily: 'inherit',
                  outline: 'none',
                  transition: 'all 0.3s'
                }}
                onFocus={(e) => {
                  e.target.style.borderColor = '#3b82f6';
                  e.target.style.background = '#eff6ff';
                }}
                onBlur={(e) => {
                  e.target.style.borderColor = '#e2e8f0';
                  e.target.style.background = '#f0f9ff';
                }}
              />
              
              {/* Marks badge */}
              <div style={{
                position: 'absolute',
                bottom: '-10px',
                right: '10px',
                background: 'white',
                border: '2px solid #e2e8f0',
                borderRadius: '6px',
                padding: '4px 10px',
                fontSize: '0.85rem',
                fontWeight: '600',
                color: '#4a5568'
              }}>
                [{part.marks}]
              </div>
            </div>

            {/* Flag button */}
            <button
              onClick={() => toggleFlag(part.id)}
              style={{
                marginTop: '15px',
                padding: '6px 12px',
                fontSize: '0.85rem',
                background: examState.statuses[part.id]?.flagged ? '#fbbf24' : 'white',
                color: examState.statuses[part.id]?.flagged ? 'white' : '#6b7280',
                border: '2px solid #e2e8f0',
                borderRadius: '6px',
                cursor: 'pointer',
                fontWeight: '600',
                transition: 'all 0.3s'
              }}
              onMouseEnter={(e) => {
                if (!examState.statuses[part.id]?.flagged) {
                  e.currentTarget.style.borderColor = '#fbbf24';
                  e.currentTarget.style.color = '#fbbf24';
                }
              }}
              onMouseLeave={(e) => {
                if (!examState.statuses[part.id]?.flagged) {
                  e.currentTarget.style.borderColor = '#e2e8f0';
                  e.currentTarget.style.color = '#6b7280';
                }
              }}
            >
              {examState.statuses[part.id]?.flagged ? '🚩 Flagged for Review' : '🏳️ Mark for Review'}
            </button>
          </>
        )}
      </div>
    );
  };

  return (
    <div style={{ 
      display: 'flex', 
      minHeight: '100vh',
      background: '#f5f5f5'
    }}>
      {/* Main content area */}
      <div style={{ 
        flex: 1, 
        padding: '20px',
        maxWidth: '900px',
        margin: '0 auto'
      }}>
        {/* Header with timer */}
        <div style={{
          background: 'white',
          padding: '20px',
          borderRadius: '12px',
          marginBottom: '20px',
          boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center'
        }}>
          <div>
            <h1 style={{ 
              fontSize: '1.5rem', 
              fontWeight: '700', 
              color: '#1a202c',
              margin: 0
            }}>
              {examPaper.subject} - {examPaper.season} {examPaper.year}
            </h1>
            <p style={{ 
              fontSize: '0.9rem', 
              color: '#6b7280',
              margin: '5px 0 0 0'
            }}>
              Variant {examPaper.variant} • Total Marks: {examPaper.totalMarks}
            </p>
          </div>
          
          {/* Timer */}
          <div style={{
            background: examState.timeRemaining < 600 ? '#fee2e2' : '#eff6ff',
            padding: '15px 25px',
            borderRadius: '10px',
            border: `2px solid ${examState.timeRemaining < 600 ? '#fca5a5' : '#93c5fd'}`
          }}>
            <div style={{ 
              fontSize: '0.75rem', 
              color: '#6b7280',
              marginBottom: '5px',
              textAlign: 'center'
            }}>
              Time Remaining
            </div>
            <div style={{ 
              fontSize: '1.8rem', 
              fontWeight: '700',
              color: examState.timeRemaining < 600 ? '#dc2626' : '#2563eb',
              fontFamily: 'monospace'
            }}>
              {formatTime(examState.timeRemaining)}
            </div>
          </div>
        </div>

        {/* Questions */}
        <div style={{
          background: 'white',
          padding: '30px',
          borderRadius: '12px',
          boxShadow: '0 2px 8px rgba(0,0,0,0.1)'
        }}>
          {examPaper.questions.map(question => (
            <div key={question.number} style={{ marginBottom: '40px' }}>
              {question.parts.map(part => renderQuestionPart(part, question, question.parts))}
            </div>
          ))}
        </div>

        {/* Submit button */}
        <div style={{ 
          marginTop: '30px',
          textAlign: 'center'
        }}>
          <button
            onClick={() => onSubmit && onSubmit(examState.answers)}
            style={{
              padding: '15px 40px',
              fontSize: '1.1rem',
              fontWeight: '600',
              background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
              color: 'white',
              border: 'none',
              borderRadius: '10px',
              cursor: 'pointer',
              boxShadow: '0 4px 15px rgba(102, 126, 234, 0.4)',
              transition: 'all 0.3s'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.transform = 'translateY(-2px)';
              e.currentTarget.style.boxShadow = '0 6px 20px rgba(102, 126, 234, 0.5)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.transform = 'translateY(0)';
              e.currentTarget.style.boxShadow = '0 4px 15px rgba(102, 126, 234, 0.4)';
            }}
          >
            Submit Exam
          </button>
        </div>
      </div>

      {/* Side navigation panel */}
      <div style={{
        width: '250px',
        background: 'white',
        padding: '20px',
        boxShadow: '-2px 0 8px rgba(0,0,0,0.1)',
        position: 'sticky',
        top: 0,
        height: '100vh',
        overflowY: 'auto'
      }}>
        <h3 style={{ 
          fontSize: '1rem', 
          fontWeight: '700',
          color: '#1a202c',
          marginBottom: '15px'
        }}>
          Question Navigator
        </h3>

        <div style={{ 
          display: 'grid',
          gridTemplateColumns: 'repeat(3, 1fr)',
          gap: '8px',
          marginBottom: '20px'
        }}>
          {getAllQuestionIds().map(qId => (
            <button
              key={qId}
              onClick={() => scrollToQuestion(qId)}
              style={{
                padding: '10px',
                fontSize: '0.85rem',
                fontWeight: '600',
                background: getStatusColor(qId),
                color: 'white',
                border: activeQuestionId === qId ? '3px solid #1a202c' : 'none',
                borderRadius: '6px',
                cursor: 'pointer',
                transition: 'all 0.3s'
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
          ))}
        </div>

        {/* Legend */}
        <div style={{ 
          fontSize: '0.75rem',
          color: '#6b7280',
          borderTop: '1px solid #e2e8f0',
          paddingTop: '15px'
        }}>
          <div style={{ marginBottom: '8px', fontWeight: '600' }}>Legend:</div>
          <div style={{ display: 'flex', alignItems: 'center', marginBottom: '6px' }}>
            <div style={{ width: '16px', height: '16px', background: '#10b981', borderRadius: '3px', marginRight: '8px' }}></div>
            <span>Answered</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', marginBottom: '6px' }}>
            <div style={{ width: '16px', height: '16px', background: '#fbbf24', borderRadius: '3px', marginRight: '8px' }}></div>
            <span>Flagged</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', marginBottom: '6px' }}>
            <div style={{ width: '16px', height: '16px', background: '#ef4444', borderRadius: '3px', marginRight: '8px' }}></div>
            <span>Not Attempted</span>
          </div>
        </div>
      </div>
    </div>
  );
}

// Made with Bob
