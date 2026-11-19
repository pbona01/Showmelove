import {
  useEffect,
  useState,
  type ButtonHTMLAttributes,
  type InputHTMLAttributes,
  type ReactNode,
} from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { Check, Heart, Monitor, Moon, Sparkles, Sun, X } from 'lucide-react';
import { ECONOMY_CONFIG, formatCoinCount, formatNaira } from '../../config/economy';
import { useTheme, type ThemePreference } from '../../context/ThemeContext';
import type { GiftCatalogItem, PromiseCardStyle } from '../../types/showmelove';
import { GiftArtworkSvg, GoldLoveCoinSvg } from '../GiftArtwork';
import { LottieEmote } from '../LottieEmote';

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'dark' | 'ghost';
  size?: 'md' | 'lg' | 'sm';
  fullWidth?: boolean;
}

export function Button({
  variant = 'primary',
  size = 'md',
  fullWidth = false,
  className = '',
  children,
  disabled,
  ...rest
}: ButtonProps) {
  const base =
    'inline-flex items-center justify-center gap-2 font-semibold transition-all duration-150 whitespace-nowrap shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#E10B5C] dark:focus-visible:ring-[#FF176C] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--bg-page)] active:scale-[0.98] disabled:opacity-50 disabled:pointer-events-none cursor-pointer';

  const variants: Record<NonNullable<ButtonProps['variant']>, string> = {
    primary:
      'cta-pink-surface hover:brightness-105 text-white shadow-[0_10px_24px_-8px_rgba(255,23,108,0.58)]',
    secondary:
      'bg-[var(--bg-card)] text-[var(--text-primary)] border border-[var(--border-subtle)] hover:bg-[var(--bg-raised)]',
    dark: 'bg-[#1D1826] text-[#FAF8FC] hover:bg-[#2A2336] dark:bg-[#1E1A28] dark:text-[#FAF8FC] dark:border dark:border-white/10 dark:hover:bg-[#2A2438]',
    ghost:
      'bg-transparent text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-raised)]',
  };

  const sizes: Record<NonNullable<ButtonProps['size']>, string> = {
    sm: 'min-h-[38px] px-3.5 py-1.5 rounded-xl text-xs',
    md: 'min-h-[44px] px-5 py-2.5 rounded-2xl text-sm',
    lg: 'min-h-[52px] px-6 py-3 rounded-2xl text-[15px]',
  };

  return (
    <button
      disabled={disabled}
      className={`${base} ${variants[variant]} ${sizes[size]} ${fullWidth ? 'w-full' : ''} ${className}`}
      {...rest}
    >
      {children}
    </button>
  );
}

interface InputFieldProps extends InputHTMLAttributes<HTMLInputElement> {
  label: string;
  hint?: string;
  error?: string;
  id: string;
}

export function InputField({
  label,
  hint,
  error,
  id,
  className = '',
  ...rest
}: InputFieldProps) {
  return (
    <div className="space-y-1.5">
      <label htmlFor={id} className="block text-sm font-medium text-[var(--text-primary)]">
        {label}
      </label>
      <input
        id={id}
        className={`w-full min-h-[46px] px-4 py-2.5 rounded-2xl border bg-[var(--bg-raised)] text-sm text-[var(--text-primary)] placeholder:text-[var(--text-secondary)]/70 focus:outline-none focus:ring-2 focus:ring-[#E10B5C]/30 dark:focus:ring-[#FF176C]/40 transition-colors ${
          error
            ? 'border-[#E10B5C] dark:border-[#FF176C]'
            : 'border-[var(--border-subtle)] focus:border-[#E10B5C] dark:focus:border-[#FF176C]'
        } ${className}`}
        {...rest}
      />
      {error ? (
        <p className="text-xs font-medium text-[#E10B5C] dark:text-[#FF5F96]" role="alert">
          {error}
        </p>
      ) : hint ? (
        <p className="text-xs text-[var(--text-secondary)]">{hint}</p>
      ) : null}
    </div>
  );
}

