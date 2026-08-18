'use client';

/**
 * PDFOverlayViewer
 *
 * Renders a PDF page-by-page using pdfjs-dist <canvas> elements.
 * Floats <textarea> inputs precisely over every answer-zone (dot line group)
 * so students type directly "on" the paper.
 *
 * Layout: full-width scroll — each page is a positioned container with
 * canvas + absolutely-positioned overlay inputs.
 */

import React, { useEffect, useRef, useState, useCallback } from 'react';

// ── Types ─────────────────────────────────────────────────────────────────────

export interface AnswerBlock {
  page: number;
  yStart: number;    // pt, top-down from page top
  yEnd: number;      // pt
  xStart: number;    // pt
  xEnd: number;      // pt
  lineCount: number;
  subPartKey: string | null;
  diagramOnly: boolean;
}

export interface AnswerZoneData {
  paperId: string;
  pageWidth: number;   // pt
  pageHeight: number;  // pt
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

interface PageProps {
  pdf: unknown;           // pdfjsLib.PDFDocumentProxy
  pageNum: number;
  pageWidthPt: number;
  pageHeightPt: number;
  blocks: AnswerBlock[];
  answers: Record<string, string>;
  onAnswerChange: (key: string, value: string) => void;
  focusedKey: string | null;
  onFocus: (key: string) => void;
}

function PDFPage({
  pdf, pageNum, pageWidthPt, pageHeightPt,
  blocks, answers, onAnswerChange, focusedKey, onFocus,
}: PageProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(1);
  const [rendered, setRendered] = useState(false);
  const renderTaskRef = useRef<{ cancel: () => void } | null>(null);

  // Compute scale to fit container width
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

  // Render page to canvas when scale changes
  useEffect(() => {
    if (!canvasRef.current || scale <= 0) return;

    // Cancel any in-progress render
    if (renderTaskRef.current) {
      renderTaskRef.current.cancel();
      renderTaskRef.current = null;
    }
    setRendered(false);

    let cancelled = false;

    async function render() {
      try {
        const pdfDoc = pdf as { getPage: (n: number) => Promise<unknown> };
        const page   = await pdfDoc.getPage(pageNum);
        if (cancelled) return;

        const vp     = (page as { getViewport: (o: { scale: number }) => { width: number; height: number } })
          .getViewport({ scale });
        const canvas = canvasRef.current!;
        canvas.width  = Math.round(vp.width);
        canvas.height = Math.round(vp.height);

        const ctx = canvas.getContext('2d')!;
        const renderTask = (page as {
          render: (o: { canvasContext: CanvasRenderingContext2D; viewport: unknown }) => { promise: Promise<void>; cancel: () => void }
        }).render({ canvasContext: ctx, viewport: vp });

        renderTaskRef.current = renderTask;
        await renderTask.promise;
        if (!cancelled) setRendered(true);
      } catch (e: unknown) {
        if (!cancelled && (e as { name?: string }).name !== 'RenderingCancelledException') {
          console.error('Page render error', e);
        }
      }
    }

    render();
    return () => {
      cancelled = true;
      if (renderTaskRef.current) {
        renderTaskRef.current.cancel();
        renderTaskRef.current = null;
      }
    };
  }, [pdf, pageNum, scale]);

  const canvasHeight = Math.round(pageHeightPt * scale);

  return (
    <div
      ref={containerRef}
      style={{
        position: 'relative',
        width: '100%',
        height: canvasHeight > 0 ? `${canvasHeight}px` : 'auto',
        marginBottom: '8px',
        background: '#fff',
        boxShadow: '0 2px 12px rgba(0,0,0,0.35)',
        borderRadius: '2px',
        overflow: 'hidden',
      }}
    >
      {/* PDF canvas */}
      <canvas
        ref={canvasRef}
        style={{ display: 'block', width: '100%', height: '100%' }}
      />

      {/* Overlay inputs — one per answer block on this page */}
      {rendered && blocks.map((block, idx) => {
        const top    = block.yStart * scale;
        const left   = block.xStart * scale;
        const width  = (block.xEnd - block.xStart) * scale;
        // Height = span of dot lines + one line height for the last line
        const height = Math.max(24, (block.yEnd - block.yStart) * scale + 4);
        const key    = block.subPartKey ?? `page${pageNum}_block${idx}`;
        const val    = answers[key] ?? '';
        const isFocused = focusedKey === key;

        if (block.diagramOnly) return null; // can't type on diagram questions

        return (
          <textarea
            key={key}
            value={val}
            onChange={e => onAnswerChange(key, e.target.value)}
            onFocus={() => onFocus(key)}
            placeholder=""
            style={{
              position: 'absolute',
              top:   `${top - 2}px`,
              left:  `${left}px`,
              width: `${width}px`,
              height: `${height}px`,
              // Transparent-ish so you can still see the dots beneath lightly
              background: isFocused
                ? 'rgba(255,253,230,0.97)'
                : val.trim()
                  ? 'rgba(240,255,240,0.92)'
                  : 'rgba(255,255,255,0.88)',
              border: isFocused
                ? '1.5px solid rgba(180,130,0,0.8)'
                : val.trim()
                  ? '1px solid rgba(60,160,60,0.5)'
                  : '1px solid rgba(180,130,0,0.25)',
              borderRadius: '2px',
              fontFamily: "'Helvetica Neue', Arial, sans-serif",
              fontSize: `${Math.max(10, Math.round(10.5 * scale))}px`,
              lineHeight: `${Math.round(26 * scale)}px`,
              color: '#111',
              padding: '0 4px',
              resize: 'none',
              outline: 'none',
              overflow: 'hidden',
              boxSizing: 'border-box',
              cursor: 'text',
              zIndex: 10,
              transition: 'background 0.1s, border-color 0.1s',
              // Hide the scrollbar
              scrollbarWidth: 'none',
            }}
          />
        );
      })}
    </div>
  );
}

// ── Main component ────────────────────────────────────────────────────────────

export function PDFOverlayViewer({
  pdfUrl, zoneData, answers, onAnswerChange, focusedKey, onFocus,
}: PDFOverlayViewerProps) {
  const [pdfDoc, setPdfDoc] = useState<unknown>(null);
  const [numPages, setNumPages] = useState(0);
  const [loadError, setLoadError] = useState<string | null>(null);

  // Group blocks by page
  const blocksByPage: Record<number, AnswerBlock[]> = {};
  for (const block of zoneData.blocks) {
    if (!blocksByPage[block.page]) blocksByPage[block.page] = [];
    blocksByPage[block.page].push(block);
  }

  useEffect(() => {
    let cancelled = false;
    let docRef: { destroy: () => void } | null = null;

    async function load() {
      try {
        const pdfjsLib = await import('pdfjs-dist/build/pdf.mjs' as string) as {
          getDocument: (o: { url: string; disableWorker?: boolean }) => { promise: Promise<unknown> };
          GlobalWorkerOptions: { workerSrc: string };
        };
        pdfjsLib.GlobalWorkerOptions.workerSrc = '/pdf.worker.min.mjs';

        const loadTask = pdfjsLib.getDocument({ url: pdfUrl, disableWorker: false });
        const doc = await loadTask.promise as { numPages: number; destroy: () => void };
        if (cancelled) { doc.destroy(); return; }
        docRef = doc;
        setPdfDoc(doc);
        setNumPages(doc.numPages);
      } catch (e) {
        if (!cancelled) setLoadError(String(e));
      }
    }

    load();
    return () => {
      cancelled = true;
      docRef?.destroy();
    };
  }, [pdfUrl]);

  if (loadError) {
    return (
      <div style={{ padding: '40px', textAlign: 'center', color: '#888' }}>
        Failed to load PDF: {loadError}
      </div>
    );
  }

  if (!pdfDoc) {
    return (
      <div style={{ padding: '40px', textAlign: 'center' }}>
        <div style={{
          width: '36px', height: '36px', borderRadius: '50%',
          border: '3px solid rgba(200,168,76,0.2)',
          borderTop: '3px solid rgba(200,168,76,0.7)',
          margin: '0 auto 16px',
          animation: 'spin 0.8s linear infinite',
        }} />
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
        <p style={{ fontFamily: 'Inter, sans-serif', fontSize: '13px', color: 'rgba(160,180,220,0.6)' }}>
          Loading PDF…
        </p>
      </div>
    );
  }

  return (
    <div style={{
      width: '100%',
      padding: '12px 16px',
      boxSizing: 'border-box',
    }}>
      {Array.from({ length: numPages }, (_, i) => i + 1).map(pageNum => (
        <PDFPage
          key={pageNum}
          pdf={pdfDoc}
          pageNum={pageNum}
          pageWidthPt={zoneData.pageWidth}
          pageHeightPt={zoneData.pageHeight}
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
