'use client';

import React, { useState } from 'react';

interface PDFViewerProps {
  pdfUrl: string;
  title: string;
  className?: string;
}

export function PDFViewer({ pdfUrl, title, className = '' }: PDFViewerProps) {
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const handleLoad = () => {
    setIsLoading(false);
  };

  const handleError = () => {
    setIsLoading(false);
    setError('Failed to load PDF. Please check the file path.');
  };

  return (
    <div className={`relative w-full h-full ${className}`}>
      {/* Loading State */}
      {isLoading && (
        <div className="absolute inset-0 flex items-center justify-center bg-slate-100 dark:bg-slate-800">
          <div className="text-center">
            <div className="w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
            <p className="text-slate-600 dark:text-slate-400 font-medium">Loading {title}...</p>
          </div>
        </div>
      )}

      {/* Error State */}
      {error && (
        <div className="absolute inset-0 flex items-center justify-center bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-800 dark:to-slate-900">
          <div className="text-center max-w-lg px-6">
            <div className="mb-6">
              <svg className="w-20 h-20 text-amber-500 mx-auto mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 9v2m0 4h.01" />
              </svg>
            </div>
            <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-3">Paper Not Available</h3>
            <p className="text-slate-600 dark:text-slate-400 mb-2 leading-relaxed">
              This specific paper component/variant combination was not held during this exam series.
            </p>
            <p className="text-sm text-slate-500 dark:text-slate-500 mb-6">
              Cambridge IGCSE exam scheduling varies by session and administrative zone.
            </p>
            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <button
                onClick={() => window.history.back()}
                className="inline-flex items-center justify-center gap-2 px-5 py-2.5 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors font-medium shadow-md"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                </svg>
                Choose Different Paper
              </button>
            </div>
          </div>
        </div>
      )}

      {/* PDF Embed */}
      <iframe
        src={`${pdfUrl}#view=FitH`}
        title={title}
        className="w-full h-full border-0"
        onLoad={handleLoad}
        onError={handleError}
      />
    </div>
  );
}

// Made with Bob