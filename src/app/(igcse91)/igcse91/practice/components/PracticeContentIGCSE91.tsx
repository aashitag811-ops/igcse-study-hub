'use client';

import React, { useState, useEffect, useRef, useMemo } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { getPaperDescription, getSubjectName } from '@/lib/constants/subjectPaperConfig';
import { getComponentLabel, isComponentDisabled } from '@/lib/constants/syllabusChanges';
import { getTestModeUnavailableMessage } from '@/lib/constants/testModeSupport';
import BackButton from '@/components/BackButton';

interface PaperMetadata {
  id: string; subject: string; subjectCode: string; year: number;
  season: string; paperComponent: number; variant: number;
  filename: string; testModeAvailable: boolean;
}

const SEASON_CODES: { [key: string]: string } = { m: 'February March', s: 'May June', w: 'October November' };

const IGCSE91_SUBJECT_ORDER: Record<string, number> = {
  '0980': 1,  // Mathematics
  '0970': 2,  // Biology
  '0971': 3,  // Chemistry
  '0972': 4,  // Physics
  '0973': 5,  // Co-ordinated Sciences
  '0984': 6,  // Computer Science
  '0987': 7,  // Economics
  '0986': 8,  // Business Studies
  '0985': 9,  // Accounting
  '0977': 10, // History
  '0976': 11, // Geography
  '0990': 12, // English First Language
  '0992': 13, // English Literature
};

function sortSubjectsByPopularity(subjects: string[]): string[] {
  return [...subjects].sort((a, b) => {
    const codeA = a.match(/(\d{4})$/)?.[1] ?? '';
    const codeB = b.match(/(\d{4})$/)?.[1] ?? '';
    const rankA = IGCSE91_SUBJECT_ORDER[codeA] ?? 999;
    const rankB = IGCSE91_SUBJECT_ORDER[codeB] ?? 999;
    if (rankA !== rankB) return rankA - rankB;
    return a.localeCompare(b);
  });
}

const DUST = Array.from({ length: 38 }, (_, i) => ({
  id: i, size: 1.4 + (i * 6.3 % 2.2),
  left: (i * 19.7 + 5) % 100, top: (i * 27.3 + 11) % 100,
  dur: 14 + (i * 3.9 % 14), delay: (i * 2.8) % 10, anim: i % 3,
}));

const SERIF = "'Cormorant Garamond', 'Cormorant', Georgia, serif";
const selectClass = [
  'w-full px-4 py-3.5 rounded-xl appearance-none cursor-pointer',
  'bg-[#04080a] border border-[rgba(180,150,40,0.12)] text-white',
  'focus:border-[rgba(100,140,220,0.55)] focus:ring-2 focus:ring-[rgba(80,120,200,0.18)] outline-none',
  'hover:border-[rgba(180,150,40,0.25)] transition-all',
  'disabled:opacity-35 disabled:cursor-not-allowed tracking-wide',
].join(' ');
const SELECT_FONT: React.CSSProperties = { fontFamily: "'DM Sans', 'Inter', system-ui, sans-serif", fontSize: '15px', fontWeight: 500, letterSpacing: '0.01em' };
const labelClass = 'block text-[10px] font-bold tracking-[0.22em] uppercase mb-2';

const IGCSE91_CODES = new Set(['0970','0971','0972','0973','0976','0977','0978','0980','0984','0985','0986','0987','0989','0990','0992','0994','0995','7184']);

