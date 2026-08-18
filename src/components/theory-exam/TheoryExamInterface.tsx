'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { PDFViewer } from '@/components/past-papers/PDFViewer';

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
  context: string[];
  text: string[];
  marks: number | null;
  parts: TheorySubPart[];
}

interface TheoryPaper {
  paperId: string;
  subjectCode: string;
  session: string;
  component: string;
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

/** Collect every leaf sub-part that is answerable (not diagramOnly) */
function collectAnswerableNodes(parts: TheorySubPart[]): TheorySubPart[] {
  const out: TheorySubPart[] = [];
  for (const p of parts) {
    if (p.parts.length > 0) {
      out.push(...collectAnswerableNodes(p.parts));
    } else if (!p.diagramOnly) {
      out.push(p);
    }
  }
  return out;
}

function totalAnswerable(questions: TheoryQuestion[]): number {
  let n = 0;
  for (const q of questions) n += collectAnswerableNodes(q.parts).length;
  return n;
}

function countAnswered(answers: Record<string, string>): number {
  return Object.values(answers).filter(v => v.trim().length > 0).length;
}

// ── Answer input for a single leaf sub-part ───────────────────────────────────

function AnswerInput({
  node,
  value,
  onChange,
  isFocused,
  onFocus,
}: {
  node: TheorySubPart;
  value: string;
  onChange: (v: string) => void;
  isFocused: boolean;
  onFocus: () => void;
}) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Auto-grow textarea
  useEffect(() => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = 'auto';
    el.style.height = Math.max(72, el.scrollHeight) + 'px';
  }, [value]);

  if (node.diagramOnly) {
    return (
      <div style={{
        padding: '10px 14px', borderRadius: '8px',
        background: 'rgba(200,168,76,0.06)',
        border: '1px solid rgba(200,168,76,0.18)',
        color: 'rgba(200,168,76,0.7)',
        fontFamily: 'Inter, system-ui, sans-serif',
        fontSize: '12px', letterSpacing: '0.03em',
        display: 'flex', alignItems: 'center', gap: '8px',
      }}>
        <svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor" style={{ flexShrink: 0 }}>
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
            d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
            d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
        </svg>
        View in Question Paper
      </div>
    );
  }

  const isLong = ['long_answer', 'describe', 'explain', 'evaluate', 'discuss'].includes(node.answerType);
  const minRows = node.marks && node.marks >= 4 ? 4 : node.marks && node.marks >= 2 ? 3 : 2;

  return (
    <textarea
      ref={textareaRef}
      value={value}
      onChange={e => onChange(e.target.value)}
      onFocus={onFocus}
      placeholder={isLong ? 'Write your answer here…' : 'Answer…'}
      rows={minRows}
      style={{
        width: '100%',
        padding: '10px 14px',
        borderRadius: '8px',
        background: isFocused ? 'rgba(14,22,38,0.95)' : 'rgba(10,16,28,0.7)',
        border: isFocused
          ? '1px solid rgba(200,168,76,0.50)'
          : '1px solid rgba(60,80,120,0.35)',
        color: '#dde8f8',
        fontFamily: 'Inter, system-ui, sans-serif',
        fontSize: '13.5px',
        lineHeight: '1.55',
        resize: 'vertical',
        outline: 'none',
        boxShadow: isFocused
          ? '0 0 0 3px rgba(200,168,76,0.08), inset 0 1px 4px rgba(0,0,0,0.3)'
          : 'inset 0 1px 4px rgba(0,0,0,0.25)',
        transition: 'border-color 0.15s ease, background 0.15s ease',
        boxSizing: 'border-box',
        overflow: 'hidden',
      }}
    />
  );
}

// ── Sub-part row ──────────────────────────────────────────────────────────────

