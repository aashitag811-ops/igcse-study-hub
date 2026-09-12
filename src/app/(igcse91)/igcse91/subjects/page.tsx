'use client';

import React from 'react';
import { useRouter } from 'next/navigation';
import Header from '@/components/Header';

const SERIF = "'Cormorant Garamond', Georgia, serif";
const SANS  = "'DM Sans', system-ui, sans-serif";

interface Subject { title: string; code: string; papers: string[]; color: string; }

const CATEGORIES: { label: string; subjects: Subject[] }[] = [
  {
    label: 'Sciences',
    subjects: [
      { title: 'Biology', code: '0970', color: '#3A5228', papers: ['Paper 1: Multiple Choice (Core)', 'Paper 2: Multiple Choice (Extended)', 'Paper 3: Theory (Core)', 'Paper 4: Theory (Extended)', 'Paper 5: Practical Test', 'Paper 6: Alternative to Practical'] },
      { title: 'Chemistry', code: '0971', color: '#1E3A52', papers: ['Paper 1: Multiple Choice (Core)', 'Paper 2: Multiple Choice (Extended)', 'Paper 3: Theory (Core)', 'Paper 4: Theory (Extended)', 'Paper 5: Practical Test', 'Paper 6: Alternative to Practical'] },
      { title: 'Physics', code: '0972', color: '#2E1E52', papers: ['Paper 1: Multiple Choice (Core)', 'Paper 2: Multiple Choice (Extended)', 'Paper 3: Theory (Core)', 'Paper 4: Theory (Extended)', 'Paper 5: Practical Test', 'Paper 6: Alternative to Practical'] },
      { title: 'Co-ordinated Sciences', code: '0973', color: '#2A4A3A', papers: ['Paper 1: Multiple Choice (Core)', 'Paper 2: Multiple Choice (Extended)', 'Paper 3: Theory (Core)', 'Paper 4: Theory (Extended)', 'Paper 5: Practical Test', 'Paper 6: Alternative to Practical'] },
    ],
  },
  {
    label: 'Mathematics',
    subjects: [
      { title: 'Mathematics', code: '0980', color: '#6B4F1E', papers: ['Paper 1: Short Answer (Core)', 'Paper 2: Short Answer (Extended)', 'Paper 3: Structured Questions (Core)', 'Paper 4: Structured Questions (Extended)'] },
    ],
  },
  {
    label: 'Computer Science',
    subjects: [
      { title: 'Computer Science', code: '0984', color: '#1E2A3E', papers: ['Paper 1: Theory', 'Paper 2: Problem-Solving & Programming'] },
    ],
  },
  {
    label: 'Business & Economics',
    subjects: [
      { title: 'Business Studies', code: '0986', color: '#4A3A2A', papers: ['Paper 1: Short Answer & Data Response', 'Paper 2: Case Study'] },
      { title: 'Economics', code: '0987', color: '#5E4A2A', papers: ['Paper 1: Multiple Choice', 'Paper 2: Structured Questions'] },
      { title: 'Accounting', code: '0985', color: '#1A3A2A', papers: ['Paper 1: Multiple Choice', 'Paper 2: Structured Questions'] },
    ],
  },
  {
    label: 'Humanities',
    subjects: [
      { title: 'History', code: '0977', color: '#3A2A1A', papers: ['Paper 1: Core Content', 'Paper 2: Depth Study', 'Paper 4: Alternative to Coursework'] },
      { title: 'Geography', code: '0976', color: '#2A3A2A', papers: ['Paper 1: Geographical Themes', 'Paper 2: Geographical Skills', 'Paper 4: Alternative to Coursework'] },
    ],
  },
  {
    label: 'Languages',
    subjects: [
      { title: 'English — First Language', code: '0990', color: '#5C3D1A', papers: ['Paper 1: Reading', 'Paper 2: Directed Writing & Composition'] },
      { title: 'English Literature', code: '0992', color: '#4C3010', papers: ['Paper 1: Poetry & Prose', 'Paper 2: Drama', 'Paper 3: Poetry & Prose (coursework)', 'Paper 4: Drama (coursework)'] },
    ],
  },
];

