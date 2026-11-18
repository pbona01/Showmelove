import { useEffect, useState, type ButtonHTMLAttributes, type InputHTMLAttributes, type ReactNode } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { Check, X } from 'lucide-react';
import { ECONOMY_CONFIG, formatCoins, formatNaira } from '../../config/economy';
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
    'inline-flex items-center justify-center gap-2 font-semibold transition-colors whitespace-nowrap shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#E62E45] focus-visible:ring-offset-2 focus-visible:ring-offset-[#FDF8F3] active:scale-[0.98] disabled:opacity-55 disabled:pointer-events-none';

  const variants: Record<NonNullable<ButtonProps['variant']>, string> = {
    primary:
      'bg-[#E62E45] text-white hover:bg-[#CC2238] shadow-md shadow-[#E62E45]/20',
    secondary:
      'bg-white text-[#171314] border border-[#171314]/14 hover:bg-[#FFF0F2]',
    dark: 'bg-[#171314] text-white hover:bg-[#2a2325]',
    ghost: 'bg-transparent text-[#5E5255] hover:text-[#171314] hover:bg-[#F6EDE4]',
  };

  const sizes: Record<NonNullable<ButtonProps['size']>, string> = {
    sm: 'min-h-[38px] px-3.5 py-1.5 rounded-xl text-xs',
    md: 'min-h-[44px] px-5 py-2.5 rounded-2xl text-sm',
    lg: 'min-h-[50px] px-6 py-3 rounded-2xl font-display text-base',
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
      <label htmlFor={id} className="block text-sm font-medium text-[#171314]">
        {label}
      </label>
      <input
        id={id}
        className={`w-full min-h-[44px] px-3.5 py-2 rounded-xl border bg-[#FDF8F3] text-sm text-[#171314] placeholder:text-[#5E5255]/70 focus:outline-none focus:ring-2 focus:ring-[#E62E45]/30 transition-colors ${
          error ? 'border-[#E62E45]' : 'border-[#171314]/15 focus:border-[#E62E45]'
        } ${className}`}
        {...rest}
      />
      {error ? (
        <p className="text-xs font-medium text-[#E62E45]" role="alert">
          {error}
        </p>
      ) : hint ? (
        <p className="text-[11px] text-[#5E5255]">{hint}</p>
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
        className={`font-display font-bold tabular-nums leading-tight ${priceSize} ${
          accent ? 'text-[#E62E45]' : 'text-[#171314]'
        }`}
      >
        {formatNaira(amountNaira)}
      </span>
      {showCoins && (
        <span className="text-[11px] text-[#5E5255] tabular-nums">
          {formatCoins(coins)}
        </span>
      )}
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

  return (
    <motion.button
      type="button"
      disabled={!item.available}
      onClick={onSelect}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      whileHover={reducedMotion || !item.available ? undefined : { y: -4 }}
      whileTap={reducedMotion || !item.available ? undefined : { scale: 0.98 }}
      transition={{ type: 'spring', stiffness: 420, damping: 28 }}
      aria-pressed={selected}
      className={`group relative w-full text-left rounded-3xl border transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#E62E45] focus-visible:ring-offset-2 focus-visible:ring-offset-[#FDF8F3] ${
        compact ? 'p-2.5 sm:p-4' : 'p-3 sm:p-5'
      } ${
        selected
          ? 'bg-[#FFF0F2] border-[#E62E45] ring-2 ring-[#E62E45]/30 shadow-md shadow-[#E62E45]/10'
          : item.available
            ? 'bg-white border-[#171314]/8 shadow-sm hover:shadow-md'
            : 'bg-[#F6EDE4]/70 border-[#171314]/8 opacity-60 cursor-not-allowed'
      }`}
    >
      {/* Selected Checkmark + Brief One-Shot Burst */}
      {selected && (
        <span
          aria-hidden="true"
          className="absolute top-2.5 right-2.5 z-20 w-6 h-6 rounded-full bg-[#E62E45] text-white flex items-center justify-center shadow-sm"
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

      {/* Large Gift Artwork Area with Quiet Colored Background & Hover Parallax + Sheen */}
      <div
        className={`relative w-full rounded-2xl overflow-hidden flex items-center justify-center border border-[#171314]/6 ${
          compact ? 'h-24 sm:h-32' : 'h-28 sm:h-40'
        }`}
        style={{ backgroundColor: item.accentColor || '#FFF0F2' }}
      >
        {/* Subtle highlight sweep on desktop hover */}
        <motion.div
          aria-hidden="true"
          initial={false}
          animate={
            hovered && !reducedMotion && item.available
              ? { x: ['-120%', '140%'], opacity: [0, 0.55, 0] }
              : { x: '-120%', opacity: 0 }
          }
          transition={{ duration: 0.65, ease: 'easeOut' }}
          className="absolute inset-y-0 w-1/2 -skew-x-12 bg-gradient-to-r from-transparent via-white to-transparent pointer-events-none"
        />

        {/* Artwork moves slightly more than card on hover or gently floats when featured */}
        <motion.div
          animate={
            reducedMotion
              ? undefined
              : hovered && item.available
                ? { y: -6, scale: 1.04 }
                : featured
                  ? { y: [0, -5, 0] }
                  : { y: 0, scale: 1 }
          }
          transition={
            featured && !hovered
              ? { duration: 3.4, repeat: Infinity, ease: 'easeInOut' }
              : { type: 'spring', stiffness: 360, damping: 24 }
          }
          className="drop-shadow-sm"
        >
          <GiftArtworkSvg
            artworkId={item.artworkId}
            className={compact ? 'w-16 h-16 sm:w-22 sm:h-22' : 'w-20 h-20 sm:w-28 sm:h-28'}
          />
        </motion.div>
      </div>

      {/* Steady Name, Collection Meta & Price */}
      <div className="mt-2.5 sm:mt-3 space-y-1">
        <p className="text-[11px] text-[#5E5255] truncate">
          {item.collectionId === 'valentines' ? "Valentine's Drop" : 'Evergreen'}
        </p>
        <h3
          className={`font-display font-bold text-[#171314] leading-tight ${
            compact ? 'text-sm sm:text-base' : 'text-[15px] sm:text-lg'
          }`}
        >
          {item.name}
        </h3>
        <div className="pt-0.5 flex items-baseline justify-between gap-2">
          <PriceLabel
            amountNaira={item.defaultPriceNaira}
            showCoins={showCoins}
            size={compact ? 'sm' : 'md'}
          />
          {actionLabel && item.available && (
            <span className="hidden sm:inline text-xs font-semibold text-[#E62E45] group-hover:underline">
              {actionLabel}
            </span>
          )}
        </div>
        {!item.available && (
          <p className="text-[11px] font-medium text-[#5E5255]">Unavailable</p>
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
    <div className="promise-paper promise-paper-fold rounded-2xl border border-[#171314]/10 p-5 sm:p-6 space-y-3 text-left">
      <div className="flex items-center justify-between gap-3 pr-6">
        <span className="text-[11px] font-medium text-[#5E5255]">
          Digital Promise Card
        </span>
        {typeof amountNaira === 'number' && amountNaira > 0 && (
          <span className="font-display text-sm font-bold tabular-nums text-[#E62E45]">
            {formatNaira(amountNaira)}
          </span>
        )}
      </div>

      <p className="font-display text-lg sm:text-xl font-semibold text-[#171314] leading-snug break-words whitespace-pre-wrap">
        “{promiseText || "Dinner's on me this weekend."}”
      </p>

      {messageText && (
        <p className="text-sm text-[#5E5255] leading-relaxed break-words whitespace-pre-wrap">
          {messageText}
        </p>
      )}

      {(senderName || recipientName) && (
        <p className="pt-2 border-t border-[#171314]/8 text-xs text-[#5E5255]">
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
      {/* Subtle envelope pocket tucked cleanly behind paper card */}
      <div
        aria-hidden="true"
        className="mx-3 -mb-2 h-3.5 rounded-t-xl bg-[#F2DFD5] border-x border-t border-[#171314]/8 relative z-0"
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
  return (
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-[#171314]/45"
          />
          <motion.div
            role="dialog"
            aria-modal="true"
            aria-label={title}
            initial={{ y: 40, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 40, opacity: 0 }}
            transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
            className="relative z-10 w-full sm:max-w-lg rounded-t-3xl sm:rounded-3xl bg-[#FDF8F3] border border-[#171314]/10 p-5 sm:p-6 max-h-[88vh] overflow-y-auto shadow-2xl space-y-4"
          >
            <div className="w-10 h-1 rounded-full bg-[#171314]/20 mx-auto sm:hidden" />
            <div className="flex items-center justify-between gap-3">
              <h2 className="font-display text-lg font-bold text-[#171314]">{title}</h2>
              <button
                type="button"
                onClick={onClose}
                aria-label={`Close ${title}`}
                className="w-9 h-9 rounded-xl flex items-center justify-center text-[#5E5255] hover:bg-[#F6EDE4]"
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
      ? 'text-emerald-700'
      : amountTone === 'accent'
        ? 'text-[#E62E45]'
        : 'text-[#171314]';

  return (
    <div className="py-3.5 flex items-center justify-between gap-3">
      <div className="flex items-center gap-3 min-w-0">
        {icon && <div className="shrink-0">{icon}</div>}
        <div className="min-w-0">
          <p className="text-sm font-semibold text-[#171314] truncate">{title}</p>
          <p className="text-xs text-[#5E5255] truncate">{subtitle}</p>
        </div>
      </div>

      <div className="flex items-center gap-3 shrink-0">
        <div className="text-right">
          <p className={`font-display text-sm sm:text-base font-bold tabular-nums ${toneClass}`}>
            {amountLabel}
          </p>
          {statusLabel && (
            <p className="text-[11px] font-medium text-[#5E5255]">{statusLabel}</p>
          )}
        </div>
        {action}
      </div>
    </div>
  );
}
