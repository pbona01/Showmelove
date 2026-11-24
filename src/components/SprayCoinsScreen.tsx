import { ArrowLeft, Check, CheckCircle2, ChevronRight, LockKeyhole, RefreshCw, RotateCcw, Sparkles } from 'lucide-react';
import { useEffect, useMemo, useRef, useState } from 'react';
import { SPRAY_LAYOUTS, type SprayLayoutId } from '../config/economy';
import { useShowmelove } from '../context/ShowmeloveContext';
import { SprayCoins } from './SprayCoins';
import { Button, InputField } from './ui/DesignSystem';

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
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [confirmedRecipient, setConfirmedRecipient] = useState<CelebrantOption | null>(null);
  const dropdownRef = useRef<HTMLDivElement | null>(null);

  const [amountPerSpray, setAmountPerSpray] = useState('20');
  const [maxSprayLimit, setMaxSprayLimit] = useState('500');
  const [layoutId, setLayoutId] = useState<SprayLayoutId>('classic');

  // Active session tracking
  const [totalSprayedInSession, setTotalSprayedInSession] = useState(0);
  const [limitReached, setLimitReached] = useState(false);

  // Close dropdown on outside click
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setDropdownOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const allCelebrants = useMemo(() => {
    const list = [...DEFAULT_CELEBRANTS];
    try {
      const raw = localStorage.getItem('showmelove_user_map');
      if (raw) {
        const parsed = JSON.parse(raw);
        Object.keys(parsed).forEach((usr) => {
          if (!list.some((c) => c.username.toLowerCase() === usr.toLowerCase())) {
            list.push({
              displayName: usr.charAt(0).toUpperCase() + usr.slice(1),
              username: usr,
              email: parsed[usr],
              tag: 'Registered User',
            });
          }
        });
      }
    } catch {
      // ignore
    }
    return list;
  }, []);

  const filteredCelebrants = useMemo(() => {
    const query = targetName.trim().replace(/^@/, '').toLowerCase();
    if (!query) return allCelebrants;
    return allCelebrants.filter(
      (c) =>
        c.username.toLowerCase().includes(query) ||
        c.displayName.toLowerCase().includes(query),
    );
  }, [allCelebrants, targetName]);

  const handleSelectCelebrant = (account: CelebrantOption) => {
    setTargetName(
      account.username === 'open_room'
        ? 'Celebration Room'
        : `@${account.username.replace(/^@/, '')}`,
    );
    setConfirmedRecipient(account);
    setDropdownOpen(false);
  };

  // Eagerly preload all 5 theme coins and theme card artwork into memory
  useEffect(() => {
    SPRAY_LAYOUTS.forEach((item) => {
      const coinImg = new Image();
      coinImg.src = item.coinSrc;
      const cardImg = new Image();
      cardImg.src = item.artworkSrc;
    });
  }, []);

  const layout = SPRAY_LAYOUTS.find((item) => item.id === layoutId) ?? SPRAY_LAYOUTS[0];
  const userBalance = currentWallet.loveCoinsBalance;

  const parsedAmountPerSpray = Math.max(1, Math.floor(Number(amountPerSpray)) || 20);
  const parsedMaxLimit = Math.max(parsedAmountPerSpray, Math.floor(Number(maxSprayLimit)) || 500);

  // Remaining budget in this spray session
  const remainingBudget = Math.max(0, parsedMaxLimit - totalSprayedInSession);
  const hasBudget = remainingBudget > 0;
  const hasBalance = userBalance > 0;
  const canSprayInArena = hasBalance && hasBudget && !limitReached;

  // The effective amount per swipe uses the user's chosen amount or whatever balance/budget remains
  const effectiveSprayAmount = Math.min(parsedAmountPerSpray, userBalance, remainingBudget);

  const handleSprayAction = (count: number): boolean => {
    if (totalSprayedInSession + count >= parsedMaxLimit) {
      setLimitReached(true);
    }
    const cleanRecipient = targetName.trim().replace(/^@/, '');
    const res = sprayLoveCoins({
      coins: count,
      recipientEmail: cleanRecipient ? (cleanRecipient.includes('@') ? cleanRecipient : `${cleanRecipient}@showmelove.fun`) : undefined,
      layoutId,
    });
    if (res.ok) {
      setTotalSprayedInSession((prev) => {
        const next = prev + count;
        if (next >= parsedMaxLimit) {
          setLimitReached(true);
        }
        return next;
      });
      return true;
    }
    return false;
  };

  const PRESET_AMOUNTS = [10, 20, 50, 100, 200, 500];
  const PRESET_LIMITS = [100, 250, 500, 1000, 2500, 5000];

  return (
    <div className="mx-auto max-w-xl space-y-5 pb-10">
      {/* STEP 1: TARGET & SPRAY AMOUNT */}
      {step === 'step1_target' && (
        <div className="space-y-6">
          <button
            type="button"
            onClick={onBack}
            className="inline-flex min-h-[44px] items-center gap-2 rounded-2xl px-3 text-sm font-semibold text-[var(--text-primary)] hover:bg-[var(--bg-raised)] transition-colors cursor-pointer"
          >
            <ArrowLeft className="h-4 w-4" /> Back to Wallet Home
          </button>

          <section className="apple-card rounded-[32px] p-6 sm:p-8 space-y-6 border border-[var(--border-subtle)] shadow-xl bg-[var(--bg-card)]">
            <div className="space-y-1.5">
              <h1 className="text-2xl sm:text-3xl font-extrabold text-[var(--text-primary)] tracking-tight">
                Who are you spraying?
              </h1>
              <p className="text-xs sm:text-sm text-[var(--text-secondary)]">
                Select or type the celebrant's @username, or choose the open celebration room.
              </p>
            </div>

            {/* Recipient Input with Confirmation Dropdown */}
            <div className="space-y-2 relative" ref={dropdownRef}>
              <div className="flex items-center justify-between">
                <label
                  htmlFor="spray-target-input"
                  className="block text-sm font-bold text-[var(--text-primary)]"
                >
                  Person or Room
                </label>
                {confirmedRecipient && (
                  <span className="text-xs font-semibold text-[#087F56] dark:text-[#24C888] inline-flex items-center gap-1">
                    <CheckCircle2 className="w-3.5 h-3.5" /> Confirmed
                  </span>
                )}
              </div>

              <div className="relative">
                <input
                  id="spray-target-input"
                  type="text"
                  value={targetName}
                  onFocus={() => setDropdownOpen(true)}
                  onChange={(e) => {
                    setTargetName(e.target.value);
                    setDropdownOpen(true);
                    if (
                      confirmedRecipient &&
                      e.target.value !== confirmedRecipient.displayName &&
                      e.target.value !== `@${confirmedRecipient.username}` &&
                      e.target.value !== 'Celebration Room'
                    ) {
                      setConfirmedRecipient(null);
                    }
                  }}
                  placeholder="Type @username or name..."
                  className={`w-full rounded-2xl border bg-[var(--bg-raised)] px-4 py-3 text-base font-semibold text-[var(--text-primary)] placeholder:text-[var(--text-secondary)]/60 focus:outline-none focus:ring-2 ${
                    confirmedRecipient
                      ? 'border-[#087F56]/40 dark:border-[#24C888]/40 focus:ring-[#24C888]'
                      : 'border-[var(--border-subtle)] focus:ring-[#FF2385]'
                  }`}
                />
              </div>

              {/* Confirmation Dropdown Menu */}
              {dropdownOpen && (
                <div className="absolute z-30 left-0 right-0 mt-1 max-h-64 overflow-y-auto rounded-2xl border border-[var(--border-subtle)] bg-[var(--bg-card)] shadow-2xl p-2 space-y-1 backdrop-blur-xl">
                  <div className="px-3 py-1.5 text-[11px] font-bold uppercase tracking-wider text-[var(--text-secondary)]">
                    Select Account to Confirm
                  </div>

                  {filteredCelebrants.map((account) => {
                    const isSelected =
                      confirmedRecipient?.username.toLowerCase() ===
                      account.username.toLowerCase();
                    return (
                      <button
                        key={account.username}
                        type="button"
                        onClick={() => handleSelectCelebrant(account)}
                        className={`w-full flex items-center justify-between p-2.5 rounded-xl text-left transition-colors cursor-pointer ${
                          isSelected
                            ? 'bg-[#E61472]/10 dark:bg-[#FF2385]/15 text-[var(--text-primary)]'
                            : 'hover:bg-[var(--bg-raised)] text-[var(--text-primary)]'
                        }`}
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-[#FF2385] to-[#7C3AED] text-white font-bold text-xs flex items-center justify-center shrink-0">
                            {account.displayName.slice(0, 2).toUpperCase()}
                          </div>
                          <div className="min-w-0">
                            <p className="text-sm font-bold truncate">{account.displayName}</p>
                            <p className="text-xs text-[var(--text-secondary)] truncate">
                              @{account.username.replace(/^@/, '')}
                            </p>
                          </div>
                        </div>

                        <div className="flex items-center gap-2 shrink-0">
                          {account.tag && (
                            <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-[var(--bg-raised)] text-[var(--text-secondary)]">
                              {account.tag}
                            </span>
                          )}
                          {isSelected && <Check className="w-4 h-4 text-[#FF2385]" />}
                        </div>
                      </button>
                    );
                  })}

                  {/* Option for custom typed username if not in presets */}
                  {targetName.trim() &&
                    !filteredCelebrants.some(
                      (c) =>
                        c.username.toLowerCase() ===
                        targetName.trim().replace(/^@/, '').toLowerCase(),
                    ) && (
                      <button
                        type="button"
                        onClick={() =>
                          handleSelectCelebrant({
                            displayName: targetName.trim().replace(/^@/, ''),
                            username: targetName.trim().replace(/^@/, ''),
                            tag: 'Custom Celebrant',
                          })
                        }
                        className="w-full flex items-center gap-3 p-2.5 rounded-xl text-left hover:bg-[var(--bg-raised)] text-[var(--text-primary)] cursor-pointer"
                      >
                        <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-[#7C3AED] to-[#3B82F6] text-white font-bold text-xs flex items-center justify-center shrink-0">
                          @{targetName.trim().replace(/^@/, '').slice(0, 2).toUpperCase()}
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-bold truncate">
                            Confirm @{targetName.trim().replace(/^@/, '')}
                          </p>
                          <p className="text-xs text-[var(--text-secondary)]">
                            Tap to confirm spraying to this specific account
                          </p>
                        </div>
                        <CheckCircle2 className="w-4 h-4 text-[#24C888]" />
                      </button>
                    )}
                </div>
              )}

              {/* Confirmed Recipient Banner Card */}
              {confirmedRecipient && (
                <div className="rounded-2xl border border-[#087F56]/25 dark:border-[#24C888]/30 bg-[#E6F6EF]/60 dark:bg-[#0D3326]/50 p-3.5 flex items-center justify-between gap-3 animate-in fade-in slide-in-from-top-1">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-[#087F56] to-[#24C888] text-white font-bold text-xs flex items-center justify-center shrink-0 shadow-sm">
                      <CheckCircle2 className="w-5 h-5" />
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className="text-sm font-bold text-[var(--text-primary)]">
                          {confirmedRecipient.displayName}
                        </span>
                        <span className="text-xs font-semibold text-[#087F56] dark:text-[#24C888]">
                          @{confirmedRecipient.username.replace(/^@/, '')}
                        </span>
                      </div>
                      <p className="text-xs text-[var(--text-secondary)]">
                        {confirmedRecipient.username === 'open_room'
                          ? 'Spraying everyone in the public celebration room.'
                          : `Coins will be safely sent directly to @${confirmedRecipient.username.replace(/^@/, '')}'s account.`}
                      </p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setConfirmedRecipient(null);
                      setDropdownOpen(true);
                    }}
                    className="text-xs font-bold text-[#E61472] dark:text-[#FF4F9A] hover:underline shrink-0 cursor-pointer px-2 py-1"
                  >
                    Change
                  </button>
                </div>
              )}
            </div>

            {/* Amount Per Spray */}
            <div className="space-y-2.5">
              <label htmlFor="amount-per-spray-input" className="block text-sm font-bold text-[var(--text-primary)]">
                Amount per spray swipe
              </label>
              <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
                {PRESET_AMOUNTS.map((val) => (
                  <button
                    key={val}
                    type="button"
                    onClick={() => setAmountPerSpray(String(val))}
                    className={`min-h-[42px] py-2 px-1 rounded-2xl border text-xs sm:text-sm font-bold tabular-nums transition-all cursor-pointer ${
                      Number(amountPerSpray) === val
                        ? 'cta-pink-surface text-white border-transparent shadow-md'
                        : 'bg-[var(--bg-raised)] border-[var(--border-subtle)] text-[var(--text-primary)] hover:border-[#FF2385]/50'
                    }`}
                  >
                    {val} Coins
                  </button>
                ))}
              </div>
              <InputField
                id="amount-per-spray-input"
                label="Custom amount per spray"
                type="number"
                min={1}
                value={amountPerSpray}
                onChange={(e) => setAmountPerSpray(e.target.value)}
                className="font-bold tabular-nums"
              />
            </div>

            <Button
              variant="primary"
              size="lg"
              fullWidth
              onClick={() => setStep('step2_budget')}
            >
              Next: Set Limits & Theme <ChevronRight className="w-4 h-4 ml-1" />
            </Button>
          </section>
        </div>
      )}

      {/* STEP 2: BUDGET LIMIT & STARTING THEME */}
      {step === 'step2_budget' && (
        <div className="space-y-6">
          <button
            type="button"
            onClick={() => setStep('step1_target')}
            className="inline-flex min-h-[44px] items-center gap-2 rounded-2xl px-3 text-sm font-semibold text-[var(--text-primary)] hover:bg-[var(--bg-raised)] transition-colors cursor-pointer"
          >
            <ArrowLeft className="h-4 w-4" /> Back to Recipient
          </button>

          <section className="apple-card rounded-[32px] p-6 sm:p-8 space-y-6 border border-[var(--border-subtle)] shadow-xl bg-[var(--bg-card)]">
            <div className="space-y-1.5">
              <h1 className="text-2xl sm:text-3xl font-extrabold text-[var(--text-primary)] tracking-tight">
                Set Spray Limit & Theme
              </h1>
              <p className="text-xs sm:text-sm text-[var(--text-secondary)]">
                Control your budget so you don't go above your limit during the celebration.
              </p>
            </div>

            {/* Max Spray Limit */}
            <div className="space-y-2.5">
              <div className="flex items-center justify-between">
                <label htmlFor="max-spray-input" className="block text-sm font-bold text-[var(--text-primary)]">
                  Maximum Spray Limit
                </label>
                <span className="text-xs text-[var(--text-secondary)] font-semibold">
                  Balance: {userBalance.toLocaleString('en-NG')} LC
                </span>
              </div>
              <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
                {PRESET_LIMITS.map((lim) => (
                  <button
                    key={lim}
                    type="button"
                    onClick={() => setMaxSprayLimit(String(lim))}
                    className={`min-h-[42px] py-2 px-1 rounded-2xl border text-xs sm:text-sm font-bold tabular-nums transition-all cursor-pointer ${
                      Number(maxSprayLimit) === lim
                        ? 'cta-pink-surface text-white border-transparent shadow-md'
                        : 'bg-[var(--bg-raised)] border-[var(--border-subtle)] text-[var(--text-primary)] hover:border-[#FF2385]/50'
                    }`}
                  >
                    {lim.toLocaleString('en-NG')}
                  </button>
                ))}
              </div>
              <InputField
                id="max-spray-input"
                label="Custom maximum limit (Coins)"
                type="number"
                min={Number(amountPerSpray) || 10}
                value={maxSprayLimit}
                onChange={(e) => setMaxSprayLimit(e.target.value)}
                className="font-bold tabular-nums"
                hint={`Spraying stops automatically once you reach ${parsedMaxLimit.toLocaleString('en-NG')} coins.`}
              />
            </div>

            {/* Starting Layout Selector */}
            <div className="space-y-3">
              <label className="block text-sm font-bold text-[var(--text-primary)]">
                Choose Starting Theme Layout
              </label>
              <div className="grid grid-cols-2 sm:grid-cols-5 gap-2.5">
                {SPRAY_LAYOUTS.map((item) => {
                  const isSelected = layoutId === item.id;
                  return (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => setLayoutId(item.id)}
                      className={`group relative min-h-[135px] overflow-hidden rounded-2xl p-2.5 text-left text-white ring-2 transition-all cursor-pointer ${
                        isSelected ? 'ring-[#FF2385] shadow-xl scale-[1.03]' : 'ring-transparent opacity-85 hover:opacity-100'
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
                        <span className="text-xs font-black drop-shadow-md text-white">{item.name}</span>
                        <div className="mt-8">
                          <span className="block text-[11px] font-bold text-white drop-shadow">
                            {item.coinLabel}
                          </span>
                          <span className="block text-[9px] font-semibold text-white/80 drop-shadow">{item.badge}</span>
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
                setStep('step3_arena');
              }}
            >
              Start Spraying Now 🚀
            </Button>
          </section>
        </div>
      )}

      {/* STEP 3: THE CLEAN DEDICATED SPRAY ARENA (ZERO INTERRUPTION) */}
      {step === 'step3_arena' && (
        <div className="space-y-4">
          {/* Top Floating Control Bar */}
          <div className="flex items-center justify-between gap-3 bg-[var(--bg-card)]/90 backdrop-blur-md p-3 rounded-2xl border border-[var(--border-subtle)] shadow-md">
            <button
              type="button"
              onClick={() => setStep('step2_budget')}
              className="min-h-[40px] px-3 rounded-xl text-xs font-bold text-[var(--text-primary)] hover:bg-[var(--bg-raised)] transition-colors inline-flex items-center gap-1.5 cursor-pointer"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Settings</span>
            </button>

            <div className="text-center min-w-0">
              <span className="inline-flex items-center gap-1 text-[11px] font-extrabold uppercase tracking-wider text-[#FF2385]">
                🎉 {targetName.trim() ? targetName.trim() : 'Celebration Room'}
              </span>
              <p className="text-xs font-bold tabular-nums text-[var(--text-primary)]">
                Sprayed: {totalSprayedInSession.toLocaleString('en-NG')} / {parsedMaxLimit.toLocaleString('en-NG')} LC
              </p>
            </div>

            <button
              type="button"
              onClick={onBack}
              className="min-h-[40px] px-3 rounded-xl text-xs font-bold text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-raised)] transition-colors cursor-pointer"
            >
              Exit
            </button>
          </div>

          {/* Quick Theme Switcher Pill Slider (Scrollable while spraying) */}
          <div className="flex items-center gap-2 overflow-x-auto pb-1 px-1 scrollbar-none">
            {SPRAY_LAYOUTS.map((item) => (
              <button
                key={item.id}
                type="button"
                onClick={() => setLayoutId(item.id)}
                className={`min-h-[38px] px-3.5 py-1.5 rounded-full text-xs font-bold whitespace-nowrap transition-all cursor-pointer inline-flex items-center gap-1.5 ${
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
              isEnabled={canSprayInArena}
              coinBalance={userBalance}
              minimumSpray={layout.minimumCoins}
              sprayAmount={effectiveSprayAmount}
              layoutId={layout.id}
              coinLabel={layout.coinLabel}
              onSpray={handleSprayAction}
            />

            {/* Non-intrusive Top & Bottom Overlays */}
            <div className="relative z-10 pointer-events-none flex h-full flex-col items-center justify-between p-4 sm:p-5">
              {/* Top Badge */}
              <div className="inline-flex items-center gap-1.5 rounded-full bg-black/60 px-3.5 py-1 text-[11px] font-bold text-white shadow-lg backdrop-blur-md border border-white/20">
                <Sparkles className="h-3 w-3 text-[#FF2385]" />
                <span>{layout.badge.toUpperCase()} · {effectiveSprayAmount} {layout.coinLabel}/swipe</span>
              </div>

              {/* Center 65% is 100% clean for gestures */}
              <div className="flex-1" aria-hidden="true" />

              {/* Bottom Live Balance Dock */}
              <div className="w-full max-w-[290px] space-y-1.5 pb-1">
                <div className="rounded-2xl bg-black/70 px-4 py-2 text-white backdrop-blur-md border border-white/25 shadow-xl">
                  <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-white/80">
                    Wallet Balance
                  </p>
                  <p className="mt-0.5 text-2xl font-black tabular-nums tracking-tight text-white leading-tight">
                    {userBalance.toLocaleString('en-NG')} LC
                  </p>
                </div>

                <p className="text-[11px] font-semibold text-white/95 text-center drop-shadow-[0_2px_4px_rgba(0,0,0,0.9)]">
                  {canSprayInArena
                    ? `Flick upward to spray ${effectiveSprayAmount} ${layout.coinLabel}!`
                    : limitReached
                      ? '🎉 Maximum spray limit reached!'
                      : userBalance <= 0
                        ? 'Wallet balance empty.'
                        : 'Spraying paused.'}
                </p>
              </div>
            </div>

            {/* Limit Reached Celebration Modal Overlay */}
            {limitReached && (
              <div className="absolute inset-0 z-30 flex flex-col items-center justify-center bg-black/85 backdrop-blur-md p-6 text-white text-center space-y-4">
                <div className="w-16 h-16 rounded-full bg-[#FF2385]/20 text-[#FF2385] border border-[#FF2385]/40 flex items-center justify-center mx-auto text-2xl shadow-xl">
                  🎉
                </div>
                <div className="space-y-1">
                  <h3 className="text-xl font-extrabold">Limit Reached!</h3>
                  <p className="text-xs text-white/80 leading-relaxed max-w-xs">
                    You sprayed your target limit of <strong>{parsedMaxLimit.toLocaleString('en-NG')} Coins</strong> for {targetName || 'the room'}!
                  </p>
                </div>
                <div className="pt-2 w-full space-y-2">
                  <button
                    type="button"
                    onClick={() => {
                      setMaxSprayLimit(String(parsedMaxLimit + 500));
                      setLimitReached(false);
                    }}
                    className="w-full py-2.5 px-4 rounded-xl cta-pink-surface font-bold text-xs shadow-lg cursor-pointer hover:brightness-105"
                  >
                    + Spray 500 More Coins
                  </button>
                  <button
                    type="button"
                    onClick={() => setStep('step1_target')}
                    className="w-full py-2.5 px-4 rounded-xl bg-white/10 hover:bg-white/20 font-semibold text-xs border border-white/20 cursor-pointer"
                  >
                    Finish & New Session
                  </button>
                </div>
              </div>
            )}
          </section>

          {/* NOTE: Zero settings below the spray card to completely avoid gesture interruption! */}
        </div>
      )}
    </div>
  );
}
