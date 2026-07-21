/**
 * VERSION 1: BASIC RENDERER
 * Simple, clean rendering with basic type support
 */

import React from 'react';
import { ExamQuestion } from '@/lib/exam-new/types';

interface QuestionRendererV1Props {
  question: ExamQuestion;
  answer: any;
  onAnswerChange: (answer: any) => void;
}

const QuestionRendererV1: React.FC<QuestionRendererV1Props> = ({
  question,
  answer,
  onAnswerChange,
}) => {
  // 1. Handle Selection Tables (The "Tick" Grids)
  if (question.type === 'selection_table') {
    const columns = ['Option A', 'Option B']; // Default columns
    const rows = ['Row 1', 'Row 2', 'Row 3']; // Default rows

    return (
      <div className="matrix-container">
        <p className="mb-4">{question.text}</p>
        <table className="border-collapse w-full border">
          <thead>
            <tr className="bg-gray-50">
              <th className="border p-2">Statement</th>
              {columns.map(col => <th key={col} className="border p-2 text-center">{col}</th>)}
            </tr>
          </thead>
          <tbody>
            {rows.map((row, idx) => (
              <tr key={row}>
                <td className="border p-2">{row}</td>
                {columns.map(col => (
                  <td key={col} className="border p-2 text-center">
                    <input 
                      type="radio" 
                      name={`${question.id}-row-${idx}`}
                      value={col}
                      checked={answer?.[idx] === col}
                      onChange={(e) => {
                        const newAnswer = { ...answer, [idx]: e.target.value };
                        onAnswerChange(newAnswer);
                      }}
                      className="w-5 h-5"
                    />
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  }

  // 2. Handle Word Banks (Drag & Drop or Selection)
  if (question.type === 'word_bank') {
    const wordBank = ['Term 1', 'Term 2', 'Term 3', 'Term 4']; // Default words

    return (
      <div className="word-bank-question">
        <div className="bank flex gap-2 mb-4 flex-wrap">
          {wordBank.map(word => (
            <span key={word} className="bg-blue-100 px-3 py-1 rounded text-sm">
              {word}
            </span>
          ))}
        </div>
        <p className="mb-2">{question.text}</p>
        <input 
          type="text" 
          className="border-b-2 w-full outline-none p-2" 
          placeholder="Type answer here..."
          value={answer || ''}
          onChange={(e) => onAnswerChange(e.target.value)}
        />
      </div>
    );
  }

  // 3. Default Standard Question
  return (
    <div className="standard-q mb-6">
      <p className="mb-3"><strong>{question.id}.</strong> {question.text}</p>
      <textarea 
        className="w-full border rounded p-3 focus:ring-2 focus:ring-blue-500 outline-none" 
        rows={Math.max(3, question.marks || 1)}
        placeholder="Enter your response..."
        value={answer || ''}
        onChange={(e) => onAnswerChange(e.target.value)}
      />
      <span className="text-gray-500 text-sm mt-1 block">[{question.marks} marks]</span>
    </div>
  );
};

export default QuestionRendererV1;

// Made with Bob
