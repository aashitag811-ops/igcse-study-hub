'use client';

import React from 'react';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import HeroLibrary from '@/app/components/HeroLibrary';

export default function IGCSELandingPage() {
  return (
    <main className="grain-overlay min-h-screen transition-colors duration-500">
      <Header />
      <HeroLibrary />
      <Footer />
    </main>
  );
}

// Made with Bob
