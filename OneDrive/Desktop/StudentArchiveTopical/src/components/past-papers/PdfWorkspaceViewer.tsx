'use client';

import React, { useState, useEffect } from 'react';
import { Document, Page, pdfjs } from 'react-pdf';
import 'react-pdf/dist/Page/AnnotationLayer.css';
import 'react-pdf/dist/Page/TextLayer.css';

// Configure PDF.js worker - use specific version to avoid compatibility issues
if (typeof window !== 'undefined') {
  pdfjs.GlobalWorkerOptions.workerSrc = `//cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js`;
}

interface QuestionCoordinate {
  qNum: number;
  topPx: number;
  page: number;
  text: string;
}

interface PdfWorkspaceViewerProps {
  pdfUrl: string;
  paperId: string;
  erNotes?: Record<string, string>;
  onERClick?: (questionNumber: number) => void;
}

export function PdfWorkspaceViewer({ pdfUrl, paperId, erNotes = {}, onERClick }: PdfWorkspaceViewerProps) {
  const [numPages, setNumPages] = useState<number>(0);
  const [pageNumber, setPageNumber] = useState<number>(1);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [questionCoordinates, setQuestionCoordinates] = useState<QuestionCoordinate[]>([]);

  // Fetch question coordinates on mount
  useEffect(() => {
    const fetchCoordinates = async () => {
      try {
        const response = await fetch(`/api/question-coords/${paperId}`);
        if (response.ok) {
          const data = await response.json();
          setQuestionCoordinates(data.coordinates || []);
        }
      } catch (error) {
        console.error('Failed to fetch question coordinates:', error);
      }
    };

    fetchCoordinates();
  }, [paperId]);

  function onDocumentLoadSuccess({ numPages }: { numPages: number }) {
    setNumPages(numPages);
    setIsLoading(false);
  }

  function onDocumentLoadError(error: Error) {
    console.error('Error loading PDF:', error);
    setError('Failed to load PDF document');
    setIsLoading(false);
  }

  return (
    <div className="relative w-full h-full flex bg-[#0D0D0D]">
      {/* LEFT COLUMN: PDF CANVAS WITH FLOATING ER BUTTONS */}
      <div className="relative flex-1 h-full overflow-y-auto p-6 scrollbar-thin">
        <div className="relative mx-auto max-w-3xl bg-white shadow-2xl rounded-sm">
          
          {/* Loading State */}
          {isLoading && (
            <div className="absolute inset-0 flex items-center justify-center bg-slate-100 z-50">
              <div className="text-center">
                <div className="w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
                <p className="text-slate-600 font-medium">Loading PDF...</p>
              </div>
            </div>
          )}

          {/* Error State */}
          {error && (
            <div className="absolute inset-0 flex items-center justify-center bg-slate-100 z-50">
              <div className="text-center max-w-lg px-6">
                <svg className="w-20 h-20 text-amber-500 mx-auto mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
                <h3 className="text-xl font-bold text-slate-900 mb-3">PDF Not Available</h3>
                <p className="text-slate-600 mb-6">{error}</p>
              </div>
            </div>
          )}

          {/* PDF DOCUMENT RENDERER */}
          <Document
            file={pdfUrl}
            onLoadSuccess={onDocumentLoadSuccess}
            onLoadError={onDocumentLoadError}
            loading=""
            error=""
          >
            {Array.from(new Array(numPages), (el, index) => (
              <div key={`page_${index + 1}`} className="relative mb-4">
                <Page
                  pageNumber={index + 1}
                  renderTextLayer={true}
                  renderAnnotationLayer={true}
                  width={800}
                  className="shadow-lg"
                />
                
                {/* FLOATING ER BUTTONS FOR THIS PAGE */}
                {questionCoordinates
                  .filter(q => q.page === index + 1 && erNotes[q.qNum.toString()])
                  .map((q) => (
                    <button
                      key={q.qNum}
                      onClick={() => onERClick?.(q.qNum)}
                      style={{ 
                        top: `${q.topPx}px`, 
                        left: '24px',
                        position: 'absolute'
                      }}
                      className="z-30 flex items-center gap-1 bg-zinc-950/90 hover:bg-zinc-900 text-amber-400 border border-amber-500/30 text-[11px] font-medium px-2 py-1 rounded-md shadow-lg transition-transform hover:scale-105"
                      title={`View Examiner Report for Question ${q.qNum}`}
                    >
                      🔍 ER Q{q.qNum}
                    </button>
                  ))}
              </div>
            ))}
          </Document>

          {/* PAGE NAVIGATION */}
          {numPages > 0 && (
            <div className="sticky bottom-4 left-0 right-0 flex justify-center mt-4 z-40">
              <div className="bg-slate-900/95 backdrop-blur-sm text-white px-4 py-2 rounded-full shadow-xl flex items-center gap-3">
                <button
                  onClick={() => setPageNumber(Math.max(1, pageNumber - 1))}
                  disabled={pageNumber <= 1}
                  className="px-3 py-1 bg-slate-700 hover:bg-slate-600 disabled:opacity-50 disabled:cursor-not-allowed rounded-md text-sm font-medium transition-colors"
                >
                  ← Prev
                </button>
                <span className="text-sm font-medium">
                  Page {pageNumber} of {numPages}
                </span>
                <button
                  onClick={() => setPageNumber(Math.min(numPages, pageNumber + 1))}
                  disabled={pageNumber >= numPages}
                  className="px-3 py-1 bg-slate-700 hover:bg-slate-600 disabled:opacity-50 disabled:cursor-not-allowed rounded-md text-sm font-medium transition-colors"
                >
                  Next →
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// Made with Bob
