'use client';

import React from 'react';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import HeroLibraryIGCSE91 from '@/app/components/HeroLibraryIGCSE91';

export default function IGCSE91LandingPage() {
  return (
    <main className="grain-overlay min-h-screen transition-colors duration-500">
      <Header />
      <HeroLibraryIGCSE91 />
      <Footer />
    </main>
  );
}
