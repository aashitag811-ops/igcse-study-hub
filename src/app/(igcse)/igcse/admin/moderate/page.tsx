'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { SUBJECTS } from '@/lib/constants/subjects';
import { RESOURCE_TYPES } from '@/lib/constants/resourceTypes';
import Header from '@/components/Header';

const SERIF = "'Cormorant Garamond', 'Cormorant', Georgia, serif";
const SANS  = "'DM Sans', 'Inter', system-ui, -apple-system, sans-serif";
const GOLD  = '#C9A84C';
const GOLD2 = '#D4B96A';
const BG    = '#0c1018';
const SURFACE  = 'rgba(255,255,255,0.015)';
const SURFACE2 = 'rgba(255,255,255,0.025)';
const BORDER   = 'rgba(200,168,76,0.08)';
const BORDER2  = 'rgba(200,168,76,0.2)';
const TEXT  = '#E8DCC4';
const MUTED = 'rgba(196,176,138,0.45)';

const CREATORS = ['arinjaysaha2010@gmail.com', 'aashitag811@gmail.com'];

const DUST = Array.from({ length: 48 }, (_, i) => ({
  id: i, size: 1.8 + (i * 5.7 % 3.2),
  left: (i * 18.3 + 6) % 100, top: (i * 24.7 + 9) % 100,
  dur: 14 + (i * 3.3 % 12), delay: (i * 2.9) % 10, anim: i % 3,
}));

const SUBJECT_NAME: Record<string, string> = Object.fromEntries(SUBJECTS.map(s => [s.code, s.name]));
const TYPE_LABEL: Record<string, string> = Object.fromEntries(RESOURCE_TYPES.map(t => [t.value, t.label]));

interface PendingResource {
  id: string;
  title: string;
  description: string;
  link: string;
  subject: string;
  resource_type: string;
  created_at: string;
  profiles: { username: string; email: string; full_name: string };
}

