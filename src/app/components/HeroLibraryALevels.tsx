'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import AppImage from '@/components/ui/AppImage';

interface Subject {
  id: string;
  title: string;
  code: string;
  description: string;
  color: string;
}

// ── A-Level Subject categories ────────────────────────────────────────────────

const MATHEMATICS: Subject[] = [
  { id: 'maths',        title: 'Mathematics',         code: '9709', description: 'Pure Maths, Mechanics, Probability & Statistics.', color: '#5A6E8C' },
  { id: 'further-math', title: 'Further Mathematics',  code: '9231', description: 'Further Pure, Further Statistics, Further Mechanics.', color: '#4A5E7C' },
];

const SCIENCES: Subject[] = [
  { id: 'biology',   title: 'Biology',   code: '9700', description: 'Cell biology, genetics, ecology and physiology.', color: '#4A5E2A' },
  { id: 'chemistry', title: 'Chemistry', code: '9701', description: 'Physical, organic and inorganic chemistry.', color: '#2A4A5E' },
  { id: 'physics',   title: 'Physics',   code: '9702', description: 'Mechanics, waves, electricity, nuclear physics.', color: '#3A2A5E' },
];

const COMMERCE: Subject[] = [
  { id: 'business',   title: 'Business',              code: '9609', description: 'Marketing, finance, operations, HR and strategy.', color: '#4A3A2A' },
  { id: 'economics',  title: 'Economics',              code: '9708', description: 'Micro, macro, international trade and development.', color: '#5E4A2A' },
  { id: 'accounting', title: 'Accounting',             code: '9706', description: 'Financial accounting, management accounting, analysis.', color: '#1A3A2A' },
];

const LANGUAGES: Subject[] = [
  { id: 'english-lang', title: 'English Language',     code: '9093', description: 'Reading, writing, text analysis and language topics.', color: '#5C3D1A' },
  { id: 'english-gp',   title: 'English General Paper', code: '8021', description: 'Essay writing and comprehension on global topics.', color: '#4C3010' },
];

const MORE_SUBJECTS: Subject[] = [
  { id: 'cs-9618', title: 'Computer Science (9618)', code: '9618', description: 'Theory, problem-solving and advanced programming — new syllabus.', color: '#1E2E3E' },
  { id: 'cs-9608', title: 'Computer Science (9608)', code: '9608', description: 'Theory, problem-solving and programming — old syllabus.', color: '#1A2A3A' },
];

// ── SubjectSpine component (reused from IGCSE HeroLibrary) ────────────────────

interface SpineProps {
  subject: Subject;
  isHovered: boolean;
  onMouseEnter: () => void;
  onMouseLeave: () => void;
  onClick: () => void;
}

