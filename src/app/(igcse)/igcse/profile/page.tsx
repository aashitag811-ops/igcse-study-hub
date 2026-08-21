'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { SUBJECTS } from '@/lib/constants/subjects';
import { RESOURCE_TYPES } from '@/lib/constants/resourceTypes';
import type { McqAttempt, McqWrongQuestion } from '@/lib/types/database.types';
import Header from '@/components/Header';

// ── Design tokens ─────────────────────────────────────────────────────────────
const SERIF = "'Cormorant Garamond', 'Cormorant', Georgia, serif";
const SANS  = "'DM Sans', 'Inter', system-ui, -apple-system, sans-serif";
const GOLD  = '#C9A84C';
const GOLD2 = '#D4B96A';
const GOLD3 = '#E2C97A';
const BG    = '#0c1018';
const SURFACE  = 'rgba(255,255,255,0.018)';
const SURFACE2 = 'rgba(255,255,255,0.028)';
const SURFACE3 = 'rgba(255,255,255,0.038)';
const BORDER   = 'rgba(200,168,76,0.10)';
const BORDER2  = 'rgba(200,168,76,0.22)';
const TEXT  = '#E8DCC4';
const MUTED = 'rgba(196,176,138,0.5)';

// ── Dust particles ────────────────────────────────────────────────────────────
const DUST = Array.from({ length: 40 }, (_, i) => ({
  id: i,
  size: 1.6 + (i * 5.7 % 2.8),
  left: (i * 18.3 + 6) % 100,
  top: (i * 24.7 + 9) % 100,
  dur: 14 + (i * 3.3 % 12),
  delay: (i * 2.9) % 10,
  anim: i % 3,
}));

// ── Interfaces ────────────────────────────────────────────────────────────────
interface Resource {
  id: string; title: string; description: string; link: string;
  subject: string; resource_type: string; upvote_count: number;
  created_at: string; uploader_id: string;
}
interface Profile {
  id: string; email: string; username: string; full_name: string; avatar_url: string;
}
type ActiveTab = 'uploads' | 'upvotes' | 'attempts' | 'weak';

const CREATORS = ['arinjaysaha2010@gmail.com', 'aashitag811@gmail.com'];
const SUBJECT_NAME: Record<string, string> = Object.fromEntries(SUBJECTS.map(s => [s.code, s.name]));

// ── Helpers ───────────────────────────────────────────────────────────────────
function gradeFromPct(pct: number) {
  if (pct >= 90) return 'A*';
  if (pct >= 80) return 'A';
  if (pct >= 70) return 'B';
  if (pct >= 60) return 'C';
  if (pct >= 50) return 'D';
  return 'E';
}
function gradeColour(pct: number) {
  if (pct >= 80) return { bg: 'rgba(20,120,60,0.22)', text: '#6EE7A0', border: 'rgba(60,180,100,0.28)' };
  if (pct >= 60) return { bg: 'rgba(180,120,20,0.18)', text: '#E2C97A', border: 'rgba(200,168,76,0.32)' };
  return { bg: 'rgba(160,40,40,0.18)', text: '#F09090', border: 'rgba(200,80,80,0.28)' };
}
function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' });
}
function fmtTime(secs: number) {
  const m = Math.floor(secs / 60), s = secs % 60;
  return `${m}m ${s}s`;
}
function paperLabel(paperId: string) {
  const m = paperId.match(/^(\d{4})_([msw])(\d{2})(?:_qp)?_(\d)(\d)/);
  if (!m) return paperId;
  const [, code, seas, yr, comp, vari] = m;
  const season = seas === 'm' ? 'Feb/Mar' : seas === 's' ? 'May/Jun' : 'Oct/Nov';
  return `${SUBJECT_NAME[code] ?? code} · ${season} 20${yr} · P${comp}V${vari}`;
}
function initials(profile: Profile) {
  if (profile.full_name) return profile.full_name.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2);
  if (profile.username) return profile.username.slice(0, 2).toUpperCase();
  if (profile.email) return profile.email.slice(0, 2).toUpperCase();
  return '??';
}

// ── Micro components ──────────────────────────────────────────────────────────

function LoadingSpinner() {
  return (
    <div style={{ textAlign: 'center', padding: '3rem', color: MUTED, fontFamily: SANS }}>
      <div style={{ width: 28, height: 28, border: `2px solid ${BORDER}`, borderTop: `2px solid ${GOLD}`, borderRadius: '50%', animation: 'spin 0.8s linear infinite', margin: '0 auto 0.875rem' }} />
      Loading...
    </div>
  );
}

