'use client';

'use client';

import React from 'react';
import Link from 'next/link';

export default function Header() {
  return (
    <header className="fixed top-0 left-0 right-0 z-50 header-bg backdrop-blur-sm border-b border-[var(--border-gold)]">
      <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
        <Link href="/" className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-[#C9A84C] to-[#8B6914] flex items-center justify-center">
            <span className="text-[#0A0806] font-bold text-sm">SA</span>
          </div>
          <span className="font-display text-xl text-[#F5EDD6]">Student Archive</span>
        </Link>
        
        {/* Tagline */}
        <div className="hidden md:block flex-1 text-center px-8">
          <p
            className="font-sans font-bold tracking-wide"
            style={{
              fontSize: '16px',
              background: 'linear-gradient(135deg, #E2C97A 0%, #C9A84C 50%, #B8860B 100%)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              backgroundClip: 'text',
              textShadow: '0 0 30px rgba(201, 168, 76, 0.5)',
              filter: 'drop-shadow(0 0 10px rgba(201, 168, 76, 0.3))',
            }}
          >
            Try our automarked past papers and explore hundreds of resources
          </p>
        </div>
        
        <nav className="flex items-center gap-6">
          <Link
            href="/browse"
            className="font-sans text-sm text-[#C4B08A] hover:text-[#C9A84C] transition-colors"
          >
            Browse
          </Link>
          <Link
            href="/profile"
            className="font-sans text-sm text-[#C4B08A] hover:text-[#C9A84C] transition-colors"
          >
            Profile
          </Link>
          <Link
            href="/login"
            className="font-sans text-sm px-4 py-2 rounded-lg border border-[#C9A84C]/30 text-[#C9A84C] hover:bg-[#C9A84C]/10 transition-all"
          >
            Sign In
          </Link>
        </nav>
      </div>
    </header>
  );
}

// Made with Bob
