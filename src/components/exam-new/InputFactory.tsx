'use client';

import React from 'react';
import './ExamStyles.css';

interface InputFactoryProps {
  type: string;
  marks: number | null;
  options?: string[];
  maxSelections?: number;
  value: string | string[];
  onChange: (value: string | string[]) => void;
}

const InputFactory: React.FC<InputFactoryProps> = ({
  type,
  marks,
  options,
  maxSelections,
  value,
  onChange,
}) => {
  switch (type) {
    case 'mcq':
    case 'selection_list':
      // Checkbox grid for "Circle" questions
      return (
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(2, 1fr)',
          gap: '12px',
          marginTop: '20px',
        }}>
          {options?.map((opt) => {
            const isSelected = Array.isArray(value) && value.includes(opt);
            return (
              <label
                key={opt}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  padding: '16px',
                  border: '1px solid #e2e8f0',
                  borderRadius: '8px',
                  cursor: 'pointer',
                  background: isSelected ? '#f0f9ff' : 'white',
                  borderColor: isSelected ? '#3b82f6' : '#e2e8f0',
                  transition: 'all 0.2s',
                }}
                onMouseEnter={(e) => {
                  if (!isSelected) {
                    e.currentTarget.style.background = '#f8fafc';
                  }
                }}
                onMouseLeave={(e) => {
                  if (!isSelected) {
                    e.currentTarget.style.background = 'white';
                  }
                }}
              >
                <input
                  type="checkbox"
                  checked={isSelected}
                  onChange={(e) => {
                    const currentSelections = Array.isArray(value) ? value : [];
                    let newSelections: string[];
                    
                    if (e.target.checked) {
                      if (maxSelections && currentSelections.length >= maxSelections) {
                        newSelections = [...currentSelections.slice(1), opt];
                      } else {
                        newSelections = [...currentSelections, opt];
                      }
                    } else {
                      newSelections = currentSelections.filter((o) => o !== opt);
                    }
                    
                    onChange(newSelections);
                  }}
                  style={{
                    width: '20px',
                    height: '20px',
                    marginRight: '12px',
                    cursor: 'pointer',
                  }}
                />
                <span style={{ fontSize: '1rem', color: '#1e293b' }}>{opt}</span>
              </label>
            );
          })}
        </div>
      );

    case 'numbered_list':
      // Numbered lines (1, 2, 3...)
      const itemCount = marks || 3;
      return (
        <div style={{ marginTop: '20px' }}>
          {Array.from({ length: itemCount }).map((_, i) => (
            <div
              key={i}
              style={{
                display: 'flex',
                alignItems: 'center',
                marginBottom: '12px',
              }}
            >
              <span style={{ marginRight: '12px', fontWeight: '600', color: '#64748b', minWidth: '24px' }}>
                {i + 1}.
              </span>
              <input
                type="text"
                style={{
                  flex: 1,
                  border: 'none',
                  borderBottom: '1px solid #cbd5e1',
                  padding: '10px 0',
                  outline: 'none',
                  fontSize: '1rem',
                  color: '#1e293b',
                }}
                placeholder="Write your answer..."
                onChange={(e) => {
                  // Handle array of answers
                  const answers = Array.isArray(value) ? [...value] : [];
                  answers[i] = e.target.value;
                  onChange(answers);
                }}
              />
            </div>
          ))}
        </div>
      );

    case 'paired_list':
      // Method + Description pairs with expandable textareas
      const pairCount = marks ? Math.ceil(marks / 2) : 2;
      return (
        <div style={{ marginTop: '20px' }}>
          {Array.from({ length: pairCount }).map((_, i) => (
            <div
              key={i}
              style={{
                display: 'flex',
                gap: '12px',
                marginBottom: '16px',
                alignItems: 'flex-start',
              }}
            >
              <span style={{ fontWeight: '600', color: '#64748b', minWidth: '24px', paddingTop: '10px' }}>
                {i + 1}.
              </span>
              <textarea
                placeholder="Point/Method"
                rows={2}
                style={{
                  flex: 1,
                  border: '1px solid #e2e8f0',
                  borderRadius: '6px',
                  padding: '10px',
                  outline: 'none',
                  fontSize: '1rem',
                  color: '#1e293b',
                  resize: 'vertical',
                  fontFamily: 'inherit',
                  minHeight: '60px',
                }}
              />
              <textarea
                placeholder="Description/Example"
                rows={2}
                style={{
                  flex: 2,
                  border: '1px solid #e2e8f0',
                  borderRadius: '6px',
                  padding: '10px',
                  outline: 'none',
                  fontSize: '1rem',
                  color: '#1e293b',
                  resize: 'vertical',
                  fontFamily: 'inherit',
                  minHeight: '60px',
                }}
              />
            </div>
          ))}
        </div>
      );

    case 'essay':
    case 'long_text':
      // Large text area with lines
      const rows = marks ? Math.max(6, marks * 1.5) : 6;
      return (
        <textarea
          value={typeof value === 'string' ? value : ''}
          onChange={(e) => onChange(e.target.value)}
          rows={Math.floor(rows)}
          style={{
            width: '100%',
            border: '1px solid #e2e8f0',
            borderRadius: '8px',
            padding: '16px',
            lineHeight: '2em',
            backgroundImage: 'repeating-linear-gradient(transparent, transparent 1.9em, #e2e8f0 1.9em, #e2e8f0 2em)',
            backgroundSize: '100% 2em',
            outline: 'none',
            fontSize: '1rem',
            color: '#1e293b',
            marginTop: '20px',
            resize: 'vertical',
            fontFamily: 'inherit',
          }}
          placeholder="Write your answer here..."
        />
      );

    default:
      // 1 mark = single dotted line
      // 2+ marks = diary-style box with lines
      if (marks === 1) {
        return (
          <input
            type="text"
            className="single-line"
            value={typeof value === 'string' ? value : ''}
            onChange={(e) => onChange(e.target.value)}
            placeholder="Write your answer..."
          />
        );
      }

      // 2+ marks = diary-style box
      const defaultRows = marks ? Math.max(3, marks * 2) : 6;
      return (
        <div>
          <textarea
            className="answer-box"
            value={typeof value === 'string' ? value : ''}
            onChange={(e) => onChange(e.target.value)}
            rows={Math.floor(defaultRows)}
            placeholder="Write your answer here..."
          />
          {marks && (
            <div className="marks-display">
              [{marks}]
            </div>
          )}
        </div>
      );
  }
};

export default InputFactory;

// Made with Bob
