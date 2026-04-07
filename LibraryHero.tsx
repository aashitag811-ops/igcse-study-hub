'use client';

import React, { useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import ShelfHotspot from './ShelfHotspot';
import { leftShelves, rightShelves } from '@/lib/subjects';

export default function LibraryHero() {
  const router = useRouter();
  const [hoveredShelf, setHoveredShelf] = useState<string | null>(null);

  const handleShelfClick = useCallback((subjectId: string) => {
    router.push(`/subject/${subjectId}`);
  }, [router]);

  return (
    <section
      className="relative w-full"
      aria-label="Library bookshelf interface">

      {/* Title — top center */}
      <div className="relative z-20 flex flex-col items-center pt-5 pb-3 pointer-events-none">
        <h1
          className="font-serif text-center engraved fade-up"
          style={{
            fontSize: 'clamp(1.2rem, 3.5vw, 2.6rem)',
            color: '#E8B84B',
            letterSpacing: '0.06em',
            textShadow: '0 2px 12px rgba(0,0,0,0.8), 0 0 40px rgba(196,146,42,0.3)',
            lineHeight: 1.2
          }}>
          The Scholar&apos;s Athenaeum
        </h1>
        <p
          className="fade-up fade-up-delay-1 font-sans text-center"
          style={{
            fontSize: 'clamp(0.6rem, 1.2vw, 0.8rem)',
            color: 'rgba(200, 184, 154, 0.85)',
            letterSpacing: '0.18em',
            textTransform: 'uppercase',
            marginTop: '4px'
          }}>
          Hover over any shelf to explore&nbsp;&bull;&nbsp;Click to enter&nbsp;&bull;&nbsp;Scroll for more
        </p>
      </div>

      {/* Image container — full image, no crop */}
      <div className="relative w-full" style={{ lineHeight: 0 }}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src="https://customer-assets.emergentagent.com/job_web-landing-24/artifacts/90t2qkkt_image%20%286%29.png"
          alt="Grand antique library interior with symmetrical dark wooden bookshelves flanking a central ornate carved wooden door, warm candlelight atmosphere, aged leather-bound volumes"
          style={{
            width: '100%',
            height: 'auto',
            display: 'block',
          }}
        />

        {/* Subtle vignette overlay */}
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            background: 'radial-gradient(ellipse at center, transparent 40%, rgba(15,10,4,0.45) 100%)'
          }} />

        {/* Left Shelf Hotspots */}
        {leftShelves.map((shelf) =>
          <ShelfHotspot
            key={shelf.id}
            shelf={shelf}
            isHovered={hoveredShelf === shelf.id}
            onHover={setHoveredShelf}
            onClick={handleShelfClick} />
        )}

        {/* Right Shelf Hotspots */}
        {rightShelves.map((shelf) =>
          <ShelfHotspot
            key={shelf.id}
            shelf={shelf}
            isHovered={hoveredShelf === shelf.id}
            onHover={setHoveredShelf}
            onClick={handleShelfClick} />
        )}
      </div>

      {/* Scroll indicator */}
      <div
        className="w-full z-20 flex flex-col items-center gap-1 py-3 pointer-events-none fade-up fade-up-delay-3"
        style={{ background: 'rgba(15,10,4,0.8)' }}>
        <span
          className="font-sans"
          style={{
            fontSize: '0.6rem',
            letterSpacing: '0.2em',
            textTransform: 'uppercase',
            color: 'rgba(196,146,42,0.7)'
          }}>
          Additional Resources
        </span>
        <svg width="16" height="16" viewBox="0 0 16 16" fill="none" className="candle-flicker">
          <path d="M8 3L8 13M8 13L4 9M8 13L12 9" stroke="rgba(196,146,42,0.7)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </div>
    </section>
  );
}