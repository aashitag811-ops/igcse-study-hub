'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';

const NAV_ITEMS = [
  { label: 'Dashboard', href: '/' },
  { label: 'Start Practising', href: '/igcse/practice' },
  { label: 'Browse Resources', href: '/igcse/browse' },
  { label: 'Profile', href: '/igcse/profile' },
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
        fontSize: '16px',
        fontWeight: 500,
        letterSpacing: '0.03em',
        color: hovered ? '#E8D89A' : '#C4B08A',
        textDecoration: 'none',
        padding: '6px 16px',
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

function SignOutLink() {
  const [hovered, setHovered] = useState(false);
  const [pressing, setPressing] = useState(false);

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
        color: hovered ? '#e8a090' : '#c47a6a',
        textDecoration: 'none',
        padding: '6px 16px',
        borderRadius: '8px',
        display: 'inline-block',
        transition: 'background 0.35s ease, color 0.2s ease, transform 0.1s ease',
        background: hovered ? 'rgba(180,60,60,0.10)' : 'transparent',
        transform: pressing ? 'translateY(1px)' : 'translateY(0)',
        whiteSpace: 'nowrap',
      }}
    >
      Sign Out
    </Link>
  );
}

export default function Header() {
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  return (
    <header
      className="fixed top-0 left-0 right-0 z-50"
      style={{
        backdropFilter: scrolled ? 'blur(12px)' : 'none',
        WebkitBackdropFilter: scrolled ? 'blur(12px)' : 'none',
        background: scrolled ? 'rgba(10,8,4,0.82)' : 'transparent',
        borderBottom: scrolled ? '1px solid rgba(200,168,76,0.12)' : '1px solid transparent',
        transition: 'background 0.5s ease, border-color 0.5s ease, backdrop-filter 0.5s ease',
      }}
    >
      <div className="max-w-7xl mx-auto px-6 py-3 flex items-center justify-between">

        {/* Logo */}
        <Link href="/" className="flex items-center gap-3 group flex-shrink-0">
          <div className="relative w-14 h-14 transition-transform duration-300 group-hover:scale-110">
            <div
              className="absolute inset-0 rounded-md opacity-0 group-hover:opacity-100 transition-opacity duration-300"
              style={{ boxShadow: '0 0 0 1.5px #C9A84C, 0 0 14px 4px rgba(201,168,76,0.65), 0 0 28px 8px rgba(201,168,76,0.25)' }}
            />
            <Image
              src="/logo.png"
              alt="Student Archive"
              width={56}
              height={56}
              className="rounded-md object-contain"
              priority
            />
          </div>
          <span style={{ fontFamily: SERIF, fontSize: '20px', fontWeight: 500, color: '#F5EDD6', letterSpacing: '0.02em' }}>
            Student Archive
          </span>
        </Link>

        {/* Centre pill — soft brass library tab */}
        <nav
          className="absolute left-1/2"
          style={{
            transform: 'translateX(-50%)',
            display: 'flex',
            alignItems: 'center',
            gap: '2px',
            padding: '5px 10px',
            borderRadius: '14px',
            // soft brass background fades in on scroll
            background: scrolled
              ? 'linear-gradient(180deg, rgba(38,28,10,0.72) 0%, rgba(24,18,6,0.80) 100%)'
              : 'linear-gradient(180deg, rgba(38,28,10,0.38) 0%, rgba(24,18,6,0.44) 100%)',
            // no border, no shadow — just softness
            border: 'none',
            boxShadow: 'none',
            transition: 'background 0.5s ease',
          }}
        >
          {NAV_ITEMS.map(item => (
            <NavLink key={item.href} label={item.label} href={item.href} />
          ))}
        </nav>

        {/* Sign out — far right */}
        <div className="flex-shrink-0">
          <SignOutLink />
        </div>

      </div>
    </header>
  );
}

// Made with Bob