function SubPartRow({
  node,
  depth,
  answers,
  focusedId,
  onAnswerChange,
  onFocus,
}: {
  node: TheorySubPart;
  depth: number;
  answers: Record<string, string>;
  focusedId: string | null;
  onAnswerChange: (id: string, v: string) => void;
  onFocus: (id: string) => void;
}) {
  const hasChildren = node.parts.length > 0;

  if (hasChildren) {
    return (
      <div style={{ paddingLeft: depth > 0 ? '16px' : '0' }}>
        {/* Context text of this part */}
        {node.text && (
          <p style={{
            fontFamily: 'Inter, system-ui, sans-serif',
            fontSize: '13px',
            color: 'rgba(160,190,230,0.75)',
            marginBottom: '10px',
            lineHeight: '1.5',
          }}>
            <span style={{ color: 'rgba(200,168,76,0.8)', fontWeight: 600, marginRight: '6px' }}>
              {node.label}
            </span>
            {node.text}
          </p>
        )}
        {node.parts.map(child => (
          <SubPartRow
            key={child.id}
            node={child}
            depth={depth + 1}
            answers={answers}
            focusedId={focusedId}
            onAnswerChange={onAnswerChange}
            onFocus={onFocus}
          />
        ))}
      </div>
    );
  }

  const answered = (answers[node.id] ?? '').trim().length > 0;

  return (
    <div
      style={{
        marginBottom: '14px',
        paddingLeft: depth > 0 ? '16px' : '0',
        borderLeft: depth > 0 ? '2px solid rgba(60,80,120,0.3)' : 'none',
        paddingBottom: depth > 0 ? '0' : '0',
      }}
    >
      {/* Label + marks + text */}
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: '8px', marginBottom: '6px' }}>
        <span style={{
          fontFamily: 'Inter, system-ui, sans-serif',
          fontSize: '12px', fontWeight: 700,
          color: 'rgba(200,168,76,0.9)',
          minWidth: '28px', paddingTop: '1px', flexShrink: 0,
        }}>
          {node.label}
        </span>
        <div style={{ flex: 1, minWidth: 0 }}>
          <span style={{
            fontFamily: 'Inter, system-ui, sans-serif',
            fontSize: '13.5px',
            color: '#c8d8ef',
            lineHeight: '1.55',
            whiteSpace: 'pre-wrap',
          }}>
            {node.text}
          </span>
          {node.hasDiagramRef && (
            <span style={{
              display: 'inline-block', marginLeft: '8px',
              fontSize: '10.5px', fontFamily: 'Inter, sans-serif',
              color: 'rgba(96,165,250,0.7)',
              background: 'rgba(59,130,246,0.1)',
              border: '1px solid rgba(59,130,246,0.2)',
              borderRadius: '4px', padding: '1px 6px',
              verticalAlign: 'middle',
            }}>
              see fig
            </span>
          )}
        </div>
        {node.marks != null && (
          <span style={{
            fontFamily: 'Inter, system-ui, sans-serif',
            fontSize: '11px', fontWeight: 600,
            color: answered ? 'rgba(52,211,153,0.85)' : 'rgba(140,160,200,0.55)',
            background: answered ? 'rgba(16,185,129,0.1)' : 'rgba(60,80,120,0.15)',
            border: `1px solid ${answered ? 'rgba(52,211,153,0.25)' : 'rgba(60,80,120,0.25)'}`,
            borderRadius: '5px',
            padding: '1px 7px', flexShrink: 0,
            transition: 'all 0.2s ease',
          }}>
            [{node.marks}]
          </span>
        )}
      </div>

      {/* Answer input */}
      <div style={{ paddingLeft: '36px' }}>
        <AnswerInput
          node={node}
          value={answers[node.id] ?? ''}
          onChange={v => onAnswerChange(node.id, v)}
          isFocused={focusedId === node.id}
          onFocus={() => onFocus(node.id)}
        />
      </div>
    </div>
  );
}

// ── Question card ─────────────────────────────────────────────────────────────

