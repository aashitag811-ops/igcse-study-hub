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
  const canvasContainerRef = useRef<HTMLDivElement>(null);
  const [pageHeights, setPageHeights] = useState<number[]>([]);
  const [numPages, setNumPages] = useState(0);
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
      } catch (error) {
        console.error('Failed to fetch coordinates:', error);
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
        renderTasksRef.current.forEach(task => {
          if (task && task.cancel) {
            task.cancel();
          }
        });
        renderTasksRef.current = [];

        // Load PDF document
        const loadingTask = pdfjsLib.getDocument(pdfUrl);
        const pdf = await loadingTask.promise;
        pdfDocRef.current = pdf;
        setNumPages(pdf.numPages);

        // Clear previous canvases
        if (canvasContainerRef.current) {
          canvasContainerRef.current.innerHTML = '';
        }

        const heights: number[] = [];
        const scale = 1.5;

        // Render all pages
        for (let pageNum = 1; pageNum <= pdf.numPages; pageNum++) {
          const page = await pdf.getPage(pageNum);
          const viewport = page.getViewport({ scale });
          
          heights.push(viewport.height);

          // Create canvas element
          const canvas = document.createElement('canvas');
          canvas.className = 'w-full shadow-lg mb-5';
          canvas.height = viewport.height;
          canvas.width = viewport.width;

          // Add to container
          if (canvasContainerRef.current) {
            canvasContainerRef.current.appendChild(canvas);
          }

          const context = canvas.getContext('2d');
          if (!context) continue;

          // Render page
          const renderContext = {
            canvasContext: context,
            viewport: viewport,
          };

          const renderTask = page.render(renderContext);
          renderTasksRef.current.push(renderTask);
          await renderTask.promise;
        }

        setPageHeights(heights);
        setIsLoading(false);
      } catch (err: any) {
        console.error('Error loading PDF:', err);
        setError(err.message || 'Failed to load PDF');
        setIsLoading(false);
      }
    };

    if (pdfUrl) {
      loadPDF();
    }

    return () => {
      // Cleanup
      renderTasksRef.current.forEach(task => {
        if (task && task.cancel) {
          task.cancel();
        }
      });
      if (pdfDocRef.current) {
        pdfDocRef.current.destroy();
      }
    };
  }, [pdfUrl, pdfjsLib]);

  // Calculate absolute Y position for a coordinate
  const calculateAbsoluteY = (coord: QuestionCoordinate): number => {
    let cumulativeHeight = 0;
    
    // Add heights of all previous pages
    for (let i = 0; i < coord.page - 1; i++) {
      cumulativeHeight += pageHeights[i] || 0;
      cumulativeHeight += 20; // Gap between pages (mb-5 = 20px)
    }
    
    // Add the Y position on the current page (scaled)
    cumulativeHeight += coord.topPx * 1.5; // Scale factor matches viewport scale
    
    return cumulativeHeight;
  };

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

      {/* PDF Canvas Container - This is the scrollable content */}
      <div className="relative mx-auto max-w-[850px] py-4">
        {/* Canvas container where pages will be rendered */}
        <div ref={canvasContainerRef} className="relative" />

        {/* ER Button Overlays - Positioned absolutely within scrollable content */}
        {!isLoading && !error && coordinates.length > 0 && pageHeights.length > 0 && (
          <div className="absolute top-0 left-0 w-full pointer-events-none" style={{ paddingTop: '16px' }}>
            {coordinates.map((coord) => {
              // Only show button if ER notes exist for this question
              if (!erNotes[coord.qNum.toString()]) return null;

              const absoluteY = calculateAbsoluteY(coord);

              return (
                <button
                  key={coord.qNum}
                  onClick={() => onERClick(coord.qNum)}
                  style={{
                    position: 'absolute',
                    top: `${absoluteY}px`,
                    left: '15px',
                    pointerEvents: 'auto',
                  }}
                  className="z-50 bg-amber-500 hover:bg-amber-400 active:scale-95 text-zinc-950 text-[10px] font-extrabold px-1.5 py-0.5 rounded-md shadow-md transition-all flex items-center gap-0.5"
                  title={`View Examiner Report for Question ${coord.qNum}`}
                >
                  <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <span className="text-[9px]">Q{coord.qNum}</span>
                </button>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

// Made with Bob