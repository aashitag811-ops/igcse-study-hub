'use client';

import Link from 'next/link';
import Image from 'next/image';

export default function BackButton() {
  return (
    <Link
      href="/"
      className="fixed top-4 left-4 z-50 group flex items-center"
    >
      <div className="relative w-11 h-11 transition-transform duration-300 group-hover:scale-110">
        <div
          className="absolute inset-0 rounded-md opacity-0 group-hover:opacity-100 transition-opacity duration-300"
          style={{ boxShadow: '0 0 0 1.5px #C9A84C, 0 0 14px 4px rgba(201,168,76,0.65), 0 0 28px 8px rgba(201,168,76,0.25)' }}
        />
        <Image
          src="/logo.png"
          alt="Home"
          width={44}
          height={44}
          className="rounded-md object-contain"
          priority
        />
      </div>
    </Link>
  );
}

// Made with Bob
