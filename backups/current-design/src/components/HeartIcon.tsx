import React from 'react';

interface HeartIconProps {
  filled: boolean;
  size?: number;
  onClick?: () => void;
}

export const HeartIcon: React.FC<HeartIconProps> = ({ filled, size = 28, onClick }) => {
  return (
    <button
      onClick={onClick}
      style={{
        background: 'transparent',
        border: 'none',
        cursor: 'pointer',
        padding: '0.5rem',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        transition: 'all 0.2s'
      }}
      onMouseOver={(e) => {
        e.currentTarget.style.transform = 'scale(1.15)';
      }}
      onMouseOut={(e) => {
        e.currentTarget.style.transform = 'scale(1)';
      }}
    >
      <svg
        width={size}
        height={size}
        viewBox="0 0 24 24"
        fill={filled ? 'url(#blueGradient)' : 'none'}
        stroke={filled ? '#60A5FA' : '#9CA3AF'}
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        style={{
          filter: filled
            ? 'drop-shadow(0 4px 6px rgba(147, 197, 253, 0.5)) drop-shadow(0 2px 4px rgba(191, 219, 254, 0.4))'
            : 'drop-shadow(0 1px 2px rgba(0, 0, 0, 0.1))',
          transition: 'all 0.2s'
        }}
      >
        <defs>
          <linearGradient id="blueGradient" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" style={{ stopColor: '#DBEAFE', stopOpacity: 1 }} />
            <stop offset="50%" style={{ stopColor: '#93C5FD', stopOpacity: 1 }} />
            <stop offset="100%" style={{ stopColor: '#60A5FA', stopOpacity: 1 }} />
          </linearGradient>
        </defs>
        <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
      </svg>
    </button>
  );
};

export const CreatorBadge: React.FC = () => {
  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        width: '18px',
        height: '18px',
        background: 'linear-gradient(135deg, #FFD700, #FFA500)',
        borderRadius: '50%',
        fontSize: '0.75rem',
        marginLeft: '0.25rem'
      }}
      title="Creator"
    >
      ⭐
    </span>
  );
};

// Made with Bob