export function PriceLabel({
  amountNaira,
  showCoins = false,
  size = 'md',
  accent = false,
}: {
  amountNaira: number;
  showCoins?: boolean;
  size?: 'sm' | 'md' | 'lg';
  accent?: boolean;
}) {
  const coins = Math.ceil(amountNaira / ECONOMY_CONFIG.NAIRA_PER_LOVE_COIN);
  const priceSize =
    size === 'lg'
      ? 'text-2xl sm:text-3xl'
      : size === 'sm'
        ? 'text-base'
        : 'text-lg sm:text-xl';

  return (
    <div className="inline-flex flex-col">
      <span
        className={`font-bold tabular-nums leading-tight ${priceSize} ${
          accent
            ? 'text-[#E10B5C] dark:text-[#FF3888]'
            : 'text-[var(--text-primary)]'
        }`}
      >
        {formatNaira(amountNaira)}
      </span>
      {showCoins && (
        <span className="text-xs text-[var(--text-secondary)] tabular-nums">
          {formatCoinCount(coins)}
        </span>
      )}
    </div>
  );
}

export function ThemeSwitcher({ compact = false }: { compact?: boolean }) {
  const { preference, setPreference } = useTheme();
  const options: Array<{ id: ThemePreference; label: string; Icon: typeof Sun }> = [
    { id: 'system', label: 'System', Icon: Monitor },
    { id: 'light', label: 'Light', Icon: Sun },
    { id: 'dark', label: 'Dark', Icon: Moon },
  ];

  return (
    <div
      role="group"
      aria-label="Theme preference"
      className="inline-flex items-center p-1 rounded-2xl bg-[var(--bg-raised)] border border-[var(--border-subtle)]"
      data-testid="theme-switcher"
    >
      {options.map(({ id, label, Icon }) => {
        const active = preference === id;
        return (
          <button
            key={id}
            type="button"
            onClick={() => setPreference(id)}
            aria-pressed={active}
            aria-label={`${label} theme`}
            data-testid={`theme-option-${id}`}
            className={`min-h-[36px] px-3 py-1.5 rounded-xl text-xs font-semibold inline-flex items-center gap-1.5 transition-all whitespace-nowrap shrink-0 cursor-pointer ${
              active
                ? 'bg-[var(--bg-card)] text-[var(--text-primary)] shadow-sm border border-[var(--border-subtle)]'
                : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
            }`}
          >
            <Icon className="w-3.5 h-3.5" />
            {!compact && <span>{label}</span>}
          </button>
        );
      })}
    </div>
  );
}

interface TactileGiftCardProps {
  item: GiftCatalogItem;
  selected?: boolean;
  featured?: boolean;
  showCoins?: boolean;
  actionLabel?: string;
  compact?: boolean;
  onSelect: () => void;
}

