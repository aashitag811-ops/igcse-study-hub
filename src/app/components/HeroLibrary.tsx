'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import AppImage from '@/components/ui/AppImage';

interface Subject {
  id: string;
  title: string;
  code: string;
  description: string;
  color: string;
  spineWidth: string;
}

// Subject categories
const MATHEMATICS: Subject[] = [
  {
    id: 'math-intl',
    title: 'Mathematics International',
    code: '0580',
    description: 'Core and extended mathematics covering number, algebra, geometry and statistics.',
    color: '#6B4F1E',
    spineWidth: 'w-[20%]',
  },
  {
    id: 'add-math',
    title: 'Additional Mathematics',
    code: '0606',
    description: 'Advanced algebra, calculus, trigonometry and coordinate geometry for high achievers.',
    color: '#7B5E2A',
    spineWidth: 'w-[19%]',
  },
];

const SCIENCES: Subject[] = [
  {
    id: 'biology',
    title: 'Biology',
    code: '0610',
    description: 'Life processes, cells, genetics, ecology and human physiology.',
    color: '#4A5E2A',
    spineWidth: 'w-[6%]',
  },
  {
    id: 'chemistry',
    title: 'Chemistry',
    code: '0620',
    description: 'Atomic structure, bonding, reactions, organic chemistry and analytical techniques.',
    color: '#2A4A5E',
    spineWidth: 'w-[6.5%]',
  },
  {
    id: 'physics',
    title: 'Physics',
    code: '0625',
    description: 'Mechanics, waves, electricity, magnetism, thermal physics and modern physics.',
    color: '#3A2A5E',
    spineWidth: 'w-[6%]',
  },
];

const LANGUAGES: Subject[] = [
  {
    id: 'english',
    title: 'First Language English',
    code: '0500',
    description: 'Reading comprehension, directed writing, and composition skills in English.',
    color: '#5C3D1A',
    spineWidth: 'w-[7%]',
  },
  {
    id: 'french',
    title: 'French Foreign Language',
    code: '0520',
    description: 'Communicative French skills: reading, writing, listening and speaking.',
    color: '#2A3A5E',
    spineWidth: 'w-[7%]',
  },
  {
    id: 'hindi',
    title: 'Hindi as a Second Language',
    code: '0549',
    description: 'Reading, writing, listening and speaking skills in Hindi language.',
    color: '#5E2A2A',
    spineWidth: 'w-[8%]',
  },
];

const HUMANITIES: Subject[] = [
  {
    id: 'business',
    title: 'Business Studies',
    code: '0450',
    description: 'Business organization, marketing, finance, human resources and operations management.',
    color: '#4A3A2A',
    spineWidth: 'w-[7%]',
  },
  {
    id: 'economics',
    title: 'Economics',
    code: '0455',
    description: 'Microeconomics, macroeconomics, international trade and development economics.',
    color: '#5E4A2A',
    spineWidth: 'w-[7%]',
  },
  {
    id: 'ict',
    title: 'ICT',
    code: '0417',
    description: 'Information and communication technology applications, theory and practical skills.',
    color: '#2A2A3A',
    spineWidth: 'w-[6.5%]',
  },
  {
    id: 'cs',
    title: 'Computer Science',
    code: '0478',
    description: 'Programming, algorithms, data structures, networking and computational thinking.',
    color: '#1A3A2A',
    spineWidth: 'w-[7.5%]',
  },
  {
    id: 'global-persp',
    title: 'Global Perspectives',
    code: '0457',
    description: 'Critical thinking, research and reflection on global issues and perspectives.',
    color: '#5E2A3A',
    spineWidth: 'w-[7.5%]',
  },
];

