'use client';

import React, { useState, useEffect, useRef, useCallback, useLayoutEffect } from 'react';
import { PastPaperData, ViewPastPapersState, ExaminerReport } from '@/lib/types/past-papers.types';
import { ExaminerReportDrawer } from './ExaminerReportDrawer';

interface ViewPastPapersModeProps {
  paperData: PastPaperData;
  onExit?: () => void;
}

// ── Reusable button components ──────────────────────────────────────────────

function PaneButton({ label, active, title, onClick }: { label: string; active: boolean; title: string; onClick: () => void }) {
  const [pressing, setPressing] = React.useState(false);
  return (
    <button
      onClick={onClick}
      onMouseDown={() => setPressing(true)}
      onMouseUp={() => setPressing(false)}
      onMouseLeave={() => setPressing(false)}
      title={title}
      style={{
        fontFamily: 'Inter, system-ui, sans-serif',
        fontSize: '12px', fontWeight: 700, letterSpacing: '0.12em',
        padding: '7px 16px', borderRadius: '8px',
        cursor: 'pointer', outline: 'none', transition: 'all 0.08s ease',
        transform: pressing ? 'translateY(2px)' : 'translateY(0)',
        // Navy base — gold top border + bottom shadow when active
        background: active
          ? pressing
            ? 'linear-gradient(180deg, #0e1628 0%, #111e34 100%)'
            : 'linear-gradient(180deg, #162040 0%, #111830 100%)'
          : pressing
            ? 'linear-gradient(180deg, #080c14 0%, #0a0e1a 100%)'
            : 'linear-gradient(180deg, #0e1422 0%, #0a1020 100%)',
        color: active ? '#ffffff' : 'rgba(140,160,200,0.55)',
        textShadow: active ? '0 0 14px rgba(180,210,255,0.25)' : 'none',
        border: active ? '1px solid rgba(80,120,200,0.30)' : '1px solid rgba(60,80,140,0.15)',
        borderTop: active ? '1px solid rgba(200,168,76,0.55)' : '1px solid rgba(80,100,160,0.12)',
        borderBottom: pressing ? '1px solid rgba(0,0,0,0.5)' : active ? '1px solid rgba(0,0,0,0.45)' : '1px solid rgba(0,0,0,0.3)',
        boxShadow: active && !pressing
          ? '0 3px 0 rgba(0,0,0,0.5), inset 0 1px 0 rgba(200,168,76,0.12), 0 0 18px rgba(30,60,160,0.18)'
          : pressing
            ? 'inset 0 2px 5px rgba(0,0,0,0.5)'
            : '0 2px 0 rgba(0,0,0,0.35)',
      }}
    >
      {label}
    </button>
  );
}

function SyncButton({ active, onClick }: { active: boolean; onClick: () => void }) {
  const [pressing, setPressing] = React.useState(false);
  return (
    <button
      onClick={onClick}
      onMouseDown={() => setPressing(true)}
      onMouseUp={() => setPressing(false)}
      onMouseLeave={() => setPressing(false)}
      title={active ? 'Disable Scroll Sync' : 'Enable Scroll Sync'}
      style={{
        padding: '7px 10px', borderRadius: '8px',
        cursor: 'pointer', outline: 'none', transition: 'all 0.08s ease',
        transform: pressing ? 'translateY(2px)' : 'translateY(0)',
        background: active
          ? pressing ? 'linear-gradient(180deg, #0e1628 0%, #111e34 100%)' : 'linear-gradient(180deg, #162040 0%, #111830 100%)'
          : pressing ? 'linear-gradient(180deg, #080c14 0%, #0a0e1a 100%)' : 'linear-gradient(180deg, #0e1422 0%, #0a1020 100%)',
        color: active ? '#ffffff' : 'rgba(140,160,200,0.45)',
        border: active ? '1px solid rgba(80,120,200,0.30)' : '1px solid rgba(60,80,140,0.15)',
        borderTop: active ? '1px solid rgba(200,168,76,0.55)' : '1px solid rgba(80,100,160,0.12)',
        borderBottom: pressing ? '1px solid rgba(0,0,0,0.5)' : '1px solid rgba(0,0,0,0.35)',
        boxShadow: active && !pressing ? '0 3px 0 rgba(0,0,0,0.5), inset 0 1px 0 rgba(200,168,76,0.12)' : pressing ? 'inset 0 2px 5px rgba(0,0,0,0.5)' : '0 2px 0 rgba(0,0,0,0.35)',
      }}
    >
      <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
      </svg>
    </button>
  );
}

