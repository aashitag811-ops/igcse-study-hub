'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { SUBJECTS } from '@/lib/constants/subjects';
import { RESOURCE_TYPES } from '@/lib/constants/resourceTypes';
import type { McqAttempt, McqWrongQuestion } from '@/lib/types/database.types';

// ── Local interfaces ──────────────────────────────────────────────────────────

interface Resource {
  id: string;
  title: string;
  description: string;
  link: string;
  subject: string;
  resource_type: string;
  upvote_count: number;
  created_at: string;
  uploader_id: string;
}

interface Profile {
  id: string;
  email: string;
  username: string;
  full_name: string;
  avatar_url: string;
}

type ActiveTab = 'uploads' | 'upvotes' | 'attempts' | 'weak';

// ── Helpers ───────────────────────────────────────────────────────────────────

const SUBJECT_NAME: Record<string, string> = Object.fromEntries(
  SUBJECTS.map(s => [s.code, s.name])
);

function gradeFromPct(pct: number) {
  if (pct >= 90) return 'A*';
  if (pct >= 80) return 'A';
  if (pct >= 70) return 'B';
  if (pct >= 60) return 'C';
  if (pct >= 50) return 'D';
  return 'E';
}

function gradeColour(pct: number) {
  if (pct >= 80) return { bg: '#D1FAE5', text: '#059669' };
  if (pct >= 60) return { bg: '#FEF3C7', text: '#D97706' };
  return { bg: '#FEE2E2', text: '#DC2626' };
}

function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' });
}

function fmtTime(secs: number) {
  const m = Math.floor(secs / 60);
  const s = secs % 60;
  return `${m}m ${s}s`;
}

function paperLabel(paperId: string) {
  // e.g. 0610_m20_qp_22 → "0610 · Feb/Mar 2020 · P2 V2"
  const m = paperId.match(/^(\d{4})_([msw])(\d{2})(?:_qp)?_(\d)(\d)/);
  if (!m) return paperId;
  const [, code, seas, yr, comp, vari] = m;
  const season = seas === 'm' ? 'Feb/Mar' : seas === 's' ? 'May/Jun' : 'Oct/Nov';
  return `${SUBJECT_NAME[code] ?? code} · ${season} 20${yr} · P${comp}V${vari}`;
}

// ── Tab button ────────────────────────────────────────────────────────────────

function TabBtn({ label, active, onClick }: { label: string; active: boolean; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      style={{
        flex: 1,
        padding: '1rem 0.5rem',
        background: active ? '#EFF6FF' : 'white',
        color: active ? '#2563EB' : '#6B7280',
        border: 'none',
        borderBottom: active ? '2px solid #2563EB' : '2px solid transparent',
        cursor: 'pointer',
        fontWeight: 600,
        fontSize: '0.8125rem',
        transition: 'all 0.15s',
        whiteSpace: 'nowrap',
      }}
    >
      {label}
    </button>
  );
}

// ── Main component ────────────────────────────────────────────────────────────

