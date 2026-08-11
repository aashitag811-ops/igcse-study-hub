'use client';

import React, { useState, useEffect } from 'react';

interface PDFViewerProps {
  pdfUrl: string;
  title: string;
  className?: string;
}

export function PDFViewer({ pdfUrl, title, className = '' }: PDFViewerProps) {
  const [blobUrl, setBlobUrl] = useState<string | null>(null);
  const [status, setStatus] = useState<'loading' | 'ready' | 'unavailable'>('loading');

  useEffect(() => {
    let objectUrl: string | null = null;
    let cancelled = false;

    setStatus('loading');
    setBlobUrl(null);

    fetch(pdfUrl)
      .then(res => {
        if (!res.ok) return null;
        // Accept application/pdf or application/octet-stream (GitHub LFS CDN)
        const ct = res.headers.get('content-type') || '';
        if (!ct.includes('pdf') && !ct.includes('octet-stream')) return null;
        return res.blob();
      })
      .then(blob => {
        if (cancelled) return;
        if (!blob) {
          setStatus('unavailable');
          return;
        }
        objectUrl = URL.createObjectURL(blob);
        setBlobUrl(objectUrl);
        setStatus('ready');
      })
      .catch(() => {
        if (!cancelled) setStatus('unavailable');
      });

    return () => {
      cancelled = true;
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [pdfUrl]);

  if (status === 'loading') {
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
          <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-2">{title} Not Published</h3>
          <p className="text-slate-500 dark:text-slate-400 text-sm leading-relaxed">
            Cambridge has not published this paper for this exam session.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className={`relative w-full h-full ${className}`}>
      <iframe
        src={`${blobUrl!}#view=FitH`}
        title={title}
        className="w-full h-full border-0"
      />
    </div>
  );
}

// Made with Bob
