import { useEffect, useState } from 'react';
import {
  ArrowLeft,
  CheckCircle2,
  Eye,
  EyeOff,
  KeyRound,
  Loader2,
  Lock,
  Mail,
  RefreshCw,
  ShieldCheck,
  Sparkles,
  User,
  UserPlus,
} from 'lucide-react';
import { supabase, isSupabaseAuthConfigured } from '../lib/supabase';
import { ShowmeloveBrandIcon } from './GiftArtwork';
import { Button, InputField } from './ui/DesignSystem';

export type AuthMode =
  | 'sign_in'
  | 'sign_up'
  | 'verify_signup_code'
  | 'forgot_password'
  | 'verify_reset_code'
  | 'set_new_password';

interface AuthScreenProps {
  onBack?: () => void;
  onAdminRoute?: (adminEmail?: string) => void;
}

export function AuthScreen({ onBack, onAdminRoute }: AuthScreenProps) {
  const [mode, setMode] = useState<AuthMode>('sign_in');
  const [identifier, setIdentifier] = useState(''); // Email or Username
  const [password, setPassword] = useState('');
  const [signUpUsername, setSignUpUsername] = useState('');
  const [signUpName, setSignUpName] = useState('');
  const [signUpEmail, setSignUpEmail] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  // OTP Code & Password Reset States
  const [otpCode, setOtpCode] = useState('');
  const [pendingEmail, setPendingEmail] = useState('');
  const [pendingUsername, setPendingUsername] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [resendCooldown, setResendCooldown] = useState(0);

  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [message, setMessage] = useState('');

  // Countdown timer for code resend cooldown
  useEffect(() => {
    if (resendCooldown <= 0) return;
    const timer = setInterval(() => {
      setResendCooldown((prev) => (prev > 0 ? prev - 1 : 0));
    }, 1000);
    return () => clearInterval(timer);
  }, [resendCooldown]);

  useEffect(() => {
    const isRecoveryLink =
      typeof window !== 'undefined' &&
      new URLSearchParams(window.location.search).get('reset') === '1';

    if (isRecoveryLink) {
      setMode('set_new_password');
      setStatus('idle');
      setMessage('Choose a new password for your account.');
      return;
    }

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


    return null;
  };

  // 1. SIGN IN
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
        setMessage(
          `Could not find an account with username @${identifier.trim().replace(/^@/, '')}. Try your email address instead.`,
        );
        return;
      }
    }

    const { data, error } = await supabase.auth.signInWithPassword({
      email: targetEmail,
      password,
    });

    if (error) {
      setStatus('error');
      // If error indicates unconfirmed email, allow quick transition to OTP verification
      if (
        error.message.toLowerCase().includes('email not confirmed') ||
        error.message.toLowerCase().includes('not confirmed')
      ) {
        setPendingEmail(targetEmail);
        setMessage('Your email has not been verified yet. Enter the verification code sent to your email.');
        setMode('verify_signup_code');
        return;
      }
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
      : data.user?.email || 'your account';
    setMessage(`Welcome back, ${handle}! Accessing your wallet…`);
    setTimeout(() => {
      if (onBack) onBack();
    }, 600);
  };

  // 2. CREATE ACCOUNT (SIGN UP)
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
    const cleanName = signUpName.trim();
    if (!cleanName) {
      setStatus('error');
      setMessage('Enter the name you want people to see on Showmelove.');
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

    const targetEmail = signUpEmail.trim().toLowerCase();

    const { data, error } = await supabase.auth.signUp({
      email: targetEmail,
      password,
      options: {
        data: {
          username: cleanUsername.toLowerCase(),
          display_name: cleanName,
          full_name: cleanName,
        },
      },
    });

    if (error) {
      setStatus('error');
      setMessage(error.message);
      return;
    }

    // Save username-to-email mapping locally
    try {
      const rawMap = localStorage.getItem('showmelove_user_map');
      const map = rawMap ? JSON.parse(rawMap) : {};
      map[cleanUsername.toLowerCase()] = targetEmail;
      localStorage.setItem('showmelove_user_map', JSON.stringify(map));
    } catch {
      // Ignore storage error
    }

    if (data.session) {
      // Instant session (auto-confirmation enabled in Supabase project)
      setStatus('success');
      setMessage(`Account created! Welcome to Showmelove, @${cleanUsername}.`);
      setTimeout(() => {
        if (onBack) onBack();
      }, 700);
    } else {
      // Verification code required: seamlessly switch to 8-digit code verification
      setPendingEmail(targetEmail);
      setPendingUsername(cleanUsername);
      setOtpCode('');
      setResendCooldown(45);
      setStatus('idle');
      setMessage(`We sent a 8-digit verification code to ${targetEmail}.`);
      setMode('verify_signup_code');
    }
  };

  // 3. VERIFY SIGNUP CODE (OTP)
  const handleVerifySignUpCode = async () => {
    if (!supabase || !pendingEmail || !otpCode.trim()) {
      setStatus('error');
      setMessage('Please enter the 8-digit verification code.');
      return;
    }

    setStatus('loading');
    setMessage('');

    const cleanToken = otpCode.trim();

    // Verify OTP using type 'signup' (or fallback to 'email')
    let result = await supabase.auth.verifyOtp({
      email: pendingEmail,
      token: cleanToken,
      type: 'signup',
    });

    if (result.error) {
      result = await supabase.auth.verifyOtp({
        email: pendingEmail,
        token: cleanToken,
        type: 'email',
      });
    }

    if (result.error) {
      setStatus('error');
      setMessage(result.error.message || 'Invalid or expired verification code. Please check and try again.');
      return;
    }

    setStatus('success');
    const userHandle = pendingUsername ? `@${pendingUsername}` : pendingEmail;
    setMessage(`Email verified! Welcome to Showmelove, ${userHandle}.`);
    setTimeout(() => {
      if (onBack) onBack();
    }, 700);
  };

  // 4. FORGOT PASSWORD - REQUEST 6-DIGIT CODE
  const handleSendResetCode = async () => {
    if (!supabase || !identifier.trim()) {
      setStatus('error');
      setMessage('Enter your username or email address to receive a password-reset link.');
      return;
    }

    setStatus('loading');
    setMessage('');

    let targetEmail: string | null = identifier.trim();
    if (!targetEmail.includes('@')) {
      targetEmail = await resolveEmailFromIdentifier(targetEmail);
      if (!targetEmail) {
        setStatus('error');
        setMessage(
          `Could not find an account with username @${identifier.trim().replace(/^@/, '')}. Try your email address.`,
        );
        return;
      }
    }

    const redirectTo =
      typeof window !== 'undefined'
        ? `${window.location.origin}/sign-in?reset=1`
        : undefined;
    const { error } = await supabase.auth.resetPasswordForEmail(targetEmail, { redirectTo });

    if (error) {
      setStatus('error');
      setMessage(error.message);
      return;
    }

    setStatus('success');
    setMessage(`We sent a password-reset link to ${targetEmail}. Open that link to choose a new password.`);
    setMode('sign_in');
  };

  // 5. VERIFY RESET PASSWORD CODE (OTP)
  const handleVerifyResetCode = async () => {
    if (!supabase || !pendingEmail || !otpCode.trim()) {
      setStatus('error');
      setMessage('Please enter the 8-digit verification code.');
      return;
    }

    setStatus('loading');
    setMessage('');

    const { data, error } = await supabase.auth.verifyOtp({
      email: pendingEmail,
      token: otpCode.trim(),
      type: 'recovery',
    });

    if (error) {
      setStatus('error');
      setMessage(error.message || 'Invalid or expired reset code. Please try again.');
      return;
    }

    setStatus('success');
    setMessage('Code verified! Now set your new password.');
    setTimeout(() => {
      setStatus('idle');
      setMessage('');
      setMode('set_new_password');
    }, 400);
  };

  // 6. SET NEW PASSWORD
  const handleSetNewPassword = async () => {
    if (!supabase) return;

    if (!newPassword || newPassword.length < 6) {
      setStatus('error');
      setMessage('Password must be at least 6 characters long.');
      return;
    }

    if (newPassword !== confirmPassword) {
      setStatus('error');
      setMessage('Passwords do not match. Please re-enter.');
      return;
    }

    setStatus('loading');
    setMessage('');

    const { error } = await supabase.auth.updateUser({
      password: newPassword,
    });

    if (error) {
      setStatus('error');
      setMessage(error.message);
      return;
    }

    setStatus('success');
    setMessage('Password successfully updated! Accessing your wallet…');
    setTimeout(() => {
      if (onBack) onBack();
    }, 700);
  };

  // RESEND CODE HELPER
  const handleResendCode = async (purpose: 'signup' | 'recovery') => {
    if (!supabase || !pendingEmail || resendCooldown > 0) return;
    setStatus('loading');
    setMessage('');

    try {
      if (purpose === 'signup') {
        const { error } = await supabase.auth.resend({
          type: 'signup',
          email: pendingEmail,
        });
        if (error) throw error;
      } else {
        const { error } = await supabase.auth.resetPasswordForEmail(pendingEmail);
        if (error) throw error;
      }
      setResendCooldown(45);
      setStatus('idle');
      setMessage(`A fresh 8-digit verification code has been sent to ${pendingEmail}.`);
    } catch (err: any) {
      setStatus('error');
      setMessage(err.message || 'Failed to resend code. Please try again in a few seconds.');
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (mode === 'sign_in') {
      void handleSignIn();
    } else if (mode === 'sign_up') {
      void handleSignUp();
    } else if (mode === 'verify_signup_code') {
      void handleVerifySignUpCode();
    } else if (mode === 'forgot_password') {
      void handleSendResetCode();
    } else if (mode === 'verify_reset_code') {
      void handleVerifyResetCode();
    } else if (mode === 'set_new_password') {
      void handleSetNewPassword();
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
            <ShowmeloveBrandIcon className="w-12 h-12" />
          </div>
          <div className="inline-flex items-center gap-1.5 text-xs font-extrabold uppercase tracking-widest text-[#E61472] dark:text-[#FF2385]">
            <Sparkles className="w-3.5 h-3.5" /> Showmelove
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-[var(--text-primary)] tracking-tight">
            {mode === 'sign_in' && 'Sign In'}
            {mode === 'sign_up' && 'Create Account'}
            {mode === 'verify_signup_code' && 'Verify Email Code'}
            {mode === 'forgot_password' && 'Reset Password'}
            {mode === 'verify_reset_code' && 'Enter Security Code'}
            {mode === 'set_new_password' && 'Create New Password'}
          </h1>
          <p className="text-sm text-[var(--text-secondary)] max-w-xs mx-auto leading-relaxed">
            {mode === 'sign_in' && 'Enter your username or email and password to access your wallet.'}
            {mode === 'sign_up' && 'Add the name people will see, choose a username, and enter your email to get started.'}
            {mode === 'verify_signup_code' && (
              <>
                Enter the 8-digit verification code sent to <strong className="text-[var(--text-primary)]">{pendingEmail}</strong>.
              </>
            )}
            {mode === 'forgot_password' && 'Enter your username or email address and we will send you a 8-digit code to reset your password.'}
            {mode === 'verify_reset_code' && (
              <>
                Enter the 8-digit security code sent to <strong className="text-[var(--text-primary)]">{pendingEmail}</strong>.
              </>
            )}
            {mode === 'set_new_password' && 'Choose a secure new password for your Showmelove account.'}
          </p>
        </div>

        {/* 2-Mode Selector Tabs (Shown only on main Sign In / Sign Up screens) */}
        {(mode === 'sign_in' || mode === 'sign_up') && (
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
            {/* 1. SIGN IN VIEW */}
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
                  <div className="flex items-center justify-between">
                    <label htmlFor="sign-in-password" className="block text-sm font-medium text-[var(--text-primary)]">
                      Password
                    </label>
                    <button
                      type="button"
                      onClick={() => {
                        setMode('forgot_password');
                        setMessage('');
                        setStatus('idle');
                      }}
                      className="text-xs font-bold text-[#E61472] dark:text-[#FF2385] hover:underline cursor-pointer"
                    >
                      Forgot password?
                    </button>
                  </div>
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
                      className="absolute right-3.5 top-1/2 -translate-y-1/2 text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors p-1 cursor-pointer"
                    >
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>
              </>
            )}

            {/* 2. SIGN UP VIEW */}
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
                  id="sign-up-name"
                  label="Your Name"
                  type="text"
                  autoComplete="name"
                  required
                  value={signUpName}
                  onChange={(e) => setSignUpName(e.target.value)}
                  placeholder="e.g. Peter Davvy"
                  hint="This is the name people see on your profile, gifts, and dashboard."
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
                      className="absolute right-3.5 top-1/2 -translate-y-1/2 text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors p-1 cursor-pointer"
                    >
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                  <p className="text-xs text-[var(--text-secondary)]">Must be at least 6 characters</p>
                </div>
              </>
            )}

            {/* 3. VERIFY SIGNUP CODE (OTP) */}
            {mode === 'verify_signup_code' && (
              <div className="space-y-4">
                <div className="space-y-1.5">
                  <label htmlFor="otp-signup-code" className="block text-sm font-medium text-[var(--text-primary)] text-center">
                    8-Digit Verification Code
                  </label>
                  <input
                    id="otp-signup-code"
                    type="text"
                    inputMode="numeric"
                    autoComplete="one-time-code"
                    maxLength={8}
                    autoFocus
                    required
                    value={otpCode}
                    onChange={(e) => setOtpCode(e.target.value.replace(/[^0-9]/g, '').slice(0, 8))}
                    placeholder="12345678"
                    className="w-full h-14 text-center tracking-[0.4em] font-mono text-2xl font-black rounded-2xl border border-[var(--border-subtle)] bg-[var(--bg-raised)] text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-[#FF2385]"
                  />
                  <p className="text-xs text-center text-[var(--text-secondary)]">
                    Check your email inbox or spam folder for the code.
                  </p>
                </div>

                <div className="flex items-center justify-between text-xs pt-1">
                  <button
                    type="button"
                    onClick={() => void handleResendCode('signup')}
                    disabled={resendCooldown > 0 || status === 'loading'}
                    className={`font-bold inline-flex items-center gap-1 cursor-pointer ${
                      resendCooldown > 0
                        ? 'text-[var(--text-secondary)] cursor-not-allowed'
                        : 'text-[#E61472] dark:text-[#FF2385] hover:underline'
                    }`}
                  >
                    <RefreshCw className={`w-3.5 h-3.5 ${resendCooldown > 0 ? 'animate-spin' : ''}`} />
                    <span>{resendCooldown > 0 ? `Resend code in ${resendCooldown}s` : 'Resend Code'}</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setMode('sign_up');
                      setMessage('');
                      setStatus('idle');
                    }}
                    className="text-[var(--text-secondary)] hover:text-[var(--text-primary)] font-medium cursor-pointer"
                  >
                    Change Email
                  </button>
                </div>
              </div>
            )}

            {/* 4. FORGOT PASSWORD VIEW */}
            {mode === 'forgot_password' && (
              <div className="space-y-4">
                <InputField
                  id="forgot-password-identifier"
                  label="Username or Email"
                  type="text"
                  autoComplete="username"
                  required
                  value={identifier}
                  onChange={(e) => setIdentifier(e.target.value)}
                  placeholder="e.g. pbona or you@example.com"
                  hint="We will email you a secure password-reset link"
                />

                <div className="pt-1 text-center">
                  <button
                    type="button"
                    onClick={() => {
                      setMode('sign_in');
                      setMessage('');
                      setStatus('idle');
                    }}
                    className="text-xs font-bold text-[var(--text-secondary)] hover:text-[var(--text-primary)] inline-flex items-center gap-1 cursor-pointer"
                  >
                    <ArrowLeft className="w-3.5 h-3.5" /> Back to Sign In
                  </button>
                </div>
              </div>
            )}

            {/* 5. VERIFY RESET CODE (OTP) */}
            {mode === 'verify_reset_code' && (
              <div className="space-y-4">
                <div className="space-y-1.5">
                  <label htmlFor="otp-reset-code" className="block text-sm font-medium text-[var(--text-primary)] text-center">
                    8-Digit Security Code
                  </label>
                  <input
                    id="otp-reset-code"
                    type="text"
                    inputMode="numeric"
                    autoComplete="one-time-code"
                    maxLength={8}
                    autoFocus
                    required
                    value={otpCode}
                    onChange={(e) => setOtpCode(e.target.value.replace(/[^0-9]/g, '').slice(0, 8))}
                    placeholder="12345678"
                    className="w-full h-14 text-center tracking-[0.4em] font-mono text-2xl font-black rounded-2xl border border-[var(--border-subtle)] bg-[var(--bg-raised)] text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-[#FF2385]"
                  />
                  <p className="text-xs text-center text-[var(--text-secondary)]">
                    Enter the code sent to {pendingEmail}.
                  </p>
                </div>

                <div className="flex items-center justify-between text-xs pt-1">
                  <button
                    type="button"
                    onClick={() => void handleResendCode('recovery')}
                    disabled={resendCooldown > 0 || status === 'loading'}
                    className={`font-bold inline-flex items-center gap-1 cursor-pointer ${
                      resendCooldown > 0
                        ? 'text-[var(--text-secondary)] cursor-not-allowed'
                        : 'text-[#E61472] dark:text-[#FF2385] hover:underline'
                    }`}
                  >
                    <RefreshCw className={`w-3.5 h-3.5 ${resendCooldown > 0 ? 'animate-spin' : ''}`} />
                    <span>{resendCooldown > 0 ? `Resend code in ${resendCooldown}s` : 'Resend Code'}</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setMode('sign_in');
                      setMessage('');
                      setStatus('idle');
                    }}
                    className="text-[var(--text-secondary)] hover:text-[var(--text-primary)] font-medium cursor-pointer"
                  >
                    Back to Sign In
                  </button>
                </div>
              </div>
            )}

            {/* 6. SET NEW PASSWORD VIEW */}
            {mode === 'set_new_password' && (
              <div className="space-y-4">
                <div className="space-y-1.5">
                  <label htmlFor="new-password" className="block text-sm font-medium text-[var(--text-primary)]">
                    New Password
                  </label>
                  <div className="relative">
                    <input
                      id="new-password"
                      type={showNewPassword ? 'text' : 'password'}
                      autoComplete="new-password"
                      required
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      placeholder="Minimum 6 characters"
                      className="w-full min-h-[46px] px-4 pr-11 py-2.5 rounded-2xl border border-[var(--border-subtle)] bg-[var(--bg-raised)] text-sm text-[var(--text-primary)] placeholder:text-[var(--text-secondary)]/70 focus:outline-none focus:ring-2 focus:ring-[#E10B5C]/30 focus:border-[#E10B5C] transition-colors"
                    />
                    <button
                      type="button"
                      onClick={() => setShowNewPassword(!showNewPassword)}
                      aria-label={showNewPassword ? 'Hide password' : 'Show password'}
                      className="absolute right-3.5 top-1/2 -translate-y-1/2 text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors p-1 cursor-pointer"
                    >
                      {showNewPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label htmlFor="confirm-new-password" className="block text-sm font-medium text-[var(--text-primary)]">
                    Confirm New Password
                  </label>
                  <input
                    id="confirm-new-password"
                    type={showNewPassword ? 'text' : 'password'}
                    autoComplete="new-password"
                    required
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="Re-enter your new password"
                    className="w-full min-h-[46px] px-4 py-2.5 rounded-2xl border border-[var(--border-subtle)] bg-[var(--bg-raised)] text-sm text-[var(--text-primary)] placeholder:text-[var(--text-secondary)]/70 focus:outline-none focus:ring-2 focus:ring-[#E10B5C]/30 focus:border-[#E10B5C] transition-colors"
                  />
                </div>
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

            {/* Primary Action Button */}
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
                  {mode === 'sign_in' && 'Signing in…'}
                  {mode === 'sign_up' && 'Creating account…'}
                  {mode === 'verify_signup_code' && 'Verifying code…'}
                  {mode === 'forgot_password' && 'Sending code…'}
                  {mode === 'verify_reset_code' && 'Verifying code…'}
                  {mode === 'set_new_password' && 'Updating password…'}
                </>
              ) : mode === 'sign_in' ? (
                <>
                  <Lock className="w-4 h-4 mr-2" /> Sign In
                </>
              ) : mode === 'sign_up' ? (
                <>
                  <UserPlus className="w-4 h-4 mr-2" /> Create Account
                </>
              ) : mode === 'verify_signup_code' ? (
                <>
                  <ShieldCheck className="w-4 h-4 mr-2" /> Verify &amp; Activate Account
                </>
              ) : mode === 'forgot_password' ? (
                <>
                  <Mail className="w-4 h-4 mr-2" /> Send Password-Reset Link
                </>
              ) : mode === 'verify_reset_code' ? (
                <>
                  <KeyRound className="w-4 h-4 mr-2" /> Verify Code
                </>
              ) : (
                <>
                  <CheckCircle2 className="w-4 h-4 mr-2" /> Update Password &amp; Sign In
                </>
              )}
            </Button>

            {/* Footer switcher for Sign In / Sign Up */}
            {mode === 'sign_in' && (
              <div className="pt-2 text-center text-xs text-[var(--text-secondary)]">
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
              </div>
            )}

            {mode === 'sign_up' && (
              <div className="pt-2 text-center text-xs text-[var(--text-secondary)]">
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
              </div>
            )}
          </form>
        )}
      </section>
    </div>
  );
}
