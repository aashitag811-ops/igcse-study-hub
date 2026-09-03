'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
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

// ── Button components ────────────────────────────────────────────────────────

function PaneBtn({ label, active, title, onClick }: { label: string; active: boolean; title: string; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      title={title}
      style={{
        fontFamily: 'Inter, system-ui, sans-serif',
        fontSize: '12px', fontWeight: active ? 700 : 500,
        letterSpacing: '0.08em',
        padding: '6px 16px 8px',
        borderRadius: '8px',
        cursor: 'pointer',
        outline: 'none',
        position: 'relative',
        background: active ? 'rgba(20,26,40,0.95)' : 'transparent',
        color: active ? '#ffffff' : 'rgba(160,180,220,0.5)',
        border: active ? '1px solid rgba(200,168,76,0.35)' : '1px solid transparent',
        boxShadow: active ? '0 4px 16px rgba(0,0,0,0.4), inset 0 1px 0 rgba(200,168,76,0.12)' : 'none',
        transition: 'background 0.15s ease, color 0.15s ease, border-color 0.15s ease',
      }}
    >
      {/* Gold dot indicator below active */}
      {label}
      {active && (
        <span style={{
          position: 'absolute',
          bottom: '3px',
          left: '50%',
          transform: 'translateX(-50%)',
          width: '4px',
          height: '4px',
          borderRadius: '50%',
          background: '#C9A84C',
          boxShadow: '0 0 6px rgba(200,168,76,0.8)',
          display: 'block',
        }} />
      )}
    </button>
  );
}

function ERBtn({ href }: { href: string }) {
  const [pressing, setPressing] = React.useState(false);
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      onMouseDown={() => setPressing(true)}
      onMouseUp={() => setPressing(false)}
      onMouseLeave={() => setPressing(false)}
      title="Open full Examiner Report PDF"
      style={{
        fontFamily: 'Inter, system-ui, sans-serif',
        fontSize: '12px', fontWeight: 600, letterSpacing: '0.06em',
        padding: '7px 14px', borderRadius: '8px',
        cursor: 'pointer', outline: 'none', transition: 'all 0.08s ease',
        transform: pressing ? 'translateY(2px)' : 'translateY(0)',
        background: pressing ? 'linear-gradient(180deg, #14100a 0%, #1a140a 100%)' : 'linear-gradient(180deg, #261c08 0%, #1a1406 100%)',
        color: pressing ? 'rgba(180,140,60,0.7)' : '#c8a84c',
        border: '1px solid rgba(180,140,40,0.28)',
        borderTop: '1px solid rgba(200,168,76,0.45)',
        borderBottom: pressing ? '1px solid rgba(0,0,0,0.5)' : '1px solid rgba(0,0,0,0.4)',
        boxShadow: pressing ? 'inset 0 2px 5px rgba(0,0,0,0.5)' : '0 3px 0 rgba(0,0,0,0.45), inset 0 1px 0 rgba(200,168,76,0.10)',
        display: 'flex', alignItems: 'center', gap: '6px', textDecoration: 'none',
      }}
    >
      <svg width="13" height="13" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
      </svg>
      Examiner Report
    </a>
  );
}