export default function ProfilePage() {
  const router = useRouter();

  const [user, setUser] = useState<any>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);

  const [activeTab, setActiveTab] = useState<ActiveTab>('uploads');

  // resource tabs
  const [uploadedResources, setUploadedResources] = useState<Resource[]>([]);
  const [upvotedResources, setUpvotedResources] = useState<Resource[]>([]);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);

  // exam tabs
  const [attempts, setAttempts] = useState<McqAttempt[]>([]);
  const [wrongQuestions, setWrongQuestions] = useState<McqWrongQuestion[]>([]);
  const [attemptsLoading, setAttemptsLoading] = useState(false);
  const [wrongLoading, setWrongLoading] = useState(false);

  // edit
  const [isEditing, setIsEditing] = useState(false);
  const [editForm, setEditForm] = useState({ username: '', full_name: '' });
  const [saveMessage, setSaveMessage] = useState('');

  // ── Initial load ────────────────────────────────────────────
  useEffect(() => { fetchProfileData(); }, []);

  const fetchProfileData = async () => {
    setLoading(true);
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { router.push('/igcse/login'); return; }
    setUser(user);

    const { data: profileData } = await supabase
      .from('profiles').select('*').eq('id', user.id).single();
    if (profileData) {
      setProfile(profileData as Profile);
      setEditForm({ username: (profileData as any).username || '', full_name: (profileData as any).full_name || '' });
    }

    const { data: uploads } = await supabase
      .from('resources').select('*').eq('uploader_id', user.id).order('created_at', { ascending: false });
    setUploadedResources(uploads || []);

    const { data: votes } = await supabase
      .from('votes')
      .select('resource_id, resources(id,title,description,link,subject,resource_type,upvote_count,created_at,uploader_id)')
      .eq('user_id', user.id);
    if (votes) setUpvotedResources(votes.map((v: any) => v.resources).filter(Boolean));

    setLoading(false);
  };

  // ── Lazy-load exam data on tab switch ───────────────────────
  useEffect(() => {
    if (activeTab === 'attempts' && attempts.length === 0 && !attemptsLoading) {
      setAttemptsLoading(true);
      fetch('/api/mcq-attempts')
        .then(r => r.json())
        .then(d => setAttempts(d.attempts || []))
        .finally(() => setAttemptsLoading(false));
    }
    if (activeTab === 'weak' && wrongQuestions.length === 0 && !wrongLoading) {
      setWrongLoading(true);
      fetch('/api/mcq-wrong-questions')
        .then(r => r.json())
        .then(d => setWrongQuestions(d.wrongQuestions || []))
        .finally(() => setWrongLoading(false));
    }
  }, [activeTab]);

  // ── Profile save ────────────────────────────────────────────
  const handleSaveProfile = async () => {
    if (!user) return;
    const supabase = createClient();
    const { error } = await supabase
      .from('profiles')
      // @ts-expect-error - Supabase type inference issue
      .update({ username: editForm.username, full_name: editForm.full_name })
      .eq('id', user.id);
    if (error) { setSaveMessage('Error saving profile'); }
    else {
      setSaveMessage('Profile updated successfully!');
      setIsEditing(false);
      fetchProfileData();
      setTimeout(() => setSaveMessage(''), 3000);
    }
  };

  const handleDeleteResource = async (resourceId: string) => {
    if (!user) return;
    const supabase = createClient();
    const { error } = await supabase
      .from('resources').delete().eq('id', resourceId).eq('uploader_id', user.id);
    if (!error) { setUploadedResources(prev => prev.filter(r => r.id !== resourceId)); setDeleteConfirm(null); }
  };

  // ── Loading / not-found guards ──────────────────────────────
  if (loading) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ fontSize: '1.25rem', color: '#6B7280' }}>Loading profile...</div>
      </div>
    );
  }
  if (!profile) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ fontSize: '1.25rem', color: '#6B7280' }}>Profile not found</div>
      </div>
    );
  }

  // ── Wrong-questions grouped by subject ──────────────────────
  const wrongBySubject: Record<string, McqWrongQuestion[]> = {};
  for (const wq of wrongQuestions) {
    (wrongBySubject[wq.subject_code] ??= []).push(wq);
  }

  // ── Render ──────────────────────────────────────────────────
  return (
    <div style={{ minHeight: '100vh', background: 'linear-gradient(135deg, #EFF6FF 0%, #F5F3FF 50%, #FCE7F3 100%)' }}>

      {/* Nav */}
      <nav style={{ background: 'rgba(255,255,255,0.9)', backdropFilter: 'blur(10px)', borderBottom: '1px solid rgba(0,0,0,0.1)', position: 'sticky', top: 0, zIndex: 50 }}>
        <div style={{ maxWidth: 1280, margin: '0 auto', padding: '1rem 1.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div
            style={{ fontSize: '1.5rem', fontWeight: 700, background: 'linear-gradient(90deg,#2563EB,#9333EA,#EC4899)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text', fontFamily: "'Dancing Script',cursive", cursor: 'pointer' }}
            onClick={() => router.push('/')}
          >
            IGCSE Study Hub
          </div>
          <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
            <button onClick={() => router.push('/igcse/browse')} style={{ padding: '0.5rem 1rem', fontSize: '0.875rem', fontWeight: 600, borderRadius: '0.5rem', color: '#2563EB', background: 'white', border: '1px solid #2563EB', cursor: 'pointer' }}>Browse</button>
            <button onClick={() => router.push('/igcse/upload')} style={{ padding: '0.5rem 1rem', fontSize: '0.875rem', fontWeight: 600, borderRadius: '0.5rem', color: 'white', background: 'linear-gradient(145deg,#10B981,#059669)', border: 'none', cursor: 'pointer', boxShadow: '0 4px 8px rgba(16,185,129,0.3)' }}>Upload</button>
          </div>
        </div>
      </nav>

      <div style={{ maxWidth: 1280, margin: '0 auto', padding: '2rem 1rem' }}>

        {/* Profile header card */}
        <div style={{ background: 'white', borderRadius: '1rem', padding: '2rem', marginBottom: '2rem', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', marginBottom: '1.5rem' }}>
            <div>
              <h1 style={{ fontSize: '2rem', fontWeight: 700, fontFamily: "'Pacifico',cursive", background: 'linear-gradient(90deg,#2563EB,#9333EA,#EC4899)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text', marginBottom: '0.5rem' }}>
                My Profile
              </h1>
              <p style={{ color: '#6B7280', fontSize: '0.875rem' }}>Manage your resources and profile information</p>
            </div>
            <button
              onClick={() => setIsEditing(!isEditing)}
              style={{ padding: '0.5rem 1rem', fontSize: '0.875rem', fontWeight: 600, borderRadius: '0.5rem', color: isEditing ? '#DC2626' : '#2563EB', background: 'white', border: `1px solid ${isEditing ? '#DC2626' : '#2563EB'}`, cursor: 'pointer' }}
            >
              {isEditing ? 'Cancel' : 'Edit Profile'}
            </button>
          </div>

          {isEditing ? (
            <div style={{ display: 'grid', gap: '1rem' }}>
              {[
                { label: 'Username', key: 'username' as const },
                { label: 'Full Name', key: 'full_name' as const },
              ].map(({ label, key }) => (
                <div key={key}>
                  <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 600, marginBottom: '0.5rem', color: '#374151' }}>{label}</label>
                  <input
                    type="text"
                    value={editForm[key]}
                    onChange={e => setEditForm({ ...editForm, [key]: e.target.value })}
                    style={{ width: '100%', padding: '0.75rem', border: '1px solid #D1D5DB', borderRadius: '0.5rem', fontSize: '0.875rem', outline: 'none' }}
                    onFocus={e => { e.currentTarget.style.borderColor = '#2563EB'; }}
                    onBlur={e => { e.currentTarget.style.borderColor = '#D1D5DB'; }}
                  />
                </div>
              ))}
              <button onClick={handleSaveProfile} style={{ padding: '0.75rem 1.5rem', background: 'linear-gradient(145deg,#2563EB,#1D4ED8)', color: 'white', border: 'none', borderRadius: '0.5rem', fontSize: '0.875rem', fontWeight: 600, cursor: 'pointer' }}>
                Save Changes
              </button>
            </div>
          ) : (
            <div style={{ display: 'grid', gap: '0.75rem' }}>
              {[
                { label: 'Email', value: profile.email },
                { label: 'Username', value: profile.username },
                ...(profile.full_name ? [{ label: 'Full Name', value: profile.full_name }] : []),
              ].map(({ label, value }) => (
                <div key={label} style={{ display: 'flex', gap: '0.5rem' }}>
                  <span style={{ fontWeight: 600, color: '#374151' }}>{label}:</span>
                  <span style={{ color: '#6B7280' }}>{value}</span>
                </div>
              ))}
            </div>
          )}

          {saveMessage && (
            <div style={{ marginTop: '1rem', padding: '0.75rem', background: '#D1FAE5', border: '1px solid #10B981', borderRadius: '0.5rem', color: '#059669', fontSize: '0.875rem', textAlign: 'center' }}>
              {saveMessage}
            </div>
          )}
        </div>

        {/* Stats bar */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(160px,1fr))', gap: '1rem', marginBottom: '2rem' }}>
          {[
            { label: 'Resources Uploaded', value: uploadedResources.length, color: '#2563EB' },
            { label: 'Resources Upvoted',  value: upvotedResources.length,  color: '#9333EA' },
            { label: 'Exams Attempted',    value: attempts.length,           color: '#0891B2' },
            {
              label: 'Avg Score',
              value: attempts.length
                ? Math.round(attempts.reduce((s, a) => s + Number(a.percentage), 0) / attempts.length) + '%'
                : '—',
              color: '#059669',
            },
          ].map(({ label, value, color }) => (
            <div key={label} style={{ background: 'white', borderRadius: '1rem', padding: '1.5rem', textAlign: 'center', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)' }}>
              <div style={{ fontSize: '2.25rem', fontWeight: 700, color, fontFamily: "'Righteous',cursive" }}>{value}</div>
              <div style={{ color: '#6B7280', fontSize: '0.8125rem', fontWeight: 600 }}>{label}</div>
            </div>
          ))}
        </div>

        {/* Tabs */}
        <div style={{ background: 'white', borderRadius: '1rem', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)', overflow: 'hidden' }}>
          <div style={{ display: 'flex', borderBottom: '2px solid #E5E7EB' }}>
            <TabBtn label={`My Uploads (${uploadedResources.length})`} active={activeTab === 'uploads'} onClick={() => setActiveTab('uploads')} />
            <TabBtn label={`Upvoted (${upvotedResources.length})`}     active={activeTab === 'upvotes'} onClick={() => setActiveTab('upvotes')} />
            <TabBtn label={`Exam History (${attempts.length})`}        active={activeTab === 'attempts'} onClick={() => setActiveTab('attempts')} />
            <TabBtn label="Weak Questions"                              active={activeTab === 'weak'}     onClick={() => setActiveTab('weak')} />
          </div>

          <div style={{ padding: '1.5rem' }}>

            {/* ── Uploads tab ── */}
            {activeTab === 'uploads' && (
              uploadedResources.length === 0 ? (
                <EmptyState icon="📚" title="No Uploads Yet" desc="Start sharing your study materials with the community!">
                  <PrimaryBtn onClick={() => router.push('/igcse/upload')}>Upload Resource</PrimaryBtn>
                </EmptyState>
              ) : (
                <div style={{ display: 'grid', gap: '1rem' }}>
                  {uploadedResources.map(resource => (
                    <ResourceCard
                      key={resource.id}
                      resource={resource}
                      showDelete
                      onDelete={() => setDeleteConfirm(resource.id)}
                      deleteConfirm={deleteConfirm === resource.id}
                      onConfirmDelete={() => handleDeleteResource(resource.id)}
                      onCancelDelete={() => setDeleteConfirm(null)}
                    />
                  ))}
                </div>
              )
            )}

            {/* ── Upvotes tab ── */}
            {activeTab === 'upvotes' && (
              upvotedResources.length === 0 ? (
                <EmptyState icon="👍" title="No Upvoted Resources" desc="Start upvoting resources you find helpful!">
                  <PrimaryBtn onClick={() => router.push('/igcse/browse')}>Browse Resources</PrimaryBtn>
                </EmptyState>
              ) : (
                <div style={{ display: 'grid', gap: '1rem' }}>
                  {upvotedResources.map(resource => (
                    <ResourceCard key={resource.id} resource={resource} />
                  ))}
                </div>
              )
            )}

            {/* ── Exam history tab ── */}
            {activeTab === 'attempts' && (
              attemptsLoading ? <LoadingSpinner /> :
              attempts.length === 0 ? (
                <EmptyState icon="📝" title="No Exams Yet" desc="Complete an MCQ exam and your results will appear here.">
                  <PrimaryBtn onClick={() => router.push('/igcse/practice')}>Start Practising</PrimaryBtn>
                </EmptyState>
              ) : (
                <div style={{ display: 'grid', gap: '0.75rem' }}>
                  {attempts.map(a => {
                    const pct = Number(a.percentage);
                    const { bg, text } = gradeColour(pct);
                    return (
                      <div key={a.id} style={{ display: 'flex', alignItems: 'center', gap: '1rem', padding: '1rem', border: '1px solid #E5E7EB', borderRadius: '0.75rem', flexWrap: 'wrap' }}>
                        {/* Grade badge */}
                        <div style={{ width: 52, height: 52, borderRadius: '50%', background: bg, color: text, display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, fontSize: '1.1rem', flexShrink: 0 }}>
                          {gradeFromPct(pct)}
                        </div>
                        {/* Paper info */}
                        <div style={{ flex: 1, minWidth: 180 }}>
                          <div style={{ fontWeight: 700, fontSize: '0.9375rem', color: '#111827', marginBottom: 2 }}>
                            {paperLabel(a.paper_id)}
                          </div>
                          <div style={{ fontSize: '0.8125rem', color: '#6B7280' }}>
                            {fmtDate(a.created_at)}
                            {a.is_practice && <span style={{ marginLeft: 8, padding: '1px 6px', background: '#FEF3C7', color: '#B45309', borderRadius: 4, fontSize: '0.75rem', fontWeight: 600 }}>Practice</span>}
                          </div>
                        </div>
                        {/* Score pills */}
                        <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                          <Pill label="Score"   value={`${a.score}/${a.total}`}  bg="#EFF6FF" color="#1D4ED8" />
                          <Pill label="%"       value={`${pct}%`}               bg={bg}       color={text}    />
                          <Pill label="Time"    value={fmtTime(a.time_taken_seconds)} bg="#F3F4F6" color="#374151" />
                        </div>
                        {/* Retry link */}
                        <button
                          onClick={() => router.push(`/igcse/mcq-exam/${a.paper_id}`)}
                          style={{ padding: '0.4rem 0.875rem', background: '#2563EB', color: 'white', border: 'none', borderRadius: '0.5rem', fontSize: '0.8125rem', fontWeight: 600, cursor: 'pointer' }}
                        >
                          Retry
                        </button>
                      </div>
                    );
                  })}
                </div>
              )
            )}

            {/* ── Weak questions tab ── */}
            {activeTab === 'weak' && (
              wrongLoading ? <LoadingSpinner /> :
              wrongQuestions.length === 0 ? (
                <EmptyState icon="🎯" title="No Wrong Answers Recorded" desc="Complete an MCQ exam — questions you get wrong will appear here so you can focus on them.">
                  <PrimaryBtn onClick={() => router.push('/igcse/practice')}>Start Practising</PrimaryBtn>
                </EmptyState>
              ) : (
                <div style={{ display: 'grid', gap: '1.5rem' }}>
                  {Object.entries(wrongBySubject).map(([code, qs]) => (
                    <div key={code}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.75rem' }}>
                        <span style={{ fontWeight: 700, fontSize: '1rem', color: '#111827' }}>
                          {SUBJECT_NAME[code] ?? code}
                        </span>
                        <span style={{ padding: '2px 8px', background: '#FEE2E2', color: '#DC2626', borderRadius: 9999, fontSize: '0.75rem', fontWeight: 700 }}>
                          {qs.length} wrong
                        </span>
                      </div>
                      <div style={{ display: 'grid', gap: '0.5rem' }}>
                        {qs.map(wq => (
                          <div key={wq.id} style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', padding: '0.75rem 1rem', border: '1px solid #FECACA', borderRadius: '0.5rem', background: '#FFF5F5', flexWrap: 'wrap' }}>
                            <span style={{ fontSize: '0.875rem', color: '#374151', flex: 1 }}>
                              <strong>{paperLabel(wq.paper_id)}</strong> — Q{wq.question_number}
                            </span>
                            <span style={{ fontSize: '0.8125rem', color: '#6B7280' }}>
                              You answered: <strong style={{ color: '#DC2626' }}>{wq.user_answer ?? '—'}</strong>
                              &nbsp;· Correct: <strong style={{ color: '#059669' }}>{wq.correct_answer}</strong>
                            </span>
                            <span style={{ fontSize: '0.75rem', color: '#9CA3AF' }}>{fmtDate(wq.created_at)}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              )
            )}

          </div>
        </div>
      </div>
    </div>
  );
}

// ── Sub-components ────────────────────────────────────────────────────────────

function EmptyState({ icon, title, desc, children }: { icon: string; title: string; desc: string; children?: React.ReactNode }) {
  return (
    <div style={{ textAlign: 'center', padding: '3rem' }}>
      <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>{icon}</div>
      <h3 style={{ fontSize: '1.25rem', fontWeight: 700, marginBottom: '0.5rem', color: '#111827' }}>{title}</h3>
      <p style={{ color: '#6B7280', marginBottom: '1.5rem' }}>{desc}</p>
      {children}
    </div>
  );
}

function PrimaryBtn({ children, onClick }: { children: React.ReactNode; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      style={{ padding: '0.75rem 1.5rem', background: 'linear-gradient(145deg,#2563EB,#1D4ED8)', color: 'white', border: 'none', borderRadius: '0.5rem', fontSize: '0.875rem', fontWeight: 600, cursor: 'pointer', boxShadow: '0 4px 8px rgba(37,99,235,0.3)' }}
    >
      {children}
    </button>
  );
}

function Pill({ label, value, bg, color }: { label: string; value: string; bg: string; color: string }) {
  return (
    <div style={{ padding: '0.3rem 0.625rem', background: bg, borderRadius: '0.375rem', textAlign: 'center' }}>
      <div style={{ fontSize: '0.6875rem', color: '#6B7280', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>{label}</div>
      <div style={{ fontSize: '0.875rem', fontWeight: 700, color }}>{value}</div>
    </div>
  );
}

function LoadingSpinner() {
  return (
    <div style={{ textAlign: 'center', padding: '3rem', color: '#6B7280' }}>
      <div style={{ width: 36, height: 36, border: '3px solid #E5E7EB', borderTop: '3px solid #2563EB', borderRadius: '50%', animation: 'spin 0.8s linear infinite', margin: '0 auto 1rem' }} />
      Loading...
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}

function ResourceCard({
  resource, showDelete = false, onDelete, deleteConfirm = false, onConfirmDelete, onCancelDelete,
}: {
  resource: Resource;
  showDelete?: boolean;
  onDelete?: () => void;
  deleteConfirm?: boolean;
  onConfirmDelete?: () => void;
  onCancelDelete?: () => void;
}) {
  const subject = SUBJECTS.find(s => s.code === resource.subject);
  const resourceType = RESOURCE_TYPES.find(t => t.value === resource.resource_type);
  return (
    <div style={{ padding: '1rem', border: '1px solid #E5E7EB', borderRadius: '0.5rem' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start' }}>
        <div style={{ flex: 1 }}>
          <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '0.5rem', flexWrap: 'wrap' }}>
            <span style={{ padding: '0.25rem 0.5rem', background: '#EFF6FF', color: '#2563EB', borderRadius: '0.25rem', fontSize: '0.75rem', fontWeight: 600 }}>{subject?.icon} {subject?.name}</span>
            <span style={{ padding: '0.25rem 0.5rem', background: '#F3F4F6', color: '#6B7280',  borderRadius: '0.25rem', fontSize: '0.75rem', fontWeight: 600 }}>{resourceType?.icon} {resourceType?.label}</span>
            <span style={{ padding: '0.25rem 0.5rem', background: '#FEF3C7', color: '#D97706', borderRadius: '0.25rem', fontSize: '0.75rem', fontWeight: 600 }}>▲ {resource.upvote_count} upvotes</span>
          </div>
          <h4 style={{ fontSize: '1rem', fontWeight: 700, marginBottom: '0.25rem', color: '#111827' }}>{resource.title}</h4>
          <p style={{ fontSize: '0.875rem', color: '#6B7280', marginBottom: '0.5rem' }}>{resource.description}</p>
          <a href={resource.link} target="_blank" rel="noopener noreferrer" style={{ fontSize: '0.75rem', color: '#2563EB', textDecoration: 'none' }}>View Resource →</a>
        </div>
        {showDelete && (
          <button onClick={onDelete} style={{ padding: '0.5rem', background: '#FEE2E2', color: '#DC2626', border: 'none', borderRadius: '0.5rem', cursor: 'pointer', fontSize: '0.875rem', fontWeight: 600, marginLeft: '1rem' }}>Delete</button>
        )}
      </div>
      {deleteConfirm && (
        <div style={{ marginTop: '1rem', padding: '1rem', background: '#FEF2F2', border: '1px solid #FCA5A5', borderRadius: '0.5rem' }}>
          <p style={{ fontSize: '0.875rem', color: '#DC2626', marginBottom: '0.75rem', fontWeight: 600 }}>Are you sure you want to delete this resource? This cannot be undone.</p>
          <div style={{ display: 'flex', gap: '0.5rem' }}>
            <button onClick={onConfirmDelete} style={{ padding: '0.5rem 1rem', background: '#DC2626', color: 'white', border: 'none', borderRadius: '0.5rem', cursor: 'pointer', fontSize: '0.875rem', fontWeight: 600 }}>Yes, Delete</button>
            <button onClick={onCancelDelete} style={{ padding: '0.5rem 1rem', background: 'white', color: '#6B7280', border: '1px solid #D1D5DB', borderRadius: '0.5rem', cursor: 'pointer', fontSize: '0.875rem', fontWeight: 600 }}>Cancel</button>
          </div>
        </div>
      )}
    </div>
  );
}
