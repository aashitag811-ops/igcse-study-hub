'use client';

import React, { useState } from 'react';

interface StudyModeSelectorProps {
  onViewPapers: () => void;
  onStartPractice: () => void;
  onStartPracticeMode: () => void;
  onStartTheoryExam?: () => void;
  isPaperSelected: boolean;
  isTestModeEnabled: boolean;
  isTheoryPaper?: boolean;
  testModeMessage?: string;
  preferredMode?: string; // 'test', 'view', or 'practice'
}

export default function StudyModeSelector({
  onViewPapers,
  onStartPractice,
  onStartPracticeMode,
  onStartTheoryExam,
  isPaperSelected,
  isTestModeEnabled,
  isTheoryPaper,
  testModeMessage,
  preferredMode
}: StudyModeSelectorProps) {
  const [activeMode, setActiveMode] = useState<'study' | 'test' | 'practice' | 'theory'>(() => {
    if (preferredMode === 'theory') return 'theory';
    if (!isTestModeEnabled) return 'study';
    if (preferredMode === 'test') return 'test';
    if (preferredMode === 'practice') return 'practice';
    return 'study';
  });

  const handleStudyClick = () => setActiveMode('study');
  const handleTestClick = () => setActiveMode('test');
  const handlePracticeClick = () => setActiveMode('practice');
  const handleTheoryClick = () => setActiveMode('theory');

  const handleLaunchStudy = () => {
    if (isPaperSelected) onViewPapers();
  };

  const handleLaunchTest = () => {
    if (isPaperSelected && isTestModeEnabled) onStartPractice();
  };

  const handleLaunchPractice = () => {
    if (isPaperSelected && isTestModeEnabled) onStartPracticeMode();
  };

  const handleLaunchTheory = () => {
    if (isPaperSelected && isTheoryPaper) onStartTheoryExam?.();
  };

  return (
    <div className="w-full max-w-6xl mx-auto p-8 rounded-3xl shadow-2xl bg-white border border-slate-200">
      <h3 className="font-serif text-2xl tracking-wide mb-6 text-center lg:text-left text-amber-600">
        Select Your Exploration Method
      </h3>

      {/* THE ROW WRAPPER */}
      <div className="w-full flex flex-col lg:flex-row gap-6 items-stretch min-h-[220px]">
        
        {/* --- CARD 1: VIEW PAST PAPERS (STUDY MODE) --- */}
        <div
          onClick={handleStudyClick}
          className={`cursor-pointer group relative flex flex-col justify-between p-8 rounded-2xl border backdrop-blur-md transition-all duration-300 ease-in-out select-none
            ${activeMode === 'study'
              ? 'w-full lg:w-[60%] border-amber-500/40 shadow-lg bg-amber-50/50 shadow-amber-500/10'
              : 'w-full lg:w-[20%] opacity-60 hover:opacity-90 bg-slate-100/50 border-slate-300'
            }
          `}
        >
          <div className="flex items-start justify-between">
            <div className="space-y-2">
              <div className="flex items-center gap-3">
                <svg className={`w-6 h-6 ${activeMode === 'study' ? 'text-amber-600' : 'text-slate-400'}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                </svg>
                <h4 className={`font-serif text-xl transition-colors group-hover:text-amber-600 ${!isTestModeEnabled ? 'text-amber-600 font-bold' : 'text-slate-900'}`}>
                  View Past Papers
                </h4>
              </div>
              
              {activeMode === 'study' && (
                <p className="text-sm font-light max-w-md transition-opacity duration-300 text-slate-600">
                  Open the archives. Side-by-side viewport displaying original question scripts alongside official Cambridge grading criteria files.
                </p>
              )}
            </div>
            
            <span className="text-xs font-mono uppercase tracking-widest text-slate-400">01 / Study</span>
          </div>

          {activeMode === 'study' && (
            <div className="mt-6 pt-4 border-t flex justify-between items-center animate-fadeIn border-slate-200">
              <span className="text-xs font-medium tracking-wide text-amber-600">✓ Dual-Viewport Mode Enabled</span>
              <button
                onClick={(e) => { e.stopPropagation(); handleLaunchStudy(); }}
                disabled={!isPaperSelected}
                className="font-bold px-5 py-2 rounded-xl text-sm transition-all shadow-md disabled:opacity-50 disabled:cursor-not-allowed bg-amber-600 hover:bg-amber-700 text-white disabled:hover:bg-amber-600"
              >
                Launch Workspace
              </button>
            </div>
          )}
        </div>

        {/* --- CARD 2: EXAM MODE (timed full paper) --- */}
        <div
          onClick={handleTestClick}
          className={`cursor-pointer group relative flex flex-col justify-between p-8 rounded-2xl border backdrop-blur-md transition-all duration-300 ease-in-out select-none
            ${activeMode === 'test'
              ? 'w-full lg:w-[60%] border-amber-500/40 shadow-lg bg-amber-50/50 shadow-amber-500/10'
              : 'w-full lg:w-[20%] opacity-60 hover:opacity-90 bg-slate-100/50 border-slate-300'
            }
          `}
        >
          <div className="flex items-start justify-between">
            <div className="space-y-2">
              <div className="flex items-center gap-3">
                <svg className={`w-6 h-6 ${activeMode === 'test' ? 'text-amber-600' : 'text-slate-400'}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z" />
                </svg>
                <h4 className="font-serif text-xl transition-colors text-slate-900 group-hover:text-amber-600">
                  Exam Mode
                </h4>
              </div>

              {activeMode === 'test' && (
                <p className="text-sm font-light max-w-md transition-opacity duration-300 text-slate-600">
                  Timed full-paper simulation. Answer all questions under exam conditions, then submit for a complete score report.
                </p>
              )}
            </div>

            <span className="text-xs font-mono uppercase tracking-widest text-slate-400">02 / Exam</span>
          </div>

          {activeMode === 'test' && (
            <div className="mt-6 pt-4 border-t flex flex-col gap-3 border-slate-200">
              <div className="flex justify-between items-center animate-fadeIn">
                {isTestModeEnabled ? (
                  <>
                    <span className="text-xs font-medium tracking-wide text-amber-600">⚡ Timed Simulator Ready</span>
                    <button
                      onClick={(e) => { e.stopPropagation(); handleLaunchTest(); }}
                      disabled={!isPaperSelected}
                      className="font-bold px-5 py-2 rounded-xl text-sm transition-all shadow-md disabled:opacity-50 disabled:cursor-not-allowed bg-amber-600 hover:bg-amber-700 text-white disabled:hover:bg-amber-600"
                    >
                      Begin Exam
                    </button>
                  </>
                ) : (
                  <>
                    <span className="text-xs font-medium tracking-wide flex items-center gap-2 text-slate-500">
                      🔒 <span>Mode Locked</span>
                    </span>
                    <button
                      disabled
                      className="font-bold px-5 py-2 rounded-xl text-sm cursor-not-allowed bg-slate-200 text-slate-400 flex items-center gap-2"
                    >
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                      </svg>
                      Unavailable
                    </button>
                  </>
                )}
              </div>
              {!isTestModeEnabled && testModeMessage && (
                <div className="text-xs leading-relaxed rounded-lg p-3 text-slate-600 bg-slate-100 border border-slate-200">
                  {testModeMessage}
                </div>
              )}
            </div>
          )}
        </div>

        {/* --- CARD 3: PRACTICE MODE (one question at a time, instant feedback) --- */}
        <div
          onClick={handlePracticeClick}
          className={`cursor-pointer group relative flex flex-col justify-between p-8 rounded-2xl border backdrop-blur-md transition-all duration-300 ease-in-out select-none
            ${activeMode === 'practice'
              ? 'w-full lg:w-[60%] border-amber-500/40 shadow-lg bg-amber-50/50 shadow-amber-500/10'
              : 'w-full lg:w-[20%] opacity-60 hover:opacity-90 bg-slate-100/50 border-slate-300'
            }
          `}
        >
          <div className="flex items-start justify-between">
            <div className="space-y-2">
              <div className="flex items-center gap-3">
                <svg className={`w-6 h-6 ${activeMode === 'practice' ? 'text-amber-600' : 'text-slate-400'}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
                <h4 className="font-serif text-xl transition-colors text-slate-900 group-hover:text-amber-600">
                  Practice Mode
                </h4>
              </div>

              {activeMode === 'practice' && (
                <p className="text-sm font-light max-w-md transition-opacity duration-300 text-slate-600">
                  Question-by-question walkthrough with instant answer feedback, examiner report notes, and a running score tracker.
                </p>
              )}
            </div>

            <span className="text-xs font-mono uppercase tracking-widest text-slate-400">03 / Practice</span>
          </div>

          {activeMode === 'practice' && (
            <div className="mt-6 pt-4 border-t flex flex-col gap-3 border-slate-200">
              <div className="flex justify-between items-center animate-fadeIn">
                {isTestModeEnabled ? (
                  <>
                    <span className="text-xs font-medium tracking-wide text-amber-600">✓ Instant Feedback Enabled</span>
                    <button
                      onClick={(e) => { e.stopPropagation(); handleLaunchPractice(); }}
                      disabled={!isPaperSelected}
                      className="font-bold px-5 py-2 rounded-xl text-sm transition-all shadow-md disabled:opacity-50 disabled:cursor-not-allowed bg-amber-600 hover:bg-amber-700 text-white disabled:hover:bg-amber-600"
                    >
                      Start Practising
                    </button>
                  </>
                ) : (
                  <>
                    <span className="text-xs font-medium tracking-wide flex items-center gap-2 text-slate-500">
                      🔒 <span>Mode Locked</span>
                    </span>
                    <button
                      disabled
                      className="font-bold px-5 py-2 rounded-xl text-sm cursor-not-allowed bg-slate-200 text-slate-400 flex items-center gap-2"
                    >
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                      </svg>
                      Unavailable
                    </button>
                  </>
                )}
              </div>
              {!isTestModeEnabled && testModeMessage && (
                <div className="text-xs leading-relaxed rounded-lg p-3 text-slate-600 bg-slate-100 border border-slate-200">
                  {testModeMessage}
                </div>
              )}
            </div>
          )}
        </div>

        {/* --- CARD 4: THEORY EXAM (type on the paper) --- */}
        {isTheoryPaper && (
          <div
            onClick={handleTheoryClick}
            className={`cursor-pointer group relative flex flex-col justify-between p-8 rounded-2xl border backdrop-blur-md transition-all duration-300 ease-in-out select-none
              ${activeMode === 'theory'
                ? 'w-full lg:w-[60%] border-purple-400/40 shadow-lg bg-purple-50/50 shadow-purple-500/10'
                : 'w-full lg:w-[20%] opacity-60 hover:opacity-90 bg-slate-100/50 border-slate-300'
              }
            `}
          >
            <div className="flex items-start justify-between">
              <div className="space-y-2">
                <div className="flex items-center gap-3">
                  <svg className={`w-6 h-6 ${activeMode === 'theory' ? 'text-purple-600' : 'text-slate-400'}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                  </svg>
                  <h4 className={`font-serif text-xl transition-colors group-hover:text-purple-600 ${activeMode === 'theory' ? 'text-purple-700 font-bold' : 'text-slate-900'}`}>
                    Theory Exam
                  </h4>
                </div>

                {activeMode === 'theory' && (
                  <p className="text-sm font-light max-w-md transition-opacity duration-300 text-slate-600">
                    Type your answers directly on the question paper. Inputs sit over every answer line — just like writing in the actual exam booklet.
                  </p>
                )}
              </div>

              <span className="text-xs font-mono uppercase tracking-widest text-slate-400">04 / Theory</span>
            </div>

            {activeMode === 'theory' && (
              <div className="mt-6 pt-4 border-t flex justify-between items-center animate-fadeIn border-slate-200">
                <span className="text-xs font-medium tracking-wide text-purple-600">✓ PDF Overlay Mode</span>
                <button
                  onClick={(e) => { e.stopPropagation(); handleLaunchTheory(); }}
                  disabled={!isPaperSelected}
                  className="font-bold px-5 py-2 rounded-xl text-sm transition-all shadow-md disabled:opacity-50 disabled:cursor-not-allowed bg-purple-600 hover:bg-purple-700 text-white disabled:hover:bg-purple-600"
                >
                  Open Theory Exam
                </button>
              </div>
            )}
          </div>
        )}

      </div>
    </div>
  );
}

// Made with Bob