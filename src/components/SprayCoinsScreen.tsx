import {
  ArrowLeft,
  Check,
  CheckCircle2,
  ChevronRight,
  Sparkles,
  UserCheck,
  X,
} from 'lucide-react';
import { useEffect, useMemo, useRef, useState } from 'react';
import { SPRAY_LAYOUTS, type SprayLayoutId } from '../config/economy';
import { useShowmelove } from '../context/ShowmeloveContext';
import { SprayCoins } from './SprayCoins';
import { Button } from './ui/DesignSystem';
import { lookupVerifiedUser, type VerifiedUser } from '../services/userService';

interface SprayCoinsScreenProps {
  onBack: () => void;
  onSignIn: () => void;
}

type SprayStep = 'step1_target' | 'step2_budget' | 'step3_arena';

export interface CelebrantOption {
  displayName: string;
  username: string;
  tag?: string;
  email?: string;
}

const DEFAULT_CELEBRANTS: CelebrantOption[] = [
  { displayName: 'Bene', username: 'pbona', tag: 'Creator', email: 'pbona717@gmail.com' },
  { displayName: 'Virtue', username: '1virtue1x', tag: 'Celebrant', email: '1virtue1x@gmail.com' },
  { displayName: 'Adaeze Okafor', username: 'ada', tag: 'Celebrant', email: 'ada@showmelove.ng' },
  { displayName: 'Tunde Adeyemi', username: 'tunde', tag: 'Creator', email: 'tunde@showmelove.ng' },
  { displayName: 'Chioma Ade', username: 'chioma', tag: 'Celebrant' },
  { displayName: 'Celebration Room', username: 'open_room', tag: 'Public Room' },
];

