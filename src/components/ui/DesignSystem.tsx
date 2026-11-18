import {
  useEffect,
  useState,
  type ButtonHTMLAttributes,
  type InputHTMLAttributes,
  type ReactNode,
} from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { Check, Monitor, Moon, Sun, X } from 'lucide-react';
import { ECONOMY_CONFIG, formatCoinCount, formatNaira } from '../../config/economy';
import { useTheme, type ThemePreference } from '../../context/ThemeContext';
import type { GiftCatalogItem } from '../../types/showmelove';
import { GiftArtworkSvg } from '../GiftArtwork';
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
    'inline-flex items-center justify-center gap-2 font-semibold transition-colors whitespace-nowrap shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#DF0756] dark:focus-visible:ring-[#FF176C] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--bg-page)] active:scale-[0.98] disabled:opacity-50 disabled:pointer-events-none';

  const variants: Record<NonNullable<ButtonProps['variant']>, string> = {
    primary:
      'bg-[#DF0756] hover:bg-[#C00549] dark:bg-[#FF176C] dark:hover:bg-[#E0105D] text-white shadow-md shadow-[#DF0756]/20 dark:shadow-[#FF176C]/25',
    secondary:
      'bg-[var(--bg-card)] text-[var(--text-primary)] border border-[var(--border-subtle)] hover:bg-[var(--bg-raised)]',
    dark: 'bg-[#201727] text-[#FAF8FC] hover:bg-[#32263C] dark:bg-[#25212E] dark:text-[#FAF8FC] dark:border dark:border-white/10 dark:hover:bg-[#302B3B]',
    ghost:
      'bg-transparent text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-raised)]',
  };

  const sizes: Record<NonNullable<ButtonProps['size']>, string> = {
    sm: 'min-h-[38px] px-3.5 py-1.5 rounded-xl text-xs',
    md: 'min-h-[44px] px-5 py-2.5 rounded-2xl text-sm',
    lg: 'min-h-[50px] px-6 py-3 rounded-2xl text-base',
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
        className={`w-full min-h-[44px] px-3.5 py-2 rounded-xl border bg-[var(--bg-raised)] text-sm text-[var(--text-primary)] placeholder:text-[var(--text-secondary)]/70 focus:outline-none focus:ring-2 focus:ring-[#DF0756]/35 dark:focus:ring-[#FF176C]/40 transition-colors ${
          error
            ? 'border-[#DF0756] dark:border-[#FF176C]'
            : 'border-[var(--border-subtle)] focus:border-[#DF0756] dark:focus:border-[#FF176C]'
        } ${className}`}
        {...rest}
      />
      {error ? (
        <p className="text-xs font-medium text-[#DF0756] dark:text-[#FF5F96]" role="alert">
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
            ? 'text-[#DF0756] dark:text-[#FF176C]'
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
      className="inline-flex items-center p-1 rounded-xl bg-[var(--bg-raised)] border border-[var(--border-subtle)]"
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
            className={`min-h-[34px] px-2.5 py-1 rounded-lg text-xs font-medium inline-flex items-center gap-1.5 transition-colors whitespace-nowrap shrink-0 ${
              active
                ? 'bg-[var(--bg-card)] text-[var(--text-primary)] shadow-sm'
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
  actionLabel,
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
      whileHover={reducedMotion || !item.available ? undefined : { y: -4 }}
      whileTap={reducedMotion || !item.available ? undefined : { scale: 0.97 }}
      transition={{ type: 'spring', stiffness: 460, damping: 28 }}
      aria-pressed={selected}
      className={`group relative w-full text-left rounded-3xl border transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#DF0756] dark:focus-visible:ring-[#FF176C] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--bg-page)] ${
        compact ? 'p-2.5 sm:p-4' : 'p-3 sm:p-4'
      } ${
        selected
          ? 'bg-[#FFEAF2] dark:bg-[#2B1726] border-[#DF0756] dark:border-[#FF176C] ring-2 ring-[#DF0756]/25 dark:ring-[#FF176C]/35 shadow-md'
          : item.available
            ? 'bg-[var(--bg-card)] border-[var(--border-subtle)] shadow-sm hover:border-[#8439D5]/40 dark:hover:border-[#A855F7]/50'
            : 'bg-[var(--bg-raised)] border-[var(--border-subtle)] opacity-65 cursor-not-allowed'
      }`}
    >
      {selected && (
        <span
          aria-hidden="true"
          className="absolute top-3 right-3 z-20 w-6 h-6 rounded-full bg-[#DF0756] dark:bg-[#FF176C] text-white flex items-center justify-center shadow-sm"
        >
          <Check className="w-3.5 h-3.5 stroke-[2.5]" />
        </span>
      )}
      {selected && burstKey > 0 && !reducedMotion && (
        <div className="absolute inset-0 pointer-events-none z-10 overflow-hidden rounded-3xl">
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
            className="w-full h-full opacity-90"
          />
        </div>
      )}

      {/* Glossy Collectible Artwork Stage */}
      <div
        className={`relative w-full rounded-2xl overflow-hidden flex items-center justify-center bg-[#F4ECF8] dark:bg-[#241E30] border border-[var(--border-subtle)] ${
          compact ? 'h-24 sm:h-30' : 'h-28 sm:h-36'
        }`}
      >
        <div
          aria-hidden="true"
          className="absolute inset-0 opacity-25 dark:opacity-40 pointer-events-none"
          style={{
            background: `radial-gradient(circle at 50% 45%, ${item.themeColor || '#A855F7'}55 0%, transparent 70%)`,
          }}
        />

        <motion.div
          aria-hidden="true"
          initial={false}
          animate={
            hovered && !reducedMotion && item.available
              ? { x: ['-120%', '140%'], opacity: [0, 0.4, 0] }
              : { x: '-120%', opacity: 0 }
          }
          transition={{ duration: 0.6, ease: 'easeOut' }}
          className="absolute inset-y-0 w-1/2 -skew-x-12 bg-gradient-to-r from-transparent via-white to-transparent pointer-events-none"
        />

        <motion.div
          animate={
            reducedMotion
              ? undefined
              : hovered && item.available
                ? { y: -5, scale: 1.05 }
                : featured
                  ? { y: [0, -4, 0] }
                  : { y: 0, scale: 1 }
          }
          transition={
            featured && !hovered
              ? { duration: 3.2, repeat: Infinity, ease: 'easeInOut' }
              : { type: 'spring', stiffness: 420, damping: 24 }
          }
          className="relative z-10 drop-shadow-md"
        >
          <GiftArtworkSvg
            artworkId={item.artworkId}
            className={compact ? 'w-16 h-16 sm:w-20 sm:h-20' : 'w-20 h-20 sm:w-24 sm:h-24'}
          />
        </motion.div>
      </div>

      {/* Compact Collectible Label + Coin Price */}
      <div className="mt-3 space-y-1">
        <div className="flex items-center justify-between gap-2">
          <p className="text-[11px] font-medium text-[var(--text-secondary)] truncate">
            {item.collectionId === 'valentines' ? "Valentine's Drop" : 'Classic'}
          </p>
          {actionLabel && item.available && (
            <span className="hidden sm:inline text-xs font-semibold text-[#DF0756] dark:text-[#FF176C] group-hover:underline">
              {actionLabel}
            </span>
          )}
        </div>
        <h3
          className={`font-bold text-[var(--text-primary)] leading-tight truncate ${
            compact ? 'text-sm sm:text-base' : 'text-[15px] sm:text-lg'
          }`}
        >
          {item.name}
        </h3>
        <div className="pt-0.5 flex items-baseline justify-between gap-2">
          <span className="font-bold tabular-nums text-sm sm:text-base text-[var(--text-primary)]">
            {showCoins ? formatCoinCount(coinsRequired) : formatNaira(item.defaultPriceNaira)}
          </span>
          {showCoins && (
            <span className="text-xs tabular-nums text-[var(--text-secondary)]">
              {formatNaira(item.defaultPriceNaira)}
            </span>
          )}
        </div>
        {!item.available && (
          <p className="text-xs font-medium text-[#DF0756] dark:text-[#FF79A8]">
            Currently paused by admin
          </p>
        )}
      </div>
    </motion.button>
  );
}

export function PromisePaperCard({
  promiseText,
  messageText,
  senderName,
  recipientName,
  amountNaira,
  unfoldAnimation = false,
}: {
  promiseText: string;
  messageText?: string;
  senderName?: string;
  recipientName?: string;
  amountNaira?: number;
  unfoldAnimation?: boolean;
}) {
  const reducedMotion =
    typeof window !== 'undefined' &&
    window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;

  const cardInner = (
    <div className="promise-paper promise-paper-fold rounded-2xl border border-[var(--border-subtle)] p-5 sm:p-6 space-y-3 text-left">
      <div className="flex items-center justify-between gap-3 pr-6">
        <span className="text-xs font-medium text-[var(--text-secondary)]">
          Digital Promise Card
        </span>
        {typeof amountNaira === 'number' && amountNaira > 0 && (
          <span className="text-sm font-bold tabular-nums text-[#DF0756] dark:text-[#FF176C]">
            {formatNaira(amountNaira)}
          </span>
        )}
      </div>

      <p className="text-lg sm:text-xl font-semibold text-[var(--text-primary)] leading-snug break-words whitespace-pre-wrap">
        “{promiseText || "Dinner's on me this weekend."}”
      </p>

      {messageText && (
        <p className="text-sm text-[var(--text-secondary)] leading-relaxed break-words whitespace-pre-wrap">
          {messageText}
        </p>
      )}

      {(senderName || recipientName) && (
        <p className="pt-2 border-t border-[var(--border-subtle)] text-xs text-[var(--text-secondary)]">
          {recipientName ? `For ${recipientName}` : 'For someone special'}
          {senderName ? ` · From ${senderName}` : ''}
        </p>
      )}
    </div>
  );

  if (!unfoldAnimation || reducedMotion) {
    return cardInner;
  }

  return (
    <div className="relative pt-1">
      <div
        aria-hidden="true"
        className="mx-3 -mb-2 h-3.5 rounded-t-xl bg-[var(--bg-raised)] border-x border-t border-[var(--border-subtle)] relative z-0"
      />
      <motion.div
        initial={{ opacity: 0, y: 14, scaleY: 0.9 }}
        animate={{ opacity: 1, y: 0, scaleY: 1 }}
        transition={{ type: 'spring', stiffness: 520, damping: 30, mass: 0.75 }}
        style={{ transformOrigin: 'top center' }}
        className="relative z-10"
      >
        {cardInner}
      </motion.div>
    </div>
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
            className="fixed inset-0 bg-black/60"
          />
          <motion.div
            role="dialog"
            aria-modal="true"
            aria-label={title}
            initial={{ y: 40, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 40, opacity: 0 }}
            transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
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
        ? 'text-[#DF0756] dark:text-[#FF176C]'
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

      <div className="flex items-center gap-2.5 sm:gap-3 shrink-0 ml-auto">
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
