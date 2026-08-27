'use client';

import React, { useState, useEffect } from 'react';

interface ExaminerReportModalProps {
  isOpen: boolean;
  onClose: () => void;
  label: string;
  erNote: string;        // kept for fallback only
  erPdfUrl?: string;
}

export function ExaminerReportModal({
  isOpen,
  onClose,
  label,
  erNote,
  erPdfUrl,
}: ExaminerReportModalProps) {
  const [blobUrl, setBlobUrl] = useState<string | null>(null);
  const [pdfStatus, setPdfStatus] = useState<'loading' | 'ready' | 'unavailable'>('loading');

  useEffect(() => {
    if (!isOpen) return;
    if (!erPdfUrl) { setPdfStatus('unavailable'); return; }

    let objectUrl: string | null = null;
    let cancelled = false;
    setPdfStatus('loading');
    setBlobUrl(null);

    fetch(erPdfUrl)
      .then(res => (res.ok ? res.blob() : null))
      .then(blob => {
        if (cancelled) return;
        if (!blob) { setPdfStatus('unavailable'); return; }
        objectUrl = URL.createObjectURL(blob);
        setBlobUrl(objectUrl);
        setPdfStatus('ready');
      })
      .catch(() => { if (!cancelled) setPdfStatus('unavailable'); });

    return () => {
      cancelled = true;
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [isOpen, erPdfUrl]);

  if (!isOpen) return null;

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/60 z-50 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Modal — compact, right-aligned so QP is still partially visible */}
      <div
        className="fixed z-50 flex flex-col pointer-events-auto"
        style={{
          top: '60px',
          right: '16px',
          bottom: '16px',
          width: 'min(520px, calc(100vw - 32px))',
          background: '#0d1018',
          border: '1px solid rgba(200,168,76,0.2)',
          borderRadius: '14px',
          boxShadow: '0 8px 40px rgba(0,0,0,0.7)',
          overflow: 'hidden',
        }}
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div style={{
          background: 'linear-gradient(90deg, #261c08 0%, #1a1406 100%)',
          borderBottom: '1px solid rgba(200,168,76,0.2)',
          padding: '12px 16px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexShrink: 0,
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <span style={{
              background: 'rgba(200,168,76,0.15)',
              border: '1px solid rgba(200,168,76,0.4)',
              borderRadius: '6px',
              padding: '2px 10px',
              fontSize: '12px',
              fontWeight: 700,
              color: '#c8a84c',
              fontFamily: 'Inter, sans-serif',
            }}>
              {label}
            </span>
            <span style={{
              fontSize: '14px',
              fontWeight: 600,
              color: '#e8dcc4',
              fontFamily: "'Cormorant Garamond', Georgia, serif",
              letterSpacing: '0.02em',
            }}>
              Examiner Report
            </span>
          </div>
          <button
            onClick={onClose}
            style={{ color: 'rgba(200,168,76,0.6)', background: 'none', border: 'none', cursor: 'pointer', padding: '4px', borderRadius: '6px' }}
            aria-label="Close"
          >
            <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* PDF viewer — fills remaining space */}
        <div style={{ flex: 1, overflow: 'hidden', background: '#1a1a1a' }}>
          {pdfStatus === 'loading' && (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%' }}>
              <div style={{ textAlign: 'center' }}>
                <div style={{
                  width: '36px', height: '36px',
                  border: '3px solid rgba(200,168,76,0.15)',
                  borderTop: '3px solid #c8a84c',
                  borderRadius: '50%',
                  animation: 'spin 0.8s linear infinite',
                  margin: '0 auto 12px',
                }} />
                <p style={{ color: 'rgba(200,168,76,0.5)', fontSize: '12px', fontFamily: 'Inter, sans-serif' }}>
                  Loading Examiner Report…
                </p>
              </div>
            </div>
          )}

          {pdfStatus === 'unavailable' && (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', padding: '24px' }}>
              <div style={{ textAlign: 'center' }}>
                <p style={{ color: 'rgba(200,168,76,0.6)', fontSize: '13px', fontFamily: 'Inter, sans-serif', marginBottom: '12px' }}>
                  Examiner Report PDF not available for this paper.
                </p>
                {/* Fallback: show extracted text */}
                {erNote && (
                  <div style={{
                    background: 'rgba(200,168,76,0.05)',
                    border: '1px solid rgba(200,168,76,0.15)',
                    borderRadius: '8px',
                    padding: '16px',
                    textAlign: 'left',
                    maxHeight: '300px',
                    overflowY: 'auto',
                  }}>
                    <p style={{ color: '#c8a84c', fontSize: '10px', fontWeight: 700, letterSpacing: '0.08em', marginBottom: '8px', fontFamily: 'Inter, sans-serif' }}>
                      EXTRACTED TEXT
                    </p>
                    <p style={{ color: 'rgba(232,220,196,0.8)', fontSize: '13px', lineHeight: '1.7', fontFamily: 'Inter, sans-serif' }}>
                      {erNote}
                    </p>
                  </div>
                )}
              </div>
            </div>
          )}

          {pdfStatus === 'ready' && blobUrl && (
            <iframe
              src={`${blobUrl}#toolbar=0&navpanes=0&scrollbar=1&view=FitH`}
              style={{ width: '100%', height: '100%', border: 'none', display: 'block' }}
              title="Examiner Report"
            />
          )}
        </div>
      </div>

      {/* Spin keyframe */}
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </>
  );
}

// Made with Bob
