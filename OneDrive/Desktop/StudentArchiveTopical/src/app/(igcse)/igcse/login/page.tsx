'use client';

import { useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useRouter } from 'next/navigation';

const SERIF = "'Cormorant Garamond', 'Cormorant', Georgia, serif";
const SANS = "'DM Sans', 'Inter', system-ui, -apple-system, sans-serif";

// Deterministic floating open-book data — larger, more visible
const OPEN_BOOKS = [
  { id: 0, x: 62, y: 10,  rotate: -6,  scale: 1.4, dur: 18, delay: 0,  blur: 3.5 },
  { id: 1, x: 80, y: 40,  rotate:  8,  scale: 1.8, dur: 22, delay: 3,  blur: 4   },
  { id: 2, x: 50, y: 65,  rotate: -12, scale: 1.2, dur: 16, delay: 6,  blur: 3   },
  { id: 3, x: 88, y: 72,  rotate:  15, scale: 1.5, dur: 20, delay: 1,  blur: 5   },
];

// Deterministic letter particles
const LETTERS = Array.from({ length: 36 }, (_, i) => ({
  id: i,
  char: 'abcdefghijklmnopqrstuvwxyzABCDEF'[i % 32],
  x: 48 + (i * 13.7 % 48),
  y: (i * 17.3 + 5) % 90,
  size: 10 + (i * 5.3 % 14),
  dur: 10 + (i * 3.1 % 14),
  delay: (i * 2.7) % 10,
  drift: (i % 2 === 0 ? 1 : -1) * (8 + i * 1.3 % 18),
  opacity: 0.12 + (i * 0.03 % 0.22),
}));

// Deterministic gold dust
const DUST_PTS = Array.from({ length: 28 }, (_, i) => ({
  id: i,
  x: 50 + (i * 11.9 % 46),
  y: (i * 19.1 + 8) % 92,
  size: 1.5 + (i * 0.8 % 2.5),
  dur: 12 + (i * 2.9 % 14),
  delay: (i * 1.8) % 9,
}));

function OpenBookSVG({ scale, opacity }: { scale: number; opacity: number }) {
  const w = Math.round(140 * scale);
  const h = Math.round(90 * scale);
  return (
    <svg width={w} height={h} viewBox="0 0 140 90" fill="none" xmlns="http://www.w3.org/2000/svg" style={{ opacity }}>
      {/* Left page */}
      <path d="M70 78 C60 76, 20 74, 8 68 L8 14 C20 20, 60 22, 70 24 Z" fill="rgba(200,168,76,0.18)" stroke="rgba(200,168,76,0.5)" strokeWidth="1"/>
      {/* Right page */}
      <path d="M70 78 C80 76, 120 74, 132 68 L132 14 C120 20, 80 22, 70 24 Z" fill="rgba(200,168,76,0.15)" stroke="rgba(200,168,76,0.45)" strokeWidth="1"/>
      {/* Spine */}
      <line x1="70" y1="24" x2="70" y2="78" stroke="rgba(200,168,76,0.8)" strokeWidth="1.5"/>
      {/* Cover base */}
      <path d="M8 68 C20 74, 60 76, 70 78 C80 76, 120 74, 132 68 L132 72 C120 78, 80 80, 70 82 C60 80, 20 78, 8 72 Z" fill="rgba(140,100,20,0.35)"/>
      {/* Left page lines */}
      <line x1="22" y1="32" x2="60" y2="30" stroke="rgba(255,220,100,0.28)" strokeWidth="0.9"/>
      <line x1="22" y1="40" x2="60" y2="38" stroke="rgba(255,220,100,0.22)" strokeWidth="0.9"/>
      <line x1="22" y1="48" x2="60" y2="46" stroke="rgba(255,220,100,0.18)" strokeWidth="0.9"/>
      <line x1="22" y1="56" x2="55" y2="54" stroke="rgba(255,220,100,0.15)" strokeWidth="0.9"/>
      {/* Right page lines */}
      <line x1="80" y1="30" x2="118" y2="32" stroke="rgba(255,220,100,0.28)" strokeWidth="0.9"/>
      <line x1="80" y1="38" x2="118" y2="40" stroke="rgba(255,220,100,0.22)" strokeWidth="0.9"/>
      <line x1="80" y1="46" x2="118" y2="48" stroke="rgba(255,220,100,0.18)" strokeWidth="0.9"/>
      <line x1="80" y1="54" x2="113" y2="56" stroke="rgba(255,220,100,0.15)" strokeWidth="0.9"/>
      {/* Glow at spine/top */}
      <ellipse cx="70" cy="18" rx="22" ry="8" fill="rgba(200,168,76,0.12)"/>
    </svg>
  );
}

