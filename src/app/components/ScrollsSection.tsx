'use client';

import React, { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';

// Curricula available — add more here when ready
const CURRICULA = [
  { label: 'IGCSE', href: '/igcse' },
  { label: 'A Levels', href: '/igcse', comingSoon: true },
];

const features = [
  {
    id: 1,
    number: '01',
    category: 'THE ARCHIVE LIBRARY',
    headline: 'Everything You Need.\nNothing You Don\'t.',
    description: 'Find carefully curated notes, revision guides, examiner reports, and trusted student resources organised by subject and topic—everything in one searchable archive.',
    cta: 'Explore the Archive',
    // base path used when a curriculum is chosen — appended with /browse
    ctaBasePath: '/browse',
  },
  {
    id: 2,
    number: '02',
    category: 'THE AUTOMATED EXAMINER',
    headline: 'Practice.\nSubmit.\nImprove.',
    description: 'Complete past papers with instant marking and structured feedback. Spend less time checking answers and more time understanding your mistakes.',
    cta: 'Start Practising',
    ctaBasePath: '/practice',
  },
  {
    id: 3,
    number: '03',
    category: 'THE VAULT OF MISSTEPS',
    headline: 'Every Mistake Becomes\nYour Next Strength.',
    description: 'Every incorrect answer is automatically archived, grouped by topic, and transformed into targeted revision so you always know exactly what to study next.',
    cta: 'Open Your Vault',
    ctaBasePath: '/practice',
  },
];

// ── Inline curriculum picker popover ────────────────────────────────────────

function CurriculumPopover({
  open,
  onClose,
  basePath,
}: {
  open: boolean;
  onClose: () => void;
  basePath: string;
}) {
  const router = useRouter();
  const ref = useRef<HTMLDivElement>(null);

  // Close on outside click
  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) onClose();
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div
      ref={ref}
      style={{
        position: 'absolute',
        bottom: 'calc(100% + 10px)',
        left: 0,
        background: '#1a1410',
        border: '1px solid rgba(185,154,82,0.45)',
        borderRadius: '10px',
        padding: '8px',
        minWidth: '180px',
        boxShadow: '0 16px 40px rgba(0,0,0,0.6), 0 0 0 1px rgba(185,154,82,0.12)',
        zIndex: 50,
        display: 'flex',
        flexDirection: 'column',
        gap: '2px',
      }}
    >
      <p style={{
        fontSize: '9px',
        letterSpacing: '0.25em',
        color: 'rgba(185,154,82,0.5)',
        fontFamily: 'system-ui, sans-serif',
        fontWeight: 600,
        textTransform: 'uppercase',
        padding: '4px 10px 6px',
      }}>
        Choose curriculum
      </p>
      {CURRICULA.map((c) => (
        <button
          key={c.label}
          disabled={c.comingSoon}
          onClick={() => {
            if (!c.comingSoon) {
              router.push(c.href + basePath);
              onClose();
            }
          }}
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '12px',
            padding: '10px 14px',
            borderRadius: '7px',
            background: 'transparent',
            border: 'none',
            cursor: c.comingSoon ? 'default' : 'pointer',
            fontFamily: 'Georgia, serif',
            fontSize: '15px',
            fontWeight: 400,
            color: c.comingSoon ? 'rgba(185,154,82,0.3)' : '#F5EDD6',
            textAlign: 'left',
            transition: 'background 0.15s ease, color 0.15s ease',
          }}
          onMouseEnter={(e) => {
            if (!c.comingSoon) {
              (e.currentTarget as HTMLButtonElement).style.background = 'rgba(185,154,82,0.10)';
              (e.currentTarget as HTMLButtonElement).style.color = '#E2C97A';
            }
          }}
          onMouseLeave={(e) => {
            (e.currentTarget as HTMLButtonElement).style.background = 'transparent';
            (e.currentTarget as HTMLButtonElement).style.color = c.comingSoon ? 'rgba(185,154,82,0.3)' : '#F5EDD6';
          }}
        >
          <span>{c.label}</span>
          {c.comingSoon
            ? <span style={{ fontSize: '9px', letterSpacing: '0.15em', color: 'rgba(185,154,82,0.4)', fontFamily: 'system-ui, sans-serif', fontWeight: 600 }}>SOON</span>
            : <span style={{ color: '#B99A52', fontSize: '13px' }}>→</span>
          }
        </button>
      ))}
    </div>
  );
}

