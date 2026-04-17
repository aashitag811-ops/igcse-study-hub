'use client';

import React from 'react';
import Link from 'next/link';

export default function Footer() {
  return (
    <footer className="relative bg-[#0A0806] border-t border-[#C9A84C]/20 py-12 px-6">
      <div className="max-w-7xl mx-auto">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-8">
          {/* About */}
          <div>
            <h3 className="font-display text-lg text-[#C9A84C] mb-4">Student Archive</h3>
            <p className="font-sans text-sm text-[#7A6A4A] leading-relaxed">
              Your comprehensive digital library for Cambridge IGCSE studies. Access past papers, resources, and study materials across all subjects.
            </p>
          </div>

          {/* Quick Links */}
          <div>
            <h3 className="font-display text-lg text-[#C9A84C] mb-4">Quick Links</h3>
            <ul className="space-y-2">
              <li>
                <Link href="/browse" className="font-sans text-sm text-[#C4B08A] hover:text-[#C9A84C] transition-colors">
                  Browse Subjects
                </Link>
              </li>
              <li>
                <Link href="/profile" className="font-sans text-sm text-[#C4B08A] hover:text-[#C9A84C] transition-colors">
                  My Profile
                </Link>
              </li>
              <li>
                <Link href="/upload" className="font-sans text-sm text-[#C4B08A] hover:text-[#C9A84C] transition-colors">
                  Upload Resources
                </Link>
              </li>
            </ul>
          </div>

          {/* Contact */}
          <div>
            <h3 className="font-display text-lg text-[#C9A84C] mb-4">Support</h3>
            <p className="font-sans text-sm text-[#7A6A4A] leading-relaxed">
              Need help? Contact us at<br />
              <a href="mailto:support@studentathenaeum.com" className="text-[#C9A84C] hover:underline">
                support@studentathenaeum.com
              </a>
            </p>
          </div>
        </div>

        {/* Bottom Bar */}
        <div className="pt-8 border-t border-[#C9A84C]/10">
          <div className="flex flex-col md:flex-row justify-between items-center gap-4">
            <p className="font-sans text-xs text-[#7A6A4A]">
              © 2026 Student Archive. All rights reserved.
            </p>
            <div className="flex items-center gap-6">
              <Link href="/privacy" className="font-sans text-xs text-[#7A6A4A] hover:text-[#C9A84C] transition-colors">
                Privacy Policy
              </Link>
              <Link href="/terms" className="font-sans text-xs text-[#7A6A4A] hover:text-[#C9A84C] transition-colors">
                Terms of Service
              </Link>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
}

// Made with Bob
