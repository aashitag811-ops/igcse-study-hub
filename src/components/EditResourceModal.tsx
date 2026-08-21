'use client';

import React, { useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { SUBJECTS } from '@/lib/constants/subjects';
import { RESOURCE_TYPES } from '@/lib/constants/resourceTypes';

const SERIF = "'Cormorant Garamond', 'Cormorant', Georgia, serif";
const SANS  = "'DM Sans', 'Inter', system-ui, sans-serif";
const GOLD  = '#C9A84C';
const GOLD2 = '#D4B96A';
const BG    = '#0e1420';
const BORDER  = 'rgba(200,168,76,0.08)';
const BORDER2 = 'rgba(200,168,76,0.2)';
const TEXT  = '#E8DCC4';
const MUTED = 'rgba(196,176,138,0.45)';

const inputStyle: React.CSSProperties = {
  width: '100%',
  background: 'rgba(6,10,18,0.7)',
  border: `1px solid ${BORDER}`,
  borderTop: `1px solid ${BORDER2}`,
  borderRadius: '8px',
  padding: '10px 14px',
  fontFamily: SANS,
  fontSize: '14px',
  color: TEXT,
  outline: 'none',
  transition: 'border-color 0.18s',
};

const labelStyle: React.CSSProperties = {
  display: 'block',
  fontFamily: SANS,
  fontSize: '0.7rem',
  fontWeight: 600,
  letterSpacing: '0.14em',
  textTransform: 'uppercase',
  color: MUTED,
  marginBottom: '6px',
};

interface EditResourceModalProps {
  resource: {
    id: string;
    title: string;
    subject: string;
    resource_type: string;
    link: string;
    description: string;
  };
  onClose: () => void;
  onSave: (updatedResource: any) => Promise<void>;
}

export const EditResourceModal: React.FC<EditResourceModalProps> = ({ resource, onClose, onSave }) => {
  const [formData, setFormData] = useState({
    title: resource.title,
    subject: resource.subject,
    resource_type: resource.resource_type,
    link: resource.link,
    description: resource.description || '',
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      // Save directly via supabase
      const supabase = createClient();
      const { error: updateError } = await (supabase as any)
        .from('resources')
        .update({
          title: formData.title,
          subject: formData.subject,
          resource_type: formData.resource_type,
          link: formData.link,
          description: formData.description,
        })
        .eq('id', resource.id);
      if (updateError) throw updateError;
      await onSave(formData);
      onClose();
    } catch (err: any) {
      setError(err.message || 'Failed to update resource');
    } finally {
      setLoading(false);
    }
  };

  const focusStyle = (e: React.FocusEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    e.currentTarget.style.borderColor = GOLD;
    e.currentTarget.style.borderTopColor = GOLD2;
  };
  const blurStyle = (e: React.FocusEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    e.currentTarget.style.borderColor = BORDER;
    e.currentTarget.style.borderTopColor = BORDER2;
  };

  return (
    <div
      style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.75)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: '1rem' }}
      onClick={onClose}
    >
      <div
        style={{ background: BG, border: `1px solid ${BORDER}`, borderTop: `1px solid ${BORDER2}`, borderRadius: '1rem', padding: '2rem', maxWidth: 560, width: '100%', maxHeight: '90vh', overflowY: 'auto', boxShadow: '0 24px 64px rgba(0,0,0,0.7)' }}
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', marginBottom: '1.75rem' }}>
          <div>
            <h2 style={{ fontFamily: SERIF, fontSize: '1.625rem', fontWeight: 500, color: GOLD2, letterSpacing: '0.02em', marginBottom: '0.2rem' }}>
              Edit Resource
            </h2>
            <p style={{ fontFamily: SANS, fontSize: '0.8125rem', color: MUTED }}>Changes are saved immediately</p>
          </div>
          <button
            onClick={onClose}
            style={{ background: 'transparent', border: 'none', color: MUTED, cursor: 'pointer', fontSize: '1.25rem', lineHeight: 1, padding: '0.25rem' }}
          >
            ✕
          </button>
        </div>

        {error && (
          <div style={{ padding: '0.75rem 1rem', marginBottom: '1.25rem', background: 'rgba(160,40,40,0.15)', border: '1px solid rgba(180,40,40,0.3)', borderRadius: '0.5rem' }}>
            <p style={{ fontFamily: SANS, fontSize: '0.8125rem', color: '#F09090' }}>{error}</p>
          </div>
        )}

        <form onSubmit={handleSubmit} style={{ display: 'grid', gap: '1.125rem' }}>

          {/* Title */}
          <div>
            <label style={labelStyle}>Title *</label>
            <input type="text" value={formData.title} required
              onChange={e => setFormData({ ...formData, title: e.target.value })}
              style={inputStyle} onFocus={focusStyle} onBlur={blurStyle} />
          </div>

          {/* Subject */}
          <div>
            <label style={labelStyle}>Subject *</label>
            <select value={formData.subject} required
              onChange={e => setFormData({ ...formData, subject: e.target.value })}
              style={{ ...inputStyle, cursor: 'pointer', appearance: 'none', WebkitAppearance: 'none' }}
              onFocus={focusStyle} onBlur={blurStyle}>
              {SUBJECTS.map(s => (
                <option key={s.code} value={s.code} style={{ background: '#0c1018' }}>{s.name} ({s.code})</option>
              ))}
            </select>
          </div>

          {/* Resource Type */}
          <div>
            <label style={labelStyle}>Resource Type *</label>
            <select value={formData.resource_type} required
              onChange={e => setFormData({ ...formData, resource_type: e.target.value })}
              style={{ ...inputStyle, cursor: 'pointer', appearance: 'none', WebkitAppearance: 'none' }}
              onFocus={focusStyle} onBlur={blurStyle}>
              {RESOURCE_TYPES.map(t => (
                <option key={t.value} value={t.value} style={{ background: '#0c1018' }}>{t.icon} {t.label}</option>
              ))}
            </select>
          </div>

          {/* Link */}
          <div>
            <label style={labelStyle}>Link *</label>
            <input type="url" value={formData.link} required
              onChange={e => setFormData({ ...formData, link: e.target.value })}
              style={inputStyle} onFocus={focusStyle} onBlur={blurStyle} />
          </div>

          {/* Description */}
          <div>
            <label style={labelStyle}>Description</label>
            <textarea value={formData.description} rows={3}
              onChange={e => setFormData({ ...formData, description: e.target.value })}
              style={{ ...inputStyle, resize: 'vertical', fontFamily: SANS }}
              onFocus={focusStyle as any} onBlur={blurStyle as any} />
          </div>

          {/* Buttons */}
          <div style={{ display: 'flex', gap: '0.75rem', marginTop: '0.25rem' }}>
            <button type="button" onClick={onClose} style={{
              flex: 1, padding: '0.625rem',
              background: 'transparent', color: MUTED,
              border: `1px solid ${BORDER}`, borderRadius: '6px',
              fontFamily: SANS, fontSize: '0.875rem', fontWeight: 600, cursor: 'pointer',
            }}>
              Cancel
            </button>
            <button type="submit" disabled={loading} style={{
              flex: 2, padding: '0.625rem',
              background: loading ? 'rgba(200,168,76,0.06)' : 'linear-gradient(180deg, rgba(201,168,76,0.22) 0%, rgba(201,168,76,0.12) 100%)',
              color: loading ? MUTED : GOLD2,
              border: `1px solid ${loading ? BORDER : BORDER2}`,
              borderTop: `1px solid ${loading ? BORDER : 'rgba(200,168,76,0.4)'}`,
              borderRadius: '6px',
              fontFamily: SERIF, fontSize: '1rem', fontWeight: 600,
              cursor: loading ? 'not-allowed' : 'pointer', letterSpacing: '0.03em',
            }}>
              {loading ? 'Saving…' : 'Save Changes'}
            </button>
          </div>

        </form>
      </div>
    </div>
  );
};

// Made with Bob
