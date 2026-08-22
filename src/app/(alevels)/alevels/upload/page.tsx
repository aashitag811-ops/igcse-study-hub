'use client';

import { Suspense, useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { ALEVEL_SUBJECTS } from '@/lib/constants/alevels-subjects';
import { RESOURCE_TYPES } from '@/lib/constants/resourceTypes';
import Header from '@/components/Header';

const SERIF  = "'Cormorant Garamond', 'Cormorant', Georgia, serif";
const SANS   = "'DM Sans', 'Inter', system-ui, sans-serif";
const GOLD   = '#C9A84C';
const GOLD2  = '#D4B96A';
const BG     = '#0c1018';
const SURFACE  = 'rgba(255,255,255,0.015)';
const BORDER   = 'rgba(200,168,76,0.08)';
const BORDER2  = 'rgba(200,168,76,0.2)';
const TEXT   = '#E8DCC4';
const MUTED  = 'rgba(196,176,138,0.45)';

const CREATORS = ['arinjaysaha2010@gmail.com', 'aashitag811@gmail.com'];

const DUST = Array.from({ length: 48 }, (_, i) => ({
  id: i, size: 1.8 + (i * 5.7 % 3.2),
  left: (i * 18.3 + 6) % 100, top: (i * 24.7 + 9) % 100,
  dur: 14 + (i * 3.3 % 12), delay: (i * 2.9) % 10, anim: i % 3,
}));

const inputStyle: React.CSSProperties = {
  width: '100%', background: 'rgba(6,10,18,0.7)',
  border: `1px solid ${BORDER}`, borderTop: `1px solid ${BORDER2}`,
  borderRadius: '8px', padding: '11px 14px',
  fontFamily: SANS, fontSize: '14px', color: TEXT,
  outline: 'none', transition: 'border-color 0.18s',
};

const labelStyle: React.CSSProperties = {
  display: 'block', fontFamily: SANS, fontSize: '0.75rem',
  fontWeight: 600, letterSpacing: '0.12em', textTransform: 'uppercase',
  color: MUTED, marginBottom: '7px',
};

function UploadContent() {
  const router       = useRouter();
  const searchParams = useSearchParams();
  const [userEmail, setUserEmail] = useState<string | null>(null);
  const [userId, setUserId]       = useState<string | null>(null);
  const [loading, setLoading]     = useState(false);
  const [success, setSuccess]     = useState(false);
  const [isPending, setIsPending] = useState(false);
  const [error, setError]         = useState('');
  const [glowPos, setGlowPos]     = useState({ x: 0, y: 0 });
  const [glowVisible, setGlowVisible] = useState(false);

  const [formData, setFormData] = useState({
    title: '', subject: '', resourceType: '', link: '', description: '',
  });

  const isCreator = CREATORS.includes(userEmail ?? '');

  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getUser().then(({ data }) => {
      if (!data.user) { router.push('/igcse/login'); return; }
      setUserId(data.user.id);
      setUserEmail(data.user.email ?? null);
    });
    const subjectParam = searchParams.get('subject');
    if (subjectParam) setFormData(prev => ({ ...prev, subject: subjectParam }));
  }, [searchParams, router]);

  useEffect(() => {
    const move  = (e: MouseEvent) => { setGlowPos({ x: e.clientX, y: e.clientY }); setGlowVisible(true); };
    const leave = () => setGlowVisible(false);
    window.addEventListener('mousemove', move);
    window.addEventListener('mouseleave', leave);
    return () => { window.removeEventListener('mousemove', move); window.removeEventListener('mouseleave', leave); };
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true); setError('');

    if (!formData.title || !formData.subject || !formData.resourceType || !formData.link) {
      setError('Please fill in all required fields'); setLoading(false); return;
    }
    try { new URL(formData.link); } catch {
      setError('Please enter a valid URL'); setLoading(false); return;
    }

    const supabase = createClient();
    const status   = isCreator ? 'approved' : 'pending';

    const { error: insertError } = await supabase.from('resources').insert({
      title: formData.title, subject: formData.subject,
      resource_type: formData.resourceType, link: formData.link,
      description: formData.description, uploader_id: userId,
      upvote_count: 0, status,
    } as any);

    if (insertError) { setError(insertError.message || 'Failed to submit'); setLoading(false); return; }

    setSuccess(true); setIsPending(!isCreator);
    setFormData({ title: '', subject: '', resourceType: '', link: '', description: '' });
    if (isCreator) setTimeout(() => router.push('/alevels/browse'), 2000);
    setLoading(false);
  };

  if (!userId) return (
    <div style={{ minHeight: '100vh', background: BG, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ fontFamily: SERIF, color: MUTED, fontSize: '1.25rem' }}>Checking authentication…</div>
    </div>
  );

  return (
    <div style={{ minHeight: '100vh', background: BG, position: 'relative', overflowX: 'hidden' }}>
      {/* Dust */}
      <div className="pointer-events-none" style={{ position:'fixed', inset:0, zIndex:0 }}>
        {DUST.map(p => (
          <div key={p.id} style={{ position:'absolute', width:`${p.size}px`, height:`${p.size}px`, borderRadius:'50%', left:`${p.left}%`, top:`${p.top}%`, background:'radial-gradient(circle, rgba(255,218,80,1) 0%, rgba(212,175,55,0.65) 50%, transparent 100%)', boxShadow:'0 0 8px rgba(255,210,60,0.95), 0 0 18px rgba(200,160,40,0.55)', animation:`dust${p.anim} ${p.dur}s ease-in-out infinite`, animationDelay:`${p.delay}s`, opacity:0 }} />
        ))}
      </div>
      {/* Cursor glow */}
      <div className="pointer-events-none" style={{ position:'fixed', inset:0, zIndex:1, opacity:glowVisible?1:0, transition:'opacity 0.4s ease', background:`radial-gradient(circle 360px at ${glowPos.x}px ${glowPos.y}px, rgba(200,168,76,0.07) 0%, rgba(180,140,30,0.03) 50%, transparent 100%)` }} />

      <Header />

      <div style={{ position:'relative', zIndex:2, maxWidth:680, margin:'0 auto', padding:'96px 24px 60px' }}>
        <div style={{ textAlign:'center', marginBottom:'2.5rem' }}>
          <h1 style={{ fontFamily:SERIF, fontSize:'clamp(2rem,4vw,2.8rem)', fontWeight:400, color:GOLD2, letterSpacing:'0.02em', marginBottom:'0.5rem' }}>
            {isCreator ? 'Upload A-Level Resource' : 'Request to Upload Resource'}
          </h1>
          <p style={{ fontFamily:SANS, fontSize:'0.875rem', color:MUTED }}>
            {isCreator ? 'Share A-level study materials — published instantly.' : 'Submit for review. Goes live once approved.'}
          </p>
        </div>

        <div style={{ background:SURFACE, border:`1px solid ${BORDER}`, borderTop:`1px solid ${BORDER2}`, borderRadius:'1rem', padding:'2rem' }}>

          {success && (
            <div style={{ padding:'1rem', marginBottom:'1.5rem', background:isPending?'rgba(200,168,76,0.08)':'rgba(20,120,60,0.15)', border:`1px solid ${isPending?BORDER2:'rgba(60,180,100,0.3)'}`, borderRadius:'0.5rem', textAlign:'center' }}>
              <p style={{ fontFamily:SANS, fontSize:'0.875rem', color:isPending?GOLD2:'#6EE7A0', fontWeight:600 }}>
                {isPending ? '⏳ Request submitted! It will appear once approved.' : '✅ Resource published! Redirecting…'}
              </p>
            </div>
          )}
          {error && (
            <div style={{ padding:'1rem', marginBottom:'1.5rem', background:'rgba(160,40,40,0.15)', border:'1px solid rgba(180,40,40,0.3)', borderRadius:'0.5rem', textAlign:'center' }}>
              <p style={{ fontFamily:SANS, fontSize:'0.875rem', color:'#F09090' }}>{error}</p>
            </div>
          )}

          <form onSubmit={handleSubmit} style={{ display:'grid', gap:'1.25rem' }}>
            <div>
              <label style={labelStyle}>Resource Title *</label>
              <input type="text" value={formData.title} onChange={e => setFormData({...formData, title:e.target.value})} placeholder="e.g., Complete Biology Notes" required style={inputStyle}
                onFocus={e => { e.currentTarget.style.borderColor=GOLD; e.currentTarget.style.borderTopColor=GOLD2; }}
                onBlur={e  => { e.currentTarget.style.borderColor=BORDER; e.currentTarget.style.borderTopColor=BORDER2; }} />
            </div>
            <div>
              <label style={labelStyle}>Subject *</label>
              <select value={formData.subject} onChange={e => setFormData({...formData, subject:e.target.value})} required style={{ ...inputStyle, cursor:'pointer', appearance:'none', WebkitAppearance:'none' }}
                onFocus={e => { e.currentTarget.style.borderColor=GOLD; }}
                onBlur={e  => { e.currentTarget.style.borderColor=BORDER; }}>
                <option value="" style={{ background:'#0c1018' }}>Select a subject</option>
                {ALEVEL_SUBJECTS.map(s => (
                  <option key={s.code} value={s.code} style={{ background:'#0c1018' }}>{s.icon} {s.name} ({s.code})</option>
                ))}
              </select>
            </div>
            <div>
              <label style={labelStyle}>Resource Type *</label>
              <select value={formData.resourceType} onChange={e => setFormData({...formData, resourceType:e.target.value})} required style={{ ...inputStyle, cursor:'pointer', appearance:'none', WebkitAppearance:'none' }}
                onFocus={e => { e.currentTarget.style.borderColor=GOLD; }}
                onBlur={e  => { e.currentTarget.style.borderColor=BORDER; }}>
                <option value="" style={{ background:'#0c1018' }}>Select a type</option>
                {RESOURCE_TYPES.map(t => <option key={t.value} value={t.value} style={{ background:'#0c1018' }}>{t.icon} {t.label}</option>)}
              </select>
            </div>
            <div>
              <label style={labelStyle}>Resource Link *</label>
              <input type="url" value={formData.link} onChange={e => setFormData({...formData, link:e.target.value})} placeholder="https://drive.google.com/..." required style={inputStyle}
                onFocus={e => { e.currentTarget.style.borderColor=GOLD; }}
                onBlur={e  => { e.currentTarget.style.borderColor=BORDER; }} />
            </div>
            <div>
              <label style={labelStyle}>Description (Optional)</label>
              <textarea value={formData.description} onChange={e => setFormData({...formData, description:e.target.value})} rows={4} placeholder="Describe what this resource covers…" style={{ ...inputStyle, resize:'vertical', fontFamily:SANS }}
                onFocus={e => { e.currentTarget.style.borderColor=GOLD; }}
                onBlur={e  => { e.currentTarget.style.borderColor=BORDER; }} />
            </div>
            <button type="submit" disabled={loading||success} style={{ width:'100%', padding:'0.875rem', background:(loading||success)?'rgba(200,168,76,0.06)':'linear-gradient(180deg, rgba(201,168,76,0.22) 0%, rgba(201,168,76,0.12) 100%)', color:(loading||success)?MUTED:GOLD2, border:`1px solid ${(loading||success)?BORDER:BORDER2}`, borderTop:`1px solid ${(loading||success)?BORDER:'rgba(200,168,76,0.4)'}`, borderRadius:'0.625rem', fontFamily:SERIF, fontSize:'1.0625rem', fontWeight:600, letterSpacing:'0.04em', cursor:(loading||success)?'not-allowed':'pointer', transition:'all 0.18s' }}>
              {loading ? 'Submitting…' : success ? (isPending ? 'Request Sent ✓' : 'Published ✓') : (isCreator ? 'Upload Resource' : 'Request to Upload')}
            </button>
          </form>
        </div>
      </div>

      <style jsx global>{`
        @keyframes dust0 { 0%{transform:translate(0,0);opacity:0} 15%{opacity:.7} 50%{transform:translate(16px,-52px);opacity:.85} 85%{opacity:.5} 100%{transform:translate(0,0);opacity:0} }
        @keyframes dust1 { 0%{transform:translate(0,0);opacity:0} 15%{opacity:.6} 50%{transform:translate(-18px,-44px);opacity:.75} 85%{opacity:.45} 100%{transform:translate(0,0);opacity:0} }
        @keyframes dust2 { 0%{transform:translate(0,0);opacity:0} 20%{opacity:.65} 50%{transform:translate(10px,-60px);opacity:.8} 80%{opacity:.4} 100%{transform:translate(0,0);opacity:0} }
      `}</style>
    </div>
  );
}

export default function ALevelsUploadPage() {
  return (
    <Suspense fallback={<div style={{ minHeight:'100vh', background:'#0c1018', display:'flex', alignItems:'center', justifyContent:'center' }}><div style={{ fontFamily:"'Cormorant Garamond',serif", color:'rgba(196,176,138,0.45)', fontSize:'1.25rem' }}>Loading…</div></div>}>
      <UploadContent />
    </Suspense>
  );
}
