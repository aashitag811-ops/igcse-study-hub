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
const SURFACE2 = 'rgba(255,255,255,0.030)';
const BORDER   = 'rgba(200,168,76,0.10)';
const BORDER2  = 'rgba(200,168,76,0.22)';
const TEXT  = '#E8DCC4';
const MUTED = 'rgba(196,176,138,0.5)';
const SIDEBAR_W = 260;

// ── Dust particles ────────────────────────────────────────────────────────────
const DUST = Array.from({ length: 36 }, (_, i) => ({
  id: i, size: 1.5 + (i * 5.7 % 2.6),
  left: (i * 18.3 + 6) % 100, top: (i * 24.7 + 9) % 100,
  dur: 14 + (i * 3.3 % 12), delay: (i * 2.9) % 10, anim: i % 3,
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
type ActiveTab = 'overview' | 'uploads' | 'upvotes' | 'attempts' | 'weak';

const CREATORS = ['arinjaysaha2010@gmail.com', 'aashitag811@gmail.com'];
const SUBJECT_NAME: Record<string, string> = Object.fromEntries(SUBJECTS.map(s => [s.code, s.name]));

// ── Helpers ───────────────────────────────────────────────────────────────────
function gradeFromPct(pct: number) {
  if (pct >= 90) return 'A*'; if (pct >= 80) return 'A';
  if (pct >= 70) return 'B';  if (pct >= 60) return 'C';
  if (pct >= 50) return 'D';  return 'E';
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

// ── Small reusables ───────────────────────────────────────────────────────────
function LoadingSpinner() {
  return (
    <div style={{ textAlign: 'center', padding: '3.5rem', color: MUTED, fontFamily: SANS }}>
      <div style={{ width: 26, height: 26, border: `2px solid ${BORDER}`, borderTop: `2px solid ${GOLD}`, borderRadius: '50%', animation: 'spin 0.8s linear infinite', margin: '0 auto 0.75rem' }} />
      Loading...
    </div>
  );
}

function EmptyState({ icon, title, desc, cta, onCta }: { icon: string; title: string; desc: string; cta?: string; onCta?: () => void }) {
  return (
    <div style={{ textAlign: 'center', padding: '4rem 2rem' }}>
      <div style={{ fontSize: '2rem', marginBottom: '0.875rem', opacity: 0.5 }}>{icon}</div>
      <div style={{ fontFamily: SERIF, fontSize: '1.2rem', fontWeight: 600, color: TEXT, marginBottom: '0.4rem' }}>{title}</div>
      <div style={{ fontFamily: SANS, fontSize: '0.8125rem', color: MUTED, marginBottom: cta ? '1.5rem' : 0 }}>{desc}</div>
      {cta && onCta && (
        <button onClick={onCta} style={{ padding: '0.55rem 1.375rem', background: 'rgba(200,168,76,0.12)', color: GOLD2, border: `1px solid ${BORDER2}`, borderRadius: '7px', fontFamily: SANS, fontSize: '0.875rem', fontWeight: 600, cursor: 'pointer' }}>{cta}</button>
      )}
    </div>
  );
}

function ProgressBar({ pct, color }: { pct: number; color: string }) {
  return (
    <div style={{ height: 4, background: 'rgba(255,255,255,0.07)', borderRadius: 9999, overflow: 'hidden', marginTop: '0.625rem' }}>
      <div style={{ height: '100%', width: `${Math.min(pct, 100)}%`, background: color, borderRadius: 9999 }} />
    </div>
  );
}

// ── Sidebar nav item — left-accent style like examvoid ────────────────────────
function NavItem({ label, icon, active, badge, onClick }: {
  label: string; icon: React.ReactNode; active: boolean;
  badge?: number; onClick: () => void;
}) {
  return (
    <button onClick={onClick} style={{
      display: 'flex', alignItems: 'center', gap: '0.75rem',
      width: '100%', padding: '0.65rem 1rem', borderRadius: '0.5rem',
      background: active ? 'rgba(200,168,76,0.09)' : 'transparent',
      border: active ? `1px solid ${BORDER2}` : '1px solid transparent',
      borderLeft: active ? `3px solid ${GOLD}` : '3px solid transparent',
      color: active ? GOLD2 : MUTED, cursor: 'pointer',
      fontFamily: SANS, fontSize: '0.8375rem', fontWeight: active ? 600 : 400,
      textAlign: 'left', letterSpacing: '0.01em',
    }}>
      <span style={{ display: 'flex', alignItems: 'center', width: 18, flexShrink: 0, opacity: active ? 1 : 0.7 }}>{icon}</span>
      <span style={{ flex: 1 }}>{label}</span>
      {badge != null && badge > 0 && (
        <span style={{
          minWidth: 20, padding: '1px 6px', borderRadius: 9999, textAlign: 'center',
          background: active ? 'rgba(200,168,76,0.2)' : 'rgba(255,255,255,0.07)',
          fontSize: '0.68rem', fontWeight: 700, color: active ? GOLD : MUTED,
        }}>{badge}</span>
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
    <div style={{ padding: '1rem 1.125rem', border: `1px solid ${BORDER}`, borderRadius: '0.75rem', background: SURFACE }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', gap: '0.875rem' }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', gap: '0.375rem', marginBottom: '0.45rem', flexWrap: 'wrap' }}>
            <span style={{ padding: '1px 7px', background: 'rgba(200,168,76,0.10)', color: GOLD, border: `1px solid rgba(200,168,76,0.18)`, borderRadius: '4px', fontSize: '0.69rem', fontFamily: SANS, fontWeight: 700, letterSpacing: '0.04em' }}>{subject?.name}</span>
            <span style={{ padding: '1px 7px', background: 'rgba(255,255,255,0.04)', color: MUTED, border: `1px solid ${BORDER}`, borderRadius: '4px', fontSize: '0.69rem', fontFamily: SANS }}>{resourceType?.label}</span>
            <span style={{ padding: '1px 7px', background: 'rgba(200,168,76,0.05)', color: MUTED, border: `1px solid ${BORDER}`, borderRadius: '4px', fontSize: '0.69rem', fontFamily: SANS }}>{resource.upvote_count} ↑</span>
          </div>
          <div style={{ fontFamily: SERIF, fontSize: '0.9625rem', fontWeight: 600, color: TEXT, marginBottom: '0.2rem', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{resource.title}</div>
          <div style={{ fontFamily: SANS, fontSize: '0.78rem', color: MUTED, marginBottom: '0.45rem', display: '-webkit-box', WebkitLineClamp: 1, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>{resource.description}</div>
          <a href={resource.link} target="_blank" rel="noopener noreferrer" style={{ fontFamily: SANS, fontSize: '0.775rem', color: GOLD, textDecoration: 'none' }}>Open →</a>
        </div>
        {showDelete && (
          <button onClick={onDelete} style={{ padding: '0.3rem 0.625rem', background: 'rgba(180,40,40,0.1)', color: '#F09090', border: '1px solid rgba(180,40,40,0.2)', borderRadius: '0.4rem', cursor: 'pointer', fontFamily: SANS, fontSize: '0.75rem', fontWeight: 600, flexShrink: 0 }}>Delete</button>
        )}
      </div>
      {deleteConfirm && (
        <div style={{ marginTop: '0.75rem', padding: '0.75rem', background: 'rgba(180,40,40,0.07)', border: '1px solid rgba(180,40,40,0.2)', borderRadius: '0.5rem' }}>
          <p style={{ fontFamily: SANS, fontSize: '0.8rem', color: '#F09090', marginBottom: '0.5rem', fontWeight: 600 }}>Are you sure? This cannot be undone.</p>
          <div style={{ display: 'flex', gap: '0.5rem' }}>
            <button onClick={onConfirmDelete} style={{ padding: '0.3rem 0.75rem', background: 'rgba(180,40,40,0.25)', color: '#F09090', border: '1px solid rgba(180,40,40,0.35)', borderRadius: '0.4rem', cursor: 'pointer', fontFamily: SANS, fontSize: '0.775rem', fontWeight: 600 }}>Yes, Delete</button>
            <button onClick={onCancelDelete} style={{ padding: '0.3rem 0.75rem', background: 'transparent', color: MUTED, border: `1px solid ${BORDER}`, borderRadius: '0.4rem', cursor: 'pointer', fontFamily: SANS, fontSize: '0.775rem' }}>Cancel</button>
          </div>
        </div>
      )}
    </div>
  );
}

// ── SVG icons (inline, 16×16) ─────────────────────────────────────────────────
const IC = { size: 16, fill: 'none', stroke: 'currentColor', strokeWidth: 1.75, strokeLinecap: 'round' as const, strokeLinejoin: 'round' as const };
const IcOverview   = () => <svg {...IC} viewBox="0 0 24 24"><rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/></svg>;
const IcUpload     = () => <svg {...IC} viewBox="0 0 24 24"><path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg>;
const IcBookmark   = () => <svg {...IC} viewBox="0 0 24 24"><path d="M19 21l-7-5-7 5V5a2 2 0 012-2h10a2 2 0 012 2z"/></svg>;
const IcExam       = () => <svg {...IC} viewBox="0 0 24 24"><path d="M9 11l3 3L22 4"/><path d="M21 12v7a2 2 0 01-2 2H5a2 2 0 01-2-2V5a2 2 0 012-2h11"/></svg>;
const IcWeak       = () => <svg {...IC} viewBox="0 0 24 24"><circle cx="12" cy="12" r="10"/><path d="M12 8v4"/><circle cx="12" cy="16" r=".5" fill="currentColor"/></svg>;
const IcBrowse     = () => <svg {...IC} viewBox="0 0 24 24"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>;
const IcPractice   = () => <svg {...IC} viewBox="0 0 24 24"><polygon points="5 3 19 12 5 21 5 3"/></svg>;
const IcHome       = () => <svg {...IC} viewBox="0 0 24 24"><path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>;
const IcEdit       = () => <svg {...IC} viewBox="0 0 24 24"><path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>;
const IcMod        = () => <svg {...IC} viewBox="0 0 24 24"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>;

// ── Main component ────────────────────────────────────────────────────────────
export default function ProfilePage() {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [userEmail, setUserEmail] = useState<string | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<ActiveTab>('overview');
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
    // eagerly load attempts for overview
    setAttemptsLoading(true);
    fetch('/api/mcq-attempts').then(r => r.json()).then(d => setAttempts(d.attempts || [])).finally(() => setAttemptsLoading(false));
    setLoading(false);
  };

  useEffect(() => {
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
    if (error) { setSaveMessage('Error saving'); }
    else { setSaveMessage('Saved!'); setIsEditing(false); fetchProfileData(); setTimeout(() => setSaveMessage(''), 3000); }
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
  const isCreator = CREATORS.includes(userEmail ?? '');

  const inputStyle: React.CSSProperties = {
    width: '100%', background: 'rgba(6,10,18,0.7)', border: `1px solid ${BORDER}`,
    borderRadius: '7px', padding: '9px 13px',
    fontFamily: SANS, fontSize: '0.875rem', color: TEXT, outline: 'none',
  };

  // ── Sidebar ──────────────────────────────────────────────────────────────────
  const Sidebar = (
    <aside style={{
      width: SIDEBAR_W, flexShrink: 0,
      position: 'sticky', top: 80, maxHeight: 'calc(100vh - 96px)',
      overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 0,
      background: SURFACE2, border: `1px solid ${BORDER}`, borderRadius: '1rem',
    }}>

      {/* ── Avatar + identity ── */}
      <div style={{ padding: '1.5rem 1.25rem 1.25rem', borderBottom: `1px solid ${BORDER}` }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.875rem' }}>
          <div style={{
            width: 48, height: 48, borderRadius: '50%', flexShrink: 0,
            background: 'linear-gradient(135deg, rgba(200,168,76,0.28) 0%, rgba(200,168,76,0.08) 100%)',
            border: `2px solid ${BORDER2}`,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontFamily: SERIF, fontSize: '1.25rem', fontWeight: 600, color: GOLD2,
          }}>
            {initials(profile)}
          </div>
          <div style={{ minWidth: 0 }}>
            <div style={{ fontFamily: SERIF, fontSize: '1rem', fontWeight: 600, color: TEXT, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
              {profile.full_name || profile.username || 'Scholar'}
            </div>
            <div style={{ fontFamily: SANS, fontSize: '0.72rem', color: MUTED, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{profile.email}</div>
          </div>
        </div>
        {isCreator && (
          <div style={{ marginTop: '0.75rem', display: 'inline-block', padding: '2px 9px', background: 'rgba(200,168,76,0.1)', border: `1px solid ${BORDER2}`, borderRadius: 9999, fontFamily: SANS, fontSize: '0.65rem', fontWeight: 700, letterSpacing: '0.12em', color: GOLD, textTransform: 'uppercase' }}>
            Creator
          </div>
        )}
      </div>

      {/* ── Nav sections ── */}
      <div style={{ padding: '0.875rem 0.75rem', flex: 1 }}>
        <div style={{ fontFamily: SANS, fontSize: '0.63rem', fontWeight: 700, letterSpacing: '0.14em', textTransform: 'uppercase', color: MUTED, padding: '0 0.375rem', marginBottom: '0.375rem' }}>Dashboard</div>
        <NavItem label="Overview" icon={<IcOverview />} active={activeTab === 'overview'} onClick={() => setActiveTab('overview')} />

        <div style={{ fontFamily: SANS, fontSize: '0.63rem', fontWeight: 700, letterSpacing: '0.14em', textTransform: 'uppercase', color: MUTED, padding: '0 0.375rem', margin: '1rem 0 0.375rem' }}>Resources</div>
        <NavItem label="My Uploads" icon={<IcUpload />} active={activeTab === 'uploads'} onClick={() => setActiveTab('uploads')} badge={uploadedResources.length} />
        <NavItem label="Upvoted" icon={<IcBookmark />} active={activeTab === 'upvotes'} onClick={() => setActiveTab('upvotes')} badge={upvotedResources.length} />

        <div style={{ fontFamily: SANS, fontSize: '0.63rem', fontWeight: 700, letterSpacing: '0.14em', textTransform: 'uppercase', color: MUTED, padding: '0 0.375rem', margin: '1rem 0 0.375rem' }}>Practice</div>
        <NavItem label="Exam History" icon={<IcExam />} active={activeTab === 'attempts'} onClick={() => setActiveTab('attempts')} badge={attempts.length || undefined} />
        <NavItem label="Weak Questions" icon={<IcWeak />} active={activeTab === 'weak'} onClick={() => setActiveTab('weak')} badge={wrongQuestions.length || undefined} />

        <div style={{ height: 1, background: BORDER, margin: '1rem 0.375rem' }} />

        <div style={{ fontFamily: SANS, fontSize: '0.63rem', fontWeight: 700, letterSpacing: '0.14em', textTransform: 'uppercase', color: MUTED, padding: '0 0.375rem', marginBottom: '0.375rem' }}>Go To</div>
        <NavItem label="Browse" icon={<IcBrowse />} active={false} onClick={() => router.push('/igcse/browse')} />
        <NavItem label="Practice MCQs" icon={<IcPractice />} active={false} onClick={() => router.push('/igcse/practice')} />
        <NavItem label="IGCSE Home" icon={<IcHome />} active={false} onClick={() => router.push('/igcse')} />
      </div>

      {/* ── Bottom actions ── */}
      <div style={{ padding: '0.875rem 0.75rem', borderTop: `1px solid ${BORDER}`, display: 'flex', flexDirection: 'column', gap: '0.375rem' }}>
        <button onClick={() => { setActiveTab('overview'); setIsEditing(true); }} style={{ display: 'flex', alignItems: 'center', gap: '0.625rem', width: '100%', padding: '0.6rem 0.875rem', borderRadius: '0.5rem', background: 'transparent', border: '1px solid transparent', color: MUTED, cursor: 'pointer', fontFamily: SANS, fontSize: '0.8125rem', textAlign: 'left' }}>
          <span style={{ display: 'flex', width: 16 }}><IcEdit /></span> Edit Profile
        </button>
        {isCreator && (
          <button onClick={() => router.push('/igcse/admin/moderate')} style={{ display: 'flex', alignItems: 'center', gap: '0.625rem', width: '100%', padding: '0.6rem 0.875rem', borderRadius: '0.5rem', background: 'transparent', border: '1px solid transparent', color: MUTED, cursor: 'pointer', fontFamily: SANS, fontSize: '0.8125rem', textAlign: 'left' }}>
            <span style={{ display: 'flex', width: 16 }}><IcMod /></span> Moderation
          </button>
        )}
      </div>
    </aside>
  );

  // ── Overview tab content ──────────────────────────────────────────────────────
  const OverviewContent = (
    <div style={{ display: 'grid', gap: '1.25rem' }}>

      {/* Stat row */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: '0.875rem' }}>
        {[
          { label: 'Uploads', value: uploadedResources.length, sub: 'contributed', accent: GOLD },
          { label: 'Upvoted', value: upvotedResources.length, sub: 'saved', accent: '#A78BFA' },
          { label: 'Exams', value: attempts.length, sub: 'completed', accent: '#60A5FA' },
          { label: 'Avg Score', value: avgPct != null ? `${avgPct}%` : '—', sub: bestPct != null ? `best ${bestPct}%` : 'no data', accent: avgPct != null ? (avgPct >= 80 ? '#6EE7A0' : avgPct >= 60 ? GOLD3 : '#F09090') : GOLD3 },
        ].map(({ label, value, sub, accent }) => (
          <div key={label} style={{ background: SURFACE2, border: `1px solid ${BORDER}`, borderRadius: '0.875rem', padding: '1.125rem 1.25rem', position: 'relative', overflow: 'hidden' }}>
            <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 2, background: `linear-gradient(90deg, transparent, ${accent}, transparent)`, opacity: 0.7 }} />
            <div style={{ fontFamily: SANS, fontSize: '0.67rem', fontWeight: 700, letterSpacing: '0.14em', textTransform: 'uppercase', color: MUTED, marginBottom: '0.5rem' }}>{label}</div>
            <div style={{ fontFamily: SERIF, fontSize: '2rem', fontWeight: 600, color: accent, lineHeight: 1 }}>{value}</div>
            <div style={{ fontFamily: SANS, fontSize: '0.72rem', color: MUTED, marginTop: '0.3rem' }}>{sub}</div>
          </div>
        ))}
      </div>

      {/* Profile info / edit */}
      <div style={{ background: SURFACE2, border: `1px solid ${BORDER}`, borderRadius: '0.875rem', overflow: 'hidden' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '1rem 1.25rem', borderBottom: `1px solid ${BORDER}` }}>
          <span style={{ fontFamily: SANS, fontSize: '0.72rem', fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', color: MUTED }}>Account Details</span>
          <button onClick={() => setIsEditing(!isEditing)} style={{ display: 'flex', alignItems: 'center', gap: '0.375rem', padding: '0.3rem 0.75rem', background: isEditing ? 'rgba(180,40,40,0.1)' : 'rgba(200,168,76,0.08)', color: isEditing ? '#F09090' : MUTED, border: `1px solid ${isEditing ? 'rgba(180,40,40,0.25)' : BORDER}`, borderRadius: '5px', cursor: 'pointer', fontFamily: SANS, fontSize: '0.775rem', fontWeight: 600 }}>
            {isEditing ? '✕ Cancel' : '✎ Edit'}
          </button>
        </div>
        {isEditing ? (
          <div style={{ padding: '1.25rem', display: 'grid', gap: '0.875rem', maxWidth: 440 }}>
            {([['Username', 'username'], ['Full Name', 'full_name']] as const).map(([label, key]) => (
              <div key={key}>
                <label style={{ display: 'block', fontFamily: SANS, fontSize: '0.68rem', fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', color: MUTED, marginBottom: '5px' }}>{label}</label>
                <input type="text" value={editForm[key]} onChange={e => setEditForm({ ...editForm, [key]: e.target.value })} style={inputStyle}
                  onFocus={e => (e.currentTarget.style.borderColor = GOLD)} onBlur={e => (e.currentTarget.style.borderColor = BORDER)} />
              </div>
            ))}
            <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
              <button onClick={handleSaveProfile} style={{ padding: '0.5rem 1.25rem', background: 'linear-gradient(180deg, rgba(201,168,76,0.22) 0%, rgba(201,168,76,0.11) 100%)', color: GOLD2, border: `1px solid ${BORDER2}`, borderRadius: '7px', fontFamily: SANS, fontSize: '0.875rem', fontWeight: 700, cursor: 'pointer' }}>Save Changes</button>
              {saveMessage && <span style={{ fontFamily: SANS, fontSize: '0.8rem', color: '#6EE7A0' }}>{saveMessage}</span>}
            </div>
          </div>
        ) : (
          <div style={{ padding: '1.125rem 1.25rem', display: 'grid', gap: '0.625rem' }}>
            {[['Email', profile.email], ['Username', profile.username || '—'], ...(profile.full_name ? [['Full Name', profile.full_name]] : [])].map(([label, value]) => (
              <div key={label} style={{ display: 'flex', gap: '1rem', alignItems: 'baseline' }}>
                <span style={{ fontFamily: SANS, fontSize: '0.7rem', fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: MUTED, minWidth: 88, flexShrink: 0 }}>{label}</span>
                <span style={{ fontFamily: SERIF, fontSize: '0.9625rem', color: TEXT }}>{value}</span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Recent exams */}
      <div style={{ background: SURFACE2, border: `1px solid ${BORDER}`, borderRadius: '0.875rem', overflow: 'hidden' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '1rem 1.25rem', borderBottom: `1px solid ${BORDER}` }}>
          <span style={{ fontFamily: SANS, fontSize: '0.72rem', fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', color: MUTED }}>Recent Exams</span>
          {attempts.length > 3 && (
            <button onClick={() => setActiveTab('attempts')} style={{ fontFamily: SANS, fontSize: '0.775rem', color: GOLD, background: 'transparent', border: 'none', cursor: 'pointer', fontWeight: 600 }}>View all →</button>
          )}
        </div>
        {attemptsLoading ? (
          <LoadingSpinner />
        ) : attempts.length === 0 ? (
          <EmptyState icon="📝" title="No Exams Yet" desc="Complete a practice paper to see your results here." cta="Start Practising" onCta={() => router.push('/igcse/practice')} />
        ) : (
          <div style={{ padding: '0.75rem' }}>
            {attempts.slice(0, 3).map(a => {
              const pct = Number(a.percentage);
              const { bg, text: tColor, border: bColor } = gradeColour(pct);
              const barColor = pct >= 80 ? '#6EE7A0' : pct >= 60 ? GOLD3 : '#F09090';
              return (
                <div key={a.id} style={{ display: 'flex', alignItems: 'center', gap: '0.875rem', padding: '0.75rem 0.625rem', borderRadius: '0.625rem' }}>
                  <div style={{ width: 40, height: 40, borderRadius: '0.5rem', background: bg, border: `1px solid ${bColor}`, color: tColor, display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: SERIF, fontWeight: 700, fontSize: '0.9375rem', flexShrink: 0 }}>{gradeFromPct(pct)}</div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontFamily: SERIF, fontSize: '0.9rem', fontWeight: 600, color: TEXT, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{paperLabel(a.paper_id)}</div>
                    <ProgressBar pct={pct} color={barColor} />
                  </div>
                  <div style={{ textAlign: 'right', flexShrink: 0 }}>
                    <div style={{ fontFamily: SERIF, fontSize: '1.1rem', fontWeight: 700, color: tColor }}>{pct}%</div>
                    <div style={{ fontFamily: SANS, fontSize: '0.67rem', color: MUTED }}>{fmtDate(a.created_at)}</div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Recent uploads */}
      {uploadedResources.length > 0 && (
        <div style={{ background: SURFACE2, border: `1px solid ${BORDER}`, borderRadius: '0.875rem', overflow: 'hidden' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '1rem 1.25rem', borderBottom: `1px solid ${BORDER}` }}>
            <span style={{ fontFamily: SANS, fontSize: '0.72rem', fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', color: MUTED }}>Recent Uploads</span>
            {uploadedResources.length > 3 && (
              <button onClick={() => setActiveTab('uploads')} style={{ fontFamily: SANS, fontSize: '0.775rem', color: GOLD, background: 'transparent', border: 'none', cursor: 'pointer', fontWeight: 600 }}>View all →</button>
            )}
          </div>
          <div style={{ padding: '0.875rem' }}>
            {uploadedResources.slice(0, 3).map(r => (
              <ResourceCard key={r.id} resource={r} />
            ))}
          </div>
        </div>
      )}
    </div>
  );

  // ── Render ────────────────────────────────────────────────────────────────────
  return (
    <div style={{ minHeight: '100vh', background: BG, position: 'relative', overflowX: 'hidden' }}>

      {/* Dust */}
      <div className="pointer-events-none" style={{ position: 'fixed', inset: 0, zIndex: 0 }}>
        {DUST.map(p => (
          <div key={p.id} style={{
            position: 'absolute', width: `${p.size}px`, height: `${p.size}px`, borderRadius: '50%',
            left: `${p.left}%`, top: `${p.top}%`,
            background: 'radial-gradient(circle, rgba(255,218,80,1) 0%, rgba(212,175,55,0.65) 50%, transparent 100%)',
            boxShadow: '0 0 8px rgba(255,210,60,0.9), 0 0 18px rgba(200,160,40,0.5)',
            animation: `dust${p.anim} ${p.dur}s ease-in-out infinite`,
            animationDelay: `${p.delay}s`, opacity: 0,
          }} />
        ))}
      </div>

      {/* Cursor glow */}
      <div className="pointer-events-none" style={{
        position: 'fixed', inset: 0, zIndex: 1, opacity: glowVisible ? 1 : 0, transition: 'opacity 0.4s ease',
        background: `radial-gradient(circle 360px at ${glowPos.x}px ${glowPos.y}px, rgba(200,168,76,0.065) 0%, rgba(180,140,30,0.025) 50%, transparent 100%)`,
      }} />

      <Header />

      {/* ── Page shell: sidebar + content ── */}
      <div style={{ position: 'relative', zIndex: 2, maxWidth: 1180, margin: '0 auto', padding: '0 24px 72px', paddingTop: 80 }}>

        {/* Page title bar */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '0.75rem' }}>
          <div>
            <h1 style={{ fontFamily: SERIF, fontSize: '1.75rem', fontWeight: 500, color: GOLD2, letterSpacing: '0.015em', marginBottom: '0.15rem' }}>
              {profile.full_name || profile.username || 'Scholar'}
            </h1>
            <p style={{ fontFamily: SANS, fontSize: '0.8rem', color: MUTED }}>Study dashboard</p>
          </div>
          <div style={{ display: 'flex', gap: '0.5rem' }}>
            <button onClick={() => router.push('/igcse/upload')} style={{ padding: '0.5rem 1.125rem', background: 'linear-gradient(180deg, rgba(201,168,76,0.2) 0%, rgba(201,168,76,0.1) 100%)', color: GOLD2, border: `1px solid ${BORDER2}`, borderTop: `1px solid rgba(200,168,76,0.38)`, borderRadius: '7px', fontFamily: SANS, fontSize: '0.8125rem', fontWeight: 600, cursor: 'pointer' }}>
              + Upload Resource
            </button>
          </div>
        </div>

        {/* Two-column layout */}
        <div className="profile-layout" style={{ display: 'flex', gap: '1.25rem', alignItems: 'flex-start' }}>

          {/* Sidebar */}
          {Sidebar}

          {/* Main content */}
          <div style={{ flex: 1, minWidth: 0 }}>

            {/* Content header */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem', flexWrap: 'wrap', gap: '0.5rem' }}>
              <h2 style={{ fontFamily: SERIF, fontSize: '1.25rem', fontWeight: 600, color: TEXT }}>
                {{ overview: 'Overview', uploads: 'My Uploads', upvotes: 'Upvoted Resources', attempts: 'Exam History', weak: 'Weak Questions' }[activeTab]}
              </h2>
              {activeTab === 'uploads' && (
                <button onClick={() => router.push('/igcse/upload')} style={{ padding: '0.4rem 0.875rem', background: 'rgba(200,168,76,0.09)', color: GOLD2, border: `1px solid ${BORDER2}`, borderRadius: '6px', fontFamily: SANS, fontSize: '0.8rem', fontWeight: 600, cursor: 'pointer' }}>+ New</button>
              )}
              {activeTab === 'attempts' && attempts.length > 0 && (
                <button onClick={() => router.push('/igcse/practice')} style={{ padding: '0.4rem 0.875rem', background: 'rgba(200,168,76,0.09)', color: GOLD2, border: `1px solid ${BORDER2}`, borderRadius: '6px', fontFamily: SANS, fontSize: '0.8rem', fontWeight: 600, cursor: 'pointer' }}>Practice Now</button>
              )}
            </div>

            {/* ── Overview ── */}
            {activeTab === 'overview' && OverviewContent}

            {/* ── Uploads ── */}
            {activeTab === 'uploads' && (
              uploadedResources.length === 0
                ? <EmptyState icon="📚" title="No Uploads Yet" desc="Share your study materials with the community." cta="Upload Resource" onCta={() => router.push('/igcse/upload')} />
                : <div style={{ display: 'grid', gap: '0.75rem' }}>
                    {uploadedResources.map(r => <ResourceCard key={r.id} resource={r} showDelete onDelete={() => setDeleteConfirm(r.id)} deleteConfirm={deleteConfirm === r.id} onConfirmDelete={() => handleDeleteResource(r.id)} onCancelDelete={() => setDeleteConfirm(null)} />)}
                  </div>
            )}

            {/* ── Upvoted ── */}
            {activeTab === 'upvotes' && (
              upvotedResources.length === 0
                ? <EmptyState icon="🔖" title="No Upvoted Resources" desc="Upvote resources you find helpful to save them here." cta="Browse Resources" onCta={() => router.push('/igcse/browse')} />
                : <div style={{ display: 'grid', gap: '0.75rem' }}>
                    {upvotedResources.map(r => <ResourceCard key={r.id} resource={r} />)}
                  </div>
            )}

            {/* ── Exam History ── */}
            {activeTab === 'attempts' && (
              attemptsLoading ? <LoadingSpinner /> :
              attempts.length === 0
                ? <EmptyState icon="📝" title="No Exams Yet" desc="Complete an MCQ exam and your results will appear here." cta="Start Practising" onCta={() => router.push('/igcse/practice')} />
                : <div style={{ display: 'grid', gap: '0.75rem' }}>
                    {attempts.map(a => {
                      const pct = Number(a.percentage);
                      const { bg, text: tColor, border: bColor } = gradeColour(pct);
                      const barColor = pct >= 80 ? '#6EE7A0' : pct >= 60 ? GOLD3 : '#F09090';
                      return (
                        <div key={a.id} style={{ padding: '1rem 1.125rem', border: `1px solid ${BORDER}`, borderRadius: '0.875rem', background: SURFACE2 }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.875rem', flexWrap: 'wrap' }}>
                            <div style={{ width: 44, height: 44, borderRadius: '0.625rem', background: bg, border: `1px solid ${bColor}`, color: tColor, display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: SERIF, fontWeight: 700, fontSize: '1rem', flexShrink: 0 }}>{gradeFromPct(pct)}</div>
                            <div style={{ flex: 1, minWidth: 0 }}>
                              <div style={{ fontFamily: SERIF, fontWeight: 600, fontSize: '0.9375rem', color: TEXT, marginBottom: 1, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{paperLabel(a.paper_id)}</div>
                              <div style={{ fontFamily: SANS, fontSize: '0.7rem', color: MUTED, display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                                {fmtDate(a.created_at)}
                                {a.is_practice && <span style={{ padding: '1px 5px', background: 'rgba(200,168,76,0.1)', color: GOLD, borderRadius: 3, fontSize: '0.65rem', fontWeight: 600, border: `1px solid ${BORDER}` }}>Practice</span>}
                              </div>
                            </div>
                            <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap' }}>
                              {([['Score', `${a.score}/${a.total}`], ['%', `${pct}%`], ['Time', fmtTime(a.time_taken_seconds)]] as const).map(([lbl, val]) => (
                                <div key={lbl} style={{ padding: '0.2rem 0.55rem', background: 'rgba(200,168,76,0.07)', border: `1px solid ${BORDER}`, borderRadius: '0.3rem', textAlign: 'center' }}>
                                  <div style={{ fontFamily: SANS, fontSize: '0.58rem', color: MUTED, textTransform: 'uppercase', letterSpacing: '0.1em' }}>{lbl}</div>
                                  <div style={{ fontFamily: SERIF, fontSize: '0.875rem', fontWeight: 600, color: GOLD2 }}>{val}</div>
                                </div>
                              ))}
                            </div>
                            <div style={{ display: 'flex', gap: '0.4rem' }}>
                              <button onClick={() => router.push(`/igcse/mcq-review/${a.id}`)} style={{ padding: '0.35rem 0.8rem', background: 'rgba(200,168,76,0.09)', color: GOLD2, border: `1px solid ${BORDER2}`, borderRadius: '5px', fontFamily: SANS, fontSize: '0.78rem', fontWeight: 600, cursor: 'pointer' }}>Review</button>
                              <button onClick={() => router.push(`/igcse/mcq-exam/${a.paper_id}`)} style={{ padding: '0.35rem 0.8rem', background: 'transparent', color: MUTED, border: `1px solid ${BORDER}`, borderRadius: '5px', fontFamily: SANS, fontSize: '0.78rem', cursor: 'pointer' }}>Retry</button>
                            </div>
                          </div>
                          <ProgressBar pct={pct} color={barColor} />
                        </div>
                      );
                    })}
                  </div>
            )}

            {/* ── Weak Questions ── */}
            {activeTab === 'weak' && (
              wrongLoading ? <LoadingSpinner /> :
              wrongQuestions.length === 0
                ? <EmptyState icon="🎯" title="No Weak Areas Yet" desc="Questions you get wrong in MCQ exams will appear here." cta="Start Practising" onCta={() => router.push('/igcse/practice')} />
                : <div style={{ display: 'grid', gap: '1.5rem' }}>
                    {Object.entries(wrongBySubject).map(([code, qs]) => {
                      const totalPapers = [...new Set(qs.map(q => q.paper_id))].length;
                      return (
                        <div key={code} style={{ background: SURFACE2, border: `1px solid ${BORDER}`, borderRadius: '0.875rem', overflow: 'hidden' }}>
                          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0.875rem 1.125rem', borderBottom: `1px solid ${BORDER}` }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.625rem' }}>
                              <span style={{ fontFamily: SERIF, fontWeight: 600, fontSize: '0.9625rem', color: TEXT }}>{SUBJECT_NAME[code] ?? code}</span>
                              <span style={{ padding: '1px 8px', background: 'rgba(160,40,40,0.16)', color: '#F09090', border: '1px solid rgba(180,40,40,0.25)', borderRadius: 9999, fontSize: '0.68rem', fontFamily: SANS, fontWeight: 700 }}>{qs.length} wrong</span>
                            </div>
                            <span style={{ fontFamily: SANS, fontSize: '0.7rem', color: MUTED }}>{totalPapers} paper{totalPapers !== 1 ? 's' : ''}</span>
                          </div>
                          <div style={{ padding: '0.625rem 0.75rem', display: 'grid', gap: '0.4rem' }}>
                            {qs.map(wq => (
                              <div key={wq.id} style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', padding: '0.625rem 0.875rem', border: '1px solid rgba(180,40,40,0.15)', borderRadius: '0.5rem', background: 'rgba(160,40,40,0.04)', flexWrap: 'wrap' }}>
                                <span style={{ fontFamily: SANS, fontSize: '0.8rem', color: TEXT, flex: 1, minWidth: 0 }}>
                                  <strong style={{ fontFamily: SERIF }}>{paperLabel(wq.paper_id)}</strong> — Q{wq.question_number}
                                </span>
                                <div style={{ display: 'flex', gap: '0.375rem', flexShrink: 0 }}>
                                  <span style={{ padding: '2px 7px', background: 'rgba(160,40,40,0.15)', borderRadius: 3, fontFamily: SANS, fontSize: '0.72rem', color: '#F09090', fontWeight: 600 }}>You: {wq.user_answer ?? '—'}</span>
                                  <span style={{ padding: '2px 7px', background: 'rgba(20,120,60,0.14)', borderRadius: 3, fontFamily: SANS, fontSize: '0.72rem', color: '#6EE7A0', fontWeight: 600 }}>✓ {wq.correct_answer}</span>
                                </div>
                                <span style={{ fontFamily: SANS, fontSize: '0.68rem', color: MUTED, flexShrink: 0 }}>{fmtDate(wq.created_at)}</span>
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

      <style jsx global>{`
        @keyframes dust0 { 0%{transform:translate(0,0);opacity:0} 15%{opacity:.7} 50%{transform:translate(16px,-52px);opacity:.85} 85%{opacity:.5} 100%{transform:translate(0,0);opacity:0} }
        @keyframes dust1 { 0%{transform:translate(0,0);opacity:0} 15%{opacity:.6} 50%{transform:translate(-18px,-44px);opacity:.75} 85%{opacity:.45} 100%{transform:translate(0,0);opacity:0} }
        @keyframes dust2 { 0%{transform:translate(0,0);opacity:0} 20%{opacity:.65} 50%{transform:translate(10px,-60px);opacity:.8} 80%{opacity:.4} 100%{transform:translate(0,0);opacity:0} }
        @keyframes spin { to { transform: rotate(360deg); } }
        @media (max-width: 860px) {
          .profile-layout { flex-direction: column !important; }
          .profile-layout > aside { width: 100% !important; position: static !important; max-height: none !important; }
        }
      `}</style>
    </div>
  );
}
