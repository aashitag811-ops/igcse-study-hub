'use client';

import React from 'react';
import { useRouter } from 'next/navigation';
import Icon from '@/components/ui/AppIcon';

const resources = [
  {
    id: 'pastpapers',
    title: 'Past Papers',
    description: 'Access examination papers and practice materials',
    icon: 'DocumentTextIcon' as const,
    href: '/pastpapers',
    accent: '#C4922A',
  },
  {
    id: 'profile',
    title: 'View Profile',
    description: 'Manage your academic profile and progress',
    icon: 'UserIcon' as const,
    href: '/profile',
    accent: '#A07820',
  },
  {
    id: 'signout',
    title: 'Sign Out',
    description: 'Logout from your account',
    icon: 'ArrowRightOnRectangleIcon' as const,
    href: '/signout',
    accent: '#7A5A18',
  },
];

export default function AdditionalResources() {
  const router = useRouter();

  return (
    <section
      className="relative py-16 px-6"
      style={{
        background: 'linear-gradient(180deg, rgba(15,10,4,0.95) 0%, #1A1208 50%, rgba(15,10,4,0.98) 100%)',
      }}
    >
      {/* Ornate top border */}
      <div className="max-w-4xl mx-auto mb-10">
        <div className="ornate-divider">
          <svg width="24" height="12" viewBox="0 0 24 12" fill="none">
            <path d="M12 0 L24 6 L12 12 L0 6 Z" fill="rgba(196,146,42,0.5)" />
          </svg>
          <h2
            className="font-serif text-center"
            style={{
              fontSize: 'clamp(1.1rem, 2.5vw, 1.6rem)',
              color: '#E8B84B',
              letterSpacing: '0.08em',
            }}
          >
            Additional Resources
          </h2>
          <svg width="24" height="12" viewBox="0 0 24 12" fill="none">
            <path d="M12 0 L24 6 L12 12 L0 6 Z" fill="rgba(196,146,42,0.5)" />
          </svg>
        </div>
      </div>

      {/* Cards grid */}
      <div className="max-w-4xl mx-auto grid grid-cols-1 md:grid-cols-3 gap-6">
        {resources.map((resource) => (
          <button
            key={resource.id}
            className="resource-card rounded-sm p-8 text-left w-full focus:outline-none focus:ring-2 focus:ring-primary"
            onClick={() => router.push(resource.href)}
            aria-label={resource.title}
          >
            <div className="relative z-10">
              <div
                className="mb-4 inline-flex items-center justify-center w-10 h-10 rounded-sm"
                style={{
                  background: `rgba(196,146,42,0.12)`,
                  border: `1px solid rgba(196,146,42,0.3)`,
                }}
              >
                <Icon name={resource.icon} size={20} className="text-primary" />
              </div>
              <h3
                className="font-serif mb-2"
                style={{
                  fontSize: '1.05rem',
                  color: '#E8B84B',
                  letterSpacing: '0.04em',
                }}
              >
                {resource.title}
              </h3>
              <p
                className="font-sans"
                style={{
                  fontSize: '0.8rem',
                  color: 'rgba(200,184,154,0.75)',
                  lineHeight: 1.6,
                }}
              >
                {resource.description}
              </p>
            </div>
          </button>
        ))}
      </div>

      {/* Ornate bottom border */}
      <div className="max-w-4xl mx-auto mt-10">
        <div
          className="w-full h-px"
          style={{
            background: 'linear-gradient(to right, transparent, rgba(196,146,42,0.3), transparent)',
          }}
        />
      </div>
    </section>
  );
}