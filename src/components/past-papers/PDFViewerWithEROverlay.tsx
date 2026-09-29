'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';

interface QuestionCoordinate {
  key: string;
  label: string;
  topPx: number;
  page: number;
  qNum?: number;
}

interface PDFViewerWithEROverlayProps {
  pdfUrl: string;
  paperId: string;
  erNotes: Record<string, string>;
  erLabels: Record<string, string>;
  onERClick: (key: string) => void;
}

// ── Question-number detection from PDF text content ──────────────────────────
//
// Cambridge MCQ papers: each question starts with a bold standalone number
// on its own text item, e.g. "1", "2", ... "40".
// Theory papers: "Question 1", "1 (a)", etc.
// We scan every page's text items and look for a number that:
//   - matches a key in erNotes
//   - appears near the top of a text item (y < 80% of page height)
//   - isn't part of a longer number (not "12" matching key "1")

function buildButtonPositionsFromText(
  pdfDoc: any,
  erNotes: Record<string, string>,
  scale: number,
): Promise<QuestionCoordinate[]> {
  // Build the set of top-level question numbers from all ER keys
  // e.g. from "1a","1b","2c","3" → { "1", "2", "3" }
  const topLevelKeys = new Set<string>();
  Object.keys(erNotes).forEach(k => {
    const m = k.match(/^(\d+)/);
    if (m) topLevelKeys.add(m[1]);
  });

  // Determine whether this is an MCQ paper (pure numeric keys like "1","2","40")
  // vs a theory paper (sub-part keys like "1a","1b").
  // MCQ keys are purely numeric integers; theory papers always have letter suffixes.
  const hasPureNumericKeys = [...topLevelKeys].some(n =>
    Object.keys(erNotes).includes(n)
  );
  const hasSubpartKeys = Object.keys(erNotes).some(k => /^\d+[a-z]/i.test(k));

  return (async () => {
    const results: QuestionCoordinate[] = [];
    const placed = new Set<string>();

    for (let pageNum = 1; pageNum <= pdfDoc.numPages; pageNum++) {
      const page = await pdfDoc.getPage(pageNum);
      const viewport = page.getViewport({ scale: 1 });
      const pageHeight = viewport.height;
      const pageWidth  = viewport.width;

      let textContent: any;
      try {
        textContent = await page.getTextContent();
      } catch {
        continue;
      }

      // Each item has: str, transform [a,b,c,d,e,f] where (e,f) = (x, y from bottom)
      const items: Array<{ str: string; y: number; x: number }> =
        textContent.items.map((item: any) => ({
          str: item.str.trim(),
          // PDF coords: y=0 at bottom. Convert to topPx (y=0 at top)
          y: pageHeight - item.transform[5],
          x: item.transform[4],
        }));

      for (const item of items) {
        if (!item.str) continue;

        // Match "Question 3", standalone "3" or "3."
        const mFull = item.str.match(/^(?:Question\s+)?(\d{1,2})\.?\s*$/);
        if (!mFull) continue;
        const qNum = mFull[1];

        if (!topLevelKeys.has(qNum)) continue;
        if (placed.has(qNum)) continue;

        // Skip page-header zone (y < 60) to avoid printed page numbers
        if (item.y < 60) continue;
        // Skip footer area
        if (item.y > pageHeight * 0.92) continue;

        // For standalone digit items (not "Question N" style), enforce a left-margin
        // x-position check to avoid matching equation digits, table values, etc.
        // Theory Q numbers sit at x ≈ 50px (8-10% of 595pt page).
        // MCQ numbers also sit at the left margin.
        // "Question N" style labels have no x constraint.
        const isQuestNStyle = /^Question\s+/i.test(item.str);
        if (!isQuestNStyle && item.x > pageWidth * 0.13) continue;

        results.push({
          key: qNum,
          label: `Q ${qNum}`,
          topPx: item.y,
          page: pageNum,
        });
        placed.add(qNum);
      }
    }

    return results;
  })();
}

