'use client';

import React from 'react';

interface ExaminerReportModalProps {
  isOpen: boolean;
  onClose: () => void;
  // Pass questionNumber for per-question mode, or null for general comments mode
  questionNumber: number | null;
  erNote: string;
}

export function ExaminerReportModal({
  isOpen,
  onClose,
  questionNumber,
  erNote
}: ExaminerReportModalProps) {
  if (!isOpen) return null;

  const isGeneral = questionNumber === null;

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/50 z-50 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 pointer-events-none">
        <div
          className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl max-w-2xl w-full max-h-[80vh] overflow-hidden pointer-events-auto"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="bg-gradient-to-r from-amber-500 to-orange-500 px-6 py-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="bg-white/20 backdrop-blur-sm rounded-lg px-3 py-1">
                <span className="text-white font-bold text-sm">
                  {isGeneral ? 'General' : `Q${questionNumber}`}
                </span>
              </div>
              <h2 className="text-xl font-bold text-white">
                {isGeneral ? 'General ER Comments' : 'Examiner Report Insights'}
              </h2>
            </div>
            <button
              onClick={onClose}
              className="text-white hover:bg-white/20 rounded-lg p-2 transition-colors"
              aria-label="Close"
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {/* Content */}
          <div className="p-6 overflow-y-auto max-h-[calc(80vh-80px)]">
            <div className="bg-amber-50 dark:bg-amber-900/10 border-l-4 border-amber-500 rounded-r-lg p-5">
              <div className="flex items-start gap-3">
                <div className="flex-shrink-0 mt-1">
                  <svg
                    className="w-5 h-5 text-amber-600 dark:text-amber-400"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                    />
                  </svg>
                </div>
                <div className="flex-1">
                  <h3 className="text-sm font-semibold text-amber-900 dark:text-amber-100 mb-2 uppercase tracking-wider">
                    {isGeneral ? 'General Examiner Comments' : 'Cambridge Examiner Feedback'}
                  </h3>
                  <p className="text-slate-700 dark:text-slate-300 leading-relaxed whitespace-pre-wrap">
                    {erNote}
                  </p>
                </div>
              </div>
            </div>

            {/* Footer note */}
            <div className="mt-4 text-xs text-slate-500 dark:text-slate-400 italic">
              This feedback is extracted from the official Cambridge IGCSE Examiner Report,
              highlighting common mistakes and areas where students typically struggle.
            </div>
          </div>
        </div>
      </div>
    </>
  );
}

// Made with Bob
