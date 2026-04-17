'use client';

import React, { useEffect, useRef, useState } from 'react';

interface ActionCard {
  id: string;
  title: string;
  subtitle: string;
  description: string;
  icon: React.ReactNode;
  accentColor: string;
  cta: string;
}

const PastPapersIcon = () => (
  <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
    <polyline points="14 2 14 8 20 8" />
    <line x1="16" y1="13" x2="8" y2="13" />
    <line x1="16" y1="17" x2="8" y2="17" />
    <polyline points="10 9 9 9 8 9" />
  </svg>
);

const ProfileIcon = () => (
  <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
    <circle cx="12" cy="7" r="4" />
  </svg>
);

const SignOutIcon = () => (
  <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
    <polyline points="16 17 21 12 16 7" />
    <line x1="21" y1="12" x2="9" y2="12" />
  </svg>
);

const ACTION_CARDS: ActionCard[] = [
  {
    id: 'past-papers',
    title: 'Past Papers',
    subtitle: 'Cambridge Archives',
    description: 'Do past papers with automatic correction, view detailed examiner reports, and access mark schemes across 13 subjects.',
    icon: <PastPapersIcon />,
    accentColor: '#C9A84C',
    cta: 'Browse Archives',
  },
  {
    id: 'profile',
    title: 'Profile View',
    subtitle: 'Your Academic Record',
    description: 'Review your enrolled subjects, track revision progress, manage bookmarks, and view your personal study calendar and performance insights.',
    icon: <ProfileIcon />,
    accentColor: '#8BA84C',
    cta: 'View Profile',
  },
  {
    id: 'sign-out',
    title: 'Sign Out',
    subtitle: 'End Session',
    description: 'Securely sign out of the Student Archive. Your progress and bookmarks are automatically saved to your account.',
    icon: <SignOutIcon />,
    accentColor: '#A84C4C',
    cta: 'Sign Out',
  },
];

