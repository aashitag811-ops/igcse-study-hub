'use client';

import React from 'react';

interface InputFactoryProps {
  type: string;
  marks: number;
  options?: string[];
  onChange: (value: any) => void;
  questionId: string;
}

export const InputFactory: React.FC<InputFactoryProps> = ({ 
  type, 
  marks, 
  options, 
  onChange,
  questionId 
}) => {
  const [selectedOptions, setSelectedOptions] = React.useState<string[]>([]);
  const [listAnswers, setListAnswers] = React.useState<Record<number, string>>({});
  const [pairedAnswers, setPairedAnswers] = React.useState<Record<number, { pt: string; desc: string }>>({});

  const handleCheckboxChange = (option: string, checked: boolean) => {
    const newSelected = checked 
      ? [...selectedOptions, option]
      : selectedOptions.filter(opt => opt !== option);
    setSelectedOptions(newSelected);
    onChange(newSelected);
  };

  const handleListChange = (index: number, value: string) => {
    const newAnswers = { ...listAnswers, [index]: value };
    setListAnswers(newAnswers);
    onChange(Object.values(newAnswers).filter(Boolean));
  };

  const handlePairedChange = (pair: number, field: 'pt' | 'desc', value: string) => {
    const newAnswers = {
      ...pairedAnswers,
      [pair]: {
        ...pairedAnswers[pair],
        [field]: value
      }
    };
    setPairedAnswers(newAnswers);
    onChange(Object.values(newAnswers).map(p => `${p.pt || ''}: ${p.desc || ''}`).filter(Boolean));
  };

  switch (type) {
    case 'selection_list':
    case 'multi_select':
      return (
        <div className="selection-grid">
          {options?.map(opt => (
            <label key={opt} className="chip">
              <input 
                type="checkbox" 
                name={questionId}
                value={opt}
                checked={selectedOptions.includes(opt)}
                onChange={(e) => handleCheckboxChange(opt, e.target.checked)} 
              />
              <span className="chip-text">{opt}</span>
            </label>
          ))}
        </div>
      );

    case 'numbered_list':
    case 'list_n':
      return (
        <div className="numbered-list">
          {Array.from({ length: marks }).map((_, i) => (
            <div key={i} className="list-row">
              <span>{i + 1}.</span>
              <input 
                type="text" 
                value={listAnswers[i] || ''}
                onChange={(e) => handleListChange(i, e.target.value)} 
                placeholder={`Answer ${i + 1}`}
              />
            </div>
          ))}
        </div>
      );

    case 'paired_list':
      return (
        <div className="paired-list">
          {Array.from({ length: Math.ceil(marks / 2) }).map((_, i) => (
            <div key={i} className="pair-row">
              <input 
                type="text" 
                placeholder="Point/Method" 
                value={pairedAnswers[i]?.pt || ''}
                onChange={(e) => handlePairedChange(i, 'pt', e.target.value)} 
              />
              <input 
                type="text" 
                placeholder="Description/Example" 
                value={pairedAnswers[i]?.desc || ''}
                onChange={(e) => handlePairedChange(i, 'desc', e.target.value)} 
              />
            </div>
          ))}
        </div>
      );

    case 'long_text':
    case 'long_response':
      return (
        <textarea 
          rows={6} 
          onChange={(e) => onChange(e.target.value)} 
          placeholder="Enter your detailed response..."
          className="long-text-input"
        />
      );

    case 'numeric':
      return (
        <input 
          type="number" 
          className="short-input numeric-input" 
          onChange={(e) => onChange(Number(e.target.value))}
          placeholder="Enter number"
        />
      );

    case 'short_text':
    default:
      return (
        <input 
          type="text" 
          className="short-input" 
          onChange={(e) => onChange(e.target.value)}
          placeholder="Type your answer here..."
        />
      );
  }
};

// Made with Bob
