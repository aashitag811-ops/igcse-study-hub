'use client';

import { useEffect, useState, useRef } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useRouter } from 'next/navigation';
import { SUBJECTS } from '@/lib/constants/subjects';
import { RESOURCE_TYPES } from '@/lib/constants/resourceTypes';
import { CreatorBadge } from '@/components/HeartIcon';

interface RecentResource {
  id: string;
  title: string;
  subject: string;
  resource_type: string;
  upvote_count: number;
  profiles: {
    full_name: string;
    username: string;
    email: string;
  };
}

interface UserVote {
  resource_id: string;
}

const isCreator = (email: string | undefined) => {
  return email === 'arinjaysaha2010@gmail.com' || email === 'aashitag811@gmail.com';
};

export default function Home() {
  const [stats, setStats] = useState({
    resources: 0,
    students: 0,
    subjects: 9
  });
  const [isPressed, setIsPressed] = useState({ browse: false, upload: false });
  const [user, setUser] = useState<any>(null);
  const [recentResources, setRecentResources] = useState<RecentResource[]>([]);
  const [subjectCounts, setSubjectCounts] = useState<Record<string, number>>({});
  const [carouselIndex, setCarouselIndex] = useState(0);
  const [userVotes, setUserVotes] = useState<Set<string>>(new Set());
  const router = useRouter();
  const carouselRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const fetchStats = async () => {
      const supabase = createClient();
      
      // Check if user is logged in
      const { data: { user } } = await supabase.auth.getUser();
      setUser(user);
      
      // Fetch resource count
      const { count: resourceCount } = await supabase
        .from('resources')
        .select('*', { count: 'exact', head: true });
      
      // Fetch student count (profiles)
      const { count: studentCount } = await supabase
        .from('profiles')
        .select('*', { count: 'exact', head: true });
      
      // Fetch user's votes if logged in
      if (user) {
        const { data: votes } = await supabase
          .from('votes')
          .select('resource_id')
          .eq('user_id', user.id);
        
        if (votes) {
          setUserVotes(new Set(votes.map((v: UserVote) => v.resource_id)));
        }
      }

      // Fetch recent resources (6 items)
      const { data: recentData } = await supabase
        .from('resources')
        .select(`
          id,
          title,
          subject,
          resource_type,
          upvote_count,
          profiles (
            full_name,
            username,
            email
          )
        `)
        .order('created_at', { ascending: false })
        .limit(6);
      
      // Fetch resource counts per subject
      const { data: allResources } = await supabase
        .from('resources')
        .select('subject');
      
      const counts: Record<string, number> = {};
      if (allResources) {
        allResources.forEach((resource: any) => {
          counts[resource.subject] = (counts[resource.subject] || 0) + 1;
        });
      }
      setSubjectCounts(counts);
      
      setStats({
        resources: resourceCount || 0,
        students: (studentCount && studentCount >= 21) ? studentCount - 1 : 0,
        subjects: 13
      });
      
      if (recentData) {
        setRecentResources(recentData as RecentResource[]);
      }
    };

    fetchStats();
  }, []);

  const scrollCarousel = (direction: 'left' | 'right') => {
    if (!carouselRef.current) return;
    
    const container = carouselRef.current;
    const cardWidth = 320; // card width + gap
    const scrollAmount = direction === 'left' ? -cardWidth * 3 : cardWidth * 3;
    
    container.scrollBy({ left: scrollAmount, behavior: 'smooth' });
    
    // Update index
    if (direction === 'right' && carouselIndex < 1) {
      setCarouselIndex(1);
    } else if (direction === 'left' && carouselIndex > 0) {
      setCarouselIndex(0);
    }
  };

  const handleSignOut = async () => {
    const supabase = createClient();
    await supabase.auth.signOut();
    setUser(null);
  };

  const buttonBaseStyle = {
    padding: '1rem 2rem',
    fontSize: '1rem',
    fontWeight: '600',
    borderRadius: '0.75rem',
    cursor: 'pointer',
    transition: 'all 0.15s ease',
    position: 'relative' as const,
    overflow: 'hidden' as const,
  };

  const embossedStyle = (isPressed: boolean, isPrimary: boolean) => ({
    ...buttonBaseStyle,
    color: isPrimary ? 'white' : '#2563EB',
    background: isPrimary
      ? 'linear-gradient(145deg, #2563EB, #1D4ED8)'
      : 'white',
    border: isPrimary ? 'none' : '2px solid #2563EB',
    boxShadow: isPressed
      ? isPrimary
        ? 'inset 0 4px 8px rgba(0, 0, 0, 0.3), inset 0 -2px 4px rgba(255, 255, 255, 0.1)'
        : 'inset 0 4px 8px rgba(0, 0, 0, 0.1), inset 0 -2px 4px rgba(255, 255, 255, 0.5)'
      : isPrimary
        ? '0 8px 16px rgba(37, 99, 235, 0.4), 0 4px 8px rgba(0, 0, 0, 0.1)'
        : '0 8px 16px rgba(37, 99, 235, 0.2), 0 4px 8px rgba(0, 0, 0, 0.05)',
    transform: isPressed ? 'translateY(2px) scale(0.98)' : 'translateY(0) scale(1)',
  });

  return (
    <main style={{ minHeight: '100vh', background: 'linear-gradient(135deg, #EFF6FF 0%, #F5F3FF 50%, #FCE7F3 100%)' }}>
      {/* Navigation Bar */}
      <nav style={{
        background: 'rgba(255, 255, 255, 0.9)',
        backdropFilter: 'blur(10px)',
        borderBottom: '1px solid rgba(0, 0, 0, 0.1)',
        position: 'sticky',
        top: 0,
        zIndex: 50
      }}>
        <div style={{
          maxWidth: '1280px',
          margin: '0 auto',
          padding: '1rem 1.5rem',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center'
        }}>
          <div style={{
            fontSize: '1.5rem',
            fontWeight: '700',
            background: 'linear-gradient(90deg, #2563EB 0%, #9333EA 50%, #EC4899 100%)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            backgroundClip: 'text',
            fontFamily: "'Dancing Script', cursive",
            cursor: 'pointer'
          }}
          onClick={() => router.push('/')}
          >
            IGCSE Study Hub
          </div>
          
          <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
            {user ? (
              <>
                <button
                  onClick={() => router.push('/profile')}
                  style={{
                    padding: '0.5rem 1rem',
                    fontSize: '0.875rem',
                    fontWeight: '600',
                    borderRadius: '0.5rem',
                    color: '#2563EB',
                    background: 'white',
                    border: '1px solid #2563EB',
                    cursor: 'pointer',
                    transition: 'all 0.15s'
                  }}
                  onMouseOver={(e) => {
                    e.currentTarget.style.background = '#EFF6FF';
                  }}
                  onMouseOut={(e) => {
                    e.currentTarget.style.background = 'white';
                  }}
                >
                  Profile
                </button>
                <button
                  onClick={handleSignOut}
                  style={{
                    padding: '0.5rem 1rem',
                    fontSize: '0.875rem',
                    fontWeight: '600',
                    borderRadius: '0.5rem',
                    color: '#DC2626',
                    background: 'white',
                    border: '1px solid #DC2626',
                    cursor: 'pointer',
                    transition: 'all 0.15s'
                  }}
                  onMouseOver={(e) => {
                    e.currentTarget.style.background = '#FEE2E2';
                  }}
                  onMouseOut={(e) => {
                    e.currentTarget.style.background = 'white';
                  }}
                >
                  Sign Out
                </button>
              </>
            ) : (
              <button
                onClick={() => router.push('/login')}
                style={{
                  padding: '0.5rem 1.5rem',
                  fontSize: '0.875rem',
                  fontWeight: '600',
                  borderRadius: '0.5rem',
                  color: 'white',
                  background: 'linear-gradient(145deg, #2563EB, #1D4ED8)',
                  border: 'none',
                  cursor: 'pointer',
                  transition: 'all 0.15s',
                  boxShadow: '0 4px 8px rgba(37, 99, 235, 0.3)'
                }}
                onMouseDown={(e) => {
                  e.currentTarget.style.transform = 'translateY(2px) scale(0.98)';
                  e.currentTarget.style.boxShadow = 'inset 0 2px 4px rgba(0, 0, 0, 0.2)';
                }}
                onMouseUp={(e) => {
                  e.currentTarget.style.transform = 'translateY(0) scale(1)';
                  e.currentTarget.style.boxShadow = '0 4px 8px rgba(37, 99, 235, 0.3)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.transform = 'translateY(0) scale(1)';
                  e.currentTarget.style.boxShadow = '0 4px 8px rgba(37, 99, 235, 0.3)';
                }}
              >
                Sign In
              </button>
            )}
          </div>
        </div>
      </nav>

      <div style={{ maxWidth: '1280px', margin: '0 auto', padding: '4rem 1rem' }}>
        <div style={{ textAlign: 'center' }}>
          {/* Main Heading with Cursive Font */}
          <h1 style={{ fontSize: '3.5rem', fontWeight: '800', marginBottom: '1.5rem', lineHeight: '1.2' }}>
            <span style={{
              display: 'block',
              color: '#111827',
              fontFamily: "'Pacifico', cursive"
            }}>
              Discover & Share
            </span>
            <span style={{
              display: 'block',
              marginTop: '0.5rem',
              background: 'linear-gradient(90deg, #2563EB 0%, #9333EA 50%, #EC4899 100%)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              backgroundClip: 'text',
              fontFamily: "'Dancing Script', cursive",
              fontSize: '4rem'
            }}>
              IGCSE Study Resources
            </span>
          </h1>
          
          {/* Description */}
          <p style={{
            marginTop: '1.5rem',
            maxWidth: '48rem',
            marginLeft: 'auto',
            marginRight: 'auto',
            fontSize: '1.25rem',
            color: '#374151',
            lineHeight: '1.75'
          }}>
            Access thousands of study materials shared by students like you.
            Find notes, flashcards, revision guides, and more for all your IGCSE subjects.
          </p>
          
          {/* CTA Buttons with Embossed Effect */}
          <div style={{ marginTop: '2.5rem', display: 'flex', gap: '1rem', justifyContent: 'center', flexWrap: 'wrap' }}>
            <button
              style={embossedStyle(isPressed.browse, true)}
              onMouseDown={() => setIsPressed({ ...isPressed, browse: true })}
              onMouseUp={() => setIsPressed({ ...isPressed, browse: false })}
              onMouseLeave={() => setIsPressed({ ...isPressed, browse: false })}
              onClick={() => {
                if (user) {
                  router.push('/browse');
                } else {
                  router.push('/login');
                }
              }}
            >
              Browse Resources
            </button>
            <button
              style={embossedStyle(isPressed.upload, false)}
              onMouseDown={() => setIsPressed({ ...isPressed, upload: true })}
              onMouseUp={() => setIsPressed({ ...isPressed, upload: false })}
              onMouseLeave={() => setIsPressed({ ...isPressed, upload: false })}
              onClick={() => {
                if (user) {
                  router.push('/upload');
                } else {
                  router.push('/login');
                }
              }}
            >
              Upload Resource
            </button>
          </div>
          
          {/* Stats Cards with Live Data */}
          <div style={{
            marginTop: '5rem',
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
            gap: '1.5rem',
            maxWidth: '80rem',
            marginLeft: 'auto',
            marginRight: 'auto'
          }}>
            <div style={{
              background: 'white',
              borderRadius: '1rem',
              boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)',
              padding: '2rem',
              transition: 'transform 0.2s',
              border: '1px solid rgba(37, 99, 235, 0.1)'
            }}>
              <div style={{
                fontSize: '3rem',
                fontWeight: '700',
                color: '#2563EB',
                marginBottom: '0.5rem',
                fontFamily: "'Righteous', cursive"
              }}>
                {stats.resources.toLocaleString()}+
              </div>
              <div style={{ color: '#6B7280', fontWeight: '600', fontSize: '1.125rem' }}>
                Resources
              </div>
            </div>
            {stats.students >= 50 && (
              <div style={{
                background: 'white',
                borderRadius: '1rem',
                boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)',
                padding: '2rem',
                transition: 'transform 0.2s',
                border: '1px solid rgba(147, 51, 234, 0.1)'
              }}>
                <div style={{
                  fontSize: '3rem',
                  fontWeight: '700',
                  color: '#9333EA',
                  marginBottom: '0.5rem',
                  fontFamily: "'Righteous', cursive"
                }}>
                  {stats.students.toLocaleString()}+
                </div>
                <div style={{ color: '#6B7280', fontWeight: '600', fontSize: '1.125rem' }}>
                  Students
                </div>
              </div>
            )}
            <div style={{
              background: 'white',
              borderRadius: '1rem',
              boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)',
              padding: '2rem',
              transition: 'transform 0.2s',
              border: '1px solid rgba(236, 72, 153, 0.1)'
            }}>
              <div style={{
                fontSize: '3rem',
                fontWeight: '700',
                color: '#EC4899',
                marginBottom: '0.5rem',
                fontFamily: "'Righteous', cursive"
              }}>
                {stats.subjects}
              </div>
              <div style={{ color: '#6B7280', fontWeight: '600', fontSize: '1.125rem' }}>
                Subjects
              </div>
            </div>
          </div>

          {/* Subject Cards Section */}
          <div style={{ marginTop: '5rem' }}>
            <h2 style={{
              fontSize: '2.5rem',
              fontWeight: '700',
              textAlign: 'center',
              marginBottom: '1rem',
              fontFamily: "'Pacifico', cursive",
              color: '#111827'
            }}>
              Browse by Subject
            </h2>
            <p style={{
              textAlign: 'center',
              color: '#6B7280',
              fontSize: '1.125rem',
              marginBottom: '3rem'
            }}>
              Click on a subject to explore resources
            </p>

            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
              gap: '1.5rem',
              maxWidth: '80rem',
              marginLeft: 'auto',
              marginRight: 'auto'
            }}>
              {SUBJECTS.map((subject) => {
                const colorMap: Record<string, { bg: string; text: string; border: string; hover: string }> = {
                  blue: { bg: '#EFF6FF', text: '#2563EB', border: '#BFDBFE', hover: '#DBEAFE' },
                  purple: { bg: '#F5F3FF', text: '#9333EA', border: '#E9D5FF', hover: '#F3E8FF' },
                  green: { bg: '#D1FAE5', text: '#059669', border: '#A7F3D0', hover: '#ECFDF5' },
                  emerald: { bg: '#D1FAE5', text: '#10B981', border: '#6EE7B7', hover: '#ECFDF5' },
                  red: { bg: '#FEE2E2', text: '#DC2626', border: '#FECACA', hover: '#FEF2F2' },
                  yellow: { bg: '#FEF3C7', text: '#D97706', border: '#FDE68A', hover: '#FFFBEB' },
                  indigo: { bg: '#E0E7FF', text: '#4F46E5', border: '#C7D2FE', hover: '#EEF2FF' },
                  cyan: { bg: '#CFFAFE', text: '#0891B2', border: '#A5F3FC', hover: '#ECFEFF' },
                  orange: { bg: '#FFEDD5', text: '#EA580C', border: '#FED7AA', hover: '#FFF7ED' },
                };
                const colors = colorMap[subject.color] || colorMap.blue;

                const resourceCount = subjectCounts[subject.code] || 0;
                
                return (
                  <div
                    key={subject.code}
                    onClick={() => router.push(`/subject/${subject.code}`)}
                    style={{
                      background: 'white',
                      borderRadius: '1rem',
                      padding: '1.5rem',
                      cursor: 'pointer',
                      transition: 'all 0.2s',
                      border: `2px solid ${colors.border}`,
                      boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
                      position: 'relative'
                    }}
                    onMouseOver={(e) => {
                      e.currentTarget.style.transform = 'translateY(-4px)';
                      e.currentTarget.style.boxShadow = '0 20px 25px -5px rgba(0, 0, 0, 0.1)';
                      e.currentTarget.style.background = colors.hover;
                    }}
                    onMouseOut={(e) => {
                      e.currentTarget.style.transform = 'translateY(0)';
                      e.currentTarget.style.boxShadow = '0 4px 6px -1px rgba(0, 0, 0, 0.1)';
                      e.currentTarget.style.background = 'white';
                    }}
                  >
                    {/* Resource Count Badge */}
                    {resourceCount > 0 && (
                      <div style={{
                        position: 'absolute',
                        top: '0.75rem',
                        right: '0.75rem',
                        background: colors.bg,
                        color: colors.text,
                        padding: '0.25rem 0.75rem',
                        borderRadius: '9999px',
                        fontSize: '0.75rem',
                        fontWeight: '700',
                        border: `1px solid ${colors.border}`,
                        zIndex: 10
                      }}>
                        {resourceCount}
                      </div>
                    )}
                    
                    <div style={{
                      fontSize: subject.code === '0549' || subject.code === '0520' ? '1.5rem' : '3rem',
                      marginBottom: '0.75rem',
                      textAlign: 'center',
                      height: '3rem',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center'
                    }}>
                      {subject.icon}
                    </div>
                    <h3 style={{
                      fontSize: '1.25rem',
                      fontWeight: '700',
                      color: colors.text,
                      marginBottom: '0.5rem',
                      textAlign: 'center'
                    }}>
                      {subject.name}
                    </h3>
                    <p style={{
                      fontSize: '0.875rem',
                      color: '#9CA3AF',
                      textAlign: 'center'
                    }}>
                      Code: {subject.code}
                    </p>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Recent Resources Carousel */}
          {recentResources.length > 0 && (
            <div style={{ marginTop: '5rem' }}>
              <h2 style={{
                fontSize: '2.5rem',
                fontWeight: '700',
                textAlign: 'center',
                marginBottom: '1rem',
                fontFamily: "'Pacifico', cursive",
                color: '#111827'
              }}>
                Recently Added
              </h2>
              <p style={{
                textAlign: 'center',
                color: '#6B7280',
                fontSize: '1.125rem',
                marginBottom: '3rem'
              }}>
                Check out the latest study resources
              </p>

              <div style={{ position: 'relative', maxWidth: '80rem', marginLeft: 'auto', marginRight: 'auto' }}>
                {/* Left Arrow */}
                {carouselIndex > 0 && (
                  <button
                    onClick={() => scrollCarousel('left')}
                    style={{
                      position: 'absolute',
                      left: '-20px',
                      top: '50%',
                      transform: 'translateY(-50%)',
                      zIndex: 10,
                      width: '48px',
                      height: '48px',
                      borderRadius: '50%',
                      background: 'white',
                      border: '2px solid #E5E7EB',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: '1.5rem',
                      color: '#2563EB',
                      boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
                      transition: 'all 0.2s'
                    }}
                    onMouseOver={(e) => {
                      e.currentTarget.style.background = '#EFF6FF';
                      e.currentTarget.style.transform = 'translateY(-50%) scale(1.1)';
                    }}
                    onMouseOut={(e) => {
                      e.currentTarget.style.background = 'white';
                      e.currentTarget.style.transform = 'translateY(-50%) scale(1)';
                    }}
                  >
                    ←
                  </button>
                )}

                {/* Carousel Container */}
                <div
                  ref={carouselRef}
                  style={{
                    display: 'flex',
                    gap: '1.5rem',
                    overflowX: 'hidden',
                    scrollBehavior: 'smooth',
                    padding: '0.5rem'
                  }}
                >
                  {recentResources.map((resource) => {
                    const subject = SUBJECTS.find(s => s.code === resource.subject);
                    const resourceType = RESOURCE_TYPES.find(t => t.value === resource.resource_type);
                    
                    const colorMap: Record<string, { bg: string; text: string }> = {
                      blue: { bg: '#EFF6FF', text: '#2563EB' },
                      purple: { bg: '#F5F3FF', text: '#9333EA' },
                      green: { bg: '#D1FAE5', text: '#059669' },
                      emerald: { bg: '#D1FAE5', text: '#10B981' },
                      red: { bg: '#FEE2E2', text: '#DC2626' },
                      yellow: { bg: '#FEF3C7', text: '#D97706' },
                      indigo: { bg: '#E0E7FF', text: '#4F46E5' },
                      cyan: { bg: '#CFFAFE', text: '#0891B2' },
                      orange: { bg: '#FFEDD5', text: '#EA580C' },
                    };
                    const colors = subject ? (colorMap[subject.color] || colorMap.blue) : colorMap.blue;

                    return (
                      <div
                        key={resource.id}
                        onClick={() => router.push(`/subject/${resource.subject}`)}
                        style={{
                          minWidth: '300px',
                          background: 'white',
                          borderRadius: '1rem',
                          padding: '1.5rem',
                          cursor: 'pointer',
                          transition: 'all 0.2s',
                          border: '1px solid #E5E7EB',
                          boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)'
                        }}
                        onMouseOver={(e) => {
                          e.currentTarget.style.transform = 'translateY(-4px)';
                          e.currentTarget.style.boxShadow = '0 20px 25px -5px rgba(0, 0, 0, 0.1)';
                        }}
                        onMouseOut={(e) => {
                          e.currentTarget.style.transform = 'translateY(0)';
                          e.currentTarget.style.boxShadow = '0 4px 6px -1px rgba(0, 0, 0, 0.1)';
                        }}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.75rem', flexWrap: 'wrap' }}>
                          <span style={{
                            padding: '0.25rem 0.75rem',
                            background: colors.bg,
                            color: colors.text,
                            borderRadius: '0.25rem',
                            fontSize: '0.75rem',
                            fontWeight: '600'
                          }}>
                            {subject?.icon} {subject?.name}
                          </span>
                          <span style={{
                            padding: '0.25rem 0.75rem',
                            background: '#F3F4F6',
                            color: '#6B7280',
                            borderRadius: '0.25rem',
                            fontSize: '0.75rem',
                            fontWeight: '600'
                          }}>
                            {resourceType?.icon} {resourceType?.label}
                          </span>
                        </div>

                        <h3 style={{
                          fontSize: '1.125rem',
                          fontWeight: '700',
                          marginBottom: '0.5rem',
                          color: '#111827',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          whiteSpace: 'nowrap'
                        }}>
                          {resource.title}
                        </h3>

                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <span style={{ fontSize: '0.75rem', color: '#9CA3AF', display: 'flex', alignItems: 'center' }}>
                            by {resource.profiles?.full_name || resource.profiles?.username || 'Anonymous'}
                            {isCreator(resource.profiles?.email) && (
                              <CreatorBadge />
                            )}
                          </span>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                            {(() => {
                              const hasVoted = userVotes.has(resource.id);
                              return (
                                <>
                                  <svg
                                    width="20"
                                    height="20"
                                    viewBox="0 0 24 24"
                                    fill={hasVoted ? `url(#blueGradientCarousel-${resource.id})` : 'none'}
                                    stroke={hasVoted ? '#3B82F6' : '#9CA3AF'}
                                    strokeWidth="2"
                                    style={{
                                      filter: hasVoted
                                        ? 'drop-shadow(0 2px 4px rgba(59, 130, 246, 0.3))'
                                        : 'drop-shadow(0 1px 2px rgba(0, 0, 0, 0.1))'
                                    }}
                                  >
                                    {hasVoted && (
                                      <defs>
                                        <linearGradient id={`blueGradientCarousel-${resource.id}`} x1="0%" y1="0%" x2="0%" y2="100%">
                                          <stop offset="0%" style={{ stopColor: '#93C5FD', stopOpacity: 1 }} />
                                          <stop offset="50%" style={{ stopColor: '#60A5FA', stopOpacity: 1 }} />
                                          <stop offset="100%" style={{ stopColor: '#3B82F6', stopOpacity: 1 }} />
                                        </linearGradient>
                                      </defs>
                                    )}
                                    <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
                                  </svg>
                                  <span style={{
                                    fontSize: '0.875rem',
                                    fontWeight: '600',
                                    color: hasVoted ? '#3B82F6' : '#6B7280'
                                  }}>
                                    {resource.upvote_count}
                                  </span>
                                </>
                              );
                            })()}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* Right Arrow */}
                {recentResources.length > 3 && carouselIndex < 1 && (
                  <button
                    onClick={() => scrollCarousel('right')}
                    style={{
                      position: 'absolute',
                      right: '-20px',
                      top: '50%',
                      transform: 'translateY(-50%)',
                      zIndex: 10,
                      width: '48px',
                      height: '48px',
                      borderRadius: '50%',
                      background: 'white',
                      border: '2px solid #E5E7EB',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: '1.5rem',
                      color: '#2563EB',
                      boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
                      transition: 'all 0.2s'
                    }}
                    onMouseOver={(e) => {
                      e.currentTarget.style.background = '#EFF6FF';
                      e.currentTarget.style.transform = 'translateY(-50%) scale(1.1)';
                    }}
                    onMouseOut={(e) => {
                      e.currentTarget.style.background = 'white';
                      e.currentTarget.style.transform = 'translateY(-50%) scale(1)';
                    }}
                  >
                    →
                  </button>
                )}
              </div>
            </div>
          )}

          {/* Smart Paper Marking Section */}
          <div style={{ marginTop: '5rem' }}>
            <div style={{
              background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
              borderRadius: '1.5rem',
              padding: '3rem 2rem',
              boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)',
              position: 'relative',
              overflow: 'hidden'
            }}>
              {/* Decorative Background Pattern */}
              <div style={{
                position: 'absolute',
                top: 0,
                left: 0,
                right: 0,
                bottom: 0,
                opacity: 0.1,
                backgroundImage: 'radial-gradient(circle at 20px 20px, white 2px, transparent 0)',
                backgroundSize: '40px 40px'
              }} />
              
              <div style={{ position: 'relative', zIndex: 1, textAlign: 'center' }}>
                <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>🎯</div>
                <h2 style={{
                  fontSize: '2.5rem',
                  fontWeight: '700',
                  color: 'white',
                  marginBottom: '1rem',
                  fontFamily: "'Pacifico', cursive"
                }}>
                  Smart Paper Marking
                </h2>
                <p style={{
                  fontSize: '1.25rem',
                  color: 'rgba(255, 255, 255, 0.9)',
                  marginBottom: '0.5rem',
                  maxWidth: '800px',
                  marginLeft: 'auto',
                  marginRight: 'auto'
                }}>
                  Practice with real IGCSE past papers and get instant feedback
                </p>
                <p style={{
                  fontSize: '1rem',
                  color: 'rgba(255, 255, 255, 0.8)',
                  marginBottom: '2rem',
                  maxWidth: '700px',
                  marginLeft: 'auto',
                  marginRight: 'auto'
                }}>
                  Our algorithm-based marking system analyzes your answers using advanced fuzzy matching,
                  providing detailed feedback on each question. Save time and improve faster! ⚡
                </p>
                
                <div style={{
                  display: 'flex',
                  gap: '1rem',
                  justifyContent: 'center',
                  flexWrap: 'wrap',
                  marginBottom: '2rem'
                }}>
                  <div style={{
                    background: 'rgba(255, 255, 255, 0.2)',
                    backdropFilter: 'blur(10px)',
                    padding: '1rem 1.5rem',
                    borderRadius: '0.75rem',
                    border: '1px solid rgba(255, 255, 255, 0.3)'
                  }}>
                    <div style={{ fontSize: '1.5rem', fontWeight: '700', color: 'white' }}>✓</div>
                    <div style={{ fontSize: '0.875rem', color: 'rgba(255, 255, 255, 0.9)' }}>Instant Feedback</div>
                  </div>
                  <div style={{
                    background: 'rgba(255, 255, 255, 0.2)',
                    backdropFilter: 'blur(10px)',
                    padding: '1rem 1.5rem',
                    borderRadius: '0.75rem',
                    border: '1px solid rgba(255, 255, 255, 0.3)'
                  }}>
                    <div style={{ fontSize: '1.5rem', fontWeight: '700', color: 'white' }}>🎯</div>
                    <div style={{ fontSize: '0.875rem', color: 'rgba(255, 255, 255, 0.9)' }}>Smart Matching</div>
                  </div>
                  <div style={{
                    background: 'rgba(255, 255, 255, 0.2)',
                    backdropFilter: 'blur(10px)',
                    padding: '1rem 1.5rem',
                    borderRadius: '0.75rem',
                    border: '1px solid rgba(255, 255, 255, 0.3)'
                  }}>
                    <div style={{ fontSize: '1.5rem', fontWeight: '700', color: 'white' }}>⏱️</div>
                    <div style={{ fontSize: '0.875rem', color: 'rgba(255, 255, 255, 0.9)' }}>Time Saving</div>
                  </div>
                </div>

                <button
                  onClick={() => router.push('/practice')}
                  style={{
                    padding: '1rem 3rem',
                    fontSize: '1.125rem',
                    fontWeight: '700',
                    borderRadius: '0.75rem',
                    color: '#667eea',
                    background: 'white',
                    border: 'none',
                    cursor: 'pointer',
                    transition: 'all 0.2s',
                    boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1)',
                    fontFamily: "'Righteous', cursive",
                    letterSpacing: '0.05em'
                  }}
                  onMouseOver={(e) => {
                    e.currentTarget.style.transform = 'translateY(-2px) scale(1.05)';
                    e.currentTarget.style.boxShadow = '0 20px 25px -5px rgba(0, 0, 0, 0.2)';
                  }}
                  onMouseOut={(e) => {
                    e.currentTarget.style.transform = 'translateY(0) scale(1)';
                    e.currentTarget.style.boxShadow = '0 10px 15px -3px rgba(0, 0, 0, 0.1)';
                  }}
                >
                  START PRACTICING →
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}

// Made with Bob