function SubjectSpine({ subject, isHovered, onMouseEnter, onMouseLeave, onClick }: SpineProps) {
  return (
    <div
      className="relative cursor-pointer select-none"
      style={{ width: '140px', height: '85%', alignSelf: 'flex-end' }}
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
      onClick={onClick}
      role="button"
      tabIndex={0}
      aria-label={`${subject.title} (${subject.code})`}
      onKeyDown={(e) => e.key === 'Enter' && onClick()}
    >
      <div
        className="h-full w-full flex flex-col items-center justify-between relative overflow-hidden py-4 px-2"
        style={{
          background:  isHovered ? 'rgba(201,168,76,0.08)' : 'transparent',
          borderLeft:  `1px solid rgba(201,168,76,${isHovered ? '0.35' : '0.12'})`,
          borderRight: `1px solid rgba(201,168,76,${isHovered ? '0.2'  : '0.06'})`,
          borderTop:   `1px solid rgba(201,168,76,${isHovered ? '0.3'  : '0.10'})`,
          transition:  'all 0.35s cubic-bezier(0.25,0.46,0.45,0.94)',
          transform:   isHovered ? 'translateY(-6px)' : 'translateY(0)',
          boxShadow:   isHovered ? '0 -8px 30px rgba(201,168,76,0.15), inset 0 0 20px rgba(201,168,76,0.05)' : 'none',
        }}
      >
        {/* Spine gold line decorations */}
        {(['left','right'] as const).map(side => (
          <div key={side} className={`absolute top-3 bottom-3 ${side}-1`} style={{
            width: '1px',
            background: `linear-gradient(180deg,transparent 0%,rgba(201,168,76,${isHovered ? (side==='left'?'0.6':'0.4') : (side==='left'?'0.2':'0.1')}) 30%,rgba(201,168,76,${isHovered ? (side==='left'?'0.6':'0.4') : (side==='left'?'0.2':'0.1')}) 70%,transparent 100%)`,
            transition: 'all 0.35s ease',
          }} />
        ))}

        <span className="font-display text-center leading-tight flex-1 flex items-center justify-center" style={{
          fontSize: '14px', fontWeight: 700,
          color: isHovered ? 'var(--gold-light)' : '#FFFFFF',
          letterSpacing: '0.02em',
          textShadow: isHovered ? '0 0 16px rgba(201,168,76,0.7)' : '0 2px 4px rgba(0,0,0,0.3)',
          transition: 'all 0.35s ease',
          wordBreak: 'break-word', hyphens: 'auto', padding: '0 4px',
        }}>
          {subject.title}
        </span>

        <span className="font-sans mt-2 text-center" style={{
          fontSize: '9px', fontWeight: 700, letterSpacing: '0.2em',
          color: isHovered ? 'var(--gold-muted)' : 'var(--parchment-faint)',
          transition: 'all 0.35s ease',
        }}>
          {subject.code}
        </span>
      </div>

      {/* Tooltip */}
      {isHovered && (
        <div className="absolute z-50 pointer-events-none" style={{
          bottom: 'calc(100% + 16px)', left: '50%', transform: 'translateX(-50%)',
          background: 'rgba(10,8,6,0.96)', border: '1px solid rgba(201,168,76,0.3)',
          borderRadius: '6px', padding: '8px 12px', minWidth: '160px', maxWidth: '220px',
          boxShadow: '0 8px 24px rgba(0,0,0,0.5)',
        }}>
          <p className="font-display text-[13px] font-semibold mb-1" style={{ color: 'var(--gold-light)', textAlign: 'center' }}>
            {subject.title}
          </p>
          <p className="font-sans text-[11px] leading-relaxed" style={{ color: 'var(--parchment-faint)', textAlign: 'center' }}>
            {subject.description}
          </p>
          <p className="font-sans text-[10px] mt-2 text-center" style={{ color: 'var(--gold-muted)', letterSpacing: '0.15em' }}>
            Click to browse →
          </p>
          {/* Arrow */}
          <div className="absolute bottom-0 left-1/2" style={{
            transform: 'translate(-50%, 100%)',
            borderLeft: '5px solid transparent', borderRight: '5px solid transparent',
            borderTop: '5px solid rgba(201,168,76,0.3)',
          }} />
        </div>
      )}
    </div>
  );
}

// ── Shelf row ─────────────────────────────────────────────────────────────────