function SubjectCard({ subject, onClick }: { subject: Subject; onClick: () => void }) {
  const [hovered, setHovered] = React.useState(false);
  return (
    <button onClick={onClick} onMouseEnter={() => setHovered(true)} onMouseLeave={() => setHovered(false)}
      style={{ background: hovered ? `linear-gradient(135deg, ${subject.color}cc 0%, ${subject.color}88 100%)` : `linear-gradient(135deg, ${subject.color}55 0%, ${subject.color}33 100%)`, border: `1px solid rgba(201,168,76,${hovered ? '0.45' : '0.15'})`, borderRadius: '12px', padding: '20px 24px', cursor: 'pointer', textAlign: 'left', transition: 'all 0.25s ease', transform: hovered ? 'translateY(-3px)' : 'translateY(0)', boxShadow: hovered ? '0 8px 32px rgba(0,0,0,0.4)' : '0 2px 8px rgba(0,0,0,0.2)', display: 'flex', flexDirection: 'column', gap: '10px', width: '100%' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <span style={{ fontFamily: SERIF, fontSize: '17px', fontWeight: 600, color: hovered ? '#f0e6c8' : '#d4c4a0', lineHeight: 1.3 }}>{subject.title}</span>
        <span style={{ fontFamily: SANS, fontSize: '10px', fontWeight: 700, letterSpacing: '0.18em', color: hovered ? 'rgba(201,168,76,0.9)' : 'rgba(201,168,76,0.5)', flexShrink: 0, marginLeft: '12px', paddingTop: '3px' }}>{subject.code}</span>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
        {subject.papers.map((p, i) => (
          <span key={i} style={{ fontFamily: SANS, fontSize: '12px', color: hovered ? 'rgba(220,200,160,0.85)' : 'rgba(180,155,110,0.65)', lineHeight: 1.45, display: 'flex', alignItems: 'baseline', gap: '6px' }}>
            <span style={{ color: hovered ? 'rgba(201,168,76,0.5)' : 'rgba(201,168,76,0.3)', fontSize: '9px', flexShrink: 0 }}>▸</span>{p}
          </span>
        ))}
      </div>
      {hovered && <span style={{ fontFamily: SANS, fontSize: '11px', color: 'rgba(201,168,76,0.7)', letterSpacing: '0.05em', marginTop: '2px' }}>Browse papers →</span>}
    </button>
  );
}

export default function IGCSE91SubjectsPage() {
  const router = useRouter();
  return (
    <main style={{ minHeight: '100vh', background: '#07090d' }}>
      <Header />
      <div style={{ maxWidth: '1100px', margin: '0 auto', padding: '40px 24px 80px' }}>
        <div style={{ textAlign: 'center', marginBottom: '48px' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '16px', marginBottom: '12px' }}>
            <div style={{ height: '1px', width: '64px', background: 'linear-gradient(to right, transparent, #C9A84C)' }} />
            <span style={{ fontFamily: SANS, fontSize: '10px', fontWeight: 700, letterSpacing: '0.35em', textTransform: 'uppercase', color: 'rgba(201,168,76,0.6)' }}>IGCSE 9-1</span>
            <div style={{ height: '1px', width: '64px', background: 'linear-gradient(to left, transparent, #C9A84C)' }} />
          </div>
          <h1 style={{ fontFamily: SERIF, fontSize: 'clamp(2rem, 4vw, 3rem)', fontWeight: 300, color: '#e8dcc4', letterSpacing: '0.05em', margin: '0 0 12px' }}>All Subjects</h1>
          <p style={{ fontFamily: SANS, fontSize: '14px', color: 'rgba(180,160,120,0.6)', maxWidth: '480px', margin: '0 auto' }}>Select a subject to browse past papers, mark schemes and examiner reports.</p>
        </div>
        {CATEGORIES.map(cat => (
          <div key={cat.label} style={{ marginBottom: '48px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '20px' }}>
              <span style={{ fontFamily: SERIF, fontSize: '13px', fontWeight: 700, letterSpacing: '0.2em', textTransform: 'uppercase', color: 'rgba(201,168,76,0.75)' }}>{cat.label}</span>
              <div style={{ flex: 1, height: '1px', background: 'linear-gradient(to right, rgba(201,168,76,0.25), transparent)' }} />
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '14px' }}>
              {cat.subjects.map(s => <SubjectCard key={s.code} subject={s} onClick={() => router.push(`/igcse91/practice?subject=${s.code}`)} />)}
            </div>
          </div>
        ))}
        <div style={{ textAlign: 'center', marginTop: '16px' }}>
          <button onClick={() => router.push('/igcse91')} style={{ fontFamily: SANS, fontSize: '12px', fontWeight: 600, letterSpacing: '0.1em', color: 'rgba(201,168,76,0.55)', background: 'none', border: 'none', cursor: 'pointer', textTransform: 'uppercase' }}>← Back to Library</button>
        </div>
      </div>
    </main>
  );
}
