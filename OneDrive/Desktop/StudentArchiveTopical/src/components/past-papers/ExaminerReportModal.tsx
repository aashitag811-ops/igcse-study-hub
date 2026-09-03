'use client';

import React from 'react';

interface ExaminerReportModalProps {
  isOpen: boolean;
  onClose: () => void;
  // label is the display string e.g. "Q 1. (a)" or "Q 22"
  label: string;
  erNote: string;
}

// Split a note that contains inline sub-part markers like "(a) text (b) text" into
// an array of { subLabel, text } sections. Returns null if no valid split found.
function parseInlineSubparts(note: string): { subLabel: string; text: string }[] | null {
  // Match (a), (b), (c)... at the start of the string OR after sentence-ending punctuation
  // We also need at least 2 sub-parts to make splitting worthwhile
  const MARKER_RE = /(?:^|\.\s+|\?\s+|!\s+)\(([a-hj-np-uw-z])\)\s+/g;

  const positions: { letter: string; start: number; textStart: number }[] = [];
  let m: RegExpExecArray | null;

  // Special case: note may start directly with (a)
  const startsWithPart = /^\(([a-hj-np-uw-z])\)\s+/.exec(note);
  if (startsWithPart) {
    positions.push({ letter: startsWithPart[1], start: 0, textStart: startsWithPart[0].length });
  }

  MARKER_RE.lastIndex = 0;
  while ((m = MARKER_RE.exec(note)) !== null) {
    // m[0] includes the sentence-ending punctuation + space + (x) + space
    // We want to start the new section from the (x) character
    const markerStart = m.index + m[0].indexOf(`(${m[1]})`);
    const textStart   = markerStart + m[1].length + 2 + (note[markerStart + m[1].length + 2] === ' ' ? 1 : 0);
    // Avoid duplicating what we found with startsWithPart
    if (positions.some(p => Math.abs(p.start - markerStart) < 3)) continue;
    positions.push({ letter: m[1], start: markerStart, textStart });
  }

  // Require at least 2 sub-parts and that they are sequential: a, b, c...
  if (positions.length < 2) return null;
  const letters = positions.map(p => p.letter);
  const isSeq = letters.every((l, i) => i === 0 || l.charCodeAt(0) === letters[i-1].charCodeAt(0) + 1);
  if (!isSeq) return null;

  // Build sections
  const preamble = note.slice(0, positions[0].start).trim();
  const sections: { subLabel: string; text: string }[] = [];

  if (preamble) {
    sections.push({ subLabel: '', text: preamble });
  }

  for (let i = 0; i < positions.length; i++) {
    const end = i + 1 < positions.length ? positions[i + 1].start : note.length;
    // Include the closing punctuation before the next marker
    const text = note.slice(positions[i].textStart, end).replace(/\s+$/, '').trim();
    if (text) {
      sections.push({ subLabel: `(${positions[i].letter})`, text });
    }
  }

  return sections.length >= 2 ? sections : null;
}

export function ExaminerReportModal({
  isOpen,
  onClose,
  label,
  erNote
}: ExaminerReportModalProps) {
  if (!isOpen) return null;

  const sections = parseInlineSubparts(erNote);

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
                  {label}
                </span>
              </div>
              <h2 className="text-xl font-bold text-white">
                Examiner Report Insights
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
            {sections ? (
              // Parsed sub-parts — render each as its own card
              <div className="flex flex-col gap-3">
                {sections.map((sec, i) => (
                  <div
                    key={i}
                    className="bg-amber-50 dark:bg-amber-900/10 border-l-4 border-amber-500 rounded-r-lg p-4"
                  >
                    <div className="flex items-start gap-3">
                      <div className="flex-shrink-0 mt-0.5">
                        {sec.subLabel ? (
                          <span className="inline-flex items-center justify-center w-7 h-7 rounded-full bg-amber-500 text-white text-xs font-bold">
                            {sec.subLabel}
                          </span>
                        ) : (
                          <svg
                            className="w-5 h-5 text-amber-600 dark:text-amber-400"
                            fill="none" viewBox="0 0 24 24" stroke="currentColor"
                          >
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                              d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                          </svg>
                        )}
                      </div>
                      <div className="flex-1">
                        {sec.subLabel && (
                          <h3 className="text-xs font-semibold text-amber-900 dark:text-amber-100 mb-1 uppercase tracking-wider">
                            Part {sec.subLabel}
                          </h3>
                        )}
                        <p className="text-slate-700 dark:text-slate-300 leading-relaxed text-sm">
                          {sec.text}
                        </p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              // Single undivided note
              <div className="bg-amber-50 dark:bg-amber-900/10 border-l-4 border-amber-500 rounded-r-lg p-5">
                <div className="flex items-start gap-3">
                  <div className="flex-shrink-0 mt-1">
                    <svg
                      className="w-5 h-5 text-amber-600 dark:text-amber-400"
                      fill="none" viewBox="0 0 24 24" stroke="currentColor"
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                        d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </div>
                  <div className="flex-1">
                    <h3 className="text-sm font-semibold text-amber-900 dark:text-amber-100 mb-2 uppercase tracking-wider">
                      Cambridge Examiner Feedback
                    </h3>
                    <p className="text-slate-700 dark:text-slate-300 leading-relaxed whitespace-pre-wrap">
                      {erNote}
                    </p>
                  </div>
                </div>
              </div>
            )}

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
