'use client';

import React from 'react';

export default function HeroSection() {
  return (
    <section className="relative w-full h-screen flex items-center justify-center overflow-hidden">
      {/* Completely dark background */}
      <div
        className="absolute inset-0"
        style={{ background: '#0D0D0C' }}
      />

      {/* Brighter ambient glow — wider spread, higher opacity */}
      <div
        className="absolute inset-0"
        style={{
          background: 'radial-gradient(ellipse at center, rgba(212, 175, 55, 0.06) 0%, rgba(212, 175, 55, 0.12) 45%, rgba(212, 175, 55, 0.18) 100%)',
          pointerEvents: 'none',
        }}
      />

      {/* Brighter gold dust particles */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        {Array.from({ length: 40 }).map((_, i) => (
          <div
            key={i}
            style={{
              position: 'absolute',
              width: `${Math.random() * 4 + 2}px`,
              height: `${Math.random() * 4 + 2}px`,
              borderRadius: '50%',
              background: 'radial-gradient(circle, rgba(255, 220, 80, 0.85) 0%, rgba(212, 175, 55, 0.45) 50%, transparent 100%)',
              boxShadow: '0 0 8px rgba(255, 220, 80, 0.6), 0 0 18px rgba(212, 175, 55, 0.3)',
              left: `${Math.random() * 100}%`,
              top: `${Math.random() * 100}%`,
              animation: `float-${i % 3} ${20 + Math.random() * 15}s ease-in-out infinite`,
              animationDelay: `${Math.random() * 10}s`,
              opacity: 0.7,
            }}
          />
        ))}
      </div>

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
              textShadow: '0 0 20px rgba(212, 175, 55, 0.25), 0 0 40px rgba(212, 175, 55, 0.12)',
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
                width="18"
                height="18"
                viewBox="0 0 24 24"
                fill="none"
                stroke="#D4AF37"
                strokeWidth="1.5"
                strokeLinecap="round"
                strokeLinejoin="round"
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
          50% { transform: translateY(8px); opacity: 0.25; }
        }
        @keyframes float-0 {
          0%, 100% { transform: translate(0, 0); opacity: 0.6; }
          50% { transform: translate(20px, -60px); opacity: 1; }
        }
        @keyframes float-1 {
          0%, 100% { transform: translate(0, 0); opacity: 0.65; }
          50% { transform: translate(-25px, -50px); opacity: 0.95; }
        }
        @keyframes float-2 {
          0%, 100% { transform: translate(0, 0); opacity: 0.7; }
          50% { transform: translate(15px, -70px); opacity: 0.9; }
        }
      `}</style>
    </section>
  );
}

// Made with Bob