function QuestionCard({
  question,
  isActive,
  answers,
  focusedId,
  onAnswerChange,
  onFocus,
  onClick,
}: {
  question: TheoryQuestion;
  isActive: boolean;
  answers: Record<string, string>;
  focusedId: string | null;
  onAnswerChange: (id: string, v: string) => void;
  onFocus: (id: string) => void;
  onClick: () => void;
}) {
  const answerable = collectAnswerableNodes(question.parts);
  const answered = answerable.filter(n => (answers[n.id] ?? '').trim().length > 0).length;
  const total = answerable.length;
  const pct = total > 0 ? Math.round((answered / total) * 100) : 0;

  return (
    <div
      style={{
        marginBottom: '12px',
        borderRadius: '12px',
        border: isActive
          ? '1px solid rgba(200,168,76,0.35)'
          : '1px solid rgba(60,80,120,0.2)',
        background: isActive ? 'rgba(14,20,34,0.95)' : 'rgba(10,14,24,0.6)',
        overflow: 'hidden',
        transition: 'border-color 0.2s ease',
      }}
    >
      {/* Card header — click to collapse/expand */}
      <div
        onClick={onClick}
        style={{
          padding: '12px 18px',
          display: 'flex', alignItems: 'center', gap: '12px',
          cursor: 'pointer',
          background: isActive ? 'rgba(20,28,48,0.8)' : 'rgba(12,16,28,0.4)',
          borderBottom: isActive ? '1px solid rgba(60,80,120,0.2)' : 'none',
          userSelect: 'none',
        }}
      >
        {/* Q number */}
        <div style={{
          width: '32px', height: '32px', borderRadius: '8px', flexShrink: 0,
          background: isActive ? 'rgba(200,168,76,0.15)' : 'rgba(60,80,120,0.2)',
          border: `1px solid ${isActive ? 'rgba(200,168,76,0.4)' : 'rgba(60,80,120,0.3)'}`,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontFamily: "'Cormorant Garamond','Cormorant',Georgia,serif",
          fontSize: '17px', fontWeight: 700,
          color: isActive ? '#c8a84c' : 'rgba(160,180,220,0.6)',
        }}>
          {question.id}
        </div>

        {/* Title + progress */}
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{
            fontFamily: 'Inter, system-ui, sans-serif',
            fontSize: '12px', fontWeight: 600,
            color: isActive ? '#e8dcc4' : 'rgba(160,180,220,0.65)',
            letterSpacing: '0.04em',
          }}>
            Question {question.id}
            {question.marks != null && (
              <span style={{ color: 'rgba(140,160,200,0.5)', fontWeight: 400, marginLeft: '8px' }}>
                {question.marks} marks
              </span>
            )}
          </div>
          {/* Progress bar */}
          <div style={{
            marginTop: '6px',
            height: '3px', borderRadius: '2px',
            background: 'rgba(60,80,120,0.25)',
            overflow: 'hidden',
          }}>
            <div style={{
              height: '100%', borderRadius: '2px',
              width: `${pct}%`,
              background: pct === 100
                ? 'rgba(52,211,153,0.7)'
                : 'rgba(200,168,76,0.5)',
              transition: 'width 0.3s ease',
            }} />
          </div>
        </div>

        {/* Answered count */}
        <span style={{
          fontFamily: 'Inter, system-ui, sans-serif',
          fontSize: '11px', fontWeight: 600,
          color: answered === total && total > 0
            ? 'rgba(52,211,153,0.8)' : 'rgba(140,160,200,0.5)',
          flexShrink: 0,
        }}>
          {answered}/{total}
        </span>

        {/* Chevron */}
        <svg
          width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor"
          style={{
            flexShrink: 0,
            color: 'rgba(120,140,180,0.5)',
            transform: isActive ? 'rotate(180deg)' : 'rotate(0)',
            transition: 'transform 0.2s ease',
          }}
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </div>

      {/* Card body — sub-parts */}
      {isActive && (
        <div style={{ padding: '16px 18px' }}>
          {/* Context text */}
          {question.text.length > 0 && (
            <div style={{
              marginBottom: '14px',
              padding: '10px 14px',
              borderRadius: '8px',
              background: 'rgba(30,50,90,0.18)',
              border: '1px solid rgba(60,100,180,0.15)',
            }}>
              {question.text.map((line, i) => (
                <p key={i} style={{
                  fontFamily: 'Inter, system-ui, sans-serif',
                  fontSize: '13px',
                  color: 'rgba(160,190,240,0.75)',
                  lineHeight: '1.5',
                  margin: i > 0 ? '4px 0 0' : '0',
                }}>
                  {line}
                </p>
              ))}
            </div>
          )}

          {/* Parts */}
          {question.parts.map(part => (
            <SubPartRow
              key={part.id}
              node={part}
              depth={0}
              answers={answers}
              focusedId={focusedId}
              onAnswerChange={onAnswerChange}
              onFocus={onFocus}
            />
          ))}
        </div>
      )}
    </div>
  );
}

