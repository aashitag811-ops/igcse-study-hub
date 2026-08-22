'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { createClient } from '@/lib/supabase/client';

interface Notification {
  id: string;
  title: string;
  body: string;
  type: 'update' | 'bugfix' | 'announcement';
  created_at: string;
}

const ADMINS = ['arinjaysaha2010@gmail.com', 'aashitag811@gmail.com'];
const SERIF = "'Cormorant Garamond', Georgia, serif";
const SANS  = "'DM Sans', system-ui, sans-serif";

const TYPE_META = {
  update:       { label: 'Update',       color: '#4a9eff', bg: 'rgba(74,158,255,0.12)'  },
  bugfix:       { label: 'Bug Fix',      color: '#6be67a', bg: 'rgba(107,230,122,0.12)' },
  announcement: { label: 'Announcement', color: '#C9A84C', bg: 'rgba(201,168,76,0.12)'  },
};

function BellIcon({ unread }: { unread: number }) {
  return (
    <div style={{ position: 'relative', display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}>
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
        <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
        <path d="M13.73 21a2 2 0 0 1-3.46 0" />
      </svg>
      {unread > 0 && (
        <span style={{
          position: 'absolute', top: '-5px', right: '-5px',
          minWidth: '16px', height: '16px', borderRadius: '8px',
          background: '#e05555', color: '#fff',
          fontSize: '10px', fontWeight: 700, fontFamily: SANS,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          padding: '0 3px', lineHeight: 1,
        }}>
          {unread > 9 ? '9+' : unread}
        </span>
      )}
    </div>
  );
}

export default function NotificationBell() {
  const [open, setOpen]               = useState(false);
  const [notifications, setNotifs]    = useState<Notification[]>([]);
  const [readIds, setReadIds]         = useState<Set<string>>(new Set());
  const [userEmail, setUserEmail]     = useState<string | null>(null);
  const [userId, setUserId]           = useState<string | null>(null);

  // Admin compose state
  const [composing, setComposing]     = useState(false);
  const [title, setTitle]             = useState('');
  const [body, setBody]               = useState('');
  const [type, setType]               = useState<'update'|'bugfix'|'announcement'>('update');
  const [posting, setPosting]         = useState(false);

  const ref = useRef<HTMLDivElement>(null);

  // Close on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const load = useCallback(async () => {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      setUserId(user.id);
      // get email from profile or auth
      const { data: profile } = await supabase.from('profiles').select('email').eq('id', user.id).single();
      setUserEmail((profile as any)?.email ?? user.email ?? null);
    }
    const res  = await fetch('/api/notifications');
    const data = await res.json();
    setNotifs(data.notifications ?? []);
    setReadIds(new Set(data.readIds ?? []));
  }, []);

  useEffect(() => { load(); }, [load]);

  const unread = notifications.filter(n => !readIds.has(n.id)).length;

  const markRead = async (id: string) => {
    if (readIds.has(id) || !userId) return;
    const supabase = createClient();
    await (supabase as any).from('notification_reads').insert({ user_id: userId, notification_id: id });
    setReadIds(prev => new Set(prev).add(id));
  };

  const markAllRead = async () => {
    if (!userId) return;
    const supabase = createClient();
    const unreadNotifs = notifications.filter(n => !readIds.has(n.id));
    if (!unreadNotifs.length) return;
    await (supabase as any).from('notification_reads').insert(
      unreadNotifs.map(n => ({ user_id: userId, notification_id: n.id }))
    );
    setReadIds(new Set(notifications.map(n => n.id)));
  };

  const handleOpen = () => {
    setOpen(o => !o);
    // mark all read when opening
    if (!open) setTimeout(markAllRead, 600);
  };

  const postNotification = async () => {
    if (!title.trim() || !body.trim()) return;
    setPosting(true);
    const res = await fetch('/api/notifications', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title, body, type }),
    });
    if (res.ok) {
      setTitle(''); setBody(''); setComposing(false);
      await load();
    }
    setPosting(false);
  };

  const deleteNotif = async (id: string) => {
    await fetch(`/api/notifications?id=${id}`, { method: 'DELETE' });
    setNotifs(prev => prev.filter(n => n.id !== id));
  };

  const isAdmin = userEmail && ADMINS.includes(userEmail);

  return (
    <div ref={ref} style={{ position: 'relative', display: 'inline-flex' }}>

      {/* Bell button */}
      <button
        onClick={handleOpen}
        style={{
          background: open ? 'rgba(200,168,76,0.12)' : 'transparent',
          border: '1px solid ' + (open ? 'rgba(200,168,76,0.25)' : 'transparent'),
          borderRadius: '8px', padding: '6px 10px', cursor: 'pointer',
          color: unread > 0 ? '#C9A84C' : 'rgba(196,176,138,0.6)',
          transition: 'all 0.15s', display: 'flex', alignItems: 'center',
        }}
        title="Notifications"
      >
        <BellIcon unread={unread} />
      </button>

      {/* Dropdown */}
      {open && (
        <div style={{
          position: 'absolute', top: 'calc(100% + 10px)', right: 0,
          width: 340, maxHeight: 480,
          background: 'rgba(10,13,20,0.97)',
          border: '1px solid rgba(200,168,76,0.18)',
          borderRadius: '12px',
          boxShadow: '0 8px 40px rgba(0,0,0,0.6)',
          zIndex: 1000, overflow: 'hidden',
          display: 'flex', flexDirection: 'column',
        }}>

          {/* Header */}
          <div style={{ padding: '14px 16px 10px', borderBottom: '1px solid rgba(200,168,76,0.10)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span style={{ fontFamily: SERIF, fontSize: '15px', fontWeight: 600, color: '#E8DCC4' }}>Notifications</span>
            <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
              {isAdmin && (
                <button onClick={() => setComposing(c => !c)} style={{ padding: '3px 10px', background: 'rgba(200,168,76,0.12)', border: '1px solid rgba(200,168,76,0.22)', borderRadius: '6px', fontFamily: SANS, fontSize: '11px', color: '#C9A84C', cursor: 'pointer' }}>
                  {composing ? 'Cancel' : '+ Post'}
                </button>
              )}
              {unread > 0 && (
                <button onClick={markAllRead} style={{ padding: '3px 10px', background: 'transparent', border: '1px solid rgba(200,168,76,0.12)', borderRadius: '6px', fontFamily: SANS, fontSize: '11px', color: 'rgba(196,176,138,0.5)', cursor: 'pointer' }}>
                  Mark all read
                </button>
              )}
            </div>
          </div>

          {/* Admin compose form */}
          {composing && isAdmin && (
            <div style={{ padding: '12px 16px', borderBottom: '1px solid rgba(200,168,76,0.10)', background: 'rgba(200,168,76,0.04)' }}>
              <input
                value={title} onChange={e => setTitle(e.target.value)}
                placeholder="Title…"
                style={{ width: '100%', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(200,168,76,0.15)', borderRadius: '6px', padding: '6px 10px', color: '#E8DCC4', fontFamily: SANS, fontSize: '13px', outline: 'none', marginBottom: '6px', boxSizing: 'border-box' }}
              />
              <textarea
                value={body} onChange={e => setBody(e.target.value)}
                placeholder="Message…"
                rows={2}
                style={{ width: '100%', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(200,168,76,0.15)', borderRadius: '6px', padding: '6px 10px', color: '#E8DCC4', fontFamily: SANS, fontSize: '13px', outline: 'none', resize: 'vertical', marginBottom: '6px', boxSizing: 'border-box' }}
              />
              <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
                <select value={type} onChange={e => setType(e.target.value as any)} style={{ flex: 1, background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(200,168,76,0.15)', borderRadius: '6px', padding: '5px 8px', color: '#E8DCC4', fontFamily: SANS, fontSize: '12px', outline: 'none' }}>
                  <option value="update">Update</option>
                  <option value="bugfix">Bug Fix</option>
                  <option value="announcement">Announcement</option>
                </select>
                <button onClick={postNotification} disabled={posting || !title.trim() || !body.trim()} style={{ padding: '5px 14px', background: 'rgba(200,168,76,0.18)', border: '1px solid rgba(200,168,76,0.3)', borderRadius: '6px', fontFamily: SANS, fontSize: '12px', color: '#C9A84C', cursor: 'pointer', opacity: posting ? 0.5 : 1 }}>
                  {posting ? 'Posting…' : 'Post'}
                </button>
              </div>
            </div>
          )}

          {/* List */}
          <div style={{ overflowY: 'auto', flex: 1 }}>
            {notifications.length === 0 ? (
              <div style={{ padding: '32px 16px', textAlign: 'center' }}>
                <p style={{ fontFamily: SERIF, fontSize: '14px', color: 'rgba(196,176,138,0.4)', fontStyle: 'italic' }}>No notifications yet</p>
              </div>
            ) : notifications.map(n => {
              const meta = TYPE_META[n.type] ?? TYPE_META.update;
              const isRead = readIds.has(n.id);
              return (
                <div
                  key={n.id}
                  onClick={() => markRead(n.id)}
                  style={{
                    padding: '12px 16px', borderBottom: '1px solid rgba(200,168,76,0.06)',
                    background: isRead ? 'transparent' : 'rgba(200,168,76,0.035)',
                    cursor: 'default', position: 'relative',
                    transition: 'background 0.2s',
                  }}
                >
                  {/* Unread dot */}
                  {!isRead && (
                    <div style={{ position: 'absolute', left: 6, top: '50%', transform: 'translateY(-50%)', width: 5, height: 5, borderRadius: '50%', background: '#C9A84C' }} />
                  )}
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '4px' }}>
                    <span style={{ padding: '1px 7px', background: meta.bg, color: meta.color, border: `1px solid ${meta.color}33`, borderRadius: '4px', fontSize: '10px', fontFamily: SANS, fontWeight: 700, letterSpacing: '0.05em' }}>
                      {meta.label}
                    </span>
                    <span style={{ fontFamily: SANS, fontSize: '11px', color: 'rgba(196,176,138,0.35)' }}>
                      {new Date(n.created_at).toLocaleDateString(undefined, { day: 'numeric', month: 'short' })}
                    </span>
                    {isAdmin && (
                      <button onClick={e => { e.stopPropagation(); deleteNotif(n.id); }} style={{ marginLeft: 'auto', background: 'transparent', border: 'none', color: 'rgba(200,80,80,0.4)', cursor: 'pointer', fontSize: '13px', lineHeight: 1, padding: '0 2px' }} title="Delete">×</button>
                    )}
                  </div>
                  <p style={{ fontFamily: SERIF, fontSize: '13.5px', fontWeight: 600, color: isRead ? 'rgba(232,220,196,0.7)' : '#E8DCC4', margin: '0 0 2px' }}>{n.title}</p>
                  <p style={{ fontFamily: SANS, fontSize: '12px', color: 'rgba(196,176,138,0.55)', margin: 0, lineHeight: 1.5 }}>{n.body}</p>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

// Made with Bob
