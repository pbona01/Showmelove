import { useEffect, useState } from 'react';
import { ArrowLeft, CheckCircle2, Loader2 } from 'lucide-react';
import { supabase, isSupabaseAuthConfigured } from '../lib/supabase';
import { Button, InputField } from './ui/DesignSystem';

export function AuthScreen({ onBack }: { onBack: () => void }) {
  const [email, setEmail] = useState('');
  const [status, setStatus] = useState<'idle' | 'loading' | 'sent' | 'error'>('idle');
  const [message, setMessage] = useState('');

  useEffect(() => {
    if (!supabase) return;
    void supabase.auth.getSession().then(({ data }) => {
      if (data.session?.user.email) {
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
    const { error } = await supabase.auth.signInWithOtp({
      email: email.trim(),
      options: { emailRedirectTo: `${window.location.origin}/` },
    });
    if (error) {
      setStatus('error');
      setMessage(error.message);
      return;
    }
    setStatus('sent');
    setMessage('Check your inbox for the secure sign-in link.');
  };

  return (
    <div className="max-w-md mx-auto py-8 space-y-6">
      <button type="button" onClick={onBack} className="min-h-[44px] px-3 rounded-xl text-sm font-semibold text-[var(--text-primary)] hover:bg-[var(--bg-raised)]">
        <ArrowLeft className="inline w-4 h-4 mr-1" /> Back
      </button>
      <section className="apple-card rounded-[28px] p-6 sm:p-8 space-y-5">
        <div>
          <p className="text-[#DF0756] text-sm font-bold">SHOWMELOVE</p>
          <h1 className="text-2xl font-bold mt-1">Sign in securely</h1>
          <p className="text-sm text-[var(--text-secondary)] mt-2">We’ll email a one-time sign-in link. No password is stored in this app.</p>
        </div>
        {!isSupabaseAuthConfigured ? (
          <p role="alert" className="rounded-2xl bg-[#FFEAF2] p-4 text-sm text-[#9D174D]">Authentication is not configured yet. Add the Supabase Project URL and publishable key in Vercel, then redeploy.</p>
        ) : (
          <>
            <InputField id="sign-in-email" label="Email address" type="email" autoComplete="email" value={email} onChange={(event) => setEmail(event.target.value)} placeholder="you@example.com" />
            {message && <p role={status === 'error' ? 'alert' : 'status'} className={`rounded-xl p-3 text-sm ${status === 'error' ? 'bg-[#FFEAF2] text-[#9D174D]' : 'bg-[#E6F6EF] text-[#087F56]'}`}>{status === 'sent' && <CheckCircle2 className="inline w-4 h-4 mr-1" />}{message}</p>}
            <Button variant="primary" size="lg" fullWidth onClick={sendMagicLink} disabled={status === 'loading'}>
              {status === 'loading' ? <><Loader2 className="w-4 h-4 animate-spin" /> Sending…</> : 'Email me a sign-in link'}
            </Button>
          </>
        )}
      </section>
    </div>
  );
}

