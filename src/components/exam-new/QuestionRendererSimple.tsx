'use client';

import React from 'react';
import { ExamQuestion, StudentAnswer } from '@/lib/exam-new/types';

// Text normalization function
const normalizeText = (text: string): string => {
  if (!text) return text;
  
  // Remove copyright text
  const copyrightStart = text.indexOf('Permission to reproduce items');
  if (copyrightStart !== -1) {
    text = text.substring(0, copyrightStart);
  }
  
  // Fix common PDF extraction errors
  const fixes: [RegExp, string][] = [
    // Words ending in 'ing'
    [/process\s*in\s*g/gi, 'processing'],
    [/us\s*in\s*g/gi, 'using'],
    [/stor\s*in\s*g/gi, 'storing'],
    [/enter\s*in\s*g/gi, 'entering'],
    [/format\s*t\s*in\s*g/gi, 'formatting'],
    [/monitor\s*in\s*g/gi, 'monitoring'],
    [/track\s*in\s*g/gi, 'tracking'],
    
    // Common spacing issues
    [/\s+/g, ' '], // Multiple spaces to single
    [/([a-z])([A-Z])/g, '$1 $2'], // Add space between camelCase
    [/(\d+)([a-z])/gi, '$1 $2'], // Space between number and letter
    
    // Common word fixes
    [/d\s*at\s*a/gi, 'data'],
    [/in\s*form\s*at\s*i\s*on/gi, 'information'],
    [/c\s*on\s*ta\s*in/gi, 'contain'],
    [/de\s*vice/gi, 'device'],
    [/ne\s*two\s*rk/gi, 'network'],
    [/s\s*of\s*tw\s*are/gi, 'software'],
    [/hardw\s*are/gi, 'hardware'],
  ];
  
  fixes.forEach(([pattern, replacement]) => {
    text = text.replace(pattern, replacement);
  });
  
  return text.trim();
};

interface QuestionRendererProps {
  question: ExamQuestion;
  questionPath: string;
  answers: { [questionId: string]: StudentAnswer };
  onAnswerChange: (questionId: string, answer: StudentAnswer['answer'], flagged?: boolean) => void;
  level: number;
}

