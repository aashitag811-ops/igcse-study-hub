'use client';

import React from 'react';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import HeroLibraryOLevel from '@/app/components/HeroLibraryOLevel';

export default function OLevelLandingPage() {
  return (
    <main className="grain-overlay min-h-screen transition-colors duration-500">
      <Header />
      <HeroLibraryOLevel />
      <Footer />
    </main>
  );
}
