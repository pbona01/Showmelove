import { ArrowLeft, Crown, Heart, Trophy } from 'lucide-react';
import { useMemo } from 'react';
import { formatCoinCount } from '../config/economy';
import { useShowmelove } from '../context/ShowmeloveContext';

interface LeaderboardScreenProps { onBack: () => void }


export function LeaderboardScreen({ onBack }: LeaderboardScreenProps) {
  const { state } = useShowmelove();
  const leaders = useMemo(() => {
    const totals = new Map<string, { gifts: number; sprays: number }>();
    const add = (email: string, kind: 'gifts' | 'sprays', coins: number) => {
      const current = totals.get(email) ?? { gifts: 0, sprays: 0 };
      current[kind] += coins;
      totals.set(email, current);
    };
    state.gifts.forEach((gift) => {
      if (gift.senderEmail) add(gift.senderEmail.toLowerCase(), 'gifts', gift.coinsSpent);
    });
    state.sprayTransactions.forEach((spray) => add(spray.senderEmail.toLowerCase(), 'sprays', spray.grossCoins));
    return [...totals.entries()]
      .map(([email, total]) => ({ email, ...total, totalCoins: total.gifts + total.sprays }))
      .sort((a, b) => b.totalCoins - a.totalCoins);
  }, [state.gifts, state.sprayTransactions]);

  return (
    <div className="mx-auto max-w-2xl space-y-5 pb-10">
      <button type="button" onClick={onBack} className="inline-flex min-h-[44px] items-center gap-2 rounded-2xl px-3 text-sm font-semibold text-[var(--text-primary)] hover:bg-[var(--bg-raised)]">
        <ArrowLeft className="h-4 w-4" /> Back to Wallet Home
      </button>
      <section className="overflow-hidden rounded-[30px] bg-gradient-to-br from-[#2A1535] via-[#7C2358] to-[#F0A62B] p-6 text-white shadow-xl sm:p-8">
        <div className="flex items-start justify-between gap-4"><div><p className="text-xs font-bold tracking-[0.14em] text-white/75">SHOWMELOVE COMMUNITY</p><h1 className="mt-2 text-3xl font-bold">Most Love Shown</h1><p className="mt-2 max-w-md text-sm text-white/80">Ranked by all Love Coins sent through gifts and sprays across the app.</p></div><Trophy className="h-10 w-10 text-[#FFE28A]" /></div>
      </section>
      <section className="apple-card rounded-[28px] p-4 sm:p-5">
        {leaders.length === 0 ? <p className="py-8 text-center text-sm text-[var(--text-secondary)]">Be the first person to show some love.</p> : (
          <ol className="divide-y divide-[var(--border-subtle)]">
            {leaders.map((leader, index) => (
              <li key={leader.email} className="flex items-center gap-3 py-3.5">
                <span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-sm font-black ${index === 0 ? 'bg-[#F7C948] text-[#4A2B00]' : 'bg-[var(--bg-raised)] text-[var(--text-secondary)]'}`}>{index === 0 ? <Crown className="h-5 w-5" /> : index + 1}</span>
                <div className="min-w-0 flex-1"><p className="truncate text-sm font-bold text-[var(--text-primary)]">{leader.email.split('@')[0]}</p><p className="text-xs text-[var(--text-secondary)]">Gifts {formatCoinCount(leader.gifts)} · Sprays {formatCoinCount(leader.sprays)}</p></div>
                <div className="text-right"><p className="inline-flex items-center gap-1 text-base font-bold tabular-nums text-[#E10B5C] dark:text-[#FF7AA8]"><Heart className="h-3.5 w-3.5 fill-current" />{formatCoinCount(leader.totalCoins)}</p></div>
              </li>
            ))}
          </ol>
        )}
      </section>
    </div>
  );
}
