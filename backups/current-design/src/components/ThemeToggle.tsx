'use client';

import { useEffect, useState } from 'react';
import { useTheme } from './ThemeProvider';

export function ThemeToggle() {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return null;
  }

  return <ThemeToggleButton />;
}

function ThemeToggleButton() {
  const { theme, toggleTheme } = useTheme();
  const [showTooltip, setShowTooltip] = useState(false);

  return (
    <div style={{ position: 'fixed', bottom: '2rem', right: '2rem', zIndex: 1000 }}>
      {/* Tooltip */}
      {showTooltip && (
        <div style={{
          position: 'absolute',
          bottom: '100%',
          right: '0',
          marginBottom: '0.5rem',
          padding: '0.5rem 0.75rem',
          background: '#1f2937',
          color: 'white',
          borderRadius: '0.5rem',
          fontSize: '0.875rem',
          fontWeight: '500',
          whiteSpace: 'nowrap',
          boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)',
          pointerEvents: 'none'
        }}>
          {theme === 'light' ? 'Dark Mode' : 'Light Mode'}
        </div>
      )}
      
      <button
        onClick={toggleTheme}
        onMouseEnter={() => setShowTooltip(true)}
        onMouseLeave={() => setShowTooltip(false)}
        style={{
          width: '3rem',
          height: '3rem',
          borderRadius: '50%',
          background: theme === 'light'
            ? 'linear-gradient(135deg, #FCD34D 0%, #F59E0B 100%)'
            : '#1a1a1a',
          border: 'none',
          cursor: 'pointer',
          boxShadow: theme === 'light'
            ? '0 0 20px rgba(252, 211, 77, 0.5), 0 4px 12px rgba(0, 0, 0, 0.1)'
            : '0 0 0 1px rgba(252, 211, 77, 0.3), 0 0 15px rgba(252, 211, 77, 0.2), 0 4px 12px rgba(0, 0, 0, 0.3)',
          transition: 'all 1s ease',
          overflow: 'hidden',
          position: 'relative'
        }}
        onMouseDown={(e) => {
          e.currentTarget.style.transform = 'scale(0.95)';
        }}
        onMouseUp={(e) => {
          e.currentTarget.style.transform = 'scale(1)';
        }}
        aria-label={`Switch to ${theme === 'light' ? 'dark' : 'light'} mode`}
      >
        {/* Eclipse shadow - slides in from right in dark mode */}
        <div style={{
          position: 'absolute',
          width: '100%',
          height: '100%',
          borderRadius: '50%',
          background: '#0a0a0a',
          transform: theme === 'light' ? 'translateX(100%)' : 'translateX(0)',
          transition: 'transform 1s ease',
          boxShadow: 'inset -4px 0 8px rgba(0, 0, 0, 0.5)'
        }} />
      </button>
    </div>
  );
}

// Made with Bob