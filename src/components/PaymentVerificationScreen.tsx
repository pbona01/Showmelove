import { useEffect, useState } from 'react';
import { CheckCircle2, Clock3, XCircle, Share2, Copy, Check, ExternalLink } from 'lucide-react';
import { useShowmelove } from '../context/ShowmeloveContext';
import { supabase } from '../lib/supabase';

export function PaymentVerificationScreen({ onDone }: { onDone: () => void }) {
  const { refreshLiveWallet } = useShowmelove();
  const [state, setState] = useState<'checking' | 'confirmed' | 'pending' | 'error'>('checking');
  const [copiedLink, setCopiedLink] = useState(false);

  const params = typeof window !== 'undefined' ? new URLSearchParams(window.location.search) : new URLSearchParams();
  const reference = params.get('reference');
  const isGift = params.get('type') === 'gift' || Boolean(params.get('giftId'));
  const giftId = params.get('giftId') || reference || '';

  const giftShareUrl = typeof window !== 'undefined' && giftId ? `${window.location.origin}/gift/${giftId}` : '';
  const whatsappUrl = giftShareUrl
    ? `https://wa.me/?text=${encodeURIComponent(`I sent you a gift on Showmelove! Open your gift here: ${giftShareUrl}`)}`
    : '';

  useEffect(() => {
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
                localStorage.removeItem('showmelove_pending_gift');
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
  }, [reference, refreshLiveWallet]);

  const copy =
    state === 'confirmed'
      ? isGift
        ? ['Love Delivered! 💖', 'Your payment was successful and your gift has been sent.']
        : ['Payment confirmed', 'Your Love Coins have been added to your wallet.']
      : state === 'pending'
        ? [
            'Payment is processing',
            'Paystack has your payment. Your gift will be delivered as soon as settlement is confirmed.',
          ]
        : state === 'error'
          ? [
              'We could not verify this payment',
              'If your card was charged, contact support with your Paystack reference.',
            ]
          : ['Confirming your payment', 'Please keep this page open for a moment while we verify with Paystack.'];

  const Icon = state === 'confirmed' ? CheckCircle2 : state === 'error' ? XCircle : Clock3;

  const handleCopyLink = async () => {
    if (!giftShareUrl) return;
    try {
      await navigator.clipboard.writeText(giftShareUrl);
      setCopiedLink(true);
      setTimeout(() => setCopiedLink(false), 2200);
    } catch {
      // Fallback
    }
  };

  const handleBackToWallet = async () => {
    await refreshLiveWallet();
    onDone();
  };

  return (
    <div className="max-w-md mx-auto py-12 text-center px-4">
      <section className="apple-card rounded-[28px] p-6 sm:p-8 space-y-5 border border-[var(--border-subtle)] bg-[var(--bg-card)] shadow-xl">
        <Icon
          className={`w-14 h-14 mx-auto ${
            state === 'confirmed'
              ? 'text-[#087F56] dark:text-[#24C888]'
              : state === 'error'
                ? 'text-[#DF0756] dark:text-[#FF176C]'
                : 'text-[#8439D5] dark:text-[#A855F7] animate-pulse'
          }`}
        />
        <div className="space-y-1.5">
          <h1 className="text-2xl font-bold text-[var(--text-primary)]">{copy[0]}</h1>
          <p className="text-sm text-[var(--text-secondary)]">{copy[1]}</p>
        </div>

        {state === 'confirmed' && isGift && giftId && (
          <div className="space-y-3 pt-2">
            <a
              href={`/gift/${encodeURIComponent(giftId)}`}
              className="min-h-[46px] w-full rounded-2xl bg-gradient-to-r from-[#FF2385] to-[#8C52FF] text-white font-bold text-sm inline-flex items-center justify-center gap-2 shadow-md hover:brightness-105 active:scale-98 transition-all"
            >
              <ExternalLink className="w-4 h-4" />
              <span>Open Gift Reveal</span>
            </a>

            {whatsappUrl && (
              <a
                href={whatsappUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="min-h-[42px] w-full rounded-2xl bg-[#25D366] text-white font-semibold text-xs sm:text-sm inline-flex items-center justify-center gap-2 hover:brightness-105 active:scale-98 transition-all"
              >
                <Share2 className="w-4 h-4" />
                <span>Share via WhatsApp</span>
              </a>
            )}

            <button
              type="button"
              onClick={handleCopyLink}
              className="min-h-[40px] w-full rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-raised)] text-[var(--text-primary)] text-xs font-semibold inline-flex items-center justify-center gap-2 hover:border-[#FF2385]/50 active:scale-98 transition-all cursor-pointer"
            >
              {copiedLink ? <Check className="w-4 h-4 text-emerald-500" /> : <Copy className="w-4 h-4" />}
              <span>{copiedLink ? 'Link Copied!' : 'Copy Gift Link'}</span>
            </button>
          </div>
        )}

        <button
          type="button"
          onClick={handleBackToWallet}
          className="min-h-[42px] w-full rounded-xl bg-[var(--bg-raised)] border border-[var(--border-subtle)] text-[var(--text-primary)] font-semibold text-sm hover:border-[var(--border-strong)] transition-all cursor-pointer"
        >
          {isGift ? 'Back to Home' : 'Back to wallet'}
        </button>
      </section>
    </div>
  );
}
