'use client';

import { useState, useEffect } from 'react';
import Image from 'next/image';

interface Question {
  questionNumber: number;
  imageUrl: string;
  optionPositions?: {
    A?: { x: number; y: number };
    B?: { x: number; y: number };
    C?: { x: number; y: number };
    D?: { x: number; y: number };
  };
}

interface PaperData {
  paperCode: string;
  paperName: string;
  totalQuestions: number;
  questions: Question[];
}

export default function PositionAdjusterPage() {
  const [paperData, setPaperData] = useState<PaperData | null>(null);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [selectedLetter, setSelectedLetter] = useState<'A' | 'B' | 'C' | 'D' | null>('A');
  const [imageSize, setImageSize] = useState({ width: 0, height: 0 });
  const [isSaving, setIsSaving] = useState(false);

  // Load paper data
  useEffect(() => {
    loadPaper('0610_m20_qp_22');
  }, []);

  const loadPaper = async (paperCode: string) => {
    try {
      const response = await fetch(`/papers/${paperCode}.json?t=${Date.now()}`);
      const data = await response.json();
      setPaperData(data);
    } catch (error) {
      console.error('Error loading paper:', error);
      alert('Failed to load paper');
    }
  };

  const handleImageClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!selectedLetter || !paperData) return;

    const rect = e.currentTarget.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * 100;
    const y = ((e.clientY - rect.top) / rect.height) * 100;

    // Update position for current question
    const updatedQuestions = [...paperData.questions];
    const currentQuestion = updatedQuestions[currentQuestionIndex];
    
    if (!currentQuestion.optionPositions) {
      currentQuestion.optionPositions = {};
    }
    
    currentQuestion.optionPositions[selectedLetter] = {
      x: Math.round(x * 100) / 100,
      y: Math.round(y * 100) / 100
    };

    setPaperData({ ...paperData, questions: updatedQuestions });

    // Auto-advance to next letter
    if (selectedLetter === 'A') setSelectedLetter('B');
    else if (selectedLetter === 'B') setSelectedLetter('C');
    else if (selectedLetter === 'C') setSelectedLetter('D');
    else if (selectedLetter === 'D') {
      // All letters done, move to next question
      if (currentQuestionIndex < paperData.totalQuestions - 1) {
        setCurrentQuestionIndex(currentQuestionIndex + 1);
        setSelectedLetter('A');
      } else {
        setSelectedLetter(null);
        alert('All questions completed! Click Save to download.');
      }
    }
  };

  const handleSave = () => {
    if (!paperData) return;

    setIsSaving(true);
    
    // Create download
    const dataStr = JSON.stringify(paperData, null, 2);
    const dataBlob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(dataBlob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${paperData.paperCode}_adjusted.json`;
    link.click();
    URL.revokeObjectURL(url);

    setIsSaving(false);
    alert('Positions saved! Replace the original JSON file with this one.');
  };

  const handlePrevious = () => {
    if (currentQuestionIndex > 0) {
      setCurrentQuestionIndex(currentQuestionIndex - 1);
      setSelectedLetter('A');
    }
  };

  const handleNext = () => {
    if (paperData && currentQuestionIndex < paperData.totalQuestions - 1) {
      setCurrentQuestionIndex(currentQuestionIndex + 1);
      setSelectedLetter('A');
    }
  };

  const handleSkip = () => {
    if (paperData && currentQuestionIndex < paperData.totalQuestions - 1) {
      setCurrentQuestionIndex(currentQuestionIndex + 1);
      setSelectedLetter('A');
    }
  };

  if (!paperData) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading paper...</p>
        </div>
      </div>
    );
  }

  const currentQuestion = paperData.questions[currentQuestionIndex];
  const positions = currentQuestion.optionPositions || {};

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 shadow-sm sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Position Adjuster</h1>
              <p className="text-sm text-gray-600">{paperData.paperName}</p>
            </div>
            <button
              onClick={handleSave}
              disabled={isSaving}
              className="px-6 py-2 bg-green-600 text-white rounded-lg font-semibold hover:bg-green-700 disabled:bg-gray-400 transition-colors"
            >
              {isSaving ? 'Saving...' : 'Save & Download'}
            </button>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Left Panel - Instructions */}
          <div className="lg:col-span-1">
            <div className="bg-white rounded-lg shadow-md p-6 sticky top-24">
              <h2 className="text-lg font-bold text-gray-900 mb-4">Instructions</h2>
              
              <div className="space-y-4">
                <div className="p-4 bg-blue-50 rounded-lg border-2 border-blue-200">
                  <p className="font-bold text-blue-900 mb-2">Currently Placing:</p>
                  <div className="text-4xl font-bold text-blue-600 text-center">
                    {selectedLetter || '✓ Done'}
                  </div>
                </div>

                <div className="space-y-2 text-sm text-gray-700">
                  <p><strong>1.</strong> Click on the center of letter <strong>{selectedLetter}</strong> in the image</p>
                  <p><strong>2.</strong> The tool will auto-advance to the next letter</p>
                  <p><strong>3.</strong> After D, it moves to the next question</p>
                  <p><strong>4.</strong> Click "Save" when all 40 questions are done</p>
                </div>

                <div className="pt-4 border-t border-gray-200">
                  <p className="text-sm font-semibold text-gray-700 mb-2">Progress:</p>
                  <div className="flex items-center gap-2">
                    <div className="flex-1 bg-gray-200 rounded-full h-2">
                      <div 
                        className="bg-blue-600 h-2 rounded-full transition-all"
                        style={{ width: `${((currentQuestionIndex + 1) / paperData.totalQuestions) * 100}%` }}
                      ></div>
                    </div>
                    <span className="text-sm font-medium text-gray-700">
                      {currentQuestionIndex + 1}/{paperData.totalQuestions}
                    </span>
                  </div>
                </div>

                <div className="pt-4 border-t border-gray-200">
                  <p className="text-sm font-semibold text-gray-700 mb-2">Current Positions:</p>
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    {['A', 'B', 'C', 'D'].map(letter => {
                      const pos = positions[letter as 'A' | 'B' | 'C' | 'D'];
                      return (
                        <div key={letter} className={`p-2 rounded ${pos ? 'bg-green-50 border border-green-200' : 'bg-gray-50 border border-gray-200'}`}>
                          <span className="font-bold">{letter}:</span> {pos ? `${pos.x.toFixed(1)}%, ${pos.y.toFixed(1)}%` : 'Not set'}
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Right Panel - Image */}
          <div className="lg:col-span-2">
            <div className="bg-white rounded-lg shadow-md p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-bold text-gray-900">
                  Question {currentQuestion.questionNumber}
                </h2>
                <div className="flex gap-2">
                  <button
                    onClick={handlePrevious}
                    disabled={currentQuestionIndex === 0}
                    className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg font-medium hover:bg-gray-300 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    ← Previous
                  </button>
                  <button
                    onClick={handleSkip}
                    className="px-4 py-2 bg-yellow-500 text-white rounded-lg font-medium hover:bg-yellow-600"
                  >
                    Skip →
                  </button>
                  <button
                    onClick={handleNext}
                    disabled={currentQuestionIndex === paperData.totalQuestions - 1}
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Next →
                  </button>
                </div>
              </div>

              {/* Clickable Image */}
              <div 
                className="relative bg-gray-100 rounded-lg overflow-hidden cursor-crosshair border-4 border-blue-300"
                onClick={handleImageClick}
                style={{ minHeight: '600px' }}
              >
                <Image
                  src={`${currentQuestion.imageUrl}?v=${Date.now()}`}
                  alt={`Question ${currentQuestion.questionNumber}`}
                  width={1200}
                  height={1000}
                  className="w-full h-auto"
                  unoptimized
                  onLoad={(e) => {
                    const img = e.target as HTMLImageElement;
                    setImageSize({ width: img.naturalWidth, height: img.naturalHeight });
                  }}
                />

                {/* Show existing positions */}
                {Object.entries(positions).map(([letter, pos]) => (
                  <div
                    key={letter}
                    className="absolute w-6 h-6 rounded-full border-2 border-green-500 bg-green-500/30 flex items-center justify-center text-xs font-bold text-white pointer-events-none"
                    style={{
                      left: `${pos.x}%`,
                      top: `${pos.y}%`,
                      transform: 'translate(-50%, -50%)'
                    }}
                  >
                    {letter}
                  </div>
                ))}

                {/* Crosshair indicator - moved to top right to not block content */}
                {selectedLetter && (
                  <div className="absolute top-4 right-4 bg-blue-600 text-white px-4 py-2 rounded-lg font-bold shadow-lg pointer-events-none">
                    Click to place: {selectedLetter}
                  </div>
                )}
              </div>

              <p className="text-sm text-gray-600 mt-4 text-center">
                Click on the center of letter <strong>{selectedLetter}</strong> to set its position
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// Made with Bob