export default function ResourcesSection() {
  const sectionRef = useRef<HTMLDivElement>(null);
  const [isVisible, setIsVisible] = useState(false);
  const [activeCard, setActiveCard] = useState<string | null>(null);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsVisible(true);
        }
      },
      { threshold: 0.15 }
    );
    if (sectionRef.current) observer.observe(sectionRef.current);
    return () => observer.disconnect();
  }, []);

  return (
    <section
      ref={sectionRef}
      className="relative py-24 px-6 md:px-12 overflow-hidden resources-section-bg"
      style={{
        background: 'linear-gradient(180deg, #1A1510 0%, #2A1F0E 50%, #1A1510 100%)'
      }}
    >
      {/* Decorative top border */}
      <div className="absolute top-0 left-0 right-0 h-px gold-divider" />

      <div className="relative z-10 max-w-5xl mx-auto">
        {/* Section header */}
        <div
          className={`text-center mb-16 transition-all duration-700 ${isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}
          style={{ transitionDelay: '0ms' }}
        >
          <div className="flex justify-center items-center gap-4 mb-4">
            <div className="h-px w-12 bg-gradient-to-r from-transparent to-[#C9A84C]" />
            <span
              className="font-sans text-[10px] uppercase tracking-[0.4em] font-bold"
              style={{ color: 'var(--gold-dark)' }}
            >
              Library Services
            </span>
            <div className="h-px w-12 bg-gradient-to-l from-transparent to-[#C9A84C]" />
          </div>

          <h2
            className="font-display mb-3"
            style={{
              fontSize: 'clamp(1.8rem, 4vw, 3rem)',
              fontWeight: 300,
              color: 'var(--parchment)',
              letterSpacing: '0.04em',
              textShadow: '0 2px 20px rgba(201,168,76,0.2)',
            }}
          >
            Resources
          </h2>
          <div className="gold-divider w-32 mx-auto my-4" />
          <p
            className="font-sans max-w-xl mx-auto"
            style={{ fontSize: '14px', color: 'var(--parchment-faint)', lineHeight: 1.7 }}
          >
            Everything you need for your IGCSE journey, gathered in one place.
          </p>
        </div>

        {/* Action cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {ACTION_CARDS.map((card, index) => (
            <div
              key={card.id}
              className={`action-card p-8 flex flex-col gap-5 transition-all duration-700 ${isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10'}`}
              style={{ transitionDelay: `${150 + index * 120}ms` }}
              onMouseEnter={() => setActiveCard(card.id)}
              onMouseLeave={() => setActiveCard(null)}
              role="button"
              tabIndex={0}
              aria-label={card.title}
              onKeyDown={(e) => e.key === 'Enter' && console.log('Navigate to', card.id)}
              onClick={() => console.log('Navigate to', card.id)}
            >
              {/* Icon */}
              <div
                className="w-14 h-14 flex items-center justify-center rounded-lg relative"
                style={{
                  background: `linear-gradient(135deg, ${card.accentColor}18 0%, ${card.accentColor}08 100%)`,
                  border: `1px solid ${card.accentColor}30`,
                  color: card.accentColor,
                  transition: 'all 0.35s ease',
                  boxShadow: activeCard === card.id ? `0 0 20px ${card.accentColor}25` : 'none',
                }}
              >
                {card.icon}
              </div>

              {/* Content */}
              <div className="flex-1">
                <div
                  className="font-sans text-[10px] uppercase tracking-[0.25em] font-bold mb-1"
                  style={{ color: card.accentColor, opacity: 0.8 }}
                >
                  {card.subtitle}
                </div>
                <h3
                  className="font-display text-xl font-medium mb-3"
                  style={{
                    color: activeCard === card.id ? 'var(--parchment)' : 'var(--parchment-dim)',
                    transition: 'color 0.35s ease',
                  }}
                >
                  {card.title}
                </h3>
                <p
                  className="font-sans text-sm leading-relaxed"
                  style={{ color: 'var(--parchment-faint)', fontSize: '13px', lineHeight: 1.7 }}
                >
                  {card.description}
                </p>
              </div>

              {/* CTA */}
              <div className="flex items-center gap-2 pt-2">
                <div
                  className="h-px flex-1 transition-all duration-500"
                  style={{
                    background: `linear-gradient(90deg, ${card.accentColor}60, transparent)`,
                    opacity: activeCard === card.id ? 1 : 0.4,
                  }}
                />
                <span
                  className="font-sans font-bold uppercase tracking-[0.2em] flex items-center gap-2"
                  style={{
                    fontSize: '10px',
                    color: activeCard === card.id ? card.accentColor : 'var(--parchment-faint)',
                    transition: 'color 0.35s ease',
                  }}
                >
                  {card.cta}
                  <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                    <path d="M5 12h14M12 5l7 7-7 7" />
                  </svg>
                </span>
              </div>
            </div>
          ))}
        </div>

        {/* Bottom decorative quote */}
        <div
          className={`mt-20 text-center transition-all duration-700 ${isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-6'}`}
          style={{ transitionDelay: '600ms' }}
        >
          <div className="gold-divider w-48 mx-auto mb-8" />
          <blockquote
            className="font-display italic"
            style={{
              fontSize: 'clamp(1rem, 2.5vw, 1.4rem)',
              color: 'var(--parchment-faint)',
              fontWeight: 300,
              letterSpacing: '0.03em',
              lineHeight: 1.6,
            }}
          >
            &ldquo;Cambridge will always find a way to scam you and thresholds will not save your ass.&rdquo;
          </blockquote>
          <div
            className="mt-4 font-sans text-[10px] uppercase tracking-[0.3em]"
            style={{ color: 'var(--gold-dark)' }}
          >
            Scambridge Survivor · IGCSE 2026
          </div>
          <div className="gold-divider w-48 mx-auto mt-8" />
        </div>
      </div>
    </section>
  );
}

// Made with Bob
