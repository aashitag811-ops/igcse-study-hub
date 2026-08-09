'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';

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
  const [pageHeights, setPageHeights] = useState<number[]>([]);
  const [pageWidths, setPageWidths] = useState<number[]>([]);
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasWrapperRef = useRef<HTMLDivElement>(null);
  const pdfDocRef = useRef<any>(null);
  const renderTasksRef = useRef<any[]>([]);
  const [pdfjsLib, setPdfjsLib] = useState<any>(null);

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

  // Load and render PDF
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
        const heights: number[] = [];
        const widths: number[] = [];

        // Render all pages sequentially
        for (let pageNum = 1; pageNum <= pdf.numPages; pageNum++) {
          const page = await pdf.getPage(pageNum);
          const viewport = page.getViewport({ scale });

          heights.push(viewport.height);
          widths.push(viewport.width);

          // Wrap each page in a relative-positioned div so buttons can be
          // absolutely positioned inside it without needing cumulative math
          const pageWrapper = document.createElement('div');
          pageWrapper.style.position = 'relative';
          pageWrapper.style.marginBottom = '20px';
          pageWrapper.style.lineHeight = '0'; // prevent extra space under canvas

          const canvas = document.createElement('canvas');
          canvas.height = viewport.height;
          canvas.width = viewport.width;
          // Make canvas fill its wrapper width; height scales proportionally via CSS
          canvas.style.width = '100%';
          canvas.style.display = 'block';

          pageWrapper.appendChild(canvas);

          if (canvasWrapperRef.current) {
            canvasWrapperRef.current.appendChild(pageWrapper);
          }

          const context = canvas.getContext('2d');
          if (!context) continue;

          const renderTask = page.render({ canvasContext: context, viewport });
          renderTasksRef.current.push(renderTask);
          await renderTask.promise;
        }

        setPageHeights(heights);
        setPageWidths(widths);
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
  }, [pdfUrl, pdfjsLib]);

  // After PDF renders and coords are loaded, inject ER buttons into each page wrapper
  useEffect(() => {
    if (isLoading || error || coordinates.length === 0 || pageHeights.length === 0) return;
    if (!canvasWrapperRef.current) return;

    const pageWrappers = canvasWrapperRef.current.querySelectorAll<HTMLDivElement>('div[data-page]');
    // Remove old buttons
    canvasWrapperRef.current.querySelectorAll('.er-btn').forEach(b => b.remove());

    const pageWrapperList = canvasWrapperRef.current.querySelectorAll<HTMLDivElement>(':scope > div');

    coordinates.forEach(coord => {
      if (!erNotes[coord.qNum.toString()]) return;

      const pageWrapper = pageWrapperList[coord.page - 1];
      if (!pageWrapper) return;

      const canvas = pageWrapper.querySelector('canvas');
      if (!canvas) return;

      // The canvas has natural pixel height = pageHeights[coord.page-1]
      // CSS width = 100% of wrapper, so CSS scale = wrapper.clientWidth / canvas.width
      const cssScale = pageWrapper.clientWidth / (pageWidths[coord.page - 1] || canvas.width);
      const topCss = coord.topPx * 1.5 * cssScale; // scale=1.5 was used for viewport

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
        pointer-events: auto;
      `;
      btn.textContent = `Q${coord.qNum}`;
      btn.title = `View Examiner Report for Question ${coord.qNum}`;
      btn.addEventListener('click', () => onERClick(coord.qNum));
      pageWrapper.appendChild(btn);
    });
  }, [isLoading, error, coordinates, pageHeights, pageWidths, erNotes, onERClick]);

  return (
    <div 
      ref={containerRef}
      className="relative w-full h-full bg-slate-100 dark:bg-slate-900 overflow-y-auto"
    >
      {/* Loading State */}
      {isLoading && (
        <div className="absolute inset-0 flex items-center justify-center bg-slate-100 dark:bg-slate-800 z-50">
          <div className="text-center">
            <div className="w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
            <p className="text-slate-600 dark:text-slate-400 font-medium">Loading PDF...</p>
          </div>
        </div>
      )}

      {/* Error State */}
      {error && (
        <div className="absolute inset-0 flex items-center justify-center bg-slate-100 dark:bg-slate-800">
          <div className="text-center">
            <p className="text-red-500 font-medium">{error}</p>
            <p className="text-sm text-slate-500 mt-2">Try refreshing the page</p>
          </div>
        </div>
      )}

      {/* PDF pages — each page is a relative div containing canvas + ER buttons */}
      <div
        ref={canvasWrapperRef}
        className="mx-auto max-w-[850px] py-4"
      />
    </div>
  );
}

// Made with Bob
