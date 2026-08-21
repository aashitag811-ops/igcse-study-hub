'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { SUBJECTS } from '@/lib/constants/subjects';
import { RESOURCE_TYPES } from '@/lib/constants/resourceTypes';
import type { McqAttempt, McqWrongQuestion } from '@/lib/types/database.types';

// ── Design tokens ─────────────────────────────────────────────────────────────
const SERIF = "'Cormorant Garamond', 'Cormorant', Georgia, serif";
const SANS  = "'DM Sans', 'Inter', system-ui, -apple-system, sans-serif";
const GOLD  = '#C9A84C';
const GOLD2 = '#D4B96A';
const GOLD3 = '#E2C97A';
const BG    = '#0c1018';
const TOPBAR_BG = '#080c12';
const SURFACE  = 'rgba(255,255,255,0.022)';
const SURFACE2 = 'rgba(255,255,255,0.038)';
const BORDER   = 'rgba(200,168,76,0.10)';
const BORDER2  = 'rgba(200,168,76,0.22)';
const TEXT  = '#E8DCC4';
const MUTED = 'rgba(196,176,138,0.5)';
const MUTED2 = 'rgba(196,176,138,0.35)';

// ── Interfaces ────────────────────────────────────────────────────────────────
interface Resource {
  id: string; title: string; description: string; link: string;
  subject: string; resource_type: string; upvote_count: number;
  created_at: string; uploader_id: string;
}
interface Profile {
  id: string; email: string; username: string; full_name: string; avatar_url: string;
}
type ActiveView = 'overview' | 'uploads' | 'upvotes' | 'attempts' | 'weak';

const CREATORS = ['arinjaysaha2010@gmail.com', 'aashitag811@gmail.com'];
const SUBJECT_NAME: Record<string, string> = Object.fromEntries(SUBJECTS.map(s => [s.code, s.name]));

// ── Helpers ───────────────────────────────────────────────────────────────────
function gradeFromPct(pct: number) {
  if (pct >= 90) return 'A*'; if (pct >= 80) return 'A';
  if (pct >= 70) return 'B';  if (pct >= 60) return 'C';
  if (pct >= 50) return 'D';  return 'E';
}
function gradeColour(pct: number) {
  if (pct >= 80) return { bg: 'rgba(16,100,50,0.25)', fg: '#6EE7A0', bd: 'rgba(40,160,90,0.3)' };
  if (pct >= 60) return { bg: 'rgba(160,110,10,0.22)', fg: '#E2C97A', bd: 'rgba(200,168,76,0.35)' };
  return { bg: 'rgba(140,30,30,0.22)', fg: '#F09090', bd: 'rgba(190,60,60,0.3)' };
}
function barColor(pct: number) {
  return pct >= 80 ? '#6EE7A0' : pct >= 60 ? GOLD3 : '#F09090';
}
function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' });
}
function fmtTime(secs: number) {
  const m = Math.floor(secs / 60), s = secs % 60;
  return `${m}m ${s < 10 ? '0' : ''}${s}s`;
}
function paperLabel(paperId: string) {
  const m = paperId.match(/^(\d{4})_([msw])(\d{2})(?:_qp)?_(\d)(\d)/);
  if (!m) return paperId;
  const [, code, seas, yr, comp, vari] = m;
  const season = seas === 'm' ? 'Feb/Mar' : seas === 's' ? 'May/Jun' : 'Oct/Nov';
  return `${SUBJECT_NAME[code] ?? code} · ${season} 20${yr} · P${comp}V${vari}`;
}
function initials(p: Profile) {
  if (p.full_name) return p.full_name.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2);
  if (p.username) return p.username.slice(0, 2).toUpperCase();
  return (p.email ?? '??').slice(0, 2).toUpperCase();
}

// ── SVG Icons ─────────────────────────────────────────────────────────────────
const S = { width: 18, height: 18, fill: 'none', stroke: 'currentColor', strokeWidth: '1.6', strokeLinecap: 'round' as const, strokeLinejoin: 'round' as const };
const Icons = {
  overview:  <svg {...S} viewBox="0 0 24 24"><rect x="3" y="3" width="7" height="7" rx="1.5"/><rect x="14" y="3" width="7" height="7" rx="1.5"/><rect x="14" y="14" width="7" height="7" rx="1.5"/><rect x="3" y="14" width="7" height="7" rx="1.5"/></svg>,
  upload:    <svg {...S} viewBox="0 0 24 24"><path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg>,
  bookmark:  <svg {...S} viewBox="0 0 24 24"><path d="M19 21l-7-5-7 5V5a2 2 0 012-2h10a2 2 0 012 2z"/></svg>,
  exam:      <svg {...S} viewBox="0 0 24 24"><path d="M9 11l3 3L22 4"/><path d="M21 12v7a2 2 0 01-2 2H5a2 2 0 01-2-2V5a2 2 0 012-2h11"/></svg>,
  weak:      <svg {...S} viewBox="0 0 24 24"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>,
  browse:    <svg {...S} viewBox="0 0 24 24"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>,
  practice:  <svg {...S} viewBox="0 0 24 24"><polygon points="5 3 19 12 5 21 5 3"/></svg>,
  home:      <svg {...S} viewBox="0 0 24 24"><path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>,
  edit:      <svg {...S} viewBox="0 0 24 24"><path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>,
  shield:    <svg {...S} viewBox="0 0 24 24"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>,
  logout:    <svg {...S} viewBox="0 0 24 24"><path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></svg>,
  chevron:   <svg {...S} viewBox="0 0 24 24"><polyline points="9 18 15 12 9 6"/></svg>,
};