// Deterministic particle data so it doesn't re-randomise on every render
const DUST = Array.from({ length: 55 }, (_, i) => ({
  id: i,
  size: 1.5 + (i * 7.3 % 3.5),
  left: (i * 17.7 + 3) % 100,
  top: (i * 23.1 + 7) % 100,
  dur: 18 + (i * 4.1 % 16),
  delay: (i * 3.7) % 12,
  anim: i % 3,
}));

const ORBS = Array.from({ length: 5 }, (_, i) => ({
  id: i,
  size: 280 + i * 60,
  left: [12, 72, 38, 85, 22][i],
  top: [18, 55, 82, 30, 68][i],
  dur: 22 + i * 5,
  delay: i * 4,
}));

export default function ScrollsSection() {
  const [visibleFeatures, setVisibleFeatures] = useState<Set<number>>(new Set());
  const [hoveredFeature, setHoveredFeature] = useState<number | null>(null);
  const [openPopover, setOpenPopover] = useState<number | null>(null);
  const featureRefs = useRef<(HTMLDivElement | null)[]>([]);

  useEffect(() => {
    const observers = featureRefs.current.map((ref, index) => {
      if (!ref) return null;
      const observer = new IntersectionObserver(
        (entries) => {
          entries.forEach((entry) => {
            if (entry.isIntersecting) {
              setVisibleFeatures((prev) => new Set([...prev, index]));
            } else {
              setVisibleFeatures((prev) => {
                const newSet = new Set(prev);
                newSet.delete(index);
                return newSet;
              });
            }
          });
        },
        { threshold: 0.2 }
      );
      observer.observe(ref);
      return observer;
    });
    return () => { observers.forEach((o) => o?.disconnect()); };
  }, []);

  return (
    <section
      className="relative w-full py-20 px-6"
      style={{ background: '#111111', overflow: 'hidden' }}
    >
      {/* ── Slow drifting gold orbs (very subtle ambient blobs) ── */}
      <div className="absolute inset-0 pointer-events-none" style={{ zIndex: 0 }}>
        {ORBS.map((orb) => (
          <div
            key={orb.id}
            style={{
              position: 'absolute',
              width: `${orb.size}px`,
              height: `${orb.size}px`,
              borderRadius: '50%',
              left: `${orb.left}%`,
              top: `${orb.top}%`,
              transform: 'translate(-50%, -50%)',
              background: 'radial-gradient(circle, rgba(185,154,82,0.09) 0%, rgba(185,154,82,0.04) 40%, transparent 70%)',
              animation: `orb-drift-${orb.id % 2} ${orb.dur}s ease-in-out infinite`,
              animationDelay: `${orb.delay}s`,
            }}
          />
        ))}
      </div>

      {/* ── Gold dust particles ── */}
      <div className="absolute inset-0 pointer-events-none" style={{ zIndex: 1 }}>
        {DUST.map((p) => (
          <div
            key={p.id}
            style={{
              position: 'absolute',
              width: `${p.size}px`,
              height: `${p.size}px`,
              borderRadius: '50%',
              left: `${p.left}%`,
              top: `${p.top}%`,
              background: 'radial-gradient(circle, rgba(255,218,68,1) 0%, rgba(212,175,55,0.5) 55%, transparent 100%)',
              boxShadow: '0 0 6px rgba(255,210,50,0.8), 0 0 14px rgba(185,154,82,0.4)',
              animation: `dust-${p.anim} ${p.dur}s ease-in-out infinite`,
              animationDelay: `${p.delay}s`,
              opacity: 0,
            }}
          />
        ))}
      </div>

      <div className="relative z-10 max-w-7xl mx-auto">
        {features.map((feature, index) => {
          const isVisible = visibleFeatures.has(index);
          const isHovered = hoveredFeature === index;
          // alternate: even = card left / label right, odd = card right / label left
          const cardOnLeft = index % 2 === 0;

          return (
            <div
              key={feature.id}
              ref={(el) => { featureRefs.current[index] = el; }}
              className="relative mb-40 last:mb-20"
              onMouseEnter={() => setHoveredFeature(index)}
              onMouseLeave={() => setHoveredFeature(null)}
              style={{
                minHeight: '80vh',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: '0',
                opacity: isVisible ? 1 : 0,
                transform: isVisible ? 'translateY(0)' : 'translateY(40px)',
                transition: 'opacity 0.7s ease-out, transform 0.7s ease-out',
                flexDirection: cardOnLeft ? 'row' : 'row-reverse',
              }}
            >
              {/* ── Card ── */}
              <div
                style={{
                  width: '52%',
                  maxWidth: '620px',
                  background: '#F5F0E6',
                  borderRadius: '2px',
                  padding: '56px 60px 64px',
                  overflow: 'hidden',
                  position: 'relative',
                  cursor: 'default',
                  // permanent tilt + extra pop on hover
                  transform: isHovered
                    ? `rotate(${cardOnLeft ? 3 : -3}deg) translateY(-12px) scale(1.02)`
                    : `rotate(${cardOnLeft ? 1.5 : -1.5}deg) translateY(0px) scale(1)`,
                  transition: 'transform 0.3s cubic-bezier(0.34,1.56,0.64,1), box-shadow 0.3s ease',
                  // gold ring appears on hover
                  boxShadow: isHovered
                    ? '0 24px 64px rgba(0,0,0,0.35), 0 0 0 2px rgba(185,154,82,0.9), 0 0 40px rgba(185,154,82,0.35)'
                    : '0 4px 24px rgba(0,0,0,0.18)',
                  willChange: 'transform',
                }}
              >
                {/* Paper grain */}
                <div
                  className="absolute inset-0 pointer-events-none"
                  style={{
                    backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 400 400' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' /%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)' /%3E%3C/svg%3E")`,
                    opacity: 0.015,
                  }}
                />

                {/* Inner light */}
                <div
                  className="absolute inset-0 pointer-events-none"
                  style={{
                    background: 'radial-gradient(ellipse at 40% 30%, rgba(255,255,255,0.35) 0%, transparent 65%)',
                  }}
                />

                {/* Vignette edges */}
                <div
                  className="absolute inset-0 pointer-events-none"
                  style={{
                    boxShadow: isHovered
                      ? 'inset 0 0 80px rgba(30,20,5,0.16), inset 0 0 180px rgba(30,20,5,0.08)'
                      : 'inset 0 0 60px rgba(0,0,0,0.07)',
                    transition: 'box-shadow 0.3s ease',
                  }}
                />

                {/* Corner marks */}
                <div className="absolute top-7 left-7 w-10 h-10 opacity-25" style={{ borderTop: '1px solid #B99A52', borderLeft: '1px solid #B99A52' }} />
                <div className="absolute top-7 right-7 w-10 h-10 opacity-25" style={{ borderTop: '1px solid #B99A52', borderRight: '1px solid #B99A52' }} />
                <div className="absolute bottom-7 left-7 w-10 h-10 opacity-25" style={{ borderBottom: '1px solid #B99A52', borderLeft: '1px solid #B99A52' }} />
                <div className="absolute bottom-7 right-7 w-10 h-10 opacity-25" style={{ borderBottom: '1px solid #B99A52', borderRight: '1px solid #B99A52' }} />

                {/* Ghost chapter number */}
                <div
                  className="absolute top-10 right-10 select-none pointer-events-none"
                  style={{
                    fontSize: '160px',
                    fontWeight: 300,
                    color: '#2B2620',
                    opacity: 0.07,
                    lineHeight: 1,
                    fontFamily: 'Georgia, serif',
                  }}
                >
                  {feature.number}
                </div>

                {/* Content */}
                <div className="relative z-10">
                  <p
                    className="mb-6"
                    style={{
                      fontSize: '11px',
                      letterSpacing: '0.32em',
                      color: '#B99A52',
                      fontWeight: 600,
                      fontFamily: 'system-ui, -apple-system, sans-serif',
                      textTransform: 'uppercase',
                    }}
                  >
                    {feature.category}
                  </p>

                  <h3
                    className="mb-8 whitespace-pre-line"
                    style={{
                      fontSize: 'clamp(2rem, 3vw, 2.8rem)',
                      color: '#2B2620',
                      fontWeight: 400,
                      lineHeight: 1.2,
                      letterSpacing: '-0.02em',
                      fontFamily: 'Georgia, serif',
                    }}
                  >
                    {feature.headline}
                  </h3>

                  <p
                    className="mb-10"
                    style={{
                      fontSize: '15.5px',
                      color: '#2B2620',
                      lineHeight: 1.75,
                      fontFamily: 'Georgia, serif',
                      opacity: 0.82,
                    }}
                  >
                    {feature.description}
                  </p>

                  {/* CTA button — opens curriculum popover */}
                  <div style={{ position: 'relative', display: 'inline-block' }}>
                    <button
                      className="group relative inline-flex items-center gap-2 bg-transparent border-0 cursor-pointer p-0"
                      style={{
                        fontSize: '15px',
                        color: '#2B2620',
                        fontWeight: 500,
                        letterSpacing: '0.01em',
                        fontFamily: 'Georgia, serif',
                      }}
                      onClick={() => setOpenPopover(openPopover === index ? null : index)}
                    >
                      <span className="relative">
                        {feature.cta}
                        <span
                          className="absolute bottom-0 left-0 h-px transition-transform duration-300 origin-left"
                          style={{
                            width: '100%',
                            transform: openPopover === index ? 'scaleX(1)' : 'scaleX(0)',
                            backgroundColor: '#B99A52',
                          }}
                        />
                      </span>
                      <span
                        className="transition-transform duration-300 group-hover:translate-x-1"
                        style={{
                          color: '#B99A52',
                          display: 'inline-block',
                          transform: openPopover === index ? 'rotate(90deg)' : 'rotate(0deg)',
                          transition: 'transform 0.2s ease',
                        }}
                      >
                        →
                      </span>
                    </button>
                    <CurriculumPopover
                      open={openPopover === index}
                      onClose={() => setOpenPopover(null)}
                      basePath={feature.ctaBasePath}
                    />
                  </div>
                </div>
              </div>

              {/* ── Side panel: fills the empty space ── */}
              <div
                style={{
                  width: '42%',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: cardOnLeft ? 'flex-end' : 'flex-start',
                  justifyContent: 'center',
                  padding: cardOnLeft ? '0 48px 0 0' : '0 0 0 48px',
                  gap: '24px',
                  opacity: isVisible ? 1 : 0,
                  transition: 'opacity 0.9s ease-out 0.15s',
                }}
              >
                {/* Thin vertical gold line */}
                <div
                  style={{
                    width: '1px',
                    height: '120px',
                    background: 'linear-gradient(to bottom, transparent, rgba(185,154,82,0.5), transparent)',
                    alignSelf: cardOnLeft ? 'flex-end' : 'flex-start',
                  }}
                />

                {/* Large ghost category label */}
                <p
                  style={{
                    fontSize: 'clamp(2.8rem, 4.5vw, 5rem)',
                    fontWeight: 700,
                    fontFamily: 'Georgia, serif',
                    color: 'rgba(185,154,82,0.07)',
                    letterSpacing: '-0.02em',
                    lineHeight: 1.1,
                    textAlign: cardOnLeft ? 'right' : 'left',
                    userSelect: 'none',
                    // split category into two lines at the space for drama
                    whiteSpace: 'pre-wrap',
                  }}
                >
                  {feature.category.replace(' ', '\n')}
                </p>

                {/* Feature number */}
                <p
                  style={{
                    fontSize: '11px',
                    letterSpacing: '0.3em',
                    color: 'rgba(185,154,82,0.35)',
                    fontFamily: 'system-ui, sans-serif',
                    fontWeight: 500,
                    textAlign: cardOnLeft ? 'right' : 'left',
                  }}
                >
                  {feature.number} / 03
                </p>

                {/* Thin horizontal line */}
                <div
                  style={{
                    width: '60px',
                    height: '1px',
                    background: 'rgba(185,154,82,0.25)',
                    alignSelf: cardOnLeft ? 'flex-end' : 'flex-start',
                  }}
                />
              </div>
            </div>
          );
        })}
      </div>

      <style jsx>{`
        button:hover span span {
          transform: scaleX(1) !important;
        }

        @keyframes dust-0 {
          0%   { transform: translate(0, 0);          opacity: 0;    }
          15%  { opacity: 0.85; }
          50%  { transform: translate(18px, -55px);   opacity: 0.95; }
          85%  { opacity: 0.7; }
          100% { transform: translate(0, 0);          opacity: 0;    }
        }
        @keyframes dust-1 {
          0%   { transform: translate(0, 0);          opacity: 0;    }
          15%  { opacity: 0.75; }
          50%  { transform: translate(-22px, -48px);  opacity: 0.9;  }
          85%  { opacity: 0.65; }
          100% { transform: translate(0, 0);          opacity: 0;    }
        }
        @keyframes dust-2 {
          0%   { transform: translate(0, 0);          opacity: 0;    }
          20%  { opacity: 0.8; }
          50%  { transform: translate(12px, -70px);   opacity: 1;    }
          80%  { opacity: 0.6; }
          100% { transform: translate(0, 0);          opacity: 0;    }
        }
        @keyframes orb-drift-0 {
          0%, 100% { transform: translate(-50%, -50%) scale(1);    opacity: 1; }
          50%       { transform: translate(-44%, -58%) scale(1.15); opacity: 0.7; }
        }
        @keyframes orb-drift-1 {
          0%, 100% { transform: translate(-50%, -50%) scale(1);    opacity: 1; }
          50%       { transform: translate(-56%, -43%) scale(1.2);  opacity: 0.6; }
        }
      `}</style>
    </section>
  );
}

// Made with Bob