function ExitButton({ onClick }: { onClick: () => void }) {
  const [pressing, setPressing] = React.useState(false);
  return (
    <button
      onClick={onClick}
      onMouseDown={() => setPressing(true)}
      onMouseUp={() => setPressing(false)}
      onMouseLeave={() => setPressing(false)}
      style={{
        fontFamily: 'Inter, system-ui, sans-serif',
        fontSize: '12px', fontWeight: 600, letterSpacing: '0.06em',
        padding: '7px 16px', borderRadius: '8px',
        cursor: 'pointer', outline: 'none', transition: 'all 0.08s ease',
        transform: pressing ? 'translateY(2px)' : 'translateY(0)',
        background: pressing ? 'linear-gradient(180deg, #120608 0%, #160a0a 100%)' : 'linear-gradient(180deg, #1e0a0a 0%, #160808 100%)',
        color: pressing ? 'rgba(200,120,110,0.7)' : '#c06060',
        border: '1px solid rgba(160,60,60,0.22)',
        borderTop: '1px solid rgba(200,80,80,0.32)',
        borderBottom: pressing ? '1px solid rgba(0,0,0,0.5)' : '1px solid rgba(0,0,0,0.4)',
        boxShadow: pressing ? 'inset 0 2px 5px rgba(0,0,0,0.5)' : '0 3px 0 rgba(0,0,0,0.45), inset 0 1px 0 rgba(200,80,80,0.08)',
      }}
    >
      Exit
    </button>
  );
}

// ────────────────────────────────────────────────────────────────────────────

