'use client';

import React from 'react';

interface MCQTimerProps {
  timeRemaining: number; // in seconds
}

export function MCQTimer({ timeRemaining }: MCQTimerProps) {
  const minutes = Math.floor(timeRemaining / 60);
  const seconds = timeRemaining % 60;
  
  const isLowTime = timeRemaining < 300; // Less than 5 minutes
  const isCritical = timeRemaining < 60; // Less than 1 minute

  return (
    <div className={`
      flex items-center gap-3 px-6 py-3 rounded-xl border-2 font-mono text-lg font-bold
      ${isCritical 
        ? 'bg-red-50 dark:bg-red-900/20 border-red-500 text-red-700 dark:text-red-300 animate-pulse' 
        : isLowTime 
        ? 'bg-orange-50 dark:bg-orange-900/20 border-orange-500 text-orange-700 dark:text-orange-300'
        : 'bg-green-50 dark:bg-green-900/20 border-green-500 text-green-700 dark:text-green-300'
      }
    `}>
      <svg 
        className="w-6 h-6" 
        fill="none" 
        viewBox="0 0 24 24" 
        stroke="currentColor"
      >
        <path 
          strokeLinecap="round" 
          strokeLinejoin="round" 
          strokeWidth={2} 
          d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" 
        />
      </svg>
      <span className="text-2xl">
        {String(minutes).padStart(2, '0')}:{String(seconds).padStart(2, '0')}
      </span>
    </div>
  );
}

// Made with Bob