export default function PracticeContentIGCSE91() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const preferredMode = searchParams.get('mode');
  const urlSubjectCode = searchParams.get('subject');

  const [availablePapers, setAvailablePapers] = useState<PaperMetadata[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedSubject, setSelectedSubject] = useState('');
  const [selectedYear, setSelectedYear] = useState(2025);
  const [selectedSeason, setSelectedSeason] = useState('');
  const [selectedPaperComponent, setSelectedPaperComponent] = useState(1);
  const [selectedVariant, setSelectedVariant] = useState(1);

  const containerRef = useRef<HTMLDivElement>(null);
  const [glowPos, setGlowPos] = useState({ x: 50, y: 50 });
  const [glowVisible, setGlowVisible] = useState(false);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const handleMove = (e: MouseEvent) => {
      const rect = el.getBoundingClientRect();
      setGlowPos({ x: ((e.clientX - rect.left) / rect.width) * 100, y: ((e.clientY - rect.top) / rect.height) * 100 });
      setGlowVisible(true);
    };
    const handleLeave = () => setGlowVisible(false);
    el.addEventListener('mousemove', handleMove);
    el.addEventListener('mouseleave', handleLeave);
    return () => { el.removeEventListener('mousemove', handleMove); el.removeEventListener('mouseleave', handleLeave); };
  }, []);

  useEffect(() => {
    async function fetchPapers() {
      try {
        setLoading(true);
        const response = await fetch('/api/available-papers');
        const apiPapers = await response.json();
        // Filter to IGCSE 9-1 subject codes only
        const papers: PaperMetadata[] = apiPapers
          .filter((p: any) => IGCSE91_CODES.has(p.subjectCode))
          .map((paper: any) => ({
            id: paper.id, subject: `${getSubjectName(paper.subjectCode)} ${paper.subjectCode}`,
            subjectCode: paper.subjectCode, year: paper.year,
            season: SEASON_CODES[paper.session], paperComponent: paper.component,
            variant: paper.variant, filename: `${paper.id}.json`,
            testModeAvailable: paper.testModeAvailable ?? false,
          }));
        setAvailablePapers(papers);
        if (urlSubjectCode) {
          const seed = papers.find(p => p.subjectCode === urlSubjectCode);
          if (seed) {
            setSelectedSubject(seed.subject);
            const years = papers.filter(p => p.subjectCode === seed.subjectCode).map(p => p.year).sort((a, b) => b - a);
            const yr = years.includes(2025) ? 2025 : years[0];
            setSelectedYear(yr);
            const match = papers.find(p => p.subjectCode === seed.subjectCode && p.year === yr);
            if (match) { setSelectedSeason(match.season); setSelectedPaperComponent(match.paperComponent); setSelectedVariant(match.variant); }
          }
        }
      } catch (err) { console.error(err); } finally { setLoading(false); }
    }
    fetchPapers();
  }, [urlSubjectCode]);

  const subjects = useMemo(() => sortSubjectsByPopularity(Array.from(new Set(availablePapers.map(p => p.subject)))), [availablePapers]);
  const availableYears = useMemo(() => Array.from(new Set(availablePapers.filter(p => p.subject === selectedSubject).map(p => p.year))).sort((a, b) => b - a), [availablePapers, selectedSubject]);
  const availableSeasons = useMemo(() => Array.from(new Set(availablePapers.filter(p => p.subject === selectedSubject && p.year === selectedYear).map(p => p.season))), [availablePapers, selectedSubject, selectedYear]);
  const availablePaperComponents = useMemo(() => Array.from(new Set(availablePapers.filter(p => p.subject === selectedSubject && p.year === selectedYear && p.season === selectedSeason).map(p => p.paperComponent))).sort(), [availablePapers, selectedSubject, selectedYear, selectedSeason]);
  const availableVariants = useMemo(() => Array.from(new Set(availablePapers.filter(p => p.subject === selectedSubject && p.year === selectedYear && p.season === selectedSeason && p.paperComponent === selectedPaperComponent).map(p => p.variant))).sort(), [availablePapers, selectedSubject, selectedYear, selectedSeason, selectedPaperComponent]);

  useEffect(() => { if (availableYears.length && !availableYears.includes(selectedYear)) setSelectedYear(availableYears[0]); }, [availableYears]);
  useEffect(() => { if (availableSeasons.length && !availableSeasons.includes(selectedSeason)) setSelectedSeason(availableSeasons[0]); }, [availableSeasons]);
  useEffect(() => { if (availablePaperComponents.length && !availablePaperComponents.includes(selectedPaperComponent)) setSelectedPaperComponent(availablePaperComponents[0]); }, [availablePaperComponents]);
  useEffect(() => { if (availableVariants.length && !availableVariants.includes(selectedVariant)) setSelectedVariant(availableVariants[0]); }, [availableVariants]);

  const selectedPaper = availablePapers.find(p => p.subject === selectedSubject && p.year === selectedYear && p.season === selectedSeason && p.paperComponent === selectedPaperComponent && p.variant === selectedVariant);
  const testModeEnabled = selectedPaper?.testModeAvailable ?? false;

  const handleViewPastPapers = () => { if (selectedPaper) router.push(`/igcse91/view-papers/${selectedPaper.id}`); };
  const handleStartPractice = () => { if (selectedPaper && testModeEnabled) router.push(`/igcse91/mcq-exam/${selectedPaper.id}`); };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: '#03060a' }}>
        <div className="text-center space-y-4">
          <div className="w-10 h-10 border-2 border-[#1a3a5c]/30 border-t-[#1a5a9c] rounded-full animate-spin mx-auto" />
          <p className="font-body text-xs tracking-widest uppercase text-[#2a4a6a]">Loading archive...</p>
        </div>
      </div>
    );
  }

  return (
    <div ref={containerRef} className="relative min-h-screen flex flex-col items-center py-16 px-4 overflow-hidden" style={{ background: '#03060a' }}>
      <div className="pointer-events-none absolute inset-0" style={{ background: 'radial-gradient(ellipse at 50% 50%, transparent 35%, rgba(160,120,20,0.10) 70%, rgba(140,100,10,0.22) 100%)', zIndex: 0 }} />
      <div className="pointer-events-none absolute inset-0" style={{ boxShadow: 'inset 0 0 140px rgba(160,120,20,0.09), inset 0 0 70px rgba(160,120,20,0.06)', zIndex: 0 }} />
      <div className="pointer-events-none absolute inset-0" style={{ zIndex: 1, opacity: glowVisible ? 1 : 0, transition: 'opacity 0.4s ease', background: `radial-gradient(circle 380px at ${glowPos.x}% ${glowPos.y}%, rgba(200,168,76,0.09) 0%, rgba(180,140,30,0.04) 50%, transparent 100%)` }} />
      <div className="pointer-events-none absolute inset-0" style={{ zIndex: 2 }}>
        {DUST.map(p => (
          <div key={p.id} style={{ position: 'absolute', width: `${p.size}px`, height: `${p.size}px`, borderRadius: '50%', left: `${p.left}%`, top: `${p.top}%`, background: 'radial-gradient(circle, rgba(255,210,60,1) 0%, rgba(200,160,40,0.5) 55%, transparent 100%)', boxShadow: '0 0 5px rgba(255,200,40,0.8), 0 0 12px rgba(180,140,30,0.4)', animation: `dust${p.anim} ${p.dur}s ease-in-out infinite`, animationDelay: `${p.delay}s`, opacity: 0 }} />
        ))}
      </div>

      {/* Curriculum switcher */}
      <div style={{ position:'fixed', top:'80px', right:'24px', zIndex:50, display:'flex', alignItems:'center', gap:'2px', padding:'3px', borderRadius:'8px', background:'rgba(200,168,76,0.07)', border:'1px solid rgba(200,168,76,0.15)', backdropFilter:'blur(8px)' }}>
        {([{ label:'IGCSE', href:'/igcse/practice' }, { label:'IGCSE 9-1', href:'/igcse91/practice' }, { label:'O Level', href:'/olevel/practice' }, { label:'A Levels', href:'/alevels/practice' }] as const).map(({ label, href }) => (
          <a key={href} href={href} style={{ fontFamily: SERIF, fontSize:'12px', fontWeight:500, padding:'4px 10px', borderRadius:'6px', color: href === '/igcse91/practice' ? '#1a1208' : 'rgba(200,168,76,0.6)', background: href === '/igcse91/practice' ? '#C9A84C' : 'transparent', textDecoration:'none', transition:'all 0.2s ease', whiteSpace:'nowrap' }}>{label}</a>
        ))}
      </div>

      <div className="relative w-full max-w-2xl" style={{ zIndex: 3 }}>
        <BackButton />
        <div className="text-center mt-6 mb-10">
          <h1 style={{ fontFamily: SERIF, fontSize: 'clamp(2.4rem, 5.5vw, 3.4rem)', fontWeight: 700, color: '#ffffff', letterSpacing: '0.02em', lineHeight: 1.2, textShadow: '0 0 40px rgba(255,255,255,0.12)' }}>Start Practising</h1>
          <p style={{ fontFamily: SERIF, fontStyle: 'italic', fontSize: '17px', fontWeight: 500, marginTop: '8px', color: '#2a4a8a', letterSpacing: '0.03em' }}>IGCSE 9-1 — Choose your subject, year, and paper</p>
          <div className="mt-5 flex items-center justify-center gap-3">
            <div className="h-px w-14" style={{ background: 'linear-gradient(to right, transparent, rgba(200,168,76,0.35))' }} />
            <div className="w-1.5 h-1.5 rounded-full" style={{ background: 'rgba(200,168,76,0.4)' }} />
            <div className="h-px w-14" style={{ background: 'linear-gradient(to left, transparent, rgba(200,168,76,0.35))' }} />
          </div>
        </div>

        <div className="rounded-2xl p-8" style={{ background: 'linear-gradient(160deg, rgba(10,16,8,0.94) 0%, rgba(6,10,4,0.97) 100%)', backdropFilter: 'blur(18px)', border: '1px solid rgba(180,150,40,0.14)', borderTop: '1px solid rgba(200,168,76,0.22)', boxShadow: '0 0 0 1px rgba(0,0,0,0.55), 0 24px 70px rgba(0,0,0,0.6)' }}>
          <div className="grid grid-cols-2 gap-5">
            <div className="col-span-2">
              <label className={labelClass} style={{ fontFamily: SERIF, color: '#4a7ab5', fontSize: '11px', letterSpacing: '0.22em' }}>Subject</label>
              <select value={selectedSubject} onChange={e => setSelectedSubject(e.target.value)} className={selectClass} style={SELECT_FONT}>
                <option value="">Select Subject</option>
                {subjects.map(s => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
            <div>
              <label className={labelClass} style={{ fontFamily: SERIF, color: '#4a7ab5', fontSize: '11px', letterSpacing: '0.22em' }}>Year</label>
              <select value={selectedYear} onChange={e => setSelectedYear(Number(e.target.value))} disabled={!availableYears.length} className={selectClass} style={SELECT_FONT}>
                {availableYears.map(y => <option key={y} value={y}>{y}</option>)}
              </select>
            </div>
            <div>
              <label className={labelClass} style={{ fontFamily: SERIF, color: '#4a7ab5', fontSize: '11px', letterSpacing: '0.22em' }}>Session</label>
              <select value={selectedSeason} onChange={e => setSelectedSeason(e.target.value)} disabled={!availableSeasons.length} className={selectClass} style={SELECT_FONT}>
                {availableSeasons.map(s => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
            <div>
              <label className={labelClass} style={{ fontFamily: SERIF, color: '#4a7ab5', fontSize: '11px', letterSpacing: '0.22em' }}>Paper</label>
              <select value={selectedPaperComponent} onChange={e => setSelectedPaperComponent(Number(e.target.value))} disabled={!availablePaperComponents.length} className={selectClass} style={SELECT_FONT}>
                {availablePaperComponents.map(c => {
                  const sc = selectedSubject.split(' ').pop() || '';
                  const desc = getPaperDescription(sc, c, selectedYear);
                  const lbl = getComponentLabel(sc, c.toString(), selectedYear);
                  const dis = isComponentDisabled(sc, c.toString(), selectedYear);
                  return <option key={c} value={c} disabled={dis}>{desc}{lbl ? ` [${lbl.label}]` : ''}</option>;
                })}
              </select>
            </div>
            <div>
              <label className={labelClass} style={{ fontFamily: SERIF, color: '#4a7ab5', fontSize: '11px', letterSpacing: '0.22em' }}>Variant</label>
              <select value={selectedVariant} onChange={e => setSelectedVariant(Number(e.target.value))} disabled={!availableVariants.length} className={selectClass} style={SELECT_FONT}>
                {availableVariants.map(v => <option key={v} value={v}>Variant {v}</option>)}
              </select>
            </div>
          </div>
          {!selectedPaper && selectedSubject && (
            <div className="mt-5 rounded-xl p-3 text-center" style={{ background: 'rgba(20,6,12,0.7)', border: '1px solid rgba(160,40,60,0.15)' }}>
              <p style={{ fontFamily: SERIF, fontStyle: 'italic', fontSize: '14px', color: 'rgba(160,80,100,0.6)' }}>No paper available for this combination</p>
            </div>
          )}
        </div>

        <div className="mt-5 flex flex-col gap-3">
          <button onClick={handleViewPastPapers} disabled={!selectedPaper} className="w-full py-4 rounded-xl font-semibold text-white transition-all disabled:opacity-30 disabled:cursor-not-allowed" style={{ background: selectedPaper ? 'linear-gradient(135deg, #1a3a6c, #0e2244)' : 'rgba(30,50,80,0.3)', border: '1px solid rgba(100,140,220,0.3)', fontFamily: SERIF, fontSize: '16px', letterSpacing: '0.04em' }}>
            View Past Paper
          </button>
          {testModeEnabled && (
            <button onClick={handleStartPractice} className="w-full py-4 rounded-xl font-semibold text-white transition-all" style={{ background: 'linear-gradient(135deg, #7c3a1c, #4a1e08)', border: '1px solid rgba(200,120,40,0.3)', fontFamily: SERIF, fontSize: '16px', letterSpacing: '0.04em' }}>
              Start MCQ Practice
            </button>
          )}
        </div>
      </div>

      <style jsx>{`
        @keyframes dust0 { 0%{transform:translate(0,0);opacity:0} 15%{opacity:.8} 50%{transform:translate(16px,-52px);opacity:.9} 85%{opacity:.6} 100%{transform:translate(0,0);opacity:0} }
        @keyframes dust1 { 0%{transform:translate(0,0);opacity:0} 15%{opacity:.7} 50%{transform:translate(-20px,-44px);opacity:.85} 85%{opacity:.55} 100%{transform:translate(0,0);opacity:0} }
        @keyframes dust2 { 0%{transform:translate(0,0);opacity:0} 20%{opacity:.75} 50%{transform:translate(10px,-64px);opacity:.95} 80%{opacity:.5} 100%{transform:translate(0,0);opacity:0} }
      `}</style>
    </div>
  );
}
