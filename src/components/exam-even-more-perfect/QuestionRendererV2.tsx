/**
 * VERSION 2: ENHANCED RENDERER WITH AUTO-EXPANDING INPUTS
 * Supports all ICT question types with auto-expanding text areas
 */

import React from 'react';
import { ExamQuestion } from '@/lib/exam-new/types';

interface QuestionRendererV2Props {
  question: ExamQuestion;
  questionId: string; // Full path like "1.a.i"
  answer: any;
  onAnswerChange: (answer: any) => void;
}

const QuestionRendererV2: React.FC<QuestionRendererV2Props> = ({
  question,
  questionId,
  answer,
  onAnswerChange,
}) => {
  const textareaRef = React.useRef<HTMLTextAreaElement>(null);
  
  // Auto-resize function
  const handleTextareaChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    onAnswerChange(e.target.value);
    autoResize(e.target);
  };
  
  const autoResize = (textarea: HTMLTextAreaElement) => {
    textarea.style.height = 'auto';
    textarea.style.height = textarea.scrollHeight + 'px';
  };
  
  // Set initial height on mount and when answer changes
  React.useEffect(() => {
    if (textareaRef.current) {
      autoResize(textareaRef.current);
    }
  }, [answer]);

  // 1. MCQ - Multiple Choice
  if (question.type === 'mcq' && question.options) {
    return (
      <div className="mcq-question mb-6">
        <p className="mb-3"><strong>{questionId}.</strong> {question.text}</p>
        <div className="space-y-2">
          {question.options.map((option, idx) => (
            <label key={idx} className="flex items-center space-x-2 cursor-pointer hover:bg-gray-50 p-2 rounded">
              <input
                type="radio"
                name={questionId}
                value={option}
                checked={answer === option}
                onChange={(e) => onAnswerChange(e.target.value)}
                className="w-4 h-4"
              />
              <span>{option}</span>
            </label>
          ))}
        </div>
        <span className="text-gray-500 text-sm mt-2 block">[{question.marks} mark{question.marks !== 1 ? 's' : ''}]</span>
      </div>
    );
  }

  // 2. Tick Selection / Circle Selection
  if (question.type === 'tick_selection' || question.type === 'circle_selection') {
    const options = question.options || ['Option A', 'Option B', 'Option C', 'Option D'];
    return (
      <div className="selection-question mb-6">
        <p className="mb-3"><strong>{questionId}.</strong> {question.text}</p>
        <div className="space-y-2">
          {options.map((option, idx) => (
            <label key={idx} className="flex items-center space-x-3 cursor-pointer hover:bg-gray-50 p-3 rounded border">
              <input
                type="checkbox"
                checked={answer?.[idx] || false}
                onChange={(e) => {
                  const newAnswer = { ...answer, [idx]: e.target.checked };
                  onAnswerChange(newAnswer);
                }}
                className="w-5 h-5"
              />
              <span className="flex-1">{option}</span>
            </label>
          ))}
        </div>
        <span className="text-gray-500 text-sm mt-2 block">[{question.marks} mark{question.marks !== 1 ? 's' : ''}]</span>
      </div>
    );
  }

  // 3. Matrix Tick Table
  if (question.type === 'matrix_tick_table' && question.table) {
    return (
      <div className="matrix-table mb-6">
        <p className="mb-3"><strong>{questionId}.</strong> {question.text}</p>
        <div className="overflow-x-auto">
          <table className="border-collapse w-full border">
            <thead>
              <tr className="bg-gray-50">
                <th className="border p-3 text-left">Statement</th>
                {question.table.headers.map((header, idx) => (
                  <th key={idx} className="border p-3 text-center">{header}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {question.table.rows.map((row, rowIdx) => (
                <tr key={rowIdx}>
                  <td className="border p-3">{row[0]}</td>
                  {question.table!.headers.map((_, colIdx) => (
                    <td key={colIdx} className="border p-3 text-center">
                      <input
                        type="radio"
                        name={`${questionId}-row-${rowIdx}`}
                        value={colIdx}
                        checked={answer?.[rowIdx] === colIdx}
                        onChange={(e) => {
                          const newAnswer = { ...answer, [rowIdx]: parseInt(e.target.value) };
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
        <span className="text-gray-500 text-sm mt-2 block">[{question.marks} mark{question.marks !== 1 ? 's' : ''}]</span>
      </div>
    );
  }

  // 4. Data Table (fillable)
  if (question.type === 'data_table' && question.table) {
    return (
      <div className="data-table mb-6">
        <p className="mb-3"><strong>{questionId}.</strong> {question.text}</p>
        <div className="overflow-x-auto">
          <table className="border-collapse w-full border">
            <thead>
              <tr className="bg-gray-50">
                {question.table.headers.map((header, idx) => (
                  <th key={idx} className="border p-3">{header}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {question.table.rows.map((row, rowIdx) => (
                <tr key={rowIdx}>
                  {row.map((cell, cellIdx) => (
                    <td key={cellIdx} className="border p-2">
                      {cell === '...' || cell === '' ? (
                        <input
                          type="text"
                          className="w-full p-2 outline-none focus:bg-blue-50"
                          value={answer?.[`${rowIdx}-${cellIdx}`] || ''}
                          onChange={(e) => {
                            const newAnswer = { ...answer, [`${rowIdx}-${cellIdx}`]: e.target.value };
                            onAnswerChange(newAnswer);
                          }}
                          placeholder="Type here..."
                        />
                      ) : (
                        <span>{cell}</span>
                      )}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <span className="text-gray-500 text-sm mt-2 block">[{question.marks} mark{question.marks !== 1 ? 's' : ''}]</span>
      </div>
    );
  }

  // 5. Numbered List
  if (question.type === 'numbered_list') {
    const count = question.listCount || question.marks || 3;
    return (
      <div className="numbered-list mb-6">
        <p className="mb-3"><strong>{questionId}.</strong> {question.text}</p>
        <div className="space-y-3">
          {Array.from({ length: count }).map((_, idx) => (
            <div key={idx} className="flex items-start space-x-3">
              <span className="font-semibold mt-2">{idx + 1}.</span>
              <textarea
                className="flex-1 border-b-2 border-gray-300 p-2 outline-none focus:border-blue-500 resize-none overflow-hidden"
                rows={1}
                value={answer?.[idx] || ''}
                onChange={(e) => {
                  const newAnswer = [...(answer || [])];
                  newAnswer[idx] = e.target.value;
                  onAnswerChange(newAnswer);
                  autoResize(e.target);
                }}
                placeholder={`Answer ${idx + 1}`}
              />
            </div>
          ))}
        </div>
        <span className="text-gray-500 text-sm mt-2 block">[{question.marks} mark{question.marks !== 1 ? 's' : ''}]</span>
      </div>
    );
  }

  // 6. Paired List (two columns)
  if (question.type === 'paired_list') {
    const count = question.listCount || question.marks || 3;
    const labels = question.labels || ['Item', 'Description'];
    return (
      <div className="paired-list mb-6">
        <p className="mb-3"><strong>{questionId}.</strong> {question.text}</p>
        <div className="space-y-3">
          {Array.from({ length: count }).map((_, idx) => (
            <div key={idx} className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm text-gray-600">{labels[0]}</label>
                <input
                  type="text"
                  className="w-full border-b-2 border-gray-300 p-2 outline-none focus:border-blue-500"
                  value={answer?.[idx]?.col1 || ''}
                  onChange={(e) => {
                    const newAnswer = [...(answer || [])];
                    newAnswer[idx] = { ...newAnswer[idx], col1: e.target.value };
                    onAnswerChange(newAnswer);
                  }}
                  placeholder={labels[0]}
                />
              </div>
              <div>
                <label className="text-sm text-gray-600">{labels[1]}</label>
                <input
                  type="text"
                  className="w-full border-b-2 border-gray-300 p-2 outline-none focus:border-blue-500"
                  value={answer?.[idx]?.col2 || ''}
                  onChange={(e) => {
                    const newAnswer = [...(answer || [])];
                    newAnswer[idx] = { ...newAnswer[idx], col2: e.target.value };
                    onAnswerChange(newAnswer);
                  }}
                  placeholder={labels[1]}
                />
              </div>
            </div>
          ))}
        </div>
        <span className="text-gray-500 text-sm mt-2 block">[{question.marks} mark{question.marks !== 1 ? 's' : ''}]</span>
      </div>
    );
  }

  // 7. Image-based questions
  if ((question.type === 'image_based_list' || question.image) && question.images) {
    return (
      <div className="image-question mb-6">
        <p className="mb-3"><strong>{questionId}.</strong> {question.text}</p>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
          {question.images.map((img, idx) => (
            <div key={idx} className="border rounded p-2">
              <img src={img.path || img.url} alt={img.description || img.alt || `Image ${idx + 1}`} className="w-full h-auto" />
              {img.description && <p className="text-sm text-gray-600 mt-2">{img.description}</p>}
            </div>
          ))}
        </div>
        <textarea
          ref={textareaRef}
          className="w-full border rounded p-3 focus:ring-2 focus:ring-blue-500 outline-none resize-none overflow-hidden"
          rows={Math.max(3, question.marks || 3)}
          placeholder="Enter your answer..."
          value={answer || ''}
          onChange={handleTextareaChange}
          style={{ minHeight: `${Math.max(3, question.marks || 3) * 1.5}rem` }}
        />
        <span className="text-gray-500 text-sm mt-2 block">[{question.marks} mark{question.marks !== 1 ? 's' : ''}]</span>
      </div>
    );
  }

  // 8. Short Answer (1-2 marks)
  if (question.type === 'short_answer' || question.type === 'box_answer') {
    return (
      <div className="short-answer mb-6">
        <p className="mb-3"><strong>{questionId}.</strong> {question.text}</p>
        <input
          type="text"
          className="w-full border-b-2 border-gray-300 p-2 outline-none focus:border-blue-500"
          value={answer || ''}
          onChange={(e) => onAnswerChange(e.target.value)}
          placeholder="Type your answer..."
        />
        <span className="text-gray-500 text-sm mt-2 block">[{question.marks} mark{question.marks !== 1 ? 's' : ''}]</span>
      </div>
    );
  }

  // 9. Essay (long answer, 6+ marks)
  if (question.type === 'essay') {
    return (
      <div className="essay-question mb-6">
        <p className="mb-3"><strong>{questionId}.</strong> {question.text}</p>
        <textarea
          ref={textareaRef}
          className="w-full border rounded p-3 focus:ring-2 focus:ring-blue-500 outline-none resize-none overflow-hidden"
          rows={Math.max(6, question.marks || 6)}
          placeholder="Write your detailed answer here..."
          value={answer || ''}
          onChange={handleTextareaChange}
          style={{ minHeight: `${Math.max(6, question.marks || 6) * 1.5}rem` }}
        />
        <span className="text-gray-500 text-sm mt-2 block">[{question.marks} mark{question.marks !== 1 ? 's' : ''}]</span>
      </div>
    );
  }

  // 10. Default - Standard Text Answer with Auto-Expand
  return (
    <div className="standard-question mb-6">
      <p className="mb-3"><strong>{questionId}.</strong> {question.text}</p>
      <textarea
        ref={textareaRef}
        className="w-full border rounded p-3 focus:ring-2 focus:ring-blue-500 outline-none resize-none overflow-hidden"
        rows={Math.max(3, question.marks || 3)}
        placeholder="Enter your answer..."
        value={answer || ''}
        onChange={handleTextareaChange}
        style={{ minHeight: `${Math.max(3, question.marks || 3) * 1.5}rem` }}
      />
      <span className="text-gray-500 text-sm mt-2 block">[{question.marks} mark{question.marks !== 1 ? 's' : ''}]</span>
    </div>
  );
};

export default QuestionRendererV2;

// Made with Bob