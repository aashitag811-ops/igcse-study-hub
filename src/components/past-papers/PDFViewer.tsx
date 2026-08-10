'use client';

import React, { useState, useEffect } from 'react';

interface PDFViewerProps {
  pdfUrl: string;
  title: string;
  className?: string;
}

export function PDFViewer({ pdfUrl, title, className = '' }: PDFViewerProps) {
  const [status, setStatus] = useState<'checking' | 'available' | 'unavailable'>('checking');

  // Pre-check that the PDF actually exists before showing the iframe
  useEffect(() => {
    setStatus('checking');
    fetch(pdfUrl, { method: 'HEAD' })
      .then(res => {
        if (res.ok && res.headers.get('content-type')?.includes('pdf')) {
          setStatus('available');
        } else if (res.ok) {
          // Got 200 but not a PDF — likely a text/html error page
          setStatus('unavailable');
        } else {
          setStatus('unavailable');
        }
      })
      .catch(() => setStatus('unavailable'));
  }, [pdfUrl]);

  if (status === 'checking') {
    return (
      <div className={`relative w-full h-full ${className} flex items-center justify-center bg-slate-100 dark:bg-slate-800`}>
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-slate-600 dark:text-slate-400 font-medium">Loading {title}...</p>
        </div>
      </div>
    );
  }

  if (status === 'unavailable') {
    return (
      <div className={`relative w-full h-full ${className} flex items-center justify-center bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-800 dark:to-slate-900`}>
        <div className="text-center max-w-lg px-6">
          <svg className="w-16 h-16 text-amber-500 mx-auto mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
          <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-2">{title} Not Available</h3>
          <p className="text-slate-500 dark:text-slate-400 text-sm">
            This paper was not held during this exam session, or has not been published yet.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className={`relative w-full h-full ${className}`}>
      <iframe
        src={`${pdfUrl}#view=FitH`}
        title={title}
        className="w-full h-full border-0"
      />
    </div>
  );
}

// Made with Bob
