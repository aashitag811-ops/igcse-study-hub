'use client';

import { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';

interface FilterState {
  subject: string;
  year: string;
  session: string;
}

export default function MCQSelectionDashboard() {
  const router = useRouter();
  const searchParams = useSearchParams();
  
  // Get subject from URL parameter (e.g., /mcq-test?subject=0610)
  const urlSubject = searchParams.get('subject');
  
  const [filters, setFilters] = useState<FilterState>({
    subject: urlSubject || '', // Auto-select if coming from subject page
    year: '',
    session: ''
  });
  
  // Update subject if URL parameter changes
  useEffect(() => {
    if (urlSubject && urlSubject !== filters.subject) {
      setFilters(prev => ({ ...prev, subject: urlSubject }));
    }
  }, [urlSubject]);

  const subjects = [
    { code: '0610', name: 'Biology' },
    { code: '0620', name: 'Chemistry' },
    { code: '0625', name: 'Physics' },
    { code: '0455', name: 'Economics' }
  ];
  const years = ['2020', '2021', '2022', '2023', '2024', '2025'];
  const sessions = ['Feb/March', 'May/June', 'Oct/Nov'];

  const handleFilterChange = (key: keyof FilterState, value: string) => {
    setFilters(prev => ({ ...prev, [key]: value }));
  };

  const canLoadPaper = Object.values(filters).every(v => v !== '');

  const getPaperCode = () => {
    const sessionCode = filters.session === 'Feb/March' ? 'm' : filters.session === 'May/June' ? 's' : 'w';
    const yearCode = filters.year.slice(-2);
    return `${filters.subject}_${sessionCode}${yearCode}_qp_22`;
  };

  const handleViewPastPapers = () => {
    if (canLoadPaper) {
      const paperCode = getPaperCode();
      console.log('Opening View Past Papers Mode:', paperCode);
      router.push(`/view-papers/${paperCode}`);
    }
  };

  const handleStartPractice = () => {
    if (canLoadPaper) {
      const paperCode = getPaperCode();
      console.log('Starting Practice Test:', paperCode);
      router.push(`/mcq-exam/${paperCode}`);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 dark:from-slate-900 dark:to-slate-800">
      {/* Header */}
      <div className="bg-white dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-slate-900 dark:text-white">
                📝 MCQ Practice System
              </h1>
              <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">
                Select your exam paper to begin
              </p>
            </div>
            <button
              onClick={() => router.push('/')}
              className="px-4 py-2 text-sm font-medium text-slate-700 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white transition-colors"
            >
              ← Back to Home
            </button>
          </div>
        </div>
      </div>

      {/* Selection Dashboard */}
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl p-8">
          <div className="mb-8">
            <h2 className="text-2xl font-bold text-slate-900 dark:text-white mb-2">
              📚 Practice Papers Selection
            </h2>
            <p className="text-slate-600 dark:text-slate-400">
              Choose your paper and select how you want to study
            </p>
          </div>

          {/* Dropdown Filters */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
            {/* Subject */}
            <div>
              <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">
                Subject
              </label>
              <select
                value={filters.subject}
                onChange={(e) => handleFilterChange('subject', e.target.value)}
                className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-700 border-2 border-slate-300 dark:border-slate-600 rounded-lg text-slate-900 dark:text-white font-medium focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition-all"
              >
                <option value="">Select Subject</option>
                {subjects.map(subject => (
                  <option key={subject.code} value={subject.code}>
                    {subject.name} ({subject.code})
                  </option>
                ))}
              </select>
            </div>

            {/* Year */}
            <div>
              <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">
                Year
              </label>
              <select
                value={filters.year}
                onChange={(e) => handleFilterChange('year', e.target.value)}
                className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-700 border-2 border-slate-300 dark:border-slate-600 rounded-lg text-slate-900 dark:text-white font-medium focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition-all"
              >
                <option value="">Select Year</option>
                {years.map(year => (
                  <option key={year} value={year}>{year}</option>
                ))}
              </select>
            </div>

            {/* Session */}
            <div>
              <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">
                Session
              </label>
              <select
                value={filters.session}
                onChange={(e) => handleFilterChange('session', e.target.value)}
                className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-700 border-2 border-slate-300 dark:border-slate-600 rounded-lg text-slate-900 dark:text-white font-medium focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition-all"
              >
                <option value="">Select Session</option>
                {sessions.map(session => (
                  <option key={session} value={session}>{session}</option>
                ))}
              </select>
            </div>

          </div>

          {/* Selected Paper Summary */}
          {canLoadPaper && (
            <div className="mb-8 p-6 bg-blue-50 dark:bg-blue-900/20 border-l-4 border-blue-500 rounded-lg">
              <h3 className="font-bold text-blue-900 dark:text-blue-100 mb-3">
                Selected Paper
              </h3>
              <div className="space-y-2 text-sm text-blue-800 dark:text-blue-200">
                <p><strong>Board:</strong> IGCSE</p>
                <p><strong>Subject:</strong> {subjects.find(s => s.code === filters.subject)?.name} ({filters.subject})</p>
                <p><strong>Year:</strong> {filters.year}</p>
                <p><strong>Session:</strong> {filters.session}</p>
                <p><strong>Paper:</strong> Paper 22 (Variant 2)</p>
              </div>
            </div>
          )}

          {/* Mode Selection Section */}
          <div className="mb-6">
            <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-4 flex items-center gap-2">
              ⚡ What do you want to do?
            </h3>
            <p className="text-sm text-slate-600 dark:text-slate-400 mb-6">
              Choose your study approach below
            </p>
          </div>

          {/* Two Action Buttons */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* View Past Papers Mode Button */}
            <button
              onClick={handleViewPastPapers}
              disabled={!canLoadPaper}
              className={`
                group relative p-6 rounded-xl border-2 transition-all duration-200 text-left
                ${canLoadPaper
                  ? 'border-blue-500 bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 hover:shadow-xl hover:scale-[1.02] cursor-pointer'
                  : 'border-slate-300 dark:border-slate-600 bg-slate-100 dark:bg-slate-700/50 cursor-not-allowed opacity-60'
                }
              `}
            >
              <div className="flex items-start gap-4">
                <div className={`
                  flex-shrink-0 w-12 h-12 rounded-lg flex items-center justify-center
                  ${canLoadPaper
                    ? 'bg-blue-500 text-white'
                    : 'bg-slate-400 dark:bg-slate-600 text-slate-200'
                  }
                `}>
                  <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                  </svg>
                </div>
                <div className="flex-1">
                  <h4 className={`font-bold text-lg mb-2 ${canLoadPaper ? 'text-blue-900 dark:text-blue-100' : 'text-slate-500 dark:text-slate-400'}`}>
                    📑 View Past Paper Mode
                  </h4>
                  <p className={`text-sm mb-3 ${canLoadPaper ? 'text-slate-700 dark:text-slate-300' : 'text-slate-500 dark:text-slate-400'}`}>
                    Side-by-side QP & MS with Examiner Report insights
                  </p>
                  <div className={`flex flex-wrap gap-2 text-xs ${canLoadPaper ? 'text-blue-700 dark:text-blue-300' : 'text-slate-400'}`}>
                    <span className="flex items-center gap-1">
                      <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                      </svg>
                      Study Desk Layout
                    </span>
                    <span className="flex items-center gap-1">
                      <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                      </svg>
                      Auto-Sync Scroll
                    </span>
                    <span className="flex items-center gap-1">
                      <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                      </svg>
                      ER Insights
                    </span>
                  </div>
                </div>
              </div>
              {canLoadPaper && (
                <div className="absolute bottom-4 right-4 text-blue-500 group-hover:translate-x-1 transition-transform">
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </div>
              )}
            </button>

            {/* Start Practice Run Button */}
            <button
              onClick={handleStartPractice}
              disabled={!canLoadPaper}
              className={`
                group relative p-6 rounded-xl border-2 transition-all duration-200 text-left
                ${canLoadPaper
                  ? 'border-purple-500 bg-gradient-to-br from-purple-50 to-pink-50 dark:from-purple-900/20 dark:to-pink-900/20 hover:shadow-xl hover:scale-[1.02] cursor-pointer'
                  : 'border-slate-300 dark:border-slate-600 bg-slate-100 dark:bg-slate-700/50 cursor-not-allowed opacity-60'
                }
              `}
            >
              <div className="flex items-start gap-4">
                <div className={`
                  flex-shrink-0 w-12 h-12 rounded-lg flex items-center justify-center
                  ${canLoadPaper
                    ? 'bg-purple-500 text-white'
                    : 'bg-slate-400 dark:bg-slate-600 text-slate-200'
                  }
                `}>
                  <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <div className="flex-1">
                  <h4 className={`font-bold text-lg mb-2 ${canLoadPaper ? 'text-purple-900 dark:text-purple-100' : 'text-slate-500 dark:text-slate-400'}`}>
                    ⏱️ Start Practice Run
                  </h4>
                  <p className={`text-sm mb-3 ${canLoadPaper ? 'text-slate-700 dark:text-slate-300' : 'text-slate-500 dark:text-slate-400'}`}>
                    Timed exam environment with score tracking
                  </p>
                  <div className={`flex flex-wrap gap-2 text-xs ${canLoadPaper ? 'text-purple-700 dark:text-purple-300' : 'text-slate-400'}`}>
                    <span className="flex items-center gap-1">
                      <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                      </svg>
                      Interactive Test
                    </span>
                    <span className="flex items-center gap-1">
                      <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                      </svg>
                      Timer & Scoring
                    </span>
                    <span className="flex items-center gap-1">
                      <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                      </svg>
                      Instant Review
                    </span>
                  </div>
                </div>
              </div>
              {canLoadPaper && (
                <div className="absolute bottom-4 right-4 text-purple-500 group-hover:translate-x-1 transition-transform">
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </div>
              )}
            </button>
          </div>

          {/* Helper Text */}
          {!canLoadPaper && (
            <p className="text-center text-sm text-slate-500 dark:text-slate-400 mt-6">
              Please select all filters above to enable study modes
            </p>
          )}
        </div>
      </div>
    </div>
  );
}

// Made with Bob
