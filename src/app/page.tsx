'use client';

import React from 'react';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import HeroSection from './components/HeroSection';
import ScrollsSection from './components/ScrollsSection';
import HeroLibrary from './components/HeroLibrary';
import ResourcesSection from './components/ResourcesSection';

export default function HomePage() {
  return (
    <main className="grain-overlay min-h-screen transition-colors duration-500">
      <Header />
      <HeroSection />
      <ScrollsSection />
      <HeroLibrary />
      <ResourcesSection />
      <Footer />
    </main>
  );
}

// Made with Bob
