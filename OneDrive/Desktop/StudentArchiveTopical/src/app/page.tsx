'use client';

import React from 'react';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import HeroSection from './components/HeroSection';
import ScrollsSection from './components/ScrollsSection';

export default function HomePage() {
  return (
    <main className="grain-overlay min-h-screen transition-colors duration-500" style={{ background: '#0c1018' }}>
      <Header />
      <HeroSection />
      <div style={{ marginTop: '-2px' }}>
        <ScrollsSection />
      </div>
      <Footer />
    </main>
  );
}

// Made with Bob
