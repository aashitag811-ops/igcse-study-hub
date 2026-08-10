'use client';

import React, { useState } from 'react';

interface PDFViewerProps {
  pdfUrl: string;
  title: string;
  className?: string;
}

export function PDFViewer({ pdfUrl, title, className = '' }: PDFViewerProps) {
  const [isLoading, setIsLoading] = useState(true);

  return (
    <div className={`relative w-full h-full ${className}`}>
      {isLoading && (
        <div className="absolute inset-0 flex items-center justify-center bg-slate-100 dark:bg-slate-800 z-10">
          <div className="text-center">
            <div className="w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
            <p className="text-slate-600 dark:text-slate-400 font-medium">Loading {title}...</p>
          </div>
        </div>
      )}
      <iframe
        src={`${pdfUrl}#view=FitH`}
        title={title}
        className="w-full h-full border-0"
        onLoad={() => setIsLoading(false)}
      />
    </div>
  );
}

// Made with Bob
