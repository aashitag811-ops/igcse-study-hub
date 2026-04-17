'use client';

import React from 'react';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import HeroLibrary from './components/HeroLibrary';
import ResourcesSection from './components/ResourcesSection';

export default function HomePage() {
  return (
    <main className="grain-overlay min-h-screen" style={{ background: '#0A0806' }}>
      <Header />
      <HeroLibrary />
      <ResourcesSection />
      <Footer />
    </main>
  );
}

// Made with Bob
