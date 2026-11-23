import { useEffect, useState } from 'react';
import { CheckCircle2, Clock3, XCircle } from 'lucide-react';

export function PaymentVerificationScreen({ onDone }: { onDone: () => void }) {
  const [state, setState] = useState<'checking' | 'confirmed' | 'pending' | 'error'>('checking');
  useEffect(() => {
    const reference = new URLSearchParams(window.location.search).get('reference');
    if (!reference) { setState('error'); return; }
    let attempts = 0;
    const check = async () => {
      try {
        const response = await fetch(`/api/paystack/status?reference=${encodeURIComponent(reference)}`);
        if (response.ok && (await response.json() as { status?: string }).status === 'succeeded') { setState('confirmed'); return; }
      } catch { /* Webhook may still be processing. */ }
      attempts += 1;
      if (attempts >= 8) { setState('pending'); return; }
      window.setTimeout(check, 1500);
    };
    void check();
  }, []);
  const copy = state === 'confirmed' ? ['Payment confirmed', 'Your Love Coins have been added to your wallet.'] : state === 'pending' ? ['Payment is processing', 'Paystack has your payment. Your balance will update as soon as it is confirmed.'] : state === 'error' ? ['We could not verify this payment', 'Please contact support with your Paystack reference.'] : ['Confirming your payment', 'Please keep this page open for a moment.'];
  const Icon = state === 'confirmed' ? CheckCircle2 : state === 'error' ? XCircle : Clock3;
  return <div className="max-w-md mx-auto py-14 text-center"><section className="apple-card rounded-[28px] p-8 space-y-4"><Icon className={`w-12 h-12 mx-auto ${state === 'confirmed' ? 'text-[#087F56]' : state === 'error' ? 'text-[#DF0756]' : 'text-[#8439D5]'}`} /><h1 className="text-2xl font-bold">{copy[0]}</h1><p className="text-sm text-[var(--text-secondary)]">{copy[1]}</p><button type="button" onClick={onDone} className="min-h-[44px] w-full rounded-xl cta-pink-surface text-white font-semibold">Back to wallet</button></section></div>;
}