const QuestionRendererSimple: React.FC<QuestionRendererProps> = ({
  question,
  questionPath,
  answers,
  onAnswerChange,
  level,
}) => {
  const currentAnswer = answers[questionPath];
  const isFlagged = currentAnswer?.flagged || false;

  const handleTextChange = (value: string) => {
    onAnswerChange(questionPath, value, isFlagged);
  };

  const handleOptionToggle = (option: string) => {
    const currentSelections = (currentAnswer?.answer as string[]) || [];
    // Use marks to determine max selections, default to 1 if not specified
    const maxSelections = question.maxSelections || question.marks || 1;
    
    let newSelections: string[];
    if (currentSelections.includes(option)) {
      newSelections = currentSelections.filter(o => o !== option);
    } else {
      if (currentSelections.length >= maxSelections) {
        newSelections = [...currentSelections.slice(1), option];
      } else {
        newSelections = [...currentSelections, option];
      }
    }
    
    onAnswerChange(questionPath, newSelections, isFlagged);
  };

  const toggleFlag = () => {
    onAnswerChange(questionPath, currentAnswer?.answer || '', !isFlagged);
  };

  const renderAnswerInput = () => {
    const marks = question.marks || 0;
    const type = question.type || 'text';

    // MCQ - Selection chips
    if (type === 'mcq' && question.options) {
      return (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px', marginTop: '15px' }}>
          {question.options.map((option) => {
            const isSelected = ((currentAnswer?.answer as string[]) || []).includes(option);
            return (
              <button
                key={option}
                onClick={() => handleOptionToggle(option)}
                style={{
                  padding: '8px 15px',
                  borderRadius: '20px',
                  border: isSelected ? '2px solid #005eb8' : '1px solid #005eb8',
                  background: isSelected ? '#005eb8' : 'white',
                  color: isSelected ? 'white' : '#005eb8',
                  cursor: 'pointer',
                  fontSize: '0.95rem',
                  fontWeight: isSelected ? 'bold' : 'normal',
                  transition: 'all 0.2s',
                }}
              >
                {option}
              </button>
            );
          })}
        </div>
      );
    }

    // Paired List - Method + Description
    if (type === 'paired_list') {
      const pairCount = Math.ceil(marks / 2);
      return (
        <div style={{ marginTop: '15px' }}>
          {Array.from({ length: pairCount }).map((_, i) => (
            <div
              key={i}
              style={{
                display: 'flex',
                gap: '10px',
                marginBottom: '15px',
                alignItems: 'center',
              }}
            >
              <span style={{ fontWeight: 'bold', minWidth: '20px' }}>{i + 1}.</span>
              <input
                placeholder={question.labels?.[0] || 'Method/Rule'}
                style={{
                  flex: 1,
                  border: 'none',
                  borderBottom: '1px dotted #444',
                  padding: '8px 0',
                  outline: 'none',
                  fontSize: '1rem',
                }}
              />
              <input
                placeholder={question.labels?.[1] || 'Description/Example'}
                style={{
                  flex: 2,
                  border: 'none',
                  borderBottom: '1px dotted #444',
                  padding: '8px 0',
                  outline: 'none',
                  fontSize: '1rem',
                }}
              />
            </div>
          ))}
        </div>
      );
    }

    // Numbered List - 1, 2, 3...
    if (type === 'numbered_list') {
      const itemCount = question.listCount || marks;
      const currentAnswers = (currentAnswer?.answer as string[]) || [];
      
      return (
        <div style={{ marginTop: '15px' }}>
          {Array.from({ length: itemCount }).map((_, i) => (
            <div
              key={i}
              style={{
                display: 'flex',
                alignItems: 'center',
                marginBottom: '10px',
              }}
            >
              <span style={{ marginRight: '10px', fontWeight: 'bold' }}>{i + 1}.</span>
              <input
                value={currentAnswers[i] || ''}
                onChange={(e) => {
                  const newAnswers = [...currentAnswers];
                  newAnswers[i] = e.target.value;
                  onAnswerChange(questionPath, newAnswers, isFlagged);
                }}
                style={{
                  flex: 1,
                  border: 'none',
                  borderBottom: '1px dotted #444',
                  padding: '8px 0',
                  outline: 'none',
                  fontSize: '1rem',
                }}
                placeholder="Write your answer..."
              />
            </div>
          ))}
        </div>
      );
    }

    // Essay - Large text area with lines
    if (type === 'essay' || marks >= 4) {
      const rows = Math.max(8, marks * 2);
      return (
        <textarea
          value={(currentAnswer?.answer as string) || ''}
          onChange={(e) => handleTextChange(e.target.value)}
          rows={rows}
          style={{
            width: '100%',
            border: '1px solid #ddd',
            padding: '10px',
            lineHeight: '2em',
            backgroundImage: 'linear-gradient(transparent 1.9em, #eee 1.9em)',
            backgroundSize: '100% 2em',
            outline: 'none',
            fontSize: '1rem',
            marginTop: '15px',
            resize: 'vertical',
          }}
          placeholder="Write your answer here..."
        />
      );
    }

    // Default: Short answer - single line
    return (
      <input
        value={(currentAnswer?.answer as string) || ''}
        onChange={(e) => handleTextChange(e.target.value)}
        style={{
          width: '100%',
          border: 'none',
          borderBottom: '1px dotted #444',
          padding: '8px 0',
          outline: 'none',
          fontSize: '1rem',
          marginTop: '15px',
        }}
        placeholder="Write your answer..."
      />
    );
  };

  return (
    <div
      id={`question-${questionPath}`}
      style={{
        background: '#fff',
        padding: '20px',
        marginBottom: level === 0 ? '30px' : '20px',
        borderRadius: '8px',
        boxShadow: level === 0 ? '0 2px 5px rgba(0,0,0,0.1)' : 'none',
        marginLeft: level > 0 ? '20px' : '0',
        scrollMarginTop: '20px',
      }}
    >
      {/* Question Header */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: '15px',
          borderBottom: level === 0 ? '2px solid #000' : '1px solid #ddd',
          paddingBottom: '10px',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <span style={{ fontWeight: 'bold', fontSize: level === 0 ? '1.2rem' : '1rem' }}>
            {level === 0 ? `Question ${question.number}` : `(${question.number})`}
          </span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
          {question.marks !== null && (
            <span style={{ fontWeight: 'bold', fontSize: '1rem' }}>
              [{question.marks}]
            </span>
          )}
          <button
            onClick={toggleFlag}
            style={{
              background: 'transparent',
              border: 'none',
              cursor: 'pointer',
              fontSize: '1.2rem',
              padding: '5px',
            }}
            title={isFlagged ? 'Unflag question' : 'Flag for review'}
          >
            {isFlagged ? '🚩' : '⚑'}
          </button>
        </div>
      </div>

      {/* Question Text */}
      <p style={{ margin: '15px 0', fontSize: '1.05rem', lineHeight: '1.6' }}>
        {normalizeText(question.text)}
      </p>

      {/* Question Image */}
      {question.image && (
        <div style={{ margin: '20px 0' }}>
          <img
            src={question.image.url}
            alt={question.image.alt}
            style={{
              maxWidth: '100%',
              height: 'auto',
              borderRadius: '8px',
              border: '1px solid #e2e8f0',
              boxShadow: '0 2px 8px rgba(0,0,0,0.1)'
            }}
          />
          {question.image.caption && (
            <p style={{
              fontSize: '0.9rem',
              color: '#64748b',
              fontStyle: 'italic',
              marginTop: '8px',
              textAlign: 'center'
            }}>
              {question.image.caption}
            </p>
          )}
        </div>
      )}

      {/* Question Table */}
      {question.table && (
        <div style={{ margin: '20px 0', overflowX: 'auto' }}>
          <table style={{
            width: '100%',
            borderCollapse: 'collapse',
            border: '2px solid #1e293b',
            fontSize: '0.95rem'
          }}>
            <thead>
              <tr style={{ background: '#f8fafc' }}>
                {question.table.headers.map((header, idx) => (
                  <th key={idx} style={{
                    padding: '12px',
                    border: '1px solid #1e293b',
                    fontWeight: '600',
                    textAlign: 'left',
                    color: '#1e293b'
                  }}>
                    {header}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {question.table.rows.map((row, rowIdx) => (
                <tr key={rowIdx}>
                  {row.map((cell, cellIdx) => (
                    <td key={cellIdx} style={{
                      padding: '12px',
                      border: '1px solid #1e293b',
                      color: '#1e293b'
                    }}>
                      {cell}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Answer Input (only if not a parent question) */}
      {question.marks !== null && renderAnswerInput()}

      {/* Subparts */}
      {question.subparts && question.subparts.length > 0 && (
        <div style={{ marginTop: '20px' }}>
          {question.subparts.map((subpart) => (
            <QuestionRendererSimple
              key={subpart.number}
              question={subpart}
              questionPath={`${questionPath}.${subpart.number}`}
              answers={answers}
              onAnswerChange={onAnswerChange}
              level={level + 1}
            />
          ))}
        </div>
      )}
    </div>
  );
};

export default QuestionRendererSimple;

// Made with Bob
