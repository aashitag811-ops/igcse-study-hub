'use client';

import React from 'react';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import HeroLibrary from './components/HeroLibrary';
import HeroSection from './components/HeroSection';
import ScrollsSection from './components/ScrollsSection';

export default function HomePage() {
  return (
    <main className="grain-overlay min-h-screen transition-colors duration-500">
      <Header />
      <HeroSection />
      <ScrollsSection />
      <HeroLibrary />
      <Footer />
    </main>
  );
}

// Made with Bob
