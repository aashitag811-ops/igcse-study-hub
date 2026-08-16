'use client';

import React, { useState } from 'react';

interface StudyModeSelectorProps {
  onViewPapers: () => void;
  onStartPractice: () => void;
  onStartPracticeMode: () => void;
  isPaperSelected: boolean;
  isTestModeEnabled: boolean;
  testModeMessage?: string;
  preferredMode?: string;
}

const SERIF = "'Cormorant Garamond', 'Cormorant', Georgia, serif";

const modes = [
  {
    id: 'study' as const, label: 'View Past Papers', number: '01', tag: 'STUDY',
    description: 'Study with the question paper and official mark scheme side by side.',
    inactiveColor: '#4a7ab5',
    icon: () => (
      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" style={{ color: '#ffffff' }}>
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
      </svg>
    ),
  },
  {
    id: 'test' as const, label: 'Exam Mode', number: '02', tag: 'EXAM',
    description: 'Timed full-paper simulation under real exam conditions. Submit for a complete score report.',
    inactiveColor: '#c05a5a',
    icon: () => (
      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" style={{ color: '#ffffff' }}>
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z" />
      </svg>
    ),
  },
  {
    id: 'practice' as const, label: 'Practice Mode', number: '03', tag: 'PRACTICE',
    description: 'Question-by-question walkthrough with instant answer feedback, examiner notes, and a running score tracker.',
    inactiveColor: '#c05a5a',
    icon: () => (
      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" style={{ color: '#ffffff' }}>
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M13 10V3L4 14h7v7l9-11h-7z" />
      </svg>
    ),
  },
];

