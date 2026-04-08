'use client';

import React, { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { ExamInterface } from '@/components/exam-new/ExamInterface';
import { ExamPaper } from '@/lib/exam-new/types';

export default function PaperSolvingPage() {
  const params = useParams();
  const router = useRouter();
  const paperPath = decodeURIComponent(params.paperId as string);

  const [examPaper, setExamPaper] = useState<ExamPaper | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function loadPaper() {
      try {
        setLoading(true);
        const response = await fetch(`/api/exam/parse?path=${encodeURIComponent(paperPath)}`);
        
        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error || 'Failed to load paper');
        }

        const data = await response.json();
        setExamPaper(data);
      } catch (err) {
        console.error('Error loading paper:', err);
        setError(err instanceof Error ? err.message : 'Failed to load paper');
      } finally {
        setLoading(false);
      }
    }

    loadPaper();
  }, [paperPath]);

  const handleSubmit = (answers: { [questionId: string]: string }) => {
    // TODO: Implement submission logic
    console.log('Submitted answers:', answers);
    alert('Exam submitted! (Grading functionality coming soon)');
  };

  if (loading) {
    return (
      <div style={{ 
        minHeight: '100vh', 
        background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
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
          Extracting questions from PDF
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div style={{ 
        minHeight: '100vh', 
        background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
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
            marginBottom: '25px'
          }}>
            {error}
          </p>
          <button
            onClick={() => router.push('/practice')}
            style={{
              padding: '12px 24px',
              background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
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
      {/* Back button overlay */}
      <div style={{
        position: 'fixed',
        top: '20px',
        left: '20px',
        zIndex: 1000
      }}>
        <button
          onClick={() => {
            if (confirm('Are you sure you want to leave? Your progress will be lost.')) {
              router.push('/practice');
            }
          }}
          style={{
            background: 'white',
            border: '2px solid #e2e8f0',
            borderRadius: '10px',
            padding: '12px 24px',
            fontSize: '1rem',
            fontWeight: '600',
            color: '#4a5568',
            cursor: 'pointer',
            transition: 'all 0.3s',
            boxShadow: '0 2px 8px rgba(0,0,0,0.1)'
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.borderColor = '#cbd5e0';
            e.currentTarget.style.transform = 'translateX(-4px)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.borderColor = '#e2e8f0';
            e.currentTarget.style.transform = 'translateX(0)';
          }}
        >
          ← Exit Exam
        </button>
      </div>

      {/* Exam Interface */}
      <ExamInterface examPaper={examPaper} onSubmit={handleSubmit} />
    </div>
  );
}

// Made with Bob
