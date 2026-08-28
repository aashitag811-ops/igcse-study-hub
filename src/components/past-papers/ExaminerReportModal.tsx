'use client';

import React, { useState, useEffect, useRef } from 'react';

interface ExaminerReportModalProps {
  isOpen: boolean;
  onClose: () => void;
  label: string;
  erNote: string;        // fallback only
  erPdfUrl?: string;
  targetPage?: number;   // 1-based page to scroll to
}

export function ExaminerReportModal({
  isOpen,
  onClose,
  label,
  erNote,
  erPdfUrl,
  targetPage = 1,
}: ExaminerReportModalProps) {
  const canvasWrapperRef = useRef<HTMLDivElement>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const [status, setStatus] = useState<'idle' | 'loading' | 'ready' | 'unavailable'>('idle');

  useEffect(() => {
    if (!isOpen) {
      setStatus('idle');
      return;
    }
    if (!erPdfUrl) { setStatus('unavailable'); return; }

    let cancelled = false;
    let blobUrl: string | null = null;
    setStatus('loading');
    if (canvasWrapperRef.current) canvasWrapperRef.current.innerHTML = '';

    const run = async () => {
      try {
        const res = await fetch(erPdfUrl);
        if (!res.ok || cancelled) { setStatus('unavailable'); return; }
        const blob = await res.blob();
        if (cancelled) return;
        blobUrl = URL.createObjectURL(blob);

        const pdfjs = await import('pdfjs-dist');
        pdfjs.GlobalWorkerOptions.workerSrc = '/pdf.worker.min.mjs';
        if (cancelled) return;

        const pdf = await pdfjs.getDocument(blobUrl).promise;
        if (cancelled) return;

        const scale = 2.5;
        // qnum extracted from label e.g. "Q 5. (a)" → "5", "Q 12" → "12"
        const qnumMatch = targetPage > 0 ? label.match(/Q\s*(\d+)/) : null;
        const targetQNum = qnumMatch ? qnumMatch[1] : null;

        for (let i = 1; i <= pdf.numPages; i++) {
          if (cancelled) return;
          const page = await pdf.getPage(i);
          const vp = page.getViewport({ scale });

          const wrapper = document.createElement('div');
          wrapper.style.cssText = 'position:relative;margin-bottom:8px;flex-shrink:0;';
          wrapper.setAttribute('data-page', String(i));

          const canvas = document.createElement('canvas');
          canvas.width = vp.width;
          canvas.height = vp.height;
          canvas.style.cssText = 'width:100%;display:block;';
          wrapper.appendChild(canvas);
          canvasWrapperRef.current?.appendChild(wrapper);

          const ctx = canvas.getContext('2d');
          if (ctx) await page.render({ canvasContext: ctx, viewport: vp }).promise;

          // On the target page, find exact Y of "Question N" heading
          if (i === targetPage && targetQNum) {
            try {
              const tc = await page.getTextContent();
              const naturalVp = page.getViewport({ scale: 1 });
              for (const item of tc.items as any[]) {
                if (/^Question\s+/i.test(item.str?.trim()) &&
                    item.str.trim().includes(targetQNum)) {
                  // item.transform[5] = y from bottom in natural coords
                  const yFromTop = naturalVp.height - item.transform[5];
                  // store as data attr so scroll effect can read it
                  wrapper.setAttribute('data-q-y', String(yFromTop * scale));
                  break;
                }
              }
            } catch { /* ignore */ }
          }
        }

        if (!cancelled) setStatus('ready');
      } catch {
        if (!cancelled) setStatus('unavailable');
      }
    };

    run();
    return () => {
      cancelled = true;
      if (blobUrl) URL.revokeObjectURL(blobUrl);
    };
  }, [isOpen, erPdfUrl]);

  // Once ready, scroll so "Question N" heading is at the very top
  useEffect(() => {
    if (status !== 'ready') return;
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        const wrapper = canvasWrapperRef.current?.querySelector<HTMLDivElement>(
          `div[data-page="${targetPage}"]`
        );
        if (!wrapper || !scrollContainerRef.current) return;
        // If we found the exact Y of the question heading within the page, use it
        const qY = parseFloat(wrapper.getAttribute('data-q-y') ?? '');
        // wrapper.offsetTop = top of the page canvas within the scroll container
        // qY = px offset of the heading within that canvas (at render scale)
        // Scale qY by the canvas CSS width / canvas pixel width ratio
        const canvas = wrapper.querySelector('canvas');
        const cssScale = canvas ? (canvas.offsetWidth / canvas.width) : 1;
        const scrollTop = wrapper.offsetTop + (isNaN(qY) ? 0 : qY * cssScale);
        scrollContainerRef.current.scrollTop = scrollTop;
      });
    });
  }, [status, targetPage]);

  if (!isOpen) return null;

  return (
    <>
      {/* Backdrop */}
      <div className="fixed inset-0 bg-black/60 z-50" onClick={onClose} />

      {/* Panel — centred, compact */}
      <div
        className="fixed z-50 flex flex-col"
        style={{
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
          width: 'min(900px, calc(100vw - 32px))',
          height: 'min(88vh, 960px)',
          background: '#0d1018',
          border: '1px solid rgba(200,168,76,0.2)',
          borderRadius: '14px',
          boxShadow: '0 12px 60px rgba(0,0,0,0.8)',
          overflow: 'hidden',
        }}
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div style={{
          background: 'linear-gradient(90deg,#261c08,#1a1406)',
          borderBottom: '1px solid rgba(200,168,76,0.2)',
          padding: '10px 16px',
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
              fontSize: '12px', fontWeight: 700,
              color: '#c8a84c',
              fontFamily: 'Inter,sans-serif',
            }}>
              {label}
            </span>
            <span style={{
              fontSize: '14px', fontWeight: 600,
              color: '#e8dcc4',
              fontFamily: "'Cormorant Garamond',Georgia,serif",
              letterSpacing: '0.02em',
            }}>
              Examiner Report
            </span>
          </div>
          <button
            onClick={onClose}
            style={{ color: 'rgba(200,168,76,0.6)', background: 'none', border: 'none', cursor: 'pointer', padding: '4px' }}
            aria-label="Close"
          >
            <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Body */}
        <div style={{ flex: 1, overflow: 'hidden', position: 'relative', background: '#111' }}>

          {/* Loading */}
          {status === 'loading' && (
            <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <div style={{ textAlign: 'center' }}>
                <div style={{
                  width: 36, height: 36,
                  border: '3px solid rgba(200,168,76,0.15)',
                  borderTop: '3px solid #c8a84c',
                  borderRadius: '50%',
                  animation: 'er-spin 0.8s linear infinite',
                  margin: '0 auto 10px',
                }} />
                <p style={{ color: 'rgba(200,168,76,0.5)', fontSize: 12, fontFamily: 'Inter,sans-serif' }}>
                  Loading Examiner Report…
                </p>
              </div>
            </div>
          )}

          {/* Unavailable */}
          {status === 'unavailable' && (
            <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
              <div style={{ textAlign: 'center' }}>
                <p style={{ color: 'rgba(200,168,76,0.5)', fontSize: 13, fontFamily: 'Inter,sans-serif', marginBottom: 12 }}>
                  Examiner Report PDF not available.
                </p>
                {erNote && (
                  <div style={{
                    background: 'rgba(200,168,76,0.05)',
                    border: '1px solid rgba(200,168,76,0.15)',
                    borderRadius: 8, padding: 16,
                    textAlign: 'left', maxHeight: 300, overflowY: 'auto',
                  }}>
                    <p style={{ color: 'rgba(232,220,196,0.8)', fontSize: 13, lineHeight: 1.7, fontFamily: 'Inter,sans-serif' }}>
                      {erNote}
                    </p>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* PDF canvas scroll area */}
          <div
            ref={scrollContainerRef}
            style={{
              position: 'absolute', inset: 0,
              overflowY: 'scroll',
              padding: '8px',
              display: status === 'unavailable' ? 'none' : 'block',
            }}
          >
            <div ref={canvasWrapperRef} style={{ display: 'flex', flexDirection: 'column' }} />
          </div>
        </div>
      </div>

      <style>{`@keyframes er-spin { to { transform: rotate(360deg); } }`}</style>
    </>
  );
}

// Made with Bob
