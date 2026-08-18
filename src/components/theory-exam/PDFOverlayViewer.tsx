'use client';

/**
 * PDFOverlayViewer
 *
 * Renders a PDF page-by-page as <canvas> using pdfjs-dist.
 * Floats <textarea> inputs precisely over every answer-zone (dot line group)
 * so students type directly "on" the paper.
 */

import React, { useEffect, useRef, useState, useCallback } from 'react';
import type { PDFDocumentProxy, PDFPageProxy, RenderTask } from 'pdfjs-dist';

// ── Types ─────────────────────────────────────────────────────────────────────

export interface AnswerBlock {
  page: number;
  yStart: number;
  yEnd: number;
  xStart: number;
  xEnd: number;
  lineCount: number;
  subPartKey: string | null;
  diagramOnly: boolean;
}

export interface AnswerZoneData {
  paperId: string;
  pageWidth: number;
  pageHeight: number;
  blockCount: number;
  blocks: AnswerBlock[];
}

interface PDFOverlayViewerProps {
  pdfUrl: string;
  zoneData: AnswerZoneData;
  answers: Record<string, string>;
  onAnswerChange: (key: string, value: string) => void;
  focusedKey: string | null;
  onFocus: (key: string) => void;
}

// ── Single page renderer ──────────────────────────────────────────────────────

function PDFPage({
  pdfDoc, pageNum, pageWidthPt,
  blocks, answers, onAnswerChange, focusedKey, onFocus,
}: {
  pdfDoc: PDFDocumentProxy;
  pageNum: number;
  pageWidthPt: number;
  blocks: AnswerBlock[];
  answers: Record<string, string>;
  onAnswerChange: (key: string, value: string) => void;
  focusedKey: string | null;
  onFocus: (key: string) => void;
}) {
  const canvasRef    = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [scale, setScale]       = useState(1);
  const [rendered, setRendered] = useState(false);
  const renderTaskRef = useRef<RenderTask | null>(null);
  const pageRef       = useRef<PDFPageProxy | null>(null);

  const updateScale = useCallback(() => {
    if (!containerRef.current) return;
    const cw = containerRef.current.offsetWidth;
    if (cw > 0) setScale(cw / pageWidthPt);
  }, [pageWidthPt]);

  useEffect(() => {
    updateScale();
    const ro = new ResizeObserver(updateScale);
    if (containerRef.current) ro.observe(containerRef.current);
    return () => ro.disconnect();
  }, [updateScale]);

  useEffect(() => {
    if (!canvasRef.current || scale <= 0) return;
    if (renderTaskRef.current) { renderTaskRef.current.cancel(); renderTaskRef.current = null; }
    setRendered(false);
    let live = true;

    async function render() {
      try {
        const page = await pdfDoc.getPage(pageNum);
        if (!live) return;
        pageRef.current = page;

        const vp = page.getViewport({ scale });
        const canvas = canvasRef.current!;
        canvas.width  = Math.round(vp.width);
        canvas.height = Math.round(vp.height);

        const ctx = canvas.getContext('2d')!;
        const task = page.render({ canvasContext: ctx, viewport: vp });
        renderTaskRef.current = task;
        await task.promise;
        if (live) setRendered(true);
      } catch (e: unknown) {
        const err = e as { name?: string };
        if (live && err?.name !== 'RenderingCancelledException') {
          console.error('pdfjs render error p' + pageNum, e);
        }
      }
    }

    render();
    return () => {
      live = false;
      renderTaskRef.current?.cancel();
      renderTaskRef.current = null;
    };
  }, [pdfDoc, pageNum, scale]);

  const canvasH = Math.round((595.3 / pageWidthPt) * 841.9 * scale); // A4 aspect fallback

  return (
    <div
      ref={containerRef}
      style={{
        position: 'relative', width: '100%',
        minHeight: `${canvasH}px`,
        marginBottom: '8px',
        background: '#fff',
        boxShadow: '0 2px 16px rgba(0,0,0,0.4)',
        borderRadius: '2px',
        overflow: 'hidden',
      }}
    >
      <canvas ref={canvasRef} style={{ display: 'block', width: '100%' }} />

      {rendered && blocks.map((block, idx) => {
        if (block.diagramOnly) return null;

        const key    = block.subPartKey ?? `p${pageNum}b${idx}`;
        const val    = answers[key] ?? '';

        // True line spacing between consecutive dot lines
        const LINE_SPACING_PT = (block.lineCount > 1)
          ? (block.yEnd - block.yStart) / (block.lineCount - 1)
          : 26;

        const lineH    = LINE_SPACING_PT * scale;
        // 90% of line spacing — enough room for descenders (g, y, p) without bleeding
        const inputH   = Math.round(lineH * 0.90);
        const left     = block.xStart * scale;
        const width    = (block.xEnd - block.xStart) * scale;
        const fontSize = Math.round(10.5 * Math.min(scale, 1.35));
        // Short blocks (fill-in-the-blank mid-sentence) have narrower width
        const isInline = width < 260 * scale;

        const lines = val.split('\n');

        return Array.from({ length: block.lineCount }, (_, li) => {
          const lineVal  = lines[li] ?? '';
          const isLast   = li === block.lineCount - 1;
          // Each line has its own focus key so only the clicked line highlights
          const lineKey  = `${key}_L${li}`;
          const isActive = focusedKey === lineKey;

          // Centre input vertically on each dot line
          const lineY = (block.yStart + li * LINE_SPACING_PT) * scale;
          const topPx = lineY - inputH * 0.5;

          return (
            <input
              key={lineKey}
              id={lineKey}
              type="text"
              value={lineVal}
              onChange={e => {
                const newLines = [...lines];
                newLines[li] = e.target.value;
                onAnswerChange(key, newLines.join('\n'));
              }}
              onFocus={() => onFocus(lineKey)}
              onKeyDown={e => {
                if ((e.key === 'Enter' || e.key === 'ArrowDown') && !isLast) {
                  e.preventDefault();
                  document.getElementById(`${key}_L${li + 1}`)?.focus();
                }
                if (e.key === 'ArrowUp' && li > 0) {
                  e.preventDefault();
                  document.getElementById(`${key}_L${li - 1}`)?.focus();
                }
              }}
              placeholder=""
              style={{
                position: 'absolute',
                top:    `${topPx}px`,
                left:   `${left}px`,
                width:  `${width}px`,
                height: `${inputH}px`,
                background: '#fff',
                border: isActive ? '1.5px solid #111' : 'none',
                borderBottom: isActive ? '1.5px solid #111' : '1.5px solid #1a1a1a',
                borderRadius: isActive ? (isInline ? '6px' : '4px') : '0',
                boxShadow: isActive ? '0 0 0 3px rgba(0,0,0,0.08)' : 'none',
                fontFamily: "'Helvetica Neue', Arial, sans-serif",
                fontSize:   `${fontSize}px`,
                lineHeight: `${inputH}px`,
                color: '#111',
                padding: '0 5px',
                outline: 'none',
                boxSizing: 'border-box',
                zIndex: 10,
                transition: 'border 0.1s, border-radius 0.1s, box-shadow 0.1s',
              } as React.CSSProperties}
            />
          );
        });
      })}
    </div>
  );
}

