'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { SUBJECTS } from '@/lib/constants/subjects';
import { RESOURCE_TYPES } from '@/lib/constants/resourceTypes';

export default function UploadPage() {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState('');

  const [formData, setFormData] = useState({
    title: '',
    subject: '',
    resourceType: '',
    link: '',
    description: ''
  });

  useEffect(() => {
    checkAuth();
  }, []);

  const checkAuth = async () => {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      router.push('/login');
    } else {
      setUser(user);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setSuccess(false);

    // Validation
    if (!formData.title || !formData.subject || !formData.resourceType || !formData.link) {
      setError('Please fill in all required fields');
      setLoading(false);
      return;
    }

    // Validate URL
    try {
      new URL(formData.link);
    } catch {
      setError('Please enter a valid URL');
      setLoading(false);
      return;
    }

    const supabase = createClient();

    try {
      const { error: insertError } = await supabase
        .from('resources')
        .insert({
          title: formData.title,
          subject: formData.subject,
          resource_type: formData.resourceType,
          link: formData.link,
          description: formData.description,
          uploader_id: user.id,
          upvote_count: 0
        } as any);

      if (insertError) throw insertError;

      setSuccess(true);
      setFormData({
        title: '',
        subject: '',
        resourceType: '',
        link: '',
        description: ''
      });

      // Redirect after 2 seconds
      setTimeout(() => {
        router.push(`/subject/${formData.subject}`);
      }, 2000);
    } catch (err: any) {
      setError(err.message || 'Failed to upload resource');
    } finally {
      setLoading(false);
    }
  };

  if (!user) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ fontSize: '1.25rem', color: '#6B7280' }}>Checking authentication...</div>
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
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <div style={{ maxWidth: '800px', margin: '0 auto', padding: '3rem 1rem' }}>
        <div style={{
          background: 'white',
          borderRadius: '1rem',
          padding: '2.5rem',
          boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1)'
        }}>
          {/* Header */}
          <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
            <h1 style={{
              fontSize: '2.5rem',
              fontWeight: '700',
              marginBottom: '0.5rem',
              fontFamily: "'Pacifico', cursive",
              background: 'linear-gradient(90deg, #2563EB 0%, #9333EA 50%, #EC4899 100%)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              backgroundClip: 'text'
            }}>
              Upload Resource
            </h1>
            <p style={{ color: '#6B7280', fontSize: '1rem' }}>
              Share your study materials with fellow IGCSE students
            </p>
          </div>

          {/* Success Message */}
          {success && (
            <div style={{
              padding: '1rem',
              marginBottom: '1.5rem',
              background: '#D1FAE5',
              border: '1px solid #10B981',
              borderRadius: '0.5rem',
              color: '#059669',
              textAlign: 'center'
            }}>
              ✅ Resource uploaded successfully! Redirecting...
            </div>
          )}

          {/* Error Message */}
          {error && (
            <div style={{
              padding: '1rem',
              marginBottom: '1.5rem',
              background: '#FEE2E2',
              border: '1px solid #EF4444',
              borderRadius: '0.5rem',
              color: '#DC2626',
              textAlign: 'center'
            }}>
              {error}
            </div>
          )}

          {/* Form */}
          <form onSubmit={handleSubmit}>
            {/* Title */}
            <div style={{ marginBottom: '1.5rem' }}>
              <label style={{
                display: 'block',
                marginBottom: '0.5rem',
                fontSize: '0.875rem',
                fontWeight: '600',
                color: '#374151'
              }}>
                Resource Title *
              </label>
              <input
                type="text"
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                required
                placeholder="e.g., Complete Algebra Notes"
                style={{
                  width: '100%',
                  padding: '0.75rem',
                  border: '1px solid #D1D5DB',
                  borderRadius: '0.5rem',
                  fontSize: '0.875rem',
                  outline: 'none',
                  transition: 'border-color 0.15s'
                }}
                onFocus={(e) => e.currentTarget.style.borderColor = '#2563EB'}
                onBlur={(e) => e.currentTarget.style.borderColor = '#D1D5DB'}
              />
            </div>

            {/* Subject */}
            <div style={{ marginBottom: '1.5rem' }}>
              <label style={{
                display: 'block',
                marginBottom: '0.5rem',
                fontSize: '0.875rem',
                fontWeight: '600',
                color: '#374151'
              }}>
                Subject *
              </label>
              <select
                value={formData.subject}
                onChange={(e) => setFormData({ ...formData, subject: e.target.value })}
                required
                style={{
                  width: '100%',
                  padding: '0.75rem',
                  border: '1px solid #D1D5DB',
                  borderRadius: '0.5rem',
                  fontSize: '0.875rem',
                  outline: 'none',
                  cursor: 'pointer',
                  transition: 'border-color 0.15s'
                }}
                onFocus={(e) => e.currentTarget.style.borderColor = '#2563EB'}
                onBlur={(e) => e.currentTarget.style.borderColor = '#D1D5DB'}
              >
                <option value="">Select a subject</option>
                {SUBJECTS.map(subject => (
                  <option key={subject.code} value={subject.code}>
                    {subject.icon} {subject.name} ({subject.code})
                  </option>
                ))}
              </select>
            </div>

            {/* Resource Type */}
            <div style={{ marginBottom: '1.5rem' }}>
              <label style={{
                display: 'block',
                marginBottom: '0.5rem',
                fontSize: '0.875rem',
                fontWeight: '600',
                color: '#374151'
              }}>
                Resource Type *
              </label>
              <select
                value={formData.resourceType}
                onChange={(e) => setFormData({ ...formData, resourceType: e.target.value })}
                required
                style={{
                  width: '100%',
                  padding: '0.75rem',
                  border: '1px solid #D1D5DB',
                  borderRadius: '0.5rem',
                  fontSize: '0.875rem',
                  outline: 'none',
                  cursor: 'pointer',
                  transition: 'border-color 0.15s'
                }}
                onFocus={(e) => e.currentTarget.style.borderColor = '#2563EB'}
                onBlur={(e) => e.currentTarget.style.borderColor = '#D1D5DB'}
              >
                <option value="">Select a type</option>
                {RESOURCE_TYPES.map(type => (
                  <option key={type.value} value={type.value}>
                    {type.icon} {type.label}
                  </option>
                ))}
              </select>
            </div>

            {/* Link */}
            <div style={{ marginBottom: '1.5rem' }}>
              <label style={{
                display: 'block',
                marginBottom: '0.5rem',
                fontSize: '0.875rem',
                fontWeight: '600',
                color: '#374151'
              }}>
                Resource Link *
              </label>
              <input
                type="url"
                value={formData.link}
                onChange={(e) => setFormData({ ...formData, link: e.target.value })}
                required
                placeholder="https://drive.google.com/..."
                style={{
                  width: '100%',
                  padding: '0.75rem',
                  border: '1px solid #D1D5DB',
                  borderRadius: '0.5rem',
                  fontSize: '0.875rem',
                  outline: 'none',
                  transition: 'border-color 0.15s'
                }}
                onFocus={(e) => e.currentTarget.style.borderColor = '#2563EB'}
                onBlur={(e) => e.currentTarget.style.borderColor = '#D1D5DB'}
              />
              <p style={{ fontSize: '0.75rem', color: '#9CA3AF', marginTop: '0.25rem' }}>
                Google Drive, Dropbox, or any public link
              </p>
            </div>

            {/* Description */}
            <div style={{ marginBottom: '2rem' }}>
              <label style={{
                display: 'block',
                marginBottom: '0.5rem',
                fontSize: '0.875rem',
                fontWeight: '600',
                color: '#374151'
              }}>
                Description (Optional)
              </label>
              <textarea
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                rows={4}
                placeholder="Describe what this resource covers..."
                style={{
                  width: '100%',
                  padding: '0.75rem',
                  border: '1px solid #D1D5DB',
                  borderRadius: '0.5rem',
                  fontSize: '0.875rem',
                  outline: 'none',
                  resize: 'vertical',
                  transition: 'border-color 0.15s',
                  fontFamily: 'inherit'
                }}
                onFocus={(e) => e.currentTarget.style.borderColor = '#2563EB'}
                onBlur={(e) => e.currentTarget.style.borderColor = '#D1D5DB'}
              />
            </div>

            {/* Guidelines */}
            <div style={{
              padding: '1rem',
              background: '#EFF6FF',
              border: '1px solid #BFDBFE',
              borderRadius: '0.5rem',
              marginBottom: '2rem'
            }}>
              <h3 style={{ fontSize: '0.875rem', fontWeight: '600', color: '#1E40AF', marginBottom: '0.5rem' }}>
                📋 Upload Guidelines
              </h3>
              <ul style={{ fontSize: '0.75rem', color: '#1E3A8A', paddingLeft: '1.25rem', margin: 0 }}>
                <li>Ensure the resource is relevant to IGCSE curriculum</li>
                <li>Use a clear, descriptive title</li>
                <li>Make sure the link is publicly accessible</li>
                <li>Provide accurate subject and resource type</li>
                <li>Add a helpful description for other students</li>
              </ul>
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={loading}
              style={{
                width: '100%',
                padding: '1rem',
                background: loading ? '#9CA3AF' : 'linear-gradient(145deg, #2563EB, #1D4ED8)',
                color: 'white',
                border: 'none',
                borderRadius: '0.5rem',
                fontSize: '1rem',
                fontWeight: '600',
                cursor: loading ? 'not-allowed' : 'pointer',
                transition: 'all 0.15s',
                boxShadow: loading ? 'none' : '0 8px 16px rgba(37, 99, 235, 0.4)'
              }}
              onMouseDown={(e) => !loading && (e.currentTarget.style.transform = 'translateY(2px) scale(0.98)')}
              onMouseUp={(e) => (e.currentTarget.style.transform = 'translateY(0) scale(1)')}
              onMouseLeave={(e) => (e.currentTarget.style.transform = 'translateY(0) scale(1)')}
            >
              {loading ? 'Uploading...' : 'Upload Resource'}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}

// Made with Bob