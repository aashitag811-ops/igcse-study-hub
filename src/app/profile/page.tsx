'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { SUBJECTS } from '@/lib/constants/subjects';
import { RESOURCE_TYPES } from '@/lib/constants/resourceTypes';

interface Resource {
  id: string;
  title: string;
  description: string;
  link: string;
  subject: string;
  resource_type: string;
  upvote_count: number;
  created_at: string;
  uploader_id: string;
}

interface Profile {
  id: string;
  email: string;
  username: string;
  full_name: string;
  avatar_url: string;
}

export default function ProfilePage() {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'uploads' | 'upvotes'>('uploads');
  const [uploadedResources, setUploadedResources] = useState<Resource[]>([]);
  const [upvotedResources, setUpvotedResources] = useState<Resource[]>([]);
  const [isEditing, setIsEditing] = useState(false);
  const [editForm, setEditForm] = useState({ username: '', full_name: '' });
  const [saveMessage, setSaveMessage] = useState('');
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);

  useEffect(() => {
    fetchProfileData();
  }, []);

  const fetchProfileData = async () => {
    setLoading(true);
    const supabase = createClient();

    // Get current user
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      router.push('/login');
      return;
    }

    setUser(user);

    // Fetch profile
    const { data: profileData } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', user.id)
      .single();

    if (profileData) {
      setProfile(profileData as Profile);
      setEditForm({
        username: (profileData as any).username || '',
        full_name: (profileData as any).full_name || ''
      });
    }

    // Fetch uploaded resources
    const { data: uploads } = await supabase
      .from('resources')
      .select('*')
      .eq('uploader_id', user.id)
      .order('created_at', { ascending: false });

    setUploadedResources(uploads || []);

    // Fetch upvoted resources
    const { data: votes } = await supabase
      .from('votes')
      .select(`
        resource_id,
        resources (
          id,
          title,
          description,
          link,
          subject,
          resource_type,
          upvote_count,
          created_at,
          uploader_id
        )
      `)
      .eq('user_id', user.id);

    if (votes) {
      const upvotedResourcesList = votes
        .map((v: any) => v.resources)
        .filter(Boolean);
      setUpvotedResources(upvotedResourcesList);
    }

    setLoading(false);
  };

  const handleSaveProfile = async () => {
    if (!user) return;

    const supabase = createClient();
    const { error } = await supabase
      .from('profiles')
      // @ts-expect-error - Supabase type inference issue
      .update({
        username: editForm.username,
        full_name: editForm.full_name
      })
      .eq('id', user.id);

    if (error) {
      setSaveMessage('Error saving profile');
    } else {
      setSaveMessage('Profile updated successfully!');
      setIsEditing(false);
      fetchProfileData();
      setTimeout(() => setSaveMessage(''), 3000);
    }
  };

  const handleDeleteResource = async (resourceId: string) => {
    if (!user) return;

    const supabase = createClient();
    const { error } = await supabase
      .from('resources')
      .delete()
      .eq('id', resourceId)
      .eq('uploader_id', user.id);

    if (!error) {
      setUploadedResources(prev => prev.filter(r => r.id !== resourceId));
      setDeleteConfirm(null);
    }
  };

  if (loading) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ fontSize: '1.25rem', color: '#6B7280' }}>Loading profile...</div>
      </div>
    );
  }

  if (!profile) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ fontSize: '1.25rem', color: '#6B7280' }}>Profile not found</div>
      </div>
    );
  }

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
            <button
              onClick={() => router.push('/browse')}
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
              Browse
            </button>
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
              Upload
            </button>
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <div style={{ maxWidth: '1280px', margin: '0 auto', padding: '2rem 1rem' }}>
        {/* Profile Header */}
        <div style={{
          background: 'white',
          borderRadius: '1rem',
          padding: '2rem',
          marginBottom: '2rem',
          boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)'
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', marginBottom: '1.5rem' }}>
            <div>
              <h1 style={{
                fontSize: '2rem',
                fontWeight: '700',
                fontFamily: "'Pacifico', cursive",
                background: 'linear-gradient(90deg, #2563EB 0%, #9333EA 50%, #EC4899 100%)',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
                backgroundClip: 'text',
                marginBottom: '0.5rem'
              }}>
                My Profile
              </h1>
              <p style={{ color: '#6B7280', fontSize: '0.875rem' }}>
                Manage your resources and profile information
              </p>
            </div>
            <button
              onClick={() => setIsEditing(!isEditing)}
              style={{
                padding: '0.5rem 1rem',
                fontSize: '0.875rem',
                fontWeight: '600',
                borderRadius: '0.5rem',
                color: isEditing ? '#DC2626' : '#2563EB',
                background: 'white',
                border: `1px solid ${isEditing ? '#DC2626' : '#2563EB'}`,
                cursor: 'pointer',
                transition: 'all 0.15s'
              }}
            >
              {isEditing ? 'Cancel' : 'Edit Profile'}
            </button>
          </div>

          {/* Profile Info */}
          {isEditing ? (
            <div style={{ display: 'grid', gap: '1rem' }}>
              <div>
                <label style={{
                  display: 'block',
                  fontSize: '0.875rem',
                  fontWeight: '600',
                  marginBottom: '0.5rem',
                  color: '#374151'
                }}>
                  Username
                </label>
                <input
                  type="text"
                  value={editForm.username}
                  onChange={(e) => setEditForm({ ...editForm, username: e.target.value })}
                  style={{
                    width: '100%',
                    padding: '0.75rem',
                    border: '1px solid #D1D5DB',
                    borderRadius: '0.5rem',
                    fontSize: '0.875rem',
                    outline: 'none'
                  }}
                  onFocus={(e) => e.currentTarget.style.borderColor = '#2563EB'}
                  onBlur={(e) => e.currentTarget.style.borderColor = '#D1D5DB'}
                />
              </div>
              <div>
                <label style={{
                  display: 'block',
                  fontSize: '0.875rem',
                  fontWeight: '600',
                  marginBottom: '0.5rem',
                  color: '#374151'
                }}>
                  Full Name
                </label>
                <input
                  type="text"
                  value={editForm.full_name}
                  onChange={(e) => setEditForm({ ...editForm, full_name: e.target.value })}
                  style={{
                    width: '100%',
                    padding: '0.75rem',
                    border: '1px solid #D1D5DB',
                    borderRadius: '0.5rem',
                    fontSize: '0.875rem',
                    outline: 'none'
                  }}
                  onFocus={(e) => e.currentTarget.style.borderColor = '#2563EB'}
                  onBlur={(e) => e.currentTarget.style.borderColor = '#D1D5DB'}
                />
              </div>
              <button
                onClick={handleSaveProfile}
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
                Save Changes
              </button>
            </div>
          ) : (
            <div style={{ display: 'grid', gap: '0.75rem' }}>
              <div style={{ display: 'flex', gap: '0.5rem' }}>
                <span style={{ fontWeight: '600', color: '#374151' }}>Email:</span>
                <span style={{ color: '#6B7280' }}>{profile.email}</span>
              </div>
              <div style={{ display: 'flex', gap: '0.5rem' }}>
                <span style={{ fontWeight: '600', color: '#374151' }}>Username:</span>
                <span style={{ color: '#6B7280' }}>{profile.username}</span>
              </div>
              {profile.full_name && (
                <div style={{ display: 'flex', gap: '0.5rem' }}>
                  <span style={{ fontWeight: '600', color: '#374151' }}>Full Name:</span>
                  <span style={{ color: '#6B7280' }}>{profile.full_name}</span>
                </div>
              )}
            </div>
          )}

          {saveMessage && (
            <div style={{
              marginTop: '1rem',
              padding: '0.75rem',
              background: '#D1FAE5',
              border: '1px solid #10B981',
              borderRadius: '0.5rem',
              color: '#059669',
              fontSize: '0.875rem',
              textAlign: 'center'
            }}>
              {saveMessage}
            </div>
          )}
        </div>

        {/* Stats */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
          gap: '1rem',
          marginBottom: '2rem'
        }}>
          <div style={{
            background: 'white',
            borderRadius: '1rem',
            padding: '1.5rem',
            textAlign: 'center',
            boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)'
          }}>
            <div style={{ fontSize: '2.5rem', fontWeight: '700', color: '#2563EB', fontFamily: "'Righteous', cursive" }}>
              {uploadedResources.length}
            </div>
            <div style={{ color: '#6B7280', fontSize: '0.875rem', fontWeight: '600' }}>
              Resources Uploaded
            </div>
          </div>
          <div style={{
            background: 'white',
            borderRadius: '1rem',
            padding: '1.5rem',
            textAlign: 'center',
            boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)'
          }}>
            <div style={{ fontSize: '2.5rem', fontWeight: '700', color: '#9333EA', fontFamily: "'Righteous', cursive" }}>
              {upvotedResources.length}
            </div>
            <div style={{ color: '#6B7280', fontSize: '0.875rem', fontWeight: '600' }}>
              Resources Upvoted
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div style={{
          background: 'white',
          borderRadius: '1rem',
          boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
          overflow: 'hidden'
        }}>
          <div style={{
            display: 'flex',
            borderBottom: '2px solid #E5E7EB'
          }}>
            <button
              onClick={() => setActiveTab('uploads')}
              style={{
                flex: 1,
                padding: '1rem',
                background: activeTab === 'uploads' ? '#EFF6FF' : 'white',
                color: activeTab === 'uploads' ? '#2563EB' : '#6B7280',
                border: 'none',
                borderBottom: activeTab === 'uploads' ? '2px solid #2563EB' : 'none',
                cursor: 'pointer',
                fontWeight: '600',
                fontSize: '0.875rem',
                transition: 'all 0.15s'
              }}
            >
              My Uploads ({uploadedResources.length})
            </button>
            <button
              onClick={() => setActiveTab('upvotes')}
              style={{
                flex: 1,
                padding: '1rem',
                background: activeTab === 'upvotes' ? '#EFF6FF' : 'white',
                color: activeTab === 'upvotes' ? '#2563EB' : '#6B7280',
                border: 'none',
                borderBottom: activeTab === 'upvotes' ? '2px solid #2563EB' : 'none',
                cursor: 'pointer',
                fontWeight: '600',
                fontSize: '0.875rem',
                transition: 'all 0.15s'
              }}
            >
              Upvoted ({upvotedResources.length})
            </button>
          </div>

          {/* Tab Content */}
          <div style={{ padding: '1.5rem' }}>
            {activeTab === 'uploads' ? (
              uploadedResources.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '3rem' }}>
                  <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>📚</div>
                  <h3 style={{ fontSize: '1.25rem', fontWeight: '700', marginBottom: '0.5rem', color: '#111827' }}>
                    No Uploads Yet
                  </h3>
                  <p style={{ color: '#6B7280', marginBottom: '1.5rem' }}>
                    Start sharing your study materials with the community!
                  </p>
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
                </div>
              ) : (
                <div style={{ display: 'grid', gap: '1rem' }}>
                  {uploadedResources.map((resource) => {
                    const subject = SUBJECTS.find(s => s.code === resource.subject);
                    const resourceType = RESOURCE_TYPES.find(t => t.value === resource.resource_type);

                    return (
                      <div
                        key={resource.id}
                        style={{
                          padding: '1rem',
                          border: '1px solid #E5E7EB',
                          borderRadius: '0.5rem',
                          transition: 'all 0.15s'
                        }}
                      >
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start' }}>
                          <div style={{ flex: 1 }}>
                            <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '0.5rem', flexWrap: 'wrap' }}>
                              <span style={{
                                padding: '0.25rem 0.5rem',
                                background: '#EFF6FF',
                                color: '#2563EB',
                                borderRadius: '0.25rem',
                                fontSize: '0.75rem',
                                fontWeight: '600'
                              }}>
                                {subject?.icon} {subject?.name}
                              </span>
                              <span style={{
                                padding: '0.25rem 0.5rem',
                                background: '#F3F4F6',
                                color: '#6B7280',
                                borderRadius: '0.25rem',
                                fontSize: '0.75rem',
                                fontWeight: '600'
                              }}>
                                {resourceType?.icon} {resourceType?.label}
                              </span>
                              <span style={{
                                padding: '0.25rem 0.5rem',
                                background: '#FEF3C7',
                                color: '#D97706',
                                borderRadius: '0.25rem',
                                fontSize: '0.75rem',
                                fontWeight: '600'
                              }}>
                                ▲ {resource.upvote_count} upvotes
                              </span>
                            </div>
                            <h4 style={{ fontSize: '1rem', fontWeight: '700', marginBottom: '0.25rem', color: '#111827' }}>
                              {resource.title}
                            </h4>
                            <p style={{ fontSize: '0.875rem', color: '#6B7280', marginBottom: '0.5rem' }}>
                              {resource.description}
                            </p>
                            <a
                              href={resource.link}
                              target="_blank"
                              rel="noopener noreferrer"
                              style={{
                                fontSize: '0.75rem',
                                color: '#2563EB',
                                textDecoration: 'none'
                              }}
                            >
                              View Resource →
                            </a>
                          </div>
                          <button
                            onClick={() => setDeleteConfirm(resource.id)}
                            style={{
                              padding: '0.5rem',
                              background: '#FEE2E2',
                              color: '#DC2626',
                              border: 'none',
                              borderRadius: '0.5rem',
                              cursor: 'pointer',
                              fontSize: '0.875rem',
                              fontWeight: '600',
                              marginLeft: '1rem'
                            }}
                          >
                            Delete
                          </button>
                        </div>

                        {/* Delete Confirmation */}
                        {deleteConfirm === resource.id && (
                          <div style={{
                            marginTop: '1rem',
                            padding: '1rem',
                            background: '#FEF2F2',
                            border: '1px solid #FCA5A5',
                            borderRadius: '0.5rem'
                          }}>
                            <p style={{ fontSize: '0.875rem', color: '#DC2626', marginBottom: '0.75rem', fontWeight: '600' }}>
                              Are you sure you want to delete this resource? This action cannot be undone.
                            </p>
                            <div style={{ display: 'flex', gap: '0.5rem' }}>
                              <button
                                onClick={() => handleDeleteResource(resource.id)}
                                style={{
                                  padding: '0.5rem 1rem',
                                  background: '#DC2626',
                                  color: 'white',
                                  border: 'none',
                                  borderRadius: '0.5rem',
                                  cursor: 'pointer',
                                  fontSize: '0.875rem',
                                  fontWeight: '600'
                                }}
                              >
                                Yes, Delete
                              </button>
                              <button
                                onClick={() => setDeleteConfirm(null)}
                                style={{
                                  padding: '0.5rem 1rem',
                                  background: 'white',
                                  color: '#6B7280',
                                  border: '1px solid #D1D5DB',
                                  borderRadius: '0.5rem',
                                  cursor: 'pointer',
                                  fontSize: '0.875rem',
                                  fontWeight: '600'
                                }}
                              >
                                Cancel
                              </button>
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )
            ) : (
              upvotedResources.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '3rem' }}>
                  <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>👍</div>
                  <h3 style={{ fontSize: '1.25rem', fontWeight: '700', marginBottom: '0.5rem', color: '#111827' }}>
                    No Upvoted Resources
                  </h3>
                  <p style={{ color: '#6B7280', marginBottom: '1.5rem' }}>
                    Start upvoting resources you find helpful!
                  </p>
                  <button
                    onClick={() => router.push('/browse')}
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
                    Browse Resources
                  </button>
                </div>
              ) : (
                <div style={{ display: 'grid', gap: '1rem' }}>
                  {upvotedResources.map((resource) => {
                    const subject = SUBJECTS.find(s => s.code === resource.subject);
                    const resourceType = RESOURCE_TYPES.find(t => t.value === resource.resource_type);

                    return (
                      <div
                        key={resource.id}
                        style={{
                          padding: '1rem',
                          border: '1px solid #E5E7EB',
                          borderRadius: '0.5rem',
                          transition: 'all 0.15s'
                        }}
                      >
                        <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '0.5rem', flexWrap: 'wrap' }}>
                          <span style={{
                            padding: '0.25rem 0.5rem',
                            background: '#EFF6FF',
                            color: '#2563EB',
                            borderRadius: '0.25rem',
                            fontSize: '0.75rem',
                            fontWeight: '600'
                          }}>
                            {subject?.icon} {subject?.name}
                          </span>
                          <span style={{
                            padding: '0.25rem 0.5rem',
                            background: '#F3F4F6',
                            color: '#6B7280',
                            borderRadius: '0.25rem',
                            fontSize: '0.75rem',
                            fontWeight: '600'
                          }}>
                            {resourceType?.icon} {resourceType?.label}
                          </span>
                          <span style={{
                            padding: '0.25rem 0.5rem',
                            background: '#FEF3C7',
                            color: '#D97706',
                            borderRadius: '0.25rem',
                            fontSize: '0.75rem',
                            fontWeight: '600'
                          }}>
                            ▲ {resource.upvote_count} upvotes
                          </span>
                        </div>
                        <h4 style={{ fontSize: '1rem', fontWeight: '700', marginBottom: '0.25rem', color: '#111827' }}>
                          {resource.title}
                        </h4>
                        <p style={{ fontSize: '0.875rem', color: '#6B7280', marginBottom: '0.5rem' }}>
                          {resource.description}
                        </p>
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
                            fontSize: '0.75rem',
                            fontWeight: '600',
                            textDecoration: 'none',
                            boxShadow: '0 4px 8px rgba(37, 99, 235, 0.3)'
                          }}
                        >
                          View Resource →
                        </a>
                      </div>
                    );
                  })}
                </div>
              )
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// Made with Bob