'use client';

import React from 'react';
import { useRouter } from 'next/navigation';
import Header from '@/components/Header';
import Footer from '@/components/Footer';

export default function PastPapersHub() {
  const router = useRouter();

  return (
    <main className="min-h-screen bg-[#F5EDD6] dark:bg-[#0A0806]">
      <Header />
      
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        {/* Hero Section */}
        <div className="text-center mb-16">
          <h1 className="text-5xl font-bold text-[#2A1F0E] dark:text-[#E2C97A] mb-4">
            Past Papers Hub
          </h1>
          <p className="text-xl text-[#7A6A4A] dark:text-[#C4B08A] max-w-3xl mx-auto">
            Access IGCSE past papers with multiple study modes - from auto-marked MCQs to traditional papers with marking schemes and examiner reports.
          </p>
        </div>

        {/* Two Options Grid - Auto-marked is bigger (main feature) */}
        <div className="grid md:grid-cols-3 gap-8 mb-16">
          {/* Option 1: Auto-Marked Papers - MAIN FEATURE (2 columns) */}
          <div className="md:col-span-2 bg-white dark:bg-[#1A1510] rounded-2xl p-8 border-2 border-[#C9A84C] hover:border-[#E2C97A] transition-all duration-300 shadow-xl hover:shadow-2xl relative overflow-hidden">
            {/* Featured Badge */}
            <div className="absolute top-4 right-4 px-3 py-1 bg-gradient-to-r from-[#C9A84C] to-[#E2C97A] text-[#0A0806] text-xs font-bold rounded-full shadow-lg">
              ⭐ FEATURED
            </div>
            <div className="w-16 h-16 bg-gradient-to-br from-[#C9A84C] to-[#E2C97A] rounded-xl flex items-center justify-center mb-6">
              <svg className="w-8 h-8 text-[#0A0806]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <h2 className="text-2xl font-bold text-[#2A1F0E] dark:text-[#E2C97A] mb-3">
              Auto-Marked Papers
            </h2>
            <p className="text-[#7A6A4A] dark:text-[#C4B08A] mb-6 leading-relaxed">
              Practice MCQ papers with instant automatic grading. Get immediate feedback on your answers and track your progress.
            </p>
            
            {/* Features List */}
            <ul className="space-y-2 mb-6">
              <li className="flex items-start gap-2 text-sm text-[#7A6A4A] dark:text-[#C4B08A]">
                <svg className="w-5 h-5 text-[#C9A84C] flex-shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                </svg>
                <span>Instant grading & results</span>
              </li>
              <li className="flex items-start gap-2 text-sm text-[#7A6A4A] dark:text-[#C4B08A]">
                <svg className="w-5 h-5 text-[#C9A84C] flex-shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                </svg>
                <span>Timed exam simulation</span>
              </li>
              <li className="flex items-start gap-2 text-sm text-[#7A6A4A] dark:text-[#C4B08A]">
                <svg className="w-5 h-5 text-[#C9A84C] flex-shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                </svg>
                <span>In-place answer review</span>
              </li>
              <li className="flex items-start gap-2 text-sm text-[#7A6A4A] dark:text-[#C4B08A]">
                <svg className="w-5 h-5 text-[#C9A84C] flex-shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                </svg>
                <span>Performance analytics</span>
              </li>
            </ul>

            <button
              onClick={() => router.push('/igcse/practice?mode=test')}
              className="w-full py-3 bg-gradient-to-r from-[#C9A84C] to-[#E2C97A] text-[#0A0806] rounded-lg font-semibold hover:from-[#E2C97A] hover:to-[#C9A84C] transition-all shadow-lg"
            >
              Start Practice
            </button>

            {/* API Key Option */}
            <div className="mt-4 pt-4 border-t border-[#C9A84C]/20">
              <p className="text-xs text-[#7A6A4A] dark:text-[#C4B08A] mb-2">
                Want to auto-mark your own papers?
              </p>
              <button className="text-sm text-[#C9A84C] hover:text-[#E2C97A] font-medium flex items-center gap-1">
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z" />
                </svg>
                Get API Key
              </button>
            </div>
          </div>

          {/* Option 2: View Past Papers with ER (1 column) */}
          <div className="bg-white dark:bg-[#1A1510] rounded-2xl p-8 border-2 border-[#C9A84C]/30 hover:border-[#C9A84C] transition-all duration-300 shadow-lg hover:shadow-2xl">
            <div className="w-16 h-16 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-xl flex items-center justify-center mb-6">
              <svg className="w-8 h-8 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
            </div>
            <h2 className="text-2xl font-bold text-[#2A1F0E] dark:text-[#E2C97A] mb-3">
              View Past Papers
            </h2>
            <p className="text-[#7A6A4A] dark:text-[#C4B08A] mb-6 leading-relaxed">
              Access traditional past papers with marking schemes side-by-side. Each question includes an "ER" button to view the official examiner report for that specific question.
            </p>

            {/* Features List */}
            <ul className="space-y-2 mb-6">
              <li className="flex items-start gap-2 text-sm text-[#7A6A4A] dark:text-[#C4B08A]">
                <svg className="w-5 h-5 text-blue-500 flex-shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                </svg>
                <span>QP & MS side-by-side</span>
              </li>
              <li className="flex items-start gap-2 text-sm text-[#7A6A4A] dark:text-[#C4B08A]">
                <svg className="w-5 h-5 text-purple-500 flex-shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                </svg>
                <span>ER button per question</span>
              </li>
              <li className="flex items-start gap-2 text-sm text-[#7A6A4A] dark:text-[#C4B08A]">
                <svg className="w-5 h-5 text-blue-500 flex-shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                </svg>
                <span>All subjects & years</span>
              </li>
              <li className="flex items-start gap-2 text-sm text-[#7A6A4A] dark:text-[#C4B08A]">
                <svg className="w-5 h-5 text-purple-500 flex-shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                </svg>
                <span>Examiner insights</span>
              </li>
              <li className="flex items-start gap-2 text-sm text-[#7A6A4A] dark:text-[#C4B08A]">
                <svg className="w-5 h-5 text-blue-500 flex-shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                </svg>
                <span>Download PDFs</span>
              </li>
              <li className="flex items-start gap-2 text-sm text-[#7A6A4A] dark:text-[#C4B08A]">
                <svg className="w-5 h-5 text-purple-500 flex-shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                </svg>
                <span>Common mistakes</span>
              </li>
              <li className="flex items-start gap-2 text-sm text-[#7A6A4A] dark:text-[#C4B08A]">
                <svg className="w-5 h-5 text-blue-500 flex-shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                </svg>
                <span>Organized by session</span>
              </li>
              <li className="flex items-start gap-2 text-sm text-[#7A6A4A] dark:text-[#C4B08A]">
                <svg className="w-5 h-5 text-purple-500 flex-shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                </svg>
                <span>Marking criteria</span>
              </li>
            </ul>

            {/* Example ER Button */}
            <div className="bg-blue-50 dark:bg-[#2A1F0E] rounded-lg p-4 mb-6 border border-blue-200 dark:border-[#C9A84C]/30">
              <p className="text-xs text-blue-900 dark:text-[#C4B08A] mb-2 font-medium">
                💡 Each question includes an "ER" button like this:
              </p>
              <button className="px-3 py-1.5 bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300 rounded-md text-xs font-semibold hover:bg-purple-200 dark:hover:bg-purple-900/50 transition-colors border border-purple-300 dark:border-purple-700">
                ER - View Examiner Report
              </button>
            </div>

            <button
              onClick={() => router.push('/igcse/practice?mode=view')}
              className="w-full py-3 bg-gradient-to-r from-blue-500 to-indigo-600 text-white rounded-lg font-semibold hover:from-blue-600 hover:to-indigo-700 transition-all shadow-lg"
            >
              Browse Papers
            </button>
          </div>
        </div>

      </div>

      <Footer />
    </main>
  );
}

// Made with Bob