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
  id: string; title: string; description: string; link: string;
  subject: string; resource_type: string; upvote_count: number;
  created_at: string; uploader_id: string;
  profiles: { username: string; full_name: string; email: string };
}

const SERIF = "'Cormorant Garamond', 'Cormorant', Georgia, serif";
const SANS  = "'DM Sans', 'Inter', system-ui, -apple-system, sans-serif";

const DUST = Array.from({ length: 48 }, (_, i) => ({
  id: i, size: 1.8 + (i * 5.7 % 3.2),
  left: (i * 18.3 + 6) % 100, top: (i * 24.7 + 9) % 100,
  dur: 14 + (i * 3.3 % 12), delay: (i * 2.9) % 10, anim: i % 3,
}));

const SidebarIcon = ({ type, size = 15 }: { type: string; size?: number }) => {
  const p = { width: size, height: size, viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', strokeWidth: 1.5, strokeLinecap: 'round' as const, strokeLinejoin: 'round' as const };
  switch (type) {
    case 'all':              return <svg {...p}><rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/></svg>;
    case 'notes':            return <svg {...p}><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/></svg>;
    case 'flashcards':       return <svg {...p}><rect x="2" y="6" width="20" height="13" rx="2"/><path d="M8 6V4a2 2 0 012-2h4a2 2 0 012 2v2"/></svg>;
    case 'formula-sheets':   return <svg {...p}><line x1="19" y1="4" x2="10" y2="4"/><line x1="14" y1="20" x2="5" y2="20"/><line x1="15" y1="4" x2="9" y2="20"/></svg>;
    case 'hardest-questions':return <svg {...p}><circle cx="12" cy="12" r="10"/><path d="M9.09 9a3 3 0 015.83 1c0 2-3 3-3 3"/><circle cx="12" cy="17" r=".5" fill="currentColor"/></svg>;
    case 'sample-answers':   return <svg {...p}><path d="M9 11l3 3L22 4"/><path d="M21 12v7a2 2 0 01-2 2H5a2 2 0 01-2-2V5a2 2 0 012-2h11"/></svg>;
    case 'revision-guides':  return <svg {...p}><path d="M4 19.5A2.5 2.5 0 016.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 014 19.5v-15A2.5 2.5 0 016.5 2z"/></svg>;
    case 'youtube':          return <svg {...p}><rect x="2" y="6" width="20" height="13" rx="2"/><polygon points="10 9 16 12.5 10 16 10 9" fill="currentColor" stroke="none"/></svg>;
    case 'worksheets':       return <svg {...p}><rect x="3" y="3" width="18" height="18" rx="2"/><line x1="7" y1="8" x2="17" y2="8"/><line x1="7" y1="12" x2="17" y2="12"/><line x1="7" y1="16" x2="13" y2="16"/></svg>;
    case 'popular':          return <svg {...p}><polyline points="23 6 13.5 15.5 8.5 10.5 1 18"/><polyline points="17 6 23 6 23 12"/></svg>;
    case 'newest':           return <svg {...p}><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>;
    default:                 return <svg {...p}><circle cx="12" cy="12" r="3"/></svg>;
  }
};

const NAV_TYPES = [
  { value: 'all',               label: 'All Resources'     },
  { value: 'notes',             label: 'Revision Notes'    },
  { value: 'flashcards',        label: 'Flashcards'        },
  { value: 'formula-sheets',    label: 'Formula Sheets'    },
  { value: 'hardest-questions', label: 'Hardest Questions' },
  { value: 'sample-answers',    label: 'Sample Answers'    },
  { value: 'revision-guides',   label: 'Revision Guides'   },
  { value: 'youtube',           label: 'YouTube Resources' },
  { value: 'worksheets',        label: 'Worksheets'        },
];

const CREATORS = ['arinjaysaha2010@gmail.com', 'aashitag811@gmail.com'];
const ITEMS_PER_PAGE = 10;

function BrowsePageInner() {
  const router       = useRouter();
  const searchParams = useSearchParams();

  const [resources,       setResources]       = useState<Resource[]>([]);
  const [loading,         setLoading]         = useState(true);
  const [user,            setUser]            = useState<any>(null);
  const [userVotes,       setUserVotes]       = useState<Set<string>>(new Set());
  const [editingResource, setEditingResource] = useState<Resource | null>(null);
  const [userProfile,     setUserProfile]     = useState<any>(null);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const [selectedSubject, setSelectedSubject] = useState<string>(searchParams.get('subject') ?? 'all');
  const [selectedType,    setSelectedType]    = useState<string>('all');
  const [sortBy,          setSortBy]          = useState<string>('popular');
  const [searchQuery,     setSearchQuery]     = useState<string>('');
  const [currentPage,     setCurrentPage]     = useState(1);
  const [totalCount,      setTotalCount]      = useState(0);
  const [glowPos,         setGlowPos]         = useState({ x: 50, y: 50 });
  const [glowVisible,     setGlowVisible]     = useState(false);

  useEffect(() => {
    const move  = (e: MouseEvent) => { setGlowPos({ x: e.clientX, y: e.clientY }); setGlowVisible(true); };
    const leave = () => setGlowVisible(false);
    window.addEventListener('mousemove', move);
    window.addEventListener('mouseleave', leave);
    return () => { window.removeEventListener('mousemove', move); window.removeEventListener('mouseleave', leave); };
  }, []);

  useEffect(() => { fetchData(); }, [selectedSubject, selectedType, sortBy, currentPage]);
  useEffect(() => { setCurrentPage(1); }, [selectedSubject, selectedType, sortBy]);

  const fetchData = async () => {
    setLoading(true);
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    setUser(user);
    if (user) {
      const { data: profile } = await supabase.from('profiles').select('full_name, email').eq('id', user.id).single();
      setUserProfile(profile);
      const { data: votes } = await supabase.from('votes').select('resource_id').eq('user_id', user.id);
      if (votes) setUserVotes(new Set(votes.map((v: any) => v.resource_id)));
    }

    // Only show resources for A-level subject codes
    const aLevelCodes = ALEVEL_SUBJECTS.map(s => s.code);

    let countQ = (supabase.from('resources') as any)
      .select('*', { count: 'exact', head: true })
      .or('status.eq.approved,status.is.null')
      .in('subject', selectedSubject !== 'all' ? [selectedSubject] : aLevelCodes);
    if (selectedType !== 'all') countQ = countQ.eq('resource_type', selectedType);
    const { count } = await countQ;
    setTotalCount(count || 0);

    let q = (supabase.from('resources') as any)
      .select('*, profiles (username, full_name, email)')
      .or('status.eq.approved,status.is.null')
      .in('subject', selectedSubject !== 'all' ? [selectedSubject] : aLevelCodes);
    if (selectedType !== 'all') q = q.eq('resource_type', selectedType);
    if (sortBy === 'newest') q = q.order('created_at', { ascending: false });
    else q = q.order('upvote_count', { ascending: false });
    const from = (currentPage - 1) * ITEMS_PER_PAGE;
    q = q.range(from, from + ITEMS_PER_PAGE - 1);
    const { data, error } = await q;
    if (!error) setResources(data || []);
    setLoading(false);
  };

  const handleUpvote = async (resourceId: string) => {
    if (!user) { router.push('/igcse/login'); return; }
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

  const handleDelete = async (resourceId: string) => {
    const supabase = createClient();
    const { error } = await supabase.from('resources').delete().eq('id', resourceId);
    if (!error) setResources(prev => prev.filter(r => r.id !== resourceId));
    setDeleteConfirmId(null);
  };

  const isSelfCreator = CREATORS.includes(userProfile?.email);
  const canEdit   = (r: Resource) => user && (r.uploader_id === user.id || isSelfCreator);
  const canDelete = (r: Resource) => user && (r.uploader_id === user.id || isSelfCreator);

  const filtered = resources.filter(r => {
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    return r.title.toLowerCase().includes(q) || r.description?.toLowerCase().includes(q);
  });

  const activeSubject = ALEVEL_SUBJECTS.find(s => s.code === selectedSubject);
  const subjectName   = (code: string) => ALEVEL_SUBJECTS.find(s => s.code === code)?.name ?? code;
  const typeLabel     = (val: string)  => RESOURCE_TYPES.find(t => t.value === val)?.label ?? val;
  const totalPages    = Math.ceil(totalCount / ITEMS_PER_PAGE);

  return (
    <div style={{ minHeight: '100vh', background: '#0c1018', position: 'relative', overflowX: 'hidden' }}>

      {/* Dust */}
      <div className="pointer-events-none" style={{ position: 'fixed', inset: 0, zIndex: 0 }}>
        {DUST.map(p => (
          <div key={p.id} style={{ position:'absolute', width:`${p.size}px`, height:`${p.size}px`, borderRadius:'50%', left:`${p.left}%`, top:`${p.top}%`, background:'radial-gradient(circle, rgba(255,218,80,1) 0%, rgba(212,175,55,0.65) 50%, transparent 100%)', boxShadow:'0 0 8px rgba(255,210,60,0.95), 0 0 18px rgba(200,160,40,0.55)', animation:`dust${p.anim} ${p.dur}s ease-in-out infinite`, animationDelay:`${p.delay}s`, opacity:0 }} />
        ))}
      </div>
      {/* Cursor glow */}
      <div className="pointer-events-none" style={{ position:'fixed', inset:0, zIndex:1, opacity:glowVisible?1:0, transition:'opacity 0.4s ease', background:`radial-gradient(circle 360px at ${glowPos.x}px ${glowPos.y}px, rgba(200,168,76,0.07) 0%, rgba(180,140,30,0.03) 50%, transparent 100%)` }} />

      <Header />

      <div style={{ position:'relative', zIndex:2, maxWidth:1200, margin:'0 auto', padding:'80px 24px 60px', display:'flex', gap:'2rem', alignItems:'flex-start' }}>

        {/* ── Sidebar ── */}
        <aside style={{ width:220, flexShrink:0, position:'sticky', top:'88px' }}>

          {/* Subjects */}
          <div style={{ marginBottom:'2rem' }}>
            <p style={{ fontFamily:SANS, fontSize:'0.625rem', fontWeight:700, letterSpacing:'0.22em', textTransform:'uppercase', color:'rgba(196,176,138,0.35)', marginBottom:'10px' }}>Subject</p>
            {[{ code:'all', name:'All Subjects', icon:'' }, ...ALEVEL_SUBJECTS].map(s => {
              const active = selectedSubject === s.code;
              return (
                <button key={s.code} onClick={() => setSelectedSubject(s.code)} style={{ width:'100%', textAlign:'left', padding:'8px 10px', borderRadius:'8px', background:active?'rgba(200,168,76,0.10)':'transparent', border:active?'1px solid rgba(200,168,76,0.25)':'1px solid transparent', fontFamily:SANS, fontSize:'13px', color:active?'#E8DCC4':'rgba(196,176,138,0.55)', cursor:'pointer', transition:'all 0.15s', marginBottom:'2px', display:'flex', alignItems:'center', gap:'6px' }}>
                  <span>{s.icon}</span><span style={{ overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{s.name}</span>
                </button>
              );
            })}
          </div>

          {/* Resource types */}
          <div>
            <p style={{ fontFamily:SANS, fontSize:'0.625rem', fontWeight:700, letterSpacing:'0.22em', textTransform:'uppercase', color:'rgba(196,176,138,0.35)', marginBottom:'10px' }}>Type</p>
            {NAV_TYPES.map(t => {
              const active = selectedType === t.value;
              return (
                <button key={t.value} onClick={() => setSelectedType(t.value)} style={{ width:'100%', textAlign:'left', padding:'8px 10px', borderRadius:'8px', background:active?'rgba(200,168,76,0.10)':'transparent', border:active?'1px solid rgba(200,168,76,0.25)':'1px solid transparent', fontFamily:SANS, fontSize:'13px', color:active?'#E8DCC4':'rgba(196,176,138,0.55)', cursor:'pointer', transition:'all 0.15s', marginBottom:'2px', display:'flex', alignItems:'center', gap:'8px' }}>
                  <SidebarIcon type={t.value} /><span>{t.label}</span>
                </button>
              );
            })}
          </div>
        </aside>

        {/* ── Main content ── */}
        <main style={{ flex:1, minWidth:0 }}>

          {/* Header row */}
          <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:'1.5rem', flexWrap:'wrap', gap:'1rem' }}>
            <div>
              <h1 style={{ fontFamily:SERIF, fontSize:'clamp(1.5rem,3vw,2.2rem)', fontWeight:400, color:'#E8DCC4', marginBottom:'4px' }}>
                {activeSubject ? `${activeSubject.name} Resources` : 'A-Level Resources'}
              </h1>
              <p style={{ fontFamily:SANS, fontSize:'13px', color:'rgba(196,176,138,0.45)' }}>
                {totalCount} resource{totalCount !== 1 ? 's' : ''} found
              </p>
            </div>
            <div style={{ display:'flex', gap:'10px', alignItems:'center', flexWrap:'wrap' }}>
              {/* Search */}
              <input
                value={searchQuery} onChange={e => setSearchQuery(e.target.value)}
                placeholder="Search resources…"
                style={{ background:'rgba(255,255,255,0.04)', border:'1px solid rgba(200,168,76,0.10)', borderRadius:'8px', padding:'8px 12px', fontFamily:SANS, fontSize:'13px', color:'#E8DCC4', outline:'none', width:200 }}
              />
              {/* Sort */}
              <div style={{ display:'flex', gap:'4px' }}>
                {(['popular','newest'] as const).map(s => (
                  <button key={s} onClick={() => setSortBy(s)} style={{ display:'flex', alignItems:'center', gap:'5px', padding:'7px 12px', borderRadius:'7px', background:sortBy===s?'rgba(200,168,76,0.12)':'transparent', border:sortBy===s?'1px solid rgba(200,168,76,0.25)':'1px solid rgba(200,168,76,0.08)', fontFamily:SANS, fontSize:'12px', color:sortBy===s?'#E8DCC4':'rgba(196,176,138,0.5)', cursor:'pointer', transition:'all 0.15s' }}>
                    <SidebarIcon type={s} size={12} />{s.charAt(0).toUpperCase()+s.slice(1)}
                  </button>
                ))}
              </div>
              {/* Upload */}
              <button onClick={() => router.push(`/alevels/upload${selectedSubject !== 'all' ? `?subject=${selectedSubject}` : ''}`)}
                style={{ padding:'8px 16px', background:'linear-gradient(180deg,rgba(201,168,76,0.22) 0%,rgba(201,168,76,0.12) 100%)', border:'1px solid rgba(200,168,76,0.3)', borderRadius:'8px', fontFamily:SERIF, fontSize:'14px', color:'#D4B96A', cursor:'pointer', whiteSpace:'nowrap' }}>
                + Upload
              </button>
            </div>
          </div>

          {/* Resource cards */}
          {loading ? (
            <div style={{ padding:'4rem', textAlign:'center' }}>
              <div style={{ width:32, height:32, border:'2px solid rgba(200,168,76,0.15)', borderTop:'2px solid #C9A84C', borderRadius:'50%', animation:'spin 0.8s linear infinite', margin:'0 auto 1rem' }} />
              <p style={{ fontFamily:SANS, fontSize:'13px', color:'rgba(196,176,138,0.4)' }}>Loading resources…</p>
            </div>
          ) : filtered.length === 0 ? (
            <div style={{ padding:'4rem', textAlign:'center', background:'rgba(255,255,255,0.015)', border:'1px solid rgba(200,168,76,0.08)', borderRadius:'1rem' }}>
              <p style={{ fontFamily:SERIF, fontSize:'1.25rem', color:'#E8DCC4', marginBottom:'0.5rem' }}>No resources found</p>
              <p style={{ fontFamily:SANS, fontSize:'13px', color:'rgba(196,176,138,0.45)' }}>Be the first to upload one!</p>
              <button onClick={() => router.push('/alevels/upload')} style={{ marginTop:'1rem', padding:'8px 20px', background:'rgba(200,168,76,0.12)', border:'1px solid rgba(200,168,76,0.25)', borderRadius:'8px', fontFamily:SERIF, fontSize:'14px', color:'#D4B96A', cursor:'pointer' }}>
                Upload Resource
              </button>
            </div>
          ) : (
            <div style={{ display:'grid', gap:'10px' }}>
              {filtered.map(r => (
                <div key={r.id} style={{ background:'rgba(255,255,255,0.022)', border:'1px solid rgba(200,168,76,0.08)', borderRadius:'10px', padding:'1.125rem 1.25rem', transition:'border-color 0.15s' }}
                  onMouseEnter={e => (e.currentTarget.style.borderColor='rgba(200,168,76,0.18)')}
                  onMouseLeave={e => (e.currentTarget.style.borderColor='rgba(200,168,76,0.08)')}>
                  <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', gap:'1rem' }}>
                    <div style={{ flex:1, minWidth:0 }}>
                      <div style={{ display:'flex', gap:'6px', marginBottom:'6px', flexWrap:'wrap', alignItems:'center' }}>
                        <span style={{ padding:'2px 8px', background:'rgba(200,168,76,0.10)', color:'#C9A84C', border:'1px solid rgba(200,168,76,0.2)', borderRadius:'4px', fontSize:'11px', fontFamily:SANS, fontWeight:600 }}>
                          {subjectName(r.subject)}
                        </span>
                        <span style={{ padding:'2px 8px', background:'rgba(255,255,255,0.04)', color:'rgba(196,176,138,0.55)', border:'1px solid rgba(200,168,76,0.08)', borderRadius:'4px', fontSize:'11px', fontFamily:SANS }}>
                          {typeLabel(r.resource_type)}
                        </span>
                        {CREATORS.includes(r.profiles?.email) && <CreatorBadge />}
                      </div>
                      <a href={r.link} target="_blank" rel="noopener noreferrer" style={{ fontFamily:SERIF, fontSize:'1.0625rem', fontWeight:600, color:'#E8DCC4', textDecoration:'none', display:'block', marginBottom:'4px' }}
                        onMouseEnter={e => (e.currentTarget.style.color='#C9A84C')}
                        onMouseLeave={e => (e.currentTarget.style.color='#E8DCC4')}>
                        {r.title}
                      </a>
                      {r.description && <p style={{ fontFamily:SANS, fontSize:'13px', color:'rgba(196,176,138,0.5)', marginBottom:'6px', lineHeight:1.5 }}>{r.description}</p>}
                      <p style={{ fontFamily:SANS, fontSize:'12px', color:'rgba(196,176,138,0.3)' }}>
                        by {r.profiles?.username ?? r.profiles?.email ?? 'Unknown'} · {new Date(r.created_at).toLocaleDateString(undefined,{day:'numeric',month:'short',year:'numeric'})}
                      </p>
                    </div>
                    <div style={{ display:'flex', flexDirection:'column', alignItems:'flex-end', gap:'8px', flexShrink:0 }}>
                      <div style={{ display:'flex', alignItems:'center', gap:'4px' }}>
                        <HeartIcon
                          filled={userVotes.has(r.id)}
                          onClick={user ? () => handleUpvote(r.id) : undefined}
                        />
                        <span style={{ fontFamily:SANS, fontSize:'12px', color:'rgba(196,176,138,0.45)' }}>{r.upvote_count}</span>
                      </div>
                      {canEdit(r) && (
                        <div style={{ display:'flex', gap:'4px' }}>
                          <button onClick={() => setEditingResource(r)} style={{ padding:'4px 10px', background:'rgba(200,168,76,0.08)', border:'1px solid rgba(200,168,76,0.15)', borderRadius:'5px', fontFamily:SANS, fontSize:'11px', color:'rgba(196,176,138,0.6)', cursor:'pointer' }}>Edit</button>
                          {deleteConfirmId === r.id ? (
                            <>
                              <button onClick={() => handleDelete(r.id)} style={{ padding:'4px 10px', background:'rgba(160,40,40,0.2)', border:'1px solid rgba(180,40,40,0.3)', borderRadius:'5px', fontFamily:SANS, fontSize:'11px', color:'#F09090', cursor:'pointer' }}>Confirm</button>
                              <button onClick={() => setDeleteConfirmId(null)} style={{ padding:'4px 10px', background:'transparent', border:'1px solid rgba(200,168,76,0.1)', borderRadius:'5px', fontFamily:SANS, fontSize:'11px', color:'rgba(196,176,138,0.4)', cursor:'pointer' }}>Cancel</button>
                            </>
                          ) : (
                            <button onClick={() => setDeleteConfirmId(r.id)} style={{ padding:'4px 10px', background:'transparent', border:'1px solid rgba(180,40,40,0.15)', borderRadius:'5px', fontFamily:SANS, fontSize:'11px', color:'rgba(200,80,80,0.5)', cursor:'pointer' }}>Delete</button>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Pagination */}
          {totalPages > 1 && (
            <div style={{ display:'flex', justifyContent:'center', alignItems:'center', gap:'8px', marginTop:'2rem' }}>
              <button disabled={currentPage===1} onClick={() => { setCurrentPage(p=>Math.max(1,p-1)); window.scrollTo({top:0,behavior:'smooth'}); }}
                style={{ padding:'7px 14px', background:'rgba(200,168,76,0.08)', border:'1px solid rgba(200,168,76,0.15)', borderRadius:'7px', fontFamily:SANS, fontSize:'13px', color:currentPage===1?'rgba(196,176,138,0.25)':'#D4B96A', cursor:currentPage===1?'not-allowed':'pointer' }}>
                ← Prev
              </button>
              <span style={{ fontFamily:SANS, fontSize:'13px', color:'rgba(196,176,138,0.45)' }}>
                {currentPage} / {totalPages}
              </span>
              <button disabled={currentPage===totalPages} onClick={() => { setCurrentPage(p=>Math.min(totalPages,p+1)); window.scrollTo({top:0,behavior:'smooth'}); }}
                style={{ padding:'7px 14px', background:'rgba(200,168,76,0.08)', border:'1px solid rgba(200,168,76,0.15)', borderRadius:'7px', fontFamily:SANS, fontSize:'13px', color:currentPage===totalPages?'rgba(196,176,138,0.25)':'#D4B96A', cursor:currentPage===totalPages?'not-allowed':'pointer' }}>
                Next →
              </button>
            </div>
          )}
        </main>
      </div>

      {editingResource && (
        <EditResourceModal resource={editingResource} onClose={() => setEditingResource(null)} onSave={async () => { setEditingResource(null); window.location.reload(); }} />
      )}

      <style jsx global>{`
        @keyframes dust0 { 0%{transform:translate(0,0);opacity:0} 15%{opacity:.7} 50%{transform:translate(16px,-52px);opacity:.85} 85%{opacity:.5} 100%{transform:translate(0,0);opacity:0} }
        @keyframes dust1 { 0%{transform:translate(0,0);opacity:0} 15%{opacity:.6} 50%{transform:translate(-18px,-44px);opacity:.75} 85%{opacity:.45} 100%{transform:translate(0,0);opacity:0} }
        @keyframes dust2 { 0%{transform:translate(0,0);opacity:0} 20%{opacity:.65} 50%{transform:translate(10px,-60px);opacity:.8} 80%{opacity:.4} 100%{transform:translate(0,0);opacity:0} }
        @keyframes spin { to { transform: rotate(360deg); } }
      `}</style>
    </div>
  );
}

export default function ALevelsBrowsePage() {
  return (
    <Suspense fallback={<div style={{ minHeight:'100vh', background:'#0c1018', display:'flex', alignItems:'center', justifyContent:'center' }}><div style={{ fontFamily:"'Cormorant Garamond',serif", color:'rgba(196,176,138,0.45)', fontSize:'1.25rem' }}>Loading…</div></div>}>
      <BrowsePageInner />
    </Suspense>
  );
}

// Made with Bob
