'use client';

import React, { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { ExamInterface } from '@/components/exam-new/ExamInterface';
import { ExamPaper } from '@/lib/exam-new/types';

export default function PaperSolvingPage() {
  const params = useParams();
  const router = useRouter();
  const paperId = params.paperId as string;

  const [examPaper, setExamPaper] = useState<ExamPaper | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function loadPaper() {
      try {
        setLoading(true);
        
        // Load JSON file from public/papers
        const response = await fetch(`/papers/${paperId}.json`);
        
        if (!response.ok) {
          throw new Error('Paper not found');
        }

        const data = await response.json();
        
        // Check if paper has questions
        if (!data.questions || data.questions.length === 0) {
          throw new Error('This paper has no questions yet. Please convert it first using the Python script.');
        }
        
        setExamPaper(data);
      } catch (err) {
        console.error('Error loading paper:', err);
        setError(err instanceof Error ? err.message : 'Failed to load paper');
      } finally {
        setLoading(false);
      }
    }

    loadPaper();
  }, [paperId]);

  const handleSubmit = (answers: { [questionId: string]: any }) => {
    // TODO: Implement grading logic
    console.log('Submitted answers:', answers);
    
    // Calculate basic stats
    const totalQuestions = Object.keys(answers).length;
    const answeredQuestions = Object.values(answers).filter(a => {
      if (typeof a.answer === 'string') return a.answer.trim().length > 0;
      if (Array.isArray(a.answer)) return a.answer.length > 0;
      return false;
    }).length;

    alert(`Exam submitted!\n\nAnswered: ${answeredQuestions}/${totalQuestions} questions\n\n(Grading functionality coming soon)`);
    
    // Redirect back to selection page
    router.push('/practice');
  };

  if (loading) {
    return (
      <div style={{ 
        minHeight: '100vh', 
        background: 'linear-gradient(135deg, #4F46E5 0%, #7C3AED 100%)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        color: 'white',
        fontSize: '1.2rem',
        flexDirection: 'column',
        gap: '20px'
      }}>
        <div style={{ fontSize: '3rem' }}>📄</div>
        <div>Loading exam paper...</div>
        <div style={{ fontSize: '0.9rem', opacity: 0.8 }}>
          Reading questions from JSON
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div style={{ 
        minHeight: '100vh', 
        background: 'linear-gradient(135deg, #4F46E5 0%, #7C3AED 100%)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '20px'
      }}>
        <div style={{
          background: 'white',
          padding: '40px',
          borderRadius: '16px',
          maxWidth: '500px',
          textAlign: 'center'
        }}>
          <div style={{ fontSize: '3rem', marginBottom: '20px' }}>⚠️</div>
          <h2 style={{ 
            fontSize: '1.5rem', 
            color: '#1a202c',
            marginBottom: '15px'
          }}>
            Failed to Load Paper
          </h2>
          <p style={{ 
            color: '#6b7280',
            marginBottom: '25px',
            lineHeight: '1.6'
          }}>
            {error}
          </p>
          <button
            onClick={() => router.push('/practice')}
            style={{
              padding: '12px 24px',
              background: 'linear-gradient(135deg, #4F46E5 0%, #7C3AED 100%)',
              color: 'white',
              border: 'none',
              borderRadius: '10px',
              fontSize: '1rem',
              fontWeight: '600',
              cursor: 'pointer'
            }}
          >
            ← Back to Paper Selection
          </button>
        </div>
      </div>
    );
  }

  if (!examPaper) {
    return null;
  }

  return (
    <div>
      {/* Exit button overlay - top right, red */}
      <div style={{
        position: 'fixed',
        top: '20px',
        right: '20px',
        zIndex: 1000
      }}>
        <button
          onClick={() => {
            if (confirm('Are you sure you want to leave? Your progress will be lost.')) {
              router.push('/practice');
            }
          }}
          style={{
            background: 'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)',
            border: 'none',
            borderRadius: '10px',
            padding: '12px 24px',
            fontSize: '1rem',
            fontWeight: '600',
            color: 'white',
            cursor: 'pointer',
            transition: 'all 0.3s',
            boxShadow: '0 4px 12px rgba(239, 68, 68, 0.3)'
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.transform = 'translateY(-2px)';
            e.currentTarget.style.boxShadow = '0 6px 16px rgba(239, 68, 68, 0.4)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.transform = 'translateY(0)';
            e.currentTarget.style.boxShadow = '0 4px 12px rgba(239, 68, 68, 0.3)';
          }}
        >
          Exit Exam ✕
        </button>
      </div>

      {/* Exam Interface */}
      <ExamInterface examPaper={examPaper} onSubmit={handleSubmit} />
    </div>
  );
}

// Made with Bob