function ExitBtn({ onClick }: { onClick: () => void }) {
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

export function ViewPastPapersPDFMode({
  paperId, subjectCode, subjectName, displayName, onExit
}: ViewPastPapersPDFModeProps) {
  const [showQP, setShowQP] = useState(true);
  const [showMS, setShowMS] = useState(true);
  const [showER, setShowER] = useState(false);
  const [erNotes, setErNotes] = useState<Record<string, string>>({});
  const [erLabels, setErLabels] = useState<Record<string, string>>({});
  const [selectedKey, setSelectedKey] = useState<string | null>(null);
  const [isLoadingER, setIsLoadingER] = useState(false);

  // Draggable split
  const [splitPct, setSplitPct] = useState(() => {
    if (typeof window !== 'undefined') {
      const saved = sessionStorage.getItem('vpp-pdf-split');
      return saved ? Number(saved) : 58;
    }
    return 58;
  });
  const isDragging = useRef(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    sessionStorage.setItem('vpp-pdf-split', String(splitPct));
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

  // Fetch ER notes + labels
  useEffect(() => {
    const fetchERNotes = async () => {
      setIsLoadingER(true);
      try {
        const response = await fetch(`/api/er-notes/${paperId}`);
        if (response.ok) {
          const data = await response.json();
          setErNotes(data.notes || {});
          setErLabels(data.labels || {});
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

  const handleERClick = (key: string) => {
    if (erNotes[key] || Object.keys(erNotes).some(k => k.startsWith(key) && /[a-z]/.test(k[key.length] ?? ''))) {
      setSelectedKey(key);
    }
  };

  const qpPdfUrl = pdfUrl(paperId);
  const msPdfUrl = pdfUrl(paperId.replace('_qp_', '_ms_'));
  const erPdfUrl = pdfUrl(paperId.replace(/_qp_\d+/, '_er'));

  const HEADER_H = 62;

  return (
    <div className="min-h-screen" style={{ background: '#0a0c10' }}>

      {/* Header */}
      <div className="sticky top-0 z-30" style={{
        background: 'linear-gradient(180deg, #0d1018 0%, #0a0c14 100%)',
        borderBottom: '1px solid rgba(200,168,76,0.12)',
        boxShadow: '0 2px 20px rgba(0,0,0,0.4)',
        height: `${HEADER_H}px`,
        display: 'flex', alignItems: 'center',
      }}>
        <div style={{ width: '100%', maxWidth: '1920px', margin: '0 auto', padding: '0 24px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '24px' }}>
          {/* Title — left-padded so the fixed site navbar logo doesn't clip it */}
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
              whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
            }}>
              {subjectName} ({subjectCode})
            </p>
          </div>
          {/* Buttons */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexShrink: 0 }}>
            <PaneBtn label="QP" active={showQP} title={showQP ? 'Hide Question Paper' : 'Show Question Paper'} onClick={() => setShowQP(v => !v)} />
            <PaneBtn label="MS" active={showMS} title={showMS ? 'Hide Mark Scheme' : 'Show Mark Scheme'} onClick={() => setShowMS(v => !v)} />
            {showER && <ERBtn href={erPdfUrl} />}
            {onExit && <ExitBtn onClick={onExit} />}
          </div>
        </div>
      </div>

      {/* Draggable split-pane PDF layout */}
      <div
        ref={containerRef}
        style={{
          display: 'flex',
          flexDirection: 'row',
          width: '100%',
          height: `calc(100vh - ${HEADER_H}px)`,
          overflow: 'hidden',
          padding: '12px',
          gap: 0,
          boxSizing: 'border-box',
        }}
      >
        {/* QP Pane */}
        {showQP && (
          <div style={{
            width: showMS ? `${splitPct}%` : '100%',
            height: '100%',
            flexShrink: 0,
            borderRadius: '12px',
            overflow: 'hidden',
            background: '#111418',
            border: '1px solid rgba(200,168,76,0.10)',
            display: 'flex',
            flexDirection: 'column',
          }}>
            <div style={{ padding: '8px 20px', background: '#0d1018', borderBottom: '1px solid rgba(200,168,76,0.10)', flexShrink: 0, display: 'flex', alignItems: 'center', gap: '10px' }}>
              <h2 style={{ fontFamily: "'Cormorant Garamond',Georgia,serif", fontSize: '15px', fontWeight: 600, color: '#a8c4e8', letterSpacing: '0.02em', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <svg width="15" height="15" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                Question Paper
              </h2>
              {showER && (
                <div style={{ display: 'flex', gap: '6px', alignItems: 'center', flexWrap: 'wrap' }}>
                  <span style={{ fontSize: '11px', fontFamily: 'Inter, sans-serif', fontWeight: 600, padding: '2px 10px', borderRadius: '20px', background: 'rgba(180,130,20,0.18)', border: '1px solid rgba(200,168,76,0.35)', color: '#c8a84c', letterSpacing: '0.04em' }}>
                    ER Available
                  </span>
                  {erNotes['key_messages'] && (
                    <button
                      onClick={() => setSelectedKey('key_messages')}
                      style={{ fontSize: '11px', fontFamily: 'Inter, sans-serif', fontWeight: 600, padding: '2px 10px', borderRadius: '20px', background: 'rgba(59,130,246,0.15)', border: '1px solid rgba(59,130,246,0.4)', color: '#60a5fa', letterSpacing: '0.04em', cursor: 'pointer' }}
                    >
                      Key Messages
                    </button>
                  )}
                  {erNotes['general_comments'] && (
                    <button
                      onClick={() => setSelectedKey('general_comments')}
                      style={{ fontSize: '11px', fontFamily: 'Inter, sans-serif', fontWeight: 600, padding: '2px 10px', borderRadius: '20px', background: 'rgba(16,185,129,0.15)', border: '1px solid rgba(16,185,129,0.4)', color: '#34d399', letterSpacing: '0.04em', cursor: 'pointer' }}
                    >
                      General Comments
                    </button>
                  )}
                </div>
              )}
            </div>
            <div style={{ flex: 1, overflow: 'hidden' }}>
              {showER && Object.keys(erNotes).length > 0 ? (
                <PDFViewerWithEROverlay
                  pdfUrl={qpPdfUrl}
                  paperId={paperId}
                  erNotes={erNotes}
                  erLabels={erLabels}
                  onERClick={handleERClick}
                />
              ) : (
                <PDFViewer pdfUrl={qpPdfUrl} title="Question Paper" className="h-full" />
              )}
            </div>
          </div>
        )}

        {/* Ornamental gold divider — draggable */}
        {showQP && showMS && (
          <div
            onMouseDown={onDividerMouseDown}
            style={{
              width: '36px',
              flexShrink: 0,
              cursor: 'col-resize',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              zIndex: 10,
              position: 'relative',
            }}
          >
            {/* Full-height hairline */}
            <div style={{
              position: 'absolute',
              top: 0, bottom: 0,
              left: '50%',
              width: '1px',
              transform: 'translateX(-50%)',
              background: 'linear-gradient(180deg, transparent 0%, rgba(200,168,76,0.18) 15%, rgba(200,168,76,0.18) 85%, transparent 100%)',
              pointerEvents: 'none',
            }} />
            {/* Ornamental SVG — infinity knot with arrow tips (3rd style) */}
            <svg
              width="28"
              height="120"
              viewBox="0 0 28 120"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
              style={{ position: 'relative', filter: 'drop-shadow(0 0 4px rgba(200,168,76,0.35))' }}
            >
              {/* Top arrow tip */}
              <line x1="14" y1="0" x2="14" y2="22" stroke="rgba(200,168,76,0.55)" strokeWidth="1"/>
              <polygon points="14,4 11,12 17,12" fill="rgba(200,168,76,0.7)"/>
              <line x1="8" y1="10" x2="14" y2="4" stroke="rgba(200,168,76,0.5)" strokeWidth="0.8"/>
              <line x1="20" y1="10" x2="14" y2="4" stroke="rgba(200,168,76,0.5)" strokeWidth="0.8"/>
              {/* Centre ornament — infinity / figure-8 knot */}
              <path
                d="M14 48 C10 44, 4 44, 4 52 C4 60, 10 60, 14 56 C18 60, 24 60, 24 52 C24 44, 18 44, 14 48Z"
                stroke="rgba(200,168,76,0.85)"
                strokeWidth="1.2"
                fill="none"
              />
              {/* Diamond in centre */}
              <rect x="11.5" y="49.5" width="5" height="5" transform="rotate(45 14 52)" stroke="rgba(200,168,76,0.9)" strokeWidth="1" fill="rgba(200,168,76,0.2)"/>

              {/* Bottom arrow tip */}
              <line x1="14" y1="98" x2="14" y2="120" stroke="rgba(200,168,76,0.55)" strokeWidth="1"/>
              <polygon points="14,116 11,108 17,108" fill="rgba(200,168,76,0.7)"/>
              <line x1="8" y1="110" x2="14" y2="116" stroke="rgba(200,168,76,0.5)" strokeWidth="0.8"/>
              <line x1="20" y1="110" x2="14" y2="116" stroke="rgba(200,168,76,0.5)" strokeWidth="0.8"/>
            </svg>
          </div>
        )}

        {/* MS Pane */}
        {showMS && (
          <div style={{
            width: showQP ? `${100 - splitPct}%` : '100%',
            height: '100%',
            flexShrink: 0,
            borderRadius: '12px',
            overflow: 'hidden',
            background: '#111418',
            border: '1px solid rgba(200,168,76,0.10)',
            display: 'flex',
            flexDirection: 'column',
          }}>
            <div style={{ padding: '8px 20px', background: '#0d1018', borderBottom: '1px solid rgba(200,168,76,0.10)', flexShrink: 0 }}>
              <h2 style={{ fontFamily: "'Cormorant Garamond',Georgia,serif", fontSize: '15px', fontWeight: 600, color: '#88c8a0', letterSpacing: '0.02em', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <svg width="15" height="15" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
                </svg>
                Marking Scheme
              </h2>
            </div>
            <div style={{ flex: 1, overflow: 'hidden' }}>
              <PDFViewer pdfUrl={msPdfUrl} title="Marking Scheme" className="h-full" />
            </div>
          </div>
        )}
      </div>

      {/* ER Modal */}
      {selectedKey !== null && (() => {
        // If the key has a direct note, use it. Otherwise combine all sub-part notes
        // (e.g. key="1" → combine "1a","1b","1c"...) so the modal shows all parts.
        const directNote = erNotes[selectedKey];
        const subKeys = !directNote
          ? Object.keys(erNotes)
              .filter(k => k.startsWith(selectedKey) && /[a-z]/.test(k[selectedKey.length] ?? ''))
              .sort()
          : [];
        const combinedNote = directNote
          || subKeys.map(k => `(${k.slice(selectedKey.length)}) ${erNotes[k]}`).join(' ');
        const qLabel = erLabels[selectedKey]
          || (subKeys.length ? `Q ${selectedKey}` : selectedKey);
        return (
          <ExaminerReportModal
            isOpen={true}
            onClose={() => setSelectedKey(null)}
            label={qLabel}
            erNote={combinedNote}
          />
        );
      })()}
    </div>
  );
}

// Made with Bob
