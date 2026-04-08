'use client';

import React from 'react';
import type { ShelfData } from '@/lib/subjects';

interface ShelfHotspotProps {
  shelf: ShelfData;
  isHovered: boolean;
  onHover: (id: string | null) => void;
  onClick: (id: string) => void;
}

export default function ShelfHotspot({ shelf, isHovered, onHover, onClick }: ShelfHotspotProps) {
  return (
    <div
      className="shelf-hotspot"
      role="button"
      tabIndex={0}
      aria-label={`${shelf.name} — Code ${shelf.code}`}
      style={{
        position: 'absolute',
        top: shelf.top,
        left: shelf.left,
        width: shelf.width,
        height: shelf.height,
        cursor: 'pointer',
        zIndex: 10,
        transition: 'all 0.25s ease',
        boxShadow: isHovered
          ? 'inset 0 0 0 2px rgba(232,184,75,0.85), 0 0 22px rgba(232,184,75,0.4)'
          : 'inset 0 0 0 1px rgba(232,184,75,0.15)',
        background: isHovered
          ? 'rgba(232,184,75,0.15)'
          : 'transparent',
        borderRadius: '2px',
      }}
      onMouseEnter={() => onHover(shelf.id)}
      onMouseLeave={() => onHover(null)}
      onClick={() => onClick(shelf.id)}
      onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') onClick(shelf.id); }}
    >
      {/* Subject code — always visible at bottom of shelf */}
      <div
        style={{
          position: 'absolute',
          bottom: 0,
          left: 0,
          right: 0,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'flex-end',
          padding: '3px 4px',
          pointerEvents: 'none',
          background: 'linear-gradient(to top, rgba(10,6,2,0.72) 0%, transparent 100%)',
          borderRadius: '0 0 2px 2px',
          transition: 'background 0.2s ease',
        }}
      >
        {/* Subject name — only on hover */}
        <span
          className="font-serif"
          style={{
            fontSize: 'clamp(0.5rem, 1vw, 0.78rem)',
            color: '#E8B84B',
            letterSpacing: '0.04em',
            textShadow: '0 1px 6px rgba(0,0,0,0.95)',
            textAlign: 'center',
            lineHeight: 1.2,
            padding: '0 4px',
            opacity: isHovered ? 1 : 0,
            transition: 'opacity 0.2s ease',
            display: 'block',
            marginBottom: '2px',
          }}
        >
          {shelf.name}
        </span>
        {/* Subject code — always visible */}
        <span
          className="font-sans"
          style={{
            fontSize: 'clamp(0.5rem, 0.9vw, 0.7rem)',
            color: isHovered ? 'rgba(255,220,120,0.95)' : 'rgba(232,184,75,0.75)',
            letterSpacing: '0.18em',
            textShadow: '0 1px 5px rgba(0,0,0,0.95)',
            fontWeight: 600,
            transition: 'color 0.2s ease',
          }}
        >
          {shelf.code}
        </span>
      </div>
    </div>
  );
}