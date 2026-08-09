'use client';

import React, { useState, useEffect } from 'react';
import { PDFViewer } from './PDFViewer';
import { PDFViewerWithEROverlay } from './PDFViewerWithEROverlay';
import { ExaminerReportModal } from './ExaminerReportModal';
import { pdfUrl } from '@/lib/assetUrl';

interface ViewPastPapersPDFModeProps {
  paperId: string;
  subjectCode: string;
  subjectName: string;
  displayName: string;
  onExit?: () => void;
}

export function ViewPastPapersPDFMode({
  paperId,
  subjectCode,
  subjectName,
  displayName,
  onExit
}: ViewPastPapersPDFModeProps) {
  const [showQP, setShowQP] = useState(true);
  const [showMS, setShowMS] = useState(true);
  const [showER, setShowER] = useState(false);
  const [erNotes, setErNotes] = useState<Record<string, string>>({});
  const [selectedQuestion, setSelectedQuestion] = useState<number | null>(null);
  const [showGeneralER, setShowGeneralER] = useState(false);
  const [isLoadingER, setIsLoadingER] = useState(false);

  // Fetch ER notes on mount
  useEffect(() => {
    const fetchERNotes = async () => {
      setIsLoadingER(true);
      try {
        const response = await fetch(`/api/er-notes/${paperId}`);
        if (response.ok) {
          const data = await response.json();
          setErNotes(data.notes || {});
          setShowER(Object.keys(data.notes || {}).length > 0);
        }
      } catch (error) {
        console.error('Failed to fetch ER notes:', error);
      } finally {
        setIsLoadingER(false);
      }
    };

    fetchERNotes();
  }, [paperId]);

  const handleERClick = (questionNumber: number) => {
    if (erNotes[questionNumber.toString()]) {
      setShowGeneralER(false);
      setSelectedQuestion(questionNumber);
    }
  };

  const handleGeneralERClick = () => {
    setSelectedQuestion(null);
    setShowGeneralER(true);
  };

  const closeERModal = () => {
    setSelectedQuestion(null);
    setShowGeneralER(false);
  };

  // Generate PDF URLs — uses NEXT_PUBLIC_ASSET_BASE_URL in production (Cloudflare R2)
  // Falls back to /pdfs/ locally via the API proxy
  const qpPdfUrl = pdfUrl(paperId);
  const msPdfUrl = pdfUrl(paperId.replace('_qp_', '_ms_'));

  // Calculate layout classes
  const getLayoutClasses = () => {
    if (showQP && showMS) {
      return 'grid grid-cols-2 gap-4';
    }
    return 'grid grid-cols-1';
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900">
      {/* Header */}
      <div className="sticky top-0 z-30 bg-white dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700 shadow-sm">
        <div className="max-w-[1920px] mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            {/* Title */}
            <div>
              <h1 className="text-xl font-bold text-slate-900 dark:text-white">
                {displayName}
              </h1>
              <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">
                {subjectName} ({subjectCode})
              </p>
            </div>

            {/* Toggle Matrix Panel */}
            <div className="flex items-center gap-3">
              {/* QP Toggle */}
              <button
                onClick={() => setShowQP(!showQP)}
                className={`
                  px-4 py-2 rounded-lg font-semibold text-sm transition-all border-2
                  ${showQP
                    ? 'bg-blue-500 text-white border-blue-500 shadow-md'
                    : 'bg-white dark:bg-slate-700 text-slate-600 dark:text-slate-300 border-slate-300 dark:border-slate-600 hover:border-blue-400'
                  }
                `}
                title={showQP ? 'Hide Question Paper' : 'Show Question Paper'}
              >
                QP
              </button>

              {/* MS Toggle */}
              <button
                onClick={() => setShowMS(!showMS)}
                className={`
                  px-4 py-2 rounded-lg font-semibold text-sm transition-all border-2
                  ${showMS
                    ? 'bg-green-500 text-white border-green-500 shadow-md'
                    : 'bg-white dark:bg-slate-700 text-slate-600 dark:text-slate-300 border-slate-300 dark:border-slate-600 hover:border-green-400'
                  }
                `}
                title={showMS ? 'Hide Marking Scheme' : 'Show Marking Scheme'}
              >
                MS
              </button>

              {/* ER Toggle - Opens full ER PDF */}
              {showER && (
                <a
                  href={pdfUrl(paperId.replace(/_qp_\d+/, '_er'))}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-4 py-2 rounded-lg font-semibold text-sm transition-all border-2 bg-amber-500 hover:bg-amber-600 text-white border-amber-500 shadow-md flex items-center gap-2"
                  title="Open full Examiner Report PDF"
                >
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                  </svg>
                  Open Full ER PDF
                </a>
              )}

              {/* Exit Button */}
              {onExit && (
                <button
                  onClick={onExit}
                  className="px-4 py-2 rounded-lg font-semibold text-sm bg-white dark:bg-slate-700 text-slate-700 dark:text-slate-300 border-2 border-slate-300 dark:border-slate-600 hover:bg-slate-50 dark:hover:bg-slate-600 transition-colors"
                >
                  Exit
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Dual-Pane PDF Layout */}
      <div className={`max-w-[1920px] mx-auto p-6 ${getLayoutClasses()}`} style={{ height: 'calc(100vh - 100px)' }}>
        {/* Left Pane - Question Paper (QP) with Floating ER Buttons */}
        {showQP && (
          <div className="bg-white dark:bg-slate-800 rounded-xl shadow-lg overflow-hidden">
            <div className="sticky top-0 bg-blue-50 dark:bg-blue-900/20 px-6 py-3 border-b border-blue-200 dark:border-blue-800 z-10">
              <h2 className="text-lg font-bold text-blue-900 dark:text-blue-100 flex items-center gap-2">
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                Question Paper
                {showER && (
                  <>
                    <span className="ml-2 text-xs bg-amber-500 text-white px-2 py-0.5 rounded-full">
                      ER Available - Click buttons on PDF
                    </span>
                    {erNotes['general'] && (
                      <button
                        onClick={handleGeneralERClick}
                        className="ml-2 text-xs bg-amber-100 hover:bg-amber-200 dark:bg-amber-900/30 dark:hover:bg-amber-900/50 text-amber-800 dark:text-amber-200 border border-amber-400 px-2 py-0.5 rounded-full transition-colors font-semibold"
                      >
                        General ER Comments
                      </button>
                    )}
                  </>
                )}
              </h2>
            </div>
            <div style={{ height: 'calc(100vh - 200px)' }}>
              {showER && Object.keys(erNotes).length > 0 ? (
                <PDFViewerWithEROverlay
                  pdfUrl={qpPdfUrl}
                  paperId={paperId}
                  erNotes={erNotes}
                  onERClick={handleERClick}
                />
              ) : (
                <PDFViewer
                  pdfUrl={qpPdfUrl}
                  title="Question Paper"
                  className="h-full"
                />
              )}
            </div>
          </div>
        )}

        {/* Right Pane - Marking Scheme (MS) */}
        {showMS && (
          <div className="bg-white dark:bg-slate-800 rounded-xl shadow-lg overflow-hidden">
            <div className="sticky top-0 bg-green-50 dark:bg-green-900/20 px-6 py-3 border-b border-green-200 dark:border-green-800 z-10">
              <h2 className="text-lg font-bold text-green-900 dark:text-green-100 flex items-center gap-2">
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
                </svg>
                Marking Scheme
              </h2>
            </div>
            <div style={{ height: 'calc(100vh - 200px)' }}>
              <PDFViewer 
                pdfUrl={msPdfUrl} 
                title="Marking Scheme"
                className="h-full"
              />
            </div>
          </div>
        )}
      </div>

      {/* Examiner Report Modal — per-question or general */}
      {(selectedQuestion !== null || showGeneralER) && (
        <ExaminerReportModal
          isOpen={true}
          onClose={closeERModal}
          questionNumber={showGeneralER ? null : selectedQuestion}
          erNote={showGeneralER ? (erNotes['general'] || '') : (erNotes[selectedQuestion!.toString()] || '')}
        />
      )}
    </div>
  );
}

// Made with Bob