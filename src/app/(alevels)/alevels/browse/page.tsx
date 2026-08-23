'use client';

import { useEffect, useState, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { ALEVEL_SUBJECTS } from '@/lib/constants/alevels-subjects';
import { RESOURCE_TYPES } from '@/lib/constants/resourceTypes';
import { HeartIcon, CreatorBadge } from '@/components/HeartIcon';
import { EditResourceModal } from '@/components/EditResourceModal';
import Header from '@/components/Header';

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
  profiles: {
    username: string;
    full_name: string;
    email: string;
  };
}

const SERIF = "'Cormorant Garamond', 'Cormorant', Georgia, serif";
const SANS = "'DM Sans', 'Inter', system-ui, -apple-system, sans-serif";

const DUST = Array.from({ length: 48 }, (_, i) => ({
  id: i,
  size: 1.8 + (i * 5.7 % 3.2),
  left: (i * 18.3 + 6) % 100,
  top: (i * 24.7 + 9) % 100,
  dur: 14 + (i * 3.3 % 12),
  delay: (i * 2.9) % 10,
  anim: i % 3,
}));

const SidebarIcon = ({ type, size = 15 }: { type: string; size?: number }) => {
  const p = { width: size, height: size, viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', strokeWidth: 1.5, strokeLinecap: 'round' as const, strokeLinejoin: 'round' as const };
  switch (type) {
    case 'all': return <svg {...p}><rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/></svg>;
    case 'notes': return <svg {...p}><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/></svg>;
    case 'flashcards': return <svg {...p}><rect x="2" y="6" width="20" height="13" rx="2"/><path d="M8 6V4a2 2 0 012-2h4a2 2 0 012 2v2"/></svg>;
    case 'formula-sheets': return <svg {...p}><line x1="19" y1="4" x2="10" y2="4"/><line x1="14" y1="20" x2="5" y2="20"/><line x1="15" y1="4" x2="9" y2="20"/></svg>;
    case 'hardest-questions': return <svg {...p}><circle cx="12" cy="12" r="10"/><path d="M9.09 9a3 3 0 015.83 1c0 2-3 3-3 3"/><circle cx="12" cy="17" r=".5" fill="currentColor"/></svg>;
    case 'sample-answers': return <svg {...p}><path d="M9 11l3 3L22 4"/><path d="M21 12v7a2 2 0 01-2 2H5a2 2 0 01-2-2V5a2 2 0 012-2h11"/></svg>;
    case 'revision-guides': return <svg {...p}><path d="M4 19.5A2.5 2.5 0 016.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 014 19.5v-15A2.5 2.5 0 016.5 2z"/></svg>;
    case 'youtube': return <svg {...p}><rect x="2" y="6" width="20" height="13" rx="2"/><polygon points="10 9 16 12.5 10 16 10 9" fill="currentColor" stroke="none"/></svg>;
    case 'worksheets': return <svg {...p}><rect x="3" y="3" width="18" height="18" rx="2"/><line x1="7" y1="8" x2="17" y2="8"/><line x1="7" y1="12" x2="17" y2="12"/><line x1="7" y1="16" x2="13" y2="16"/></svg>;
    case 'popular': return <svg {...p}><polyline points="23 6 13.5 15.5 8.5 10.5 1 18"/><polyline points="17 6 23 6 23 12"/></svg>;
    case 'newest': return <svg {...p}><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>;
    default: return <svg {...p}><circle cx="12" cy="12" r="3"/></svg>;
  }
};

const NAV_TYPES = [
  { value: 'all', label: 'All Resources' },
  { value: 'notes', label: 'Revision Notes' },
  { value: 'flashcards', label: 'Flashcards' },
  { value: 'formula-sheets', label: 'Formula Sheets' },
  { value: 'hardest-questions', label: 'Hardest Questions' },
  { value: 'sample-answers', label: 'Sample Answers' },
  { value: 'revision-guides', label: 'Revision Guides' },
  { value: 'youtube', label: 'YouTube Resources' },
  { value: 'worksheets', label: 'Worksheets' },
];

function BrowsePageInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [resources, setResources] = useState<Resource[]>([]);
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<any>(null);
  const [userVotes, setUserVotes] = useState<Set<string>>(new Set());
  const [editingResource, setEditingResource] = useState<Resource | null>(null);
  const [userProfile, setUserProfile] = useState<any>(null);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);

  const [selectedSubject, setSelectedSubject] = useState<string>(
    searchParams.get('subject') ?? 'all'
  );
  const [selectedType, setSelectedType] = useState<string>('all');
  const [sortBy, setSortBy] = useState<string>('popular');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [currentPage, setCurrentPage] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const ITEMS_PER_PAGE = 10;

  const [glowPos, setGlowPos] = useState({ x: 50, y: 50 });
  const [glowVisible, setGlowVisible] = useState(false);

  useEffect(() => {
    const move = (e: MouseEvent) => { setGlowPos({ x: e.clientX, y: e.clientY }); setGlowVisible(true); };
    const leave = () => setGlowVisible(false);
    window.addEventListener('mousemove', move);
    window.addEventListener('mouseleave', leave);
    return () => { window.removeEventListener('mousemove', move); window.removeEventListener('mouseleave', leave); };
  }, []);

  useEffect(() => { fetchData(); }, [selectedSubject, selectedType, sortBy, currentPage]);
  useEffect(() => { setCurrentPage(1); }, [selectedSubject, selectedType, sortBy]);

  const aLevelCodes = ALEVEL_SUBJECTS.map(s => s.code);

  const fetchData = async () => {
    setLoading(true);
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    setUser(user);

    if (user) {
      const { data: profile } = await supabase.from('profiles').select('full_name, email').eq('id', user.id).single();
      setUserProfile(profile);
    }
    if (user) {
      const { data: votes } = await supabase.from('votes').select('resource_id').eq('user_id', user.id);
      if (votes) setUserVotes(new Set(votes.map((v: any) => v.resource_id)));
    }

    let countQuery = (supabase.from('resources') as any)
      .select('*', { count: 'exact', head: true })
      .or('status.eq.approved,status.is.null')
      .in('subject', selectedSubject !== 'all' ? [selectedSubject] : aLevelCodes);
    if (selectedType !== 'all') countQuery = countQuery.eq('resource_type', selectedType);
    const { count } = await countQuery;
    setTotalCount(count || 0);

    let query = (supabase.from('resources') as any)
      .select('*, profiles (username, full_name, email)')
      .or('status.eq.approved,status.is.null')
      .in('subject', selectedSubject !== 'all' ? [selectedSubject] : aLevelCodes);
    if (selectedType !== 'all') query = query.eq('resource_type', selectedType);
    if (sortBy === 'newest') query = query.order('created_at', { ascending: false });
    else if (sortBy === 'popular') query = query.order('upvote_count', { ascending: false });
    const from = (currentPage - 1) * ITEMS_PER_PAGE;
    query = query.range(from, from + ITEMS_PER_PAGE - 1);
    const { data, error } = await query;
    if (!error) setResources(data || []);
    setLoading(false);
  };

  const handleUpvote = async (resourceId: string) => {
    if (!user) { router.push('/alevels/login'); return; }
    const supabase = createClient() as any;
    const hasVoted = userVotes.has(resourceId);
    if (hasVoted) {
      await supabase.from('votes').delete().eq('resource_id', resourceId).eq('user_id', user.id);
      const { count } = await supabase.from('votes').select('*', { count: 'exact', head: true }).eq('resource_id', resourceId);
      const n = count ?? 0;
      await supabase.from('resources').update({ upvote_count: n }).eq('id', resourceId);
      setUserVotes(prev => { const s = new Set(prev); s.delete(resourceId); return s; });
      setResources(prev => prev.map(r => r.id === resourceId ? { ...r, upvote_count: n } : r));
    } else {
      await supabase.from('votes').insert({ resource_id: resourceId, user_id: user.id });
      const { count } = await supabase.from('votes').select('*', { count: 'exact', head: true }).eq('resource_id', resourceId);
      const n = count ?? 0;
      await supabase.from('resources').update({ upvote_count: n }).eq('id', resourceId);
      setUserVotes(prev => new Set(prev).add(resourceId));
      setResources(prev => {
        const updated = prev.map(r => r.id === resourceId ? { ...r, upvote_count: n } : r);
        return sortBy === 'popular' ? updated.sort((a, b) => b.upvote_count - a.upvote_count) : updated;
      });
    }
  };

  const handleEdit = async () => { window.location.reload(); };

  const handleDelete = async (resourceId: string) => {
    const supabase = createClient();
    const { error } = await supabase.from('resources').delete().eq('id', resourceId);
    if (!error) setResources(prev => prev.filter(r => r.id !== resourceId));
    setDeleteConfirmId(null);
  };

  const isCreator = (email?: string) =>
    email === 'arinjaysaha2010@gmail.com' || email === 'aashitag811@gmail.com';
  const isSelfCreator = isCreator(userProfile?.email);
  const canEdit = (r: Resource) => user && (r.uploader_id === user.id || isSelfCreator);
  const canDelete = (r: Resource) => user && (r.uploader_id === user.id || isSelfCreator);

  const filteredResources = resources.filter(r => {
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    return r.title.toLowerCase().includes(q) || r.description?.toLowerCase().includes(q) || r.profiles?.username?.toLowerCase().includes(q);
  });

  const activeSubject = ALEVEL_SUBJECTS.find(s => s.code === selectedSubject);

  return (
    <div style={{ minHeight: '100vh', background: '#0c1018', position: 'relative', overflowX: 'hidden' }}>

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

      {/* Cursor-following glow */}
      <div
        className="pointer-events-none"
        style={{
          position: 'fixed', inset: 0, zIndex: 1,
          opacity: glowVisible ? 1 : 0,
          transition: 'opacity 0.4s ease',
          background: `radial-gradient(circle 360px at ${glowPos.x}px ${glowPos.y}px, rgba(200,168,76,0.07) 0%, rgba(180,140,30,0.03) 50%, transparent 100%)`,
        }}
      />

      <Header />

      {/* ── Page layout ── */}
      <div style={{ display: 'flex', paddingTop: '72px', position: 'relative', zIndex: 2 }}>

        {/* ── Sidebar ── */}
        <aside style={{
          width: '210px',
          flexShrink: 0,
          borderRight: '1px solid rgba(200,168,76,0.08)',
          padding: '32px 0',
          position: 'sticky',
          top: '72px',
          height: 'calc(100vh - 72px)',
          overflowY: 'auto',
          background: 'rgba(3,6,10,0.6)',
        }}>

          {/* Resource type nav */}
          <div style={{ padding: '0 16px', marginBottom: '32px' }}>
            <p style={{
              fontFamily: SANS, fontSize: '10px', fontWeight: 600,
              letterSpacing: '0.18em', color: 'rgba(200,168,76,0.4)',
              textTransform: 'uppercase', marginBottom: '10px',
            }}>Browse Resources</p>
            {NAV_TYPES.map(item => {
              const active = selectedType === item.value;
              return (
                <button key={item.value} onClick={() => setSelectedType(item.value)} style={{
                  display: 'flex', alignItems: 'center', gap: '9px',
                  width: '100%', textAlign: 'left',
                  padding: '7px 10px', borderRadius: '4px', marginBottom: '2px',
                  background: active ? 'rgba(200,168,76,0.10)' : 'transparent',
                  borderLeft: active ? '2px solid rgba(200,168,76,0.6)' : '2px solid transparent',
                  color: active ? '#D4B96A' : 'rgba(210,190,145,0.72)',
                  fontFamily: SERIF, fontSize: '14px', fontWeight: active ? 600 : 500,
                  letterSpacing: '0.02em', cursor: 'pointer',
                  transition: 'all 0.15s ease',
                }}>
                  <span style={{ opacity: active ? 1 : 0.55, display: 'flex', flexShrink: 0 }}><SidebarIcon type={item.value} /></span>
                  {item.label}
                </button>
              );
            })}
          </div>

          {/* Divider */}
          <div style={{ height: '1px', background: 'rgba(200,168,76,0.07)', margin: '0 16px 24px' }} />

          {/* Sort */}
          <div style={{ padding: '0 16px', marginBottom: '32px' }}>
            <p style={{
              fontFamily: SANS, fontSize: '10px', fontWeight: 600,
              letterSpacing: '0.18em', color: 'rgba(200,168,76,0.4)',
              textTransform: 'uppercase', marginBottom: '10px',
            }}>Filter By</p>
            {[
              { value: 'popular', label: 'Popular', icon: '🔥' },
              { value: 'newest', label: 'Newest', icon: '🕐' },
            ].map(item => {
              const active = sortBy === item.value;
              return (
                <button key={item.value} onClick={() => setSortBy(item.value)} style={{
                  display: 'flex', alignItems: 'center', gap: '9px',
                  width: '100%', textAlign: 'left',
                  padding: '7px 10px', borderRadius: '4px', marginBottom: '2px',
                  background: active ? 'rgba(200,168,76,0.10)' : 'transparent',
                  borderLeft: active ? '2px solid rgba(200,168,76,0.6)' : '2px solid transparent',
                  color: active ? '#D4B96A' : 'rgba(210,190,145,0.72)',
                  fontFamily: SERIF, fontSize: '14px', fontWeight: active ? 600 : 500,
                  cursor: 'pointer', transition: 'all 0.15s ease',
                }}>
                  <span style={{ opacity: active ? 1 : 0.55, display: 'flex', flexShrink: 0 }}><SidebarIcon type={item.value} /></span>
                  {item.label}
                </button>
              );
            })}
          </div>

          {/* Divider */}
          <div style={{ height: '1px', background: 'rgba(200,168,76,0.07)', margin: '0 16px 24px' }} />

          {/* Subject */}
          <div style={{ padding: '0 16px' }}>
            <p style={{
              fontFamily: SANS, fontSize: '10px', fontWeight: 600,
              letterSpacing: '0.18em', color: 'rgba(200,168,76,0.4)',
              textTransform: 'uppercase', marginBottom: '10px',
            }}>Subject</p>
            {[{ code: 'all', name: 'All Subjects' }, ...ALEVEL_SUBJECTS].map(s => {
              const active = selectedSubject === s.code;
              return (
                <button key={s.code} onClick={() => setSelectedSubject(s.code)} style={{
                  display: 'flex', alignItems: 'center', gap: '9px',
                  width: '100%', textAlign: 'left',
                  padding: '7px 10px', borderRadius: '4px', marginBottom: '2px',
                  background: active ? 'rgba(200,168,76,0.10)' : 'transparent',
                  borderLeft: active ? '2px solid rgba(200,168,76,0.6)' : '2px solid transparent',
                  color: active ? '#D4B96A' : 'rgba(210,190,145,0.72)',
                  fontFamily: SERIF, fontSize: '14px', fontWeight: active ? 600 : 500,
                  cursor: 'pointer', transition: 'all 0.15s ease',
                }}>
                  <span style={{ opacity: active ? 1 : 0.55, display: 'flex', flexShrink: 0 }}><SidebarIcon type="all" size={13} /></span>
                  {s.name}
                </button>
              );
            })}
          </div>
        </aside>

        {/* ── Main ── */}
        <main style={{ flex: 1, minWidth: 0, padding: '32px 40px 60px' }}>

          {/* Page header */}
          <div style={{ marginBottom: '28px', borderBottom: '1px solid rgba(200,168,76,0.08)', paddingBottom: '20px' }}>
            <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', gap: '16px', flexWrap: 'wrap' }}>
              <div>
                <h1 style={{
                  fontFamily: SERIF,
                  fontSize: 'clamp(1.5rem, 2.8vw, 2rem)',
                  fontWeight: 400,
                  letterSpacing: '0.03em',
                  lineHeight: 1.2,
                  margin: '0 0 4px',
                  color: activeSubject ? '#D4C99A' : '#F0EAD6',
                  textShadow: activeSubject
                    ? '0 0 24px rgba(200,168,76,0.18), 0 1px 4px rgba(0,0,0,0.5)'
                    : 'none',
                }}>
                  {activeSubject ? activeSubject.name : 'Browse the Archive'}
                </h1>
                <p style={{
                  fontFamily: SERIF, fontStyle: 'italic',
                  fontSize: '13px', fontWeight: 400,
                  color: 'rgba(196,176,138,0.45)',
                  letterSpacing: '0.02em', margin: 0,
                }}>
                  {activeSubject
                    ? `${activeSubject.name} A Level resources shared by the community`
                    : 'A Level resources shared by the community'}
                </p>
                <div style={{
                  marginTop: '10px', height: '1px', width: '120px',
                  background: 'linear-gradient(to right, rgba(200,168,76,0.35), transparent)',
                }} />
              </div>

              {/* Search + upload */}
              <div style={{ display: 'flex', gap: '10px', alignItems: 'center', flexShrink: 0 }}>
                <div style={{ position: 'relative' }}>
                  <svg style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', opacity: 0.3 }} width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#C9A84C" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
                  </svg>
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={e => setSearchQuery(e.target.value)}
                    placeholder="Search the archive..."
                    style={{
                      background: 'rgba(255,255,255,0.03)',
                      border: '1px solid rgba(200,168,76,0.12)',
                      borderRadius: '6px',
                      padding: '8px 14px 8px 32px',
                      color: '#C4B08A',
                      fontFamily: SANS, fontSize: '13px',
                      outline: 'none', width: '220px',
                    }}
                  />
                </div>
                {user && (
                  <button onClick={() => router.push('/alevels/upload')} style={{
                    fontFamily: SANS, fontSize: '13px', fontWeight: 500,
                    color: '#C9A84C',
                    background: 'rgba(200,168,76,0.07)',
                    border: '1px solid rgba(200,168,76,0.2)',
                    borderRadius: '6px', padding: '8px 16px', cursor: 'pointer',
                    whiteSpace: 'nowrap',
                  }}>
                    + Upload
                  </button>
                )}
              </div>
            </div>

            {/* Result count */}
            <p style={{
              fontFamily: SANS, fontSize: '12px',
              color: 'rgba(196,176,138,0.35)',
              marginTop: '12px', letterSpacing: '0.04em',
            }}>
              {filteredResources.length} {filteredResources.length === 1 ? 'result' : 'results'}
              {totalCount > ITEMS_PER_PAGE && ` — page ${currentPage} of ${Math.ceil(totalCount / ITEMS_PER_PAGE)}`}
            </p>
          </div>

          {/* Resource list */}
          {loading ? (
            <div style={{ display: 'flex', justifyContent: 'center', paddingTop: '80px' }}>
              <div style={{
                width: '28px', height: '28px',
                border: '1.5px solid rgba(200,168,76,0.15)',
                borderTopColor: 'rgba(200,168,76,0.6)',
                borderRadius: '50%',
                animation: 'spin 0.8s linear infinite',
              }} />
            </div>
          ) : filteredResources.length === 0 ? (
            <div style={{ paddingTop: '80px', textAlign: 'center' }}>
              <p style={{ fontFamily: SERIF, fontStyle: 'italic', fontSize: '1.1rem', color: 'rgba(196,176,138,0.3)' }}>
                No resources found in the archive.
              </p>
            </div>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '12px' }}>
              {filteredResources.map((resource) => {
                const resourceType = RESOURCE_TYPES.find(t => t.value === resource.resource_type);
                const subject = ALEVEL_SUBJECTS.find(s => s.code === resource.subject);
                const hasVoted = userVotes.has(resource.id);

                return (
                  <div
                    key={resource.id}
                    style={{
                      display: 'flex', flexDirection: 'column', gap: '8px',
                      padding: '14px 16px',
                      border: '1px solid rgba(200,168,76,0.08)',
                      borderRadius: '4px',
                      background: 'rgba(255,255,255,0.015)',
                      transition: 'border-color 0.15s ease, background 0.15s ease',
                    }}
                    onMouseEnter={e => {
                      (e.currentTarget as HTMLDivElement).style.borderColor = 'rgba(200,168,76,0.2)';
                      (e.currentTarget as HTMLDivElement).style.background = 'rgba(200,168,76,0.03)';
                    }}
                    onMouseLeave={e => {
                      (e.currentTarget as HTMLDivElement).style.borderColor = 'rgba(200,168,76,0.08)';
                      (e.currentTarget as HTMLDivElement).style.background = 'rgba(255,255,255,0.015)';
                    }}
                  >
                    {/* Tags + upvote row */}
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '6px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap', minWidth: 0 }}>
                        {subject && (
                          <span style={{
                            fontFamily: SANS, fontSize: '9px', fontWeight: 600,
                            letterSpacing: '0.14em', textTransform: 'uppercase',
                            color: 'rgba(200,168,76,0.7)',
                          }}>
                            {subject.name}
                          </span>
                        )}
                        {subject && resourceType && <span style={{ color: 'rgba(200,168,76,0.2)', fontSize: '9px' }}>·</span>}
                        {resourceType && (
                          <span style={{
                            fontFamily: SANS, fontSize: '9px', fontWeight: 500,
                            letterSpacing: '0.1em', textTransform: 'uppercase',
                            color: 'rgba(196,176,138,0.4)',
                          }}>
                            {resourceType.label}
                          </span>
                        )}
                      </div>
                      {/* Upvote */}
                      <div style={{ display: 'flex', alignItems: 'center', gap: '4px', flexShrink: 0 }}>
                        <HeartIcon filled={hasVoted} size={14} onClick={() => handleUpvote(resource.id)} />
                        <span style={{
                          fontFamily: SANS, fontSize: '11px', fontWeight: 600,
                          color: hasVoted ? '#C9A84C' : 'rgba(196,176,138,0.3)',
                        }}>
                          {resource.upvote_count}
                        </span>
                      </div>
                    </div>

                    {/* Title */}
                    <h3 style={{
                      fontFamily: SERIF, fontSize: '1rem', fontWeight: 500,
                      color: '#E8DCC4', letterSpacing: '0.01em', lineHeight: 1.3,
                      margin: 0,
                    }}>
                      {resource.title}
                    </h3>

                    {/* Description */}
                    {resource.description && (
                      <p style={{
                        fontFamily: SANS, fontSize: '12px',
                        color: 'rgba(196,176,138,0.45)', lineHeight: 1.55,
                        margin: 0,
                        display: '-webkit-box',
                        WebkitLineClamp: 2,
                        WebkitBoxOrient: 'vertical' as any,
                        overflow: 'hidden',
                      }}>
                        {resource.description}
                      </p>
                    )}

                    {/* Uploader + actions */}
                    <div style={{ marginTop: 'auto', paddingTop: '8px', borderTop: '1px solid rgba(200,168,76,0.06)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px' }}>
                      <span style={{ fontFamily: SANS, fontSize: '11px', color: 'rgba(196,176,138,0.65)', fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {resource.profiles?.full_name || resource.profiles?.username || 'Anonymous'}
                        {isCreator(resource.profiles?.email) && <CreatorBadge />}
                      </span>
                      <div style={{ display: 'flex', gap: '6px', flexShrink: 0 }}>
                        {user ? (
                          <a href={resource.link} target="_blank" rel="noopener noreferrer" style={{
                            fontFamily: SANS, fontSize: '11px', fontWeight: 500,
                            color: '#C9A84C', border: '1px solid rgba(200,168,76,0.25)',
                            borderRadius: '3px', padding: '3px 10px',
                            textDecoration: 'none', cursor: 'pointer',
                          }}>View →</a>
                        ) : (
                          <button onClick={() => router.push('/alevels/login')} style={{
                            fontFamily: SANS, fontSize: '11px', fontWeight: 500,
                            color: '#C9A84C', border: '1px solid rgba(200,168,76,0.25)',
                            borderRadius: '3px', padding: '3px 10px', cursor: 'pointer',
                            background: 'transparent',
                          }}>Login →</button>
                        )}
                        {canEdit(resource) && (
                          <button onClick={() => setEditingResource(resource)} style={{
                            fontFamily: SANS, fontSize: '11px', color: 'rgba(196,176,138,0.4)',
                            border: '1px solid rgba(196,176,138,0.1)', borderRadius: '3px',
                            padding: '3px 8px', cursor: 'pointer', background: 'transparent',
                          }}>Edit</button>
                        )}
                        {canDelete(resource) && (
                          <button onClick={() => setDeleteConfirmId(resource.id)} style={{
                            fontFamily: SANS, fontSize: '11px', color: 'rgba(180,60,60,0.55)',
                            border: '1px solid rgba(180,60,60,0.12)', borderRadius: '3px',
                            padding: '3px 8px', cursor: 'pointer', background: 'transparent',
                          }}>Del</button>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* Pagination */}
          {!loading && totalCount > ITEMS_PER_PAGE && (
            <div style={{ marginTop: '32px', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '4px' }}>
              <button
                onClick={() => { setCurrentPage(p => Math.max(1, p - 1)); window.scrollTo({ top: 0, behavior: 'smooth' }); }}
                disabled={currentPage === 1}
                style={{
                  fontFamily: SANS, fontSize: '12px',
                  color: currentPage === 1 ? 'rgba(200,168,76,0.2)' : 'rgba(200,168,76,0.6)',
                  background: 'transparent', border: '1px solid rgba(200,168,76,0.12)',
                  borderRadius: '4px', padding: '5px 12px',
                  cursor: currentPage === 1 ? 'not-allowed' : 'pointer',
                }}>
                ← Prev
              </button>
              {Array.from({ length: Math.ceil(totalCount / ITEMS_PER_PAGE) }, (_, i) => i + 1)
                .filter(p => p === 1 || p === Math.ceil(totalCount / ITEMS_PER_PAGE) || Math.abs(p - currentPage) <= 1)
                .map((page, idx, arr) => (
                  <div key={page} style={{ display: 'flex', gap: '4px', alignItems: 'center' }}>
                    {arr[idx - 1] && page - arr[idx - 1] > 1 && (
                      <span style={{ fontFamily: SANS, fontSize: '12px', color: 'rgba(200,168,76,0.2)', padding: '0 2px' }}>…</span>
                    )}
                    <button
                      onClick={() => { setCurrentPage(page); window.scrollTo({ top: 0, behavior: 'smooth' }); }}
                      style={{
                        fontFamily: SANS, fontSize: '12px', minWidth: '30px',
                        color: currentPage === page ? '#C9A84C' : 'rgba(196,176,138,0.4)',
                        background: currentPage === page ? 'rgba(200,168,76,0.08)' : 'transparent',
                        border: currentPage === page ? '1px solid rgba(200,168,76,0.25)' : '1px solid rgba(200,168,76,0.08)',
                        borderRadius: '4px', padding: '5px 8px', cursor: 'pointer',
                      }}>
                      {page}
                    </button>
                  </div>
                ))}
              <button
                onClick={() => { setCurrentPage(p => Math.min(Math.ceil(totalCount / ITEMS_PER_PAGE), p + 1)); window.scrollTo({ top: 0, behavior: 'smooth' }); }}
                disabled={currentPage >= Math.ceil(totalCount / ITEMS_PER_PAGE)}
                style={{
                  fontFamily: SANS, fontSize: '12px',
                  color: currentPage >= Math.ceil(totalCount / ITEMS_PER_PAGE) ? 'rgba(200,168,76,0.2)' : 'rgba(200,168,76,0.6)',
                  background: 'transparent', border: '1px solid rgba(200,168,76,0.12)',
                  borderRadius: '4px', padding: '5px 12px',
                  cursor: currentPage >= Math.ceil(totalCount / ITEMS_PER_PAGE) ? 'not-allowed' : 'pointer',
                }}>
                Next →
              </button>
            </div>
          )}
        </main>
      </div>

      {editingResource && (
        <EditResourceModal resource={editingResource} onClose={() => setEditingResource(null)} onSave={handleEdit} />
      )}

      {/* Delete confirmation modal */}
      {deleteConfirmId && (() => {
        const r = resources.find(x => x.id === deleteConfirmId);
        return (
          <div
            style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(4px)', zIndex: 200, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem' }}
            onClick={() => setDeleteConfirmId(null)}
          >
            <div
              style={{ background: '#0e1420', border: '1px solid rgba(200,168,76,0.2)', borderTop: '1px solid rgba(200,168,76,0.35)', borderRadius: '0.875rem', padding: '2rem', maxWidth: 440, width: '100%', boxShadow: '0 24px 64px rgba(0,0,0,0.6)' }}
              onClick={e => e.stopPropagation()}
            >
              <div style={{ textAlign: 'center', marginBottom: '1.5rem' }}>
                <div style={{ fontSize: '2rem', marginBottom: '0.75rem', opacity: 0.7 }}>🗑️</div>
                <h3 style={{ fontFamily: SERIF, fontSize: '1.375rem', fontWeight: 600, color: '#E8DCC4', marginBottom: '0.5rem' }}>
                  Delete Resource?
                </h3>
                <p style={{ fontFamily: SANS, fontSize: '0.875rem', color: 'rgba(196,176,138,0.55)', lineHeight: 1.6 }}>
                  <strong style={{ color: '#E8DCC4' }}>"{r?.title}"</strong> will be permanently removed. This cannot be undone.
                </p>
              </div>
              <div style={{ display: 'flex', gap: '0.75rem' }}>
                <button
                  onClick={() => setDeleteConfirmId(null)}
                  style={{ flex: 1, padding: '0.625rem', background: 'transparent', color: 'rgba(196,176,138,0.55)', border: '1px solid rgba(200,168,76,0.12)', borderRadius: '6px', fontFamily: SANS, fontSize: '0.875rem', fontWeight: 600, cursor: 'pointer' }}
                >
                  Cancel
                </button>
                <button
                  onClick={() => handleDelete(deleteConfirmId)}
                  style={{ flex: 1, padding: '0.625rem', background: 'rgba(160,40,40,0.25)', color: '#F09090', border: '1px solid rgba(180,40,40,0.4)', borderRadius: '6px', fontFamily: SANS, fontSize: '0.875rem', fontWeight: 700, cursor: 'pointer' }}
                >
                  Yes, Delete
                </button>
              </div>
            </div>
          </div>
        );
      })()}

      <style jsx global>{`
        @keyframes spin { to { transform: rotate(360deg); } }
        @keyframes dust0 { 0%{transform:translate(0,0);opacity:0} 15%{opacity:.7} 50%{transform:translate(16px,-52px);opacity:.85} 85%{opacity:.5} 100%{transform:translate(0,0);opacity:0} }
        @keyframes dust1 { 0%{transform:translate(0,0);opacity:0} 15%{opacity:.6} 50%{transform:translate(-18px,-44px);opacity:.75} 85%{opacity:.45} 100%{transform:translate(0,0);opacity:0} }
        @keyframes dust2 { 0%{transform:translate(0,0);opacity:0} 20%{opacity:.65} 50%{transform:translate(10px,-60px);opacity:.8} 80%{opacity:.4} 100%{transform:translate(0,0);opacity:0} }
      `}</style>
    </div>
  );
}

export default function ALevelsBrowsePage() {
  return (
    <Suspense>
      <BrowsePageInner />
    </Suspense>
  );
}

// Made with Bob