function ShelfRow({
  leftLabel, leftSubjects,
  rightLabel, rightSubjects,
  hoveredSubject, setHoveredSubject, onSubjectClick,
}: {
  leftLabel: string; leftSubjects: Subject[];
  rightLabel: string; rightSubjects: Subject[];
  hoveredSubject: string | null;
  setHoveredSubject: (id: string | null) => void;
  onSubjectClick: (id: string) => void;
}) {
  return (
    <div className="relative mb-1">
      <div className="shelf-row rounded-t-sm overflow-visible" style={{ height: 'clamp(140px, 20vh, 200px)', background: 'transparent' }}>
        <div className="absolute top-0 left-0 right-0 h-2 opacity-60" style={{ background: 'linear-gradient(180deg,rgba(92,69,32,0.4) 0%,transparent 100%)' }} />
        <div className="flex h-full items-end justify-between px-4 gap-8">
          {/* Left */}
          <div className="flex items-end gap-1 relative">
            {leftSubjects.map((s, i) => (
              <div key={s.id} className="relative">
                {i === Math.floor(leftSubjects.length / 2) && (
                  <span className="font-display uppercase tracking-[0.15em] font-semibold absolute" style={{
                    fontSize: '12px', color: 'var(--gold-light)',
                    bottom: 'calc(100% + 16px)', left: '50%', transform: 'translateX(-50%)',
                    whiteSpace: 'nowrap', opacity: 0.85, pointerEvents: 'none',
                  }}>{leftLabel}</span>
                )}
                <SubjectSpine subject={s} isHovered={hoveredSubject === s.id}
                  onMouseEnter={() => setHoveredSubject(s.id)}
                  onMouseLeave={() => setHoveredSubject(null)}
                  onClick={() => onSubjectClick(s.id)} />
              </div>
            ))}
          </div>
          {/* Right */}
          <div className="flex items-end gap-1 relative">
            {rightSubjects.map((s, i) => (
              <div key={s.id} className="relative">
                {i === Math.floor(rightSubjects.length / 2) && (
                  <span className="font-display uppercase tracking-[0.15em] font-semibold absolute" style={{
                    fontSize: '12px', color: 'var(--gold-light)',
                    bottom: 'calc(100% + 16px)', left: '50%', transform: 'translateX(-50%)',
                    whiteSpace: 'nowrap', opacity: 0.85, pointerEvents: 'none',
                  }}>{rightLabel}</span>
                )}
                <SubjectSpine subject={s} isHovered={hoveredSubject === s.id}
                  onMouseEnter={() => setHoveredSubject(s.id)}
                  onMouseLeave={() => setHoveredSubject(null)}
                  onClick={() => onSubjectClick(s.id)} />
              </div>
            ))}
          </div>
        </div>
      </div>
      <div className="h-px" style={{ background: 'linear-gradient(90deg,transparent 0%,rgba(201,168,76,0.2) 20%,rgba(201,168,76,0.2) 80%,transparent 100%)' }} />
    </div>
  );
}

// ── Main export ───────────────────────────────────────────────────────────────