export default function ModeratePage() {
  const router = useRouter();
  const [userEmail, setUserEmail] = useState<string | null>(null);
  const [pending, setPending] = useState<PendingResource[]>([]);
  const [loading, setLoading] = useState(true);
  const [acting, setActing] = useState<string | null>(null);
  const [glowPos, setGlowPos] = useState({ x: 0, y: 0 });
  const [glowVisible, setGlowVisible] = useState(false);

  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getUser().then(({ data }) => {
      if (!data.user) { router.push('/igcse/login'); return; }
      const email = data.user.email ?? '';
      setUserEmail(email);
      if (!CREATORS.includes(email)) { router.push('/igcse'); return; }
      fetchPending();
    });
    const move = (e: MouseEvent) => { setGlowPos({ x: e.clientX, y: e.clientY }); setGlowVisible(true); };
    const leave = () => setGlowVisible(false);
    window.addEventListener('mousemove', move);
    window.addEventListener('mouseleave', leave);
    return () => { window.removeEventListener('mousemove', move); window.removeEventListener('mouseleave', leave); };
  }, []);

  const fetchPending = async () => {
    setLoading(true);
    const supabase = createClient();
    const { data } = await (supabase as any)
      .from('resources')
      .select('*, profiles(username, email, full_name)')
      .eq('status', 'pending')
      .order('created_at', { ascending: true });
    setPending(data ?? []);
    setLoading(false);
  };

  const act = async (id: string, status: 'approved' | 'rejected') => {
    setActing(id);
    const supabase = createClient();
    await (supabase as any).from('resources').update({ status }).eq('id', id);
    setPending(prev => prev.filter(r => r.id !== id));
    setActing(null);
  };

  if (!userEmail || !CREATORS.includes(userEmail)) return null;

  return (
    <div style={{ minHeight: '100vh', background: BG, position: 'relative', overflowX: 'hidden' }}>

      {/* Dust */}
      <div className="pointer-events-none" style={{ position: 'fixed', inset: 0, zIndex: 0 }}>
        {DUST.map(p => (
          <div key={p.id} style={{
            position: 'absolute', width: `${p.size}px`, height: `${p.size}px`,
            borderRadius: '50%', left: `${p.left}%`, top: `${p.top}%`,
            background: 'radial-gradient(circle, rgba(255,218,80,1) 0%, rgba(212,175,55,0.65) 50%, transparent 100%)',
            boxShadow: '0 0 8px rgba(255,210,60,0.95), 0 0 18px rgba(200,160,40,0.55)',
            animation: `dust${p.anim} ${p.dur}s ease-in-out infinite`,
            animationDelay: `${p.delay}s`, opacity: 0,
          }} />
        ))}
      </div>

      {/* Cursor glow */}
      <div className="pointer-events-none" style={{
        position: 'fixed', inset: 0, zIndex: 1,
        opacity: glowVisible ? 1 : 0, transition: 'opacity 0.4s ease',
        background: `radial-gradient(circle 360px at ${glowPos.x}px ${glowPos.y}px, rgba(200,168,76,0.07) 0%, rgba(180,140,30,0.03) 50%, transparent 100%)`,
      }} />

      <Header />

      <div style={{ position: 'relative', zIndex: 2, maxWidth: 900, margin: '0 auto', padding: '96px 24px 60px' }}>

        {/* Header */}
        <div style={{ marginBottom: '2rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '1rem' }}>
            <div>
              <h1 style={{ fontFamily: SERIF, fontSize: '2rem', fontWeight: 500, color: GOLD2, marginBottom: '0.25rem' }}>
                Resource Moderation
              </h1>
              <p style={{ fontFamily: SANS, fontSize: '0.8125rem', color: MUTED }}>
                Review and approve community submissions
              </p>
            </div>
            <div style={{ padding: '0.375rem 1rem', background: 'rgba(200,168,76,0.08)', border: `1px solid ${BORDER2}`, borderRadius: '9999px' }}>
              <span style={{ fontFamily: SANS, fontSize: '0.8125rem', fontWeight: 700, color: GOLD }}>
                {pending.length} pending
              </span>
            </div>
          </div>
        </div>

        {/* Queue */}
        {loading ? (
          <div style={{ textAlign: 'center', padding: '3rem', color: MUTED, fontFamily: SANS }}>
            <div style={{ width: 32, height: 32, border: `2px solid ${BORDER}`, borderTop: `2px solid ${GOLD}`, borderRadius: '50%', animation: 'spin 0.8s linear infinite', margin: '0 auto 1rem' }} />
            Loading queue…
          </div>
        ) : pending.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '4rem 1rem', background: SURFACE, border: `1px solid ${BORDER}`, borderRadius: '1rem' }}>
            <div style={{ fontSize: '2.5rem', marginBottom: '1rem', opacity: 0.5 }}>✅</div>
            <h3 style={{ fontFamily: SERIF, fontSize: '1.25rem', color: TEXT, marginBottom: '0.5rem' }}>All clear</h3>
            <p style={{ fontFamily: SANS, fontSize: '0.875rem', color: MUTED }}>No pending submissions right now.</p>
          </div>
        ) : (
          <div style={{ display: 'grid', gap: '1rem' }}>
            {pending.map(r => (
              <div key={r.id} style={{ background: SURFACE2, border: `1px solid ${BORDER}`, borderRadius: '0.75rem', padding: '1.25rem' }}>

                {/* Top row */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', gap: '1rem', flexWrap: 'wrap' }}>
                  <div style={{ flex: 1 }}>
                    {/* Badges */}
                    <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '0.625rem', flexWrap: 'wrap' }}>
                      <span style={{ padding: '2px 8px', background: 'rgba(200,168,76,0.10)', color: GOLD, border: `1px solid ${BORDER}`, borderRadius: '4px', fontSize: '0.75rem', fontFamily: SANS, fontWeight: 600 }}>
                        {SUBJECT_NAME[r.subject] ?? r.subject}
                      </span>
                      <span style={{ padding: '2px 8px', background: 'rgba(255,255,255,0.04)', color: MUTED, border: `1px solid ${BORDER}`, borderRadius: '4px', fontSize: '0.75rem', fontFamily: SANS }}>
                        {TYPE_LABEL[r.resource_type] ?? r.resource_type}
                      </span>
                      <span style={{ padding: '2px 8px', background: 'rgba(200,168,76,0.06)', color: MUTED, border: `1px solid ${BORDER}`, borderRadius: '4px', fontSize: '0.75rem', fontFamily: SANS }}>
                        {new Date(r.created_at).toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' })}
                      </span>
                    </div>

                    <h3 style={{ fontFamily: SERIF, fontSize: '1.0625rem', fontWeight: 600, color: TEXT, marginBottom: '0.25rem' }}>
                      {r.title}
                    </h3>
                    {r.description && (
                      <p style={{ fontFamily: SANS, fontSize: '0.8125rem', color: MUTED, marginBottom: '0.5rem' }}>
                        {r.description}
                      </p>
                    )}

                    <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap', alignItems: 'center', marginTop: '0.5rem' }}>
                      <a href={r.link} target="_blank" rel="noopener noreferrer"
                        style={{ fontFamily: SANS, fontSize: '0.8125rem', color: GOLD, textDecoration: 'none' }}>
                        View Resource →
                      </a>
                      <span style={{ fontFamily: SANS, fontSize: '0.8125rem', color: MUTED }}>
                        by <strong style={{ color: TEXT }}>{r.profiles?.username ?? r.profiles?.email}</strong>
                      </span>
                    </div>
                  </div>

                  {/* Actions */}
                  <div style={{ display: 'flex', gap: '0.5rem', flexShrink: 0 }}>
                    <button
                      onClick={() => act(r.id, 'approved')}
                      disabled={acting === r.id}
                      style={{
                        padding: '0.5rem 1.125rem',
                        background: acting === r.id ? 'transparent' : 'rgba(20,120,60,0.20)',
                        color: '#6EE7A0',
                        border: '1px solid rgba(60,180,100,0.35)',
                        borderRadius: '6px',
                        fontFamily: SANS, fontSize: '0.8125rem', fontWeight: 700,
                        cursor: acting === r.id ? 'not-allowed' : 'pointer',
                        letterSpacing: '0.04em',
                      }}
                    >
                      Approve
                    </button>
                    <button
                      onClick={() => act(r.id, 'rejected')}
                      disabled={acting === r.id}
                      style={{
                        padding: '0.5rem 1.125rem',
                        background: acting === r.id ? 'transparent' : 'rgba(160,40,40,0.15)',
                        color: '#F09090',
                        border: '1px solid rgba(180,40,40,0.3)',
                        borderRadius: '6px',
                        fontFamily: SANS, fontSize: '0.8125rem', fontWeight: 700,
                        cursor: acting === r.id ? 'not-allowed' : 'pointer',
                        letterSpacing: '0.04em',
                      }}
                    >
                      Reject
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <style jsx global>{`
        @keyframes dust0 { 0%{transform:translate(0,0);opacity:0} 15%{opacity:.7} 50%{transform:translate(16px,-52px);opacity:.85} 85%{opacity:.5} 100%{transform:translate(0,0);opacity:0} }
        @keyframes dust1 { 0%{transform:translate(0,0);opacity:0} 15%{opacity:.6} 50%{transform:translate(-18px,-44px);opacity:.75} 85%{opacity:.45} 100%{transform:translate(0,0);opacity:0} }
        @keyframes dust2 { 0%{transform:translate(0,0);opacity:0} 20%{opacity:.65} 50%{transform:translate(10px,-60px);opacity:.8} 80%{opacity:.4} 100%{transform:translate(0,0);opacity:0} }
        @keyframes spin { to { transform: rotate(360deg); } }
      `}</style>
    </div>
  );
}
