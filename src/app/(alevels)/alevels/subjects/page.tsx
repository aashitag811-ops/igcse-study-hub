'use client';

import React from 'react';
import { useRouter } from 'next/navigation';
import Header from '@/components/Header';

const SERIF = "'Cormorant Garamond', Georgia, serif";
const SANS  = "'DM Sans', system-ui, sans-serif";

interface Subject {
  title: string;
  code: string;
  papers: string[];
  color: string;
}

const CATEGORIES: { label: string; subjects: Subject[] }[] = [
  {
    label: 'Mathematics',
    subjects: [
      { title: 'Mathematics', code: '9709', color: '#5A6E8C', papers: ['Paper 1: Pure Mathematics 1', 'Paper 2: Pure Mathematics 2 (AS)', 'Paper 3: Pure Mathematics 3', 'Paper 4: Mechanics', 'Paper 5: Probability & Statistics 1', 'Paper 6: Probability & Statistics 2'] },
      { title: 'Further Mathematics', code: '9231', color: '#4A5E7C', papers: ['Paper 1: Further Pure Mathematics 1', 'Paper 2: Further Pure Mathematics 2', 'Paper 3: Further Mechanics', 'Paper 4: Further Probability & Statistics'] },
    ],
  },
  {
    label: 'Sciences',
    subjects: [
      { title: 'Biology', code: '9700', color: '#3A5228', papers: ['Paper 1: Multiple Choice', 'Paper 2: AS Structured Questions', 'Paper 3: Advanced Practical Skills', 'Paper 4: A Level Structured Questions', 'Paper 5: Planning, Analysis & Evaluation'] },
      { title: 'Chemistry', code: '9701', color: '#1E3A52', papers: ['Paper 1: Multiple Choice', 'Paper 2: AS Structured Questions', 'Paper 3: Advanced Practical Skills', 'Paper 4: A Level Structured Questions', 'Paper 5: Planning, Analysis & Evaluation'] },
      { title: 'Physics', code: '9702', color: '#2E1E52', papers: ['Paper 1: Multiple Choice', 'Paper 2: AS Structured Questions', 'Paper 3: Advanced Practical Skills', 'Paper 4: A Level Structured Questions', 'Paper 5: Planning, Analysis & Evaluation'] },
    ],
  },
  {
    label: 'Computer Science',
    subjects: [
      { title: 'Computer Science', code: '9618', color: '#1E2A3E', papers: ['Paper 1: Theory Fundamentals', 'Paper 2: Fundamental Problem-Solving & Programming', 'Paper 3: Advanced Theory', 'Paper 4: Further Problem-Solving & Programming'] },
      { title: 'Computer Science (old spec)', code: '9608', color: '#1A2030', papers: ['Paper 1: Theory', 'Paper 2: Problem-Solving & Programming', 'Paper 3: Advanced Theory', 'Paper 4: Further Problem-Solving & Programming'] },
      { title: 'Computing', code: '9691', color: '#1A2A3A', papers: ['Paper 1: Theory', 'Paper 2: Practical', 'Paper 3: Theory'] },
    ],
  },
  {
    label: 'Business & Economics',
    subjects: [
      { title: 'Business', code: '9609', color: '#4A3A2A', papers: ['Paper 1: Short Answer & Essay', 'Paper 2: Data Response', 'Paper 3: Case Study'] },
      { title: 'Economics', code: '9708', color: '#5E4A2A', papers: ['Paper 1: Multiple Choice (AS)', 'Paper 2: Data Response & Essays (AS)', 'Paper 3: Multiple Choice (A Level)', 'Paper 4: Data Response & Essays (A Level)'] },
      { title: 'Accounting', code: '9706', color: '#1A3A2A', papers: ['Paper 1: Multiple Choice', 'Paper 2: Structured Questions (AS)', 'Paper 3: Structured Questions (A Level)', 'Paper 4: Problem Solving'] },
    ],
  },
  {
    label: 'Humanities & Social Sciences',
    subjects: [
      { title: 'Law', code: '9084', color: '#3A2A1A', papers: ['Paper 1: Principles of Law', 'Paper 2: Law Making', 'Paper 3: Law of Contract', 'Paper 4: Law of Tort'] },
      { title: 'History', code: '9489', color: '#2A1A0A', papers: ['Paper 1: Historical Interpretations', 'Paper 2: Outline Study', 'Paper 3: Depth Study', 'Paper 4: Historical Investigation'] },
      { title: 'Sociology', code: '9699', color: '#3A2A3A', papers: ['Paper 1: Sociological Perspectives', 'Paper 2: Research Methods & Sociological Perspectives', 'Paper 3: Social Inequality', 'Paper 4: Global Development'] },
      { title: 'Psychology', code: '9990', color: '#2A1A3A', papers: ['Paper 1: Introductory Psychology', 'Paper 2: Research Methods', 'Paper 3: Psychological Enquiry', 'Paper 4: Applied Psychology'] },
      { title: 'Psychology (old spec)', code: '9698', color: '#1A1A3A', papers: ['Paper 1: Psychological Investigations', 'Paper 2: Core Studies', 'Paper 3: Extensions'] },
    ],
  },
  {
    label: 'Languages',
    subjects: [
      { title: 'English Language', code: '9093', color: '#5C3D1A', papers: ['Paper 1: Reading', 'Paper 2: Writing', 'Paper 3: Text Analysis', 'Paper 4: Language Topics'] },
      { title: 'English General Paper', code: '8021', color: '#4C3010', papers: ['Paper 1: Comprehension', 'Paper 2: Essay'] },
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
        background: hovered ? `linear-gradient(135deg, ${subject.color}cc 0%, ${subject.color}88 100%)` : `linear-gradient(135deg, ${subject.color}55 0%, ${subject.color}33 100%)`,
        border: `1px solid rgba(201,168,76,${hovered ? '0.45' : '0.15'})`,
        borderRadius: '12px', padding: '20px 24px', cursor: 'pointer', textAlign: 'left',
        transition: 'all 0.25s ease', transform: hovered ? 'translateY(-3px)' : 'translateY(0)',
        boxShadow: hovered ? '0 8px 32px rgba(0,0,0,0.4), 0 0 0 1px rgba(201,168,76,0.2)' : '0 2px 8px rgba(0,0,0,0.2)',
        display: 'flex', flexDirection: 'column', gap: '10px', width: '100%',
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <span style={{ fontFamily: SERIF, fontSize: '17px', fontWeight: 600, color: hovered ? '#f0e6c8' : '#d4c4a0', lineHeight: 1.3 }}>{subject.title}</span>
        <span style={{ fontFamily: SANS, fontSize: '10px', fontWeight: 700, letterSpacing: '0.18em', color: hovered ? 'rgba(201,168,76,0.9)' : 'rgba(201,168,76,0.5)', flexShrink: 0, marginLeft: '12px', paddingTop: '3px' }}>{subject.code}</span>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
        {subject.papers.map((p, i) => (
          <span key={i} style={{ fontFamily: SANS, fontSize: '12px', color: hovered ? 'rgba(220,200,160,0.85)' : 'rgba(180,155,110,0.65)', lineHeight: 1.45, display: 'flex', alignItems: 'baseline', gap: '6px' }}>
            <span style={{ color: hovered ? 'rgba(201,168,76,0.5)' : 'rgba(201,168,76,0.3)', fontSize: '9px', flexShrink: 0 }}>▸</span>
            {p}
          </span>
        ))}
      </div>
      {hovered && <span style={{ fontFamily: SANS, fontSize: '11px', color: 'rgba(201,168,76,0.7)', letterSpacing: '0.05em', marginTop: '2px' }}>Browse papers →</span>}
    </button>
  );
}

export default function ALevelsSubjectsPage() {
  const router = useRouter();
  return (
    <main style={{ minHeight: '100vh', background: '#07090d' }}>
      <Header />
      <div style={{ maxWidth: '1100px', margin: '0 auto', padding: '40px 24px 80px' }}>
        <div style={{ textAlign: 'center', marginBottom: '48px' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '16px', marginBottom: '12px' }}>
            <div style={{ height: '1px', width: '64px', background: 'linear-gradient(to right, transparent, #C9A84C)' }} />
            <span style={{ fontFamily: SANS, fontSize: '10px', fontWeight: 700, letterSpacing: '0.35em', textTransform: 'uppercase', color: 'rgba(201,168,76,0.6)' }}>AS & A Level</span>
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
              {cat.subjects.map(s => <SubjectCard key={s.code} subject={s} onClick={() => router.push(`/alevels/practice?subject=${s.code}`)} />)}
            </div>
          </div>
        ))}
        <div style={{ textAlign: 'center', marginTop: '16px' }}>
          <button onClick={() => router.push('/alevels')} style={{ fontFamily: SANS, fontSize: '12px', fontWeight: 600, letterSpacing: '0.1em', color: 'rgba(201,168,76,0.55)', background: 'none', border: 'none', cursor: 'pointer', textTransform: 'uppercase' }}>← Back to Library</button>
        </div>
      </div>
    </main>
  );
}
