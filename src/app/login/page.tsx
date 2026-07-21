'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useRouter } from 'next/navigation';
import { ThemeProvider } from '@/components/ThemeProvider';
import { ThemeToggle } from '@/components/ThemeToggle';

function LoginPageContent() {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [showForgotPassword, setShowForgotPassword] = useState(false);
  const [showForgotUsername, setShowForgotUsername] = useState(false);
  const [isDarkMode, setIsDarkMode] = useState(true);
  const router = useRouter();

  // Sync with theme
  useEffect(() => {
    const theme = document.documentElement.getAttribute('data-theme');
    setIsDarkMode(theme === 'dark');
    
    // Listen for theme changes
    const observer = new MutationObserver(() => {
      const newTheme = document.documentElement.getAttribute('data-theme');
      setIsDarkMode(newTheme === 'dark');
    });
    
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ['data-theme']
    });
    
    return () => observer.disconnect();
  }, []);

  const handleEmailAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setMessage('');

    const supabase = createClient();

    try {
      if (isLogin) {
        const { data, error } = await supabase.auth.signInWithPassword({
          email,
          password,
        });

        if (error) throw error;
        
        setMessage('Login successful! Redirecting...');
        setTimeout(() => router.push('/'), 1500);
      } else {
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
    <div className={`min-h-screen w-screen flex ${isDarkMode ? 'bg-zinc-950' : 'bg-slate-50'}`}>
      {/* LEFT PANEL: Auth Form */}
      <div className={`w-full lg:w-[40%] flex flex-col justify-center px-8 sm:px-16 ${isDarkMode ? 'bg-zinc-900/50 border-zinc-800/80' : 'bg-white border-slate-200'} border-r backdrop-blur-md relative`}>
        {/* Back to Home Link */}
        <a
          href="/"
          className={`absolute top-6 left-6 flex items-center gap-2 ${isDarkMode ? 'text-amber-400 hover:text-amber-300' : 'text-amber-600 hover:text-amber-700'} transition-colors text-sm font-medium`}
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
          </svg>
          Back to Archive
        </a>

        <div className="max-w-md w-full mx-auto space-y-8">
          {/* Header */}
          <div className="text-center lg:text-left">
            <h2 className={`font-serif text-4xl font-bold tracking-wide ${isDarkMode ? 'text-amber-400' : 'text-amber-600'} mb-2`}>
              Student Archive
            </h2>
            <p className={`text-sm ${isDarkMode ? 'text-zinc-400' : 'text-slate-600'} font-light`}>
              {isLogin ? 'Welcome back. Enter your credentials to continue.' : 'Create your archive account to begin.'}
            </p>
          </div>

          {/* Error/Success Messages */}
          {error && (
            <div className={`p-3 ${isDarkMode ? 'bg-red-950/50 border-red-900/50 text-red-400' : 'bg-red-50 border-red-200 text-red-700'} border rounded-lg text-sm`}>
              {error}
            </div>
          )}

          {message && (
            <div className={`p-3 ${isDarkMode ? 'bg-emerald-950/50 border-emerald-900/50 text-emerald-400' : 'bg-emerald-50 border-emerald-200 text-emerald-700'} border rounded-lg text-sm`}>
              {message}
              {message.includes('email') && (
                <div className="mt-2 text-xs italic text-emerald-500">
                  📧 Check your spam/junk folder if needed
                </div>
              )}
            </div>
          )}

          {/* Google OAuth */}
          <button
            onClick={handleGoogleAuth}
            disabled={loading}
            className={`w-full flex items-center justify-center gap-3 ${isDarkMode ? 'bg-zinc-800/80 hover:bg-zinc-700 text-zinc-100 border-zinc-700/60' : 'bg-white hover:bg-slate-50 text-slate-700 border-slate-300'} border py-3 px-4 rounded-xl font-medium transition-all duration-200 shadow-sm disabled:opacity-50 disabled:cursor-not-allowed`}
          >
            <svg width="18" height="18" viewBox="0 0 18 18">
              <path fill="#4285F4" d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844c-.209 1.125-.843 2.078-1.796 2.717v2.258h2.908c1.702-1.567 2.684-3.874 2.684-6.615z"/>
              <path fill="#34A853" d="M9 18c2.43 0 4.467-.806 5.956-2.184l-2.908-2.258c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332C2.438 15.983 5.482 18 9 18z"/>
              <path fill="#FBBC05" d="M3.964 10.707c-.18-.54-.282-1.117-.282-1.707 0-.593.102-1.17.282-1.709V4.958H.957C.347 6.173 0 7.548 0 9c0 1.452.348 2.827.957 4.042l3.007-2.335z"/>
              <path fill="#EA4335" d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0 5.482 0 2.438 2.017.957 4.958L3.964 7.29C4.672 5.163 6.656 3.58 9 3.58z"/>
            </svg>
            <span className="text-sm">Continue with Google</span>
          </button>

          {/* Divider */}
          <div className={`relative flex py-2 items-center ${isDarkMode ? 'text-zinc-600' : 'text-slate-400'}`}>
            <div className={`flex-grow border-t ${isDarkMode ? 'border-zinc-800' : 'border-slate-300'}`}></div>
            <span className="flex-shrink mx-4 text-xs tracking-widest uppercase font-light">or</span>
            <div className={`flex-grow border-t ${isDarkMode ? 'border-zinc-800' : 'border-slate-300'}`}></div>
          </div>

          {/* Email/Password Form */}
          <form onSubmit={handleEmailAuth} className="space-y-5">
            {!isLogin && (
              <div>
                <label className={`block text-xs font-medium tracking-wider uppercase ${isDarkMode ? 'text-zinc-400' : 'text-slate-600'} mb-1.5`}>
                  Full Name
                </label>
                <input
                  type="text"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  required={!isLogin}
                  className={`w-full ${isDarkMode ? 'bg-zinc-950/60 border-zinc-800 text-zinc-100 placeholder-zinc-600' : 'bg-white border-slate-300 text-slate-900 placeholder-slate-400'} border rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-amber-500/50 transition-all text-sm`}
                  placeholder="John Doe"
                />
              </div>
            )}

            <div>
              <label className={`block text-xs font-medium tracking-wider uppercase ${isDarkMode ? 'text-zinc-400' : 'text-slate-600'} mb-1.5`}>
                Email Address
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className={`w-full ${isDarkMode ? 'bg-zinc-950/60 border-zinc-800 text-zinc-100 placeholder-zinc-600' : 'bg-white border-slate-300 text-slate-900 placeholder-slate-400'} border rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-amber-500/50 transition-all text-sm`}
                placeholder="you@example.com"
              />
            </div>

            <div>
              <label className={`block text-xs font-medium tracking-wider uppercase ${isDarkMode ? 'text-zinc-400' : 'text-slate-600'} mb-1.5`}>
                Password
              </label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                minLength={6}
                className={`w-full ${isDarkMode ? 'bg-zinc-950/60 border-zinc-800 text-zinc-100 placeholder-zinc-600' : 'bg-white border-slate-300 text-slate-900 placeholder-slate-400'} border rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-amber-500/50 transition-all text-sm`}
                placeholder="••••••••"
              />
            </div>

            {/* Forgot Links */}
            {isLogin && (
              <div className="flex justify-between text-xs">
                <button
                  type="button"
                  onClick={() => {
                    setShowForgotPassword(true);
                    setError('');
                    setMessage('');
                  }}
                  className={`${isDarkMode ? 'text-amber-400 hover:text-amber-300' : 'text-amber-600 hover:text-amber-700'} transition-colors`}
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
                  className={`${isDarkMode ? 'text-amber-400 hover:text-amber-300' : 'text-amber-600 hover:text-amber-700'} transition-colors`}
                >
                  Forgot username?
                </button>
              </div>
            )}

            {/* Forgot Password Modal */}
            {showForgotPassword && (
              <div className={`p-4 ${isDarkMode ? 'bg-zinc-800/50 border-zinc-700/50' : 'bg-slate-100 border-slate-300'} border rounded-lg`}>
                <h3 className={`text-sm font-semibold mb-2 ${isDarkMode ? 'text-amber-400' : 'text-amber-600'}`}>Reset Password</h3>
                <p className={`text-xs ${isDarkMode ? 'text-zinc-400' : 'text-slate-600'} mb-3`}>
                  Enter your email to receive a password reset link.
                </p>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={handleForgotPassword}
                    disabled={loading}
                    className={`flex-1 px-3 py-2 bg-amber-500 hover:bg-amber-600 ${isDarkMode ? 'text-zinc-950' : 'text-white'} rounded-lg text-xs font-semibold transition-colors disabled:opacity-50`}
                  >
                    Send Link
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowForgotPassword(false)}
                    className={`px-3 py-2 ${isDarkMode ? 'bg-zinc-700 hover:bg-zinc-600 text-zinc-200' : 'bg-slate-200 hover:bg-slate-300 text-slate-700'} rounded-lg text-xs font-semibold transition-colors`}
                  >
                    Cancel
                  </button>
                </div>
              </div>
            )}

            {/* Forgot Username Modal */}
            {showForgotUsername && (
              <div className={`p-4 ${isDarkMode ? 'bg-zinc-800/50 border-zinc-700/50' : 'bg-slate-100 border-slate-300'} border rounded-lg`}>
                <h3 className={`text-sm font-semibold mb-2 ${isDarkMode ? 'text-amber-400' : 'text-amber-600'}`}>Retrieve Username</h3>
                <p className={`text-xs ${isDarkMode ? 'text-zinc-400' : 'text-slate-600'} mb-3`}>
                  Enter your email to retrieve your username.
                </p>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={handleForgotUsername}
                    disabled={loading}
                    className={`flex-1 px-3 py-2 bg-amber-500 hover:bg-amber-600 ${isDarkMode ? 'text-zinc-950' : 'text-white'} rounded-lg text-xs font-semibold transition-colors disabled:opacity-50`}
                  >
                    Get Username
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowForgotUsername(false)}
                    className={`px-3 py-2 ${isDarkMode ? 'bg-zinc-700 hover:bg-zinc-600 text-zinc-200' : 'bg-slate-200 hover:bg-slate-300 text-slate-700'} rounded-lg text-xs font-semibold transition-colors`}
                  >
                    Cancel
                  </button>
                </div>
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className={`w-full bg-amber-500 hover:bg-amber-600 ${isDarkMode ? 'text-zinc-950' : 'text-white'} font-bold py-3.5 px-4 rounded-xl shadow-lg ${isDarkMode ? 'shadow-amber-950/20' : 'shadow-amber-500/20'} transition-all duration-150 tracking-wide text-sm mt-2 disabled:opacity-50 disabled:cursor-not-allowed`}
            >
              {loading ? 'Please wait...' : isLogin ? 'Sign In' : 'Create Account'}
            </button>
          </form>

          {/* Toggle Login/Signup */}
          <div className={`text-center text-sm ${isDarkMode ? 'text-zinc-400' : 'text-slate-600'}`}>
            {isLogin ? "Don't have an account? " : "Already have an account? "}
            <button
              onClick={() => {
                setIsLogin(!isLogin);
                setError('');
                setMessage('');
              }}
              className={`${isDarkMode ? 'text-amber-400 hover:text-amber-300' : 'text-amber-600 hover:text-amber-700'} font-semibold transition-colors`}
            >
              {isLogin ? 'Sign up' : 'Sign in'}
            </button>
          </div>
        </div>
      </div>

      {/* RIGHT PANEL: Hero Section */}
      <div className={`hidden lg:flex lg:w-[60%] relative ${isDarkMode ? 'bg-zinc-900' : 'bg-gradient-to-br from-amber-50 to-slate-100'} items-center p-16 overflow-hidden`}>
        {/* Background effects */}
        {isDarkMode ? (
          <>
            <div className="absolute inset-0 bg-gradient-to-br from-zinc-950 via-zinc-900 to-zinc-800"></div>
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,transparent_0%,rgba(0,0,0,0.8)_100%)]"></div>
            <div className="absolute top-20 right-20 w-64 h-64 bg-amber-500/5 rounded-full blur-3xl"></div>
            <div className="absolute bottom-20 left-20 w-96 h-96 bg-amber-600/5 rounded-full blur-3xl"></div>
          </>
        ) : (
          <>
            <div className="absolute top-20 right-20 w-64 h-64 bg-amber-200/30 rounded-full blur-3xl"></div>
            <div className="absolute bottom-20 left-20 w-96 h-96 bg-amber-300/20 rounded-full blur-3xl"></div>
          </>
        )}

        <div className="relative z-10 max-w-xl space-y-6">
          <h1 className={`font-serif text-5xl font-medium tracking-tight ${isDarkMode ? 'text-zinc-100' : 'text-slate-900'} leading-tight`}>
            Join Our Global <span className={`${isDarkMode ? 'text-amber-400' : 'text-amber-600'} italic`}>Academic</span> Community
          </h1>
          
          <p className={`${isDarkMode ? 'text-zinc-400' : 'text-slate-600'} text-base leading-relaxed font-light`}>
            Gain immediate access to thousands of structured past papers, comprehensive study guides, and collaborative resources across all Cambridge IGCSE subjects.
          </p>

          {/* Feature List */}
          <div className="space-y-4 pt-4">
            {[
              { icon: '📝', title: 'Automarked Past Papers', desc: 'Instant feedback on practice papers with detailed solutions' },
              { icon: '🤝', title: 'Student Community', desc: 'Share and discover resources from peers worldwide' },
              { icon: '⭐', title: 'Quality Content', desc: 'Upvote system ensures the best resources rise to the top' }
            ].map((feature, i) => (
              <div key={i} className="flex gap-4 items-start">
                <div className="text-3xl">{feature.icon}</div>
                <div>
                  <h3 className={`${isDarkMode ? 'text-zinc-200' : 'text-slate-800'} font-semibold mb-1`}>{feature.title}</h3>
                  <p className={`${isDarkMode ? 'text-zinc-500' : 'text-slate-600'} text-sm`}>{feature.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Use existing ThemeToggle component */}
      <ThemeToggle />
    </div>
  );
}

export default function LoginPage() {
  return (
    <ThemeProvider>
      <LoginPageContent />
    </ThemeProvider>
  );
}

// Made with Bob