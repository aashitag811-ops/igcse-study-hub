'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { getValidPapersForSubject, getPaperDescription, getAllSubjectCodes, getSubjectName } from '@/lib/constants/subjectPaperConfig';
import { getComponentLabel, isComponentDisabled } from '@/lib/constants/syllabusChanges';
import { isTestModeAvailable, getTestModeUnavailableMessage } from '@/lib/constants/testModeSupport';
import StudyModeSelector from './StudyModeSelector';
import { useTheme } from '@/components/ThemeProvider';
import BackButton from '@/components/BackButton';

interface PaperMetadata {
  id: string;
  subject: string;
  subjectCode: string;
  year: number;
  season: string;
  paperComponent: number;
  variant: number;
  filename: string;
  testModeAvailable: boolean;
}

const SEASON_CODES: { [key: string]: string } = {
  'm': 'February March',
  's': 'May June',
  'w': 'October November'
};

export default function PracticeContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const preferredMode = searchParams.get('mode'); // 'test' or 'view'
  const urlSubjectCode = searchParams.get('subject'); // Pre-selected subject from URL
  
  const [availablePapers, setAvailablePapers] = useState<PaperMetadata[]>([]);
  const [loading, setLoading] = useState(true);

  const [selectedSubject, setSelectedSubject] = useState<string>('');
  const [selectedYear, setSelectedYear] = useState<number>(2025); // Default to 2025
  const [selectedSeason, setSelectedSeason] = useState<string>('');
  const [selectedPaperComponent, setSelectedPaperComponent] = useState<number>(1);
  const [selectedVariant, setSelectedVariant] = useState<number>(2);

  useEffect(() => {
    async function fetchPapers() {
      try {
        setLoading(true);
        
        const response = await fetch('/api/available-papers');
        const apiPapers = await response.json();
        
        const papers: PaperMetadata[] = apiPapers.map((paper: any) => {
          const subjectName = getSubjectName(paper.subjectCode);
          const season = SEASON_CODES[paper.session];
          
          return {
            id: paper.id,
            subject: `${subjectName} ${paper.subjectCode}`,
            subjectCode: paper.subjectCode,
            year: paper.year,
            season,
            paperComponent: paper.component,
            variant: paper.variant,
            filename: `${paper.id}.json`,
            testModeAvailable: paper.testModeAvailable ?? false,
          };
        });

        setAvailablePapers(papers);
        
        // Pre-select subject from URL if provided
        if (urlSubjectCode && papers.length > 0) {
          const matchingPaper = papers.find(p => p.subjectCode === urlSubjectCode);
          if (matchingPaper) {
            setSelectedSubject(matchingPaper.subject);
            // Find the latest year (2025) for this subject, or use the first available
            const yearsForSubject = papers
              .filter(p => p.subjectCode === urlSubjectCode)
              .map(p => p.year)
              .sort((a, b) => b - a);
            const targetYear = yearsForSubject.includes(2025) ? 2025 : yearsForSubject[0];
            setSelectedYear(targetYear);
            
            // Set other defaults for this subject/year
            const papersForSubjectYear = papers.filter(p =>
              p.subjectCode === urlSubjectCode && p.year === targetYear
            );
            if (papersForSubjectYear.length > 0) {
              setSelectedSeason(papersForSubjectYear[0].season);
              setSelectedPaperComponent(papersForSubjectYear[0].paperComponent);
              setSelectedVariant(papersForSubjectYear[0].variant);
            }
          } else if (papers.length > 0) {
            // Fallback to first paper
            const firstPaper = papers[0];
            setSelectedSubject(firstPaper.subject);
            setSelectedYear(firstPaper.year);
            setSelectedSeason(firstPaper.season);
            setSelectedPaperComponent(firstPaper.paperComponent);
            setSelectedVariant(firstPaper.variant);
          }
        } else if (papers.length > 0) {
          const firstPaper = papers[0];
          setSelectedSubject(firstPaper.subject);
          setSelectedYear(firstPaper.year);
          setSelectedSeason(firstPaper.season);
          setSelectedPaperComponent(firstPaper.paperComponent);
          setSelectedVariant(firstPaper.variant);
        }
      } catch (err) {
        console.error('Error loading papers:', err);
      } finally {
        setLoading(false);
      }
    }

    fetchPapers();
  }, [urlSubjectCode]);

  // FIX #3: Sort subjects alphabetically
  const subjects = useMemo(() => {
    return Array.from(new Set(availablePapers.map(p => p.subject))).sort((a, b) => a.localeCompare(b));
  }, [availablePapers]);

  const availableYears = useMemo(() => {
    return Array.from(new Set(
      availablePapers
        .filter(p => p.subject === selectedSubject)
        .map(p => p.year)
    )).sort((a, b) => b - a);
  }, [availablePapers, selectedSubject]);

  const availableSeasons = useMemo(() => {
    return Array.from(new Set(
      availablePapers
        .filter(p => p.subject === selectedSubject && p.year === selectedYear)
        .map(p => p.season)
    ));
  }, [availablePapers, selectedSubject, selectedYear]);

  const availablePaperComponents = useMemo(() => {
    return Array.from(new Set(
      availablePapers
        .filter(p =>
          p.subject === selectedSubject &&
          p.year === selectedYear &&
          p.season === selectedSeason
        )
        .map(p => p.paperComponent)
    )).sort();
  }, [availablePapers, selectedSubject, selectedYear, selectedSeason]);

  const availableVariants = useMemo(() => {
    return Array.from(new Set(
      availablePapers
        .filter(p =>
          p.subject === selectedSubject &&
          p.year === selectedYear &&
          p.season === selectedSeason &&
          p.paperComponent === selectedPaperComponent
        )
        .map(p => p.variant)
    )).sort();
  }, [availablePapers, selectedSubject, selectedYear, selectedSeason, selectedPaperComponent]);

  useEffect(() => {
    if (availableYears.length > 0 && !availableYears.includes(selectedYear)) {
      setSelectedYear(availableYears[0]);
    }
  }, [availableYears, selectedYear]);

  useEffect(() => {
    if (availableSeasons.length > 0 && !availableSeasons.includes(selectedSeason)) {
      setSelectedSeason(availableSeasons[0]);
    }
  }, [availableSeasons, selectedSeason]);

  useEffect(() => {
    if (availablePaperComponents.length > 0 && !availablePaperComponents.includes(selectedPaperComponent)) {
      setSelectedPaperComponent(availablePaperComponents[0]);
    }
  }, [availablePaperComponents, selectedPaperComponent]);

  useEffect(() => {
    if (availableVariants.length > 0 && !availableVariants.includes(selectedVariant)) {
      setSelectedVariant(availableVariants[0]);
    }
  }, [availableVariants, selectedVariant]);

  const selectedPaper = availablePapers.find(p =>
    p.subject === selectedSubject &&
    p.year === selectedYear &&
    p.season === selectedSeason &&
    p.paperComponent === selectedPaperComponent &&
    p.variant === selectedVariant
  );

  const subjectCode = selectedSubject.split(' ').pop() || '';

  // Test mode is only available if the selected paper has image-based MCQ questions
  const testModeEnabled = selectedPaper?.testModeAvailable ?? false;

  const handleViewPastPapers = () => {
    if (selectedPaper) {
      router.push(`/igcse/view-papers/${selectedPaper.id}`);
    }
  };

  const handleStartPractice = () => {
    // testModeEnabled is only true when the paper has full image-based MCQ
    if (selectedPaper && testModeEnabled) {
      router.push(`/igcse/mcq-exam/${selectedPaper.id}`);
    }
  };

  const handleStartPracticeMode = () => {
    if (selectedPaper && testModeEnabled) {
      router.push(`/practice/${selectedPaper.id}`);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="text-center space-y-4">
          <div className="w-16 h-16 border-4 border-amber-500/30 border-t-amber-500 rounded-full animate-spin mx-auto"></div>
          <p className="text-lg font-light text-slate-600">Loading archive collection...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen py-12 px-4 bg-slate-50">
      <BackButton />
      <div className="max-w-7xl mx-auto space-y-8">
        {/* Header */}
        <div className="text-center space-y-3">
          <div className="flex items-center justify-center gap-3 mb-4">
            <div className="w-12 h-12 bg-gradient-to-br from-amber-500 to-amber-600 rounded-xl flex items-center justify-center shadow-lg">
              <svg className="w-7 h-7 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
              </svg>
            </div>
          </div>
          <h1 className="font-serif text-4xl font-medium tracking-wide text-amber-600">
            Select Your Past Paper
          </h1>
          <p className="text-lg font-light max-w-2xl mx-auto text-slate-600">
            Choose your subject, year, and paper to begin studying
          </p>
        </div>

        {/* Main Selection Card */}
        <div className="bg-white rounded-3xl p-8 shadow-xl border border-slate-200">
          
          {/* Filter Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
            {/* Subject Dropdown */}
            <div>
              <label className="block text-xs font-medium tracking-wider uppercase mb-2 text-slate-600">
                Subject Discipline
              </label>
              <select
                value={selectedSubject}
                onChange={(e) => setSelectedSubject(e.target.value)}
                className="w-full px-4 py-3.5 rounded-xl font-medium bg-white border border-slate-300 text-slate-900 focus:border-amber-500/50 focus:ring-2 focus:ring-amber-500/20 transition-all appearance-none cursor-pointer custom-scrollbar"
              >
                <option value="">Select Subject</option>
                {subjects.map(subject => (
                  <option key={subject} value={subject}>
                    {subject}
                  </option>
                ))}
              </select>
            </div>

            {/* Year Dropdown */}
            <div>
              <label className="block text-xs font-medium tracking-wider uppercase mb-2 text-slate-600">
                Examination Year
              </label>
              <select
                value={selectedYear}
                onChange={(e) => setSelectedYear(Number(e.target.value))}
                disabled={availableYears.length === 0}
                className="w-full px-4 py-3.5 rounded-xl font-medium bg-white border border-slate-300 text-slate-900 focus:border-amber-500/50 focus:ring-2 focus:ring-amber-500/20 transition-all appearance-none cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <option value="">Select Year</option>
                {availableYears.map(year => (
                  <option key={year} value={year}>
                    {year}
                  </option>
                ))}
              </select>
            </div>

            {/* Season Dropdown */}
            <div className="md:col-span-2">
              <label className="block text-xs font-medium tracking-wider uppercase mb-2 text-slate-600">
                Assessment Session
              </label>
              <select
                value={selectedSeason}
                onChange={(e) => setSelectedSeason(e.target.value)}
                disabled={availableSeasons.length === 0}
                className="w-full px-4 py-3.5 rounded-xl font-medium bg-white border border-slate-300 text-slate-900 focus:border-amber-500/50 focus:ring-2 focus:ring-amber-500/20 transition-all appearance-none cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <option value="">Select Session</option>
                {availableSeasons.map(season => (
                  <option key={season} value={season}>
                    {season}
                  </option>
                ))}
              </select>
            </div>

            {/* Paper Component Dropdown */}
            <div>
              <label className="block text-xs font-medium tracking-wider uppercase mb-2 text-slate-600">
                Paper Component
              </label>
              <select
                value={selectedPaperComponent}
                onChange={(e) => setSelectedPaperComponent(Number(e.target.value))}
                disabled={availablePaperComponents.length === 0}
                className="w-full px-4 py-3.5 rounded-xl font-medium bg-white border border-slate-300 text-slate-900 focus:border-amber-500/50 focus:ring-2 focus:ring-amber-500/20 transition-all appearance-none cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <option value="">Select Paper</option>
                {availablePaperComponents.map(component => {
                  const subjectCode = selectedSubject.split(' ').pop();
                  const description = getPaperDescription(subjectCode || '', component, selectedYear);
                  const syllabusLabel = getComponentLabel(subjectCode || '', component.toString(), selectedYear);
                  const disabled = isComponentDisabled(subjectCode || '', component.toString(), selectedYear);
                  
                  let displayText = description;
                  if (syllabusLabel) {
                    displayText += ` ${syllabusLabel.icon || ''} [${syllabusLabel.label}]`;
                  }
                  
                  return (
                    <option key={component} value={component} disabled={disabled}>
                      {displayText}
                    </option>
                  );
                })}
              </select>
              
              {selectedPaperComponent && (() => {
                const subjectCode = selectedSubject.split(' ').pop();
                const syllabusLabel = getComponentLabel(subjectCode || '', selectedPaperComponent.toString(), selectedYear);
                if (syllabusLabel && !syllabusLabel.disabled) {
                  return (
                    <div className="mt-2 px-3 py-2 rounded-lg bg-amber-50 border border-amber-200">
                      <p className="text-sm flex items-center gap-2 text-amber-700">
                        {syllabusLabel.icon && <span className="text-lg">{syllabusLabel.icon}</span>}
                        <span className="font-medium">{syllabusLabel.label}</span>
                      </p>
                    </div>
                  );
                }
                return null;
              })()}
            </div>

            {/* Variant Dropdown */}
            <div>
              <label className="block text-xs font-medium tracking-wider uppercase mb-2 text-slate-600">
                Paper Variant
              </label>
              <select
                value={selectedVariant}
                onChange={(e) => setSelectedVariant(Number(e.target.value))}
                disabled={availableVariants.length === 0}
                className="w-full px-4 py-3.5 rounded-xl font-medium bg-white border border-slate-300 text-slate-900 focus:border-amber-500/50 focus:ring-2 focus:ring-amber-500/20 transition-all appearance-none cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <option value="">Select Variant</option>
                {availableVariants.map(variant => (
                  <option key={variant} value={variant}>
                    Variant {variant}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {!selectedPaper && (
            <div className="rounded-xl p-4 mb-6 text-center bg-red-50 border border-red-200">
              <p className="text-sm font-medium text-red-700">
                ⚠️ No examination paper available for this parameter combination
              </p>
            </div>
          )}
        </div>

        {/* Study Mode Selector Component */}
        <StudyModeSelector
          onViewPapers={handleViewPastPapers}
          onStartPractice={handleStartPractice}
          onStartPracticeMode={handleStartPracticeMode}
          isPaperSelected={!!selectedPaper}
          isTestModeEnabled={testModeEnabled}
          testModeMessage={getTestModeUnavailableMessage()}
          preferredMode={preferredMode || undefined}
        />
      </div>
    </div>
  );
}

// Made with Bob