function EmptyState({ icon, title, desc, children }: { icon: string; title: string; desc: string; children?: React.ReactNode }) {
  return (
    <div style={{ textAlign: 'center', padding: '3.5rem 1rem' }}>
      <div style={{ fontSize: '2.25rem', marginBottom: '0.875rem', opacity: 0.55 }}>{icon}</div>
      <h3 style={{ fontFamily: SERIF, fontSize: '1.2rem', fontWeight: 600, color: TEXT, marginBottom: '0.4rem' }}>{title}</h3>
      <p style={{ fontFamily: SANS, fontSize: '0.8125rem', color: MUTED, marginBottom: '1.5rem' }}>{desc}</p>
      {children}
    </div>
  );
}

function GoldBtn({ children, onClick }: { children: React.ReactNode; onClick: () => void }) {
  return (
    <button onClick={onClick} style={{
      padding: '0.6rem 1.5rem',
      background: 'linear-gradient(180deg, rgba(201,168,76,0.18) 0%, rgba(201,168,76,0.09) 100%)',
      color: GOLD2, border: `1px solid ${BORDER2}`, borderTop: `1px solid rgba(200,168,76,0.38)`,
      borderRadius: '0.5rem', fontFamily: SANS, fontSize: '0.875rem', fontWeight: 600,
      cursor: 'pointer', letterSpacing: '0.04em',
    }}>
      {children}
    </button>
  );
}

// ── Stat widget (examvoid-style large card) ───────────────────────────────────
function StatWidget({ label, value, sub, accent }: { label: string; value: string | number; sub?: string; accent?: string }) {
  return (
    <div style={{
      background: SURFACE2, border: `1px solid ${BORDER}`, borderRadius: '1rem',
      padding: '1.375rem 1.5rem', position: 'relative', overflow: 'hidden',
    }}>
      <div style={{
        position: 'absolute', top: 0, left: 0, right: 0, height: '2px',
        background: `linear-gradient(90deg, transparent, ${accent ?? GOLD}, transparent)`,
        opacity: 0.6,
      }} />
      <div style={{ fontFamily: SANS, fontSize: '0.7rem', fontWeight: 700, letterSpacing: '0.14em', textTransform: 'uppercase', color: MUTED, marginBottom: '0.625rem' }}>{label}</div>
      <div style={{ fontFamily: SERIF, fontSize: '2.25rem', fontWeight: 600, color: accent ?? GOLD3, lineHeight: 1 }}>{value}</div>
      {sub && <div style={{ fontFamily: SANS, fontSize: '0.75rem', color: MUTED, marginTop: '0.4rem' }}>{sub}</div>}
    </div>
  );
}

// ── Nav item for sidebar ──────────────────────────────────────────────────────
function SideNavItem({ label, icon, active, onClick, count }: { label: string; icon: string; active: boolean; onClick: () => void; count?: number }) {
  return (
    <button onClick={onClick} style={{
      display: 'flex', alignItems: 'center', gap: '0.75rem',
      width: '100%', padding: '0.7rem 0.875rem', borderRadius: '0.625rem',
      background: active ? 'rgba(200,168,76,0.1)' : 'transparent',
      border: active ? `1px solid ${BORDER2}` : '1px solid transparent',
      color: active ? GOLD2 : MUTED, cursor: 'pointer',
      fontFamily: SANS, fontSize: '0.875rem', fontWeight: active ? 600 : 400,
      textAlign: 'left', transition: 'all 0.15s',
    }}>
      <span style={{ fontSize: '1rem', width: 20, textAlign: 'center', flexShrink: 0 }}>{icon}</span>
      <span style={{ flex: 1 }}>{label}</span>
      {count != null && (
        <span style={{
          padding: '2px 8px', borderRadius: 9999,
          background: active ? 'rgba(200,168,76,0.18)' : 'rgba(255,255,255,0.06)',
          fontSize: '0.7rem', fontWeight: 700, color: active ? GOLD : MUTED,
        }}>{count}</span>
      )}
    </button>
  );
}

