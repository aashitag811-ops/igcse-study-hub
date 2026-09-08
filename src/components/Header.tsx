'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { createClient } from '@/lib/supabase/client';
import NotificationBell from '@/components/NotificationBell';
import PortraitOverlay from '@/components/PortraitOverlay';

const IGCSE_NAV = [
  { label: 'Dashboard', href: '/' },
  { label: 'Past Papers', href: '/igcse/practice' },
  { label: 'Browse Resources', href: '/igcse/browse' },
  { label: 'Profile', href: '/igcse/profile' },
];

const ALEVELS_NAV = [
  { label: 'Dashboard', href: '/' },
  { label: 'Past Papers', href: '/alevels/practice' },
  { label: 'Browse Resources', href: '/alevels/browse' },
  { label: 'Profile', href: '/alevels/profile' },
];

const SERIF = "'Cormorant Garamond', 'Cormorant', Georgia, serif";

function NavLink({ label, href }: { label: string; href: string }) {
  const [hovered, setHovered] = useState(false);
  const [pressing, setPressing] = useState(false);

  return (
    <Link
      href={href}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => { setHovered(false); setPressing(false); }}
      onMouseDown={() => setPressing(true)}
      onMouseUp={() => setPressing(false)}
      style={{
        fontFamily: SERIF,
        fontSize: '15px',
        fontWeight: 500,
        letterSpacing: '0.03em',
        color: hovered ? '#E8D89A' : '#C4B08A',
        textDecoration: 'none',
        padding: '6px 12px',
        borderRadius: '8px',
        display: 'inline-block',
        transition: 'background 0.35s ease, color 0.2s ease, transform 0.1s ease',
        background: hovered
          ? 'rgba(200,168,76,0.10)'
          : 'transparent',
        transform: pressing ? 'translateY(1px)' : 'translateY(0)',
        whiteSpace: 'nowrap',
      }}
    >
      {label}
    </Link>
  );
}

function AuthLink({ isSignedIn }: { isSignedIn: boolean }) {
  const [hovered, setHovered] = useState(false);
  const [pressing, setPressing] = useState(false);

  const handleSignOut = async () => {
    const supabase = createClient();
    await supabase.auth.signOut();
    window.location.href = '/igcse/login';
  };

  if (isSignedIn) {
    return (
      <button
        onClick={handleSignOut}
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => { setHovered(false); setPressing(false); }}
        onMouseDown={() => setPressing(true)}
        onMouseUp={() => setPressing(false)}
        style={{
          fontFamily: SERIF,
          fontSize: '16px',
          fontWeight: 500,
          letterSpacing: '0.03em',
          color: hovered ? '#e8a090' : '#c47a6a',
          textDecoration: 'none',
          padding: '6px 16px',
          borderRadius: '8px',
          display: 'inline-block',
          transition: 'background 0.35s ease, color 0.2s ease, transform 0.1s ease',
          background: hovered ? 'rgba(180,60,60,0.10)' : 'transparent',
          transform: pressing ? 'translateY(1px)' : 'translateY(0)',
          whiteSpace: 'nowrap',
          cursor: 'pointer',
          border: 'none',
          outline: 'none',
        }}
      >
        Sign Out
      </button>
    );
  }

  return (
    <Link
      href="/igcse/login"
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => { setHovered(false); setPressing(false); }}
      onMouseDown={() => setPressing(true)}
      onMouseUp={() => setPressing(false)}
      style={{
        fontFamily: SERIF,
        fontSize: '16px',
        fontWeight: 500,
        letterSpacing: '0.03em',
        color: hovered ? '#E8D89A' : '#C4B08A',
        textDecoration: 'none',
        padding: '6px 16px',
        borderRadius: '8px',
        display: 'inline-block',
        transition: 'background 0.35s ease, color 0.2s ease, transform 0.1s ease',
        background: hovered ? 'rgba(200,168,76,0.10)' : 'transparent',
        transform: pressing ? 'translateY(1px)' : 'translateY(0)',
        whiteSpace: 'nowrap',
      }}
    >
      Sign In
    </Link>
  );
}

