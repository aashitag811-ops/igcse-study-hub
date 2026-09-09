'use client';

import React from 'react';
import { useRouter } from 'next/navigation';
import Header from '@/components/Header';

const SERIF = "'Cormorant Garamond', Georgia, serif";
const SANS  = "'DM Sans', system-ui, sans-serif";

interface Subject {
  title: string;
  code: string;
  description: string;
  color: string;
}

const CATEGORIES: { label: string; subjects: Subject[] }[] = [
  {
    label: 'Mathematics',
    subjects: [
      { title: 'Mathematics',         code: '9709', description: 'Pure Maths 1–3, Mechanics, Probability & Statistics 1–2.', color: '#5A6E8C' },
      { title: 'Further Mathematics', code: '9231', description: 'Further Pure, Further Statistics, Further Mechanics.', color: '#4A5E7C' },
    ],
  },
  {
    label: 'Sciences',
    subjects: [
      { title: 'Biology',   code: '9700', description: 'Cell biology, genetics, ecology, physiology and practical skills.', color: '#3A5228' },
      { title: 'Chemistry', code: '9701', description: 'Physical, organic and inorganic chemistry with practicals.', color: '#1E3A52' },
      { title: 'Physics',   code: '9702', description: 'Mechanics, waves, electricity, fields and nuclear physics.', color: '#2E1E52' },
    ],
  },
  {
    label: 'Commerce',
    subjects: [
      { title: 'Business',    code: '9609', description: 'Marketing, finance, operations, HR and strategic management.', color: '#4A3A2A' },
      { title: 'Economics',   code: '9708', description: 'Microeconomics, macroeconomics, international trade and development.', color: '#5E4A2A' },
      { title: 'Accounting',  code: '9706', description: 'Financial accounting, management accounting and analysis.', color: '#1A3A2A' },
    ],
  },
  {
    label: 'Languages',
    subjects: [
      { title: 'English Language',      code: '9093', description: 'Reading, writing, text analysis and language use.', color: '#5C3D1A' },
      { title: 'English General Paper', code: '8021', description: 'Essay writing and comprehension on global topics.', color: '#4C3010' },
    ],
  },
  {
    label: 'More Subjects',
    subjects: [
      { title: 'Computer Science (9618)', code: '9618', description: 'Theory, problem-solving and advanced programming — new syllabus.', color: '#1E2E3E' },
      { title: 'Computer Science (9608)', code: '9608', description: 'Theory, problem-solving and programming — old syllabus.', color: '#1A2A3A' },
    ],
  },
];

function SubjectCard({ subject, onClick }: { subject: Subject; onClick: () => void }) {
  const [hovered, setHovered] = React.useState(false);

  return (
    <button
      onClick={onClick}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        background: hovered
          ? `linear-gradient(135deg, ${subject.color}cc 0%, ${subject.color}88 100%)`
          : `linear-gradient(135deg, ${subject.color}55 0%, ${subject.color}33 100%)`,
        border: `1px solid rgba(201,168,76,${hovered ? '0.45' : '0.15'})`,
        borderRadius: '12px',
        padding: '20px 24px',
        cursor: 'pointer',
        textAlign: 'left',
        transition: 'all 0.25s ease',
        transform: hovered ? 'translateY(-3px)' : 'translateY(0)',
        boxShadow: hovered ? '0 8px 32px rgba(0,0,0,0.4), 0 0 0 1px rgba(201,168,76,0.2)' : '0 2px 8px rgba(0,0,0,0.2)',
        display: 'flex',
        flexDirection: 'column',
        gap: '8px',
        minHeight: '110px',
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <span style={{
          fontFamily: SERIF,
          fontSize: '16px',
          fontWeight: 600,
          color: hovered ? '#f0e6c8' : '#d4c4a0',
          lineHeight: 1.3,
          letterSpacing: '0.01em',
        }}>
          {subject.title}
        </span>
        <span style={{
          fontFamily: SANS,
          fontSize: '10px',
          fontWeight: 700,
          letterSpacing: '0.18em',
          color: hovered ? 'rgba(201,168,76,0.9)' : 'rgba(201,168,76,0.5)',
          flexShrink: 0,
          marginLeft: '12px',
          paddingTop: '2px',
          transition: 'color 0.25s ease',
        }}>
          {subject.code}
        </span>
      </div>
      <span style={{
        fontFamily: SANS,
        fontSize: '12px',
        color: 'rgba(180,160,120,0.7)',
        lineHeight: 1.5,
      }}>
        {subject.description}
      </span>
      {hovered && (
        <span style={{
          fontFamily: SANS,
          fontSize: '11px',
          color: 'rgba(201,168,76,0.7)',
          letterSpacing: '0.05em',
          marginTop: '2px',
        }}>
          Browse papers →
        </span>
      )}
    </button>
  );
}

export default function ALevelsSubjectsPage() {
  const router = useRouter();

  return (
    <main style={{ minHeight: '100vh', background: '#07090d' }}>
      <Header />

      <div style={{ maxWidth: '1100px', margin: '0 auto', padding: '40px 24px 80px' }}>

        {/* Page heading */}
        <div style={{ textAlign: 'center', marginBottom: '48px' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '16px', marginBottom: '12px' }}>
            <div style={{ height: '1px', width: '64px', background: 'linear-gradient(to right, transparent, #C9A84C)' }} />
            <span style={{ fontFamily: SANS, fontSize: '10px', fontWeight: 700, letterSpacing: '0.35em', textTransform: 'uppercase', color: 'rgba(201,168,76,0.6)' }}>
              A Levels
            </span>
            <div style={{ height: '1px', width: '64px', background: 'linear-gradient(to left, transparent, #C9A84C)' }} />
          </div>
          <h1 style={{ fontFamily: SERIF, fontSize: 'clamp(2rem, 4vw, 3rem)', fontWeight: 300, color: '#e8dcc4', letterSpacing: '0.05em', margin: '0 0 12px' }}>
            All Subjects
          </h1>
          <p style={{ fontFamily: SANS, fontSize: '14px', color: 'rgba(180,160,120,0.6)', maxWidth: '480px', margin: '0 auto' }}>
            Select a subject to browse past papers, mark schemes and examiner reports.
          </p>
        </div>

        {/* Category sections */}
        {CATEGORIES.map(cat => (
          <div key={cat.label} style={{ marginBottom: '48px' }}>
            {/* Category label */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '20px' }}>
              <span style={{
                fontFamily: SERIF,
                fontSize: '13px',
                fontWeight: 700,
                letterSpacing: '0.2em',
                textTransform: 'uppercase',
                color: 'rgba(201,168,76,0.75)',
              }}>
                {cat.label}
              </span>
              <div style={{ flex: 1, height: '1px', background: 'linear-gradient(to right, rgba(201,168,76,0.25), transparent)' }} />
            </div>

            {/* Subject grid */}
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))',
              gap: '14px',
            }}>
              {cat.subjects.map(subject => (
                <SubjectCard
                  key={subject.code}
                  subject={subject}
                  onClick={() => router.push(`/alevels/browse?subject=${subject.code}`)}
                />
              ))}
            </div>
          </div>
        ))}

        {/* Back link */}
        <div style={{ textAlign: 'center', marginTop: '16px' }}>
          <button
            onClick={() => router.push('/alevels')}
            style={{
              fontFamily: SANS,
              fontSize: '12px',
              fontWeight: 600,
              letterSpacing: '0.1em',
              color: 'rgba(201,168,76,0.55)',
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              textTransform: 'uppercase',
            }}
          >
            ← Back to Library
          </button>
        </div>
      </div>
    </main>
  );
}

// Made with Bob
