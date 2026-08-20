'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { SUBJECTS } from '@/lib/constants/subjects';
import { RESOURCE_TYPES } from '@/lib/constants/resourceTypes';
import type { McqAttempt, McqWrongQuestion } from '@/lib/types/database.types';
import Header from '@/components/Header';

// ── Design tokens — exact match to browse page ────────────────────────────────
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

// ── Dust particles — exact copy from browse page ──────────────────────────────
const DUST = Array.from({ length: 48 }, (_, i) => ({
  id: i,
  size: 1.8 + (i * 5.7 % 3.2),
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

// ── Helpers ───────────────────────────────────────────────────────────────────

const SUBJECT_NAME: Record<string, string> = Object.fromEntries(SUBJECTS.map(s => [s.code, s.name]));

function gradeFromPct(pct: number) {
  if (pct >= 90) return 'A*';
  if (pct >= 80) return 'A';
  if (pct >= 70) return 'B';
  if (pct >= 60) return 'C';
  if (pct >= 50) return 'D';
  return 'E';
}
function gradeColour(pct: number) {
  if (pct >= 80) return { bg: 'rgba(20,120,60,0.25)', text: '#6EE7A0', border: 'rgba(60,180,100,0.3)' };
  if (pct >= 60) return { bg: 'rgba(180,120,20,0.20)', text: '#E2C97A', border: 'rgba(200,168,76,0.35)' };
  return { bg: 'rgba(160,40,40,0.20)', text: '#F09090', border: 'rgba(200,80,80,0.3)' };
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

// ── Tab button ────────────────────────────────────────────────────────────────

function TabBtn({ label, active, onClick }: { label: string; active: boolean; onClick: () => void }) {
  return (
    <button onClick={onClick} style={{
      flex: 1, padding: '0.875rem 0.5rem',
      background: active ? 'rgba(200,168,76,0.08)' : 'transparent',
      color: active ? GOLD2 : MUTED,
      border: 'none',
      borderBottom: active ? `2px solid ${GOLD}` : '2px solid transparent',
      cursor: 'pointer', fontFamily: SERIF, fontWeight: 600,
      fontSize: '0.9375rem', letterSpacing: '0.03em',
      transition: 'all 0.18s', whiteSpace: 'nowrap',
    }}>
      {label}
    </button>
  );
}

// ── Stat card ─────────────────────────────────────────────────────────────────

function StatCard({ label, value }: { label: string; value: string | number }) {
  return (
    <div style={{ background: SURFACE, border: `1px solid ${BORDER}`, borderTop: `1px solid ${BORDER2}`, borderRadius: '0.75rem', padding: '1.25rem', textAlign: 'center' }}>
      <div style={{ fontFamily: SERIF, fontSize: '2rem', fontWeight: 600, color: GOLD2, lineHeight: 1 }}>{value}</div>
      <div style={{ fontFamily: SANS, fontSize: '0.75rem', color: MUTED, marginTop: '0.4rem', letterSpacing: '0.08em', textTransform: 'uppercase' }}>{label}</div>
    </div>
  );
}

// ── Empty state ───────────────────────────────────────────────────────────────

function EmptyState({ icon, title, desc, children }: { icon: string; title: string; desc: string; children?: React.ReactNode }) {
  return (
    <div style={{ textAlign: 'center', padding: '3rem 1rem' }}>
      <div style={{ fontSize: '2.5rem', marginBottom: '1rem', opacity: 0.6 }}>{icon}</div>
      <h3 style={{ fontFamily: SERIF, fontSize: '1.25rem', fontWeight: 600, color: TEXT, marginBottom: '0.5rem' }}>{title}</h3>
      <p style={{ fontFamily: SANS, fontSize: '0.875rem', color: MUTED, marginBottom: '1.5rem' }}>{desc}</p>
      {children}
    </div>
  );
}

function GoldBtn({ children, onClick }: { children: React.ReactNode; onClick: () => void }) {
  return (
    <button onClick={onClick} style={{
      padding: '0.625rem 1.5rem',
      background: 'linear-gradient(180deg, rgba(201,168,76,0.18) 0%, rgba(201,168,76,0.10) 100%)',
      color: GOLD2, border: `1px solid ${BORDER2}`, borderTop: `1px solid rgba(200,168,76,0.4)`,
      borderRadius: '0.5rem', fontFamily: SANS, fontSize: '0.875rem', fontWeight: 600,
      cursor: 'pointer', letterSpacing: '0.04em',
    }}>
      {children}
    </button>
  );
}

function LoadingSpinner() {
  return (
    <div style={{ textAlign: 'center', padding: '3rem', color: MUTED, fontFamily: SANS }}>
      <div style={{ width: 32, height: 32, border: `2px solid ${BORDER}`, borderTop: `2px solid ${GOLD}`, borderRadius: '50%', animation: 'spin 0.8s linear infinite', margin: '0 auto 1rem' }} />
      Loading...
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
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
    <div style={{ padding: '1rem 1.25rem', border: `1px solid ${BORDER}`, borderRadius: '0.75rem', background: SURFACE }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', gap: '1rem' }}>
        <div style={{ flex: 1 }}>
          <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '0.5rem', flexWrap: 'wrap' }}>
            <span style={{ padding: '2px 8px', background: 'rgba(200,168,76,0.10)', color: GOLD, border: `1px solid ${BORDER}`, borderRadius: '4px', fontSize: '0.75rem', fontFamily: SANS, fontWeight: 600 }}>{subject?.icon} {subject?.name}</span>
            <span style={{ padding: '2px 8px', background: 'rgba(255,255,255,0.04)', color: MUTED, border: `1px solid ${BORDER}`, borderRadius: '4px', fontSize: '0.75rem', fontFamily: SANS, fontWeight: 600 }}>{resourceType?.icon} {resourceType?.label}</span>
            <span style={{ padding: '2px 8px', background: 'rgba(200,168,76,0.06)', color: MUTED, border: `1px solid ${BORDER}`, borderRadius: '4px', fontSize: '0.75rem', fontFamily: SANS }}>{resource.upvote_count} upvotes</span>
          </div>
          <h4 style={{ fontFamily: SERIF, fontSize: '1rem', fontWeight: 600, color: TEXT, marginBottom: '0.25rem' }}>{resource.title}</h4>
          <p style={{ fontFamily: SANS, fontSize: '0.8125rem', color: MUTED, marginBottom: '0.5rem' }}>{resource.description}</p>
          <a href={resource.link} target="_blank" rel="noopener noreferrer" style={{ fontFamily: SANS, fontSize: '0.8125rem', color: GOLD, textDecoration: 'none', letterSpacing: '0.02em' }}>View Resource →</a>
        </div>
        {showDelete && (
          <button onClick={onDelete} style={{ padding: '0.375rem 0.75rem', background: 'rgba(180,40,40,0.15)', color: '#F09090', border: '1px solid rgba(180,40,40,0.25)', borderRadius: '0.5rem', cursor: 'pointer', fontFamily: SANS, fontSize: '0.8125rem', fontWeight: 600, flexShrink: 0 }}>Delete</button>
        )}
      </div>
      {deleteConfirm && (
        <div style={{ marginTop: '1rem', padding: '0.875rem', background: 'rgba(180,40,40,0.10)', border: '1px solid rgba(180,40,40,0.25)', borderRadius: '0.5rem' }}>
          <p style={{ fontFamily: SANS, fontSize: '0.8125rem', color: '#F09090', marginBottom: '0.75rem', fontWeight: 600 }}>Are you sure? This cannot be undone.</p>
          <div style={{ display: 'flex', gap: '0.5rem' }}>
            <button onClick={onConfirmDelete} style={{ padding: '0.4rem 0.875rem', background: 'rgba(180,40,40,0.3)', color: '#F09090', border: '1px solid rgba(180,40,40,0.4)', borderRadius: '0.5rem', cursor: 'pointer', fontFamily: SANS, fontSize: '0.8125rem', fontWeight: 600 }}>Yes, Delete</button>
            <button onClick={onCancelDelete} style={{ padding: '0.4rem 0.875rem', background: 'transparent', color: MUTED, border: `1px solid ${BORDER}`, borderRadius: '0.5rem', cursor: 'pointer', fontFamily: SANS, fontSize: '0.8125rem' }}>Cancel</button>
          </div>
        </div>
      )}
    </div>
  );
}

// ── Main component ────────────────────────────────────────────────────────────

export default function ProfilePage() {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
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
  const avgScore = attempts.length ? Math.round(attempts.reduce((s, a) => s + Number(a.percentage), 0) / attempts.length) + '%' : '—';

  const inputStyle: React.CSSProperties = {
    width: '100%', background: 'rgba(6,10,18,0.7)', border: `1px solid ${BORDER}`,
    borderTop: `1px solid ${BORDER2}`, borderRadius: '8px', padding: '10px 14px',
    fontFamily: SANS, fontSize: '14px', color: TEXT, outline: 'none',
  };

  return (
    <div style={{ minHeight: '100vh', background: BG, position: 'relative', overflowX: 'hidden' }}>

      {/* Dust particles */}
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
        opacity: glowVisible ? 1 : 0,
        transition: 'opacity 0.4s ease',
        background: `radial-gradient(circle 360px at ${glowPos.x}px ${glowPos.y}px, rgba(200,168,76,0.07) 0%, rgba(180,140,30,0.03) 50%, transparent 100%)`,
      }} />

      <Header />

      <div style={{ position: 'relative', zIndex: 2, maxWidth: 1100, margin: '0 auto', padding: '32px 40px 60px', paddingTop: '96px' }}>

        {/* Profile card */}
        <div style={{ background: SURFACE, border: `1px solid ${BORDER}`, borderTop: `1px solid ${BORDER2}`, borderRadius: '1rem', padding: '2rem', marginBottom: '1.5rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '1rem' }}>
            <div>
              <h1 style={{ fontFamily: SERIF, fontSize: '2rem', fontWeight: 500, color: GOLD2, letterSpacing: '0.02em', marginBottom: '0.25rem' }}>My Profile</h1>
              <p style={{ fontFamily: SANS, fontSize: '0.8125rem', color: MUTED }}>Manage your account and study progress</p>
            </div>
            <button
              onClick={() => setIsEditing(!isEditing)}
              style={{ fontFamily: SANS, fontSize: '0.8125rem', fontWeight: 600, padding: '0.5rem 1rem', background: 'transparent', color: isEditing ? '#F09090' : GOLD, border: `1px solid ${isEditing ? 'rgba(180,40,40,0.4)' : BORDER2}`, borderRadius: '6px', cursor: 'pointer', letterSpacing: '0.03em' }}
            >
              {isEditing ? 'Cancel' : 'Edit Profile'}
            </button>
          </div>

          {isEditing ? (
            <div style={{ display: 'grid', gap: '1rem', maxWidth: 480 }}>
              {([['Username', 'username'], ['Full Name', 'full_name']] as const).map(([label, key]) => (
                <div key={key}>
                  <label style={{ display: 'block', fontFamily: SANS, fontSize: '0.75rem', fontWeight: 600, letterSpacing: '0.15em', textTransform: 'uppercase', color: MUTED, marginBottom: '6px' }}>{label}</label>
                  <input type="text" value={editForm[key]} onChange={e => setEditForm({ ...editForm, [key]: e.target.value })} style={inputStyle}
                    onFocus={e => { e.currentTarget.style.borderColor = GOLD; }} onBlur={e => { e.currentTarget.style.borderColor = BORDER; }} />
                </div>
              ))}
              <button onClick={handleSaveProfile} style={{ padding: '0.625rem 1.5rem', background: `linear-gradient(180deg, rgba(201,168,76,0.22) 0%, rgba(201,168,76,0.12) 100%)`, color: GOLD2, border: `1px solid ${BORDER2}`, borderTop: `1px solid rgba(200,168,76,0.4)`, borderRadius: '8px', fontFamily: SANS, fontSize: '0.875rem', fontWeight: 700, cursor: 'pointer', letterSpacing: '0.05em', alignSelf: 'start' }}>
                Save Changes
              </button>
              {saveMessage && <p style={{ fontFamily: SANS, fontSize: '0.8125rem', color: '#6EE7A0' }}>{saveMessage}</p>}
            </div>
          ) : (
            <div style={{ display: 'grid', gap: '0.625rem' }}>
              {[['Email', profile.email], ['Username', profile.username], ...(profile.full_name ? [['Full Name', profile.full_name]] : [])].map(([label, value]) => (
                <div key={label} style={{ display: 'flex', gap: '0.75rem', alignItems: 'baseline' }}>
                  <span style={{ fontFamily: SANS, fontSize: '0.75rem', fontWeight: 600, letterSpacing: '0.12em', textTransform: 'uppercase', color: MUTED, minWidth: 80 }}>{label}</span>
                  <span style={{ fontFamily: SERIF, fontSize: '1rem', color: TEXT }}>{value}</span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Stats */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '1rem', marginBottom: '1.5rem' }}>
          <StatCard label="Uploaded" value={uploadedResources.length} />
          <StatCard label="Upvoted" value={upvotedResources.length} />
          <StatCard label="Exams" value={attempts.length} />
          <StatCard label="Avg Score" value={avgScore} />
        </div>

        {/* Tabs */}
        <div style={{ background: SURFACE, border: `1px solid ${BORDER}`, borderRadius: '1rem', overflow: 'hidden' }}>
          <div style={{ display: 'flex', borderBottom: `1px solid ${BORDER}` }}>
            <TabBtn label={`Uploads (${uploadedResources.length})`} active={activeTab === 'uploads'} onClick={() => setActiveTab('uploads')} />
            <TabBtn label={`Upvoted (${upvotedResources.length})`}  active={activeTab === 'upvotes'} onClick={() => setActiveTab('upvotes')} />
            <TabBtn label={`Exam History (${attempts.length})`}     active={activeTab === 'attempts'} onClick={() => setActiveTab('attempts')} />
            <TabBtn label="Weak Questions"                           active={activeTab === 'weak'}     onClick={() => setActiveTab('weak')} />
          </div>

          <div style={{ padding: '1.5rem' }}>

            {/* Uploads */}
            {activeTab === 'uploads' && (
              uploadedResources.length === 0
                ? <EmptyState icon="📚" title="No Uploads Yet" desc="Share your study materials with the community."><GoldBtn onClick={() => router.push('/igcse/upload')}>Upload Resource</GoldBtn></EmptyState>
                : <div style={{ display: 'grid', gap: '0.875rem' }}>
                    {uploadedResources.map(r => <ResourceCard key={r.id} resource={r} showDelete onDelete={() => setDeleteConfirm(r.id)} deleteConfirm={deleteConfirm === r.id} onConfirmDelete={() => handleDeleteResource(r.id)} onCancelDelete={() => setDeleteConfirm(null)} />)}
                  </div>
            )}

            {/* Upvoted */}
            {activeTab === 'upvotes' && (
              upvotedResources.length === 0
                ? <EmptyState icon="🔖" title="No Upvoted Resources" desc="Upvote resources you find helpful."><GoldBtn onClick={() => router.push('/igcse/browse')}>Browse Resources</GoldBtn></EmptyState>
                : <div style={{ display: 'grid', gap: '0.875rem' }}>
                    {upvotedResources.map(r => <ResourceCard key={r.id} resource={r} />)}
                  </div>
            )}

            {/* Exam History */}
            {activeTab === 'attempts' && (
              attemptsLoading ? <LoadingSpinner /> :
              attempts.length === 0
                ? <EmptyState icon="📝" title="No Exams Yet" desc="Complete an MCQ exam and your results will appear here."><GoldBtn onClick={() => router.push('/igcse/practice')}>Start Practising</GoldBtn></EmptyState>
                : <div style={{ display: 'grid', gap: '0.75rem' }}>
                    {attempts.map(a => {
                      const pct = Number(a.percentage);
                      const { bg, text, border } = gradeColour(pct);
                      return (
                        <div key={a.id} style={{ display: 'flex', alignItems: 'center', gap: '1rem', padding: '1rem 1.25rem', border: `1px solid ${BORDER}`, borderRadius: '0.75rem', background: SURFACE2, flexWrap: 'wrap' }}>
                          <div style={{ width: 48, height: 48, borderRadius: '50%', background: bg, border: `1px solid ${border}`, color: text, display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: SERIF, fontWeight: 700, fontSize: '1rem', flexShrink: 0 }}>
                            {gradeFromPct(pct)}
                          </div>
                          <div style={{ flex: 1, minWidth: 160 }}>
                            <div style={{ fontFamily: SERIF, fontWeight: 600, fontSize: '0.9375rem', color: TEXT, marginBottom: 2 }}>{paperLabel(a.paper_id)}</div>
                            <div style={{ fontFamily: SANS, fontSize: '0.75rem', color: MUTED }}>
                              {fmtDate(a.created_at)}
                              {a.is_practice && <span style={{ marginLeft: 8, padding: '1px 6px', background: 'rgba(200,168,76,0.12)', color: GOLD, borderRadius: 4, fontSize: '0.7rem', fontWeight: 600, border: `1px solid ${BORDER}` }}>Practice</span>}
                            </div>
                          </div>
                          <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                            {[['Score', `${a.score}/${a.total}`], ['%', `${pct}%`], ['Time', fmtTime(a.time_taken_seconds)]].map(([lbl, val]) => (
                              <div key={lbl} style={{ padding: '0.25rem 0.625rem', background: 'rgba(200,168,76,0.07)', border: `1px solid ${BORDER}`, borderRadius: '0.375rem', textAlign: 'center' }}>
                                <div style={{ fontFamily: SANS, fontSize: '0.625rem', color: MUTED, textTransform: 'uppercase', letterSpacing: '0.1em' }}>{lbl}</div>
                                <div style={{ fontFamily: SERIF, fontSize: '0.9375rem', fontWeight: 600, color: GOLD2 }}>{val}</div>
                              </div>
                            ))}
                          </div>
                          <div style={{ display: 'flex', gap: '0.5rem' }}>
                            <button onClick={() => router.push(`/igcse/mcq-review/${a.id}`)} style={{ padding: '0.375rem 0.875rem', background: 'rgba(200,168,76,0.08)', color: GOLD2, border: `1px solid ${BORDER2}`, borderRadius: '6px', fontFamily: SANS, fontSize: '0.8125rem', fontWeight: 600, cursor: 'pointer', letterSpacing: '0.03em' }}>
                              Review
                            </button>
                            <button onClick={() => router.push(`/igcse/mcq-exam/${a.paper_id}`)} style={{ padding: '0.375rem 0.875rem', background: 'transparent', color: MUTED, border: `1px solid ${BORDER}`, borderRadius: '6px', fontFamily: SANS, fontSize: '0.8125rem', fontWeight: 600, cursor: 'pointer', letterSpacing: '0.03em' }}>
                              Retry
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
            )}

            {/* Weak Questions */}
            {activeTab === 'weak' && (
              wrongLoading ? <LoadingSpinner /> :
              wrongQuestions.length === 0
                ? <EmptyState icon="🎯" title="No Wrong Answers Yet" desc="Questions you get wrong in MCQ exams will appear here."><GoldBtn onClick={() => router.push('/igcse/practice')}>Start Practising</GoldBtn></EmptyState>
                : <div style={{ display: 'grid', gap: '1.5rem' }}>
                    {Object.entries(wrongBySubject).map(([code, qs]) => (
                      <div key={code}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.75rem' }}>
                          <span style={{ fontFamily: SERIF, fontWeight: 600, fontSize: '1rem', color: TEXT }}>{SUBJECT_NAME[code] ?? code}</span>
                          <span style={{ padding: '2px 8px', background: 'rgba(160,40,40,0.18)', color: '#F09090', border: '1px solid rgba(180,40,40,0.3)', borderRadius: 9999, fontSize: '0.75rem', fontFamily: SANS, fontWeight: 700 }}>{qs.length} wrong</span>
                        </div>
                        <div style={{ display: 'grid', gap: '0.5rem' }}>
                          {qs.map(wq => (
                            <div key={wq.id} style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', padding: '0.75rem 1rem', border: '1px solid rgba(180,40,40,0.2)', borderRadius: '0.5rem', background: 'rgba(160,40,40,0.06)', flexWrap: 'wrap' }}>
                              <span style={{ fontFamily: SANS, fontSize: '0.875rem', color: TEXT, flex: 1 }}>
                                <strong style={{ fontFamily: SERIF }}>{paperLabel(wq.paper_id)}</strong> — Q{wq.question_number}
                              </span>
                              <span style={{ fontFamily: SANS, fontSize: '0.8125rem', color: MUTED }}>
                                You: <strong style={{ color: '#F09090' }}>{wq.user_answer ?? '—'}</strong>
                                {' · '}Correct: <strong style={{ color: '#6EE7A0' }}>{wq.correct_answer}</strong>
                              </span>
                              <span style={{ fontFamily: SANS, fontSize: '0.75rem', color: MUTED }}>{fmtDate(wq.created_at)}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    ))}
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
      `}</style>
    </div>
  );
}
