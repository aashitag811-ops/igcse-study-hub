'use client';

import { useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useRouter } from 'next/navigation';

export default function LoginPage() {
  const [isLogin, setIsLogin] = useState(true); // true = Sign In, false = Sign Up
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [showForgotPassword, setShowForgotPassword] = useState(false);
  const [showForgotUsername, setShowForgotUsername] = useState(false);
  const router = useRouter();

  const handleEmailAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setMessage('');

    const supabase = createClient();

    try {
      if (isLogin) {
        // Login
        const { data, error } = await supabase.auth.signInWithPassword({
          email,
          password,
        });

        if (error) throw error;
        
        setMessage('Login successful! Redirecting...');
        setTimeout(() => router.push('/'), 1500);
      } else {
        // Sign up
        const { data, error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            data: {
              full_name: fullName,
            },
          },
        });

        if (error) throw error;

        setMessage('Account created! Please check your email to verify your account.');
      }
    } catch (err: any) {
      setError(err.message || 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleAuth = async () => {
    setLoading(true);
    setError('');

    const supabase = createClient();

    try {
      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: `${window.location.origin}/auth/callback`,
        },
      });

      if (error) throw error;
    } catch (err: any) {
      setError(err.message || 'An error occurred');
      setLoading(false);
    }
  };

  const handleForgotPassword = async () => {
    if (!email) {
      setError('Please enter your email address');
      return;
    }

    setLoading(true);
    setError('');
    setMessage('');

    const supabase = createClient();

    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/auth/callback`,
      });

      if (error) throw error;

      setMessage('Password reset email sent! Please check your inbox and spam folder.');
      setShowForgotPassword(false);
    } catch (err: any) {
      setError(err.message || 'Failed to send reset email');
    } finally {
      setLoading(false);
    }
  };

  const handleForgotUsername = async () => {
    if (!email) {
      setError('Please enter your email address');
      return;
    }

    setLoading(true);
    setError('');
    setMessage('');

    const supabase = createClient();

    try {
      // Fetch the user's profile to get their username
      const { data: profiles, error } = await supabase
        .from('profiles')
        .select('username, full_name')
        .eq('email', email)
        .single();

      if (error || !profiles) {
        throw new Error('No account found with this email address');
      }

      const profileData = profiles as any;
      setMessage(`Your username is: ${profileData.username || profileData.full_name || 'Not set'}. You can use your email to sign in.`);
      setShowForgotUsername(false);
    } catch (err: any) {
      setError(err.message || 'Failed to retrieve username');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      background: 'linear-gradient(135deg, #EFF6FF 0%, #F5F3FF 50%, #FCE7F3 100%)'
    }}>
      {/* Left Side - Form */}
      <div style={{
        flex: 1,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '2rem'
      }}>
        <div style={{
          width: '100%',
          maxWidth: '28rem',
          background: 'white',
          borderRadius: '1rem',
          boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1)',
          padding: '2.5rem'
        }}>
          {/* Logo/Title */}
          <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
            <h1 style={{
              fontSize: '2rem',
              fontWeight: '700',
              background: 'linear-gradient(90deg, #2563EB 0%, #9333EA 50%, #EC4899 100%)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              backgroundClip: 'text',
              fontFamily: "'Dancing Script', cursive",
              marginBottom: '0.5rem'
            }}>
              IGCSE Study Hub
            </h1>
            <p style={{ color: '#6B7280', fontSize: '0.875rem' }}>
              {isLogin ? 'Welcome back! Sign in to continue' : 'Create your account to get started'}
            </p>
          </div>

          {/* Error/Success Messages */}
          {error && (
            <div style={{
              padding: '0.75rem',
              marginBottom: '1rem',
              background: '#FEE2E2',
              border: '1px solid #EF4444',
              borderRadius: '0.5rem',
              color: '#DC2626',
              fontSize: '0.875rem'
            }}>
              {error}
            </div>
          )}

          {message && (
            <div style={{
              padding: '0.75rem',
              marginBottom: '1rem',
              background: '#D1FAE5',
              border: '1px solid #10B981',
              borderRadius: '0.5rem',
              color: '#059669',
              fontSize: '0.875rem'
            }}>
              {message}
              {message.includes('email') && (
                <div style={{ marginTop: '0.5rem', fontSize: '0.75rem', fontStyle: 'italic' }}>
                  📧 Please check your spam/junk folder if you don't see the email in your inbox.
                </div>
              )}
            </div>
          )}

          {/* Google Sign In */}
          <button
            onClick={handleGoogleAuth}
            disabled={loading}
            style={{
              width: '100%',
              padding: '0.75rem',
              marginBottom: '1.5rem',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '0.5rem',
              background: 'white',
              border: '2px solid #E5E7EB',
              borderRadius: '0.5rem',
              fontSize: '0.875rem',
              fontWeight: '600',
              color: '#374151',
              cursor: loading ? 'not-allowed' : 'pointer',
              transition: 'all 0.15s',
              opacity: loading ? 0.6 : 1
            }}
            onMouseOver={(e) => !loading && (e.currentTarget.style.background = '#F9FAFB')}
            onMouseOut={(e) => (e.currentTarget.style.background = 'white')}
          >
            <svg width="18" height="18" viewBox="0 0 18 18">
              <path fill="#4285F4" d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844c-.209 1.125-.843 2.078-1.796 2.717v2.258h2.908c1.702-1.567 2.684-3.874 2.684-6.615z"/>
              <path fill="#34A853" d="M9 18c2.43 0 4.467-.806 5.956-2.184l-2.908-2.258c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332C2.438 15.983 5.482 18 9 18z"/>
              <path fill="#FBBC05" d="M3.964 10.707c-.18-.54-.282-1.117-.282-1.707 0-.593.102-1.17.282-1.709V4.958H.957C.347 6.173 0 7.548 0 9c0 1.452.348 2.827.957 4.042l3.007-2.335z"/>
              <path fill="#EA4335" d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0 5.482 0 2.438 2.017.957 4.958L3.964 7.29C4.672 5.163 6.656 3.58 9 3.58z"/>
            </svg>
            Continue with Google
          </button>

          {/* Divider */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            marginBottom: '1.5rem'
          }}>
            <div style={{ flex: 1, height: '1px', background: '#E5E7EB' }}></div>
            <span style={{ padding: '0 1rem', color: '#9CA3AF', fontSize: '0.875rem' }}>or</span>
            <div style={{ flex: 1, height: '1px', background: '#E5E7EB' }}></div>
          </div>

          {/* Email/Password Form */}
          <form onSubmit={handleEmailAuth}>
            {!isLogin && (
              <div style={{ marginBottom: '1rem' }}>
                <label style={{
                  display: 'block',
                  marginBottom: '0.5rem',
                  fontSize: '0.875rem',
                  fontWeight: '600',
                  color: '#374151'
                }}>
                  Full Name
                </label>
                <input
                  type="text"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  required={!isLogin}
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
                  placeholder="John Doe"
                />
              </div>
            )}

            <div style={{ marginBottom: '1rem' }}>
              <label style={{
                display: 'block',
                marginBottom: '0.5rem',
                fontSize: '0.875rem',
                fontWeight: '600',
                color: '#374151'
              }}>
                Email
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
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
                placeholder="you@example.com"
              />
            </div>

            <div style={{ marginBottom: '1.5rem' }}>
              <label style={{
                display: 'block',
                marginBottom: '0.5rem',
                fontSize: '0.875rem',
                fontWeight: '600',
                color: '#374151'
              }}>
                Password
              </label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                minLength={6}
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
                placeholder="••••••••"
              />
            </div>

            {/* Forgot Password/Username Links */}
            {isLogin && (
              <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                marginBottom: '1.5rem',
                fontSize: '0.75rem'
              }}>
                <button
                  type="button"
                  onClick={() => {
                    setShowForgotPassword(true);
                    setError('');
                    setMessage('');
                  }}
                  style={{
                    color: '#2563EB',
                    background: 'none',
                    border: 'none',
                    cursor: 'pointer',
                    textDecoration: 'underline',
                    padding: 0
                  }}
                >
                  Forgot password?
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShowForgotUsername(true);
                    setError('');
                    setMessage('');
                  }}
                  style={{
                    color: '#2563EB',
                    background: 'none',
                    border: 'none',
                    cursor: 'pointer',
                    textDecoration: 'underline',
                    padding: 0
                  }}
                >
                  Forgot username?
                </button>
              </div>
            )}

            {/* Forgot Password Modal */}
            {showForgotPassword && (
              <div style={{
                padding: '1rem',
                marginBottom: '1rem',
                background: '#EFF6FF',
                border: '1px solid #BFDBFE',
                borderRadius: '0.5rem'
              }}>
                <h3 style={{ fontSize: '0.875rem', fontWeight: '600', marginBottom: '0.5rem', color: '#1E40AF' }}>
                  Reset Password
                </h3>
                <p style={{ fontSize: '0.75rem', color: '#6B7280', marginBottom: '0.75rem' }}>
                  Enter your email address and we'll send you a link to reset your password.
                </p>
                <div style={{ display: 'flex', gap: '0.5rem' }}>
                  <button
                    type="button"
                    onClick={handleForgotPassword}
                    disabled={loading}
                    style={{
                      flex: 1,
                      padding: '0.5rem',
                      background: '#2563EB',
                      color: 'white',
                      border: 'none',
                      borderRadius: '0.375rem',
                      fontSize: '0.75rem',
                      fontWeight: '600',
                      cursor: loading ? 'not-allowed' : 'pointer',
                      opacity: loading ? 0.6 : 1
                    }}
                  >
                    Send Reset Link
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowForgotPassword(false)}
                    style={{
                      padding: '0.5rem 1rem',
                      background: 'white',
                      color: '#6B7280',
                      border: '1px solid #D1D5DB',
                      borderRadius: '0.375rem',
                      fontSize: '0.75rem',
                      fontWeight: '600',
                      cursor: 'pointer'
                    }}
                  >
                    Cancel
                  </button>
                </div>
              </div>
            )}

            {/* Forgot Username Modal */}
            {showForgotUsername && (
              <div style={{
                padding: '1rem',
                marginBottom: '1rem',
                background: '#EFF6FF',
                border: '1px solid #BFDBFE',
                borderRadius: '0.5rem'
              }}>
                <h3 style={{ fontSize: '0.875rem', fontWeight: '600', marginBottom: '0.5rem', color: '#1E40AF' }}>
                  Retrieve Username
                </h3>
                <p style={{ fontSize: '0.75rem', color: '#6B7280', marginBottom: '0.75rem' }}>
                  Enter your email address to retrieve your username.
                </p>
                <div style={{ display: 'flex', gap: '0.5rem' }}>
                  <button
                    type="button"
                    onClick={handleForgotUsername}
                    disabled={loading}
                    style={{
                      flex: 1,
                      padding: '0.5rem',
                      background: '#2563EB',
                      color: 'white',
                      border: 'none',
                      borderRadius: '0.375rem',
                      fontSize: '0.75rem',
                      fontWeight: '600',
                      cursor: loading ? 'not-allowed' : 'pointer',
                      opacity: loading ? 0.6 : 1
                    }}
                  >
                    Get Username
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowForgotUsername(false)}
                    style={{
                      padding: '0.5rem 1rem',
                      background: 'white',
                      color: '#6B7280',
                      border: '1px solid #D1D5DB',
                      borderRadius: '0.375rem',
                      fontSize: '0.75rem',
                      fontWeight: '600',
                      cursor: 'pointer'
                    }}
                  >
                    Cancel
                  </button>
                </div>
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              style={{
                width: '100%',
                padding: '0.75rem',
                background: 'linear-gradient(145deg, #2563EB, #1D4ED8)',
                color: 'white',
                border: 'none',
                borderRadius: '0.5rem',
                fontSize: '0.875rem',
                fontWeight: '600',
                cursor: loading ? 'not-allowed' : 'pointer',
                transition: 'all 0.15s',
                boxShadow: '0 8px 16px rgba(37, 99, 235, 0.4)',
                opacity: loading ? 0.6 : 1
              }}
              onMouseDown={(e) => !loading && (e.currentTarget.style.transform = 'translateY(2px) scale(0.98)')}
              onMouseUp={(e) => (e.currentTarget.style.transform = 'translateY(0) scale(1)')}
              onMouseLeave={(e) => (e.currentTarget.style.transform = 'translateY(0) scale(1)')}
            >
              {loading ? 'Please wait...' : isLogin ? 'Sign In' : 'Create Account'}
            </button>
          </form>

          {/* Toggle Login/Signup */}
          <div style={{
            marginTop: '1.5rem',
            textAlign: 'center',
            fontSize: '0.875rem',
            color: '#6B7280'
          }}>
            {isLogin ? "Don't have an account? " : "Already have an account? "}
            <button
              onClick={() => {
                setIsLogin(!isLogin);
                setError('');
                setMessage('');
              }}
              style={{
                color: '#2563EB',
                fontWeight: '600',
                background: 'none',
                border: 'none',
                cursor: 'pointer',
                textDecoration: 'underline'
              }}
            >
              {isLogin ? 'Sign up' : 'Sign in'}
            </button>
          </div>
        </div>
      </div>

      {/* Right Side - Features */}
      <div style={{
        flex: 1,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '2rem',
        background: 'linear-gradient(135deg, #2563EB 0%, #9333EA 100%)',
        color: 'white'
      }}>
        <div style={{ maxWidth: '28rem' }}>
          <h2 style={{
            fontSize: '2.5rem',
            fontWeight: '700',
            marginBottom: '1.5rem',
            fontFamily: "'Pacifico', cursive"
          }}>
            Join Our Community
          </h2>
          <p style={{
            fontSize: '1.125rem',
            marginBottom: '2rem',
            opacity: 0.9,
            lineHeight: '1.75'
          }}>
            Access thousands of study resources shared by IGCSE students worldwide.
          </p>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
            {[
              { icon: '📚', title: 'Vast Resource Library', desc: 'Notes, flashcards, and revision guides for all subjects' },
              { icon: '🤝', title: 'Student Community', desc: 'Share and discover resources from peers' },
              { icon: '⭐', title: 'Quality Content', desc: 'Upvote system ensures the best resources rise to the top' }
            ].map((feature, i) => (
              <div key={i} style={{ display: 'flex', gap: '1rem' }}>
                <div style={{ fontSize: '2rem' }}>{feature.icon}</div>
                <div>
                  <h3 style={{ fontSize: '1.125rem', fontWeight: '600', marginBottom: '0.25rem' }}>
                    {feature.title}
                  </h3>
                  <p style={{ opacity: 0.8, fontSize: '0.875rem' }}>
                    {feature.desc}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

// Made with Bob