export function TactileGiftCard({
  item,
  selected = false,
  featured = false,
  showCoins = true,
  compact = false,
  onSelect,
}: TactileGiftCardProps) {
  const [hovered, setHovered] = useState(false);
  const [burstKey, setBurstKey] = useState(0);

  const reducedMotion =
    typeof window !== 'undefined' &&
    window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;

  useEffect(() => {
    if (selected) {
      setBurstKey((k) => k + 1);
    }
  }, [selected]);

  const coinsRequired = Math.ceil(
    item.defaultPriceNaira / ECONOMY_CONFIG.NAIRA_PER_LOVE_COIN,
  );

  return (
    <motion.button
      type="button"
      disabled={!item.available}
      onClick={onSelect}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      whileHover={reducedMotion || !item.available ? undefined : { y: -3 }}
      whileTap={reducedMotion || !item.available ? undefined : { scale: 0.97 }}
      transition={{ type: 'spring', stiffness: 480, damping: 28 }}
      aria-pressed={selected}
      className={`group relative w-full text-center rounded-[24px] border transition-all duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#E10B5C] dark:focus-visible:ring-[#FF176C] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--bg-page)] cursor-pointer overflow-hidden ${
        compact ? 'p-3 sm:p-4' : 'p-3.5 sm:p-4'
      } ${
        selected
          ? 'bg-[#FFF0F6] dark:bg-[#231024] border-[#E10B5C] dark:border-[#FF2A85] ring-2 ring-[#E10B5C]/25 dark:ring-[#FF176C]/45 shadow-[0_0_28px_-6px_rgba(255,23,108,0.45)]'
          : item.available
            ? 'bg-[var(--bg-card)] border-[var(--border-subtle)] hover:border-[#8439D5]/45 dark:hover:border-[#A855F7]/50'
            : 'bg-[var(--bg-raised)] border-[var(--border-subtle)] opacity-60 cursor-not-allowed'
      }`}
    >
      {selected && (
        <span
          aria-hidden="true"
          className="absolute top-2.5 right-2.5 z-20 w-6 h-6 rounded-full cta-pink-surface text-white flex items-center justify-center shadow-md"
        >
          <Check className="w-3.5 h-3.5 stroke-[2.8]" />
        </span>
      )}

      {selected && burstKey > 0 && !reducedMotion && (
        <div className="absolute inset-0 pointer-events-none z-10 overflow-hidden rounded-[24px]">
          <LottieEmote
            emote={
              item.artworkId === 'rose'
                ? 'rose-petals'
                : item.artworkId === 'gift-box'
                  ? 'party-confetti'
                  : 'heart-burst'
            }
            playKey={burstKey}
            active={true}
            className="w-full h-full opacity-85"
          />
        </div>
      )}

      {/* Luminous Transparent Artwork Stage */}
      <div
        className={`relative w-full rounded-2xl flex items-center justify-center overflow-hidden ${
          compact ? 'h-24 sm:h-28' : 'h-28 sm:h-32'
        }`}
      >
        <div
          aria-hidden="true"
          className="absolute inset-0 pointer-events-none transition-opacity"
          style={{
            background: selected
              ? `radial-gradient(circle at 50% 52%, ${item.themeColor || '#FF176C'}42 0%, transparent 72%)`
              : `radial-gradient(circle at 50% 55%, ${item.themeColor || '#A855F7'}24 0%, transparent 70%)`,
          }}
        />

        <motion.div
          animate={
            reducedMotion
              ? undefined
              : hovered && item.available
                ? { y: -4, scale: 1.07 }
                : featured
                  ? { y: [0, -4, 0] }
                  : { y: 0, scale: 1 }
          }
          transition={
            featured && !hovered
              ? { duration: 3.2, repeat: Infinity, ease: 'easeInOut' }
              : { type: 'spring', stiffness: 440, damping: 24 }
          }
          className="relative z-10"
        >
          <GiftArtworkSvg
            artworkId={item.artworkId}
            className={compact ? 'w-20 h-20 sm:w-24 sm:h-24' : 'w-24 h-24 sm:w-28 sm:h-28'}
          />
        </motion.div>
      </div>

      {/* Crisp Title + Coin/Naira Value */}
      <div className="mt-2 space-y-0.5">
        <h3
          className={`font-bold text-[var(--text-primary)] leading-tight truncate ${
            compact ? 'text-sm sm:text-[15px]' : 'text-[15px] sm:text-base'
          }`}
        >
          {item.name}
        </h3>
        <div className="flex items-center justify-center gap-1.5 text-xs tabular-nums text-[var(--text-secondary)]">
          {showCoins ? (
            <>
              <GoldLoveCoinSvg className="w-3.5 h-3.5 shrink-0" />
              <span className="font-semibold text-[var(--text-primary)]">
                {coinsRequired.toLocaleString('en-NG')}
              </span>
              <span>· {formatNaira(item.defaultPriceNaira)}</span>
            </>
          ) : (
            <span className="font-semibold text-[var(--text-primary)]">
              {formatNaira(item.defaultPriceNaira)}
            </span>
          )}
        </div>
        {!item.available && (
          <p className="text-[11px] font-medium text-[#E10B5C] dark:text-[#FF79A8]">
            Paused by admin
          </p>
        )}
      </div>
    </motion.button>
  );
}

