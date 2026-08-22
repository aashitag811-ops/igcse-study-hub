'use client';

import React, { useEffect, useState } from 'react';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import HeroLibraryALevels from '@/app/components/HeroLibraryALevels';

const SERIF = "'Cormorant Garamond', Georgia, serif";
const SANS  = "'DM Sans', system-ui, sans-serif";

function PortraitOverlay() {
  const [isPortrait, setIsPortrait] = useState(false);

  useEffect(() => {
    const check = () => {
      setIsPortrait(window.innerWidth < 768 && window.innerHeight > window.innerWidth);
    };
    check();
    window.addEventListener('resize', check);
    window.addEventListener('orientationchange', check);
    return () => {
      window.removeEventListener('resize', check);
      window.removeEventListener('orientationchange', check);
    };
  }, []);

  if (!isPortrait) return null;

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 9999,
      background: 'rgba(8,10,16,0.97)',
      display: 'flex', flexDirection: 'column',
      alignItems: 'center', justifyContent: 'center',
      padding: '2rem', textAlign: 'center',
    }}>
      <svg width="56" height="56" viewBox="0 0 24 24" fill="none" stroke="#C9A84C" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" style={{ marginBottom: '1.5rem', opacity: 0.8 }}>
        <rect x="4" y="2" width="16" height="20" rx="2" />
        <path d="M9 22h6" strokeWidth="2" />
        <path d="M17 6 A6 6 0 0 1 7 6" />
        <polyline points="7 3 7 7 11 7" />
      </svg>
      <h2 style={{ fontFamily: SERIF, fontSize: '1.5rem', fontWeight: 400, color: '#E8DCC4', marginBottom: '0.75rem', letterSpacing: '0.03em' }}>
        Rotate Your Device
      </h2>
      <p style={{ fontFamily: SANS, fontSize: '0.875rem', color: 'rgba(196,176,138,0.6)', lineHeight: 1.7, maxWidth: 280 }}>
        The Archive library is best experienced in <strong style={{ color: '#C9A84C' }}>landscape mode</strong>. Please rotate your phone for the full view.
      </p>
      <div style={{ marginTop: '2rem', width: 48, height: 1, background: 'rgba(200,168,76,0.3)' }} />
    </div>
  );
}

export default function ALevelsLandingPage() {
  return (
    <main className="grain-overlay min-h-screen transition-colors duration-500">
      <PortraitOverlay />
      <Header />
      <HeroLibraryALevels />
      <Footer />
    </main>
  );
}

// Made with Bob
