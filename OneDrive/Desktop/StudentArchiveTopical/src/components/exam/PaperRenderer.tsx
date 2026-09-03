'use client';

import React, { useState, useEffect } from 'react';
import { InputFactory } from './InputFactory';
import { PaperQuestion, ParsedPaper } from '@/lib/exam/types';
import './ExamStyles.css';

interface PaperRendererProps {
  paperId: string;
}

interface AnswerState {
  [questionId: string]: string | string[] | number;
}

export const PaperRenderer: React.FC<PaperRendererProps> = ({ paperId }) => {
  const [paper, setPaper] = useState<ParsedPaper | null>(null);
  const [answers, setAnswers] = useState<AnswerState>({});
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  // Fetch the paper
  useEffect(() => {
    const fetchPaper = async () => {
      try {
        setLoading(true);
        setError(null);
        
        // Parse paperId to get selector components
        // Format: subjectCode_year_session_paperVariant (e.g., "0417_2025_feb_march_12")
        const parts = paperId.split('_');
        const subjectCode = parts[0];
        const year = parts[1];
        const session = parts[2] + '_' + parts[3]; // feb_march, may_june, oct_nov
        const paperVariant = parts[4]; // e.g., "12"
        const paper = parseInt(paperVariant[0]);
        const variant = parseInt(paperVariant[1]);

        const queryParams = new URLSearchParams({
          subject: subjectCode,
          year: year,
          session: session,
          paper: paper.toString(),
          variant: variant.toString()
        });

        const response = await fetch(`/api/paper?${queryParams}`);
        
        if (!response.ok) {
          throw new Error(`Failed to fetch paper: ${response.statusText}`);
        }
        
        const data = await response.json();
        setPaper(data);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load paper');
        console.error('Error fetching paper:', err);
      } finally {
        setLoading(false);
      }
    };

    if (paperId) {
      fetchPaper();
    }
  }, [paperId]);

  const handleInputChange = (questionId: string, value: any) => {
    setAnswers(prev => ({ ...prev, [questionId]: value }));
  };

  const submitExam = async () => {
    if (!paper) return;

    try {
      setSubmitting(true);
      setError(null);

      // Convert answers to the format expected by the marking API
      const studentAnswers = Object.entries(answers).map(([qid, answer]) => ({
        qid,
        answer
      }));

      const response = await fetch('/api/mark', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          paperId: paper.id,
          answers: studentAnswers,
          mode: 'practice_strict'
        })
      });

      if (!response.ok) {
        throw new Error(`Marking failed: ${response.statusText}`);
      }

      const markingResult = await response.json();
      setResult(markingResult);
      
      // Scroll to results
      setTimeout(() => {
        document.getElementById('results-section')?.scrollIntoView({ behavior: 'smooth' });
      }, 100);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to mark paper');
      console.error('Error marking paper:', err);
    } finally {
      setSubmitting(false);
    }
  };

  // Format question ID for display (e.g., "2ai" -> "2(a)(i)")
  const formatQuestionId = (qid: string): string => {
    // Match pattern like "2ai" or "2aii" or "2aiii"
    const match = qid.match(/^(\d+)([a-z])?([ivx]+)?$/i);
    if (!match) return qid;
    
    const [, num, letter, roman] = match;
    let formatted = num;
    
    if (letter) {
      formatted += `(${letter})`;
    }
    if (roman) {
      formatted += `(${roman})`;
    }
    
    return formatted;
  };

  const renderQuestion = (question: PaperQuestion, level: number = 0) => {
    const hasChildren = question.children && question.children.length > 0;
    const hasPrompt = question.prompt && question.prompt.trim().length > 0;
    
    // Show input box if:
    // 1. Question has a prompt (actual question text)
    // 2. Question has marks allocated to it
    // 3. Question has no children
    const shouldShowInput = hasPrompt && question.marks > 0 && !hasChildren;
    
    // If question has children but no real prompt (just a container), don't show the header
    const isContainerOnly = hasChildren && (!hasPrompt || question.prompt.trim().length < 10);
    
    if (isContainerOnly) {
      // Just render children without showing this question's header
      return (
        <div key={question.qid}>
          {question.children!.map(child => renderQuestion(child, level))}
        </div>
      );
    }
    
    return (
      <div key={question.qid} className={`question-block level-${level}`}>
        <div className="q-meta">
          <strong>Question {formatQuestionId(question.qid)}</strong>
          <span className="marks">[{question.marks} mark{question.marks !== 1 ? 's' : ''}]</span>
        </div>
        {hasPrompt && <p className="prompt">{question.prompt}</p>}
        
        {shouldShowInput && (
          <InputFactory
            type={question.answerType}
            marks={question.marks}
            options={question.qid === '1' ? ['Actuator', 'Blu-ray disc', 'Cloud', 'Keyboard', 'Flash memory', 'Hard disk', 'Mouse', 'SD card'] : question.answerType === 'multi_select' ? [] : undefined}
            questionId={question.qid}
            onChange={(val) => handleInputChange(question.qid, val)}
          />
        )}

        {hasChildren && (
          <div className="sub-questions">
            {question.children.map(child => renderQuestion(child, level + 1))}
          </div>
        )}
      </div>
    );
  };

  if (loading) {
    return (
      <div className="exam-paper loading">
        <div className="loading-spinner">Loading paper...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="exam-paper error">
        <div className="error-message">
          <h3>Error</h3>
          <p>{error}</p>
        </div>
      </div>
    );
  }

  if (!paper) {
    return (
      <div className="exam-paper error">
        <div className="error-message">
          <h3>Paper Not Found</h3>
          <p>The requested paper could not be loaded.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="exam-paper">
      <header className="exam-header">
        <h1>IGCSE Exam Practice</h1>
        <p className="paper-title">{paper.title}</p>
        <p className="paper-id">Paper ID: {paper.id}</p>
      </header>

      <div className="questions-container">
        {paper.questions.map(question => renderQuestion(question))}
      </div>

      <div className="submit-section">
        <button
          className="submit-btn"
          onClick={submitExam}
          disabled={submitting}
        >
          {submitting ? 'Marking...' : 'Submit for Marking'}
        </button>
        {Object.keys(answers).length === 0 && (
          <p style={{ textAlign: 'center', color: '#718096', marginTop: '10px', fontSize: '0.9rem' }}>
            Answer at least one question to submit
          </p>
        )}
      </div>

      {result && (
        <div id="results-section" className="results-section">
          <h2>Your Results</h2>
          <div className="score-summary">
            <div className="score-card">
              <div className="score-value">{result.totalAwarded}/{result.totalAvailable}</div>
              <div className="score-label">Total Score</div>
            </div>
            <div className="score-card">
              <div className="score-value">{result.percentage}%</div>
              <div className="score-label">Percentage</div>
            </div>
          </div>

          <div className="detailed-feedback">
            <h3>Question-by-Question Feedback</h3>
            {result.questions.map((q: any) => (
              <div key={q.qid} className="question-result">
                <div className="result-header">
                  <strong>Question {q.qid}</strong>
                  <span className={`result-score ${q.awarded === q.maxMarks ? 'full' : q.awarded > 0 ? 'partial' : 'zero'}`}>
                    {q.awarded}/{q.maxMarks}
                  </span>
                </div>
                <div className="feedback-list">
                  {q.feedback.map((fb: string, idx: number) => (
                    <div key={idx} className={`feedback-item ${fb.startsWith('✓') ? 'correct' : fb.startsWith('✗') ? 'incorrect' : 'info'}`}>
                      {fb}
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

// Made with Bob
