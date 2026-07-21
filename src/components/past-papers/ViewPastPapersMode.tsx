'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { PastPaperData, ViewPastPapersState, ExaminerReport } from '@/lib/types/past-papers.types';
import { ExaminerReportDrawer } from './ExaminerReportDrawer';

interface ViewPastPapersModeProps {
  paperData: PastPaperData;
  onExit?: () => void;
}

export function ViewPastPapersMode({ paperData, onExit }: ViewPastPapersModeProps) {
  const [state, setState] = useState<ViewPastPapersState>({
    currentQuestionIndex: 0,
    showQP: true,
    showMS: true,
    isERDrawerOpen: false,
    selectedERQuestion: null,
    scrollSyncEnabled: true,
  });

  const qpPaneRef = useRef<HTMLDivElement>(null);
  const msPaneRef = useRef<HTMLDivElement>(null);
  const questionRefs = useRef<Map<number, HTMLDivElement>>(new Map());
  const isScrollingRef = useRef(false);

  // Handle QP/MS toggle
  const togglePane = useCallback((pane: 'qp' | 'ms') => {
    setState(prev => ({
      ...prev,
      showQP: pane === 'qp' ? !prev.showQP : prev.showQP,
      showMS: pane === 'ms' ? !prev.showMS : prev.showMS,
    }));
  }, []);

  // Handle ER drawer
  const openERDrawer = useCallback((questionNumber: number) => {
    setState(prev => ({
      ...prev,
      isERDrawerOpen: true,
      selectedERQuestion: questionNumber,
    }));
  }, []);

  const closeERDrawer = useCallback(() => {
    setState(prev => ({
      ...prev,
      isERDrawerOpen: false,
      selectedERQuestion: null,
    }));
  }, []);

  // Synced scroll logic using Intersection Observer
  useEffect(() => {
    if (!state.scrollSyncEnabled || !state.showQP || !state.showMS) return;

    const qpPane = qpPaneRef.current;
    if (!qpPane) return;

    const observerOptions = {
      root: qpPane,
      rootMargin: '-50% 0px -50% 0px', // Trigger when question is in center
      threshold: 0,
    };

    const observerCallback = (entries: IntersectionObserverEntry[]) => {
      entries.forEach(entry => {
        if (entry.isIntersecting && !isScrollingRef.current) {
          const questionNumber = parseInt(entry.target.getAttribute('data-question-number') || '0');
          if (questionNumber > 0) {
            // Sync MS pane to corresponding question
            syncMSPane(questionNumber);
          }
        }
      });
    };

    const observer = new IntersectionObserver(observerCallback, observerOptions);

    // Observe all question elements
    questionRefs.current.forEach((element) => {
      observer.observe(element);
    });

    return () => observer.disconnect();
  }, [state.scrollSyncEnabled, state.showQP, state.showMS]);

  const syncMSPane = useCallback((questionNumber: number) => {
    const msPane = msPaneRef.current;
    if (!msPane) return;

    // Find the corresponding marking scheme section
    const msSection = msPane.querySelector(`[data-ms-question="${questionNumber}"]`);
    if (msSection) {
      isScrollingRef.current = true;
      msSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
      
      // Reset scroll lock after animation
      setTimeout(() => {
        isScrollingRef.current = false;
      }, 1000);
    }
  }, []);

  // Get current examiner report
  const currentER = state.selectedERQuestion
    ? paperData.examinerReports.find(er => er.questionNumber === state.selectedERQuestion)
    : null;

  // Calculate layout classes
  const getLayoutClasses = () => {
    if (state.showQP && state.showMS) {
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
                {paperData.displayName}
              </h1>
              <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">
                {paperData.subjectName} ({paperData.subjectCode})
              </p>
            </div>

            {/* Toggle Matrix Panel */}
            <div className="flex items-center gap-3">
              {/* QP Toggle */}
              <button
                onClick={() => togglePane('qp')}
                className={`
                  px-4 py-2 rounded-lg font-semibold text-sm transition-all border-2
                  ${state.showQP
                    ? 'bg-blue-500 text-white border-blue-500 shadow-md'
                    : 'bg-white dark:bg-slate-700 text-slate-600 dark:text-slate-300 border-slate-300 dark:border-slate-600 hover:border-blue-400'
                  }
                `}
                title={state.showQP ? 'Hide Question Paper' : 'Show Question Paper'}
              >
                QP
              </button>

              {/* MS Toggle */}
              <button
                onClick={() => togglePane('ms')}
                className={`
                  px-4 py-2 rounded-lg font-semibold text-sm transition-all border-2
                  ${state.showMS
                    ? 'bg-green-500 text-white border-green-500 shadow-md'
                    : 'bg-white dark:bg-slate-700 text-slate-600 dark:text-slate-300 border-slate-300 dark:border-slate-600 hover:border-green-400'
                  }
                `}
                title={state.showMS ? 'Hide Marking Scheme' : 'Show Marking Scheme'}
              >
                MS
              </button>

              {/* Sync Toggle */}
              <button
                onClick={() => setState(prev => ({ ...prev, scrollSyncEnabled: !prev.scrollSyncEnabled }))}
                className={`
                  p-2 rounded-lg transition-all border-2
                  ${state.scrollSyncEnabled
                    ? 'bg-purple-500 text-white border-purple-500'
                    : 'bg-white dark:bg-slate-700 text-slate-600 dark:text-slate-300 border-slate-300 dark:border-slate-600'
                  }
                `}
                title={state.scrollSyncEnabled ? 'Disable Scroll Sync' : 'Enable Scroll Sync'}
              >
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
                </svg>
              </button>

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

      {/* Dual-Pane Layout */}
      <div className={`max-w-[1920px] mx-auto p-6 ${getLayoutClasses()}`}>
        {/* Left Pane - Question Paper (QP) */}
        {state.showQP && (
          <div
            ref={qpPaneRef}
            className="bg-white dark:bg-slate-800 rounded-xl shadow-lg overflow-y-auto"
            style={{ maxHeight: 'calc(100vh - 140px)' }}
          >
            <div className="sticky top-0 bg-blue-50 dark:bg-blue-900/20 px-6 py-3 border-b border-blue-200 dark:border-blue-800 z-10">
              <h2 className="text-lg font-bold text-blue-900 dark:text-blue-100 flex items-center gap-2">
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                Question Paper
              </h2>
            </div>

            <div className="p-6 space-y-8">
              {paperData.questions.map((question) => {
                const markingData = paperData.markingScheme.find(ms => ms.questionNumber === question.questionNumber);
                const examinerReport = paperData.examinerReports.find(er => er.questionNumber === question.questionNumber);

                return (
                  <div
                    key={question.questionNumber}
                    ref={(el) => {
                      if (el) questionRefs.current.set(question.questionNumber, el);
                    }}
                    data-question-number={question.questionNumber}
                    className="border-b border-slate-200 dark:border-slate-700 pb-8 last:border-b-0"
                  >
                    {/* Question Number Badge */}
                    <div className="flex items-center gap-3 mb-4">
                      <span className="w-10 h-10 bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 rounded-full flex items-center justify-center font-bold text-lg">
                        {question.questionNumber}
                      </span>
                      {markingData && (
                        <span className="px-3 py-1 bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-full text-sm font-semibold">
                          {markingData.marksAllocated} {markingData.marksAllocated === 1 ? 'mark' : 'marks'}
                        </span>
                      )}
                    </div>

                    {/* Question Image */}
                    <div className="bg-slate-50 dark:bg-slate-900 rounded-lg p-4 mb-4">
                      <img
                        src={question.questionImgUrl}
                        alt={`Question ${question.questionNumber}`}
                        className="w-full h-auto"
                      />
                    </div>

                    {/* ER Button */}
                    {examinerReport && (
                      <button
                        onClick={() => openERDrawer(question.questionNumber)}
                        className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-amber-500 to-orange-500 text-white rounded-lg font-semibold text-sm hover:from-amber-600 hover:to-orange-600 transition-all shadow-md hover:shadow-lg"
                      >
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        ER - View Examiner Report
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Right Pane - Marking Scheme (MS) */}
        {state.showMS && (
          <div
            ref={msPaneRef}
            className="bg-white dark:bg-slate-800 rounded-xl shadow-lg overflow-y-auto"
            style={{ maxHeight: 'calc(100vh - 140px)' }}
          >
            <div className="sticky top-0 bg-green-50 dark:bg-green-900/20 px-6 py-3 border-b border-green-200 dark:border-green-800 z-10">
              <h2 className="text-lg font-bold text-green-900 dark:text-green-100 flex items-center gap-2">
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
                </svg>
                Marking Scheme
              </h2>
            </div>

            <div className="p-6 space-y-6">
              {paperData.markingScheme.map((ms) => (
                <div
                  key={ms.questionNumber}
                  data-ms-question={ms.questionNumber}
                  className="bg-slate-50 dark:bg-slate-900/50 rounded-xl p-5 border border-slate-200 dark:border-slate-700"
                >
                  {/* Question Header */}
                  <div className="flex items-center justify-between mb-4">
                    <span className="text-lg font-bold text-slate-900 dark:text-white">
                      Question {ms.questionNumber}
                    </span>
                    <div className="flex items-center gap-3">
                      <span className="px-3 py-1 bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300 rounded-full text-sm font-bold">
                        Answer: {ms.correctKey}
                      </span>
                      <span className="px-3 py-1 bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 rounded-full text-sm font-semibold">
                        {ms.marksAllocated} {ms.marksAllocated === 1 ? 'mark' : 'marks'}
                      </span>
                    </div>
                  </div>

                  {/* Assessment Criteria */}
                  <div className="mb-3">
                    <h4 className="text-xs font-bold text-slate-600 dark:text-slate-400 uppercase tracking-wide mb-2">
                      Assessment Criteria
                    </h4>
                    <p className="text-slate-700 dark:text-slate-300 leading-relaxed">
                      {ms.assessmentCriteria}
                    </p>
                  </div>

                  {/* Common Errors */}
                  {ms.commonErrors && ms.commonErrors.length > 0 && (
                    <div className="mt-4 pt-4 border-t border-slate-200 dark:border-slate-700">
                      <h4 className="text-xs font-bold text-red-600 dark:text-red-400 uppercase tracking-wide mb-2">
                        Common Errors
                      </h4>
                      <ul className="space-y-1">
                        {ms.commonErrors.map((error, index) => (
                          <li key={index} className="text-sm text-slate-600 dark:text-slate-400 flex items-start gap-2">
                            <span className="text-red-500 mt-0.5">•</span>
                            <span>{error}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Examiner Report Drawer */}
      <ExaminerReportDrawer
        isOpen={state.isERDrawerOpen}
        onClose={closeERDrawer}
        report={currentER}
      />
    </div>
  );
}

// Made with Bob