export function SprayCoinsScreen({ onBack, onSignIn }: SprayCoinsScreenProps) {
  const { state, currentWallet, sprayLoveCoins } = useShowmelove();
  const isSignedIn = state.activeRole !== 'guest' && Boolean(state.signedInEmail);

  // Setup state
  const [step, setStep] = useState<SprayStep>('step1_target');
  const [targetName, setTargetName] = useState('');
  const [confirmedRecipient, setConfirmedRecipient] = useState<CelebrantOption | null>(null);

  const [amountPerSpray, setAmountPerSpray] = useState('20');
  const [customAmountActive, setCustomAmountActive] = useState(false);
  const [noLimitMode, setNoLimitMode] = useState(false);
  const [maxSprayLimit, setMaxSprayLimit] = useState('500');
  const [layoutId, setLayoutId] = useState<SprayLayoutId>('classic');

  // Active session tracking
  const [totalSprayedInSession, setTotalSprayedInSession] = useState(0);
  const [limitReached, setLimitReached] = useState(false);
  const [sessionFinished, setSessionFinished] = useState(false);

  // Preload theme coins and artwork
  useEffect(() => {
    SPRAY_LAYOUTS.forEach((item) => {
      const coinImg = new Image();
      coinImg.src = item.coinSrc;
      const cardImg = new Image();
      cardImg.src = item.artworkSrc;
    });
  }, []);


  // Build list of valid registered users
  const registeredUsers = useMemo(() => {
    const map = new Map<string, CelebrantOption>();

    DEFAULT_CELEBRANTS.forEach((c) => {
      map.set(c.username.toLowerCase(), c);
    });

    try {
      const raw = localStorage.getItem('showmelove_user_map');
      if (raw) {
        const parsed = JSON.parse(raw);
        Object.entries(parsed).forEach(([usr, eml]) => {
          const cleanUsr = usr.trim().replace(/^@/, '').toLowerCase();
          if (!map.has(cleanUsr)) {
            map.set(cleanUsr, {
              displayName: cleanUsr.charAt(0).toUpperCase() + cleanUsr.slice(1),
              username: cleanUsr,
              email: String(eml),
              tag: 'Verified User',
            });
          }
        });
      }
    } catch {
      // ignore
    }

    if (state.signedInEmail) {
      const selfUsr = state.signedInEmail.split('@')[0].toLowerCase();
      if (!map.has(selfUsr)) {
        map.set(selfUsr, {
          displayName: state.signedInName || selfUsr.charAt(0).toUpperCase() + selfUsr.slice(1),
          username: selfUsr,
          email: state.signedInEmail,
          tag: 'You',
        });
      }
    }

    state.gifts.forEach((g) => {
      if (g.recipientName) {
        const cleanRecip = g.recipientName.trim().replace(/^@/, '').toLowerCase();
        if (cleanRecip && !map.has(cleanRecip)) {
          map.set(cleanRecip, {
            displayName: g.recipientName.replace(/^@/, ''),
            username: cleanRecip,
            email: g.recipientEmail,
            tag: 'Verified User',
          });
        }
      }
    });

    return Array.from(map.values());
  }, [state.gifts]);

  const query = targetName.trim().replace(/^@/, '').toLowerCase();

  // Find if current typed name matches an actual registered account
  const matchedUser = useMemo(() => {
    if (!query) return null;
    if (
      query === 'celebration room' ||
      query === 'open room' ||
      query === 'open_room' ||
      query === 'room'
    ) {
      return registeredUsers.find((u) => u.username === 'open_room') || null;
    }
    return (
      registeredUsers.find(
        (u) =>
          u.username.toLowerCase() === query ||
          u.displayName.toLowerCase() === query,
      ) || null
    );
  }, [query, registeredUsers]);

  // Is typed input not a registered user?
  const isInvalidUser = Boolean(query && !matchedUser && !confirmedRecipient);

  // Auto-sync confirmedRecipient if matchedUser matches exactly
  useEffect(() => {
    if (matchedUser && (!confirmedRecipient || confirmedRecipient.username !== matchedUser.username)) {
      setConfirmedRecipient(matchedUser);
    } else if (
      !matchedUser &&
      confirmedRecipient &&
      query !== confirmedRecipient.username.toLowerCase() &&
      query !== confirmedRecipient.displayName.toLowerCase()
    ) {
      setConfirmedRecipient(null);
    }
  }, [matchedUser, query, confirmedRecipient]);

  const filteredCelebrants = useMemo(() => {
    if (!query) return registeredUsers;
    return registeredUsers.filter(
      (c) =>
        c.username.toLowerCase().includes(query) ||
        c.displayName.toLowerCase().includes(query),
    );
  }, [registeredUsers, query]);

  const handleSelectCelebrant = (account: CelebrantOption) => {
    setTargetName(
      account.username === 'open_room'
        ? 'Celebration Room'
        : `@${account.username.replace(/^@/, '')}`,
    );
    setConfirmedRecipient(account);
  };

  const layout = SPRAY_LAYOUTS.find((item) => item.id === layoutId) ?? SPRAY_LAYOUTS[0];
  const userBalance = currentWallet.loveCoinsBalance;

  const parsedAmountPerSpray = Math.max(1, Math.floor(Number(amountPerSpray)) || 20);
  const parsedMaxLimit = noLimitMode
    ? Infinity
    : Math.max(parsedAmountPerSpray, Math.floor(Number(maxSprayLimit)) || 500);

  // Remaining budget in this spray session
  const remainingBudget = noLimitMode
    ? userBalance
    : Math.max(0, parsedMaxLimit - totalSprayedInSession);
  const hasBudget = remainingBudget > 0;
  const hasBalance = userBalance > 0;
  const canSprayInArena = hasBalance && hasBudget && !limitReached;

  // The effective amount per swipe uses the user's chosen amount or whatever balance/budget remains
  const effectiveSprayAmount = Math.min(parsedAmountPerSpray, userBalance, remainingBudget);

  const handleSprayAction = (count: number): boolean => {
    if (!noLimitMode && totalSprayedInSession + count >= parsedMaxLimit) {
      setLimitReached(true);
    }
    const cleanRecipient =
      confirmedRecipient?.username === 'open_room'
        ? undefined
        : confirmedRecipient?.username || targetName.trim().replace(/^@/, '');

    const res = sprayLoveCoins({
      coins: count,
      recipientEmail: cleanRecipient
        ? cleanRecipient.includes('@')
          ? cleanRecipient
          : `${cleanRecipient}@showmelove.fun`
        : undefined,
      layoutId,
    });

    if (res.ok) {
      setTotalSprayedInSession((prev) => {
        const next = prev + count;
        if (!noLimitMode && next >= parsedMaxLimit) {
          setLimitReached(true);
        }
        return next;
      });
      return true;
    }
    return false;
  };

  const PRESET_AMOUNTS = [10, 20, 50, 100, 200];
  const PRESET_LIMITS = [100, 250, 500, 1000, 2500];

  return (
    <div className="mx-auto max-w-lg space-y-2.5 pb-6">
      {/* STEP 1: TARGET & SPRAY AMOUNT (COMPACT, ZERO-SCROLL) */}
      {step === 'step1_target' && (
        <div className="space-y-2.5">
          <button
            type="button"
            onClick={onBack}
            className="inline-flex min-h-[34px] items-center gap-1.5 rounded-xl px-2.5 text-xs font-semibold text-[var(--text-primary)] hover:bg-[var(--bg-raised)] transition-colors cursor-pointer"
          >
            <ArrowLeft className="h-3.5 w-3.5" /> Back to Wallet Home
          </button>

          <section className="apple-card rounded-[24px] p-3.5 sm:p-5 space-y-3 border border-[var(--border-subtle)] shadow-xl bg-[var(--bg-card)]">
            <div className="space-y-0.5">
              <h1 className="text-lg sm:text-2xl font-extrabold text-[var(--text-primary)] tracking-tight">
                Who are you spraying?
              </h1>
              <p className="text-xs text-[var(--text-secondary)]">
                Select a confirmed celebrant or the celebration room.
              </p>
            </div>

            {/* Recipient Input with Strict System Confirmation */}
            <div className="space-y-1 relative">
              <div className="flex items-center justify-between">
                <label
                  htmlFor="spray-target-input"
                  className="block text-[11px] font-bold uppercase tracking-wider text-[var(--text-primary)]"
                >
                  Recipient Username
                </label>
                {confirmedRecipient && (
                  <span className="text-[11px] font-bold text-[#087F56] dark:text-[#24C888] inline-flex items-center gap-1">
                    <CheckCircle2 className="w-3.5 h-3.5" /> Confirmed
                  </span>
                )}
              </div>

              <div className="relative">
                <input
                  id="spray-target-input"
                  type="text"
                  value={targetName}
                  onChange={(e) => setTargetName(e.target.value)}
                  placeholder="Type @username (e.g. @ada, @pbona, @virtue)"
                  className={`w-full rounded-xl border bg-[var(--bg-raised)] px-3.5 py-2 text-sm font-semibold text-[var(--text-primary)] placeholder:text-[var(--text-secondary)]/50 focus:outline-none focus:ring-2 ${
                    isInvalidUser
                      ? 'border-[#E61472] dark:border-[#FF2385] focus:ring-[#FF2385]'
                      : confirmedRecipient
                        ? 'border-[#087F56]/40 dark:border-[#24C888]/40 focus:ring-[#24C888]'
                        : 'border-[var(--border-subtle)] focus:ring-[#FF2385]'
                  }`}
                />
              </div>

              {/* Strict Non-User Error (Image 2 Requirement) */}
              {isInvalidUser && (
                <p className="text-xs font-semibold text-[#E61472] dark:text-[#FF2385] flex items-center gap-1.5 pt-0.5 animate-in fade-in">
                  <span className="w-4 h-4 flex items-center justify-center rounded-full bg-[#E61472]/15 text-[#E61472] dark:text-[#FF2385] text-[10px] font-bold">
                    ✕
                  </span>
                  <span>No Showmelove user has that username.</span>
                </p>
              )}

              {/* Confirmed Recipient Banner Card */}
              {confirmedRecipient && (
                <div className="rounded-xl border border-[#087F56]/25 dark:border-[#24C888]/30 bg-[#E6F6EF]/60 dark:bg-[#0D3326]/50 px-3 py-2 flex items-center justify-between gap-2 animate-in fade-in">
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div className="w-7 h-7 rounded-lg bg-gradient-to-tr from-[#087F56] to-[#24C888] text-white font-bold text-xs flex items-center justify-center shrink-0">
                      <CheckCircle2 className="w-4 h-4" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-xs font-bold text-[var(--text-primary)] truncate">
                        {confirmedRecipient.displayName}{' '}
                        <span className="font-semibold text-[var(--text-secondary)]">
                          (@{confirmedRecipient.username.replace(/^@/, '')})
                        </span>
                      </p>
                      <p className="text-[10px] text-[var(--text-secondary)]">
                        {confirmedRecipient.username === 'open_room'
                          ? 'Coins sent to all in room'
                          : 'Coins sent automatically with every swipe'}
                      </p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setTargetName('');
                      setConfirmedRecipient(null);
                    }}
                    className="text-[11px] font-bold text-[#E61472] dark:text-[#FF4F9A] hover:underline shrink-0 cursor-pointer"
                  >
                    Change
                  </button>
                </div>
              )}

              {/* Quick Celebration Room pill */}
              <button
                type="button"
                onClick={() =>
                  handleSelectCelebrant({
                    displayName: 'Celebration Room',
                    username: 'open_room',
                    tag: 'Public Room',
                  })
                }
                className="inline-flex items-center gap-1.5 px-3 py-1 rounded-xl text-xs font-semibold bg-[var(--bg-raised)] border border-[var(--border-subtle)] hover:border-[#FF2385]/50 transition-colors text-[var(--text-primary)] cursor-pointer mt-1"
              >
                🎉 Open Celebration Room
              </button>
            </div>

            {/* Compact Amount Per Spray */}
            <div className="space-y-1">
              <div className="flex items-center justify-between">
                <label className="block text-[11px] font-bold uppercase tracking-wider text-[var(--text-primary)]">
                  Amount per swipe
                </label>
                <span className="text-xs font-bold tabular-nums text-[var(--text-primary)]">
                  {parsedAmountPerSpray} Coins
                </span>
              </div>

              <div className="grid grid-cols-6 gap-1.5">
                {PRESET_AMOUNTS.map((val) => (
                  <button
                    key={val}
                    type="button"
                    onClick={() => {
                      setAmountPerSpray(String(val));
                      setCustomAmountActive(false);
                    }}
                    className={`min-h-[34px] py-1 px-1 rounded-xl border text-xs font-bold tabular-nums transition-all cursor-pointer ${
                      !customAmountActive && Number(amountPerSpray) === val
                        ? 'cta-pink-surface text-white border-transparent shadow-sm'
                        : 'bg-[var(--bg-raised)] border-[var(--border-subtle)] text-[var(--text-primary)] hover:border-[#FF2385]/50'
                    }`}
                  >
                    {val}
                  </button>
                ))}
                <button
                  type="button"
                  onClick={() => setCustomAmountActive(true)}
                  className={`min-h-[34px] py-1 px-1 rounded-xl border text-xs font-bold transition-all cursor-pointer ${
                    customAmountActive
                      ? 'cta-pink-surface text-white border-transparent shadow-sm'
                      : 'bg-[var(--bg-raised)] border-[var(--border-subtle)] text-[var(--text-primary)] hover:border-[#FF2385]/50'
                  }`}
                >
                  Custom
                </button>
              </div>

              {customAmountActive && (
                <div className="pt-1">
                  <input
                    type="number"
                    min={1}
                    value={amountPerSpray}
                    onChange={(e) => setAmountPerSpray(e.target.value)}
                    className="w-full rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-raised)] px-3 py-2 text-sm font-bold tabular-nums text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-[#FF2385]"
                    placeholder="Enter custom coins per swipe"
                  />
                </div>
              )}
            </div>

            {/* Next Button - strictly disabled unless confirmed real user */}
            <Button
              variant="primary"
              size="lg"
              fullWidth
              disabled={!confirmedRecipient && !matchedUser}
              onClick={() => {
                if (matchedUser && !confirmedRecipient) {
                  setConfirmedRecipient(matchedUser);
                }
                setStep('step2_budget');
              }}
            >
              Next: Limits &amp; Theme <ChevronRight className="w-4 h-4 ml-1" />
            </Button>
          </section>
        </div>
      )}

      {/* STEP 2: BUDGET LIMIT & STARTING THEME (COMPACT) */}
      {step === 'step2_budget' && (
        <div className="space-y-3">
          <button
            type="button"
            onClick={() => setStep('step1_target')}
            className="inline-flex min-h-[36px] items-center gap-1.5 rounded-xl px-2.5 text-xs font-semibold text-[var(--text-primary)] hover:bg-[var(--bg-raised)] transition-colors cursor-pointer"
          >
            <ArrowLeft className="h-3.5 w-3.5" /> Back to Recipient
          </button>

          <section className="apple-card rounded-[28px] p-4 sm:p-6 space-y-4 border border-[var(--border-subtle)] shadow-xl bg-[var(--bg-card)]">
            <div className="space-y-1">
              <h1 className="text-xl sm:text-2xl font-extrabold text-[var(--text-primary)] tracking-tight">
                Set Spray Limit &amp; Theme
              </h1>
              <p className="text-xs text-[var(--text-secondary)]">
                Money sprayed is sent automatically with each swipe. Limits are optional safety caps.
              </p>
            </div>

            {/* Optional Safety Limit */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <label className="block text-xs font-bold uppercase tracking-wider text-[var(--text-primary)]">
                  Safety Cap (Optional)
                </label>
                <span className="text-[11px] font-semibold text-[var(--text-secondary)]">
                  Balance: {userBalance.toLocaleString('en-NG')} LC
                </span>
              </div>

              <div className="grid grid-cols-3 sm:grid-cols-6 gap-1.5">
                <button
                  type="button"
                  onClick={() => setNoLimitMode(true)}
                  className={`min-h-[36px] py-1 px-1 rounded-xl border text-xs font-bold transition-all cursor-pointer ${
                    noLimitMode
                      ? 'cta-pink-surface text-white border-transparent shadow-sm'
                      : 'bg-[var(--bg-raised)] border-[var(--border-subtle)] text-[var(--text-primary)] hover:border-[#FF2385]/50'
                  }`}
                >
                  No Limit
                </button>
                {PRESET_LIMITS.map((lim) => (
                  <button
                    key={lim}
                    type="button"
                    onClick={() => {
                      setNoLimitMode(false);
                      setMaxSprayLimit(String(lim));
                    }}
                    className={`min-h-[36px] py-1 px-1 rounded-xl border text-xs font-bold tabular-nums transition-all cursor-pointer ${
                      !noLimitMode && Number(maxSprayLimit) === lim
                        ? 'cta-pink-surface text-white border-transparent shadow-sm'
                        : 'bg-[var(--bg-raised)] border-[var(--border-subtle)] text-[var(--text-primary)] hover:border-[#FF2385]/50'
                    }`}
                  >
                    {lim.toLocaleString('en-NG')}
                  </button>
                ))}
              </div>
            </div>

            {/* Starting Layout Selector */}
            <div className="space-y-2">
              <label className="block text-xs font-bold uppercase tracking-wider text-[var(--text-primary)]">
                Starting Theme
              </label>
              <div className="grid grid-cols-5 gap-2">
                {SPRAY_LAYOUTS.map((item) => {
                  const isSelected = layoutId === item.id;
                  return (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => setLayoutId(item.id)}
                      className={`group relative min-h-[90px] sm:min-h-[110px] overflow-hidden rounded-xl p-2 text-left text-white ring-2 transition-all cursor-pointer ${
                        isSelected
                          ? 'ring-[#FF2385] shadow-lg scale-105'
                          : 'ring-transparent opacity-80 hover:opacity-100'
                      }`}
                    >
                      <img
                        src={item.artworkSrc}
                        alt={item.name}
                        className="absolute inset-0 h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
                        loading="lazy"
                      />
                      <span className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/40 to-black/20" />
                      <div className="relative z-10 flex flex-col justify-between h-full">
                        <span className="text-[10px] font-black drop-shadow-md text-white truncate">
                          {item.name}
                        </span>
                        <div>
                          <span className="block text-[9px] font-bold text-white drop-shadow">
                            {item.coinLabel}
                          </span>
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            <Button
              variant="primary"
              size="lg"
              fullWidth
              onClick={() => {
                setTotalSprayedInSession(0);
                setLimitReached(false);
                setSessionFinished(false);
                setStep('step3_arena');
              }}
            >
              Start Spraying Now 🚀
            </Button>
          </section>
        </div>
      )}

      {/* STEP 3: THE CLEAN DEDICATED SPRAY ARENA */}
      {step === 'step3_arena' && (
        <div className="space-y-3">
          {/* Top Floating Control Bar */}
          <div className="flex items-center justify-between gap-3 bg-[var(--bg-card)]/90 backdrop-blur-md p-2.5 rounded-2xl border border-[var(--border-subtle)] shadow-md">
            <button
              type="button"
              onClick={() => setStep('step2_budget')}
              className="min-h-[38px] px-2.5 rounded-xl text-xs font-bold text-[var(--text-primary)] hover:bg-[var(--bg-raised)] transition-colors inline-flex items-center gap-1 cursor-pointer"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Back</span>
            </button>

            <div className="text-center min-w-0">
              <span className="inline-flex items-center gap-1 text-[11px] font-extrabold uppercase tracking-wider text-[#FF2385] truncate">
                🎉 {confirmedRecipient ? confirmedRecipient.displayName : targetName || 'Celebration Room'}
              </span>
              <p className="text-xs font-bold tabular-nums text-[var(--text-primary)]">
                {totalSprayedInSession.toLocaleString('en-NG')} Coins Sent
              </p>
            </div>

            <button
              type="button"
              onClick={() => setSessionFinished(true)}
              className="min-h-[38px] px-3 rounded-xl text-xs font-bold text-white cta-pink-surface shadow-sm hover:brightness-105 transition-all cursor-pointer"
            >
              Finish
            </button>
          </div>

          {/* Quick Theme Switcher Pill Slider (Scrollable while spraying) */}
          <div className="flex items-center gap-2 overflow-x-auto pb-1 px-1 scrollbar-none">
            {SPRAY_LAYOUTS.map((item) => (
              <button
                key={item.id}
                type="button"
                onClick={() => setLayoutId(item.id)}
                className={`min-h-[36px] px-3 py-1 rounded-full text-xs font-bold whitespace-nowrap transition-all cursor-pointer inline-flex items-center gap-1.5 ${
                  layoutId === item.id
                    ? 'cta-pink-surface text-white shadow-md scale-105'
                    : 'bg-[var(--bg-card)] border border-[var(--border-subtle)] text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
                }`}
              >
                <span>{item.name}</span>
                <span className="text-[10px] opacity-80">({item.coinLabel})</span>
              </button>
            ))}
          </div>

          {/* Main Interactive Spray Card - 790:1024 exact proportion */}
          <section className="relative w-full max-w-[340px] sm:max-w-[370px] mx-auto aspect-[790/1024] touch-none overscroll-contain overflow-hidden rounded-[32px] sm:rounded-[36px] border-2 border-white/20 bg-black/90 text-center shadow-[0_24px_50px_-12px_rgba(0,0,0,0.65)] select-none">
            {/* Themed Background Image */}
            <img
              key={layout.id}
              src={layout.artworkSrc}
              alt={layout.name}
              className="absolute inset-0 h-full w-full object-contain select-none pointer-events-none transition-opacity duration-300"
              loading="eager"
            />

            {/* Soft Edge Vignette */}
            <div className="absolute inset-0 bg-gradient-to-b from-black/40 via-transparent via-55% to-black/65 pointer-events-none" />

            {/* Gesture Spray Area */}
            <SprayCoins
              isEnabled={canSprayInArena && !sessionFinished}
              coinBalance={userBalance}
              minimumSpray={layout.minimumCoins}
              sprayAmount={effectiveSprayAmount}
              layoutId={layout.id}
              coinLabel={layout.coinLabel}
              onSpray={handleSprayAction}
            />

            {/* Top Prompt */}
            <div className="absolute top-4 left-0 right-0 z-20 pointer-events-none px-4">
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-extrabold bg-black/60 text-white backdrop-blur-md shadow-md border border-white/20">
                <Sparkles className="w-3.5 h-3.5 text-[#FFE28A]" />
                Swipe up repeatedly to spray!
              </span>
            </div>

            {/* Real-time Coins Sent Counter Pill at bottom of arena */}
            <div className="absolute bottom-5 left-0 right-0 z-20 pointer-events-none px-4 flex justify-center">
              <div className="inline-flex items-center gap-2 px-4 py-2 rounded-2xl bg-black/75 backdrop-blur-lg border border-white/20 shadow-xl text-white">
                <div className="text-left">
                  <p className="text-[10px] uppercase font-bold text-white/70">Coins Sent (Real-Time)</p>
                  <p className="text-sm font-extrabold tabular-nums text-[#FFE28A]">
                    {totalSprayedInSession.toLocaleString('en-NG')} Coins
                  </p>
                </div>
              </div>
            </div>

            {/* Celebration Finish Modal (When user taps Finish or hits safety cap) */}
            {(limitReached || sessionFinished) && (
              <div className="absolute inset-0 z-40 flex items-center justify-center bg-black/85 backdrop-blur-md p-6 text-white animate-in fade-in duration-200">
                <div className="max-w-xs space-y-4 text-center">
                  <div className="w-14 h-14 mx-auto rounded-full bg-gradient-to-tr from-[#FF2385] to-[#7C3AED] flex items-center justify-center text-white shadow-xl animate-bounce">
                    <Sparkles className="w-7 h-7" />
                  </div>
                  <div>
                    <h2 className="text-xl font-black">
                      {limitReached ? 'Safety Limit Reached!' : 'Celebration Complete!'}
                    </h2>
                    <p className="text-xs text-white/80 mt-1">
                      You sprayed{' '}
                      <strong className="text-[#FFE28A]">
                        {totalSprayedInSession.toLocaleString('en-NG')} Love Coins
                      </strong>{' '}
                      to {confirmedRecipient?.displayName || targetName || 'the room'}.
                    </p>
                    <p className="text-[11px] text-[#24C888] font-semibold mt-1">
                      ✓ Coins were deposited directly in real-time.
                    </p>
                  </div>
                  <div className="space-y-2 pt-2">
                    <button
                      type="button"
                      onClick={() => {
                        setLimitReached(false);
                        setSessionFinished(false);
                      }}
                      className="w-full py-2.5 rounded-xl cta-pink-surface text-white text-xs font-bold shadow-md cursor-pointer"
                    >
                      Spray More Coins
                    </button>
                    <button
                      type="button"
                      onClick={onBack}
                      className="w-full py-2.5 rounded-xl bg-white/10 hover:bg-white/20 text-white text-xs font-semibold transition-colors cursor-pointer"
                    >
                      Back to Wallet Home
                    </button>
                  </div>
                </div>
              </div>
            )}
          </section>
        </div>
      )}
    </div>
  );
}
