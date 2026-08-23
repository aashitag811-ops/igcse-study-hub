import { MetadataRoute } from 'next';

export default function sitemap(): MetadataRoute.Sitemap {
  const now = new Date();

  return [
    // ── Root ──────────────────────────────────────────────────────────────────
    {
      url: 'https://studentarchive.xyz',
      lastModified: now,
      changeFrequency: 'weekly',
      priority: 1.0,
    },

    // ── IGCSE ─────────────────────────────────────────────────────────────────
    {
      url: 'https://studentarchive.xyz/igcse',
      lastModified: now,
      changeFrequency: 'weekly',
      priority: 0.95,
    },
    {
      url: 'https://studentarchive.xyz/igcse/practice',
      lastModified: now,
      changeFrequency: 'weekly',
      priority: 0.9,
    },
    {
      url: 'https://studentarchive.xyz/igcse/browse',
      lastModified: now,
      changeFrequency: 'weekly',
      priority: 0.85,
    },
    {
      url: 'https://studentarchive.xyz/igcse/profile',
      lastModified: now,
      changeFrequency: 'monthly',
      priority: 0.5,
    },
    {
      url: 'https://studentarchive.xyz/igcse/upload',
      lastModified: now,
      changeFrequency: 'monthly',
      priority: 0.5,
    },

    // ── A Levels ──────────────────────────────────────────────────────────────
    {
      url: 'https://studentarchive.xyz/alevels',
      lastModified: now,
      changeFrequency: 'weekly',
      priority: 0.95,
    },
    {
      url: 'https://studentarchive.xyz/alevels/practice',
      lastModified: now,
      changeFrequency: 'weekly',
      priority: 0.9,
    },
    {
      url: 'https://studentarchive.xyz/alevels/browse',
      lastModified: now,
      changeFrequency: 'weekly',
      priority: 0.85,
    },
    {
      url: 'https://studentarchive.xyz/alevels/upload',
      lastModified: now,
      changeFrequency: 'monthly',
      priority: 0.5,
    },
  ];
}
