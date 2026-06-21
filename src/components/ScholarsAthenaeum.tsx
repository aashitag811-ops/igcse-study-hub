ome 'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useRouter } from 'next/navigation';

interface Subject {
  readonly name: string;
  readonly code: string;
  readonly icon: string;
  readonly color: string;
}

interface ScholarsAthenaeumProps {
  subjects: readonly Subject[];
  subjectCounts: Record<string, number>;
}

export default function ScholarsAthenaeum({ subjects, subjectCounts }: ScholarsAthenaeumProps) {
  const [hoveredSubject, setHoveredSubject] = useState<string | null>(null);
  const [selectedSubject, setSelectedSubject] = useState<string | null>(null);
  const router = useRouter();

  const handleSubjectClick = (code: string) => {
    setSelectedSubject(code);
    setTimeout(() => {
      router.push(`/subject/${code}`);
    }, 600);
  };

  return (
    <div style={{
      position: 'relative',
      minHeight: '100vh',
      width: '100%',
      overflow: 'hidden',
    }}>
      {/* Real Library Photo Background */}
      <div style={{
        position: 'absolute',
        inset: 0,
        backgroundImage: 'url("https://images.unsplash.com/photo-1521587760476-6c12a4b040da?q=80&w=2070")',
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        backgroundRepeat: 'no-repeat',
        filter: hoveredSubject ? 'brightness(0.4)' : 'brightness(0.5)',
        transition: 'filter 0.5s ease',
      }} />

      {/* Dark overlay for better text contrast */}
      <div style={{
        position: 'absolute',
        inset: 0,
        background: 'linear-gradient(to bottom, rgba(0,0,0,0.3) 0%, rgba(0,0,0,0.5) 100%)',
      }} />

      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8, delay: 0.2 }}
        style={{
          position: 'relative',
          zIndex: 10,
          textAlign: 'center',
          paddingTop: '4rem',
          paddingBottom: '2rem',
        }}
      >
        <h1 style={{
          fontSize: '3.5rem',
          fontWeight: '700',
          fontFamily: "'Cinzel', serif",
          color: '#f4e4c1',
          letterSpacing: '0.2em',
          textShadow: '0 4px 12px rgba(0,0,0,0.8), 0 0 40px rgba(244,228,193,0.3)',
          margin: '0 0 0.5rem 0',
        }}>
          THE SCHOLAR'S ATHENAEUM
        </h1>
        <p style={{
          fontSize: '1.1rem',
          fontFamily: "'Crimson Text', serif",
          color: '#d4c4a8',
          letterSpacing: '0.15em',
          textShadow: '0 2px 8px rgba(0,0,0,0.9)',
          fontStyle: 'italic',
        }}>
          Hover over any shelf to reveal its contents • Click to enter
        </p>
      </motion.div>

      {/* Subject Cards Grid */}
      <div style={{
        position: 'relative',
        zIndex: 5,
        maxWidth: '1400px',
        margin: '0 auto',
        padding: '2rem',
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
        gap: '2rem',
      }}>
        {subjects.map((subject, index) => {
          const isHovered = hoveredSubject === subject.code;
          const isSelected = selectedSubject === subject.code;
          const resourceCount = subjectCounts[subject.code] || 0;

          return (
            <motion.div
              key={subject.code}
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: index * 0.08 }}
              onHoverStart={() => setHoveredSubject(subject.code)}
              onHoverEnd={() => setHoveredSubject(null)}
              onClick={() => handleSubjectClick(subject.code)}
              style={{
                cursor: 'pointer',
                position: 'relative',
              }}
            >
              <motion.div
                animate={
                  isSelected ? {
                    scale: 1.1,
                    rotateY: 180,
                  } :
                  isHovered ? {
                    scale: 1.05,
                    y: -8,
                  } : {}
                }
                transition={{
                  type: 'spring',
                  stiffness: 200,
                  damping: 20,
                }}
                style={{
                  background: isHovered 
                    ? 'rgba(20, 15, 10, 0.95)' 
                    : 'rgba(20, 15, 10, 0.85)',
                  backdropFilter: 'blur(12px)',
                  border: '2px solid rgba(212, 175, 55, 0.3)',
                  borderRadius: '12px',
                  padding: '2rem',
                  boxShadow: isHovered
                    ? '0 20px 40px rgba(0,0,0,0.8), 0 0 30px rgba(212,175,55,0.2)'
                    : '0 10px 25px rgba(0,0,0,0.6)',
                  transition: 'all 0.3s ease',
                }}
              >
                {/* Icon */}
                <div style={{
                  fontSize: '3rem',
                  marginBottom: '1rem',
                  filter: 'drop-shadow(0 4px 8px rgba(0,0,0,0.8))',
                  textAlign: 'center',
                }}>
                  {subject.icon}
                </div>

                {/* Subject Name */}
                <h3 style={{
                  fontSize: '1.5rem',
                  fontWeight: '700',
                  fontFamily: "'Cinzel', serif",
                  color: '#d4af37',
                  letterSpacing: '0.1em',
                  textAlign: 'center',
                  marginBottom: '0.5rem',
                  textShadow: '0 2px 6px rgba(0,0,0,0.8)',
                }}>
                  {subject.name.toUpperCase()}
                </h3>

                {/* Divider */}
                <div style={{
                  width: '60%',
                  height: '2px',
                  background: 'linear-gradient(to right, transparent, rgba(212,175,55,0.5), transparent)',
                  margin: '1rem auto',
                }} />

                {/* Resource Count */}
                <div style={{
                  textAlign: 'center',
                  fontSize: '0.95rem',
                  color: '#c4b49a',
                  fontFamily: "'Crimson Text', serif",
                  letterSpacing: '0.05em',
                }}>
                  {resourceCount > 0 ? (
                    <>
                      <span style={{ fontWeight: '600', color: '#d4af37' }}>
                        {resourceCount}
                      </span>
                      {' '}
                      {resourceCount === 1 ? 'Resource' : 'Resources'}
                    </>
                  ) : (
                    <span style={{ fontStyle: 'italic', opacity: 0.7 }}>
                      No resources yet
                    </span>
                  )}
                </div>

                {/* Hover effect - golden glow */}
                {isHovered && (
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    style={{
                      position: 'absolute',
                      inset: '-2px',
                      background: 'radial-gradient(circle at center, rgba(212,175,55,0.15), transparent 70%)',
                      borderRadius: '12px',
                      pointerEvents: 'none',
                    }}
                  />
                )}

                {/* Corner decorations */}
                <div style={{
                  position: 'absolute',
                  top: '8px',
                  left: '8px',
                  width: '20px',
                  height: '20px',
                  borderTop: '2px solid rgba(212,175,55,0.4)',
                  borderLeft: '2px solid rgba(212,175,55,0.4)',
                  borderRadius: '4px 0 0 0',
                }} />
                <div style={{
                  position: 'absolute',
                  top: '8px',
                  right: '8px',
                  width: '20px',
                  height: '20px',
                  borderTop: '2px solid rgba(212,175,55,0.4)',
                  borderRight: '2px solid rgba(212,175,55,0.4)',
                  borderRadius: '0 4px 0 0',
                }} />
                <div style={{
                  position: 'absolute',
                  bottom: '8px',
                  left: '8px',
                  width: '20px',
                  height: '20px',
                  borderBottom: '2px solid rgba(212,175,55,0.4)',
                  borderLeft: '2px solid rgba(212,175,55,0.4)',
                  borderRadius: '0 0 0 4px',
                }} />
                <div style={{
                  position: 'absolute',
                  bottom: '8px',
                  right: '8px',
                  width: '20px',
                  height: '20px',
                  borderBottom: '2px solid rgba(212,175,55,0.4)',
                  borderRight: '2px solid rgba(212,175,55,0.4)',
                  borderRadius: '0 0 4px 0',
                }} />
              </motion.div>
            </motion.div>
          );
        })}
      </div>

      {/* Opening Animation */}
      <AnimatePresence>
        {selectedSubject && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            style={{
              position: 'fixed',
              inset: 0,
              background: 'rgba(0,0,0,0.95)',
              zIndex: 100,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <motion.div
              initial={{ scale: 0.5, rotateY: 0 }}
              animate={{ scale: 3, rotateY: 360 }}
              transition={{ duration: 0.8, ease: 'easeInOut' }}
              style={{
                fontSize: '6rem',
                filter: 'drop-shadow(0 0 40px rgba(212,175,55,0.8))',
              }}
            >
              📖
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Floating particles */}
      {[...Array(20)].map((_, i) => (
        <motion.div
          key={i}
          animate={{
            y: [0, -150, 0],
            x: [0, (Math.random() - 0.5) * 40, 0],
            opacity: [0, 0.4, 0],
          }}
          transition={{
            duration: 12 + Math.random() * 8,
            repeat: Infinity,
            delay: Math.random() * 8,
            ease: 'linear',
          }}
          style={{
            position: 'absolute',
            left: `${Math.random() * 100}%`,
            top: `${Math.random() * 100}%`,
            width: `${2 + Math.random() * 2}px`,
            height: `${2 + Math.random() * 2}px`,
            background: '#d4af37',
            borderRadius: '50%',
            pointerEvents: 'none',
            boxShadow: '0 0 4px #d4af37',
            zIndex: 1,
          }}
        />
      ))}
    </div>
  );
}

// Made with Bob