// ── Main interface ────────────────────────────────────────────────────────────

export function TheoryExamInterface({
  paperId,
  pdfUrl,
  subjectName,
  displayName,
}: TheoryExamInterfaceProps) {
  const [paper, setPaper] = useState<TheoryPaper | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [focusedId, setFocusedId] = useState<string | null>(null);
  const [activeQId, setActiveQId] = useState<string | null>(null);

  // Draggable split
  const [splitPct, setSplitPct] = useState(() => {
    if (typeof window !== 'undefined') {
      const s = sessionStorage.getItem('theory-split');
      return s ? Number(s) : 54;
    }
    return 54;
  });
  const isDragging = useRef(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    sessionStorage.setItem('theory-split', String(splitPct));
  }, [splitPct]);

  const onDividerMouseDown = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    isDragging.current = true;
    document.body.style.cursor = 'col-resize';
    document.body.style.userSelect = 'none';
  }, []);

  useEffect(() => {
    const onMove = (e: MouseEvent) => {
      if (!isDragging.current || !containerRef.current) return;
      const rect = containerRef.current.getBoundingClientRect();
      setSplitPct(Math.min(75, Math.max(25, ((e.clientX - rect.left) / rect.width) * 100)));
    };
    const onUp = () => {
      if (!isDragging.current) return;
      isDragging.current = false;
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
    };
    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
    return () => { window.removeEventListener('mousemove', onMove); window.removeEventListener('mouseup', onUp); };
  }, []);

  // Fetch theory questions JSON
  useEffect(() => {
    setLoading(true);
    fetch(`/api/theory-questions/${paperId}`)
      .then(r => {
        if (!r.ok) throw new Error(`Not found (${r.status})`);
        return r.json();
      })
      .then((data: TheoryPaper) => {
        setPaper(data);
        // Open first question by default
        if (data.questions.length > 0) setActiveQId(data.questions[0].id);
        setLoading(false);
      })
      .catch(err => {
        setError(err.message);
        setLoading(false);
      });
  }, [paperId]);

  const handleAnswerChange = useCallback((id: string, value: string) => {
    setAnswers(prev => ({ ...prev, [id]: value }));
  }, []);

  const HEADER_H = 62;

  // ── Loading state ───────────────────────────────────────────────────────────
  if (loading) {
    return (
      <div style={{ minHeight: '100vh', background: '#0a0c10', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{
            width: '40px', height: '40px', borderRadius: '50%',
            border: '3px solid rgba(200,168,76,0.15)',
            borderTop: '3px solid rgba(200,168,76,0.7)',
            margin: '0 auto 20px',
            animation: 'spin 0.8s linear infinite',
          }} />
          <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
          <p style={{ fontFamily: 'Inter, sans-serif', fontSize: '14px', color: 'rgba(160,180,220,0.6)' }}>
            Loading paper…
          </p>
        </div>
      </div>
    );
  }

  // ── Error state ─────────────────────────────────────────────────────────────
  if (error || !paper) {
    return (
      <div style={{ minHeight: '100vh', background: '#0a0c10', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ textAlign: 'center', maxWidth: '400px', padding: '0 24px' }}>
          <p style={{ fontFamily: "'Cormorant Garamond',Georgia,serif", fontSize: '22px', color: '#e8dcc4', marginBottom: '10px' }}>
            Questions unavailable
          </p>
          <p style={{ fontFamily: 'Inter, sans-serif', fontSize: '13px', color: 'rgba(160,180,220,0.55)', lineHeight: '1.6' }}>
            {error ?? 'This paper has not been parsed yet.'}
          </p>
          <p style={{ fontFamily: 'Inter, sans-serif', fontSize: '12px', color: 'rgba(200,168,76,0.5)', marginTop: '12px' }}>
            You can still view the PDF below.
          </p>
        </div>
      </div>
    );
  }

  const totalA = totalAnswerable(paper.questions);
  const doneA = countAnswered(answers);
  const overallPct = totalA > 0 ? Math.round((doneA / totalA) * 100) : 0;

  return (
    <div style={{ minHeight: '100vh', background: '#0a0c10' }}>

      {/* ── Header ──────────────────────────────────────────────────────────── */}
      <div className="sticky top-0 z-30" style={{
        background: 'linear-gradient(180deg, #0d1018 0%, #0a0c14 100%)',
        borderBottom: '1px solid rgba(200,168,76,0.12)',
        boxShadow: '0 2px 20px rgba(0,0,0,0.4)',
        height: `${HEADER_H}px`,
        display: 'flex', alignItems: 'center',
      }}>
        <div style={{
          width: '100%', maxWidth: '1920px', margin: '0 auto',
          padding: '0 24px',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '24px',
        }}>
          {/* Left — title */}
          <div style={{ minWidth: 0, paddingLeft: '72px' }}>
            <h1 style={{
              fontFamily: "'Cormorant Garamond','Cormorant',Georgia,serif",
              fontSize: '18px', fontWeight: 600, color: '#e8dcc4',
              letterSpacing: '0.01em', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
            }}>
              {displayName}
            </h1>
            <p style={{
              fontFamily: "'Cormorant Garamond','Cormorant',Georgia,serif",
              fontSize: '13px', color: 'rgba(180,150,60,0.65)',
              marginTop: '2px', letterSpacing: '0.02em',
            }}>
              {subjectName} · Theory Exam
            </p>
          </div>

          {/* Right — progress + info */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px', flexShrink: 0 }}>
            {/* Overall progress */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <div style={{ width: '120px', height: '4px', borderRadius: '2px', background: 'rgba(60,80,120,0.3)' }}>
                <div style={{
                  height: '100%', borderRadius: '2px',
                  width: `${overallPct}%`,
                  background: overallPct === 100 ? 'rgba(52,211,153,0.8)' : 'rgba(200,168,76,0.6)',
                  transition: 'width 0.4s ease',
                }} />
              </div>
              <span style={{
                fontFamily: 'Inter, system-ui, sans-serif',
                fontSize: '12px', fontWeight: 600,
                color: 'rgba(160,180,220,0.7)',
              }}>
                {doneA}/{totalA}
              </span>
            </div>

            {/* Total marks badge */}
            <div style={{
              fontFamily: 'Inter, system-ui, sans-serif',
              fontSize: '11px', fontWeight: 600,
              padding: '4px 12px', borderRadius: '20px',
              background: 'rgba(200,168,76,0.1)',
              border: '1px solid rgba(200,168,76,0.25)',
              color: 'rgba(200,168,76,0.75)',
              letterSpacing: '0.04em',
            }}>
              {paper.totalMarks} MARKS
            </div>
          </div>
        </div>
      </div>

      {/* ── Split pane ──────────────────────────────────────────────────────── */}
      <div
        ref={containerRef}
        style={{
          display: 'flex', flexDirection: 'row',
          width: '100%',
          height: `calc(100vh - ${HEADER_H}px)`,
          overflow: 'hidden', padding: '12px', gap: 0, boxSizing: 'border-box',
        }}
      >
        {/* ── Left — PDF viewer ───────────────────────────────────────────── */}
        <div style={{
          width: `${splitPct}%`,
          height: '100%', flexShrink: 0,
          borderRadius: '12px', overflow: 'hidden',
          background: '#111418',
          border: '1px solid rgba(200,168,76,0.10)',
          display: 'flex', flexDirection: 'column',
        }}>
          <div style={{
            padding: '8px 20px',
            background: '#0d1018',
            borderBottom: '1px solid rgba(200,168,76,0.10)',
            flexShrink: 0,
            display: 'flex', alignItems: 'center', gap: '8px',
          }}>
            <h2 style={{
              fontFamily: "'Cormorant Garamond',Georgia,serif",
              fontSize: '15px', fontWeight: 600,
              color: '#a8c4e8', letterSpacing: '0.02em',
              display: 'flex', alignItems: 'center', gap: '8px',
            }}>
              <svg width="15" height="15" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                  d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              Question Paper
            </h2>
          </div>
          <div style={{ flex: 1, overflow: 'hidden' }}>
            <PDFViewer pdfUrl={pdfUrl} title="Question Paper" className="h-full" />
          </div>
        </div>

        {/* ── Divider ─────────────────────────────────────────────────────── */}
        <div
          onMouseDown={onDividerMouseDown}
          style={{
            width: '12px', flexShrink: 0, cursor: 'col-resize',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}
        >
          <div style={{
            width: '4px', height: '40px', borderRadius: '2px',
            background: 'rgba(200,168,76,0.2)',
            transition: 'background 0.15s',
          }} />
        </div>

        {/* ── Right — Answer workspace ─────────────────────────────────────── */}
        <div style={{
          flex: 1, height: '100%', minWidth: 0,
          borderRadius: '12px', overflow: 'hidden',
          background: '#0e1422',
          border: '1px solid rgba(60,80,120,0.2)',
          display: 'flex', flexDirection: 'column',
        }}>
          {/* Pane header */}
          <div style={{
            padding: '8px 20px',
            background: '#0a1020',
            borderBottom: '1px solid rgba(60,80,120,0.18)',
            flexShrink: 0,
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          }}>
            <h2 style={{
              fontFamily: "'Cormorant Garamond',Georgia,serif",
              fontSize: '15px', fontWeight: 600,
              color: '#8ab4e8', letterSpacing: '0.02em',
              display: 'flex', alignItems: 'center', gap: '8px',
            }}>
              <svg width="15" height="15" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                  d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
              </svg>
              Answer Workspace
            </h2>
            <span style={{
              fontFamily: 'Inter, system-ui, sans-serif',
              fontSize: '11px', color: 'rgba(120,150,200,0.5)',
            }}>
              {paper.questionCount} questions
            </span>
          </div>

          {/* Scrollable question list */}
          <div style={{ flex: 1, overflowY: 'auto', padding: '14px 16px' }}>
            {/* Tip banner */}
            <div style={{
              marginBottom: '16px', padding: '8px 14px', borderRadius: '8px',
              background: 'rgba(59,130,246,0.08)',
              border: '1px solid rgba(59,130,246,0.15)',
              display: 'flex', alignItems: 'center', gap: '8px',
            }}>
              <svg width="13" height="13" fill="none" viewBox="0 0 24 24" stroke="currentColor" style={{ color: 'rgba(96,165,250,0.7)', flexShrink: 0 }}>
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <p style={{ fontFamily: 'Inter, sans-serif', fontSize: '11.5px', color: 'rgba(130,170,240,0.7)', lineHeight: '1.4' }}>
                Use the PDF on the left for diagrams and figures. Questions marked <em>view in QP</em> require drawing — answer those on the PDF.
              </p>
            </div>

            {/* Questions */}
            {paper.questions.map(q => (
              <QuestionCard
                key={q.id}
                question={q}
                isActive={activeQId === q.id}
                answers={answers}
                focusedId={focusedId}
                onAnswerChange={handleAnswerChange}
                onFocus={id => { setFocusedId(id); }}
                onClick={() => setActiveQId(prev => prev === q.id ? null : q.id)}
              />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

// Made with Bob