export default function Header() {
  const [scrolled, setScrolled] = useState(false);
  const [isSignedIn, setIsSignedIn] = useState(false);
  const [pathname, setPathname] = useState('');

  useEffect(() => {
    setPathname(window.location.pathname);
  }, []);

  const isALevels = pathname.startsWith('/alevels');
  const NAV_ITEMS = isALevels ? ALEVELS_NAV : IGCSE_NAV;

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getSession().then(({ data }) => {
      setIsSignedIn(!!data.session);
    });
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setIsSignedIn(!!session);
    });
    return () => subscription.unsubscribe();
  }, []);

  return (
    <>
    <PortraitOverlay />
    <header
      className="fixed top-0 left-0 right-0 z-50"
      style={{
        backdropFilter: scrolled ? 'blur(12px)' : 'none',
        WebkitBackdropFilter: scrolled ? 'blur(12px)' : 'none',
        background: scrolled ? 'rgba(8,10,16,0.88)' : 'transparent',
        borderBottom: scrolled ? '1px solid rgba(200,168,76,0.12)' : '1px solid transparent',
        transition: 'background 0.5s ease, border-color 0.5s ease, backdrop-filter 0.5s ease',
      }}
    >
      <div className="max-w-7xl mx-auto px-4 py-3 flex items-center justify-between gap-2">

        {/* Logo — hide text label below lg so it doesn't crowd nav */}
        <Link href="/" className="flex items-center gap-2 group flex-shrink-0">
          <div className="relative w-10 h-10 lg:w-14 lg:h-14 transition-transform duration-300 group-hover:scale-110">
            <div
              className="absolute inset-0 rounded-full opacity-0 group-hover:opacity-100 transition-opacity duration-300"
              style={{ boxShadow: '0 0 0 1.5px #C9A84C, 0 0 14px 4px rgba(201,168,76,0.65), 0 0 28px 8px rgba(201,168,76,0.25)' }}
            />
            <Image
              src="/logo.png"
              alt="Student Archive"
              width={56}
              height={56}
              className="rounded-full object-contain w-full h-full"
              priority
            />
          </div>
          <span className="hidden lg:inline" style={{ fontFamily: SERIF, fontSize: '20px', fontWeight: 500, color: '#F5EDD6', letterSpacing: '0.02em' }}>
            Student Archive
          </span>
        </Link>

        {/* Centre nav — hidden on mobile, shown md+ as a normal flex row (not absolute) */}
        <nav
          className="hidden md:flex items-center flex-1 justify-center"
          style={{
            gap: '2px',
            padding: '5px 6px',
            borderRadius: '14px',
            background: scrolled
              ? 'linear-gradient(180deg, rgba(12,16,24,0.72) 0%, rgba(8,10,16,0.80) 100%)'
              : 'linear-gradient(180deg, rgba(12,16,24,0.38) 0%, rgba(8,10,16,0.44) 100%)',
            border: 'none',
            boxShadow: 'none',
            transition: 'background 0.5s ease',
            minWidth: 0,
          }}
        >
          {NAV_ITEMS.map(item => (
            <NavLink key={item.href} label={item.label} href={item.href} />
          ))}
        </nav>

        {/* Switcher + Bell + Sign in — far right */}
        <div className="flex-shrink-0 flex items-center gap-2">
          {/* IGCSE / A Levels switcher */}
          <div style={{
            display: 'flex', alignItems: 'center', gap: '2px',
            padding: '3px', borderRadius: '8px',
            background: 'rgba(200,168,76,0.07)',
            border: '1px solid rgba(200,168,76,0.15)',
          }}>
            {[
              { label: 'IGCSE', href: '/igcse' },
              { label: 'A Levels', href: '/alevels' },
            ].map(({ label, href }) => {
              const active = isALevels ? href === '/alevels' : href === '/igcse';
              return (
                <Link key={href} href={href} style={{
                  fontFamily: SERIF, fontSize: '13px', fontWeight: 500,
                  padding: '4px 10px', borderRadius: '6px',
                  color: active ? '#1a1208' : 'rgba(200,168,76,0.6)',
                  background: active ? '#C9A84C' : 'transparent',
                  textDecoration: 'none',
                  transition: 'all 0.2s ease',
                  whiteSpace: 'nowrap',
                }}>
                  {label}
                </Link>
              );
            })}
          </div>
          <NotificationBell />
          <AuthLink isSignedIn={isSignedIn} />
        </div>

        {/* Mobile-only: compact nav links below the main row */}
      </div>

      {/* Mobile nav row — shown only below md */}
      <div
        className="flex md:hidden items-center justify-center gap-1 px-4 pb-2"
        style={{
          background: 'rgba(8,10,16,0.60)',
          borderTop: '1px solid rgba(200,168,76,0.08)',
          flexWrap: 'wrap',
        }}
      >
        {NAV_ITEMS.map(item => (
          <NavLink key={item.href} label={item.label} href={item.href} />
        ))}
      </div>
    </header>
    </>
  );
}

// Made with Bob
