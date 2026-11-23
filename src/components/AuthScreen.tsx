import { useEffect, useState } from 'react';
import { ArrowLeft, CheckCircle2, Loader2, Mail, Sparkles } from 'lucide-react';
import { supabase, isSupabaseAuthConfigured } from '../lib/supabase';
import { LoveCoinHeartSvg } from './GiftArtwork';
import { Button, InputField } from './ui/DesignSystem';

export function AuthScreen({ onBack }: { onBack?: () => void }) {
  const [email, setEmail] = useState('');
  const [status, setStatus] = useState<'idle' | 'loading' | 'sent' | 'error'>('idle');
  const [message, setMessage] = useState('');

  useEffect(() => {
    if (!supabase) return;
    void supabase.auth.getSession().then(({ data }: { data: any }) => {
      if (data.session?.user?.email) {
        setStatus('sent');
        setMessage(`Signed in as ${data.session.user.email}.`);
      }
    });
  }, []);

  const sendMagicLink = async () => {
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

    setStatus('sent');
    setMessage(`We sent a one-time sign-in link to ${email.trim()}. Open the link in your email to access your wallet.`);
  };

  return (
    <div className="max-w-md mx-auto py-10 px-4 space-y-6">
      {onBack && (
        <button
          type="button"
          onClick={onBack}
          className="min-h-[44px] px-3 rounded-xl text-sm font-semibold text-[var(--text-primary)] hover:bg-[var(--bg-raised)] transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#FF2385]"
        >
          <ArrowLeft className="inline w-4 h-4 mr-1.5" /> Back
        </button>
      )}

      <section className="apple-card rounded-[32px] p-6 sm:p-9 space-y-6 border border-[var(--border-subtle)] shadow-xl bg-[var(--bg-card)]">
        <div className="text-center space-y-2">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-3xl love-coin-surface shadow-md mx-auto mb-1">
            <LoveCoinHeartSvg className="w-11 h-11" priority />
          </div>
          <div className="inline-flex items-center gap-1.5 text-xs font-extrabold uppercase tracking-widest text-[#E61472] dark:text-[#FF2385]">
            <Sparkles className="w-3.5 h-3.5" /> Showmelove
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-[var(--text-primary)] tracking-tight">
            Sign in to Showmelove
          </h1>
          <p className="text-sm text-[var(--text-secondary)] max-w-xs mx-auto leading-relaxed">
            Enter your email to receive a secure, passwordless magic link to access your Love Coins and gifts.
          </p>
        </div>

        {!isSupabaseAuthConfigured ? (
          <div role="alert" className="rounded-2xl bg-[#FFEAF2] p-4 text-sm text-[#9D174D] space-y-1">
            <p className="font-bold">Authentication configuration pending</p>
            <p className="text-xs leading-relaxed">
              Set <code className="font-mono text-xs">VITE_SUPABASE_URL</code> and{' '}
              <code className="font-mono text-xs">VITE_SUPABASE_PUBLISHABLE_KEY</code> in Vercel to activate magic link sign-in.
            </p>
          </div>
        ) : (
          <form
            onSubmit={(e) => {
              e.preventDefault();
              void sendMagicLink();
            }}
            className="space-y-4"
          >
            <InputField
              id="sign-in-email"
              label="Your email address"
              type="email"
              autoComplete="email"
              required
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              placeholder="you@example.com"
            />

            {message && (
              <p
                role={status === 'error' ? 'alert' : 'status'}
                className={`rounded-2xl p-3.5 text-xs font-semibold leading-relaxed ${
                  status === 'error'
                    ? 'bg-[#FFEAF2] text-[#9D174D] border border-rose-200'
                    : 'bg-[#E6F6EF] text-[#087F56] border border-emerald-200'
                }`}
              >
                {status === 'sent' && <CheckCircle2 className="inline w-4 h-4 mr-1.5 shrink-0" />}
                {message}
              </p>
            )}

            <Button
              variant="primary"
              size="lg"
              fullWidth
              type="submit"
              disabled={status === 'loading'}
            >
              {status === 'loading' ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin mr-2" /> Sending sign-in link…
                </>
              ) : (
                <>
                  <Mail className="w-4 h-4 mr-2" /> Email me a sign-in link
                </>
              )}
            </Button>

            <p className="text-[11px] text-center text-[var(--text-secondary)] pt-2">
              No passwords required · Instant access from your email
            </p>
          </form>
        )}
      </section>
    </div>
  );
}
