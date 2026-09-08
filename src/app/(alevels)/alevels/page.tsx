'use client';

import React from 'react';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import HeroLibraryALevels from '@/app/components/HeroLibraryALevels';

export default function ALevelsLandingPage() {
  return (
    <main className="grain-overlay min-h-screen transition-colors duration-500">
      <Header />
      <HeroLibraryALevels />
      <Footer />
    </main>
  );
}

// Made with Bob
