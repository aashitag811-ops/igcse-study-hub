'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { SUBJECTS, getSubjectByCode } from '@/lib/constants/subjects';
import { RESOURCE_TYPES } from '@/lib/constants/resourceTypes';
import { HeartIcon, CreatorBadge } from '@/components/HeartIcon';
import { EditResourceModal } from '@/components/EditResourceModal';

interface Resource {
  id: string;
  title: string;
  description: string;
  link: string;
  resource_type: string;
  subject: string;
  upvote_count: number;
  created_at: string;
  uploader_id: string;
  profiles: {
    username: string;
    full_name: string;
    email: string;
  };
}

interface UserProfile {
  full_name: string;
  username: string;
  email: string;
}

export default function SubjectDetailPage() {
  const params = useParams();
  const router = useRouter();
  const code = params.code as string;
  const subject = getSubjectByCode(code);

  const [resources, setResources] = useState<Resource[]>([]);
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<any>(null);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [selectedType, setSelectedType] = useState<string>('all');
  const [sortBy, setSortBy] = useState<string>('popular');
  const [userVotes, setUserVotes] = useState<Set<string>>(new Set());
  const [currentPage, setCurrentPage] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const [editingResource, setEditingResource] = useState<Resource | null>(null);
  const ITEMS_PER_PAGE = 10;

  useEffect(() => {
    fetchData();
  }, [code, selectedType, sortBy, currentPage]);

  const fetchData = async () => {
    setLoading(true);
    const supabase = createClient();

    // Get current user
    const { data: { user } } = await supabase.auth.getUser();
    setUser(user);

    // Fetch user profile if logged in
    if (user) {
      const { data: profile } = await supabase
        .from('profiles')
        .select('full_name, username, email')
        .eq('id', user.id)
        .single();
      
      if (profile) {
        setUserProfile(profile);
      }

      // Fetch user's votes
      const { data: votes } = await supabase
        .from('votes')
        .select('resource_id')
        .eq('user_id', user.id);
      
      if (votes) {
        setUserVotes(new Set(votes.map((v: any) => v.resource_id)));
      }
    }

    // Build query for count
    let countQuery = supabase
      .from('resources')
      .select('*', { count: 'exact', head: true })
      .eq('subject', code);

    if (selectedType !== 'all') {
      countQuery = countQuery.eq('resource_type', selectedType);
    }

    const { count } = await countQuery;
    setTotalCount(count || 0);

    // Build query for data with pagination
    let query = supabase
      .from('resources')
      .select(`
        *,
        profiles (
          username,
          full_name,
          email
        )
      `)
      .eq('subject', code);

    // Filter by resource type
    if (selectedType !== 'all') {
      query = query.eq('resource_type', selectedType);
    }

    // Sort
    if (sortBy === 'newest') {
      query = query.order('created_at', { ascending: false });
    } else if (sortBy === 'popular') {
      query = query.order('upvote_count', { ascending: false });
    }

    // Pagination
    const from = (currentPage - 1) * ITEMS_PER_PAGE;
    const to = from + ITEMS_PER_PAGE - 1;
    query = query.range(from, to);

    const { data, error } = await query;

    if (error) {
      console.error('Error fetching resources:', error);
    } else {
      setResources(data || []);
    }

    setLoading(false);
  };

  const handleUpvote = async (resourceId: string) => {
    if (!user) {
      router.push('/login');
      return;
    }

    const supabase = createClient();
    const hasVoted = userVotes.has(resourceId);

    if (hasVoted) {
      // Remove vote
      const { error: deleteError } = await supabase
        .from('votes')
        .delete()
        .eq('resource_id', resourceId)
        .eq('user_id', user.id);

      if (!deleteError) {
        // Get actual count from database
        const { count } = await supabase
          .from('votes')
          .select('*', { count: 'exact', head: true })
          .eq('resource_id', resourceId);

        setUserVotes(prev => {
          const newSet = new Set(prev);
          newSet.delete(resourceId);
          return newSet;
        });

        setResources(prev =>
          prev.map(r =>
            r.id === resourceId
              ? { ...r, upvote_count: count || 0 }
              : r
          )
        );
      }
    } else {
      // Add vote
      const { error: insertError } = await supabase
        .from('votes')
        .insert({ resource_id: resourceId, user_id: user.id } as any);

      if (!insertError) {
        // Get actual count from database
        const { count } = await supabase
          .from('votes')
          .select('*', { count: 'exact', head: true })
          .eq('resource_id', resourceId);

        setUserVotes(prev => new Set(prev).add(resourceId));

        setResources(prev =>
          prev.map(r =>
            r.id === resourceId
              ? { ...r, upvote_count: count || 0 }
              : r
          )
        );
      }
    }
  };

  const isCreator = (email: string | undefined) => {
    return email === 'arinjaysaha2010@gmail.com' || email === 'aashitag811@gmail.com';
  };

  const canEdit = (resource: Resource) => {
    return user && resource.uploader_id === user.id;
  };

  const canDelete = (resource: Resource) => {
    return user && (resource.uploader_id === user.id || isCreator(userProfile?.email));
  };

  const handleEdit = async (updatedResource: Partial<Resource>) => {
    if (!editingResource) return;

    const supabase = createClient();
    const { error } = await supabase
      .from('resources')
      .update({
        title: updatedResource.title,
        description: updatedResource.description,
        link: updatedResource.link,
        resource_type: updatedResource.resource_type,
        subject: updatedResource.subject
      } as any)
      .eq('id', editingResource.id);

    if (error) {
      console.error('Error updating resource:', error);
      alert('Failed to update resource');
    } else {
      // Update local state
      setResources(prev =>
        prev.map(r =>
          r.id === editingResource.id
            ? { ...r, ...updatedResource }
            : r
        )
      );
      setEditingResource(null);
      alert('Resource updated successfully!');
    }
  };

  const handleDelete = async (resourceId: string) => {
    if (!confirm('Are you sure you want to delete this resource? This action cannot be undone.')) {
      return;
    }

    const supabase = createClient();
    const { error } = await supabase
      .from('resources')
      .delete()
      .eq('id', resourceId);

    if (error) {
      console.error('Error deleting resource:', error);
      alert('Failed to delete resource');
    } else {
      // Remove from local state
      setResources(prev => prev.filter(r => r.id !== resourceId));
      setTotalCount(prev => prev - 1);
      alert('Resource deleted successfully!');
    }
  };

  if (!subject) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ textAlign: 'center' }}>
          <h1 style={{ fontSize: '2rem', fontWeight: '700', marginBottom: '1rem' }}>Subject Not Found</h1>
          <button
            onClick={() => router.push('/')}
            style={{
              padding: '0.75rem 1.5rem',
              background: '#2563EB',
              color: 'white',
              border: 'none',
              borderRadius: '0.5rem',
              cursor: 'pointer'
            }}
          >
            Go Home
          </button>
        </div>
      </div>
    );
  }

  const colorMap: Record<string, { bg: string; text: string; border: string }> = {
    blue: { bg: '#EFF6FF', text: '#2563EB', border: '#BFDBFE' },
    purple: { bg: '#F5F3FF', text: '#9333EA', border: '#E9D5FF' },
    green: { bg: '#D1FAE5', text: '#059669', border: '#A7F3D0' },
    emerald: { bg: '#D1FAE5', text: '#10B981', border: '#6EE7B7' },
    red: { bg: '#FEE2E2', text: '#DC2626', border: '#FECACA' },
    yellow: { bg: '#FEF3C7', text: '#D97706', border: '#FDE68A' },
    indigo: { bg: '#E0E7FF', text: '#4F46E5', border: '#C7D2FE' },
    cyan: { bg: '#CFFAFE', text: '#0891B2', border: '#A5F3FC' },
    orange: { bg: '#FFEDD5', text: '#EA580C', border: '#FED7AA' },
  };
  const colors = colorMap[subject.color] || colorMap.blue;

  return (
    <div style={{ minHeight: '100vh', background: 'linear-gradient(135deg, #EFF6FF 0%, #F5F3FF 50%, #FCE7F3 100%)' }}>
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
          <div
            style={{
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
                  onClick={() => router.push('/upload')}
                  style={{
                    padding: '0.5rem 1rem',
                    fontSize: '0.875rem',
                    fontWeight: '600',
                    borderRadius: '0.5rem',
                    color: 'white',
                    background: 'linear-gradient(145deg, #10B981, #059669)',
                    border: 'none',
                    cursor: 'pointer',
                    transition: 'all 0.15s',
                    boxShadow: '0 4px 8px rgba(16, 185, 129, 0.3)'
                  }}
                >
                  Upload Resource
                </button>
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
                >
                  Profile
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
              >
                Sign In
              </button>
            )}
          </div>
        </div>
      </nav>

      {/* Subject Header */}
      <div style={{
        background: colors.bg,
        borderBottom: `2px solid ${colors.border}`,
        padding: '2rem 1rem'
      }}>
        <div style={{ maxWidth: '1280px', margin: '0 auto', display: 'flex', alignItems: 'center', gap: '1.5rem' }}>
          <div style={{ fontSize: '4rem' }}>{subject.icon}</div>
          <div>
            <h1 style={{
              fontSize: '2.5rem',
              fontWeight: '700',
              color: colors.text,
              fontFamily: "'Pacifico', cursive",
              marginBottom: '0.5rem'
            }}>
              {subject.name}
            </h1>
            <p style={{ color: '#6B7280', fontSize: '1rem' }}>
              Subject Code: {subject.code}
            </p>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div style={{ maxWidth: '1280px', margin: '0 auto', padding: '2rem 1rem', display: 'flex', gap: '2rem' }}>
        {/* Sidebar Filters */}
        <div style={{ width: '250px', flexShrink: 0 }}>
          <div style={{
            background: 'white',
            borderRadius: '1rem',
            padding: '1.5rem',
            boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
            position: 'sticky',
            top: '100px'
          }}>
            <h3 style={{ fontSize: '1.125rem', fontWeight: '700', marginBottom: '1rem', color: '#111827' }}>
              Filters
            </h3>

            {/* Resource Type Filter */}
            <div style={{ marginBottom: '1.5rem' }}>
              <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: '600', marginBottom: '0.5rem', color: '#374151' }}>
                Resource Type
              </label>
              <select
                value={selectedType}
                onChange={(e) => setSelectedType(e.target.value)}
                style={{
                  width: '100%',
                  padding: '0.5rem',
                  border: '1px solid #D1D5DB',
                  borderRadius: '0.5rem',
                  fontSize: '0.875rem',
                  cursor: 'pointer'
                }}
              >
                <option value="all">All Types</option>
                {RESOURCE_TYPES.map(type => (
                  <option key={type.value} value={type.value}>
                    {type.icon} {type.label}
                  </option>
                ))}
              </select>
            </div>

            {/* Sort By */}
            <div>
              <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: '600', marginBottom: '0.5rem', color: '#374151' }}>
                Sort By
              </label>
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
                style={{
                  width: '100%',
                  padding: '0.5rem',
                  border: '1px solid #D1D5DB',
                  borderRadius: '0.5rem',
                  fontSize: '0.875rem',
                  cursor: 'pointer'
                }}
              >
                <option value="newest">Newest First</option>
                <option value="popular">Most Popular</option>
              </select>
            </div>

            {/* Resource Count */}
            <div style={{
              marginTop: '1.5rem',
              padding: '1rem',
              background: colors.bg,
              borderRadius: '0.5rem',
              textAlign: 'center'
            }}>
              <div style={{ fontSize: '2rem', fontWeight: '700', color: colors.text }}>
                {totalCount}
              </div>
              <div style={{ fontSize: '0.875rem', color: '#6B7280' }}>
                Resources Found
              </div>
            </div>
          </div>
        </div>

        {/* Resource Grid */}
        <div style={{ flex: 1 }}>
          {loading ? (
            <div style={{ textAlign: 'center', padding: '4rem' }}>
              <div style={{ fontSize: '1.25rem', color: '#6B7280' }}>Loading resources...</div>
            </div>
          ) : resources.length === 0 ? (
            <div style={{
              background: 'white',
              borderRadius: '1rem',
              padding: '3rem',
              textAlign: 'center',
              boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)'
            }}>
              <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>📚</div>
              <h3 style={{ fontSize: '1.5rem', fontWeight: '700', marginBottom: '0.5rem', color: '#111827' }}>
                No Resources Yet
              </h3>
              <p style={{ color: '#6B7280', marginBottom: '1.5rem' }}>
                Be the first to upload a resource for this subject!
              </p>
              {user && (
                <button
                  onClick={() => router.push('/upload')}
                  style={{
                    padding: '0.75rem 1.5rem',
                    background: 'linear-gradient(145deg, #2563EB, #1D4ED8)',
                    color: 'white',
                    border: 'none',
                    borderRadius: '0.5rem',
                    fontSize: '0.875rem',
                    fontWeight: '600',
                    cursor: 'pointer',
                    boxShadow: '0 4px 8px rgba(37, 99, 235, 0.3)'
                  }}
                >
                  Upload Resource
                </button>
              )}
            </div>
          ) : (
            <div style={{ display: 'grid', gap: '1.5rem' }}>
              {resources.map((resource) => {
                const resourceType = RESOURCE_TYPES.find(t => t.value === resource.resource_type);
                const hasVoted = userVotes.has(resource.id);

                return (
                  <div
                    key={resource.id}
                    style={{
                      background: 'white',
                      borderRadius: '1rem',
                      padding: '1.5rem',
                      boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
                      transition: 'all 0.2s',
                      border: '1px solid #E5E7EB'
                    }}
                  >
                    <div style={{ display: 'flex', gap: '1rem' }}>
                      {/* Upvote Section */}
                      <div style={{
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        gap: '0.5rem'
                      }}>
                        <HeartIcon
                          filled={hasVoted}
                          size={28}
                          onClick={() => handleUpvote(resource.id)}
                        />
                        <span style={{
                          fontSize: '0.875rem',
                          fontWeight: '700',
                          color: hasVoted ? '#3B82F6' : '#6B7280'
                        }}>
                          {resource.upvote_count}
                        </span>
                      </div>

                      {/* Resource Content */}
                      <div style={{ flex: 1 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
                          <span style={{
                            padding: '0.25rem 0.75rem',
                            background: colors.bg,
                            color: colors.text,
                            borderRadius: '0.25rem',
                            fontSize: '0.75rem',
                            fontWeight: '600'
                          }}>
                            {resourceType?.icon} {resourceType?.label}
                          </span>
                          <span style={{ fontSize: '0.75rem', color: '#9CA3AF', display: 'flex', alignItems: 'center' }}>
                            by {resource.profiles?.full_name || resource.profiles?.username || 'Anonymous'}
                            {isCreator(resource.profiles?.email) && (
                              <CreatorBadge />
                            )}
                          </span>
                        </div>

                        <h3 style={{
                          fontSize: '1.25rem',
                          fontWeight: '700',
                          marginBottom: '0.5rem',
                          color: '#111827'
                        }}>
                          {resource.title}
                        </h3>

                        <p style={{
                          color: '#6B7280',
                          marginBottom: '1rem',
                          lineHeight: '1.5'
                        }}>
                          {resource.description}
                        </p>

                        <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
                          <a
                            href={resource.link}
                            target="_blank"
                            rel="noopener noreferrer"
                            style={{
                              display: 'inline-block',
                              padding: '0.5rem 1rem',
                              background: 'linear-gradient(145deg, #2563EB, #1D4ED8)',
                              color: 'white',
                              borderRadius: '0.5rem',
                              fontSize: '0.875rem',
                              fontWeight: '600',
                              textDecoration: 'none',
                              transition: 'all 0.15s',
                              boxShadow: '0 4px 8px rgba(37, 99, 235, 0.3)'
                            }}
                          >
                            View Resource →
                          </a>

                          {canEdit(resource) && (
                            <button
                              onClick={() => setEditingResource(resource)}
                              style={{
                                padding: '0.5rem 1rem',
                                background: '#F59E0B',
                                color: 'white',
                                border: 'none',
                                borderRadius: '0.5rem',
                                fontSize: '0.875rem',
                                fontWeight: '600',
                                cursor: 'pointer',
                                transition: 'all 0.15s',
                                boxShadow: '0 2px 4px rgba(245, 158, 11, 0.3)'
                              }}
                            >
                              ✏️ Edit
                            </button>
                          )}

                          {canDelete(resource) && (
                            <button
                              onClick={() => handleDelete(resource.id)}
                              style={{
                                padding: '0.5rem 1rem',
                                background: '#EF4444',
                                color: 'white',
                                border: 'none',
                                borderRadius: '0.5rem',
                                fontSize: '0.875rem',
                                fontWeight: '600',
                                cursor: 'pointer',
                                transition: 'all 0.15s',
                                boxShadow: '0 2px 4px rgba(239, 68, 68, 0.3)'
                              }}
                            >
                              🗑️ Delete
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* Pagination */}
          {!loading && totalCount > ITEMS_PER_PAGE && (
            <div style={{
              marginTop: '2rem',
              display: 'flex',
              justifyContent: 'center',
              alignItems: 'center',
              gap: '0.5rem'
            }}>
              <button
                onClick={() => {
                  setCurrentPage(prev => Math.max(1, prev - 1));
                  window.scrollTo({ top: 0, behavior: 'smooth' });
                }}
                disabled={currentPage === 1}
                style={{
                  padding: '0.5rem 1rem',
                  background: currentPage === 1 ? '#F3F4F6' : 'white',
                  color: currentPage === 1 ? '#9CA3AF' : '#374151',
                  border: '1px solid #D1D5DB',
                  borderRadius: '0.5rem',
                  cursor: currentPage === 1 ? 'not-allowed' : 'pointer',
                  fontWeight: '600',
                  fontSize: '0.875rem'
                }}
              >
                ← Previous
              </button>

              <div style={{
                display: 'flex',
                gap: '0.25rem'
              }}>
                {Array.from({ length: Math.ceil(totalCount / ITEMS_PER_PAGE) }, (_, i) => i + 1)
                  .filter(page => {
                    // Show first page, last page, current page, and pages around current
                    const totalPages = Math.ceil(totalCount / ITEMS_PER_PAGE);
                    return page === 1 ||
                           page === totalPages ||
                           Math.abs(page - currentPage) <= 1;
                  })
                  .map((page, index, array) => {
                    // Add ellipsis if there's a gap
                    const prevPage = array[index - 1];
                    const showEllipsis = prevPage && page - prevPage > 1;

                    return (
                      <div key={page} style={{ display: 'flex', gap: '0.25rem', alignItems: 'center' }}>
                        {showEllipsis && (
                          <span style={{ padding: '0 0.5rem', color: '#9CA3AF' }}>...</span>
                        )}
                        <button
                          onClick={() => {
                            setCurrentPage(page);
                            window.scrollTo({ top: 0, behavior: 'smooth' });
                          }}
                          style={{
                            padding: '0.5rem 0.75rem',
                            background: currentPage === page ? 'linear-gradient(145deg, #2563EB, #1D4ED8)' : 'white',
                            color: currentPage === page ? 'white' : '#374151',
                            border: currentPage === page ? 'none' : '1px solid #D1D5DB',
                            borderRadius: '0.5rem',
                            cursor: 'pointer',
                            fontWeight: '600',
                            fontSize: '0.875rem',
                            minWidth: '2.5rem'
                          }}
                        >
                          {page}
                        </button>
                      </div>
                    );
                  })}
              </div>

              <button
                onClick={() => {
                  setCurrentPage(prev => Math.min(Math.ceil(totalCount / ITEMS_PER_PAGE), prev + 1));
                  window.scrollTo({ top: 0, behavior: 'smooth' });
                }}
                disabled={currentPage >= Math.ceil(totalCount / ITEMS_PER_PAGE)}
                style={{
                  padding: '0.5rem 1rem',
                  background: currentPage >= Math.ceil(totalCount / ITEMS_PER_PAGE) ? '#F3F4F6' : 'white',
                  color: currentPage >= Math.ceil(totalCount / ITEMS_PER_PAGE) ? '#9CA3AF' : '#374151',
                  border: '1px solid #D1D5DB',
                  borderRadius: '0.5rem',
                  cursor: currentPage >= Math.ceil(totalCount / ITEMS_PER_PAGE) ? 'not-allowed' : 'pointer',
                  fontWeight: '600',
                  fontSize: '0.875rem'
                }}
              >
                Next →
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Edit Resource Modal */}
      {editingResource && (
        <EditResourceModal
          resource={editingResource}
          onClose={() => setEditingResource(null)}
          onSave={handleEdit}
        />
      )}
    </div>
  );
}

// Made with Bob