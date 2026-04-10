'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';

interface PaperMetadata {
  id: string;
  subject: string;
  year: number;
  season: string;
  variant: number;
  filename: string;
}

// Season code mapping
const SEASON_CODES: { [key: string]: string } = {
  'm': 'February March',
  's': 'May June',
  'w': 'October November'
};

export default function PracticeSelectionPage() {
  const router = useRouter();
  
  const [availablePapers, setAvailablePapers] = useState<PaperMetadata[]>([]);
  const [loading, setLoading] = useState(true);

  const [selectedSubject, setSelectedSubject] = useState<string>('ICT 0417');
  const [selectedYear, setSelectedYear] = useState<number>(2024);
  const [selectedSeason, setSelectedSeason] = useState<string>('');
  const [selectedVariant, setSelectedVariant] = useState<number>(1);

  // Fetch available papers from public/papers directory
  useEffect(() => {
    async function fetchPapers() {
      try {
        setLoading(true);
        
        // Get list of all JSON files in public/papers
        // We'll parse the filenames to extract metadata
        const papers: PaperMetadata[] = [];
        
        // List of known papers (you can also create an index.json file)
        const paperFiles = [
          'sample_test.json', // Sample paper for testing
          '0417_m20_qp_12.json', '0417_m21_qp_12.json', '0417_m22_qp_12.json',
          '0417_m23_qp_12.json', '0417_m24_qp_12.json', '0417_s20_qp_11.json',
          '0417_s21_qp_11.json', '0417_s21_qp_12.json', '0417_s21_qp_13.json',
          '0417_s22_qp_11.json', '0417_s22_qp_12.json', '0417_s22_qp_13.json',
          '0417_s23_qp_11.json', '0417_s23_qp_12.json', '0417_s23_qp_13.json',
          '0417_s24_qp_11.json', '0417_s24_qp_12.json', '0417_s24_qp_13.json',
          '0417_w20_qp_11.json', '0417_w20_qp_12.json', '0417_w20_qp_13.json',
          '0417_w21_qp_11.json', '0417_w21_qp_12.json', '0417_w21_qp_13.json',
          '0417_w22_qp_11.json', '0417_w22_qp_12.json', '0417_w22_qp_13.json',
          '0417_w23_qp_11.json', '0417_w23_qp_12.json', '0417_w23_qp_13.json'
        ];

        for (const filename of paperFiles) {
          // Handle sample paper
          if (filename === 'sample_test.json') {
            papers.push({
              id: 'sample_test',
              subject: 'ICT 0417',
              year: 2024,
              season: 'Sample',
              variant: 1,
              filename
            });
            continue;
          }

          // Parse filename: 0417_m20_qp_12.json
          // Format: {code}_{seasonCode}{yearShort}_qp_1{variant}.json
          const match = filename.match(/(\d{4})_([msw])(\d{2})_qp_1(\d)\.json/);
          if (!match) continue;

          const [, code, seasonCode, yearShort, variant] = match;
          const year = 2000 + parseInt(yearShort);
          const season = SEASON_CODES[seasonCode];

          papers.push({
            id: filename.replace('.json', ''),
            subject: `ICT ${code}`,
            year,
            season,
            variant: parseInt(variant),
            filename
          });
        }

        setAvailablePapers(papers);
        
        // Auto-select first available options
        if (papers.length > 0) {
          const firstPaper = papers[0];
          setSelectedSubject(firstPaper.subject);
          setSelectedYear(firstPaper.year);
          setSelectedSeason(firstPaper.season);
          setSelectedVariant(firstPaper.variant);
        }
      } catch (err) {
        console.error('Error loading papers:', err);
      } finally {
        setLoading(false);
      }
    }

    fetchPapers();
  }, []);

  // Get unique subjects
  const subjects = useMemo(() => {
    return Array.from(new Set(availablePapers.map(p => p.subject)));
  }, [availablePapers]);

  // Get available years for selected subject
  const availableYears = useMemo(() => {
    return Array.from(new Set(
      availablePapers
        .filter(p => p.subject === selectedSubject)
        .map(p => p.year)
    )).sort((a, b) => b - a);
  }, [availablePapers, selectedSubject]);

  // Get available seasons for selected subject and year
  const availableSeasons = useMemo(() => {
    return Array.from(new Set(
      availablePapers
        .filter(p => p.subject === selectedSubject && p.year === selectedYear)
        .map(p => p.season)
    ));
  }, [availablePapers, selectedSubject, selectedYear]);

  // Get available variants for selected subject, year, and season
  const availableVariants = useMemo(() => {
    return Array.from(new Set(
      availablePapers
        .filter(p => 
          p.subject === selectedSubject && 
          p.year === selectedYear && 
          p.season === selectedSeason
        )
        .map(p => p.variant)
    )).sort();
  }, [availablePapers, selectedSubject, selectedYear, selectedSeason]);

  // Auto-select first available option when filters change
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
    if (availableVariants.length > 0 && !availableVariants.includes(selectedVariant)) {
      setSelectedVariant(availableVariants[0]);
    }
  }, [availableVariants, selectedVariant]);

  // Check if current selection is valid
  const selectedPaper = availablePapers.find(p => 
    p.subject === selectedSubject &&
    p.year === selectedYear &&
    p.season === selectedSeason &&
    p.variant === selectedVariant
  );

  const handleStartPaper = () => {
    if (selectedPaper) {
      router.push(`/practice/${selectedPaper.id}`);
    }
  };

  if (loading) {
    return (
      <div style={{ 
        minHeight: '100vh', 
        background: 'linear-gradient(135deg, #4F46E5 0%, #7C3AED 100%)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        color: 'white',
        fontSize: '1.2rem'
      }}>
        Loading available papers...
      </div>
    );
  }

  return (
    <div style={{ 
      minHeight: '100vh', 
      background: 'linear-gradient(135deg, #4F46E5 0%, #7C3AED 100%)',
      padding: '40px 20px',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center'
    }}>
      <div style={{ 
        maxWidth: '500px',
        width: '100%'
      }}>
        {/* Main Selection Card */}
        <div style={{ 
          background: 'white', 
          padding: '40px', 
          borderRadius: '16px',
          boxShadow: '0 20px 60px rgba(0, 0, 0, 0.3)'
        }}>
          <div style={{ textAlign: 'center', marginBottom: '30px' }}>
            <h1 style={{ 
              fontSize: '2rem', 
              color: '#1a202c', 
              marginBottom: '10px',
              fontWeight: '700'
            }}>
              📚 Practice Papers
            </h1>
            <p style={{ 
              color: '#718096', 
              fontSize: '1rem'
            }}>
              Select a paper to begin your practice session
            </p>
          </div>

          <div style={{ 
            display: 'flex',
            flexDirection: 'column',
            gap: '20px',
            marginBottom: '30px'
          }}>
            {/* Subject Dropdown */}
            <div>
              <label style={{ 
                display: 'block', 
                marginBottom: '8px', 
                fontWeight: '600',
                color: '#2d3748',
                fontSize: '0.9rem'
              }}>
                Subject
              </label>
              <select
                value={selectedSubject}
                onChange={(e) => setSelectedSubject(e.target.value)}
                style={{
                  width: '100%',
                  padding: '14px 16px',
                  fontSize: '1rem',
                  border: '2px solid #e2e8f0',
                  borderRadius: '10px',
                  background: '#f7fafc',
                  cursor: 'pointer',
                  outline: 'none',
                  transition: 'all 0.3s',
                  fontWeight: '500'
                }}
              >
                {subjects.map(subject => (
                  <option key={subject} value={subject}>
                    {subject}
                  </option>
                ))}
              </select>
            </div>

            {/* Year Dropdown */}
            <div>
              <label style={{ 
                display: 'block', 
                marginBottom: '8px', 
                fontWeight: '600',
                color: '#2d3748',
                fontSize: '0.9rem'
              }}>
                Year
              </label>
              <select
                value={selectedYear}
                onChange={(e) => setSelectedYear(Number(e.target.value))}
                style={{
                  width: '100%',
                  padding: '14px 16px',
                  fontSize: '1rem',
                  border: '2px solid #e2e8f0',
                  borderRadius: '10px',
                  background: '#f7fafc',
                  cursor: 'pointer',
                  outline: 'none',
                  transition: 'all 0.3s',
                  fontWeight: '500'
                }}
                disabled={availableYears.length === 0}
              >
                {availableYears.map(year => (
                  <option key={year} value={year}>
                    {year}
                  </option>
                ))}
              </select>
            </div>

            {/* Season Dropdown */}
            <div>
              <label style={{ 
                display: 'block', 
                marginBottom: '8px', 
                fontWeight: '600',
                color: '#2d3748',
                fontSize: '0.9rem'
              }}>
                Season
              </label>
              <select
                value={selectedSeason}
                onChange={(e) => setSelectedSeason(e.target.value)}
                style={{
                  width: '100%',
                  padding: '14px 16px',
                  fontSize: '1rem',
                  border: '2px solid #e2e8f0',
                  borderRadius: '10px',
                  background: '#f7fafc',
                  cursor: 'pointer',
                  outline: 'none',
                  transition: 'all 0.3s',
                  fontWeight: '500'
                }}
                disabled={availableSeasons.length === 0}
              >
                {availableSeasons.map(season => (
                  <option key={season} value={season}>
                    {season}
                  </option>
                ))}
              </select>
            </div>

            {/* Variant Dropdown */}
            <div>
              <label style={{ 
                display: 'block', 
                marginBottom: '8px', 
                fontWeight: '600',
                color: '#2d3748',
                fontSize: '0.9rem'
              }}>
                Variant
              </label>
              <select
                value={selectedVariant}
                onChange={(e) => setSelectedVariant(Number(e.target.value))}
                style={{
                  width: '100%',
                  padding: '14px 16px',
                  fontSize: '1rem',
                  border: '2px solid #e2e8f0',
                  borderRadius: '10px',
                  background: '#f7fafc',
                  cursor: 'pointer',
                  outline: 'none',
                  transition: 'all 0.3s',
                  fontWeight: '500'
                }}
                disabled={availableVariants.length === 0}
              >
                {availableVariants.map(variant => (
                  <option key={variant} value={variant}>
                    Variant {variant}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {!selectedPaper && (
            <div style={{
              background: '#fff5f5',
              border: '2px solid #feb2b2',
              borderRadius: '10px',
              padding: '15px',
              marginBottom: '20px',
              color: '#742a2a',
              textAlign: 'center'
            }}>
              ⚠️ No paper available for this combination
            </div>
          )}

          <button
            onClick={handleStartPaper}
            disabled={!selectedPaper}
            style={{
              width: '100%',
              padding: '16px',
              background: selectedPaper 
                ? 'linear-gradient(135deg, #4F46E5 0%, #7C3AED 100%)'
                : '#cbd5e0',
              color: 'white',
              border: 'none',
              borderRadius: '10px',
              fontSize: '1.1rem',
              fontWeight: '600',
              cursor: selectedPaper ? 'pointer' : 'not-allowed',
              transition: 'all 0.3s',
              boxShadow: selectedPaper ? '0 4px 15px rgba(79, 70, 229, 0.4)' : 'none'
            }}
            onMouseEnter={(e) => {
              if (selectedPaper) {
                e.currentTarget.style.transform = 'translateY(-2px)';
                e.currentTarget.style.boxShadow = '0 6px 20px rgba(79, 70, 229, 0.5)';
              }
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.transform = 'translateY(0)';
              e.currentTarget.style.boxShadow = selectedPaper ? '0 4px 15px rgba(79, 70, 229, 0.4)' : 'none';
            }}
          >
            Start Practice Paper →
          </button>

          <div style={{
            marginTop: '25px',
            padding: '20px',
            background: '#f7fafc',
            borderRadius: '10px',
            border: '1px solid #e2e8f0'
          }}>
            <h3 style={{ 
              margin: '0 0 12px 0', 
              color: '#2d3748', 
              fontSize: '1rem',
              fontWeight: '600'
            }}>
              ✨ What to expect:
            </h3>
            <ul style={{ 
              margin: 0, 
              paddingLeft: '20px', 
              color: '#4a5568',
              fontSize: '0.9rem',
              lineHeight: '1.8'
            }}>
              <li>⏱️ 1 hour 30 minutes timed exam</li>
              <li>📝 Interactive question paper with text inputs</li>
              <li>🎯 Side navigation to jump between questions</li>
              <li>🚩 Mark questions for review</li>
              <li>✅ Track attempted vs unattempted questions</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}

// Made with Bob