export default function HeroLibrary() {
  const [hoveredSubject, setHoveredSubject] = useState<string | null>(null);
  const [spotX, setSpotX] = useState(50);
  const [spotY, setSpotY] = useState(50);
  const heroRef = useRef<HTMLDivElement>(null);

  const handleMouseMove = useCallback((e: MouseEvent) => {
    setSpotX(e.clientX);
    setSpotY(e.clientY);
  }, []);

  useEffect(() => {
    window.addEventListener('mousemove', handleMouseMove);
    return () => window.removeEventListener('mousemove', handleMouseMove);
  }, [handleMouseMove]);

  const handleSubjectClick = (subjectId: string) => {
    // Navigate to subject page
    console.log('Navigate to subject:', subjectId);
  };

  return (
    <section
      ref={heroRef}
      className="relative w-full min-h-screen flex flex-col overflow-hidden"
      style={{ minHeight: '100vh' }}
    >
      {/* Spotlight cursor */}
      <div
        className="spotlight"
        style={{
          background: `radial-gradient(600px circle at ${spotX}px ${spotY}px, rgba(201, 168, 76, 0.05) 0%, transparent 60%)`,
        }}
      />

      {/* Full-bleed library background */}
      <div className="absolute inset-0 z-0">
        <AppImage
          src="/assets/images/library-bg-upscaled.png"
          alt="Grand library interior with tall wooden bookshelves, warm candlelit amber glow, dark mahogany tones, deep shadows between towering shelves, atmospheric scholarly atmosphere"
          fill
          priority
          className="object-cover object-center"
          sizes="100vw"
        />
        {/* Multi-layer atmospheric overlay */}
        <div className="absolute inset-0 bg-gradient-to-b from-[#0A0806]/60 via-[#0A0806]/20 to-[#0A0806]/75" />
        <div className="absolute inset-0 bg-gradient-to-r from-[#0A0806]/40 via-transparent to-[#0A0806]/40" />
        {/* Vignette */}
        <div
          className="absolute inset-0"
          style={{
            background: 'radial-gradient(ellipse at 50% 50%, transparent 30%, rgba(10,8,6,0.6) 100%)',
          }}
        />
      </div>

      {/* Header spacer */}
      <div className="h-20 relative z-10" />

      {/* Title area */}
      <div className="relative z-10 flex flex-col items-center pt-8 pb-4 px-6">
        <div className="flex items-center gap-4 mb-3">
          <div className="h-px w-16 bg-gradient-to-r from-transparent to-[#C9A84C]" />
          <span
            className="font-display text-[10px] uppercase tracking-[0.4em] font-light"
            style={{ color: 'var(--gold-muted)' }}
          >
            IGCSE Academic Library
          </span>
          <div className="h-px w-16 bg-gradient-to-l from-transparent to-[#C9A84C]" />
        </div>

        <h1
          className="font-display text-center leading-tight mb-2"
          style={{
            fontSize: 'clamp(2.2rem, 5vw, 4rem)',
            color: 'var(--parchment)',
            textShadow: '0 2px 40px rgba(201, 168, 76, 0.3), 0 0 80px rgba(201, 168, 76, 0.1)',
            fontWeight: 300,
            letterSpacing: '0.05em',
          }}
        >
          Student Archive
        </h1>

        <div className="gold-divider w-48 my-3" />

        {/* Instruction text */}
        <p
          className="font-sans text-center instruction-pulse"
          style={{
            fontSize: 'clamp(8px, 1.1vw, 11px)',
            color: 'var(--gold-muted)',
            letterSpacing: '0.25em',
            fontWeight: 600,
          }}
        >
          HOVER OVER ANY SHELF TO EXPLORE&nbsp;•&nbsp;CLICK TO ENTER&nbsp;•&nbsp;SCROLL FOR MORE
        </p>
      </div>

      {/* Bookshelves */}
      <div className="relative z-10 flex-1 flex flex-col justify-end px-4 md:px-8 pb-8 gap-1">

        {/* Shelf Row 1: Mathematics (left) and Sciences (right) */}
        <CategorizedShelfRow
          leftCategory="Mathematics"
          leftSubjects={MATHEMATICS}
          rightCategory="Sciences"
          rightSubjects={SCIENCES}
          hoveredSubject={hoveredSubject}
          setHoveredSubject={setHoveredSubject}
          onSubjectClick={handleSubjectClick}
        />

        {/* Shelf Row 2: Languages (left) and Social Sciences (right) */}
        <CategorizedShelfRow
          leftCategory="Languages"
          leftSubjects={LANGUAGES}
          rightCategory="Social Sciences"
          rightSubjects={HUMANITIES}
          hoveredSubject={hoveredSubject}
          setHoveredSubject={setHoveredSubject}
          onSubjectClick={handleSubjectClick}
        />

        {/* Decorative floor shadow */}
        <div
          className="h-2"
          style={{
            background: 'linear-gradient(180deg, rgba(201,168,76,0.08) 0%, transparent 100%)',
          }}
        />
      </div>

      {/* Scroll indicator */}
      <div className="relative z-10 flex flex-col items-center pb-6 gap-2">
        <span
          className="font-sans uppercase tracking-[0.3em] instruction-pulse"
          style={{ fontSize: '9px', color: 'var(--gold-dark)' }}
        >
          Scroll for more
        </span>
        <div className="flex flex-col items-center gap-1">
          <div
            className="w-px h-8 candle-glow"
            style={{ background: 'linear-gradient(180deg, var(--gold-dark) 0%, transparent 100%)' }}
          />
          <div
            className="w-1.5 h-1.5 rounded-full candle-glow"
            style={{ background: 'var(--gold-dark)' }}
          />
        </div>
      </div>
    </section>
  );
}

