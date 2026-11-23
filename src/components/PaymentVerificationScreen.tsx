import { useEffect, useState } from 'react';
import { CheckCircle2, Clock3, XCircle } from 'lucide-react';
import { useShowmelove } from '../context/ShowmeloveContext';
import { supabase } from '../lib/supabase';

export function PaymentVerificationScreen({ onDone }: { onDone: () => void }) {
  const { refreshLiveWallet } = useShowmelove();
  const [state, setState] = useState<'checking' | 'confirmed' | 'pending' | 'error'>('checking');

  useEffect(() => {
    const reference = new URLSearchParams(window.location.search).get('reference');
    if (!reference) {
      setState('error');
      return;
    }

    let attempts = 0;
    let isCancelled = false;

    const check = async () => {
      try {
        let authHeader = '';
        if (supabase) {
          const { data } = await supabase.auth.getSession();
          if (data.session?.access_token) {
            authHeader = `Bearer ${data.session.access_token}`;
          }
        }

        const headers: Record<string, string> = {};
        if (authHeader) headers.Authorization = authHeader;

        const response = await fetch(`/api/paystack/status?reference=${encodeURIComponent(reference)}`, {
          headers,
        });

        if (response.ok) {
          const data = (await response.json()) as { status?: string };
          if (data.status === 'succeeded') {
            if (!isCancelled) {
              try {
                localStorage.removeItem('showmelove_pending_payment');
              } catch {
                // Ignore storage errors
              }
              await refreshLiveWallet();
              setState('confirmed');
            }
            return;
          }
          if (data.status === 'failed') {
            if (!isCancelled) setState('error');
            return;
          }
        }
      } catch {
        /* Webhook / live verify may still be settling. */
      }

      attempts += 1;
      if (attempts >= 10) {
        if (!isCancelled) setState('pending');
        return;
      }
      if (!isCancelled) {
        window.setTimeout(check, 1500);
      }
    };

    void check();

    return () => {
      isCancelled = true;
    };
  }, [refreshLiveWallet]);

  const copy =
    state === 'confirmed'
      ? ['Payment confirmed', 'Your Love Coins have been added to your wallet.']
      : state === 'pending'
        ? [
            'Payment is processing',
            'Paystack has your payment. Your balance will update as soon as settlement is confirmed.',
          ]
        : state === 'error'
          ? [
              'We could not verify this payment',
              'If your card was charged, contact support with your Paystack reference.',
            ]
          : ['Confirming your payment', 'Please keep this page open for a moment while we verify with Paystack.'];

  const Icon = state === 'confirmed' ? CheckCircle2 : state === 'error' ? XCircle : Clock3;

  const handleBackToWallet = async () => {
    await refreshLiveWallet();
    onDone();
  };

  return (
    <div className="max-w-md mx-auto py-14 text-center px-4">
      <section className="apple-card rounded-[28px] p-8 space-y-5">
        <Icon
          className={`w-14 h-14 mx-auto ${
            state === 'confirmed'
              ? 'text-[#087F56]'
              : state === 'error'
                ? 'text-[#DF0756]'
                : 'text-[#8439D5] animate-pulse'
          }`}
        />
        <div className="space-y-1">
          <h1 className="text-2xl font-bold">{copy[0]}</h1>
          <p className="text-sm text-[var(--text-secondary)]">{copy[1]}</p>
        </div>
        <button
          type="button"
          onClick={handleBackToWallet}
          className="min-h-[44px] w-full rounded-xl cta-pink-surface text-white font-semibold cursor-pointer"
        >
          Back to wallet
        </button>
      </section>
    </div>
  );
}