export const PROMISE_CARD_STYLES: Array<{
  id: PromiseCardStyle;
  label: string;
  swatchClass: string;
  isLightCard?: boolean;
}> = [
  {
    id: 'silk-crimson',
    label: 'Silk Crimson',
    swatchClass: 'promise-style-silk-crimson',
  },
  {
    id: 'royal-plum',
    label: 'Royal Plum',
    swatchClass: 'promise-style-royal-plum',
  },
  {
    id: 'midnight-indigo',
    label: 'Midnight Indigo',
    swatchClass: 'promise-style-midnight-indigo',
  },
  {
    id: 'rose-velvet',
    label: 'Rose Velvet',
    swatchClass: 'promise-style-rose-velvet',
  },
  {
    id: 'parchment-ribbon',
    label: 'Warm Ribbon',
    swatchClass: 'promise-style-parchment-ribbon',
    isLightCard: true,
  },
];

export function PromisePaperCard({
  promiseText,
  messageText,
  senderName,
  recipientName,
  amountNaira,
  cardStyle = 'silk-crimson',
  unfoldAnimation = false,
}: {
  promiseText: string;
  messageText?: string;
  senderName?: string;
  recipientName?: string;
  amountNaira?: number;
  cardStyle?: PromiseCardStyle;
  unfoldAnimation?: boolean;
}) {
  const reducedMotion =
    typeof window !== 'undefined' &&
    window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;

  const styleMeta =
    PROMISE_CARD_STYLES.find((s) => s.id === cardStyle) ?? PROMISE_CARD_STYLES[0];
  const isLight = Boolean(styleMeta.isLightCard);

  const cardInner = (
    <div
      data-testid="promise-card-preview"
      data-card-style={cardStyle}
      className={`${styleMeta.swatchClass} promise-silk-sheen rounded-[24px] border ${
        isLight ? 'border-[#E10B5C]/20' : 'border-white/15'
      } p-5 sm:p-6 space-y-3.5 text-left shadow-[0_18px_40px_-18px_rgba(0,0,0,0.45)]`}
    >
      <div className="relative z-10 flex items-start justify-between gap-3">
        <div>
          <p
            className={`text-xs font-medium ${
              isLight ? 'text-[#734A5C]' : 'text-white/75'
            }`}
          >
            For{' '}
            <span className={`font-bold ${isLight ? 'text-[#261422]' : 'text-white'}`}>
              {recipientName || 'Someone special'}
            </span>
          </p>
          <div
            className={`mt-1.5 h-[2px] w-10 rounded-full ${
              isLight ? 'bg-[#E10B5C]/60' : 'bg-[#FF3888]/80'
            }`}
          />
        </div>

        <div className="flex items-center gap-2 shrink-0">
          {typeof amountNaira === 'number' && amountNaira > 0 && (
            <span
              className={`text-xs font-bold tabular-nums px-2.5 py-1 rounded-full ${
                isLight
                  ? 'bg-[#E10B5C]/12 text-[#C2074E]'
                  : 'bg-white/14 text-white'
              }`}
            >
              {formatNaira(amountNaira)}
            </span>
          )}
          <div
            aria-hidden="true"
            className={`w-9 h-9 rounded-full flex items-center justify-center ${
              isLight
                ? 'bg-[#E10B5C]/12 text-[#E10B5C]'
                : 'bg-white/14 text-[#FF85B8]'
            }`}
          >
            <Heart className="w-4 h-4 fill-current" />
          </div>
        </div>
      </div>

      <p
        className={`relative z-10 font-serif-card text-xl sm:text-2xl font-semibold leading-snug break-words whitespace-pre-wrap ${
          isLight ? 'text-[#261422]' : 'text-white'
        }`}
      >
        {promiseText || "Dinner's on me this weekend"}
      </p>

      {messageText && (
        <p
          className={`relative z-10 text-xs sm:text-sm leading-relaxed break-words whitespace-pre-wrap ${
            isLight ? 'text-[#5A3E4C]' : 'text-white/80'
          }`}
        >
          {messageText}
        </p>
      )}

      <div
        className={`relative z-10 pt-2.5 border-t flex items-center justify-between gap-2 text-xs ${
          isLight
            ? 'border-[#261422]/12 text-[#734A5C]'
            : 'border-white/14 text-white/75'
        }`}
      >
        <span className="italic font-medium">
          — {senderName || 'You'}
        </span>
        <span className="inline-flex items-center gap-1 text-[11px] font-medium">
          <Sparkles className="w-3 h-3" />
          <span>Digital Promise Card</span>
        </span>
      </div>
    </div>
  );

  if (!unfoldAnimation || reducedMotion) {
    return cardInner;
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 16, scale: 0.96 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ type: 'spring', stiffness: 520, damping: 30, mass: 0.72 }}
    >
      {cardInner}
    </motion.div>
  );
}

