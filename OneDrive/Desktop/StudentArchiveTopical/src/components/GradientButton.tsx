import React from 'react';

interface GradientButtonProps {
  children: React.ReactNode;
  onClick?: () => void;
  variant?: 'pink' | 'blue' | 'cyan' | 'primary';
  type?: 'button' | 'submit' | 'reset';
  disabled?: boolean;
  fullWidth?: boolean;
}

export const GradientButton: React.FC<GradientButtonProps> = ({
  children,
  onClick,
  variant = 'primary',
  type = 'button',
  disabled = false,
  fullWidth = false
}) => {
  const gradients = {
    pink: 'linear-gradient(135deg, #FF69B4, #FF1493)',
    blue: 'linear-gradient(135deg, #93C5FD, #60A5FA)',
    cyan: 'linear-gradient(135deg, #67E8F9, #06B6D4)',
    primary: 'linear-gradient(135deg, #60A5FA, #3B82F6)'
  };

  const borderColors = {
    pink: '#000000',
    blue: '#000000',
    cyan: '#000000',
    primary: '#000000'
  };

  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      style={{
        background: gradients[variant],
        color: 'white',
        border: `4px solid ${borderColors[variant]}`,
        borderRadius: '9999px',
        padding: '0.875rem 2rem',
        fontSize: '1rem',
        fontWeight: '700',
        textTransform: 'uppercase',
        letterSpacing: '0.05em',
        cursor: disabled ? 'not-allowed' : 'pointer',
        transition: 'all 0.15s ease',
        boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)',
        width: fullWidth ? '100%' : 'auto',
        opacity: disabled ? 0.6 : 1,
        position: 'relative',
        overflow: 'hidden'
      }}
      onMouseDown={(e) => {
        if (!disabled) {
          e.currentTarget.style.transform = 'scale(0.95)';
        }
      }}
      onMouseUp={(e) => {
        if (!disabled) {
          e.currentTarget.style.transform = 'scale(1)';
        }
      }}
      onMouseLeave={(e) => {
        if (!disabled) {
          e.currentTarget.style.transform = 'scale(1)';
        }
      }}
      onMouseOver={(e) => {
        if (!disabled) {
          e.currentTarget.style.boxShadow = '0 8px 12px rgba(0, 0, 0, 0.15)';
        }
      }}
      onMouseOut={(e) => {
        if (!disabled) {
          e.currentTarget.style.boxShadow = '0 4px 6px rgba(0, 0, 0, 0.1)';
        }
      }}
    >
      {children}
    </button>
  );
};

// Made with Bob