export function PDFViewerWithEROverlay({
  pdfUrl,
  paperId,
  erNotes,
  erLabels,
  onERClick
}: PDFViewerWithEROverlayProps) {
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [pdfReady, setPdfReady] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasWrapperRef = useRef<HTMLDivElement>(null);
  const pdfDocRef = useRef<any>(null);
  const renderTasksRef = useRef<any[]>([]);
  const pageViewportHeightsRef = useRef<number[]>([]);
  const pageViewportWidthsRef = useRef<number[]>([]);
  const [pdfjsLib, setPdfjsLib] = useState<any>(null);
  // Coords detected from PDF text — only used for MCQ papers (no _coords.json file)
  const textCoordsRef = useRef<QuestionCoordinate[]>([]);
  // Pre-computed coords from the _coords.json file (theory papers — used preferentially)
  const [fallbackCoords, setFallbackCoords] = useState<QuestionCoordinate[]>([]);
  // Ref mirror of fallbackCoords so ResizeObserver callback always sees latest value
  const fallbackCoordsRef = useRef<QuestionCoordinate[]>([]);
  // true = coords fetch is done; null = still loading
  const [coordsFetched, setCoordsFetched] = useState(false);
  const erNotesRef = useRef<Record<string, string>>({});
  const erLabelsRef = useRef<Record<string, string>>({});
  const onERClickRef = useRef(onERClick);

  useEffect(() => { onERClickRef.current = onERClick; }, [onERClick]);
  useEffect(() => { erNotesRef.current = erNotes; }, [erNotes]);
  useEffect(() => { erLabelsRef.current = erLabels; }, [erLabels]);

  // Load PDF.js
  useEffect(() => {
    import('pdfjs-dist').then(pdfjs => {
      pdfjs.GlobalWorkerOptions.workerSrc = `//unpkg.com/pdfjs-dist@4.0.379/build/pdf.worker.min.mjs`;
      setPdfjsLib(pdfjs);
    }).catch(() => setError('Failed to load PDF library'));
  }, []);

  // Fetch pre-computed question coords. Sets coordsFetched=true when done (hit or miss).
  useEffect(() => {
    setCoordsFetched(false);
    fetch(`/api/question-coords/${paperId}`)
      .then(r => r.ok ? r.json() : null)
      .then(data => {
        const coords = data?.coordinates || [];
        setFallbackCoords(coords);
        fallbackCoordsRef.current = coords;
        setCoordsFetched(true);
      })
      .catch(() => { setFallbackCoords([]); fallbackCoordsRef.current = []; setCoordsFetched(true); });
  }, [paperId]);

  // Render PDF pages + optionally extract text coords for MCQ papers
  // We wait for coordsFetched so we know whether a _coords.json file exists before deciding
  // whether to run the live text scan.
  useEffect(() => {
    if (!pdfjsLib || !coordsFetched) return;

    let cancelled = false;
    let blobObjectUrl: string | null = null;

    const render = async () => {
      setIsLoading(true);
      setError(null);
      setPdfReady(false);

      renderTasksRef.current.forEach(t => t?.cancel?.());
      renderTasksRef.current = [];
      pdfDocRef.current?.destroy();
      pdfDocRef.current = null;
      pageViewportHeightsRef.current = [];
      pageViewportWidthsRef.current = [];
      textCoordsRef.current = [];

      if (canvasWrapperRef.current) canvasWrapperRef.current.innerHTML = '';

      try {
        const res = await fetch(pdfUrl);
        if (cancelled) return;
        if (!res.ok) throw new Error(`PDF fetch failed: ${res.status}`);
        const blob = await res.blob();
        if (cancelled) return;
        blobObjectUrl = URL.createObjectURL(blob);

        const pdf = await pdfjsLib.getDocument(blobObjectUrl).promise;
        if (cancelled) return;
        pdfDocRef.current = pdf;

        const scale = 1.5;

        for (let i = 1; i <= pdf.numPages; i++) {
          if (cancelled) return;
          const page = await pdf.getPage(i);
          const viewport = page.getViewport({ scale });
          const naturalViewport = page.getViewport({ scale: 1 });

          pageViewportHeightsRef.current.push(naturalViewport.height);
          pageViewportWidthsRef.current.push(naturalViewport.width);

          const wrapper = document.createElement('div');
          wrapper.style.cssText = 'position:relative;margin-bottom:20px;line-height:0;overflow:visible;';
          wrapper.setAttribute('data-page', String(i));

          const canvas = document.createElement('canvas');
          canvas.width = viewport.width;
          canvas.height = viewport.height;
          canvas.style.cssText = 'width:100%;display:block;';
          wrapper.appendChild(canvas);
          canvasWrapperRef.current?.appendChild(wrapper);

          const ctx = canvas.getContext('2d');
          if (ctx) {
            const task = page.render({ canvasContext: ctx, viewport });
            renderTasksRef.current.push(task);
            await task.promise;
          }
        }

        if (!cancelled) {
          // Only run live text scan for MCQ papers (no pre-computed coords).
          // Theory papers have a _coords.json; scanning their text picks up formula sheet
          // numbers, page numbers, equation digits — causing wrong button positions.
          if (fallbackCoords.length === 0) {
            try {
              const textCoords = await buildButtonPositionsFromText(pdf, erNotes, scale);
              if (!cancelled) textCoordsRef.current = textCoords;
            } catch {
              // leave textCoordsRef empty — buttons just won't show
            }
          }
          setIsLoading(false);
          setPdfReady(true);
        }
      } catch (err: any) {
        if (cancelled || err?.name === 'RenderingCancelledException') return;
        setError(err.message || 'Failed to load PDF');
        setIsLoading(false);
      }
    };

    render();

    return () => {
      cancelled = true;
      renderTasksRef.current.forEach(t => t?.cancel?.());
      pdfDocRef.current?.destroy();
      pdfDocRef.current = null;
      if (blobObjectUrl) URL.revokeObjectURL(blobObjectUrl);
    };
  }, [pdfUrl, pdfjsLib, coordsFetched]);

  // Build merged coordinates using refs (safe to call from ResizeObserver callbacks).
  // - If pre-computed coords exist, use them exclusively (theory papers).
  // - Otherwise use text-detected coords (MCQ papers).
  const getMergedCoords = (): QuestionCoordinate[] => {
    if (fallbackCoordsRef.current.length > 0) {
      return fallbackCoordsRef.current;
    }
    return textCoordsRef.current;
  };

  const injectButtons = useCallback((coords: QuestionCoordinate[]) => {
    if (!canvasWrapperRef.current) return;
    canvasWrapperRef.current.querySelectorAll('.er-btn').forEach(b => b.remove());

    coords.forEach(coord => {
      const key = coord.key ?? coord.qNum?.toString() ?? '';
      const hasNote = !!erNotesRef.current[key];
      const hasSubparts = !hasNote && Object.keys(erNotesRef.current).some(
        k => k.startsWith(key) && /[a-z]/.test(k[key.length] ?? '')
      );
      if (!hasNote && !hasSubparts) return;

      // Use the ref so we always have the latest labels even if erLabels prop changed
      const label = erLabelsRef.current[key] ?? coord.label ?? `Q ${key}`;

      const wrapper = canvasWrapperRef.current!.querySelector<HTMLDivElement>(
        `div[data-page="${coord.page}"]`
      );
      if (!wrapper) return;

      const naturalHeight = pageViewportHeightsRef.current[coord.page - 1];
      const naturalWidth  = pageViewportWidthsRef.current[coord.page - 1];
      const canvas = wrapper.querySelector('canvas');
      if (!canvas) return;

      // Use canvas.offsetWidth/offsetHeight — these reflect actual CSS layout size.
      // Fall back to naturalWidth * (canvas CSS width / canvas pixel width) when offsetWidth=0.
      const canvasCssW = canvas.offsetWidth  > 0 ? canvas.offsetWidth  : canvas.getBoundingClientRect().width;
      const canvasCssH = canvas.offsetHeight > 0 ? canvas.offsetHeight : canvas.getBoundingClientRect().height;

      // canvas was rendered at scale=1.5, so canvas.width = naturalWidth * 1.5
      const renderScale = 1.5;
      const naturalW = naturalWidth  ?? (canvas.width  / renderScale);
      const naturalH = naturalHeight ?? (canvas.height / renderScale);

      // If layout hasn't happened yet (canvasCssW still 0), skip — ResizeObserver will re-inject.
      if (canvasCssW <= 0) return;

      const scaleY = canvasCssH > 0
        ? canvasCssH / naturalH
        : (canvasCssW / naturalW);  // assume aspect ratio when height unavailable

      // topPx is in natural (scale=1) PDF coordinates (y=0 at top of page)
      const topCss = coord.topPx * scaleY;

      const btn = document.createElement('button');
      btn.className = 'er-btn';
      btn.style.cssText = [
        'position:absolute',
        `top:${topCss}px`,
        'left:6px',
        'z-index:50',
        'background:#f59e0b',
        'color:#1a0a00',
        'font-size:10px',
        'font-weight:700',
        'padding:2px 6px',
        'border-radius:4px',
        'border:1.5px solid #d97706',
        'cursor:pointer',
        'box-shadow:0 1px 3px rgba(0,0,0,0.4)',
        'line-height:1.5',
        'white-space:nowrap',
        'transform:translateY(-50%)',
        'pointer-events:auto',
      ].join(';');
      btn.textContent = label;
      btn.title = `Examiner Report — ${label}`;
      btn.addEventListener('click', () => onERClickRef.current(key));
      wrapper.appendChild(btn);
    });
  }, []); // no deps — reads everything through refs

  // Inject buttons when PDF is ready.
  // Double-rAF ensures the browser has finished layout so canvas.offsetWidth is non-zero.
  useEffect(() => {
    if (!pdfReady || !canvasWrapperRef.current) return;
    let rafId: number;
    rafId = requestAnimationFrame(() => {
      rafId = requestAnimationFrame(() => {
        injectButtons(getMergedCoords());
      });
    });
    return () => cancelAnimationFrame(rafId);
  }, [pdfReady, fallbackCoords, erNotes, injectButtons]);

  // Re-inject on resize — observe the outer scroll container so the split-pane
  // drag (which resizes the container, not the canvas wrapper) also triggers re-injection.
  useEffect(() => {
    if (!containerRef.current) return;
    let rafId: number;
    const ro = new ResizeObserver(() => {
      // Debounce via rAF to avoid injecting mid-resize on every pixel change
      cancelAnimationFrame(rafId);
      rafId = requestAnimationFrame(() => {
        if (pdfDocRef.current) injectButtons(getMergedCoords());
      });
    });
    ro.observe(containerRef.current);
    return () => { ro.disconnect(); cancelAnimationFrame(rafId); };
  }, [injectButtons]);

  return (
    <div
      ref={containerRef}
      className="relative w-full h-full bg-slate-100 dark:bg-slate-900 overflow-y-auto"
    >
      {isLoading && (
        <div className="absolute inset-0 flex items-center justify-center bg-slate-100 dark:bg-slate-800 z-50">
          <div className="text-center">
            <div className="w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
            <p className="text-slate-600 dark:text-slate-400 font-medium">Loading PDF...</p>
          </div>
        </div>
      )}
      {error && (
        <div className="absolute inset-0 flex items-center justify-center bg-slate-100 dark:bg-slate-800">
          <div className="text-center">
            <p className="text-red-500 font-medium">{error}</p>
            <p className="text-sm text-slate-500 mt-2">Try refreshing the page</p>
          </div>
        </div>
      )}
      <div ref={canvasWrapperRef} className="mx-auto max-w-[850px] py-4 overflow-visible" />
    </div>
  );
}

// Made with Bob
