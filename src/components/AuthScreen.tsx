import { useEffect, useState } from 'react';
import {
  ArrowLeft,
  AtSign,
  CheckCircle2,
  Eye,
  EyeOff,
  Loader2,
  Lock,
  Mail,
  Sparkles,
  User,
  UserPlus,
} from 'lucide-react';
import { supabase, isSupabaseAuthConfigured } from '../lib/supabase';
import { LoveCoinHeartSvg } from './GiftArtwork';
import { Button, InputField } from './ui/DesignSystem';

type AuthMode = 'sign_in' | 'sign_up';

export function AuthScreen({ onBack }: { onBack?: () => void }) {
  const [mode, setMode] = useState<AuthMode>('sign_in');
  const [identifier, setIdentifier] = useState(''); // Email or Username
  const [password, setPassword] = useState('');
  const [signUpUsername, setSignUpUsername] = useState('');
  const [signUpEmail, setSignUpEmail] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [message, setMessage] = useState('');

  useEffect(() => {
    if (!supabase) return;
    void supabase.auth.getSession().then(({ data }: { data: any }) => {
      if (data.session?.user?.email) {
        setStatus('success');
        const handle = data.session.user.user_metadata?.username
          ? `@${data.session.user.user_metadata.username}`
          : data.session.user.email;
        setMessage(`Signed in as ${handle}.`);
      }
    });
  }, []);

  const resolveEmailFromIdentifier = async (id: string): Promise<string | null> => {
    const clean = id.trim().replace(/^@/, '');
    if (clean.includes('@')) {
      return clean.toLowerCase();
    }

    // Check local storage mapping first
    try {
      const rawMap = localStorage.getItem('showmelove_user_map');
      if (rawMap) {
        const parsed = JSON.parse(rawMap) as Record<string, string>;
        if (parsed[clean.toLowerCase()]) return parsed[clean.toLowerCase()];
      }
    } catch {
      // Ignore storage error
    }

    // Check serverless username resolver
    try {
      const res = await fetch(`/api/auth/resolve?username=${encodeURIComponent(clean)}`);
      if (res.ok) {
        const data = (await res.json()) as { email?: string };
        if (data.email) return data.email;
      }
    } catch {
      // Fallback
    }

    // Default admin and demo shortcuts fallback
    const WELL_KNOWN: Record<string, string> = {
      pbona: 'pbona717@gmail.com',
      pbona717: 'pbona717@gmail.com',
      '1virtue1x': '1virtue1x@gmail.com',
      virtue: '1virtue1x@gmail.com',
      ada: 'ada@showmelove.ng',
      tunde: 'tunde@showmelove.ng',
    };
    if (WELL_KNOWN[clean.toLowerCase()]) {
      return WELL_KNOWN[clean.toLowerCase()];
    }

    return null;
  };

  const handleSignIn = async () => {
    if (!supabase || !identifier.trim() || !password) {
      setStatus('error');
      setMessage('Enter your username or email and password to sign in.');
      return;
    }
    setStatus('loading');
    setMessage('');

    let targetEmail: string | null = identifier.trim();
    if (!targetEmail.includes('@')) {
      targetEmail = await resolveEmailFromIdentifier(targetEmail);
      if (!targetEmail) {
        setStatus('error');
        setMessage(`Could not find an account with username @${identifier.trim().replace(/^@/, '')}. Try your email address instead.`);
        return;
      }
    }

    const { data, error } = await supabase.auth.signInWithPassword({
      email: targetEmail,
      password,
    });

    if (error) {
      setStatus('error');
      setMessage(error.message);
      return;
    }

    // Cache username-to-email mapping locally
    if (data.user?.user_metadata?.username && data.user?.email) {
      try {
        const rawMap = localStorage.getItem('showmelove_user_map');
        const map = rawMap ? JSON.parse(rawMap) : {};
        map[data.user.user_metadata.username.toLowerCase()] = data.user.email;
        localStorage.setItem('showmelove_user_map', JSON.stringify(map));
      } catch {
        // Ignore storage error
      }
    }

    setStatus('success');
    const handle = data.user?.user_metadata?.username
      ? `@${data.user.user_metadata.username}`
      : (data.user?.email || 'your account');
    setMessage(`Welcome back, ${handle}! Accessing your wallet…`);
    setTimeout(() => {
      if (onBack) onBack();
    }, 600);
  };

  const handleSignUp = async () => {
    if (!supabase) return;
    const cleanUsername = signUpUsername.trim().replace(/^@/, '');

    if (!cleanUsername || cleanUsername.length < 3) {
      setStatus('error');
      setMessage('Username must be at least 3 characters long.');
      return;
    }
    if (!/^[a-zA-Z0-9_]{3,20}$/.test(cleanUsername)) {
      setStatus('error');
      setMessage('Username can only contain letters, numbers, and underscores (3-20 characters).');
      return;
    }
    if (!signUpEmail.trim() || !signUpEmail.includes('@')) {
      setStatus('error');
      setMessage('Enter a valid email address.');
      return;
    }
    if (!password || password.length < 6) {
      setStatus('error');
      setMessage('Password must be at least 6 characters long.');
      return;
    }

    setStatus('loading');
    setMessage('');

    const redirectUrl =
      typeof window !== 'undefined' && window.location.origin.includes('showmelove.fun')
        ? 'https://showmelove.fun/'
        : `${window.location.origin}/`;

    const { data, error } = await supabase.auth.signUp({
      email: signUpEmail.trim(),
      password,
      options: {
        emailRedirectTo: redirectUrl,
        data: {
          username: cleanUsername.toLowerCase(),
          display_name: cleanUsername,
          full_name: cleanUsername,
        },
      },
    });

    if (error) {
      setStatus('error');
      setMessage(error.message);
      return;
    }

    // Save username-to-email mapping
    try {
      const rawMap = localStorage.getItem('showmelove_user_map');
      const map = rawMap ? JSON.parse(rawMap) : {};
      map[cleanUsername.toLowerCase()] = signUpEmail.trim().toLowerCase();
      localStorage.setItem('showmelove_user_map', JSON.stringify(map));
    } catch {
      // Ignore storage error
    }

    if (data.session) {
      setStatus('success');
      setMessage(`Account created! Welcome to Showmelove, @${cleanUsername}.`);
      setTimeout(() => {
        if (onBack) onBack();
      }, 700);
    } else {
      setStatus('success');
      setMessage(
        `Account created for @${cleanUsername}! Check your email (${signUpEmail.trim()}) to confirm your account and sign in.`,
      );
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (mode === 'sign_in') {
      void handleSignIn();
    } else {
      void handleSignUp();
    }
  };

  return (
    <div className="max-w-md mx-auto py-8 px-4 space-y-6">
      {onBack && (
        <button
          type="button"
          onClick={onBack}
          className="min-h-[44px] px-3 rounded-xl text-sm font-semibold text-[var(--text-primary)] hover:bg-[var(--bg-raised)] transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#FF2385] cursor-pointer"
        >
          <ArrowLeft className="inline w-4 h-4 mr-1.5" /> Back
        </button>
      )}

      <section className="apple-card rounded-[32px] p-6 sm:p-8 space-y-6 border border-[var(--border-subtle)] shadow-xl bg-[var(--bg-card)]">
        {/* Header */}
        <div className="text-center space-y-2">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-3xl love-coin-surface shadow-md mx-auto mb-1">
            <LoveCoinHeartSvg className="w-11 h-11" priority />
          </div>
          <div className="inline-flex items-center gap-1.5 text-xs font-extrabold uppercase tracking-widest text-[#E61472] dark:text-[#FF2385]">
            <Sparkles className="w-3.5 h-3.5" /> Showmelove
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-[var(--text-primary)] tracking-tight">
            {mode === 'sign_in' ? 'Sign In' : 'Create Account'}
          </h1>
          <p className="text-sm text-[var(--text-secondary)] max-w-xs mx-auto leading-relaxed">
            {mode === 'sign_in'
              ? 'Enter your username or email and password to access your wallet.'
              : 'Choose a unique username and enter your email to get started.'}
          </p>
        </div>

        {/* 2-Mode Selector Tabs */}
        <div className="grid grid-cols-2 p-1 rounded-2xl bg-[var(--bg-raised)] border border-[var(--border-subtle)] text-center">
          <button
            type="button"
            onClick={() => {
              setMode('sign_in');
              setMessage('');
              setStatus('idle');
            }}
            className={`py-2 px-3 text-xs sm:text-sm font-bold rounded-xl transition-all cursor-pointer ${
              mode === 'sign_in'
                ? 'bg-[var(--bg-card)] text-[var(--text-primary)] shadow-sm'
                : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
            }`}
          >
            Sign In
          </button>
          <button
            type="button"
            onClick={() => {
              setMode('sign_up');
              setMessage('');
              setStatus('idle');
            }}
            className={`py-2 px-3 text-xs sm:text-sm font-bold rounded-xl transition-all cursor-pointer ${
              mode === 'sign_up'
                ? 'bg-[var(--bg-card)] text-[var(--text-primary)] shadow-sm'
                : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
            }`}
          >
            Create Account
          </button>
        </div>

        {!isSupabaseAuthConfigured ? (
          <div role="alert" className="rounded-2xl bg-[#FFEAF2] p-4 text-sm text-[#9D174D] space-y-1">
            <p className="font-bold">Authentication configuration pending</p>
            <p className="text-xs leading-relaxed">
              Set <code className="font-mono text-xs">VITE_SUPABASE_URL</code> and{' '}
              <code className="font-mono text-xs">VITE_SUPABASE_PUBLISHABLE_KEY</code> in Vercel to activate Supabase authentication.
            </p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* SIGN IN VIEW */}
            {mode === 'sign_in' && (
              <>
                <InputField
                  id="sign-in-identifier"
                  label="Username or Email"
                  type="text"
                  autoComplete="username"
                  required
                  value={identifier}
                  onChange={(e) => setIdentifier(e.target.value)}
                  placeholder="e.g. pbona or you@example.com"
                  hint="Enter your @username or email address"
                />

                <div className="space-y-1.5">
                  <label htmlFor="sign-in-password" className="block text-sm font-medium text-[var(--text-primary)]">
                    Password
                  </label>
                  <div className="relative">
                    <input
                      id="sign-in-password"
                      type={showPassword ? 'text' : 'password'}
                      autoComplete="current-password"
                      required
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="Enter your password"
                      className="w-full min-h-[46px] px-4 pr-11 py-2.5 rounded-2xl border border-[var(--border-subtle)] bg-[var(--bg-raised)] text-sm text-[var(--text-primary)] placeholder:text-[var(--text-secondary)]/70 focus:outline-none focus:ring-2 focus:ring-[#E10B5C]/30 focus:border-[#E10B5C] transition-colors"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      aria-label={showPassword ? 'Hide password' : 'Show password'}
                      className="absolute right-3.5 top-1/2 -translate-y-1/2 text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors p-1"
                    >
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>
              </>
            )}

            {/* SIGN UP VIEW */}
            {mode === 'sign_up' && (
              <>
                <InputField
                  id="sign-up-username"
                  label="Choose a Username"
                  type="text"
                  autoComplete="username"
                  required
                  value={signUpUsername}
                  onChange={(e) => setSignUpUsername(e.target.value.replace(/[^a-zA-Z0-9_@]/g, ''))}
                  placeholder="e.g. pbona"
                  hint="Letters, numbers, and underscores (3-20 characters)"
                />

                <InputField
                  id="sign-up-email"
                  label="Email Address"
                  type="email"
                  autoComplete="email"
                  required
                  value={signUpEmail}
                  onChange={(e) => setSignUpEmail(e.target.value)}
                  placeholder="you@example.com"
                />

                <div className="space-y-1.5">
                  <label htmlFor="sign-up-password" className="block text-sm font-medium text-[var(--text-primary)]">
                    Create Password
                  </label>
                  <div className="relative">
                    <input
                      id="sign-up-password"
                      type={showPassword ? 'text' : 'password'}
                      autoComplete="new-password"
                      required
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="Minimum 6 characters"
                      className="w-full min-h-[46px] px-4 pr-11 py-2.5 rounded-2xl border border-[var(--border-subtle)] bg-[var(--bg-raised)] text-sm text-[var(--text-primary)] placeholder:text-[var(--text-secondary)]/70 focus:outline-none focus:ring-2 focus:ring-[#E10B5C]/30 focus:border-[#E10B5C] transition-colors"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      aria-label={showPassword ? 'Hide password' : 'Show password'}
                      className="absolute right-3.5 top-1/2 -translate-y-1/2 text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors p-1"
                    >
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                  <p className="text-xs text-[var(--text-secondary)]">Must be at least 6 characters</p>
                </div>
              </>
            )}

            {/* Status / Error Message */}
            {message && (
              <p
                role={status === 'error' ? 'alert' : 'status'}
                className={`rounded-2xl p-3.5 text-xs font-semibold leading-relaxed ${
                  status === 'error'
                    ? 'bg-[#FFEAF2] text-[#9D174D] border border-rose-200 dark:bg-rose-950/40 dark:text-rose-300 dark:border-rose-900/50'
                    : 'bg-[#E6F6EF] text-[#087F56] border border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-900/50'
                }`}
              >
                {status === 'success' && <CheckCircle2 className="inline w-4 h-4 mr-1.5 shrink-0" />}
                {message}
              </p>
            )}

            {/* Submit Button */}
            <Button
              variant="primary"
              size="lg"
              fullWidth
              type="submit"
              disabled={status === 'loading'}
            >
              {status === 'loading' ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin mr-2" />
                  {mode === 'sign_in' ? 'Signing in…' : 'Creating account…'}
                </>
              ) : mode === 'sign_in' ? (
                <>
                  <Lock className="w-4 h-4 mr-2" /> Sign In
                </>
              ) : (
                <>
                  <UserPlus className="w-4 h-4 mr-2" /> Create Account
                </>
              )}
            </Button>

            {/* Footer switcher */}
            <div className="pt-2 text-center text-xs text-[var(--text-secondary)] space-y-1">
              {mode === 'sign_in' ? (
                <p>
                  Don't have an account?{' '}
                  <button
                    type="button"
                    onClick={() => {
                      setMode('sign_up');
                      setMessage('');
                      setStatus('idle');
                    }}
                    className="font-bold text-[#E61472] dark:text-[#FF2385] hover:underline cursor-pointer"
                  >
                    Create one now
                  </button>
                </p>
              ) : (
                <p>
                  Already have an account?{' '}
                  <button
                    type="button"
                    onClick={() => {
                      setMode('sign_in');
                      setMessage('');
                      setStatus('idle');
                    }}
                    className="font-bold text-[#E61472] dark:text-[#FF2385] hover:underline cursor-pointer"
                  >
                    Sign in
                  </button>
                </p>
              )}
            </div>
          </form>
        )}
      </section>
    </div>
  );
}