export function ViewPastPapersMode({ paperData, onExit }: ViewPastPapersModeProps) {
  const [state, setState] = useState<ViewPastPapersState>({
    currentQuestionIndex: 0,
    showQP: true,
    showMS: true,
    isERDrawerOpen: false,
    selectedERQuestion: null,
    scrollSyncEnabled: true,
  });

  // Draggable split — % width of the LEFT (QP) pane
  const [splitPct, setSplitPct] = useState(() => {
    if (typeof window !== 'undefined') {
      const saved = sessionStorage.getItem('vpp-split');
      return saved ? Number(saved) : 50;
    }
    return 50;
  });
  const isDragging = useRef(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    sessionStorage.setItem('vpp-split', String(splitPct));
  }, [splitPct]);

  const onDividerMouseDown = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    isDragging.current = true;
    document.body.style.cursor = 'col-resize';
    document.body.style.userSelect = 'none';
  }, []);

  useEffect(() => {
    const onMouseMove = (e: MouseEvent) => {
      if (!isDragging.current || !containerRef.current) return;
      const rect = containerRef.current.getBoundingClientRect();
      const pct = ((e.clientX - rect.left) / rect.width) * 100;
      setSplitPct(Math.min(75, Math.max(25, pct)));
    };
    const onMouseUp = () => {
      if (!isDragging.current) return;
      isDragging.current = false;
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
    };
    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseup', onMouseUp);
    return () => {
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseup', onMouseUp);
    };
  }, []);

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

  return (
    <div className="min-h-screen" style={{ background: '#0a0c10' }}>
      {/* Header */}
      <div className="sticky top-0 z-30" style={{
        background: 'linear-gradient(180deg, #0d1018 0%, #0a0c14 100%)',
        borderBottom: '1px solid rgba(200,168,76,0.12)',
        boxShadow: '0 2px 20px rgba(0,0,0,0.4)',
      }}>
        <div className="max-w-[1920px] mx-auto px-6 py-3">
          <div className="flex items-center justify-between gap-6">

            {/* Title — padded left so logo doesn't clip text */}
            <div style={{ paddingLeft: '4px', minWidth: 0 }}>
              <h1 style={{
                fontFamily: "'Cormorant Garamond','Cormorant',Georgia,serif",
                fontSize: '18px', fontWeight: 600,
                color: '#e8dcc4', letterSpacing: '0.01em',
                whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
              }}>
                {paperData.displayName}
              </h1>
              <p style={{
                fontFamily: "'Cormorant Garamond','Cormorant',Georgia,serif",
                fontSize: '13px', color: 'rgba(180,150,60,0.65)',
                marginTop: '2px', letterSpacing: '0.02em',
                whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
              }}>
                {paperData.subjectName} ({paperData.subjectCode})
              </p>
            </div>

            {/* Buttons */}
            <div className="flex items-center gap-2 flex-shrink-0">

              {/* QP Toggle */}
              <PaneButton
                label="QP"
                active={state.showQP}
                title={state.showQP ? 'Hide Question Paper' : 'Show Question Paper'}
                onClick={() => togglePane('qp')}
              />

              {/* MS Toggle */}
              <PaneButton
                label="MS"
                active={state.showMS}
                title={state.showMS ? 'Hide Mark Scheme' : 'Show Mark Scheme'}
                onClick={() => togglePane('ms')}
              />

              {/* Sync Toggle */}
              <SyncButton
                active={state.scrollSyncEnabled}
                onClick={() => setState(prev => ({ ...prev, scrollSyncEnabled: !prev.scrollSyncEnabled }))}
              />

              {/* Exit */}
              {onExit && <ExitButton onClick={onExit} />}
            </div>
          </div>
        </div>
      </div>

      {/* Draggable split-pane layout */}
      <div
        ref={containerRef}
        style={{
          display: 'flex',
          flexDirection: 'row',
          width: '100%',
          height: 'calc(100vh - 62px)',
          overflow: 'hidden',
          padding: '12px',
          gap: 0,
          boxSizing: 'border-box',
        }}
      >
        {/* Left Pane — Question Paper */}
        {state.showQP && (
          <div
            ref={qpPaneRef}
            style={{
              width: state.showMS ? `${splitPct}%` : '100%',
              height: '100%',
              overflowY: 'auto',
              flexShrink: 0,
              borderRadius: '12px',
              background: '#111418',
              border: '1px solid rgba(200,168,76,0.10)',
            }}
          >
            <div className="sticky top-0 z-10 px-5 py-2" style={{ background: '#0d1018', borderBottom: '1px solid rgba(200,168,76,0.10)' }}>
              <h2 style={{ fontFamily: "'Cormorant Garamond',Georgia,serif", fontSize: '15px', fontWeight: 600, color: '#a8c4e8', letterSpacing: '0.02em' }} className="flex items-center gap-2">
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                Question Paper
              </h2>
            </div>
            <div className="p-5 space-y-7">
              {paperData.questions.map((question) => {
                const markingData = paperData.markingScheme.find(ms => ms.questionNumber === question.questionNumber);
                const examinerReport = paperData.examinerReports.find(er => er.questionNumber === question.questionNumber);
                return (
                  <div
                    key={question.questionNumber}
                    ref={(el) => { if (el) questionRefs.current.set(question.questionNumber, el); }}
                    data-question-number={question.questionNumber}
                    style={{ borderBottom: '1px solid rgba(200,168,76,0.08)', paddingBottom: '28px' }}
                    className="last:border-b-0"
                  >
                    <div className="flex items-center gap-3 mb-3">
                      <span style={{ width: '32px', height: '32px', borderRadius: '50%', background: 'rgba(80,120,200,0.15)', border: '1px solid rgba(80,120,200,0.25)', color: '#a8c4e8', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: '14px', flexShrink: 0 }}>
                        {question.questionNumber}
                      </span>
                      {markingData && (
                        <span style={{ padding: '2px 10px', borderRadius: '20px', background: 'rgba(80,120,200,0.10)', border: '1px solid rgba(80,120,200,0.18)', color: 'rgba(140,170,220,0.7)', fontSize: '12px', fontWeight: 600 }}>
                          {markingData.marksAllocated} {markingData.marksAllocated === 1 ? 'mark' : 'marks'}
                        </span>
                      )}
                    </div>
                    <div style={{ borderRadius: '8px', overflow: 'hidden', marginBottom: '12px', background: '#ffffff' }}>
                      <img src={question.questionImgUrl} alt={`Question ${question.questionNumber}`} className="w-full h-auto" />
                    </div>
                    {examinerReport && (
                      <button
                        onClick={() => openERDrawer(question.questionNumber)}
                        style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '6px 14px', borderRadius: '8px', background: 'linear-gradient(135deg, rgba(180,130,20,0.18), rgba(160,110,10,0.12))', border: '1px solid rgba(200,168,76,0.3)', borderTop: '1px solid rgba(200,168,76,0.45)', color: '#c8a84c', fontSize: '12px', fontWeight: 600, cursor: 'pointer', boxShadow: '0 2px 0 rgba(0,0,0,0.3)' }}
                      >
                        <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        Examiner Report
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Draggable divider */}
        {state.showQP && state.showMS && (
          <div
            onMouseDown={onDividerMouseDown}
            style={{
              width: '12px', flexShrink: 0, cursor: 'col-resize',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              zIndex: 10,
            }}
          >
            <div style={{
              width: '3px', height: '64px', borderRadius: '3px',
              background: 'linear-gradient(180deg, transparent, rgba(200,168,76,0.5), transparent)',
            }} />
          </div>
        )}

        {/* Right Pane — Marking Scheme */}
        {state.showMS && (
          <div
            ref={msPaneRef}
            style={{
              width: state.showQP ? `${100 - splitPct}%` : '100%',
              height: '100%',
              overflowY: 'auto',
              flexShrink: 0,
              borderRadius: '12px',
              background: '#111418',
              border: '1px solid rgba(200,168,76,0.10)',
            }}
          >
            <div className="sticky top-0 z-10 px-5 py-2" style={{ background: '#0d1018', borderBottom: '1px solid rgba(200,168,76,0.10)' }}>
              <h2 style={{ fontFamily: "'Cormorant Garamond',Georgia,serif", fontSize: '15px', fontWeight: 600, color: '#88c8a0', letterSpacing: '0.02em' }} className="flex items-center gap-2">
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
                </svg>
                Marking Scheme
              </h2>
            </div>
            <div className="p-5 space-y-5">
              {paperData.markingScheme.map((ms) => (
                <div
                  key={ms.questionNumber}
                  data-ms-question={ms.questionNumber}
                  style={{ borderRadius: '10px', padding: '16px', background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(200,168,76,0.08)' }}
                >
                  <div className="flex items-center justify-between mb-3">
                    <span style={{ fontFamily: "'Cormorant Garamond',Georgia,serif", fontSize: '16px', fontWeight: 600, color: '#e8dcc4' }}>
                      Question {ms.questionNumber}
                    </span>
                    <div className="flex items-center gap-2">
                      <span style={{ padding: '2px 10px', borderRadius: '20px', background: 'rgba(80,160,100,0.12)', border: '1px solid rgba(80,160,100,0.22)', color: '#70b88a', fontSize: '12px', fontWeight: 700 }}>
                        {ms.correctKey}
                      </span>
                      <span style={{ padding: '2px 10px', borderRadius: '20px', background: 'rgba(80,120,200,0.10)', border: '1px solid rgba(80,120,200,0.18)', color: 'rgba(140,170,220,0.7)', fontSize: '12px', fontWeight: 600 }}>
                        {ms.marksAllocated}m
                      </span>
                    </div>
                  </div>
                  <p style={{ fontSize: '13px', color: 'rgba(200,190,160,0.75)', lineHeight: 1.65 }}>{ms.assessmentCriteria}</p>
                  {ms.commonErrors && ms.commonErrors.length > 0 && (
                    <div style={{ marginTop: '12px', paddingTop: '12px', borderTop: '1px solid rgba(200,168,76,0.07)' }}>
                      <p style={{ fontSize: '10px', fontWeight: 700, letterSpacing: '0.2em', color: 'rgba(200,80,80,0.6)', marginBottom: '6px', textTransform: 'uppercase' }}>Common Errors</p>
                      <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: '4px' }}>
                        {ms.commonErrors.map((error, i) => (
                          <li key={i} style={{ display: 'flex', gap: '6px', fontSize: '12px', color: 'rgba(180,140,140,0.65)' }}>
                            <span style={{ color: 'rgba(200,80,80,0.5)', marginTop: '2px' }}>•</span>
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