function LoginPageContent() {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [showForgotPassword, setShowForgotPassword] = useState(false);
  const [showForgotUsername, setShowForgotUsername] = useState(false);
  const router = useRouter();

  const handleEmailAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true); setError(''); setMessage('');
    const supabase = createClient();
    try {
      if (isLogin) {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        setMessage('Login successful! Redirecting...');
        setTimeout(() => router.push('/'), 1500);
      } else {
        const { error } = await supabase.auth.signUp({ email, password, options: { data: { full_name: fullName } } });
        if (error) throw error;
        setMessage('Account created! Please check your email to verify your account.');
      }
    } catch (err: any) {
      setError(err.message || 'An error occurred');
    } finally { setLoading(false); }
  };

  const handleGoogleAuth = async () => {
    setLoading(true); setError('');
    const supabase = createClient();
    try {
      const { error } = await supabase.auth.signInWithOAuth({ provider: 'google', options: { redirectTo: `${window.location.origin}/auth/callback` } });
      if (error) throw error;
    } catch (err: any) { setError(err.message || 'An error occurred'); setLoading(false); }
  };

  const handleForgotPassword = async () => {
    if (!email) { setError('Please enter your email address'); return; }
    setLoading(true); setError(''); setMessage('');
    const supabase = createClient();
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, { redirectTo: `${window.location.origin}/auth/callback` });
      if (error) throw error;
      setMessage('Password reset email sent! Check your inbox and spam folder.');
      setShowForgotPassword(false);
    } catch (err: any) { setError(err.message || 'Failed to send reset email'); }
    finally { setLoading(false); }
  };

  const handleForgotUsername = async () => {
    if (!email) { setError('Please enter your email address'); return; }
    setLoading(true); setError(''); setMessage('');
    const supabase = createClient();
    try {
      const { data: profiles, error } = await supabase.from('profiles').select('username, full_name').eq('email', email).single();
      if (error || !profiles) throw new Error('No account found with this email address');
      const p = profiles as any;
      setMessage(`Your username is: ${p.username || p.full_name || 'Not set'}. You can use your email to sign in.`);
      setShowForgotUsername(false);
    } catch (err: any) { setError(err.message || 'Failed to retrieve username'); }
    finally { setLoading(false); }
  };

  const inputStyle: React.CSSProperties = {
    width: '100%',
    background: 'rgba(6,10,18,0.7)',
    border: '1px solid rgba(180,150,40,0.18)',
    borderTop: '1px solid rgba(200,168,76,0.28)',
    borderRadius: '10px',
    padding: '12px 16px',
    fontFamily: SANS,
    fontSize: '14px',
    color: '#e8dcc4',
    outline: 'none',
    transition: 'border-color 0.2s ease',
  };

  const labelStyle: React.CSSProperties = {
    display: 'block',
    fontFamily: SERIF,
    fontSize: '12px',
    letterSpacing: '0.22em',
    textTransform: 'uppercase',
    color: '#4a7ab5',
    marginBottom: '6px',
    textShadow: '0 0 12px rgba(60,100,200,0.25)',
  };

  return (
    <div style={{ minHeight: '100vh', width: '100vw', display: 'flex', background: '#07090e' }}>

      {/* LEFT PANEL */}
      <div style={{
        width: '100%',
        maxWidth: '480px',
        flexShrink: 0,
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center',
        padding: '48px 56px',
        background: 'linear-gradient(180deg, #0a0c14 0%, #07090e 100%)',
        borderRight: '1px solid rgba(200,168,76,0.10)',
        position: 'relative',
        zIndex: 2,
      }}>
        {/* Back link */}
        <a href="/" style={{ position: 'absolute', top: '24px', left: '24px', display: 'flex', alignItems: 'center', gap: '6px', fontFamily: SERIF, fontSize: '14px', color: 'rgba(180,150,60,0.6)', textDecoration: 'none', letterSpacing: '0.04em' }}>
          <svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18"/></svg>
          Back to Archive
        </a>

        <div style={{ maxWidth: '380px', width: '100%', margin: '0 auto' }}>
          {/* Title */}
          <div style={{ marginBottom: '32px' }}>
            <h2 style={{
              fontFamily: "'Times New Roman', Times, serif",
              fontSize: '34px',
              fontWeight: 400,
              color: '#BFA96A',
              letterSpacing: '0.06em',
              marginBottom: '6px',
              textShadow: '0 0 18px rgba(180,148,60,0.22), 0 0 40px rgba(180,148,60,0.10)',
            }}>
              Student Archive
            </h2>
            <p style={{ fontFamily: SERIF, fontStyle: 'italic', fontSize: '15px', color: 'rgba(160,140,100,0.6)', letterSpacing: '0.03em' }}>
              {isLogin ? 'Welcome back. Enter your credentials to continue.' : 'Create your archive account to begin.'}
            </p>
          </div>

          {/* Messages */}
          {error && (
            <div style={{ marginBottom: '16px', padding: '10px 14px', background: 'rgba(180,40,40,0.12)', border: '1px solid rgba(180,60,60,0.25)', borderRadius: '8px', fontFamily: SANS, fontSize: '13px', color: '#c07070' }}>
              {error}
            </div>
          )}
          {message && (
            <div style={{ marginBottom: '16px', padding: '10px 14px', background: 'rgba(40,160,80,0.10)', border: '1px solid rgba(60,160,80,0.22)', borderRadius: '8px', fontFamily: SANS, fontSize: '13px', color: '#70c090' }}>
              {message}
            </div>
          )}

          {/* Google */}
          <button
            onClick={handleGoogleAuth}
            disabled={loading}
            style={{
              width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px',
              padding: '12px 20px', borderRadius: '10px', cursor: loading ? 'not-allowed' : 'pointer',
              fontFamily: SANS, fontSize: '14px', fontWeight: 500, color: '#c8b87a',
              background: 'rgba(14,18,28,0.8)',
              border: '1px solid rgba(180,150,40,0.20)',
              borderTop: '1px solid rgba(200,168,76,0.32)',
              boxShadow: '0 3px 0 rgba(0,0,0,0.4), inset 0 1px 0 rgba(200,168,76,0.08)',
              opacity: loading ? 0.5 : 1,
              transition: 'all 0.08s ease',
            }}
          >
            <svg width="18" height="18" viewBox="0 0 18 18">
              <path fill="#4285F4" d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844c-.209 1.125-.843 2.078-1.796 2.717v2.258h2.908c1.702-1.567 2.684-3.874 2.684-6.615z"/>
              <path fill="#34A853" d="M9 18c2.43 0 4.467-.806 5.956-2.184l-2.908-2.258c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332C2.438 15.983 5.482 18 9 18z"/>
              <path fill="#FBBC05" d="M3.964 10.707c-.18-.54-.282-1.117-.282-1.707 0-.593.102-1.17.282-1.709V4.958H.957C.347 6.173 0 7.548 0 9c0 1.452.348 2.827.957 4.042l3.007-2.335z"/>
              <path fill="#EA4335" d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0 5.482 0 2.438 2.017.957 4.958L3.964 7.29C4.672 5.163 6.656 3.58 9 3.58z"/>
            </svg>
            Continue with Google
          </button>

          {/* OR divider */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', margin: '20px 0' }}>
            <div style={{ flex: 1, height: '1px', background: 'rgba(200,168,76,0.12)' }} />
            <span style={{ fontFamily: SANS, fontSize: '11px', letterSpacing: '0.25em', color: 'rgba(160,130,60,0.4)', textTransform: 'uppercase' }}>or</span>
            <div style={{ flex: 1, height: '1px', background: 'rgba(200,168,76,0.12)' }} />
          </div>

          {/* Form */}
          <form onSubmit={handleEmailAuth} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            {!isLogin && (
              <div>
                <label style={labelStyle}>Full Name</label>
                <input type="text" value={fullName} onChange={e => setFullName(e.target.value)} required={!isLogin} placeholder="Your name" style={inputStyle} onFocus={e => { e.currentTarget.style.borderColor = 'rgba(200,168,76,0.45)'; }} onBlur={e => { e.currentTarget.style.borderColor = 'rgba(180,150,40,0.18)'; }} />
              </div>
            )}
            <div>
              <label style={labelStyle}>Email Address</label>
              <input type="email" value={email} onChange={e => setEmail(e.target.value)} required placeholder="you@example.com" style={inputStyle} onFocus={e => { e.currentTarget.style.borderColor = 'rgba(200,168,76,0.45)'; }} onBlur={e => { e.currentTarget.style.borderColor = 'rgba(180,150,40,0.18)'; }} />
            </div>
            <div>
              <label style={labelStyle}>Password</label>
              <input type="password" value={password} onChange={e => setPassword(e.target.value)} required minLength={6} placeholder="••••••••" style={inputStyle} onFocus={e => { e.currentTarget.style.borderColor = 'rgba(200,168,76,0.45)'; }} onBlur={e => { e.currentTarget.style.borderColor = 'rgba(180,150,40,0.18)'; }} />
            </div>

            {/* Forgot links */}
            {isLogin && (
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <button type="button" onClick={() => { setShowForgotPassword(true); setError(''); setMessage(''); }} style={{ fontFamily: SANS, fontStyle: 'normal', fontSize: '13px', fontWeight: 500, color: 'rgba(190,165,80,0.75)', background: 'none', border: 'none', cursor: 'pointer', padding: 0, letterSpacing: '0.01em' }}>Forgot password?</button>
                <button type="button" onClick={() => { setShowForgotUsername(true); setError(''); setMessage(''); }} style={{ fontFamily: SANS, fontStyle: 'normal', fontSize: '13px', fontWeight: 500, color: 'rgba(190,165,80,0.75)', background: 'none', border: 'none', cursor: 'pointer', padding: 0, letterSpacing: '0.01em' }}>Forgot username?</button>
              </div>
            )}

            {/* Forgot password panel */}
            {showForgotPassword && (
              <div style={{ padding: '14px', background: 'rgba(10,14,22,0.8)', border: '1px solid rgba(200,168,76,0.15)', borderRadius: '10px' }}>
                <p style={{ fontFamily: SERIF, fontSize: '13px', color: 'rgba(180,150,60,0.7)', marginBottom: '10px' }}>Enter your email to receive a reset link.</p>
                <div style={{ display: 'flex', gap: '8px' }}>
                  <button type="button" onClick={handleForgotPassword} disabled={loading} style={{ flex: 1, padding: '8px', background: 'rgba(180,140,40,0.18)', border: '1px solid rgba(200,168,76,0.35)', borderRadius: '8px', color: '#c8a84c', fontFamily: SANS, fontSize: '12px', fontWeight: 600, cursor: 'pointer' }}>Send Link</button>
                  <button type="button" onClick={() => setShowForgotPassword(false)} style={{ padding: '8px 14px', background: 'rgba(20,24,36,0.8)', border: '1px solid rgba(80,90,120,0.2)', borderRadius: '8px', color: 'rgba(140,160,200,0.5)', fontFamily: SANS, fontSize: '12px', cursor: 'pointer' }}>Cancel</button>
                </div>
              </div>
            )}

            {/* Forgot username panel */}
            {showForgotUsername && (
              <div style={{ padding: '14px', background: 'rgba(10,14,22,0.8)', border: '1px solid rgba(200,168,76,0.15)', borderRadius: '10px' }}>
                <p style={{ fontFamily: SERIF, fontSize: '13px', color: 'rgba(180,150,60,0.7)', marginBottom: '10px' }}>Enter your email to retrieve your username.</p>
                <div style={{ display: 'flex', gap: '8px' }}>
                  <button type="button" onClick={handleForgotUsername} disabled={loading} style={{ flex: 1, padding: '8px', background: 'rgba(180,140,40,0.18)', border: '1px solid rgba(200,168,76,0.35)', borderRadius: '8px', color: '#c8a84c', fontFamily: SANS, fontSize: '12px', fontWeight: 600, cursor: 'pointer' }}>Get Username</button>
                  <button type="button" onClick={() => setShowForgotUsername(false)} style={{ padding: '8px 14px', background: 'rgba(20,24,36,0.8)', border: '1px solid rgba(80,90,120,0.2)', borderRadius: '8px', color: 'rgba(140,160,200,0.5)', fontFamily: SANS, fontSize: '12px', cursor: 'pointer' }}>Cancel</button>
                </div>
              </div>
            )}

            {/* Submit */}
            <button
              type="submit"
              disabled={loading}
              style={{
                width: '100%', padding: '13px', marginTop: '4px',
                background: loading ? 'rgba(14,18,28,0.6)' : 'linear-gradient(180deg, rgba(22,32,54,0.97) 0%, rgba(14,20,38,0.99) 100%)',
                color: loading ? 'rgba(140,160,200,0.4)' : '#ffffff',
                fontFamily: SANS, fontSize: '14px', fontWeight: 700, letterSpacing: '0.06em',
                border: 'none', borderTop: '1px solid rgba(100,150,240,0.30)',
                borderLeft: '1px solid rgba(80,120,200,0.16)',
                borderRight: '1px solid rgba(60,100,180,0.10)',
                borderBottom: '1px solid rgba(0,0,0,0.5)',
                borderRadius: '10px', cursor: loading ? 'not-allowed' : 'pointer',
                boxShadow: loading ? 'none' : '0 5px 0 rgba(0,0,0,0.5), inset 0 1px 0 rgba(100,150,240,0.18), 0 0 24px rgba(60,100,200,0.12)',
                textShadow: loading ? 'none' : '0 0 16px rgba(160,200,255,0.25)',
                transition: 'all 0.08s ease',
                opacity: loading ? 0.5 : 1,
              }}
            >
              {loading ? 'Please wait...' : isLogin ? 'Sign In →' : 'Create Account →'}
            </button>
          </form>

          {/* Toggle */}
          <div style={{ marginTop: '20px', textAlign: 'center', fontFamily: SERIF, fontStyle: 'italic', fontSize: '14px', color: 'rgba(140,120,80,0.5)' }}>
            {isLogin ? "Don't have an account? " : "Already have an account? "}
            <button onClick={() => { setIsLogin(!isLogin); setError(''); setMessage(''); }} style={{ fontFamily: SERIF, fontStyle: 'italic', fontSize: '14px', fontWeight: 600, color: '#c8a84c', background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}>
              {isLogin ? 'Sign up' : 'Sign in'}
            </button>
          </div>
        </div>
      </div>

      {/* RIGHT PANEL */}
      <div style={{ flex: 1, position: 'relative', background: 'linear-gradient(135deg, #080b12 0%, #0a0d18 50%, #06090f 100%)', overflow: 'hidden', display: 'flex', alignItems: 'center' }}>
        {/* Ambient glow */}
        <div style={{ position: 'absolute', inset: 0, background: 'radial-gradient(ellipse at 70% 40%, rgba(200,168,76,0.09) 0%, transparent 65%)', pointerEvents: 'none' }} />
        <div style={{ position: 'absolute', inset: 0, boxShadow: 'inset 0 0 120px rgba(0,0,0,0.6)', pointerEvents: 'none' }} />

        {/* Floating open books */}
        {OPEN_BOOKS.map(b => (
          <div
            key={b.id}
            style={{
              position: 'absolute',
              left: `${b.x}%`,
              top: `${b.y}%`,
              transform: `rotate(${b.rotate}deg)`,
              filter: `blur(${b.blur}px)`,
              animation: `bookFloat${b.id % 3} ${b.dur}s ease-in-out ${b.delay}s infinite`,
              pointerEvents: 'none',
            }}
          >
            <OpenBookSVG opacity={0.30 + b.id * 0.04} scale={b.scale} />
          </div>
        ))}

        {/* Floating letters */}
        {LETTERS.map(l => (
          <div
            key={l.id}
            style={{
              position: 'absolute',
              left: `${l.x}%`,
              top: `${l.y}%`,
              fontFamily: "'Times New Roman', serif",
              fontSize: `${l.size}px`,
              color: `rgba(200,168,76,${l.opacity})`,
              pointerEvents: 'none',
              userSelect: 'none',
              animation: `letterDrift${l.id % 4} ${l.dur}s ease-in-out ${l.delay}s infinite`,
              textShadow: `0 0 8px rgba(200,168,76,${l.opacity * 1.5})`,
            }}
          >
            {l.char}
          </div>
        ))}

        {/* Gold dust */}
        {DUST_PTS.map(d => (
          <div
            key={d.id}
            style={{
              position: 'absolute',
              left: `${d.x}%`,
              top: `${d.y}%`,
              width: `${d.size}px`,
              height: `${d.size}px`,
              borderRadius: '50%',
              background: 'rgba(255,210,60,0.9)',
              boxShadow: '0 0 6px rgba(255,200,40,0.7)',
              pointerEvents: 'none',
              animation: `dustFloat${d.id % 3} ${d.dur}s ease-in-out ${d.delay}s infinite`,
              opacity: 0,
            }}
          />
        ))}

        {/* Content */}
        <div style={{ position: 'relative', zIndex: 2, padding: '64px 80px', maxWidth: '620px' }}>
          <h1 style={{
            fontFamily: SERIF,
            fontSize: 'clamp(2.4rem, 4vw, 3.4rem)',
            fontWeight: 600,
            color: '#e8dcc4',
            lineHeight: 1.2,
            letterSpacing: '0.01em',
            marginBottom: '16px',
          }}>
            Your Cambridge<br />
            <span style={{ color: '#C9A84C', textShadow: '0 0 40px rgba(200,168,76,0.30)' }}>Study Archive</span>
          </h1>

          <p style={{ fontFamily: SERIF, fontStyle: 'italic', fontSize: '16px', color: 'rgba(180,160,110,0.5)', marginBottom: '44px', letterSpacing: '0.02em' }}>
            Everything you need for IGCSE, in one place.
          </p>

          {/* Gold ornamental divider */}
          <div style={{ marginBottom: '36px', display: 'flex', alignItems: 'center', gap: '0' }}>
            <div style={{ flex: 1, height: '1px', background: 'linear-gradient(to right, transparent, rgba(200,168,76,0.35))' }} />
            <svg width="40" height="14" viewBox="0 0 40 14" fill="none" style={{ flexShrink: 0 }}>
              <path d="M1 7 L10 7" stroke="rgba(200,168,76,0.5)" strokeWidth="0.8"/>
              <path d="M30 7 L39 7" stroke="rgba(200,168,76,0.5)" strokeWidth="0.8"/>
              <path d="M20 3 C17 3, 13 5, 13 7 C13 9, 17 11, 20 11 C23 11, 27 9, 27 7 C27 5, 23 3, 20 3Z" stroke="rgba(200,168,76,0.8)" strokeWidth="0.9" fill="none"/>
              <rect x="18.5" y="5.5" width="3" height="3" transform="rotate(45 20 7)" stroke="rgba(200,168,76,0.9)" strokeWidth="0.8" fill="rgba(200,168,76,0.2)"/>
            </svg>
            <div style={{ flex: 1, height: '1px', background: 'linear-gradient(to left, transparent, rgba(200,168,76,0.35))' }} />
          </div>

          {/* Features */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '28px' }}>
            {[
              {
                title: 'Automarked Papers',
                desc: 'Get your MCQ and theory papers instantly marked. Submit a paper and receive a full score breakdown with correct answers — no waiting, no manual checking.',
                icon: (
                  <svg width="20" height="20" fill="none" viewBox="0 0 24 24" stroke="currentColor" style={{ color: '#C9A84C' }}>
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z" />
                  </svg>
                ),
              },
              {
                title: 'Topical Filters',
                desc: 'Targeted question banks organised by topic and subtopic. Drill exactly the areas you\'re weakest in — no more wading through entire papers to find relevant questions.',
                icon: (
                  <svg width="20" height="20" fill="none" viewBox="0 0 24 24" stroke="currentColor" style={{ color: '#C9A84C' }}>
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2a1 1 0 01-.293.707L13 13.414V19a1 1 0 01-.553.894l-4 2A1 1 0 017 21v-7.586L3.293 6.707A1 1 0 013 6V4z" />
                  </svg>
                ),
              },
              {
                title: 'Resource Library',
                desc: 'Access student-uploaded revision notes, formula sheets, and study guides across all IGCSE subjects. Found something useful? Upload it and help your peers too.',
                icon: (
                  <svg width="20" height="20" fill="none" viewBox="0 0 24 24" stroke="currentColor" style={{ color: '#C9A84C' }}>
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                  </svg>
                ),
              },
            ].map((f, i) => (
              <div key={i} style={{ display: 'flex', gap: '16px', alignItems: 'flex-start' }}>
                <div style={{
                  width: '36px', height: '36px', flexShrink: 0,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  borderRadius: '8px',
                  background: 'rgba(200,168,76,0.08)',
                  border: '1px solid rgba(200,168,76,0.20)',
                  borderTop: '1px solid rgba(200,168,76,0.35)',
                }}>
                  {f.icon}
                </div>
                <div>
                  <h3 style={{ fontFamily: SERIF, fontSize: '17px', fontWeight: 600, color: '#e8dcc4', marginBottom: '4px', letterSpacing: '0.01em' }}>
                    {f.title}
                  </h3>
                  <p style={{ fontFamily: SANS, fontSize: '13px', color: 'rgba(160,150,120,0.55)', lineHeight: 1.65 }}>
                    {f.desc}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <style jsx>{`
        @keyframes bookFloat0 {
          0%, 100% { transform: translateY(0px);  }
          50%       { transform: translateY(-22px); }
        }
        @keyframes bookFloat1 {
          0%, 100% { transform: translateY(0px);  }
          40%       { transform: translateY(-14px); }
          80%       { transform: translateY(-28px); }
        }
        @keyframes bookFloat2 {
          0%, 100% { transform: translateY(0px);  }
          60%       { transform: translateY(-18px); }
        }
        @keyframes letterDrift0 {
          0%   { transform: translate(0,0) rotate(0deg);       opacity: 0;    }
          15%  { opacity: 1; }
          50%  { transform: translate(12px,-55px) rotate(8deg); opacity: 0.9; }
          85%  { opacity: 0.5; }
          100% { transform: translate(0,0) rotate(0deg);       opacity: 0;    }
        }
        @keyframes letterDrift1 {
          0%   { transform: translate(0,0) rotate(0deg);         opacity: 0;    }
          20%  { opacity: 0.85; }
          50%  { transform: translate(-18px,-48px) rotate(-6deg); opacity: 0.8; }
          80%  { opacity: 0.4; }
          100% { transform: translate(0,0) rotate(0deg);         opacity: 0;    }
        }
        @keyframes letterDrift2 {
          0%   { transform: translate(0,0) rotate(0deg);        opacity: 0;    }
          25%  { opacity: 0.9; }
          50%  { transform: translate(8px,-70px) rotate(12deg); opacity: 1;    }
          75%  { opacity: 0.6; }
          100% { transform: translate(0,0) rotate(0deg);        opacity: 0;    }
        }
        @keyframes letterDrift3 {
          0%   { transform: translate(0,0) rotate(0deg);          opacity: 0;    }
          20%  { opacity: 0.8; }
          55%  { transform: translate(-10px,-40px) rotate(-10deg); opacity: 0.7; }
          80%  { opacity: 0.3; }
          100% { transform: translate(0,0) rotate(0deg);          opacity: 0;    }
        }
        @keyframes dustFloat0 {
          0%   { transform: translate(0,0);         opacity: 0;    }
          15%  { opacity: 0.9; }
          50%  { transform: translate(16px,-52px);  opacity: 1;    }
          85%  { opacity: 0.6; }
          100% { transform: translate(0,0);         opacity: 0;    }
        }
        @keyframes dustFloat1 {
          0%   { transform: translate(0,0);          opacity: 0;    }
          20%  { opacity: 0.85; }
          50%  { transform: translate(-20px,-44px);  opacity: 0.95; }
          85%  { opacity: 0.5; }
          100% { transform: translate(0,0);          opacity: 0;    }
        }
        @keyframes dustFloat2 {
          0%   { transform: translate(0,0);         opacity: 0;    }
          20%  { opacity: 0.8; }
          50%  { transform: translate(10px,-65px);  opacity: 0.9;  }
          80%  { opacity: 0.4; }
          100% { transform: translate(0,0);         opacity: 0;    }
        }
      `}</style>
    </div>
  );
}

export default function LoginPage() {
  return <LoginPageContent />;
}

// Made with Bob
