import { useState, useMemo } from 'react';
import {
  ArrowLeft,
  ArrowUpRight,
  Clock,
  Coins,
  Filter,
  Gift as GiftIcon,
  Search,
  Send,
  Sparkles,
  Wallet,
} from 'lucide-react';
import { formatCoins, formatNaira } from '../config/economy';
import { useShowmelove } from '../context/ShowmeloveContext';
import { GoldLoveCoinSvg } from './GiftArtwork';

interface TransactionHistoryScreenProps {
  onBack: () => void;
  onOpenBuyCoins?: () => void;
  onOpenSendGift?: () => void;
}

type FilterCategory = 'all' | 'coins' | 'gifts' | 'sprays' | 'withdrawals';

export function TransactionHistoryScreen({
  onBack,
  onOpenBuyCoins,
  onOpenSendGift,
}: TransactionHistoryScreenProps) {
  const { currentWallet } = useShowmelove();
  const [filterCategory, setFilterCategory] = useState<FilterCategory>('all');
  const [searchQuery, setSearchQuery] = useState('');

  // Normalize all transactions into unified list
  const allTransactions = useMemo(() => {
    const list: Array<{
      id: string;
      createdAt: string;
      title: string;
      category: 'coins' | 'gifts' | 'sprays' | 'withdrawals';
      amountLabel: string;
      tone: 'positive' | 'neutral' | 'accent';
      details?: string;
    }> = [];

    // Coin transactions (purchases, sprays, spends)
    currentWallet.coinTransactions.forEach((tx) => {
      const isSpray = tx.description.toLowerCase().includes('spray');
      list.push({
        id: tx.id,
        createdAt: tx.createdAt,
        title: tx.description,
        category: isSpray ? 'sprays' : 'coins',
        amountLabel: `${tx.coinsDelta >= 0 ? `+${tx.coinsDelta.toLocaleString('en-NG')}` : tx.coinsDelta.toLocaleString('en-NG')} Coins`,
        tone: tx.coinsDelta >= 0 ? 'positive' : 'neutral',
        details: tx.type === 'purchase' ? `Funded with ${formatNaira(tx.amountNaira)}` : undefined,
      });
    });

    // Earnings transactions (gift claims, payouts, reserves)
    currentWallet.earningsTransactions.forEach((tx) => {
      const isWithdrawal = tx.type.startsWith('payout');
      list.push({
        id: tx.id,
        createdAt: tx.createdAt,
        title: tx.description,
        category: isWithdrawal ? 'withdrawals' : 'gifts',
        amountLabel:
          tx.amountNaira > 0
            ? `+${formatNaira(tx.amountNaira)}`
            : tx.amountNaira < 0
              ? `-${formatNaira(Math.abs(tx.amountNaira))}`
              : 'Paid',
        tone: tx.amountNaira > 0 ? 'positive' : tx.amountNaira < 0 ? 'accent' : 'neutral',
        details: tx.type === 'claim' ? 'Received from admirer' : 'Transferred to bank account',
      });
    });

    return list.sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
    );
  }, [currentWallet]);

  const filteredTransactions = useMemo(() => {
    return allTransactions.filter((tx) => {
      const matchesCategory =
        filterCategory === 'all' || tx.category === filterCategory;
      const matchesSearch =
        searchQuery.trim() === '' ||
        tx.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        tx.amountLabel.toLowerCase().includes(searchQuery.toLowerCase());
      return matchesCategory && matchesSearch;
    });
  }, [allTransactions, filterCategory, searchQuery]);

  return (
    <div className="max-w-2xl mx-auto pb-20 space-y-4 px-3 sm:px-0">
      {/* Header */}
      <div className="flex items-center justify-between gap-3 pt-1">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={onBack}
            aria-label="Back to Dashboard"
            className="w-10 h-10 rounded-2xl bg-white dark:bg-slate-800 border border-[var(--border-subtle)] flex items-center justify-center hover:bg-pink-50/50 dark:hover:bg-slate-700 transition-all cursor-pointer shadow-2xs"
          >
            <ArrowLeft className="w-5 h-5 text-[var(--text-primary)]" />
          </button>
          <div>
            <h1 className="text-xl sm:text-2xl font-black text-[#1E1B4B] dark:text-white tracking-tight">
              Transaction History
            </h1>
            <p className="text-xs text-[var(--text-secondary)]">
              Complete ledger of your Love Coins and Gifted Rewards
            </p>
          </div>
        </div>
      </div>

      {/* Balance Summary Cards */}
      <div className="grid grid-cols-2 gap-2.5">
        <div className="rounded-2xl bg-gradient-to-br from-pink-500/10 via-rose-500/5 to-purple-500/10 border border-pink-200/60 dark:border-pink-900/40 p-3.5 space-y-1">
          <p className="text-[11px] font-bold uppercase tracking-wider text-[#E10B5C] dark:text-[#FF3888]">
            Coin Balance
          </p>
          <p className="text-xl sm:text-2xl font-black tabular-nums text-[#1E1B4B] dark:text-white">
            {currentWallet.loveCoinsBalance.toLocaleString('en-NG')} Coins
          </p>
          <p className="text-[10px] text-[var(--text-secondary)]">Spendable on gifts &amp; sprays</p>
        </div>

        <div className="rounded-2xl bg-gradient-to-br from-purple-500/10 via-indigo-500/5 to-purple-500/10 border border-purple-200/60 dark:border-purple-900/40 p-3.5 space-y-1">
          <p className="text-[11px] font-bold uppercase tracking-wider text-purple-600 dark:text-purple-400">
            Gifted Rewards
          </p>
          <p className="text-xl sm:text-2xl font-black tabular-nums text-[#1E1B4B] dark:text-white">
            {formatNaira(currentWallet.availableEarningsNaira)}
          </p>
          <p className="text-[10px] text-[var(--text-secondary)]">Withdrawable to bank account</p>
        </div>
      </div>

      {/* Search and Filters */}
      <div className="space-y-2">
        <div className="relative">
          <Search className="w-4 h-4 absolute left-3 top-3 text-[var(--text-secondary)]" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search by description or amount..."
            className="w-full pl-9 pr-4 py-2 rounded-xl bg-white/80 dark:bg-slate-800/80 border border-pink-100 dark:border-pink-900/40 text-xs font-semibold text-[var(--text-primary)] placeholder:text-[var(--text-secondary)]/60 focus:outline-none focus:ring-2 focus:ring-[#FF2385]"
          />
        </div>

        {/* Filter Chips */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 no-scrollbar text-xs">
          {[
            { id: 'all', label: 'All' },
            { id: 'coins', label: 'Love Coins' },
            { id: 'gifts', label: 'Gifts' },
            { id: 'sprays', label: 'Sprays' },
            { id: 'withdrawals', label: 'Withdrawals' },
          ].map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setFilterCategory(tab.id as FilterCategory)}
              className={`px-3 py-1.5 rounded-full font-bold whitespace-nowrap transition-all cursor-pointer ${
                filterCategory === tab.id
                  ? 'bg-[#FF2385] text-white shadow-xs'
                  : 'bg-white/80 dark:bg-slate-800 border border-[var(--border-subtle)] text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Transactions List */}
      <div className="rounded-3xl bg-white/85 dark:bg-slate-900/85 border border-pink-100/70 dark:border-pink-900/30 p-3 sm:p-4 shadow-sm divide-y divide-[var(--border-subtle)]">
        {filteredTransactions.length === 0 ? (
          <div className="py-12 text-center space-y-3">
            <div className="w-12 h-12 rounded-full bg-pink-50 dark:bg-pink-950/40 text-[#FF2385] flex items-center justify-center mx-auto">
              <Clock className="w-6 h-6" />
            </div>
            <p className="text-sm font-bold text-[#1E1B4B] dark:text-white">
              No transactions found
            </p>
            <p className="text-xs text-[var(--text-secondary)] max-w-xs mx-auto">
              {searchQuery
                ? 'Try a different search keyword or change the category filter.'
                : 'Transactions will appear here as you buy coins, send love, or receive gifts.'}
            </p>
          </div>
        ) : (
          filteredTransactions.map((tx) => (
            <div
              key={tx.id}
              className="py-3 flex items-center justify-between gap-3 first:pt-1 last:pb-1"
            >
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-10 h-10 rounded-2xl bg-pink-50 dark:bg-pink-950/40 border border-pink-100 dark:border-pink-900/40 flex items-center justify-center shrink-0">
                  {tx.category === 'coins' ? (
                    <GoldLoveCoinSvg className="w-5 h-5" />
                  ) : tx.category === 'sprays' ? (
                    <Send className="w-4 h-4 text-[#FF2385]" />
                  ) : tx.category === 'withdrawals' ? (
                    <ArrowUpRight className="w-4 h-4 text-purple-600 dark:text-purple-400" />
                  ) : (
                    <GiftIcon className="w-4 h-4 text-[#E10B5C] dark:text-[#FF3888]" />
                  )}
                </div>

                <div className="min-w-0">
                  <p className="text-xs sm:text-sm font-bold text-[#1E1B4B] dark:text-white truncate">
                    {tx.title}
                  </p>
                  <p className="text-[11px] text-[var(--text-secondary)]">
                    {new Date(tx.createdAt).toLocaleDateString('en-NG', {
                      month: 'short',
                      day: 'numeric',
                      year: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </p>
                  {tx.details && (
                    <p className="text-[10px] text-[var(--text-secondary)]/75 mt-0.5">
                      {tx.details}
                    </p>
                  )}
                </div>
              </div>

              <div className="shrink-0 text-right">
                <span
                  className={`text-xs sm:text-sm font-bold tabular-nums inline-block px-2.5 py-1 rounded-full ${
                    tx.tone === 'positive'
                      ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20'
                      : tx.tone === 'accent'
                        ? 'bg-rose-500/10 text-[#E10B5C] dark:text-[#FF3888] border border-rose-500/20'
                        : 'bg-slate-100 dark:bg-slate-800 text-[var(--text-primary)] border border-[var(--border-subtle)]'
                  }`}
                >
                  {tx.amountLabel}
                </span>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
