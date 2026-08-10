'use client';

import React, { useState, useEffect, useRef } from 'react';

interface QuestionCoordinate {
  qNum: number;
  topPx: number;
  page: number;
}

interface PDFViewerWithEROverlayProps {
  pdfUrl: string;
  paperId: string;
  erNotes: Record<string, string>;
  onERClick: (questionNumber: number) => void;
}

export function PDFViewerWithEROverlay({ 
  pdfUrl, 
  paperId,
  erNotes, 
  onERClick 
}: PDFViewerWithEROverlayProps) {
  const [coordinates, setCoordinates] = useState<QuestionCoordinate[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasWrapperRef = useRef<HTMLDivElement>(null);
  const pdfDocRef = useRef<any>(null);
  const renderTasksRef = useRef<any[]>([]);
  const [pdfjsLib, setPdfjsLib] = useState<any>(null);

  // Keep a stable ref to onERClick so we don't re-render PDF on every parent render
  const onERClickRef = useRef(onERClick);
  useEffect(() => { onERClickRef.current = onERClick; }, [onERClick]);

  // Keep a stable ref to erNotes
  const erNotesRef = useRef(erNotes);
  useEffect(() => { erNotesRef.current = erNotes; }, [erNotes]);

  // Load PDF.js library dynamically
  useEffect(() => {
    const loadPdfJs = async () => {
      try {
        const pdfjs = await import('pdfjs-dist');
        pdfjs.GlobalWorkerOptions.workerSrc = `//unpkg.com/pdfjs-dist@4.0.379/build/pdf.worker.min.mjs`;
        setPdfjsLib(pdfjs);
      } catch (err) {
        console.error('Failed to load PDF.js:', err);
        setError('Failed to load PDF library');
      }
    };
    loadPdfJs();
  }, []);

  // Fetch question coordinates
  useEffect(() => {
    const fetchCoordinates = async () => {
      try {
        const response = await fetch(`/api/question-coords/${paperId}`);
        if (response.ok) {
          const data = await response.json();
          setCoordinates(data.coordinates || []);
        }
      } catch (err) {
        console.error('Failed to fetch coordinates:', err);
      }
    };
    fetchCoordinates();
  }, [paperId]);

  // Load and render PDF — inject ER buttons directly into each page wrapper
  useEffect(() => {
    if (!pdfjsLib) return;

    const loadPDF = async () => {
      try {
        setIsLoading(true);
        setError(null);

        // Cancel any ongoing render tasks
        renderTasksRef.current.forEach(task => task?.cancel?.());
        renderTasksRef.current = [];

        // Destroy previous doc
        if (pdfDocRef.current) {
          pdfDocRef.current.destroy();
          pdfDocRef.current = null;
        }

        // Clear previous canvases
        if (canvasWrapperRef.current) {
          canvasWrapperRef.current.innerHTML = '';
        }

        // Load PDF document
        const loadingTask = pdfjsLib.getDocument(pdfUrl);
        const pdf = await loadingTask.promise;
        pdfDocRef.current = pdf;

        const scale = 1.5;

        // Render all pages sequentially
        for (let pageNum = 1; pageNum <= pdf.numPages; pageNum++) {
          const page = await pdf.getPage(pageNum);
          const viewport = page.getViewport({ scale });

          // Each page gets its own relative wrapper so buttons can be absolutely positioned inside it
          const pageWrapper = document.createElement('div');
          pageWrapper.style.cssText = 'position: relative; margin-bottom: 20px; line-height: 0;';

          // Canvas fills wrapper width — CSS scaling
          const canvas = document.createElement('canvas');
          canvas.height = viewport.height;
          canvas.width = viewport.width;
          canvas.style.cssText = 'width: 100%; display: block;';
          pageWrapper.appendChild(canvas);

          if (canvasWrapperRef.current) {
            canvasWrapperRef.current.appendChild(pageWrapper);
          }

          const context = canvas.getContext('2d');
          if (context) {
            const renderTask = page.render({ canvasContext: context, viewport });
            renderTasksRef.current.push(renderTask);
            await renderTask.promise;
          }

          // Inject ER buttons for questions on this page
          // Wait until canvas is in DOM so clientWidth is available
          const cssWidth = pageWrapper.clientWidth || viewport.width / scale;
          const cssHeight = cssWidth * (viewport.height / viewport.width);

          coordinates.forEach(coord => {
            if (coord.page !== pageNum) return;
            if (!erNotesRef.current[coord.qNum.toString()]) return;

            // coord.topPx is at scale=1.0 (raw PDF units)
            // We rendered at scale=1.5, then CSS-scaled to cssWidth
            // So button top = coord.topPx * (cssHeight / (viewport.height / scale))
            //               = coord.topPx * cssWidth / viewport.width * scale
            const scaleRatio = cssWidth / (viewport.width / scale);
            const topCss = coord.topPx * scaleRatio;

            const btn = document.createElement('button');
            btn.className = 'er-btn';
            btn.style.cssText = `
              position: absolute;
              top: ${topCss}px;
              left: 8px;
              z-index: 50;
              background: #f59e0b;
              color: #000;
              font-size: 10px;
              font-weight: 800;
              padding: 2px 6px;
              border-radius: 5px;
              border: none;
              cursor: pointer;
              box-shadow: 0 1px 4px rgba(0,0,0,0.3);
              line-height: 1.4;
            `;
            btn.textContent = `Q${coord.qNum}`;
            btn.title = `View Examiner Report for Question ${coord.qNum}`;
            btn.addEventListener('click', () => onERClickRef.current(coord.qNum));
            pageWrapper.appendChild(btn);
          });
        }

        setIsLoading(false);
      } catch (err: any) {
        if (err?.name === 'RenderingCancelledException') return;
        console.error('Error loading PDF:', err);
        setError(err.message || 'Failed to load PDF');
        setIsLoading(false);
      }
    };

    if (pdfUrl) loadPDF();

    return () => {
      renderTasksRef.current.forEach(task => task?.cancel?.());
      if (pdfDocRef.current) {
        pdfDocRef.current.destroy();
        pdfDocRef.current = null;
      }
    };
    // coordinates is intentionally included — re-render PDF when coords arrive
  }, [pdfUrl, pdfjsLib, coordinates]);

  return (
    <div 
      ref={containerRef}
      className="relative w-full h-full bg-slate-100 dark:bg-slate-900 overflow-y-auto"
    >
      {isLoading && (
        <div className="absolute inset-0 flex items-center justify-center bg-slate-100 dark:bg-slate-800 z-50">
          <div className="text-center">
            <div className="w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
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

      {/* PDF pages — each page wrapper contains its canvas + ER buttons */}
      <div ref={canvasWrapperRef} className="mx-auto max-w-[850px] py-4" />
    </div>
  );
}

// Made with Bob