export default function HeroLibraryALevels() {
  const [hoveredSubject, setHoveredSubject] = useState<string | null>(null);
  const [spotX, setSpotX] = useState(50);
  const [spotY, setSpotY] = useState(50);

  const handleMouseMove = useCallback((e: MouseEvent) => {
    setSpotX(e.clientX);
    setSpotY(e.clientY);
  }, []);

  useEffect(() => {
    window.addEventListener('mousemove', handleMouseMove);
    return () => window.removeEventListener('mousemove', handleMouseMove);
  }, [handleMouseMove]);

  const handleSubjectClick = (subjectId: string) => {
    const all = [...MATHEMATICS, ...SCIENCES, ...LANGUAGES, ...COMMERCE, ...MORE_SUBJECTS];
    const s = all.find(x => x.id === subjectId);
    if (s) window.location.href = `/alevels/browse?subject=${s.code}`;
  };

  return (
    <section className="relative w-full min-h-screen flex flex-col overflow-hidden" style={{ minHeight: '100vh' }}>
      {/* Spotlight */}
      <div className="spotlight" style={{ background: `radial-gradient(600px circle at ${spotX}px ${spotY}px, rgba(201,168,76,0.05) 0%, transparent 60%)` }} />

      {/* Library background */}
      <div className="absolute inset-0 z-0">
        <AppImage
          src="/assets/images/library-bg-upscaled.png"
          alt="Grand library interior"
          fill priority
          className="object-cover object-center"
          sizes="100vw"
        />
        <div className="absolute inset-0 bg-gradient-to-b from-[#0A0806]/60 via-[#0A0806]/20 to-[#0A0806]/75" />
        <div className="absolute inset-0 bg-gradient-to-r from-[#0A0806]/40 via-transparent to-[#0A0806]/40" />
        <div className="absolute inset-0" style={{ background: 'radial-gradient(ellipse at 50% 50%,transparent 30%,rgba(10,8,6,0.6) 100%)' }} />
      </div>

      <div className="h-20 relative z-10" />

      {/* Title */}
      <div className="relative z-10 flex flex-col items-center pt-8 pb-4 px-6">
        <div className="flex items-center gap-4 mb-3">
          <div className="h-px w-16 bg-gradient-to-r from-transparent to-[#C9A84C]" />
          <span className="font-display text-[10px] uppercase tracking-[0.4em] font-light" style={{ color: 'var(--gold-muted)' }}>
            Student Archive A Levels
          </span>
          <div className="h-px w-16 bg-gradient-to-l from-transparent to-[#C9A84C]" />
        </div>

        <h1 className="font-display text-center leading-tight mb-2" style={{
          fontSize: 'clamp(2.2rem, 5vw, 4rem)',
          color: 'var(--parchment)',
          textShadow: '0 2px 40px rgba(201,168,76,0.3), 0 0 80px rgba(201,168,76,0.1)',
          fontWeight: 300,
          letterSpacing: '0.05em',
        }}>
          Student Archive
        </h1>

        <div className="gold-divider w-48 my-3" />

        <p className="font-sans text-center instruction-pulse" style={{
          fontSize: 'clamp(8px,1.1vw,11px)',
          color: 'var(--gold-muted)',
          letterSpacing: '0.25em',
          fontWeight: 600,
        }}>
          HOVER OVER ANY SHELF TO EXPLORE&nbsp;•&nbsp;CLICK TO ENTER&nbsp;•&nbsp;SCROLL FOR MORE
        </p>
      </div>

      {/* Bookshelves — 3 rows for A-level subjects */}
      <div className="relative z-10 flex-1 flex flex-col justify-end px-4 md:px-8 pb-8 gap-1">

        {/* Row 1: Mathematics + Sciences */}
        <ShelfRow
          leftLabel="Mathematics"   leftSubjects={MATHEMATICS}
          rightLabel="Sciences"     rightSubjects={SCIENCES}
          hoveredSubject={hoveredSubject}
          setHoveredSubject={setHoveredSubject}
          onSubjectClick={handleSubjectClick}
        />

        {/* Row 2: Languages + Commerce */}
        <ShelfRow
          leftLabel="Languages"  leftSubjects={LANGUAGES}
          rightLabel="Commerce"  rightSubjects={COMMERCE}
          hoveredSubject={hoveredSubject}
          setHoveredSubject={setHoveredSubject}
          onSubjectClick={handleSubjectClick}
        />

        {/* Row 3: More Subjects — left-aligned */}
        <div className="relative mb-1">
          <div className="shelf-row rounded-t-sm" style={{ height: 'clamp(140px,20vh,200px)', background: 'transparent' }}>
            <div className="absolute top-0 left-0 right-0 h-2 opacity-60" style={{ background: 'linear-gradient(180deg,rgba(92,69,32,0.4) 0%,transparent 100%)' }} />
            <div className="flex h-full items-end justify-start px-4 gap-8">
              <div className="flex items-end gap-1 relative">
                {MORE_SUBJECTS.map((s, i) => (
                  <div key={s.id} className="relative">
                    {i === 0 && (
                      <span className="font-display uppercase tracking-[0.15em] font-semibold absolute" style={{
                        fontSize: '12px', color: 'var(--gold-light)',
                        bottom: 'calc(100% + 16px)', left: '50%', transform: 'translateX(-50%)',
                        whiteSpace: 'nowrap', opacity: 0.85, pointerEvents: 'none',
                      }}>More Subjects</span>
                    )}
                    <SubjectSpine subject={s} isHovered={hoveredSubject === s.id}
                      onMouseEnter={() => setHoveredSubject(s.id)}
                      onMouseLeave={() => setHoveredSubject(null)}
                      onClick={() => handleSubjectClick(s.id)} />
                  </div>
                ))}
              </div>
            </div>
          </div>
          <div className="h-px" style={{ background: 'linear-gradient(90deg,transparent 0%,rgba(201,168,76,0.2) 20%,rgba(201,168,76,0.2) 80%,transparent 100%)' }} />
        </div>

        <div className="h-2" style={{ background: 'linear-gradient(180deg,rgba(201,168,76,0.08) 0%,transparent 100%)' }} />
      </div>

      {/* Scroll indicator */}
      <div className="relative z-10 flex flex-col items-center pb-6 gap-2">
        <span className="font-sans uppercase tracking-[0.3em] instruction-pulse" style={{ fontSize: '9px', color: 'var(--gold-dark)' }}>
          Scroll for more
        </span>
        <div className="flex flex-col items-center gap-1">
          <div className="w-px h-8 candle-glow" style={{ background: 'linear-gradient(180deg,var(--gold-dark) 0%,transparent 100%)' }} />
          <div className="w-1.5 h-1.5 rounded-full candle-glow" style={{ background: 'var(--gold-dark)' }} />
        </div>
      </div>
    </section>
  );
}

// Made with Bob
