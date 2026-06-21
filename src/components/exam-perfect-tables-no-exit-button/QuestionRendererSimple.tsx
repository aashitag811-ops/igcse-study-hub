'use client';

import React from 'react';
import { ExamQuestion, StudentAnswer } from '@/lib/exam-new/types';

// Text normalization function - ULTRA AGGRESSIVE VERSION
const normalizeText = (text: string): string => {
  if (!text) return text;
  
  // Remove copyright text
  const copyrightStart = text.indexOf('Permission to reproduce items');
  if (copyrightStart !== -1) {
    text = text.substring(0, copyrightStart);
  }
  
  // ULTRA AGGRESSIVE: Fix character-level spacing
  // Pattern 1: Single letters with spaces (e.g., "M a s on" -> "Mason")
  // Run multiple times to catch all patterns
  for (let i = 0; i < 15; i++) {
    // Fix lowercase letter sequences with spaces
    text = text.replace(/\b([a-z])\s+([a-z])\b/gi, '$1$2');
    // Fix mixed case sequences
    text = text.replace(/([a-zA-Z])\s+([a-z])/g, '$1$2');
    // Fix at word boundaries
    text = text.replace(/([a-z])\s+([a-z])(?=\s)/gi, '$1$2');
  }
  
  // Pattern 2: Common broken word patterns (most comprehensive list)
  const brokenWords: [RegExp, string][] = [
    // Names and common words from examples
    [/M\s*a\s*s\s*o\s*n/gi, 'Mason'],
    [/p\s*a\s*re\s*n\s*ts/gi, 'parents'],
    [/h\s*e\s*a\s*d/gi, 'head'],
    [/ye\s*a\s*r\s*g\s*ro\s*u\s*p/gi, 'yeargroup'],
    [/s\s*c\s*h\s*o\s*o\s*l/gi, 'school'],
    [/re\s*p\s*o\s*r\s*t/gi, 'report'],
    [/wr\s*i\s*t\s*t\s*e\s*n/gi, 'written'],
    [/c\s*o\s*m\s*m\s*e\s*n\s*ts/gi, 'comments'],
    [/t\s*u\s*t\s*o\s*rs/gi, 'tutors'],
    [/m\s*a\s*i\s*l/gi, 'mail'],
    [/m\s*e\s*r\s*g\s*e/gi, 'merge'],
    [/p\s*r\s*i\s*n\s*t/gi, 'print'],
    
    // Tech terms
    [/d\s*a\s*t\s*a\s*b\s*a\s*s\s*e/gi, 'database'],
    [/s\s*o\s*f\s*t\s*w\s*a\s*r\s*e/gi, 'software'],
    [/c\s*o\s*m\s*p\s*u\s*t\s*e\s*r/gi, 'computer'],
    [/n\s*e\s*t\s*w\s*o\s*r\s*k/gi, 'network'],
    [/d\s*e\s*v\s*i\s*c\s*e/gi, 'device'],
    [/t\s*a\s*b\s*l\s*e\s*t/gi, 'tablet'],
    [/l\s*a\s*p\s*t\s*o\s*p/gi, 'laptop'],
    [/d\s*a\s*t\s*a/gi, 'data'],
    
    // Common words
    [/i\s*n\s*f\s*o\s*r\s*m\s*a\s*t\s*i\s*o\s*n/gi, 'information'],
    [/p\s*e\s*r\s*c\s*e\s*n\s*t\s*a\s*g\s*e/gi, 'percentage'],
    [/a\s*t\s*t\s*e\s*n\s*d\s*a\s*n\s*c\s*e/gi, 'attendance'],
    [/v\s*a\s*l\s*i\s*d\s*a\s*t\s*i\s*o\s*n/gi, 'validation'],
    [/r\s*o\s*u\s*t\s*i\s*n\s*e/gi, 'routine'],
    [/c\s*o\s*n\s*t\s*a\s*i\s*n/gi, 'contain'],
    
    // -ing words
    [/p\s*r\s*o\s*c\s*e\s*s\s*s\s*i\s*n\s*g/gi, 'processing'],
    [/u\s*s\s*i\s*n\s*g/gi, 'using'],
    [/s\s*t\s*o\s*r\s*i\s*n\s*g/gi, 'storing'],
    [/e\s*n\s*t\s*e\s*r\s*i\s*n\s*g/gi, 'entering'],
    [/f\s*o\s*r\s*m\s*a\s*t\s*t\s*i\s*n\s*g/gi, 'formatting'],
    [/m\s*o\s*n\s*i\s*t\s*o\s*r\s*i\s*n\s*g/gi, 'monitoring'],
    [/t\s*r\s*a\s*c\s*k\s*i\s*n\s*g/gi, 'tracking'],
    [/p\s*r\s*i\s*n\s*t\s*i\s*n\s*g/gi, 'printing'],
    [/s\s*e\s*n\s*d\s*i\s*n\s*g/gi, 'sending'],
    
    // Two-word patterns
    [/in\s+clude/gi, 'include'],
    [/de\s+cided/gi, 'decided'],
    [/fu\s+ture/gi, 'future'],
    [/be\s+fore/gi, 'before'],
    [/af\s+ter/gi, 'after'],
  ];
  
  brokenWords.forEach(([pattern, replacement]) => {
    text = text.replace(pattern, replacement);
  });
  
  // Pattern 3: Fix common concatenated words (no space between words)
  text = text.replace(/([a-z])([A-Z])/g, '$1 $2'); // camelCase
  text = text.replace(/([a-z])(the|and|of|to|in|is|are|was|were|for|with)/gi, '$1 $2'); // concatenated small words
  
  // Pattern 4: Fix spacing around punctuation
  text = text.replace(/\s+([.,;:!?])/g, '$1'); // Remove space before punctuation
  text = text.replace(/([.,;:!?])([a-zA-Z])/g, '$1 $2'); // Add space after punctuation
  
  // Pattern 5: Fix multiple spaces
  text = text.replace(/\s{2,}/g, ' ');
  
  // Pattern 6: Fix space between number and letter
  text = text.replace(/(\d+)\s*([a-z])/gi, '$1$2');
  
  // Pattern 7: Fix common typos from PDF extraction
  text = text.replace(/\s+'/g, "'"); // Fix space before apostrophe
  text = text.replace(/'\s+/g, "'"); // Fix space after apostrophe
  text = text.replace(/(\w)\s+-\s+(\w)/g, '$1-$2'); // Fix hyphenated words
  
  return text.trim();
};

interface QuestionRendererProps {
  question: ExamQuestion;
  questionPath: string;
  answers: { [questionId: string]: StudentAnswer };
  onAnswerChange: (questionId: string, answer: StudentAnswer['answer'], flagged?: boolean) => void;
  level: number;
  hasTables?: boolean;
}

const QuestionRendererSimple: React.FC<QuestionRendererProps> = ({
  question,
  questionPath,
  answers,
  onAnswerChange,
  level,
  hasTables = false,
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

    // Matrix Tick Table - Radio buttons for each row
    if (type === 'matrix_tick_table' && question.table) {
      const currentAnswers = (typeof currentAnswer?.answer === 'object' && !Array.isArray(currentAnswer?.answer)
        ? currentAnswer.answer as { [key: string]: string }
        : {}) as { [key: string]: string };
      
      return (
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
                    textAlign: 'center',
                    color: '#1e293b'
                  }}>
                    {header}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {question.table.rows.map((row, rowIdx) => {
                const statement = row[0];
                const options = question.table.headers.slice(1);
                
                return (
                  <tr key={rowIdx}>
                    <td style={{
                      padding: '12px',
                      border: '1px solid #1e293b',
                      color: '#1e293b'
                    }}>
                      {statement}
                    </td>
                    {options.map((option, optIdx) => (
                      <td key={optIdx} style={{
                        padding: '12px',
                        border: '1px solid #1e293b',
                        textAlign: 'center'
                      }}>
                        <input
                          type="radio"
                          name={`matrix_${questionPath}_row${rowIdx}`}
                          checked={currentAnswers[statement] === option}
                          onChange={() => {
                            const newAnswers = { ...currentAnswers, [statement]: option };
                            onAnswerChange(questionPath, newAnswers, isFlagged);
                          }}
                          style={{
                            width: '20px',
                            height: '20px',
                            cursor: 'pointer'
                          }}
                        />
                      </td>
                    ))}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      );
    }

    // Image-based List - Show images with answer inputs
    if (type === 'image_based_list' && (question as any).images) {
      const images = (question as any).images;
      const currentAnswers = (currentAnswer?.answer as string[]) || [];
      
      return (
        <div style={{ marginTop: '20px' }}>
          {images.map((img: any, idx: number) => (
            <div key={idx} style={{
              marginBottom: '25px',
              padding: '15px',
              border: '1px solid #e2e8f0',
              borderRadius: '8px',
              background: '#f8fafc'
            }}>
              <div style={{ marginBottom: '15px', textAlign: 'center' }}>
                <img
                  src={img.path}
                  alt={img.description || `Image ${idx + 1}`}
                  style={{
                    maxWidth: '400px',
                    maxHeight: '300px',
                    width: 'auto',
                    height: 'auto',
                    borderRadius: '8px',
                    border: '1px solid #cbd5e1',
                    boxShadow: '0 2px 8px rgba(0,0,0,0.1)'
                  }}
                />
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <span style={{ fontWeight: 'bold', minWidth: '30px' }}>{idx + 1}.</span>
                <input
                  value={currentAnswers[idx] || ''}
                  onChange={(e) => {
                    const newAnswers = [...currentAnswers];
                    newAnswers[idx] = e.target.value;
                    onAnswerChange(questionPath, newAnswers, isFlagged);
                  }}
                  style={{
                    flex: 1,
                    border: 'none',
                    borderBottom: '2px solid #1e293b',
                    padding: '8px 0',
                    outline: 'none',
                    fontSize: '1rem',
                    background: 'transparent'
                  }}
                  placeholder="Name the device..."
                />
              </div>
            </div>
          ))}
        </div>
      );
    }

    // Text with Example - Show example code box then answer input
    if (type === 'text_with_example') {
      const example = (question as any).example;
      const instruction = (question as any).instruction;
      
      return (
        <div style={{ marginTop: '20px' }}>
          {example && (
            <div style={{
              background: '#f8fafc',
              border: '1px solid #cbd5e1',
              borderRadius: '8px',
              padding: '15px',
              marginBottom: '20px'
            }}>
              {example.title && (
                <p style={{ marginBottom: '10px', fontSize: '0.95rem', color: '#475569' }}>
                  {example.title}
                </p>
              )}
              {example.code && (
                <div style={{
                  background: 'white',
                  border: '1px solid #e2e8f0',
                  borderRadius: '4px',
                  padding: '12px',
                  fontFamily: 'monospace',
                  fontSize: '0.95rem',
                  color: '#1e293b'
                }}>
                  {example.code}
                </div>
              )}
            </div>
          )}
          {instruction && (
            <p style={{ marginBottom: '15px', fontWeight: '500', color: '#1e293b' }}>
              {instruction}
            </p>
          )}
          <textarea
            value={(currentAnswer?.answer as string) || ''}
            onChange={(e) => handleTextChange(e.target.value)}
            rows={6}
            style={{
              width: '100%',
              border: '1px solid #cbd5e1',
              borderRadius: '8px',
              padding: '12px',
              outline: 'none',
              fontSize: '1rem',
              fontFamily: 'monospace',
              resize: 'vertical',
              background: 'white'
            }}
            placeholder="Write your query here..."
          />
        </div>
      );
    }

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
      const hasImage = (question as any).image;
      
      return (
        <div style={{ marginTop: '15px' }}>
          {hasImage && (
            <div style={{ marginBottom: '20px', textAlign: 'center' }}>
              <img
                src={hasImage.path}
                alt={hasImage.description || 'Question image'}
                style={{
                  maxWidth: '100%',
                  height: 'auto',
                  borderRadius: '8px',
                  border: '1px solid #cbd5e1',
                  boxShadow: '0 2px 8px rgba(0,0,0,0.1)'
                }}
              />
              {hasImage.description && (
                <p style={{
                  fontSize: '0.9rem',
                  color: '#64748b',
                  fontStyle: 'italic',
                  marginTop: '8px'
                }}>
                  {hasImage.description}
                </p>
              )}
            </div>
          )}
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
        padding: level === 0 ? '16px' : '12px',
        marginBottom: level === 0 ? '16px' : '12px',
        borderRadius: '6px',
        boxShadow: level === 0 ? '0 1px 3px rgba(0,0,0,0.1)' : 'none',
        marginLeft: level > 0 ? '16px' : '0',
        scrollMarginTop: '16px',
      }}
    >
      {/* Question Header */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: '12px',
          borderBottom: level === 0 ? '2px solid #1f2937' : '1px solid #e5e7eb',
          paddingBottom: '8px',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <span style={{ fontWeight: 'bold', fontSize: level === 0 ? '1.2rem' : '1rem' }}>
            {level === 0 ? `Question ${question.number}` : `(${question.number})`}
          </span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
          {question.marks !== null && (
            <>
              <span style={{ fontWeight: 'bold', fontSize: '1rem' }}>
                [{question.marks}]
              </span>
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
            </>
          )}
        </div>
      </div>

      {/* Question Text */}
      <p style={{ margin: '12px 0', fontSize: '1.1rem', lineHeight: '1.6', letterSpacing: '0.01em' }}>
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

      {/* Question Table (skip for matrix_tick_table as it's rendered in answer input) */}
      {question.table && question.type !== 'matrix_tick_table' && (
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

      {/* Fill-in-Blank Inline Renderer */}
      {question.type === 'fill_in_blank' && question.subparts && question.subparts.length > 0 ? (
        <div style={{ marginTop: '20px' }}>
          {question.subparts.map((subpart, index) => {
            const subpartPath = `${questionPath}.${subpart.number}`;
            const subpartAnswer = answers[subpartPath];
            
            return (
              <div key={subpart.number} style={{ marginBottom: '16px' }}>
                {/* Sentence text */}
                <p style={{
                  marginBottom: '8px',
                  color: '#1e293b',
                  lineHeight: '1.6'
                }}>
                  {normalizeText(subpart.text)}
                </p>
                
                {/* Input field with dotted underline */}
                <input
                  type="text"
                  value={(subpartAnswer?.answer as string) || ''}
                  onChange={(e) => onAnswerChange(subpartPath, e.target.value)}
                  placeholder="Write your answer..."
                style={{
                  width: '100%',
                  padding: '8px 12px',
                  fontSize: '0.95rem',
                  border: 'none',
                  borderBottom: '2px dotted #cbd5e1',
                  outline: 'none',
                  background: 'transparent',
                  color: '#1e293b',
                  fontFamily: 'inherit'
                }}
                onFocus={(e) => {
                  e.target.style.borderBottom = '2px dotted #3b82f6';
                }}
                onBlur={(e) => {
                  e.target.style.borderBottom = '2px dotted #cbd5e1';
                }}
              />
            </div>
            );
          })}
        </div>
      ) : (
        <>
          {/* Answer Input (show if has marks OR has no subparts, BUT NOT if it's a tick table question) */}
          {!hasTables && !question.text.toLowerCase().includes('tick') && (question.marks !== null || !question.subparts || question.subparts.length === 0) && renderAnswerInput()}

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
                  hasTables={false}
                />
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default QuestionRendererSimple;

// Made with Bob
