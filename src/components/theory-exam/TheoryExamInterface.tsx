'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { PDFOverlayViewer, AnswerZoneData } from './PDFOverlayViewer';

// ── Types ─────────────────────────────────────────────────────────────────────

interface TheorySubPart {
  id: string;
  label: string;
  text: string;
  marks: number | null;
  type: string;
  answerType: string;
  hasDiagramRef: boolean;
  diagramOnly: boolean;
  parts: TheorySubPart[];
}

interface TheoryQuestion {
  id: string;
  text: string[];
  marks: number | null;
  parts: TheorySubPart[];
}

interface TheoryPaper {
  paperId: string;
  totalMarks: number;
  questionCount: number;
  questions: TheoryQuestion[];
}

interface TheoryExamInterfaceProps {
  paperId: string;
  pdfUrl: string;
  subjectName: string;
  displayName: string;
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function flatLeaves(parts: TheorySubPart[]): TheorySubPart[] {
  const out: TheorySubPart[] = [];
  for (const p of parts) {
    if (p.parts.length > 0) out.push(...flatLeaves(p.parts));
    else out.push(p);
  }
  return out;
}

function countAnswered(answers: Record<string, string>, leaves: TheorySubPart[]): number {
  return leaves.filter(l => !l.diagramOnly && (answers[l.id] ?? '').trim().length > 0).length;
}

function countAnswerable(leaves: TheorySubPart[]): number {
  return leaves.filter(l => !l.diagramOnly).length;
}

// ── Nav sidebar item ──────────────────────────────────────────────────────────

function QNavItem({
  q, leaves, answers, activeId, onClick,
}: {
  q: TheoryQuestion;
  leaves: TheorySubPart[];
  answers: Record<string, string>;
  activeId: string | null;
  onClick: () => void;
}) {
  const done  = countAnswered(answers, leaves);
  const total = countAnswerable(leaves);
  const pct   = total > 0 ? done / total : 0;
  const full  = done === total && total > 0;

  return (
    <button
      onClick={onClick}
      style={{
        width: '100%', textAlign: 'left',
        padding: '8px 12px', borderRadius: '8px',
        marginBottom: '4px', cursor: 'pointer', outline: 'none',
        background: activeId === q.id ? 'rgba(200,168,76,0.12)' : 'transparent',
        border: activeId === q.id ? '1px solid rgba(200,168,76,0.3)' : '1px solid transparent',
        transition: 'all 0.15s',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
        <div style={{
          width: '24px', height: '24px', borderRadius: '6px', flexShrink: 0,
          background: full ? 'rgba(52,211,153,0.15)' : 'rgba(60,80,120,0.2)',
          border: `1px solid ${full ? 'rgba(52,211,153,0.4)' : 'rgba(60,80,120,0.3)'}`,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontFamily: "'Cormorant Garamond',Georgia,serif",
          fontSize: '14px', fontWeight: 700,
          color: full ? '#34d399' : 'rgba(160,180,220,0.7)',
        }}>
          {q.id}
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{
            fontFamily: 'Inter, system-ui, sans-serif',
            fontSize: '11px', fontWeight: 600,
            color: full ? 'rgba(52,211,153,0.8)' : 'rgba(160,180,220,0.6)',
            letterSpacing: '0.04em',
          }}>
            {q.marks != null ? `${q.marks} marks` : ''}
          </div>
          <div style={{
            marginTop: '3px', height: '2px', borderRadius: '1px',
            background: 'rgba(60,80,120,0.25)', overflow: 'hidden',
          }}>
            <div style={{
              height: '100%', width: `${pct * 100}%`,
              background: full ? 'rgba(52,211,153,0.7)' : 'rgba(200,168,76,0.5)',
              borderRadius: '1px', transition: 'width 0.3s',
            }} />
          </div>
        </div>
        <span style={{
          fontFamily: 'Inter, sans-serif', fontSize: '10px', fontWeight: 600,
          color: full ? 'rgba(52,211,153,0.7)' : 'rgba(120,140,180,0.4)',
          flexShrink: 0,
        }}>
          {done}/{total}
        </span>
      </div>
    </button>
  );
}

// ── Main interface ────────────────────────────────────────────────────────────

export function TheoryExamInterface({
  paperId, pdfUrl, subjectName, displayName,
}: TheoryExamInterfaceProps) {
  const [paper, setPaper]       = useState<TheoryPaper | null>(null);
  const [zoneData, setZoneData] = useState<AnswerZoneData | null>(null);
  const [loading, setLoading]   = useState(true);
  const [error, setError]       = useState<string | null>(null);

  const [answers, setAnswers]     = useState<Record<string, string>>({});
  const [focusedKey, setFocusedKey] = useState<string | null>(null);
  const [activeQId, setActiveQId]   = useState<string | null>(null);
  const [sidebarOpen, setSidebarOpen] = useState(true);

  const scrollRef = useRef<HTMLDivElement>(null);

  // Fetch questions JSON + answer zones in parallel
  useEffect(() => {
    setLoading(true);
    Promise.all([
      fetch(`/api/theory-questions/${paperId}`).then(r => r.ok ? r.json() : null),
      fetch(`/api/answer-zones/${paperId}`).then(r => r.ok ? r.json() : null),
    ]).then(([qData, azData]) => {
      if (qData) { setPaper(qData); setActiveQId(qData.questions[0]?.id ?? null); }
      if (azData) setZoneData(azData);
      if (!qData && !azData) setError('Data not found for this paper.');
      setLoading(false);
    }).catch(e => { setError(e.message); setLoading(false); });
  }, [paperId]);

  const handleAnswerChange = useCallback((key: string, value: string) => {
    setAnswers(prev => ({ ...prev, [key]: value }));
  }, []);

  // Compute progress
  const allLeaves = paper?.questions.flatMap(q => flatLeaves(q.parts)) ?? [];
  const totalAnswerable = countAnswerable(allLeaves);
  const totalDone       = countAnswered(answers, allLeaves);
  const overallPct      = totalAnswerable > 0 ? Math.round((totalDone / totalAnswerable) * 100) : 0;

  const HEADER_H  = 56;
  const SIDEBAR_W = 160;

  // ── Loading ─────────────────────────────────────────────────────────────────
  if (loading) {
    return (
      <div style={{ minHeight: '100vh', background: '#0a0c10', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{
            width: '36px', height: '36px', borderRadius: '50%',
            border: '3px solid rgba(200,168,76,0.15)',
            borderTop: '3px solid rgba(200,168,76,0.7)',
            margin: '0 auto 16px',
            animation: 'spin 0.8s linear infinite',
          }} />
          <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
          <p style={{ fontFamily: 'Inter', fontSize: '13px', color: 'rgba(160,180,220,0.6)' }}>Loading…</p>
        </div>
      </div>
    );
  }

  // ── No zone data — fall back to split-pane message ──────────────────────────
  if (!zoneData) {
    return (
      <div style={{ minHeight: '100vh', background: '#0a0c10', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <p style={{ fontFamily: 'Inter', color: 'rgba(160,180,220,0.6)', fontSize: '14px' }}>
          {error ?? 'Answer zone data not available for this paper.'}
        </p>
      </div>
    );
  }

  return (
    <div style={{ minHeight: '100vh', background: '#0d1018', display: 'flex', flexDirection: 'column' }}>

      {/* ── Header ────────────────────────────────────────────────────────── */}
      <div style={{
        height: `${HEADER_H}px`, flexShrink: 0,
        background: 'linear-gradient(180deg,#0d1018 0%,#0a0c14 100%)',
        borderBottom: '1px solid rgba(200,168,76,0.12)',
        boxShadow: '0 2px 16px rgba(0,0,0,0.4)',
        display: 'flex', alignItems: 'center',
        padding: '0 20px', gap: '20px',
        position: 'sticky', top: 0, zIndex: 40,
      }}>
        {/* Sidebar toggle */}
        <button
          onClick={() => setSidebarOpen(v => !v)}
          style={{
            background: 'transparent', border: 'none', cursor: 'pointer',
            color: 'rgba(160,180,220,0.6)', padding: '4px', borderRadius: '6px',
            display: 'flex', alignItems: 'center',
          }}
          title={sidebarOpen ? 'Hide questions' : 'Show questions'}
        >
          <svg width="18" height="18" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h7" />
          </svg>
        </button>

        {/* Title */}
        <div style={{ paddingLeft: '56px', minWidth: 0 }}>
          <h1 style={{
            fontFamily: "'Cormorant Garamond',Georgia,serif",
            fontSize: '17px', fontWeight: 600, color: '#e8dcc4',
            letterSpacing: '0.01em', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
          }}>
            {displayName}
          </h1>
          <p style={{
            fontFamily: "'Cormorant Garamond',Georgia,serif",
            fontSize: '12px', color: 'rgba(180,150,60,0.6)', marginTop: '1px',
          }}>
            {subjectName} · Theory Exam
          </p>
        </div>

        {/* Spacer */}
        <div style={{ flex: 1 }} />

        {/* Progress */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexShrink: 0 }}>
          <div style={{ width: '100px', height: '3px', borderRadius: '2px', background: 'rgba(60,80,120,0.3)' }}>
            <div style={{
              height: '100%', borderRadius: '2px',
              width: `${overallPct}%`,
              background: overallPct === 100 ? 'rgba(52,211,153,0.8)' : 'rgba(200,168,76,0.6)',
              transition: 'width 0.4s',
            }} />
          </div>
          <span style={{
            fontFamily: 'Inter', fontSize: '11px', fontWeight: 600,
            color: 'rgba(160,180,220,0.7)',
          }}>
            {totalDone}/{totalAnswerable}
          </span>
          <div style={{
            fontFamily: 'Inter', fontSize: '11px', fontWeight: 600,
            padding: '3px 10px', borderRadius: '20px',
            background: 'rgba(200,168,76,0.1)',
            border: '1px solid rgba(200,168,76,0.22)',
            color: 'rgba(200,168,76,0.7)',
            letterSpacing: '0.04em',
          }}>
            {paper?.totalMarks ?? '?'} MARKS
          </div>
        </div>
      </div>

      {/* ── Body ──────────────────────────────────────────────────────────── */}
      <div style={{
        flex: 1, display: 'flex', flexDirection: 'row',
        height: `calc(100vh - ${HEADER_H}px)`,
        overflow: 'hidden',
      }}>

        {/* ── Left sidebar — question navigator ──────────────────────────── */}
        {sidebarOpen && (
          <div style={{
            width: `${SIDEBAR_W}px`, flexShrink: 0,
            background: '#0a0c14',
            borderRight: '1px solid rgba(60,80,120,0.18)',
            overflowY: 'auto',
            padding: '12px 8px',
          }}>
            <p style={{
              fontFamily: 'Inter', fontSize: '10px', fontWeight: 700,
              color: 'rgba(120,140,180,0.5)', letterSpacing: '0.08em',
              margin: '0 4px 8px', textTransform: 'uppercase',
            }}>
              Questions
            </p>
            {(paper?.questions ?? []).map(q => {
              const leaves = flatLeaves(q.parts);
              return (
                <QNavItem
                  key={q.id}
                  q={q}
                  leaves={leaves}
                  answers={answers}
                  activeId={activeQId}
                  onClick={() => setActiveQId(q.id)}
                />
              );
            })}

            {/* Tip */}
            <div style={{
              marginTop: '16px', padding: '8px 10px', borderRadius: '8px',
              background: 'rgba(59,130,246,0.07)',
              border: '1px solid rgba(59,130,246,0.15)',
            }}>
              <p style={{
                fontFamily: 'Inter', fontSize: '10.5px',
                color: 'rgba(120,160,240,0.65)', lineHeight: '1.5',
              }}>
                Click any answer line on the paper to type your answer directly.
              </p>
            </div>
          </div>
        )}

        {/* ── Right — scrollable PDF with overlays ───────────────────────── */}
        <div
          ref={scrollRef}
          style={{
            flex: 1, overflowY: 'auto', overflowX: 'hidden',
            background: '#1a1c22',
            padding: '0',
          }}
        >
          <PDFOverlayViewer
            pdfUrl={pdfUrl}
            zoneData={zoneData}
            answers={answers}
            onAnswerChange={handleAnswerChange}
            focusedKey={focusedKey}
            onFocus={setFocusedKey}
          />
        </div>
      </div>
    </div>
  );
}

// Made with Bob
