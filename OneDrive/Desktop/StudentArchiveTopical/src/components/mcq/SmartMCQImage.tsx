'use client';

import React, { useState, useCallback } from 'react';

interface SmartMCQImageProps {
  src: string;
  alt: string;
  className?: string;
  /** Brightness threshold 0-255: rows where every sampled pixel is above this are "white" (default 245) */
  whiteThreshold?: number;
  /** Extra px of bottom padding to keep below the last content row (default 20) */
  bottomPad?: number;
  /** Px to clip from the very top of the image to hide bleed from the previous question's crop (default 8) */
  topClip?: number;
}

/**
 * SmartMCQImage
 * -------------
 * Renders a question image with two automatic visual fixes:
 *   1. Bottom whitespace trimming — scans from the bottom to find the last
 *      row with actual content, then clips everything below it.
 *   2. Top bleed hiding — shifts the image up by `topClip` px and clips,
 *      so any sliver of the previous question's crop doesn't show.
 *
 * Implementation: loads the image onto a hidden canvas, reads pixel data to
 * find the last non-white row, then renders the img inside an overflow:hidden
 * div sized to only the content slice.
 */
export function SmartMCQImage({
  src,
  alt,
  className = '',
  whiteThreshold = 245,
  bottomPad = 20,
  topClip = 8,
}: SmartMCQImageProps) {
  // Stores the computed visible slice in natural image pixels
  const [slice, setSlice] = useState<{ top: number; height: number } | null>(null);
  // Natural dimensions of the loaded image
  const [naturalSize, setNaturalSize] = useState<{ w: number; h: number } | null>(null);

  const handleLoad = useCallback(
    (e: React.SyntheticEvent<HTMLImageElement>) => {
      const img = e.currentTarget;
      const w = img.naturalWidth;
      const h = img.naturalHeight;
      setNaturalSize({ w, h });

      try {
        const canvas = document.createElement('canvas');
        canvas.width = w;
        canvas.height = h;
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          setSlice({ top: topClip, height: h - topClip });
          return;
        }

        ctx.drawImage(img, 0, 0);
        const data = ctx.getImageData(0, 0, w, h).data; // flat RGBA

        // Check if a row is visually white (sample ~8 columns)
        const isWhiteRow = (y: number): boolean => {
          const numSamples = 8;
          const step = Math.max(1, Math.floor(w / numSamples));
          for (let x = step; x < w - step; x += step) {
            const i = (y * w + x) * 4;
            const a = data[i + 3];
            if (a < 20) continue; // transparent = treat as white
            if (data[i] < whiteThreshold || data[i + 1] < whiteThreshold || data[i + 2] < whiteThreshold) {
              return false;
            }
          }
          return true;
        };

        // Walk up from the bottom to find the last row with content
        let lastContentRow = h - 1;
        for (let y = h - 1; y >= 0; y--) {
          if (!isWhiteRow(y)) {
            lastContentRow = y;
            break;
          }
        }

        const visibleBottom = Math.min(h, lastContentRow + 1 + bottomPad);
        const visibleTop = Math.min(topClip, visibleBottom - 40); // always show at least 40px
        setSlice({ top: visibleTop, height: visibleBottom - visibleTop });
      } catch {
        // Canvas tainted or unavailable — fall back to full image with top clip only
        setSlice({ top: topClip, height: h - topClip });
      }
    },
    [whiteThreshold, bottomPad, topClip],
  );

  // Before load completes: show nothing (avoids flicker of full oversized image)
  // After load: wrapper is sized to the visible slice; img is shifted up by `slice.top`
  return (
    <div
      style={
        slice && naturalSize
          ? {
              // Height of the wrapper = the visible content slice, scaled to rendered width
              // We express it as a percentage-based padding trick so it's responsive
              position: 'relative',
              width: '100%',
              // paddingBottom = (visibleHeight / naturalWidth) * 100%
              paddingBottom: `${(slice.height / naturalSize.w) * 100}%`,
              overflow: 'hidden',
            }
          : { position: 'relative', width: '100%' }
      }
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={src}
        alt={alt}
        className={className}
        onLoad={handleLoad}
        style={
          slice && naturalSize
            ? {
                position: 'absolute',
                top: `-${(slice.top / naturalSize.w) * 100}%`,
                left: 0,
                width: '100%',
                height: 'auto',
                display: 'block',
              }
            : {
                width: '100%',
                height: 'auto',
                display: 'block',
                visibility: 'hidden', // hide until slice is computed
              }
        }
        draggable={false}
        crossOrigin="anonymous"
      />
    </div>
  );
}