// ── Atoms ─────────────────────────────────────────────────────────────────────
function Spinner() {
  return (
    <div style={{ textAlign: 'center', padding: '3rem', color: MUTED, fontFamily: SANS, fontSize: '0.8rem' }}>
      <div style={{ width: 24, height: 24, border: `2px solid ${BORDER}`, borderTop: `2px solid ${GOLD}`, borderRadius: '50%', animation: 'spin 0.8s linear infinite', margin: '0 auto 0.75rem' }} />
      Loading…
    </div>
  );
}

function Empty({ icon, title, desc, cta, onCta }: { icon: string; title: string; desc: string; cta?: string; onCta?: () => void }) {
  return (
    <div style={{ textAlign: 'center', padding: '4rem 2rem', color: MUTED }}>
      <div style={{ fontSize: '2rem', marginBottom: '0.75rem', opacity: 0.45 }}>{icon}</div>
      <div style={{ fontFamily: SERIF, fontSize: '1.15rem', fontWeight: 600, color: TEXT, marginBottom: '0.35rem' }}>{title}</div>
      <div style={{ fontFamily: SANS, fontSize: '0.8125rem', marginBottom: cta ? '1.5rem' : 0 }}>{desc}</div>
      {cta && onCta && <button onClick={onCta} style={{ padding: '0.55rem 1.375rem', background: 'rgba(200,168,76,0.1)', color: GOLD2, border: `1px solid ${BORDER2}`, borderRadius: '7px', fontFamily: SANS, fontSize: '0.875rem', fontWeight: 600, cursor: 'pointer' }}>{cta}</button>}
    </div>
  );
}

function Bar({ pct }: { pct: number }) {
  const c = barColor(pct);
  return (
    <div style={{ height: 3, background: 'rgba(255,255,255,0.07)', borderRadius: 9999, overflow: 'hidden', marginTop: 6 }}>
      <div style={{ height: '100%', width: `${Math.min(pct, 100)}%`, background: c, borderRadius: 9999 }} />
    </div>
  );
}

// Card wrapper used throughout content area
function Card({ children, style }: { children: React.ReactNode; style?: React.CSSProperties }) {
  return (
    <div style={{ background: SURFACE, border: `1px solid ${BORDER}`, borderRadius: '0.875rem', overflow: 'hidden', ...style }}>
      {children}
    </div>
  );
}

function CardHeader({ title, action }: { title: string; action?: React.ReactNode }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0.875rem 1.125rem', borderBottom: `1px solid ${BORDER}` }}>
      <span style={{ fontFamily: SANS, fontSize: '0.7rem', fontWeight: 700, letterSpacing: '0.13em', textTransform: 'uppercase', color: MUTED }}>{title}</span>
      {action}
    </div>
  );
}