export function BottomSheet({
  open,
  title,
  onClose,
  children,
}: {
  open: boolean;
  title: string;
  onClose: () => void;
  children: ReactNode;
}) {
  useEffect(() => {
    if (!open) return;
    const onKeyDown = (evt: KeyboardEvent) => {
      if (evt.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [open, onClose]);

  return (
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/65 backdrop-blur-xs"
          />
          <motion.div
            role="dialog"
            aria-modal="true"
            aria-label={title}
            initial={{ y: 40, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 40, opacity: 0 }}
            transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
            className="relative z-10 w-full sm:max-w-lg rounded-t-3xl sm:rounded-3xl bg-[var(--bg-card)] border border-[var(--border-subtle)] p-5 sm:p-6 pb-safe max-h-[88vh] overflow-y-auto shadow-2xl space-y-4"
          >
            <div className="w-10 h-1 rounded-full bg-[var(--text-secondary)]/30 mx-auto sm:hidden" />
            <div className="flex items-center justify-between gap-3">
              <h2 className="text-lg font-bold text-[var(--text-primary)]">{title}</h2>
              <button
                type="button"
                onClick={onClose}
                aria-label={`Close ${title}`}
                className="min-w-[44px] min-h-[44px] rounded-xl flex items-center justify-center text-[var(--text-secondary)] hover:bg-[var(--bg-raised)]"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            {children}
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}

export function TransactionRow({
  icon,
  title,
  subtitle,
  amountLabel,
  amountTone = 'neutral',
  statusLabel,
  action,
}: {
  icon?: ReactNode;
  title: string;
  subtitle: string;
  amountLabel: string;
  amountTone?: 'positive' | 'accent' | 'neutral';
  statusLabel?: string;
  action?: ReactNode;
}) {
  const toneClass =
    amountTone === 'positive'
      ? 'text-[#087F56] dark:text-[#24C888]'
      : amountTone === 'accent'
        ? 'text-[#E10B5C] dark:text-[#FF3888]'
        : 'text-[var(--text-primary)]';

  return (
    <div className="py-3.5 flex flex-wrap sm:flex-nowrap items-center justify-between gap-2.5 sm:gap-3">
      <div className="flex items-center gap-3 min-w-0 flex-1 basis-[170px]">
        {icon && <div className="shrink-0">{icon}</div>}
        <div className="min-w-0">
          <p className="text-sm font-semibold text-[var(--text-primary)] truncate">{title}</p>
          <p className="text-xs text-[var(--text-secondary)] truncate">{subtitle}</p>
        </div>
      </div>

      <div className="flex flex-wrap sm:flex-nowrap items-center justify-end gap-2 sm:gap-3 sm:shrink-0 ml-auto max-w-full">
        <div className="text-right">
          <p className={`text-sm sm:text-base font-bold tabular-nums ${toneClass}`}>
            {amountLabel}
          </p>
          {statusLabel && (
            <p className="text-xs font-medium text-[var(--text-secondary)]">{statusLabel}</p>
          )}
        </div>
        {action}
      </div>
    </div>
  );
}
