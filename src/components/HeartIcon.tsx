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
        fill={filled ? '#7CB9E8' : 'none'}
        stroke={filled ? '#7CB9E8' : 'rgba(180,160,120,0.35)'}
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
        style={{
          filter: filled ? 'drop-shadow(0 0 4px rgba(124,185,232,0.45))' : 'none',
          transition: 'all 0.18s ease',
        }}
      >
        <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
      </svg>
    </button>
  );
};

export const CreatorBadge: React.FC = () => {
  return (
    <span
      style={{ display: 'inline-flex', alignItems: 'center', marginLeft: '5px', verticalAlign: 'middle' }}
      title="Creator"
    >
      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
        {/* Six-pointed minimal star — two overlapping triangles */}
        <polygon
          points="12,2 14.5,9 22,9 16,14 18.5,21 12,17 5.5,21 8,14 2,9 9.5,9"
          fill="none"
          stroke="url(#starGold)"
          strokeWidth="1.4"
          strokeLinejoin="round"
        />
        <defs>
          <linearGradient id="starGold" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#F0D060" />
            <stop offset="50%" stopColor="#C9A84C" />
            <stop offset="100%" stopColor="#A07830" />
          </linearGradient>
        </defs>
      </svg>
    </span>
  );
};

// Made with Bob
