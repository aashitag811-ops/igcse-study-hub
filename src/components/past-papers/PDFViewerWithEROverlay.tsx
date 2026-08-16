'use client';

import React, { useState, useEffect, useRef } from 'react';

interface QuestionCoordinate {
  key: string;    // e.g. "1a", "1di", "22"
  label: string;  // e.g. "Q 1. (a)", "Q 1. (d) (i)", "Q 22"
  topPx: number;
  page: number;
  // legacy MCQ format support
  qNum?: number;
}

interface PDFViewerWithEROverlayProps {
  pdfUrl: string;
  paperId: string;
  erNotes: Record<string, string>;
  erLabels: Record<string, string>;
  onERClick: (key: string) => void;
}

export function PDFViewerWithEROverlay({
  pdfUrl,
  paperId,
  erNotes,
  erLabels,
  onERClick
}: PDFViewerWithEROverlayProps) {
  const [coordinates, setCoordinates] = useState<QuestionCoordinate[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [pdfReady, setPdfReady] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasWrapperRef = useRef<HTMLDivElement>(null);
  const pdfDocRef = useRef<any>(null);
  const renderTasksRef = useRef<any[]>([]);
  const pageViewportWidthsRef = useRef<number[]>([]); // natural pixel width per page at scale=1
  const [pdfjsLib, setPdfjsLib] = useState<any>(null);
  const coordinatesRef = useRef<QuestionCoordinate[]>([]);
  const erNotesRef = useRef<Record<string, string>>({});

  const onERClickRef = useRef(onERClick);
  useEffect(() => { onERClickRef.current = onERClick; }, [onERClick]);

  // Keep refs in sync so the resize handler can read latest values
  useEffect(() => { coordinatesRef.current = coordinates; }, [coordinates]);
  useEffect(() => { erNotesRef.current = erNotes; }, [erNotes]);

  // Load PDF.js
  useEffect(() => {
    import('pdfjs-dist').then(pdfjs => {
      pdfjs.GlobalWorkerOptions.workerSrc = `//unpkg.com/pdfjs-dist@4.0.379/build/pdf.worker.min.mjs`;
      setPdfjsLib(pdfjs);
    }).catch(() => setError('Failed to load PDF library'));
  }, []);

  // Fetch question coordinates
  useEffect(() => {
    fetch(`/api/question-coords/${paperId}`)
      .then(r => r.ok ? r.json() : null)
      .then(data => { if (data) setCoordinates(data.coordinates || []); })
      .catch(() => {});
  }, [paperId]);

  // Render PDF pages into DOM — runs only when pdfUrl or pdfjsLib changes
  useEffect(() => {
    if (!pdfjsLib) return;

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
      pageViewportWidthsRef.current = [];

      if (canvasWrapperRef.current) canvasWrapperRef.current.innerHTML = '';

      try {
        // Fetch PDF as a blob through our proxy first — prevents CORS failures
        // that happen when pdfjs tries to load a cross-origin GitHub LFS CDN URL directly.
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

          // Store natural (scale=1) width for button positioning later
          const naturalViewport = page.getViewport({ scale: 1 });
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
  }, [pdfUrl, pdfjsLib]);

  // Inject ER buttons — runs whenever PDF is ready OR coordinates arrive
  useEffect(() => {
    if (!pdfReady || !canvasWrapperRef.current) return;

    // Remove old buttons
    canvasWrapperRef.current.querySelectorAll('.er-btn').forEach(b => b.remove());

    if (coordinates.length === 0) return;

    // Use rAF to ensure layout is painted so clientWidth is non-zero
    requestAnimationFrame(() => {
      if (!canvasWrapperRef.current) return;

      coordinates.forEach(coord => {
        // Support both new format (key/label) and legacy (qNum)
        const key   = coord.key ?? coord.qNum?.toString() ?? '';
        // Check if this key has ER data — either a direct note or any sub-part (e.g. "1a","1b"...)
        const hasNote = !!erNotes[key];
        const hasSubparts = !hasNote && Object.keys(erNotes).some(k => k.startsWith(key) && /[a-z]/.test(k[key.length] ?? ''));
        if (!hasNote && !hasSubparts) return;
        // Always pass the bare question key to the click handler so ViewPastPapersPDFMode
        // can combine all sub-parts into a single modal view
        const label = coord.label ?? erLabels[key] ?? `Q ${key}`;

        const wrapper = canvasWrapperRef.current!.querySelector<HTMLDivElement>(
          `div[data-page="${coord.page}"]`
        );
        if (!wrapper) return;

        const canvas = wrapper.querySelector('canvas');
        if (!canvas) return;

        const naturalWidth = pageViewportWidthsRef.current[coord.page - 1] ?? (canvas.width / 1.5);
        const cssWidth = wrapper.clientWidth > 0 ? wrapper.clientWidth : naturalWidth;
        const scale = cssWidth / naturalWidth;
        const topCss = coord.topPx * scale;

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
    });
  }, [pdfReady, coordinates, erNotes]);

  // Re-position buttons if the container is resized (e.g. QP/MS toggle)
  useEffect(() => {
    if (!canvasWrapperRef.current) return;
    const injectButtons = () => {
      if (!canvasWrapperRef.current) return;
      canvasWrapperRef.current.querySelectorAll('.er-btn').forEach(b => b.remove());
      coordinatesRef.current.forEach(coord => {
        const key   = coord.key ?? coord.qNum?.toString() ?? '';
        const hasNote = !!erNotesRef.current[key];
        const hasSubparts = !hasNote && Object.keys(erNotesRef.current).some(k => k.startsWith(key) && /[a-z]/.test(k[key.length] ?? ''));
        if (!hasNote && !hasSubparts) return;
        const label = coord.label ?? erLabels[key] ?? `Q ${key}`;
        const wrapper = canvasWrapperRef.current!.querySelector<HTMLDivElement>(`div[data-page="${coord.page}"]`);
        if (!wrapper) return;
        const canvas = wrapper.querySelector('canvas');
        if (!canvas) return;
        const naturalWidth = pageViewportWidthsRef.current[coord.page - 1] ?? (canvas.width / 1.5);
        const cssWidth = wrapper.clientWidth > 0 ? wrapper.clientWidth : naturalWidth;
        const scale = cssWidth / naturalWidth;
        const topCss = coord.topPx * scale;
        const btn = document.createElement('button');
        btn.className = 'er-btn';
        btn.style.cssText = [
          'position:absolute', `top:${topCss}px`, 'left:6px', 'z-index:50',
          'background:#f59e0b', 'color:#1a0a00', 'font-size:10px', 'font-weight:700',
          'padding:2px 6px', 'border-radius:4px', 'border:1.5px solid #d97706',
          'cursor:pointer', 'box-shadow:0 1px 3px rgba(0,0,0,0.4)', 'line-height:1.5',
          'white-space:nowrap', 'transform:translateY(-50%)', 'pointer-events:auto',
        ].join(';');
        btn.textContent = label;
        btn.title = `Examiner Report — ${label}`;
        btn.addEventListener('click', () => onERClickRef.current(key));
        wrapper.appendChild(btn);
      });
    };

    const ro = new ResizeObserver(() => { if (coordinatesRef.current.length > 0) injectButtons(); });
    ro.observe(canvasWrapperRef.current);
    return () => ro.disconnect();
  }, []);

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