// ── Resource card ─────────────────────────────────────────────────────────────
function ResourceCard({ resource, showDelete = false, onDelete, deleteConfirm = false, onConfirmDelete, onCancelDelete }: {
  resource: Resource; showDelete?: boolean; onDelete?: () => void;
  deleteConfirm?: boolean; onConfirmDelete?: () => void; onCancelDelete?: () => void;
}) {
  const subject = SUBJECTS.find(s => s.code === resource.subject);
  const resourceType = RESOURCE_TYPES.find(t => t.value === resource.resource_type);
  return (
    <div style={{ padding: '1rem 1.25rem', border: `1px solid ${BORDER}`, borderRadius: '0.75rem', background: SURFACE, transition: 'border-color 0.15s' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', gap: '1rem' }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', gap: '0.4rem', marginBottom: '0.5rem', flexWrap: 'wrap' }}>
            <span style={{ padding: '2px 8px', background: 'rgba(200,168,76,0.10)', color: GOLD, border: `1px solid ${BORDER}`, borderRadius: '4px', fontSize: '0.7rem', fontFamily: SANS, fontWeight: 700, letterSpacing: '0.04em' }}>{subject?.name}</span>
            <span style={{ padding: '2px 8px', background: 'rgba(255,255,255,0.04)', color: MUTED, border: `1px solid ${BORDER}`, borderRadius: '4px', fontSize: '0.7rem', fontFamily: SANS, fontWeight: 600 }}>{resourceType?.label}</span>
            <span style={{ padding: '2px 8px', background: 'rgba(200,168,76,0.05)', color: MUTED, border: `1px solid ${BORDER}`, borderRadius: '4px', fontSize: '0.7rem', fontFamily: SANS }}>{resource.upvote_count} upvotes</span>
          </div>
          <h4 style={{ fontFamily: SERIF, fontSize: '1rem', fontWeight: 600, color: TEXT, marginBottom: '0.2rem', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{resource.title}</h4>
          <p style={{ fontFamily: SANS, fontSize: '0.8rem', color: MUTED, marginBottom: '0.5rem', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>{resource.description}</p>
          <a href={resource.link} target="_blank" rel="noopener noreferrer" style={{ fontFamily: SANS, fontSize: '0.8rem', color: GOLD, textDecoration: 'none' }}>View Resource →</a>
        </div>
        {showDelete && (
          <button onClick={onDelete} style={{ padding: '0.35rem 0.7rem', background: 'rgba(180,40,40,0.12)', color: '#F09090', border: '1px solid rgba(180,40,40,0.22)', borderRadius: '0.5rem', cursor: 'pointer', fontFamily: SANS, fontSize: '0.78rem', fontWeight: 600, flexShrink: 0 }}>Delete</button>
        )}
      </div>
      {deleteConfirm && (
        <div style={{ marginTop: '0.875rem', padding: '0.75rem', background: 'rgba(180,40,40,0.08)', border: '1px solid rgba(180,40,40,0.22)', borderRadius: '0.5rem' }}>
          <p style={{ fontFamily: SANS, fontSize: '0.8125rem', color: '#F09090', marginBottom: '0.625rem', fontWeight: 600 }}>Are you sure? This cannot be undone.</p>
          <div style={{ display: 'flex', gap: '0.5rem' }}>
            <button onClick={onConfirmDelete} style={{ padding: '0.35rem 0.8rem', background: 'rgba(180,40,40,0.28)', color: '#F09090', border: '1px solid rgba(180,40,40,0.38)', borderRadius: '0.5rem', cursor: 'pointer', fontFamily: SANS, fontSize: '0.8rem', fontWeight: 600 }}>Yes, Delete</button>
            <button onClick={onCancelDelete} style={{ padding: '0.35rem 0.8rem', background: 'transparent', color: MUTED, border: `1px solid ${BORDER}`, borderRadius: '0.5rem', cursor: 'pointer', fontFamily: SANS, fontSize: '0.8rem' }}>Cancel</button>
          </div>
        </div>
      )}
    </div>
  );
}

// ── Progress bar ──────────────────────────────────────────────────────────────
function ProgressBar({ pct, color }: { pct: number; color: string }) {
  return (
    <div style={{ height: 5, background: 'rgba(255,255,255,0.07)', borderRadius: 9999, overflow: 'hidden' }}>
      <div style={{ height: '100%', width: `${Math.min(pct, 100)}%`, background: color, borderRadius: 9999, transition: 'width 0.6s ease' }} />
    </div>
  );
}

// ── Main component ────────────────────────────────────────────────────────────
export default function ProfilePage() {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [userEmail, setUserEmail] = useState<string | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<ActiveTab>('uploads');
  const [uploadedResources, setUploadedResources] = useState<Resource[]>([]);
  const [upvotedResources, setUpvotedResources] = useState<Resource[]>([]);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
  const [attempts, setAttempts] = useState<McqAttempt[]>([]);
  const [wrongQuestions, setWrongQuestions] = useState<McqWrongQuestion[]>([]);
  const [attemptsLoading, setAttemptsLoading] = useState(false);
  const [wrongLoading, setWrongLoading] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editForm, setEditForm] = useState({ username: '', full_name: '' });
  const [glowPos, setGlowPos] = useState({ x: 0, y: 0 });
  const [glowVisible, setGlowVisible] = useState(false);
  const [saveMessage, setSaveMessage] = useState('');

  useEffect(() => { fetchProfileData(); }, []);

  useEffect(() => {
    const move = (e: MouseEvent) => { setGlowPos({ x: e.clientX, y: e.clientY }); setGlowVisible(true); };
    const leave = () => setGlowVisible(false);
    window.addEventListener('mousemove', move);
    window.addEventListener('mouseleave', leave);
    return () => { window.removeEventListener('mousemove', move); window.removeEventListener('mouseleave', leave); };
  }, []);

  const fetchProfileData = async () => {
    setLoading(true);
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { router.push('/igcse/login'); return; }
    setUser(user);
    setUserEmail(user.email ?? null);
    const { data: profileData } = await supabase.from('profiles').select('*').eq('id', user.id).single();
    if (profileData) {
      setProfile(profileData as Profile);
      setEditForm({ username: (profileData as any).username || '', full_name: (profileData as any).full_name || '' });
    }
    const { data: uploads } = await supabase.from('resources').select('*').eq('uploader_id', user.id).order('created_at', { ascending: false });
    setUploadedResources(uploads || []);
    const { data: votes } = await supabase.from('votes').select('resource_id, resources(id,title,description,link,subject,resource_type,upvote_count,created_at,uploader_id)').eq('user_id', user.id);
    if (votes) setUpvotedResources(votes.map((v: any) => v.resources).filter(Boolean));
    setLoading(false);
  };

  useEffect(() => {
    if (activeTab === 'attempts' && attempts.length === 0 && !attemptsLoading) {
      setAttemptsLoading(true);
      fetch('/api/mcq-attempts').then(r => r.json()).then(d => setAttempts(d.attempts || [])).finally(() => setAttemptsLoading(false));
    }
    if (activeTab === 'weak' && wrongQuestions.length === 0 && !wrongLoading) {
      setWrongLoading(true);
      fetch('/api/mcq-wrong-questions').then(r => r.json()).then(d => setWrongQuestions(d.wrongQuestions || [])).finally(() => setWrongLoading(false));
    }
  }, [activeTab]);

  const handleSaveProfile = async () => {
    if (!user) return;
    const supabase = createClient();
    // @ts-expect-error
    const { error } = await supabase.from('profiles').update({ username: editForm.username, full_name: editForm.full_name }).eq('id', user.id);
    if (error) { setSaveMessage('Error saving profile'); }
    else { setSaveMessage('Profile updated!'); setIsEditing(false); fetchProfileData(); setTimeout(() => setSaveMessage(''), 3000); }
  };

  const handleDeleteResource = async (resourceId: string) => {
    if (!user) return;
    const supabase = createClient();
    const { error } = await supabase.from('resources').delete().eq('id', resourceId).eq('uploader_id', user.id);
    if (!error) { setUploadedResources(prev => prev.filter(r => r.id !== resourceId)); setDeleteConfirm(null); }
  };

  if (loading) return (
    <div style={{ minHeight: '100vh', background: BG, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <LoadingSpinner />
    </div>
  );
  if (!profile) return (
    <div style={{ minHeight: '100vh', background: BG, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <span style={{ fontFamily: SERIF, color: MUTED, fontSize: '1.25rem' }}>Profile not found</span>
    </div>
  );

  const wrongBySubject: Record<string, McqWrongQuestion[]> = {};
  for (const wq of wrongQuestions) (wrongBySubject[wq.subject_code] ??= []).push(wq);
  const avgPct = attempts.length ? Math.round(attempts.reduce((s, a) => s + Number(a.percentage), 0) / attempts.length) : null;
  const bestPct = attempts.length ? Math.max(...attempts.map(a => Number(a.percentage))) : null;

  const inputStyle: React.CSSProperties = {
    width: '100%', background: 'rgba(6,10,18,0.7)', border: `1px solid ${BORDER}`,
    borderRadius: '8px', padding: '10px 14px',
    fontFamily: SANS, fontSize: '14px', color: TEXT, outline: 'none',
  };

  const isCreator = CREATORS.includes(userEmail ?? '');

  return (
    <div style={{ minHeight: '100vh', background: BG, position: 'relative', overflowX: 'hidden' }}>

      {/* Dust */}
      <div className="pointer-events-none" style={{ position: 'fixed', inset: 0, zIndex: 0 }}>
        {DUST.map(p => (
          <div key={p.id} style={{
            position: 'absolute', width: `${p.size}px`, height: `${p.size}px`,
            borderRadius: '50%', left: `${p.left}%`, top: `${p.top}%`,
            background: 'radial-gradient(circle, rgba(255,218,80,1) 0%, rgba(212,175,55,0.65) 50%, transparent 100%)',
            boxShadow: '0 0 8px rgba(255,210,60,0.9), 0 0 18px rgba(200,160,40,0.5)',
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

      <div style={{ position: 'relative', zIndex: 2, maxWidth: 1200, margin: '0 auto', padding: '0 24px 64px', paddingTop: 88 }}>

        {/* ── Top header row ── */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.75rem', flexWrap: 'wrap', gap: '1rem' }}>
          <div>
            <h1 style={{ fontFamily: SERIF, fontSize: '1.875rem', fontWeight: 500, color: GOLD2, letterSpacing: '0.015em', marginBottom: '0.2rem' }}>
              Welcome back, <span style={{ color: GOLD3 }}>{profile.full_name || profile.username || 'Scholar'}</span>
            </h1>
            <p style={{ fontFamily: SANS, fontSize: '0.8125rem', color: MUTED }}>Your personal study dashboard</p>
          </div>
          <div style={{ display: 'flex', gap: '0.625rem' }}>
            {isCreator && (
              <button onClick={() => router.push('/igcse/admin/moderate')} style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontFamily: SANS, fontSize: '0.8125rem', fontWeight: 600, padding: '0.5rem 1rem', background: 'rgba(200,168,76,0.08)', color: GOLD, border: `1px solid ${BORDER2}`, borderRadius: '8px', cursor: 'pointer' }}>
                ⚖️ Moderation
              </button>
            )}
            <button onClick={() => router.push('/igcse/upload')} style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontFamily: SANS, fontSize: '0.8125rem', fontWeight: 600, padding: '0.5rem 1rem', background: 'linear-gradient(180deg, rgba(201,168,76,0.2) 0%, rgba(201,168,76,0.1) 100%)', color: GOLD2, border: `1px solid ${BORDER2}`, borderTop: `1px solid rgba(200,168,76,0.38)`, borderRadius: '8px', cursor: 'pointer' }}>
              + Upload
            </button>
          </div>
        </div>

        {/* ── Stat widgets row ── */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '1rem', marginBottom: '1.75rem' }}>
          <StatWidget label="Resources Uploaded" value={uploadedResources.length} sub="contributed to the archive" />
          <StatWidget label="Upvoted Resources" value={upvotedResources.length} sub="saved for later" accent="#A78BFA" />
          <StatWidget label="Exams Taken" value={attempts.length} sub={attempts.length ? `last: ${fmtDate(attempts[0]?.created_at)}` : 'none yet'} accent="#60A5FA" />
          <StatWidget label="Avg Score" value={avgPct != null ? `${avgPct}%` : '—'} sub={bestPct != null ? `best: ${bestPct}%` : 'complete an exam'} accent={avgPct != null ? (avgPct >= 80 ? '#6EE7A0' : avgPct >= 60 ? GOLD3 : '#F09090') : GOLD3} />
        </div>

        {/* ── Main two-column layout ── */}
        <div className="profile-layout" style={{ display: 'grid', gridTemplateColumns: '240px 1fr', gap: '1.25rem', alignItems: 'start' }}>

          {/* ── Left sidebar ── */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>

            {/* Profile card */}
            <div style={{ background: SURFACE2, border: `1px solid ${BORDER}`, borderRadius: '1rem', padding: '1.5rem', textAlign: 'center' }}>
              {/* Avatar */}
              <div style={{
                width: 72, height: 72, borderRadius: '50%', margin: '0 auto 1rem',
                background: 'linear-gradient(135deg, rgba(200,168,76,0.25) 0%, rgba(200,168,76,0.08) 100%)',
                border: `2px solid ${BORDER2}`,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontFamily: SERIF, fontSize: '1.75rem', fontWeight: 600, color: GOLD2,
              }}>
                {initials(profile)}
              </div>
              <div style={{ fontFamily: SERIF, fontSize: '1.1rem', fontWeight: 600, color: TEXT, marginBottom: '0.2rem' }}>
                {profile.full_name || profile.username || 'Scholar'}
              </div>
              <div style={{ fontFamily: SANS, fontSize: '0.75rem', color: MUTED, marginBottom: '0.875rem', wordBreak: 'break-all' }}>{profile.email}</div>
              {isCreator && (
                <div style={{ display: 'inline-block', padding: '2px 10px', background: 'rgba(200,168,76,0.12)', border: `1px solid ${BORDER2}`, borderRadius: 9999, fontFamily: SANS, fontSize: '0.7rem', fontWeight: 700, letterSpacing: '0.1em', color: GOLD, textTransform: 'uppercase', marginBottom: '0.875rem' }}>
                  Creator
                </div>
              )}
              <button
                onClick={() => setIsEditing(!isEditing)}
                style={{ display: 'block', width: '100%', padding: '0.5rem', background: 'transparent', color: isEditing ? '#F09090' : MUTED, border: `1px solid ${isEditing ? 'rgba(180,40,40,0.3)' : BORDER}`, borderRadius: '7px', cursor: 'pointer', fontFamily: SANS, fontSize: '0.8125rem', fontWeight: 600 }}
              >
                {isEditing ? 'Cancel Edit' : 'Edit Profile'}
              </button>
            </div>

            {/* Edit form */}
            {isEditing && (
              <div style={{ background: SURFACE2, border: `1px solid ${BORDER}`, borderRadius: '1rem', padding: '1.25rem' }}>
                <div style={{ fontFamily: SANS, fontSize: '0.7rem', fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', color: MUTED, marginBottom: '0.875rem' }}>Edit Profile</div>
                <div style={{ display: 'grid', gap: '0.75rem' }}>
                  {([['Username', 'username'], ['Full Name', 'full_name']] as const).map(([label, key]) => (
                    <div key={key}>
                      <label style={{ display: 'block', fontFamily: SANS, fontSize: '0.7rem', fontWeight: 600, letterSpacing: '0.1em', textTransform: 'uppercase', color: MUTED, marginBottom: '5px' }}>{label}</label>
                      <input type="text" value={editForm[key]} onChange={e => setEditForm({ ...editForm, [key]: e.target.value })} style={inputStyle}
                        onFocus={e => { e.currentTarget.style.borderColor = GOLD; }} onBlur={e => { e.currentTarget.style.borderColor = BORDER; }} />
                    </div>
                  ))}
                  <button onClick={handleSaveProfile} style={{ padding: '0.55rem 1rem', background: `linear-gradient(180deg, rgba(201,168,76,0.22) 0%, rgba(201,168,76,0.11) 100%)`, color: GOLD2, border: `1px solid ${BORDER2}`, borderTop: `1px solid rgba(200,168,76,0.38)`, borderRadius: '7px', fontFamily: SANS, fontSize: '0.875rem', fontWeight: 700, cursor: 'pointer' }}>
                    Save Changes
                  </button>
                  {saveMessage && <p style={{ fontFamily: SANS, fontSize: '0.8rem', color: '#6EE7A0', margin: 0 }}>{saveMessage}</p>}
                </div>
              </div>
            )}

            {/* Nav */}
            <div style={{ background: SURFACE2, border: `1px solid ${BORDER}`, borderRadius: '1rem', padding: '0.75rem' }}>
              <div style={{ fontFamily: SANS, fontSize: '0.68rem', fontWeight: 700, letterSpacing: '0.13em', textTransform: 'uppercase', color: MUTED, padding: '0.25rem 0.5rem', marginBottom: '0.375rem' }}>Library</div>
              <SideNavItem label="My Uploads" icon="◆" active={activeTab === 'uploads'} onClick={() => setActiveTab('uploads')} count={uploadedResources.length} />
              <SideNavItem label="Upvoted" icon="◈" active={activeTab === 'upvotes'} onClick={() => setActiveTab('upvotes')} count={upvotedResources.length} />
              <div style={{ fontFamily: SANS, fontSize: '0.68rem', fontWeight: 700, letterSpacing: '0.13em', textTransform: 'uppercase', color: MUTED, padding: '0.75rem 0.5rem 0.375rem' }}>Practice</div>
              <SideNavItem label="Exam History" icon="✦" active={activeTab === 'attempts'} onClick={() => setActiveTab('attempts')} count={attempts.length || undefined} />
              <SideNavItem label="Weak Questions" icon="§" active={activeTab === 'weak'} onClick={() => setActiveTab('weak')} count={wrongQuestions.length || undefined} />
            </div>

            {/* Quick links */}
            <div style={{ background: SURFACE2, border: `1px solid ${BORDER}`, borderRadius: '1rem', padding: '0.75rem' }}>
              <div style={{ fontFamily: SANS, fontSize: '0.68rem', fontWeight: 700, letterSpacing: '0.13em', textTransform: 'uppercase', color: MUTED, padding: '0.25rem 0.5rem', marginBottom: '0.375rem' }}>Quick Links</div>
              {[
                { label: 'Browse Resources', icon: '≡', href: '/igcse/browse' },
                { label: 'Practice MCQs', icon: '▶', href: '/igcse/practice' },
                { label: 'IGCSE Home', icon: '∑', href: '/igcse' },
              ].map(({ label, icon, href }) => (
                <button key={href} onClick={() => router.push(href)} style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', width: '100%', padding: '0.6rem 0.875rem', borderRadius: '0.5rem', background: 'transparent', border: '1px solid transparent', color: MUTED, cursor: 'pointer', fontFamily: SANS, fontSize: '0.8125rem', textAlign: 'left' }}>
                  <span style={{ fontSize: '0.875rem', width: 20, textAlign: 'center' }}>{icon}</span>
                  {label}
                </button>
              ))}
            </div>
          </div>

          {/* ── Right main panel ── */}
          <div style={{ minWidth: 0 }}>

            {/* Panel header */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem', flexWrap: 'wrap', gap: '0.5rem' }}>
              <div>
                <h2 style={{ fontFamily: SERIF, fontSize: '1.25rem', fontWeight: 600, color: TEXT, marginBottom: '0.1rem' }}>
                  {{ uploads: 'My Uploads', upvotes: 'Upvoted Resources', attempts: 'Exam History', weak: 'Weak Questions' }[activeTab]}
                </h2>
                <p style={{ fontFamily: SANS, fontSize: '0.78rem', color: MUTED }}>
                  {{ uploads: 'Resources you have contributed to the archive', upvotes: 'Resources you have bookmarked with an upvote', attempts: 'Your MCQ exam results and performance history', weak: 'Questions you answered incorrectly in past exams' }[activeTab]}
                </p>
              </div>
              {activeTab === 'uploads' && (
                <GoldBtn onClick={() => router.push('/igcse/upload')}>+ New Upload</GoldBtn>
              )}
              {activeTab === 'attempts' && attempts.length > 0 && (
                <GoldBtn onClick={() => router.push('/igcse/practice')}>Practice Now</GoldBtn>
              )}
            </div>

            {/* Panel content */}
            <div style={{ background: SURFACE, border: `1px solid ${BORDER}`, borderRadius: '1rem', overflow: 'hidden' }}>

              {/* ── Uploads ── */}
              {activeTab === 'uploads' && (
                uploadedResources.length === 0
                  ? <EmptyState icon="📚" title="No Uploads Yet" desc="Share your study materials with the community." />
                  : <div style={{ padding: '1.25rem', display: 'grid', gap: '0.75rem' }}>
                      {uploadedResources.map(r => (
                        <ResourceCard key={r.id} resource={r} showDelete onDelete={() => setDeleteConfirm(r.id)} deleteConfirm={deleteConfirm === r.id} onConfirmDelete={() => handleDeleteResource(r.id)} onCancelDelete={() => setDeleteConfirm(null)} />
                      ))}
                    </div>
              )}

              {/* ── Upvoted ── */}
              {activeTab === 'upvotes' && (
                upvotedResources.length === 0
                  ? <EmptyState icon="🔖" title="No Upvoted Resources" desc="Upvote resources you find helpful to save them here."><GoldBtn onClick={() => router.push('/igcse/browse')}>Browse Resources</GoldBtn></EmptyState>
                  : <div style={{ padding: '1.25rem', display: 'grid', gap: '0.75rem' }}>
                      {upvotedResources.map(r => <ResourceCard key={r.id} resource={r} />)}
                    </div>
              )}

              {/* ── Exam History ── */}
              {activeTab === 'attempts' && (
                attemptsLoading ? <div style={{ padding: '1.25rem' }}><LoadingSpinner /></div> :
                attempts.length === 0
                  ? <EmptyState icon="📝" title="No Exams Yet" desc="Complete an MCQ exam and your results will appear here."><GoldBtn onClick={() => router.push('/igcse/practice')}>Start Practising</GoldBtn></EmptyState>
                  : <div style={{ padding: '1.25rem', display: 'grid', gap: '0.75rem' }}>
                      {attempts.map(a => {
                        const pct = Number(a.percentage);
                        const { bg, text: tColor, border: bColor } = gradeColour(pct);
                        const barColor = pct >= 80 ? '#6EE7A0' : pct >= 60 ? GOLD3 : '#F09090';
                        return (
                          <div key={a.id} style={{ padding: '1.125rem 1.25rem', border: `1px solid ${BORDER}`, borderRadius: '0.875rem', background: SURFACE2 }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.875rem', marginBottom: '0.625rem', flexWrap: 'wrap' }}>
                              {/* Grade badge */}
                              <div style={{ width: 44, height: 44, borderRadius: '0.625rem', background: bg, border: `1px solid ${bColor}`, color: tColor, display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: SERIF, fontWeight: 700, fontSize: '1rem', flexShrink: 0 }}>
                                {gradeFromPct(pct)}
                              </div>
                              <div style={{ flex: 1, minWidth: 0 }}>
                                <div style={{ fontFamily: SERIF, fontWeight: 600, fontSize: '0.9375rem', color: TEXT, marginBottom: 2, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{paperLabel(a.paper_id)}</div>
                                <div style={{ fontFamily: SANS, fontSize: '0.72rem', color: MUTED, display: 'flex', gap: '0.5rem', alignItems: 'center', flexWrap: 'wrap' }}>
                                  {fmtDate(a.created_at)}
                                  {a.is_practice && <span style={{ padding: '1px 6px', background: 'rgba(200,168,76,0.1)', color: GOLD, borderRadius: 4, fontSize: '0.68rem', fontWeight: 600, border: `1px solid ${BORDER}` }}>Practice</span>}
                                </div>
                              </div>
                              {/* Score chips */}
                              <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap' }}>
                                {([['Score', `${a.score}/${a.total}`], ['%', `${pct}%`], ['Time', fmtTime(a.time_taken_seconds)]] as const).map(([lbl, val]) => (
                                  <div key={lbl} style={{ padding: '0.2rem 0.6rem', background: 'rgba(200,168,76,0.07)', border: `1px solid ${BORDER}`, borderRadius: '0.375rem', textAlign: 'center' }}>
                                    <div style={{ fontFamily: SANS, fontSize: '0.6rem', color: MUTED, textTransform: 'uppercase', letterSpacing: '0.1em' }}>{lbl}</div>
                                    <div style={{ fontFamily: SERIF, fontSize: '0.875rem', fontWeight: 600, color: GOLD2 }}>{val}</div>
                                  </div>
                                ))}
                              </div>
                            </div>
                            {/* Progress bar */}
                            <ProgressBar pct={pct} color={barColor} />
                            {/* Actions */}
                            <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.75rem' }}>
                              <button onClick={() => router.push(`/igcse/mcq-review/${a.id}`)} style={{ padding: '0.35rem 0.875rem', background: 'rgba(200,168,76,0.09)', color: GOLD2, border: `1px solid ${BORDER2}`, borderRadius: '6px', fontFamily: SANS, fontSize: '0.8rem', fontWeight: 600, cursor: 'pointer' }}>
                                Review
                              </button>
                              <button onClick={() => router.push(`/igcse/mcq-exam/${a.paper_id}`)} style={{ padding: '0.35rem 0.875rem', background: 'transparent', color: MUTED, border: `1px solid ${BORDER}`, borderRadius: '6px', fontFamily: SANS, fontSize: '0.8rem', cursor: 'pointer' }}>
                                Retry
                              </button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
              )}

              {/* ── Weak Questions ── */}
              {activeTab === 'weak' && (
                wrongLoading ? <div style={{ padding: '1.25rem' }}><LoadingSpinner /></div> :
                wrongQuestions.length === 0
                  ? <EmptyState icon="🎯" title="No Weak Areas Yet" desc="Questions you get wrong in MCQ exams will appear here grouped by subject."><GoldBtn onClick={() => router.push('/igcse/practice')}>Start Practising</GoldBtn></EmptyState>
                  : <div style={{ padding: '1.25rem', display: 'grid', gap: '1.5rem' }}>
                      {Object.entries(wrongBySubject).map(([code, qs]) => {
                        const totalPapers = [...new Set(qs.map(q => q.paper_id))].length;
                        return (
                          <div key={code}>
                            {/* Subject header with mini stat */}
                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.625rem', flexWrap: 'wrap', gap: '0.5rem' }}>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '0.625rem' }}>
                                <span style={{ fontFamily: SERIF, fontWeight: 600, fontSize: '1rem', color: TEXT }}>{SUBJECT_NAME[code] ?? code}</span>
                                <span style={{ padding: '2px 9px', background: 'rgba(160,40,40,0.16)', color: '#F09090', border: '1px solid rgba(180,40,40,0.28)', borderRadius: 9999, fontSize: '0.7rem', fontFamily: SANS, fontWeight: 700 }}>{qs.length} wrong</span>
                              </div>
                              <span style={{ fontFamily: SANS, fontSize: '0.72rem', color: MUTED }}>across {totalPapers} paper{totalPapers !== 1 ? 's' : ''}</span>
                            </div>
                            <div style={{ display: 'grid', gap: '0.5rem' }}>
                              {qs.map(wq => (
                                <div key={wq.id} style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', padding: '0.75rem 1rem', border: '1px solid rgba(180,40,40,0.18)', borderRadius: '0.625rem', background: 'rgba(160,40,40,0.05)', flexWrap: 'wrap' }}>
                                  <span style={{ fontFamily: SANS, fontSize: '0.8125rem', color: TEXT, flex: 1, minWidth: 0 }}>
                                    <strong style={{ fontFamily: SERIF }}>{paperLabel(wq.paper_id)}</strong> — Q{wq.question_number}
                                  </span>
                                  <div style={{ display: 'flex', gap: '0.5rem', flexShrink: 0 }}>
                                    <span style={{ padding: '2px 8px', background: 'rgba(160,40,40,0.15)', borderRadius: 4, fontFamily: SANS, fontSize: '0.75rem', color: '#F09090', fontWeight: 600 }}>You: {wq.user_answer ?? '—'}</span>
                                    <span style={{ padding: '2px 8px', background: 'rgba(20,120,60,0.15)', borderRadius: 4, fontFamily: SANS, fontSize: '0.75rem', color: '#6EE7A0', fontWeight: 600 }}>✓ {wq.correct_answer}</span>
                                  </div>
                                  <span style={{ fontFamily: SANS, fontSize: '0.72rem', color: MUTED, flexShrink: 0 }}>{fmtDate(wq.created_at)}</span>
                                </div>
                              ))}
                            </div>
                          </div>
                        );
                      })}
                    </div>
              )}

            </div>
          </div>
        </div>
      </div>

      <style jsx global>{`
        @keyframes dust0 { 0%{transform:translate(0,0);opacity:0} 15%{opacity:.7} 50%{transform:translate(16px,-52px);opacity:.85} 85%{opacity:.5} 100%{transform:translate(0,0);opacity:0} }
        @keyframes dust1 { 0%{transform:translate(0,0);opacity:0} 15%{opacity:.6} 50%{transform:translate(-18px,-44px);opacity:.75} 85%{opacity:.45} 100%{transform:translate(0,0);opacity:0} }
        @keyframes dust2 { 0%{transform:translate(0,0);opacity:0} 20%{opacity:.65} 50%{transform:translate(10px,-60px);opacity:.8} 80%{opacity:.4} 100%{transform:translate(0,0);opacity:0} }
        @keyframes spin { to { transform: rotate(360deg); } }

        /* Responsive: collapse sidebar on tablet/mobile */
        @media (max-width: 860px) {
          .profile-layout { grid-template-columns: 1fr !important; }
        }
      `}</style>
    </div>
  );
}