// ── Resource card ─────────────────────────────────────────────────────────────
function ResourceCard({ resource, onDelete, deleteConfirm, onConfirmDelete, onCancelDelete }: {
  resource: Resource; onDelete?: () => void;
  deleteConfirm?: boolean; onConfirmDelete?: () => void; onCancelDelete?: () => void;
}) {
  const subject = SUBJECTS.find(s => s.code === resource.subject);
  const rtype = RESOURCE_TYPES.find(t => t.value === resource.resource_type);
  return (
    <div style={{ padding: '0.875rem 1rem', borderBottom: `1px solid ${BORDER}` }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '0.75rem' }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', gap: '0.35rem', marginBottom: '0.4rem', flexWrap: 'wrap' }}>
            <span style={{ padding: '1px 6px', background: 'rgba(200,168,76,0.1)', color: GOLD, border: `1px solid rgba(200,168,76,0.2)`, borderRadius: 3, fontSize: '0.68rem', fontFamily: SANS, fontWeight: 700 }}>{subject?.name}</span>
            <span style={{ padding: '1px 6px', background: SURFACE2, color: MUTED, border: `1px solid ${BORDER}`, borderRadius: 3, fontSize: '0.68rem', fontFamily: SANS }}>{rtype?.label}</span>
            <span style={{ padding: '1px 6px', background: SURFACE2, color: MUTED2, border: `1px solid ${BORDER}`, borderRadius: 3, fontSize: '0.68rem', fontFamily: SANS }}>{resource.upvote_count} ↑</span>
          </div>
          <div style={{ fontFamily: SERIF, fontSize: '0.9375rem', fontWeight: 600, color: TEXT, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{resource.title}</div>
          {resource.description && <div style={{ fontFamily: SANS, fontSize: '0.775rem', color: MUTED, marginTop: 2, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{resource.description}</div>}
          <a href={resource.link} target="_blank" rel="noopener noreferrer" style={{ fontFamily: SANS, fontSize: '0.75rem', color: GOLD, textDecoration: 'none', display: 'inline-block', marginTop: 6 }}>Open resource →</a>
        </div>
        {onDelete && (
          <button onClick={onDelete} style={{ padding: '0.3rem 0.6rem', background: 'rgba(160,30,30,0.1)', color: '#F09090', border: '1px solid rgba(160,30,30,0.2)', borderRadius: 4, cursor: 'pointer', fontFamily: SANS, fontSize: '0.72rem', fontWeight: 600, flexShrink: 0 }}>Delete</button>
        )}
      </div>
      {deleteConfirm && (
        <div style={{ marginTop: '0.625rem', padding: '0.625rem 0.75rem', background: 'rgba(140,30,30,0.08)', border: '1px solid rgba(160,30,30,0.2)', borderRadius: 6 }}>
          <p style={{ fontFamily: SANS, fontSize: '0.78rem', color: '#F09090', marginBottom: '0.5rem', fontWeight: 600 }}>Delete permanently?</p>
          <div style={{ display: 'flex', gap: '0.4rem' }}>
            <button onClick={onConfirmDelete} style={{ padding: '0.3rem 0.7rem', background: 'rgba(160,30,30,0.25)', color: '#F09090', border: '1px solid rgba(160,30,30,0.35)', borderRadius: 4, cursor: 'pointer', fontFamily: SANS, fontSize: '0.75rem', fontWeight: 600 }}>Yes, delete</button>
            <button onClick={onCancelDelete} style={{ padding: '0.3rem 0.7rem', background: 'transparent', color: MUTED, border: `1px solid ${BORDER}`, borderRadius: 4, cursor: 'pointer', fontFamily: SANS, fontSize: '0.75rem' }}>Cancel</button>
          </div>
        </div>
      )}
    </div>
  );
}

// ── Nav item ──────────────────────────────────────────────────────────────────
function NavItem({ icon, label, active, badge, onClick }: { icon: React.ReactNode; label: string; active: boolean; badge?: number; onClick: () => void }) {
  return (
    <button onClick={onClick} style={{
      display: 'flex', alignItems: 'center', gap: '0.7rem',
      width: '100%', padding: '0.6rem 0.875rem', borderRadius: '0.5rem',
      background: active ? `rgba(201,168,76,0.1)` : 'transparent',
      border: 'none',
      borderLeft: active ? `3px solid ${GOLD}` : '3px solid transparent',
      color: active ? GOLD2 : MUTED,
      cursor: 'pointer', textAlign: 'left',
      fontFamily: SANS, fontSize: '0.8375rem', fontWeight: active ? 600 : 400,
      marginBottom: 2,
    }}>
      <span style={{ opacity: active ? 1 : 0.6, flexShrink: 0, display: 'flex' }}>{icon}</span>
      <span style={{ flex: 1 }}>{label}</span>
      {!!badge && <span style={{ fontSize: '0.65rem', fontWeight: 700, padding: '1px 6px', borderRadius: 999, background: active ? 'rgba(201,168,76,0.18)' : 'rgba(255,255,255,0.07)', color: active ? GOLD : MUTED2 }}>{badge}</span>}
    </button>
  );
}

function NavGroup({ label }: { label: string }) {
  return <div style={{ fontFamily: SANS, fontSize: '0.6rem', fontWeight: 700, letterSpacing: '0.16em', textTransform: 'uppercase', color: MUTED2, padding: '0.75rem 0.875rem 0.3rem' }}>{label}</div>;
}

// ── Main export ───────────────────────────────────────────────────────────────
export default function ProfilePage() {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [userEmail, setUserEmail] = useState<string | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState<ActiveView>('overview');
  const [uploads, setUploads] = useState<Resource[]>([]);
  const [upvoted, setUpvoted] = useState<Resource[]>([]);
  const [delConfirm, setDelConfirm] = useState<string | null>(null);
  const [attempts, setAttempts] = useState<McqAttempt[]>([]);
  const [attLoading, setAttLoading] = useState(false);
  const [wrong, setWrong] = useState<McqWrongQuestion[]>([]);
  const [wrongLoading, setWrongLoading] = useState(false);
  const [editing, setEditing] = useState(false);
  const [editForm, setEditForm] = useState({ username: '', full_name: '' });
  const [saveMsg, setSaveMsg] = useState('');
  const [glowPos, setGlowPos] = useState({ x: 0, y: 0 });
  const [glowVisible, setGlowVisible] = useState(false);

  useEffect(() => { load(); }, []);

  useEffect(() => {
    const move = (e: MouseEvent) => { setGlowPos({ x: e.clientX, y: e.clientY }); setGlowVisible(true); };
    const out  = () => setGlowVisible(false);
    window.addEventListener('mousemove', move);
    window.addEventListener('mouseleave', out);
    return () => { window.removeEventListener('mousemove', move); window.removeEventListener('mouseleave', out); };
  }, []);

  useEffect(() => {
    if (view === 'weak' && wrong.length === 0 && !wrongLoading) {
      setWrongLoading(true);
      fetch('/api/mcq-wrong-questions').then(r => r.json()).then(d => setWrong(d.wrongQuestions || [])).finally(() => setWrongLoading(false));
    }
  }, [view]);

  const load = async () => {
    setLoading(true);
    const sb = createClient();
    const { data: { user } } = await sb.auth.getUser();
    if (!user) { router.push('/igcse/login'); return; }
    setUser(user); setUserEmail(user.email ?? null);
    const { data: p } = await sb.from('profiles').select('*').eq('id', user.id).single();
    if (p) { setProfile(p as Profile); setEditForm({ username: (p as any).username || '', full_name: (p as any).full_name || '' }); }
    const { data: up } = await sb.from('resources').select('*').eq('uploader_id', user.id).order('created_at', { ascending: false });
    setUploads(up || []);
    const { data: votes } = await sb.from('votes').select('resource_id, resources(id,title,description,link,subject,resource_type,upvote_count,created_at,uploader_id)').eq('user_id', user.id);
    if (votes) setUpvoted(votes.map((v: any) => v.resources).filter(Boolean));
    setAttLoading(true);
    fetch('/api/mcq-attempts').then(r => r.json()).then(d => setAttempts(d.attempts || [])).finally(() => setAttLoading(false));
    setLoading(false);
  };

  const saveProfile = async () => {
    if (!user) return;
    const sb = createClient();
    // @ts-expect-error
    const { error } = await sb.from('profiles').update({ username: editForm.username, full_name: editForm.full_name }).eq('id', user.id);
    if (error) setSaveMsg('Error saving');
    else { setSaveMsg('Saved!'); setEditing(false); load(); setTimeout(() => setSaveMsg(''), 3000); }
  };

  const deleteResource = async (id: string) => {
    if (!user) return;
    const sb = createClient();
    const { error } = await sb.from('resources').delete().eq('id', id).eq('uploader_id', user.id);
    if (!error) { setUploads(prev => prev.filter(r => r.id !== id)); setDelConfirm(null); }
  };

  if (loading || !profile) return (
    <div style={{ minHeight: '100vh', background: BG, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <Spinner />
    </div>
  );

  const isCreator = CREATORS.includes(userEmail ?? '');
  const avgPct = attempts.length ? Math.round(attempts.reduce((s, a) => s + Number(a.percentage), 0) / attempts.length) : null;
  const bestPct = attempts.length ? Math.max(...attempts.map(a => Number(a.percentage))) : null;
  const wrongBySubject: Record<string, McqWrongQuestion[]> = {};
  for (const wq of wrong) (wrongBySubject[wq.subject_code] ??= []).push(wq);

  const inputCss: React.CSSProperties = { width: '100%', background: 'rgba(4,8,16,0.8)', border: `1px solid ${BORDER}`, borderRadius: 7, padding: '9px 13px', fontFamily: SANS, fontSize: '0.875rem', color: TEXT, outline: 'none' };

  const TOPBAR_H = 56;
  const TABBAR_H = 48;

  const tabs = [
    { id: 'overview' as const,  label: 'Overview',       icon: Icons.overview },
    { id: 'uploads' as const,   label: 'My Uploads',     icon: Icons.upload,   badge: uploads.length },
    { id: 'upvotes' as const,   label: 'Upvoted',        icon: Icons.bookmark, badge: upvoted.length },
    { id: 'attempts' as const,  label: 'Exam History',   icon: Icons.exam,     badge: attempts.length || undefined },
    { id: 'weak' as const,      label: 'Weak Questions', icon: Icons.weak,     badge: wrong.length || undefined },
  ];

  return (
    <>
      {/* Cursor glow */}
      <div className="pointer-events-none" style={{ position: 'fixed', inset: 0, zIndex: 9999, opacity: glowVisible ? 1 : 0, transition: 'opacity 0.4s ease', background: `radial-gradient(circle 380px at ${glowPos.x}px ${glowPos.y}px, rgba(200,168,76,0.055) 0%, transparent 100%)` }} />

      {/* ── Fixed topbar ─────────────────────────────────────────────────── */}
      <div style={{
        position: 'fixed', top: 0, left: 0, right: 0, height: TOPBAR_H,
        background: `${TOPBAR_BG}f2`, backdropFilter: 'blur(16px)',
        borderBottom: `1px solid ${BORDER}`,
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '0 1.5rem', zIndex: 200,
      }}>
        {/* Logo */}
        <div style={{ cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.5rem' }} onClick={() => router.push('/igcse')}>
          <div style={{ fontFamily: SERIF, fontSize: '1.2rem', fontWeight: 600, color: GOLD2, letterSpacing: '0.02em' }}>StudentArchive</div>
          <div style={{ fontFamily: SANS, fontSize: '0.6rem', color: MUTED2, letterSpacing: '0.06em', marginTop: 2 }}>IGCSE</div>
        </div>

        {/* Right: avatar + actions */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.875rem' }}>
          {isCreator && (
            <button onClick={() => router.push('/igcse/admin/moderate')} style={{ display: 'flex', alignItems: 'center', gap: '0.375rem', padding: '0.4rem 0.875rem', background: 'rgba(200,168,76,0.07)', color: GOLD, border: `1px solid ${BORDER2}`, borderRadius: '7px', fontFamily: SANS, fontSize: '0.775rem', fontWeight: 600, cursor: 'pointer' }}>
              {Icons.shield} <span>Moderation</span>
            </button>
          )}
          <button onClick={() => router.push('/igcse/upload')} style={{ display: 'flex', alignItems: 'center', gap: '0.375rem', padding: '0.4rem 0.875rem', background: 'linear-gradient(180deg, rgba(201,168,76,0.2) 0%, rgba(201,168,76,0.1) 100%)', color: GOLD2, border: `1px solid ${BORDER2}`, borderRadius: '7px', fontFamily: SANS, fontSize: '0.775rem', fontWeight: 600, cursor: 'pointer' }}>
            {Icons.upload} <span>Upload</span>
          </button>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <div style={{ width: 30, height: 30, borderRadius: '50%', background: 'linear-gradient(135deg, rgba(200,168,76,0.3), rgba(200,168,76,0.08))', border: `1.5px solid ${BORDER2}`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: SERIF, fontSize: '0.8125rem', fontWeight: 600, color: GOLD2 }}>{initials(profile)}</div>
            <span style={{ fontFamily: SANS, fontSize: '0.8rem', fontWeight: 600, color: TEXT }}>{profile.full_name || profile.username || 'Scholar'}</span>
          </div>
        </div>
      </div>

      {/* ── Tab bar (below topbar, sticky) ───────────────────────────────── */}
      <div style={{
        position: 'fixed', top: TOPBAR_H, left: 0, right: 0, height: TABBAR_H,
        background: `${BG}f0`, backdropFilter: 'blur(12px)',
        borderBottom: `1px solid ${BORDER}`,
        display: 'flex', alignItems: 'center',
        padding: '0 1.5rem', gap: '0.25rem', zIndex: 150,
        overflowX: 'auto',
      }}>
        {tabs.map(t => (
          <button key={t.id} onClick={() => setView(t.id)} style={{
            display: 'flex', alignItems: 'center', gap: '0.4rem',
            padding: '0.4rem 0.75rem', borderRadius: '0.5rem',
            background: view === t.id ? 'rgba(200,168,76,0.1)' : 'transparent',
            border: 'none',
            borderBottom: view === t.id ? `2px solid ${GOLD}` : '2px solid transparent',
            color: view === t.id ? GOLD2 : MUTED,
            cursor: 'pointer', fontFamily: SANS, fontSize: '0.8125rem',
            fontWeight: view === t.id ? 600 : 400,
            whiteSpace: 'nowrap', flexShrink: 0,
          }}>
            <span style={{ display: 'flex', opacity: view === t.id ? 1 : 0.6 }}>{t.icon}</span>
            {t.label}
            {!!t.badge && (
              <span style={{ fontSize: '0.65rem', fontWeight: 700, padding: '1px 5px', borderRadius: 999, background: view === t.id ? 'rgba(201,168,76,0.2)' : 'rgba(255,255,255,0.08)', color: view === t.id ? GOLD : MUTED2 }}>{t.badge}</span>
            )}
          </button>
        ))}
      </div>

      {/* ── Page content ─────────────────────────────────────────────────── */}
      <div style={{ minHeight: '100vh', background: BG, paddingTop: TOPBAR_H + TABBAR_H }}>
        <div style={{ padding: '1.75rem 2rem', maxWidth: 960, margin: '0 auto' }}>

            {/* ── OVERVIEW ───────────────────────────────────────────────── */}
            {view === 'overview' && (
              <div style={{ display: 'grid', gap: '1.25rem' }}>

                {/* Stats row */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '0.875rem' }}>
                  {[
                    { label: 'Uploads',   value: uploads.length,                       accent: GOLD,       sub: 'resources shared' },
                    { label: 'Upvoted',   value: upvoted.length,                       accent: '#A78BFA',  sub: 'resources saved' },
                    { label: 'Exams',     value: attempts.length,                      accent: '#60A5FA',  sub: 'papers attempted' },
                    { label: 'Avg Score', value: avgPct != null ? `${avgPct}%` : '—',  accent: avgPct != null ? barColor(avgPct) : GOLD3, sub: bestPct != null ? `best: ${bestPct}%` : 'no exams yet' },
                  ].map(({ label, value, accent, sub }) => (
                    <div key={label} style={{ background: SURFACE, border: `1px solid ${BORDER}`, borderRadius: '0.875rem', padding: '1.125rem 1.25rem', position: 'relative', overflow: 'hidden' }}>
                      <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 2, background: `linear-gradient(90deg, transparent, ${accent}, transparent)`, opacity: 0.75 }} />
                      <div style={{ fontFamily: SANS, fontSize: '0.65rem', fontWeight: 700, letterSpacing: '0.14em', textTransform: 'uppercase', color: MUTED, marginBottom: '0.5rem' }}>{label}</div>
                      <div style={{ fontFamily: SERIF, fontSize: '1.875rem', fontWeight: 600, color: accent, lineHeight: 1 }}>{value}</div>
                      <div style={{ fontFamily: SANS, fontSize: '0.7rem', color: MUTED2, marginTop: '0.3rem' }}>{sub}</div>
                    </div>
                  ))}
                </div>

                {/* Profile details card */}
                <Card>
                  <CardHeader title="Account Details" action={
                    <button onClick={() => setEditing(!editing)} style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '0.275rem 0.7rem', background: editing ? 'rgba(180,40,40,0.1)' : SURFACE2, color: editing ? '#F09090' : MUTED, border: `1px solid ${editing ? 'rgba(180,40,40,0.25)' : BORDER}`, borderRadius: 5, cursor: 'pointer', fontFamily: SANS, fontSize: '0.75rem', fontWeight: 600 }}>
                      {editing ? '✕ Cancel' : <>{Icons.edit} Edit</>}
                    </button>
                  } />
                  {editing ? (
                    <div style={{ padding: '1.125rem', display: 'grid', gap: '0.875rem', maxWidth: 420 }}>
                      {([['Username', 'username'], ['Full Name', 'full_name']] as const).map(([lbl, key]) => (
                        <div key={key}>
                          <label style={{ display: 'block', fontFamily: SANS, fontSize: '0.68rem', fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', color: MUTED, marginBottom: 5 }}>{lbl}</label>
                          <input type="text" value={editForm[key]} onChange={e => setEditForm({ ...editForm, [key]: e.target.value })} style={inputCss}
                            onFocus={e => (e.currentTarget.style.borderColor = GOLD)} onBlur={e => (e.currentTarget.style.borderColor = BORDER)} />
                        </div>
                      ))}
                      <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                        <button onClick={saveProfile} style={{ padding: '0.5rem 1.25rem', background: 'linear-gradient(180deg,rgba(201,168,76,0.22),rgba(201,168,76,0.1))', color: GOLD2, border: `1px solid ${BORDER2}`, borderRadius: 7, fontFamily: SANS, fontSize: '0.875rem', fontWeight: 700, cursor: 'pointer' }}>Save</button>
                        {saveMsg && <span style={{ fontFamily: SANS, fontSize: '0.8rem', color: '#6EE7A0' }}>{saveMsg}</span>}
                      </div>
                    </div>
                  ) : (
                    <div style={{ padding: '1rem 1.125rem', display: 'grid', gap: '0.6rem' }}>
                      {[['Email', profile.email], ['Username', profile.username || '—'], ...(profile.full_name ? [['Full Name', profile.full_name]] : [])].map(([lbl, val]) => (
                        <div key={lbl} style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
                          <span style={{ fontFamily: SANS, fontSize: '0.68rem', fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: MUTED, minWidth: 90, flexShrink: 0 }}>{lbl}</span>
                          <span style={{ fontFamily: SERIF, fontSize: '0.9375rem', color: TEXT }}>{val}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </Card>

                {/* Recent exams */}
                <Card>
                  <CardHeader title="Recent Exams" action={
                    attempts.length > 3
                      ? <button onClick={() => setView('attempts')} style={{ fontFamily: SANS, fontSize: '0.75rem', color: GOLD, background: 'none', border: 'none', cursor: 'pointer', fontWeight: 600 }}>View all →</button>
                      : null
                  } />
                  {attLoading ? <Spinner /> : attempts.length === 0 ? (
                    <Empty icon="📝" title="No exams yet" desc="Take a practice paper to see results here." cta="Start practising" onCta={() => router.push('/igcse/practice')} />
                  ) : (
                    <div>
                      {attempts.slice(0, 5).map((a, idx) => {
                        const pct = Number(a.percentage);
                        const gc = gradeColour(pct);
                        return (
                          <div key={a.id} style={{ display: 'flex', alignItems: 'center', gap: '0.875rem', padding: '0.875rem 1.125rem', borderBottom: idx < Math.min(attempts.length, 5) - 1 ? `1px solid ${BORDER}` : 'none' }}>
                            <div style={{ width: 40, height: 40, borderRadius: '0.5rem', background: gc.bg, border: `1px solid ${gc.bd}`, color: gc.fg, display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: SERIF, fontWeight: 700, fontSize: '0.9375rem', flexShrink: 0 }}>{gradeFromPct(pct)}</div>
                            <div style={{ flex: 1, minWidth: 0 }}>
                              <div style={{ fontFamily: SERIF, fontSize: '0.9rem', fontWeight: 600, color: TEXT, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{paperLabel(a.paper_id)}</div>
                              <Bar pct={pct} />
                            </div>
                            <div style={{ textAlign: 'right', flexShrink: 0 }}>
                              <div style={{ fontFamily: SERIF, fontSize: '1.1rem', fontWeight: 700, color: gc.fg, lineHeight: 1 }}>{pct}%</div>
                              <div style={{ fontFamily: SANS, fontSize: '0.65rem', color: MUTED, marginTop: 3 }}>{fmtDate(a.created_at)}</div>
                            </div>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                              <button onClick={() => router.push(`/igcse/mcq-review/${a.id}`)} style={{ padding: '0.3rem 0.6rem', background: 'rgba(200,168,76,0.08)', color: GOLD2, border: `1px solid ${BORDER2}`, borderRadius: 4, fontFamily: SANS, fontSize: '0.72rem', fontWeight: 600, cursor: 'pointer', whiteSpace: 'nowrap' }}>Review</button>
                              <button onClick={() => router.push(`/igcse/mcq-exam/${a.paper_id}`)} style={{ padding: '0.3rem 0.6rem', background: 'transparent', color: MUTED, border: `1px solid ${BORDER}`, borderRadius: 4, fontFamily: SANS, fontSize: '0.72rem', cursor: 'pointer', whiteSpace: 'nowrap' }}>Retry</button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </Card>

                {/* Recent uploads */}
                {uploads.length > 0 && (
                  <Card>
                    <CardHeader title="Recent Uploads" action={
                      uploads.length > 3
                        ? <button onClick={() => setView('uploads')} style={{ fontFamily: SANS, fontSize: '0.75rem', color: GOLD, background: 'none', border: 'none', cursor: 'pointer', fontWeight: 600 }}>View all →</button>
                        : null
                    } />
                    {uploads.slice(0, 3).map(r => <ResourceCard key={r.id} resource={r} />)}
                  </Card>
                )}
              </div>
            )}

            {/* ── UPLOADS ────────────────────────────────────────────────── */}
            {view === 'uploads' && (
              uploads.length === 0
                ? <Empty icon="📚" title="No uploads yet" desc="Share study materials with the community." cta="Upload Resource" onCta={() => router.push('/igcse/upload')} />
                : <Card>
                    {uploads.map(r => (
                      <ResourceCard key={r.id} resource={r} onDelete={() => setDelConfirm(r.id)} deleteConfirm={delConfirm === r.id} onConfirmDelete={() => deleteResource(r.id)} onCancelDelete={() => setDelConfirm(null)} />
                    ))}
                  </Card>
            )}

            {/* ── UPVOTED ────────────────────────────────────────────────── */}
            {view === 'upvotes' && (
              upvoted.length === 0
                ? <Empty icon="🔖" title="No upvoted resources" desc="Upvote resources you find helpful to save them here." cta="Browse Resources" onCta={() => router.push('/igcse/browse')} />
                : <Card>
                    {upvoted.map(r => <ResourceCard key={r.id} resource={r} />)}
                  </Card>
            )}

            {/* ── EXAM HISTORY ───────────────────────────────────────────── */}
            {view === 'attempts' && (
              attLoading ? <Spinner /> :
              attempts.length === 0
                ? <Empty icon="📝" title="No exams yet" desc="Complete an MCQ exam and results appear here." cta="Start Practising" onCta={() => router.push('/igcse/practice')} />
                : <Card>
                    {attempts.map((a, idx) => {
                      const pct = Number(a.percentage);
                      const gc = gradeColour(pct);
                      return (
                        <div key={a.id} style={{ padding: '1rem 1.125rem', borderBottom: idx < attempts.length - 1 ? `1px solid ${BORDER}` : 'none' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.875rem', flexWrap: 'wrap' }}>
                            <div style={{ width: 44, height: 44, borderRadius: '0.5rem', background: gc.bg, border: `1px solid ${gc.bd}`, color: gc.fg, display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: SERIF, fontWeight: 700, fontSize: '1rem', flexShrink: 0 }}>{gradeFromPct(pct)}</div>
                            <div style={{ flex: 1, minWidth: 0 }}>
                              <div style={{ fontFamily: SERIF, fontWeight: 600, fontSize: '0.9375rem', color: TEXT, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', marginBottom: 1 }}>{paperLabel(a.paper_id)}</div>
                              <div style={{ fontFamily: SANS, fontSize: '0.7rem', color: MUTED, display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                                {fmtDate(a.created_at)}
                                {a.is_practice && <span style={{ padding: '0px 5px', background: 'rgba(200,168,76,0.08)', color: GOLD, borderRadius: 3, fontSize: '0.62rem', fontWeight: 600, border: `1px solid ${BORDER}` }}>Practice</span>}
                              </div>
                            </div>
                            <div style={{ display: 'flex', gap: '0.375rem', flexWrap: 'wrap' }}>
                              {([['Score', `${a.score}/${a.total}`], ['%', `${pct}%`], ['Time', fmtTime(a.time_taken_seconds)]] as const).map(([lbl, val]) => (
                                <div key={lbl} style={{ padding: '0.2rem 0.55rem', background: SURFACE2, border: `1px solid ${BORDER}`, borderRadius: 4, textAlign: 'center' }}>
                                  <div style={{ fontFamily: SANS, fontSize: '0.57rem', color: MUTED, textTransform: 'uppercase', letterSpacing: '0.1em' }}>{lbl}</div>
                                  <div style={{ fontFamily: SERIF, fontSize: '0.875rem', fontWeight: 600, color: GOLD2 }}>{val}</div>
                                </div>
                              ))}
                            </div>
                            <div style={{ display: 'flex', gap: '0.375rem' }}>
                              <button onClick={() => router.push(`/igcse/mcq-review/${a.id}`)} style={{ padding: '0.35rem 0.75rem', background: 'rgba(200,168,76,0.09)', color: GOLD2, border: `1px solid ${BORDER2}`, borderRadius: 5, fontFamily: SANS, fontSize: '0.78rem', fontWeight: 600, cursor: 'pointer' }}>Review</button>
                              <button onClick={() => router.push(`/igcse/mcq-exam/${a.paper_id}`)} style={{ padding: '0.35rem 0.75rem', background: 'transparent', color: MUTED, border: `1px solid ${BORDER}`, borderRadius: 5, fontFamily: SANS, fontSize: '0.78rem', cursor: 'pointer' }}>Retry</button>
                            </div>
                          </div>
                          <Bar pct={pct} />
                        </div>
                      );
                    })}
                  </Card>
            )}

            {/* ── WEAK QUESTIONS ─────────────────────────────────────────── */}
            {view === 'weak' && (
              wrongLoading ? <Spinner /> :
              wrong.length === 0
                ? <Empty icon="🎯" title="No weak areas yet" desc="Wrong answers from MCQ exams appear here." cta="Start Practising" onCta={() => router.push('/igcse/practice')} />
                : <div style={{ display: 'grid', gap: '1rem' }}>
                    {Object.entries(wrongBySubject).map(([code, qs]) => (
                      <Card key={code}>
                        <CardHeader title={SUBJECT_NAME[code] ?? code} action={
                          <span style={{ padding: '1px 8px', background: 'rgba(140,30,30,0.15)', color: '#F09090', border: '1px solid rgba(160,30,30,0.25)', borderRadius: 999, fontFamily: SANS, fontSize: '0.65rem', fontWeight: 700 }}>{qs.length} wrong</span>
                        } />
                        {qs.map((wq, idx) => (
                          <div key={wq.id} style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', padding: '0.75rem 1.125rem', borderBottom: idx < qs.length - 1 ? `1px solid ${BORDER}` : 'none', flexWrap: 'wrap' }}>
                            <span style={{ fontFamily: SERIF, fontSize: '0.875rem', color: TEXT, flex: 1, minWidth: 0, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                              {paperLabel(wq.paper_id)} — Q{wq.question_number}
                            </span>
                            <div style={{ display: 'flex', gap: '0.375rem', flexShrink: 0 }}>
                              <span style={{ padding: '2px 7px', background: 'rgba(140,30,30,0.15)', borderRadius: 3, fontFamily: SANS, fontSize: '0.72rem', color: '#F09090', fontWeight: 600 }}>You: {wq.user_answer ?? '—'}</span>
                              <span style={{ padding: '2px 7px', background: 'rgba(16,100,50,0.15)', borderRadius: 3, fontFamily: SANS, fontSize: '0.72rem', color: '#6EE7A0', fontWeight: 600 }}>✓ {wq.correct_answer}</span>
                            </div>
                            <span style={{ fontFamily: SANS, fontSize: '0.68rem', color: MUTED2, flexShrink: 0 }}>{fmtDate(wq.created_at)}</span>
                          </div>
                        ))}
                      </Card>
                    ))}
                  </div>
            )}

          </div>
        </div>

      <style jsx global>{`
        @keyframes spin { to { transform: rotate(360deg); } }
      `}</style>
    </>
  );
}