interface DoubleLayerShelfRowProps {
  leftCategory: string;
  leftSubjects: Subject[];
  rightCategory: string;
  rightSubjectsFront: Subject[];
  rightSubjectsBack: Subject[];
  hoveredSubject: string | null;
  setHoveredSubject: (id: string | null) => void;
  onSubjectClick: (id: string) => void;
}

function DoubleLayerShelfRow({
  leftCategory,
  leftSubjects,
  rightCategory,
  rightSubjectsFront,
  rightSubjectsBack,
  hoveredSubject,
  setHoveredSubject,
  onSubjectClick
}: DoubleLayerShelfRowProps) {
  return (
    <div className="relative mb-1">
      {/* Shelf background */}
      <div
        className="shelf-row rounded-t-sm overflow-visible"
        style={{
          height: 'clamp(140px, 20vh, 200px)',
          background: 'transparent',
        }}
      >
        {/* Inner shelf wood texture top */}
        <div
          className="absolute top-0 left-0 right-0 h-2 opacity-60"
          style={{
            background: 'linear-gradient(180deg, rgba(92,69,32,0.4) 0%, transparent 100%)',
          }}
        />

        {/* Books / Subject spines - Split layout */}
        <div className="flex h-full items-end justify-between px-4 gap-8">
          {/* Left category */}
          <div className="flex items-end gap-1">
            {/* Category label */}
            <div className="flex flex-col justify-end pb-3 mr-4 min-w-[35px]">
              <span
                className="font-display text-[12px] uppercase tracking-[0.12em] font-semibold text-center"
                style={{
                  color: 'var(--gold-light)',
                  writingMode: 'vertical-rl',
                  transform: 'rotate(180deg)',
                  lineHeight: '1.3',
                  whiteSpace: 'normal',
                  maxWidth: '160px'
                }}
              >
                {leftCategory}
              </span>
            </div>
            {leftSubjects.map((subject, index) => (
              <SubjectSpine
                key={subject.id}
                subject={subject}
                isHovered={hoveredSubject === subject.id}
                onMouseEnter={() => setHoveredSubject(subject.id)}
                onMouseLeave={() => setHoveredSubject(null)}
                onClick={() => onSubjectClick(subject.id)}
                index={index}
              />
            ))}
          </div>

          {/* Right category with 2 layers */}
          <div className="flex items-end gap-1 relative">
            {/* Category label */}
            <div className="flex flex-col justify-end pb-3 mr-4 min-w-[35px]">
              <span
                className="font-display text-[12px] uppercase tracking-[0.12em] font-semibold text-center"
                style={{
                  color: 'var(--gold-light)',
                  writingMode: 'vertical-rl',
                  transform: 'rotate(180deg)',
                  lineHeight: '1.3',
                  whiteSpace: 'normal',
                  maxWidth: '160px'
                }}
              >
                {rightCategory}
              </span>
            </div>
            
            {/* Back row - positioned in red box locations */}
            <div className="flex items-end gap-1 absolute bottom-[100%] left-[140px] z-0">
              {rightSubjectsBack.map((subject, index) => (
                <SubjectSpine
                  key={subject.id}
                  subject={subject}
                  isHovered={hoveredSubject === subject.id}
                  onMouseEnter={() => setHoveredSubject(subject.id)}
                  onMouseLeave={() => setHoveredSubject(null)}
                  onClick={() => onSubjectClick(subject.id)}
                  index={index}
                />
              ))}
            </div>
            
            {/* Front row */}
            <div className="flex items-end gap-1 relative z-10">
              {rightSubjectsFront.map((subject, index) => (
                <SubjectSpine
                  key={subject.id}
                  subject={subject}
                  isHovered={hoveredSubject === subject.id}
                  onMouseEnter={() => setHoveredSubject(subject.id)}
                  onMouseLeave={() => setHoveredSubject(null)}
                  onClick={() => onSubjectClick(subject.id)}
                  index={index}
                />
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Shelf plank */}
      <div
        className="h-px"
        style={{
          background: 'linear-gradient(90deg, transparent 0%, rgba(201,168,76,0.2) 20%, rgba(201,168,76,0.2) 80%, transparent 100%)',
        }}
      />
    </div>
  );
}

interface CategorizedShelfRowProps {
  leftCategory: string;
  leftSubjects: Subject[];
  rightCategory: string;
  rightSubjects: Subject[];
  hoveredSubject: string | null;
  setHoveredSubject: (id: string | null) => void;
  onSubjectClick: (id: string) => void;
}

function CategorizedShelfRow({
  leftCategory,
  leftSubjects,
  rightCategory,
  rightSubjects,
  hoveredSubject,
  setHoveredSubject,
  onSubjectClick
}: CategorizedShelfRowProps) {
  return (
    <div className="relative mb-1">
      {/* Shelf background */}
      <div
        className="shelf-row rounded-t-sm overflow-visible"
        style={{
          height: 'clamp(140px, 20vh, 200px)',
          background: 'transparent',
        }}
      >
        {/* Inner shelf wood texture top */}
        <div
          className="absolute top-0 left-0 right-0 h-2 opacity-60"
          style={{
            background: 'linear-gradient(180deg, rgba(92,69,32,0.4) 0%, transparent 100%)',
          }}
        />

        {/* Books / Subject spines - Split layout */}
        <div className="flex h-full items-end justify-between px-4 gap-8">
          {/* Left category */}
          <div className="flex items-end gap-1">
            {/* Category label */}
            <div className="flex flex-col justify-end pb-3 mr-4 min-w-[35px]">
              <span
                className="font-display text-[12px] uppercase tracking-[0.12em] font-semibold text-center"
                style={{
                  color: 'var(--gold-light)',
                  writingMode: 'vertical-rl',
                  transform: 'rotate(180deg)',
                  lineHeight: '1.3',
                  whiteSpace: 'normal',
                  maxWidth: '160px'
                }}
              >
                {leftCategory}
              </span>
            </div>
            {leftSubjects.map((subject, index) => (
              <SubjectSpine
                key={subject.id}
                subject={subject}
                isHovered={hoveredSubject === subject.id}
                onMouseEnter={() => setHoveredSubject(subject.id)}
                onMouseLeave={() => setHoveredSubject(null)}
                onClick={() => onSubjectClick(subject.id)}
                index={index}
              />
            ))}
          </div>

          {/* Right category */}
          <div className="flex items-end gap-1">
            {rightSubjects.map((subject, index) => (
              <SubjectSpine
                key={subject.id}
                subject={subject}
                isHovered={hoveredSubject === subject.id}
                onMouseEnter={() => setHoveredSubject(subject.id)}
                onMouseLeave={() => setHoveredSubject(null)}
                onClick={() => onSubjectClick(subject.id)}
                index={index}
              />
            ))}
            {/* Category label */}
            <div className="flex flex-col justify-end pb-3 ml-4 min-w-[35px]">
              <span
                className="font-display text-[12px] uppercase tracking-[0.12em] font-semibold text-center"
                style={{
                  color: 'var(--gold-light)',
                  writingMode: 'vertical-rl',
                  transform: 'rotate(180deg)',
                  lineHeight: '1.3',
                  whiteSpace: 'normal',
                  maxWidth: '160px'
                }}
              >
                {rightCategory}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Shelf plank */}
      <div
        className="h-px"
        style={{
          background: 'linear-gradient(90deg, transparent 0%, rgba(201,168,76,0.2) 20%, rgba(201,168,76,0.2) 80%, transparent 100%)',
        }}
      />
    </div>
  );
}

interface SubjectSpineProps {
  subject: Subject;
  isHovered: boolean;
  onMouseEnter: () => void;
  onMouseLeave: () => void;
  onClick: () => void;
  index: number;
}

function SubjectSpine({ subject, isHovered, onMouseEnter, onMouseLeave, onClick, index }: SubjectSpineProps) {
  return (
    <div
      className={`relative cursor-pointer select-none`}
      style={{
        width: '140px',
        height: '85%',
        alignSelf: 'flex-end',
      }}
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
      onClick={onClick}
      role="button"
      tabIndex={0}
      aria-label={`${subject.title} (${subject.code}) — click to enter`}
      onKeyDown={(e) => e.key === 'Enter' && onClick()}
    >
      {/* Book body */}
      <div
        className="h-full w-full flex flex-col items-center justify-between relative overflow-hidden py-4 px-2"
        style={{
          background: isHovered
            ? `rgba(201,168,76,0.08)`
            : `transparent`,
          borderLeft: `1px solid rgba(201,168,76,${isHovered ? '0.35' : '0.12'})`,
          borderRight: `1px solid rgba(201,168,76,${isHovered ? '0.2' : '0.06'})`,
          borderTop: `1px solid rgba(201,168,76,${isHovered ? '0.3' : '0.1'})`,
          transition: 'all 0.35s cubic-bezier(0.25, 0.46, 0.45, 0.94)',
          transform: isHovered ? 'translateY(-6px)' : 'translateY(0)',
          boxShadow: isHovered
            ? `0 -8px 30px rgba(201,168,76,0.15), inset 0 0 20px rgba(201,168,76,0.05)`
            : `none`,
        }}
      >
        {/* Spine gold line decoration */}
        <div
          className="absolute top-3 bottom-3 left-1"
          style={{
            width: '1px',
            background: `linear-gradient(180deg, transparent 0%, rgba(201,168,76,${isHovered ? '0.6' : '0.2'}) 30%, rgba(201,168,76,${isHovered ? '0.6' : '0.2'}) 70%, transparent 100%)`,
            transition: 'all 0.35s ease',
          }}
        />
        <div
          className="absolute top-3 bottom-3 right-1"
          style={{
            width: '1px',
            background: `linear-gradient(180deg, transparent 0%, rgba(201,168,76,${isHovered ? '0.4' : '0.1'}) 30%, rgba(201,168,76,${isHovered ? '0.4' : '0.1'}) 70%, transparent 100%)`,
            transition: 'all 0.35s ease',
          }}
        />

        {/* Subject title (horizontal) */}
        <span
          className="font-display text-center leading-tight flex-1 flex items-center justify-center"
          style={{
            fontSize: '13px',
            fontWeight: 700,
            color: isHovered ? 'var(--gold-light)' : '#FFFFFF',
            letterSpacing: '0.02em',
            textShadow: isHovered ? '0 0 16px rgba(201,168,76,0.7)' : '0 2px 4px rgba(0,0,0,0.3)',
            transition: 'all 0.35s ease',
            wordBreak: 'break-word',
            hyphens: 'auto',
            padding: '0 4px',
          }}
        >
          {subject.title}
        </span>

        {/* Subject code - positioned below title */}
        <span
          className="font-sans mt-2 text-center"
          style={{
            fontSize: '9px',
            fontWeight: 700,
            letterSpacing: '0.2em',
            color: isHovered ? 'var(--gold-muted)' : 'var(--parchment-faint)',
            transition: 'all 0.35s ease',
          }}
        >
          {subject.code}
        </span>
      </div>

      {/* Tooltip */}
      {isHovered && (
        <div
          className="absolute z-50 pointer-events-none"
          style={{
            bottom: 'calc(100% + 16px)',
            left: '50%',
            transform: 'translateX(-50%)',
            background: 'linear-gradient(135deg, #1A1510 0%, #221C12 100%)',
            border: '1px solid rgba(201,168,76,0.5)',
            borderRadius: '8px',
            padding: '14px 18px',
            minWidth: '200px',
            maxWidth: '240px',
            boxShadow: '0 20px 60px rgba(0,0,0,0.85), 0 0 30px rgba(201,168,76,0.12)',
          }}
        >
          <div
            className="font-display text-sm font-medium mb-1 leading-snug"
            style={{ color: 'var(--gold-light)' }}
          >
            {subject.title}
          </div>
          <div
            className="font-sans text-[10px] font-bold uppercase tracking-[0.2em] mb-2"
            style={{ color: 'var(--gold-dark)' }}
          >
            Cambridge IGCSE · {subject.code}
          </div>
          <div className="gold-divider mb-2" />
          <p
            className="font-sans text-xs leading-relaxed"
            style={{ color: 'var(--parchment-faint)', fontSize: '11px' }}
          >
            A galore of revision notes, hardest questions, flashcards, formula sheets, sample answers, revision guides, and YouTube resources.
          </p>
          <div
            className="mt-3 flex items-center gap-2"
            style={{ color: 'var(--gold-muted)' }}
          >
            <span className="font-sans font-bold uppercase tracking-[0.2em]" style={{ fontSize: '9px' }}>
              Click to Enter
            </span>
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <path d="M5 12h14M12 5l7 7-7 7" />
            </svg>
          </div>
          {/* Arrow */}
          <div
            className="absolute -bottom-2 left-1/2 -translate-x-1/2 w-3 h-3 rotate-45"
            style={{
              background: '#221C12',
              borderRight: '1px solid rgba(201,168,76,0.5)',
              borderBottom: '1px solid rgba(201,168,76,0.5)',
            }}
          />
        </div>
      )}
    </div>
  );
}

// Made with Bob