// ── Main component ────────────────────────────────────────────────────────────

export function PDFOverlayViewer({
  pdfUrl, zoneData, answers, onAnswerChange, focusedKey, onFocus,
}: PDFOverlayViewerProps) {
  const [pdfDoc,    setPdfDoc]    = useState<PDFDocumentProxy | null>(null);
  const [numPages,  setNumPages]  = useState(0);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [loading,   setLoading]   = useState(true);

  const blocksByPage = zoneData.blocks.reduce<Record<number, AnswerBlock[]>>((acc, b) => {
    (acc[b.page] ??= []).push(b);
    return acc;
  }, {});

  useEffect(() => {
    let live = true;
    let doc: PDFDocumentProxy | null = null;
    setLoading(true);

    (async () => {
      try {
        const pdfjs = await import('pdfjs-dist');
        pdfjs.GlobalWorkerOptions.workerSrc = '/pdf.worker.min.mjs';
        const task = pdfjs.getDocument({ url: pdfUrl });
        doc = await task.promise;
        if (!live) { doc.destroy(); return; }
        setPdfDoc(doc);
        setNumPages(doc.numPages);
        setLoading(false);
      } catch (e) {
        if (live) { setLoadError(String(e)); setLoading(false); }
      }
    })();

    return () => {
      live = false;
      doc?.destroy();
    };
  }, [pdfUrl]);

  if (loading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '60px 0' }}>
        <div style={{
          width: '32px', height: '32px', borderRadius: '50%',
          border: '3px solid rgba(200,168,76,0.15)',
          borderTop: '3px solid rgba(200,168,76,0.7)',
          animation: 'spin 0.8s linear infinite',
        }} />
        <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
      </div>
    );
  }

  if (loadError || !pdfDoc) {
    return (
      <div style={{ padding: '40px', textAlign: 'center', color: '#aaa', fontFamily: 'Inter, sans-serif', fontSize: '13px' }}>
        Failed to load PDF{loadError ? `: ${loadError}` : ''}
      </div>
    );
  }

  return (
    <div style={{ width: '100%', padding: '12px 16px', boxSizing: 'border-box' }}>
      {Array.from({ length: numPages }, (_, i) => i + 1).map(pageNum => (
        <PDFPage
          key={pageNum}
          pdfDoc={pdfDoc}
          pageNum={pageNum}
          pageWidthPt={zoneData.pageWidth}
          blocks={blocksByPage[pageNum] ?? []}
          answers={answers}
          onAnswerChange={onAnswerChange}
          focusedKey={focusedKey}
          onFocus={onFocus}
        />
      ))}
    </div>
  );
}

// Made with Bob
