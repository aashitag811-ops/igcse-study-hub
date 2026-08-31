'use client';

import React, { useEffect } from 'react';

interface ResourceOverlayProps {
  title: string;
  src: string;
  type: 'image' | 'pdf' | 'html';
  onClose: () => void;
}

export function ResourceOverlay({ title, src, type, onClose }: ResourceOverlayProps) {
  // Close on Escape
  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [onClose]);

  return (
    <div
      onClick={onClose}
      style={{
        position: 'fixed', inset: 0, zIndex: 200,
        background: 'rgba(0,0,0,0.82)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        padding: '24px',
        backdropFilter: 'blur(4px)',
      }}
    >
      {/* Panel — stop click from closing when clicking inside */}
      <div
        onClick={e => e.stopPropagation()}
        style={{
          background: 'linear-gradient(180deg, #0d1018 0%, #0a0c14 100%)',
          border: '1px solid rgba(200,168,76,0.22)',
          borderRadius: '16px',
          boxShadow: '0 32px 80px rgba(0,0,0,0.7), inset 0 1px 0 rgba(200,168,76,0.10)',
          display: 'flex',
          flexDirection: 'column',
          maxWidth: '1100px',
          width: '100%',
          maxHeight: '90vh',
          overflow: 'hidden',
        }}
      >
        {/* Header */}
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '14px 20px',
          borderBottom: '1px solid rgba(200,168,76,0.12)',
          flexShrink: 0,
        }}>
          <span style={{
            fontFamily: "'Cormorant Garamond','Cormorant',Georgia,serif",
            fontSize: '17px', fontWeight: 600,
            color: '#e8dcc4', letterSpacing: '0.02em',
          }}>
            {title}
          </span>
          <button
            onClick={onClose}
            title="Close (Esc)"
            style={{
              background: 'transparent', border: 'none', cursor: 'pointer',
              color: 'rgba(160,180,220,0.5)', padding: '4px',
              borderRadius: '6px', display: 'flex', alignItems: 'center', justifyContent: 'center',
              transition: 'color 0.15s',
            }}
            onMouseEnter={e => (e.currentTarget.style.color = '#e8dcc4')}
            onMouseLeave={e => (e.currentTarget.style.color = 'rgba(160,180,220,0.5)')}
          >
            <svg width="18" height="18" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Content */}
        <div style={{ flex: 1, overflow: 'auto', padding: '16px', display: 'flex', alignItems: 'flex-start', justifyContent: 'center' }}>
          {type === 'image' ? (
            <img
              src={src}
              alt={title}
              style={{
                maxWidth: '100%',
                borderRadius: '8px',
                background: '#ffffff',
                padding: '16px',
                boxShadow: '0 4px 24px rgba(0,0,0,0.5)',
              }}
            />
          ) : (
            <iframe
              src={src}
              title={title}
              style={{
                width: '100%',
                height: '72vh',
                border: 'none',
                borderRadius: '8px',
                background: '#fff',
              }}
            />
          )}
        </div>
      </div>
    </div>
  );
}

// Made with Bob