export default function StudyModeSelector({
  onViewPapers, onStartPractice, onStartPracticeMode,
  isPaperSelected, isTestModeEnabled, testModeMessage, preferredMode,
}: StudyModeSelectorProps) {
  const [activeMode, setActiveMode] = useState<'study' | 'test' | 'practice'>(() => {
    if (!isTestModeEnabled) return 'study';
    if (preferredMode === 'test') return 'test';
    if (preferredMode === 'practice') return 'practice';
    return 'study';
  });
  const [pressing, setPressing] = useState(false);

  const isLocked = activeMode !== 'study' && !isTestModeEnabled;
  const isLaunchable = isPaperSelected && !isLocked;
  const launchLabel = activeMode === 'study' ? 'View Paper' : activeMode === 'test' ? 'Begin Exam' : 'Start Practising';

  const handleLaunch = () => {
    if (!isLaunchable) return;
    if (activeMode === 'study') onViewPapers();
    else if (activeMode === 'test') onStartPractice();
    else onStartPracticeMode();
  };

  return (
    <div
      className="rounded-2xl p-6"
      style={{
        /* Depth stack: dark base → blur layer → 1px top highlight → subtle outer shadow */
        background: 'linear-gradient(160deg, rgba(12,18,10,0.92) 0%, rgba(6,10,6,0.96) 100%)',
        backdropFilter: 'blur(18px)',
        WebkitBackdropFilter: 'blur(18px)',
        border: '1px solid rgba(180,150,40,0.14)',
        borderTop: '1px solid rgba(200,168,76,0.22)',
        boxShadow: [
          '0 0 0 1px rgba(0,0,0,0.6)',
          '0 24px 70px rgba(0,0,0,0.55)',
          '0 2px 0 rgba(200,168,76,0.06)',
          'inset 0 1px 0 rgba(200,168,76,0.10)',
          'inset 0 0 40px rgba(160,120,20,0.04)',
        ].join(', '),
      }}
    >
      {/* Mode tabs */}
      <div className="flex gap-3 mb-5">
        {modes.map(mode => {
          const isActive = activeMode === mode.id;
          return (
            <button
              key={mode.id}
              onClick={() => setActiveMode(mode.id)}
              className="rounded-xl text-left outline-none select-none"
              style={{
                flex: isActive ? '3 1 0%' : '1 1 0%',
                padding: isActive ? '14px 18px' : '12px 14px',
                display: 'flex', flexDirection: 'column', alignItems: 'flex-start',
                transition: 'all 0.28s cubic-bezier(0.34,1.2,0.64,1)',
                background: isActive
                  ? 'linear-gradient(145deg, rgba(14,20,30,0.97) 0%, rgba(8,14,24,0.99) 100%)'
                  : 'linear-gradient(145deg, rgba(8,12,18,0.85) 0%, rgba(5,8,14,0.92) 100%)',
                border: isActive ? '1px solid rgba(80,120,200,0.35)' : '1px solid rgba(80,100,160,0.10)',
                borderTop: isActive ? '1px solid rgba(100,150,240,0.45)' : '1px solid rgba(80,100,160,0.08)',
                boxShadow: isActive
                  ? 'inset 0 1px 0 rgba(100,150,240,0.18), 0 4px 16px rgba(0,0,0,0.4), 0 0 24px rgba(60,100,200,0.10)'
                  : 'inset 0 1px 0 rgba(255,255,255,0.02)',
              }}
              onMouseDown={e => { e.currentTarget.style.transform = 'translateY(2px) scale(0.98)'; }}
              onMouseUp={e => { e.currentTarget.style.transform = ''; }}
              onMouseLeave={e => { e.currentTarget.style.transform = ''; }}
            >
              <div className="mb-2">{mode.icon()}</div>
              <span style={{
                fontFamily: 'Inter, system-ui, -apple-system, sans-serif',
                fontSize: '14px', fontWeight: isActive ? 600 : 500,
                letterSpacing: '0.01em',
                color: mode.id === 'study'
                  ? '#6ed48a'
                  : isTestModeEnabled
                    ? '#6ed48a'
                    : '#c05a5a',
                lineHeight: 1.2,
                textShadow: mode.id === 'study' || isTestModeEnabled
                  ? '0 0 16px rgba(80,200,100,0.28)'
                  : '0 0 12px rgba(180,60,60,0.28)',
              }}>
                {mode.label}
              </span>
              <span style={{
                fontFamily: 'monospace', fontSize: '10px', marginTop: '4px',
                letterSpacing: '0.18em',
                color: 'rgba(74,122,181,0.65)',
              }}>
                {mode.number} / {mode.tag}
              </span>
            </button>
          );
        })}
      </div>

      {/* Description — always blue, red only when locked */}
      <p style={{
        fontFamily: 'Inter, system-ui, -apple-system, sans-serif',
        fontSize: '14px',
        fontWeight: 400,
        lineHeight: 1.75,
        color: isLocked ? '#c05a5a' : '#4a7ab5',
        textShadow: isLocked
          ? '0 0 16px rgba(180,60,60,0.30)'
          : '0 0 18px rgba(60,100,200,0.35)',
        minHeight: '2.8rem',
        marginBottom: '20px',
        letterSpacing: '0.01em',
      }}>
        {isLocked
          ? (testModeMessage || 'Not available for this paper type.')
          : modes.find(m => m.id === activeMode)?.description
        }
      </p>

      {/* Launch button */}
      <button
        onClick={handleLaunch}
        onMouseDown={() => setPressing(true)}
        onMouseUp={() => setPressing(false)}
        onMouseLeave={() => setPressing(false)}
        disabled={!isLaunchable}
        style={isLaunchable ? {
          width: '100%', padding: '14px', borderRadius: '12px',
          fontFamily: 'Inter, system-ui, -apple-system, sans-serif',
          fontSize: '14px', fontWeight: 600, letterSpacing: '0.06em',
          cursor: 'pointer', border: 'none', outline: 'none',
          background: pressing
            ? 'linear-gradient(180deg, rgba(8,14,26,0.99) 0%, rgba(10,16,30,0.99) 100%)'
            : 'linear-gradient(180deg, rgba(14,22,42,0.97) 0%, rgba(10,16,32,0.99) 50%, rgba(6,12,24,0.99) 100%)',
          color: pressing ? 'rgba(200,220,255,0.6)' : '#ffffff',
          textShadow: pressing ? 'none' : '0 0 20px rgba(120,170,255,0.3)',
          boxShadow: pressing
            ? 'inset 0 3px 8px rgba(0,0,0,0.7), 0 0 8px rgba(60,100,200,0.1)'
            : [
                '0 5px 0 rgba(0,0,0,0.5)',
                '0 7px 20px rgba(0,0,0,0.45)',
                'inset 0 1px 0 rgba(100,150,240,0.18)',
                '0 0 28px rgba(60,100,200,0.15)',
              ].join(', '),
          transform: pressing ? 'translateY(4px)' : 'translateY(0)',
          transition: 'all 0.08s ease',
          borderTop: '1px solid rgba(100,150,240,0.30)',
          borderLeft: '1px solid rgba(80,120,200,0.16)',
          borderRight: '1px solid rgba(60,100,180,0.10)',
          borderBottom: pressing ? '1px solid rgba(0,0,0,0.3)' : '1px solid rgba(0,0,0,0.5)',
        } : {
          width: '100%', padding: '14px', borderRadius: '12px',
          fontFamily: 'Inter, system-ui, -apple-system, sans-serif',
          fontSize: '14px', fontWeight: 500, letterSpacing: '0.06em',
          cursor: 'not-allowed',
          background: 'rgba(6,10,18,0.7)',
          color: 'rgba(80,100,160,0.3)',
          border: '1px solid rgba(60,80,140,0.08)',
          boxShadow: 'none', opacity: 0.45,
        }}
      >
        {isLocked ? 'Unavailable for this paper' : `${launchLabel} →`}
      </button>
    </div>
  );
}

// Made with Bob
