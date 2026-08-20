'use client';

import React, { useEffect, useState } from 'react';

// Deterministic dust — exact same formula as browse page
const DUST = Array.from({ length: 48 }, (_, i) => ({
  id: i,
  size: 1.8 + (i * 5.7 % 3.2),
  left: (i * 18.3 + 6) % 100,
  top: (i * 24.7 + 9) % 100,
  dur: 14 + (i * 3.3 % 12),
  delay: (i * 2.9) % 10,
  anim: i % 3,
}));

export default function HeroSection() {
  const [glowPos, setGlowPos] = useState({ x: 0, y: 0 });
  const [glowVisible, setGlowVisible] = useState(false);

  useEffect(() => {
    const move = (e: MouseEvent) => { setGlowPos({ x: e.clientX, y: e.clientY }); setGlowVisible(true); };
    const leave = () => setGlowVisible(false);
    window.addEventListener('mousemove', move);
    window.addEventListener('mouseleave', leave);
    return () => { window.removeEventListener('mousemove', move); window.removeEventListener('mouseleave', leave); };
  }, []);

  return (
    <section className="relative w-full h-screen flex items-center justify-center overflow-hidden"
      style={{ background: '#0c1018' }}>

      {/* Dust particles — deterministic, matches browse page */}
      <div className="absolute inset-0 pointer-events-none" style={{ zIndex: 0 }}>
        {DUST.map(p => (
          <div key={p.id} style={{
            position: 'absolute',
            width: `${p.size}px`, height: `${p.size}px`,
            borderRadius: '50%',
            left: `${p.left}%`, top: `${p.top}%`,
            background: 'radial-gradient(circle, rgba(255,218,80,1) 0%, rgba(212,175,55,0.65) 50%, transparent 100%)',
            boxShadow: '0 0 8px rgba(255,210,60,0.95), 0 0 18px rgba(200,160,40,0.55)',
            animation: `dust${p.anim} ${p.dur}s ease-in-out infinite`,
            animationDelay: `${p.delay}s`,
            opacity: 0,
          }} />
        ))}
      </div>

      {/* Cursor-following glow — matches browse page exactly */}
      <div className="pointer-events-none" style={{
        position: 'absolute', inset: 0, zIndex: 1,
        opacity: glowVisible ? 1 : 0,
        transition: 'opacity 0.4s ease',
        background: `radial-gradient(circle 360px at ${glowPos.x}px ${glowPos.y}px, rgba(200,168,76,0.07) 0%, rgba(180,140,30,0.03) 50%, transparent 100%)`,
      }} />

      {/* Subtle ambient centre glow */}
      <div className="absolute inset-0 pointer-events-none" style={{
        zIndex: 1,
        background: 'radial-gradient(ellipse 60% 50% at 50% 50%, rgba(200,168,76,0.05) 0%, transparent 70%)',
      }} />

      {/* Main content */}
      <div className="relative z-10 w-full max-w-6xl mx-auto px-8">
        <div className="flex flex-col items-center">
          <h1
            className="font-display text-center mb-8"
            style={{
              fontSize: 'clamp(2.5rem, 5.5vw, 5rem)',
              lineHeight: 1.15,
              letterSpacing: '0.01em',
              fontWeight: 300,
              color: '#E8DCC4',
            }}
          >
            <div style={{ transform: 'translateX(-20px)' }}>
              Master Your Syllabus.
            </div>
            <div style={{ transform: 'translateX(20px)' }}>
              Archive Your Mistakes.
            </div>
          </h1>

          <p
            className="font-sans text-center max-w-2xl mb-12"
            style={{
              fontSize: 'clamp(13px, 1.2vw, 16px)',
              color: '#C9A84C',
              letterSpacing: '0.05em',
              fontWeight: 400,
              lineHeight: 1.6,
              textShadow: '0 0 20px rgba(212,175,55,0.25), 0 0 40px rgba(212,175,55,0.12)',
            }}
          >
            Master past papers, unlock community resources, and target your weakest topics instantly
          </p>

          <div className="flex flex-col items-center gap-3">
            <p
              className="font-sans uppercase"
              style={{
                fontSize: '10px',
                color: '#D4AF37',
                letterSpacing: '0.25em',
                fontWeight: 500,
                opacity: 0.7,
              }}
            >
              Scroll to explore
            </p>

            <div style={{ animation: 'bounce-arrow 2.5s ease-in-out infinite' }}>
              <svg
                width="18" height="18" viewBox="0 0 24 24"
                fill="none" stroke="#D4AF37"
                strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"
                style={{ opacity: 0.5 }}
              >
                <path d="M12 5v14M19 12l-7 7-7-7"/>
              </svg>
            </div>
          </div>
        </div>
      </div>

      <style jsx>{`
        @keyframes bounce-arrow {
          0%, 100% { transform: translateY(0); opacity: 0.5; }
          50%       { transform: translateY(8px); opacity: 0.25; }
        }
      `}</style>
    </section>
  );
}

// Made with Bob
