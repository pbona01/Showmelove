import { useEffect, useState } from 'react';
import {
  ArrowLeft,
  AtSign,
  CheckCircle2,
  Eye,
  EyeOff,
  KeyRound,
  Loader2,
  Lock,
  Mail,
  Sparkles,
  UserPlus,
} from 'lucide-react';
import { supabase, isSupabaseAuthConfigured } from '../lib/supabase';
import { LoveCoinHeartSvg } from './GiftArtwork';
import { Button, InputField } from './ui/DesignSystem';

type AuthMode = 'sign_in' | 'sign_up' | 'magic_link';

export function AuthScreen({ onBack }: { onBack?: () => void }) {
  const [mode, setMode] = useState<AuthMode>('sign_in');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [username, setUsername] = useState('');
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

  const handlePasswordSignIn = async () => {
    if (!supabase || !email.trim() || !password) {
      setStatus('error');
      setMessage('Enter your email and password to sign in.');
      return;
    }
    setStatus('loading');
    setMessage('');

    const { data, error } = await supabase.auth.signInWithPassword({
      email: email.trim(),
      password,
    });

    if (error) {
      setStatus('error');
      setMessage(error.message);
      return;
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
    const cleanUsername = username.trim().replace(/^@/, '');

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
    if (!email.trim() || !email.includes('@')) {
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
      email: email.trim(),
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

    if (data.session) {
      setStatus('success');
      setMessage(`Account created! Welcome to Showmelove, @${cleanUsername}.`);
      setTimeout(() => {
        if (onBack) onBack();
      }, 700);
    } else {
      setStatus('success');
      setMessage(
        `Account created for @${cleanUsername}! Please check your email (${email.trim()}) to confirm your account and sign in.`,
      );
    }
  };

  const handleMagicLink = async () => {
    if (!supabase || !email.trim()) {
      setStatus('error');
      setMessage('Enter your email address to continue.');
      return;
    }
    setStatus('loading');
    setMessage('');

    const redirectUrl =
      typeof window !== 'undefined' && window.location.origin.includes('showmelove.fun')
        ? 'https://showmelove.fun/'
        : `${window.location.origin}/`;

    const { error } = await supabase.auth.signInWithOtp({
      email: email.trim(),
      options: { emailRedirectTo: redirectUrl },
    });

    if (error) {
      setStatus('error');
      setMessage(error.message);
      return;
    }

    setStatus('success');
    setMessage(`We sent a one-time sign-in link to ${email.trim()}. Open the link in your email to access your wallet.`);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (mode === 'sign_in') {
      void handlePasswordSignIn();
    } else if (mode === 'sign_up') {
      void handleSignUp();
    } else {
      void handleMagicLink();
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
            {mode === 'sign_in'
              ? 'Sign in to Showmelove'
              : mode === 'sign_up'
                ? 'Create your account'
                : 'Passwordless Sign In'}
          </h1>
          <p className="text-sm text-[var(--text-secondary)] max-w-xs mx-auto leading-relaxed">
            {mode === 'sign_in'
              ? 'Enter your email and password to access your Love Coins and gifts.'
              : mode === 'sign_up'
                ? 'Choose a unique username and enter your email to get started.'
                : 'Enter your email to receive an instant one-time login link.'}
          </p>
        </div>

        {/* Mode Selector Tabs */}
        {mode !== 'magic_link' ? (
          <div className="grid grid-cols-2 p-1 rounded-2xl bg-[var(--bg-raised)] border border-[var(--border-subtle)]">
            <button
              type="button"
              onClick={() => {
                setMode('sign_in');
                setMessage('');
                setStatus('idle');
              }}
              className={`py-2 text-xs sm:text-sm font-bold rounded-xl transition-all cursor-pointer ${
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
              className={`py-2 text-xs sm:text-sm font-bold rounded-xl transition-all cursor-pointer ${
                mode === 'sign_up'
                  ? 'bg-[var(--bg-card)] text-[var(--text-primary)] shadow-sm'
                  : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
              }`}
            >
              Create Account
            </button>
          </div>
        ) : (
          <div className="flex justify-center">
            <button
              type="button"
              onClick={() => {
                setMode('sign_in');
                setMessage('');
                setStatus('idle');
              }}
              className="text-xs font-semibold text-[#E61472] dark:text-[#FF2385] hover:underline inline-flex items-center gap-1 cursor-pointer"
            >
              <KeyRound className="w-3.5 h-3.5" /> Back to password sign-in
            </button>
          </div>
        )}

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
            {/* Username field (Sign Up only) */}
            {mode === 'sign_up' && (
              <div className="space-y-1.5">
                <InputField
                  id="sign-up-username"
                  label="Choose a Username"
                  type="text"
                  autoComplete="username"
                  required
                  value={username}
                  onChange={(e) => setUsername(e.target.value.replace(/[^a-zA-Z0-9_@]/g, ''))}
                  placeholder="e.g. pbona"
                  hint="Letters, numbers, and underscores (3-20 characters)"
                />
              </div>
            )}

            {/* Email field */}
            <InputField
              id="sign-in-email"
              label="Email Address"
              type="email"
              autoComplete="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
            />

            {/* Password field (Sign In & Sign Up) */}
            {mode !== 'magic_link' && (
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <label htmlFor="auth-password" className="block text-sm font-medium text-[var(--text-primary)]">
                    Password
                  </label>
                  {mode === 'sign_in' && (
                    <button
                      type="button"
                      onClick={() => {
                        setMode('magic_link');
                        setMessage('');
                        setStatus('idle');
                      }}
                      className="text-xs font-medium text-[#E61472] dark:text-[#FF2385] hover:underline cursor-pointer"
                    >
                      Forgot password?
                    </button>
                  )}
                </div>
                <div className="relative">
                  <input
                    id="auth-password"
                    type={showPassword ? 'text' : 'password'}
                    autoComplete={mode === 'sign_in' ? 'current-password' : 'new-password'}
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder={mode === 'sign_up' ? 'Minimum 6 characters' : 'Enter your password'}
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
                {mode === 'sign_up' && (
                  <p className="text-xs text-[var(--text-secondary)]">Must be at least 6 characters</p>
                )}
              </div>
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
                  {mode === 'sign_in'
                    ? 'Signing in…'
                    : mode === 'sign_up'
                      ? 'Creating account…'
                      : 'Sending link…'}
                </>
              ) : mode === 'sign_in' ? (
                <>
                  <Lock className="w-4 h-4 mr-2" /> Sign In
                </>
              ) : mode === 'sign_up' ? (
                <>
                  <UserPlus className="w-4 h-4 mr-2" /> Create Account
                </>
              ) : (
                <>
                  <Mail className="w-4 h-4 mr-2" /> Send One-Time Sign-In Link
                </>
              )}
            </Button>

            {/* Footer switcher */}
            <div className="pt-2 text-center text-xs text-[var(--text-secondary)] space-y-1">
              {mode === 'sign_in' && (
                <button
                  type="button"
                  onClick={() => {
                    setMode('magic_link');
                    setMessage('');
                    setStatus('idle');
                  }}
                  className="text-xs text-[#E61472] dark:text-[#FF2385] hover:underline cursor-pointer block mx-auto"
                >
                  Or sign in with a passwordless email link
                </button>
              )}
              {mode === 'sign_up' && (
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
