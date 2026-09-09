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
      { title: 'Mathematics International', code: '0580', description: 'Core and extended mathematics — algebra, geometry, statistics.', color: '#6B4F1E' },
      { title: 'Additional Mathematics',    code: '0606', description: 'Advanced algebra, calculus, trigonometry and coordinate geometry.', color: '#7B5E2A' },
    ],
  },
  {
    label: 'Sciences',
    subjects: [
      { title: 'Biology',   code: '0610', description: 'Life processes, cells, genetics, ecology and human physiology.', color: '#3A5228' },
      { title: 'Chemistry', code: '0620', description: 'Atomic structure, bonding, reactions and organic chemistry.', color: '#1E3A52' },
      { title: 'Physics',   code: '0625', description: 'Forces, energy, waves, electricity and nuclear physics.', color: '#2E1E52' },
    ],
  },
  {
    label: 'Languages',
    subjects: [
      { title: 'First Language English',     code: '0500', description: 'Reading, writing and directed writing skills.', color: '#5C3D1A' },
      { title: 'English as a Second Language', code: '0510', description: 'Listening, reading, writing and speaking skills.', color: '#4C3010' },
      { title: 'French Foreign Language',    code: '0520', description: 'Listening, reading, writing and speaking in French.', color: '#3A1E2A' },
      { title: 'Hindi as a Second Language', code: '0549', description: 'Listening, reading, writing and speaking in Hindi.', color: '#4A2E1A' },
    ],
  },
  {
    label: 'Social Sciences',
    subjects: [
      { title: 'Business Studies',      code: '0450', description: 'Business organisation, marketing, finance and operations.', color: '#4A3A2A' },
      { title: 'Economics',             code: '0455', description: 'Microeconomics, macroeconomics and international trade.', color: '#5E4A2A' },
      { title: 'Accounting',            code: '0452', description: 'Double-entry bookkeeping, final accounts and financial analysis.', color: '#1A3A2A' },
      { title: 'Computer Science',      code: '0478', description: 'Algorithms, programming, networks and databases.', color: '#1E2A3E' },
      { title: 'ICT',                   code: '0417', description: 'ICT applications, theory and practical skills.', color: '#2A2A3A' },
      { title: 'Global Perspectives',   code: '0457', description: 'Critical thinking and reflection on global issues.', color: '#5E2A3A' },
    ],
  },
  {
    label: 'More Subjects',
    subjects: [
      { title: 'History',         code: '0470', description: 'Depth studies and source-based analysis of 20th century history.', color: '#3A2A1A' },
      { title: 'Geography',       code: '0460', description: 'Geographical themes, skills, fieldwork and environmental issues.', color: '#2A3A2A' },
      { title: 'Travel & Tourism', code: '0448', description: 'Tourism industry, marketing, finance and global destinations.', color: '#2A3A4A' },
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

export default function IGCSESubjectsPage() {
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
              IGCSE
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
                  onClick={() => router.push(`/igcse/browse?subject=${subject.code}`)}
                />
              ))}
            </div>
          </div>
        ))}

        {/* Back link */}
        <div style={{ textAlign: 'center', marginTop: '16px' }}>
          <button
            onClick={() => router.push('/igcse')}
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
