import { useState } from 'react';
import type { GiftArtworkId } from '../types/showmelove';
import { SHOWMELOVE_LOGO_DATA_URI } from './showmeloveLogoData';

export const SHOWMELOVE_ASSETS = {
  heartMascot: '/assets/aistudio/Cute_pink_heart_holding_love_coin-2_178421f8.png',
  brandIcon: '/assets/showmelove-brand-heart.jpg',
  goldLoveCoin: '/assets/aistudio/Glossy_gold_love_coin_with_pink_heart-3_216af72c.png',
  purpleRewardsBox: '/assets/aistudio/Sparkling_purple_heart_gift_box-5_1ecd77a9.png',
  gifts: {
    'little-heart': '/assets/aistudio/Glassy_pink_heart_gift_with_sparkles-6_e971ec1a.png',
    rose: '/assets/aistudio/Lush_dewy_red_rose_gift-4_00c5b069.png',
    'teddy-hug': '/assets/aistudio/Caramel_Teddy_Bear_with_Pink_Heart-7_5d69832f.png',
    'gift-box': '/assets/aistudio/Premium_purple_gift_box_with_gold_heart-1_0f58efea.png',
  } as Record<GiftArtworkId, string>,
} as const;

function webpSource(src: string): string {
  return src.replace(/\.png$/i, '.webp');
}

function OptimizedAssetImage({
  src,
  alt,
  className,
  priority = false,
  onError,
}: {
  src: string;
  alt: string;
  className: string;
  priority?: boolean;
  onError: () => void;
}) {
  return (
    <picture className="contents">
      <source srcSet={webpSource(src)} type="image/webp" />
      <img
        src={src}
        alt={alt}
        width={512}
        height={512}
        loading={priority ? 'eager' : 'lazy'}
        decoding="async"
        fetchPriority={priority ? 'high' : 'auto'}
        draggable={false}
        onError={onError}
        className={className}
      />
    </picture>
  );
}

const GIFT_ALT_TEXT: Record<GiftArtworkId, string> = {
  'little-heart': 'Glassy pink heart gift with ribbon and sparkles',
  rose: 'Lush dewy red rose gift',
  'teddy-hug': 'Caramel teddy bear holding a pink heart',
  'gift-box': 'Celebration purple gift box with pink ribbon and gold heart',
};

function FallbackHeartSvg({ className }: { className: string }) {
  return (
    <svg viewBox="0 0 120 120" fill="none" className={className} aria-hidden="true">
      <defs>
        <radialGradient id="fbHeart" cx="34%" cy="26%" r="74%">
          <stop offset="0%" stopColor="#FF7AA8" />
          <stop offset="50%" stopColor="#FF176C" />
          <stop offset="100%" stopColor="#A90744" />
        </radialGradient>
      </defs>
      <path
        d="M60 102 C60 102 12 72 12 39 C12 20 27 8 44 8 C53 8 58 14 60 20 C62 14 67 8 76 8 C93 8 108 20 108 39 C108 72 60 102 60 102 Z"
        fill="url(#fbHeart)"
      />
    </svg>
  );
}

function FallbackBoxSvg({ className }: { className: string }) {
  return (
    <svg viewBox="0 0 120 120" fill="none" className={className} aria-hidden="true">
      <rect x="24" y="46" width="72" height="56" rx="12" fill="#9333EA" />
      <rect x="19" y="34" width="82" height="18" rx="6" fill="#C084FC" />
      <rect x="53" y="34" width="14" height="68" fill="#FDE68A" />
    </svg>
  );
}

function FallbackCoinSvg({ className }: { className: string }) {
  return (
    <svg viewBox="0 0 64 64" fill="none" className={className} aria-hidden="true">
      <circle cx="32" cy="32" r="27" fill="#F59E0B" />
      <circle cx="32" cy="32" r="21" stroke="#FFFBEB" strokeWidth="2.5" />
    </svg>
  );
}

/**
 * Official Showmelove Brand Icon (red heart hugging character with black eyes, arms, and cute expression).
 */
export function ShowmeloveBrandIcon({ className = 'w-8 h-8' }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 128 128"
      role="img"
      aria-label="Showmelove"
      className={`shrink-0 select-none overflow-hidden rounded-[26%] bg-white ${className}`}
    >
      <image
        href={SHOWMELOVE_LOGO_DATA_URI}
        x="-21"
        y="-60"
        width="169"
        height="219"
        preserveAspectRatio="none"
      />
    </svg>
  );
}

/**
 * Smiling glossy pink heart mascot holding a gold Love Coin (transparent PNG).
 * Used in Wallet Home hero, brand emblem, and Gift Reveal animations.
 */
export function LoveCoinHeartSvg({
  className = 'w-16 h-16',
  alt = 'Showmelove heart mascot holding a Love Coin',
  priority = false,
}: {
  className?: string;
  alt?: string;
  priority?: boolean;
}) {
  const [failed, setFailed] = useState(false);
  if (failed) return <FallbackHeartSvg className={className} />;
  return (
    <OptimizedAssetImage
      src={SHOWMELOVE_ASSETS.heartMascot}
      alt={alt}
      onError={() => setFailed(true)}
      className={`object-contain select-none asset-drop-shadow ${className}`}
      priority={priority}
    />
  );
}

/**
 * Purple sparkling rewards box with pink heart emblem (transparent PNG).
 * Used across Gifted Rewards, Inbox banner, Balance Info, and Withdraw Rewards cards.
 */
export function PurpleGiftBoxSvg({
  className = 'w-16 h-16',
  alt = 'Purple Gifted Rewards box with sparkling heart emblem',
  priority = false,
}: {
  className?: string;
  alt?: string;
  priority?: boolean;
}) {
  const [failed, setFailed] = useState(false);
  if (failed) return <FallbackBoxSvg className={className} />;
  return (
    <OptimizedAssetImage
      src={SHOWMELOVE_ASSETS.purpleRewardsBox}
      alt={alt}
      onError={() => setFailed(true)}
      className={`object-contain select-none asset-drop-shadow ${className}`}
      priority={priority}
    />
  );
}

/**
 * Glossy gold Love Coin with pink heart emblem (transparent PNG).
 * Used in balances, Buy Coins packages, and recipient earnings summary.
 */
export function GoldLoveCoinSvg({
  className = 'w-9 h-9',
  alt = 'Gold Love Coin',
  priority = false,
}: {
  className?: string;
  alt?: string;
  priority?: boolean;
}) {
  const [failed, setFailed] = useState(false);
  if (failed) return <FallbackCoinSvg className={className} />;
  return (
    <OptimizedAssetImage
      src={SHOWMELOVE_ASSETS.goldLoveCoin}
      alt={alt}
      onError={() => setFailed(true)}
      className={`object-contain select-none ${className}`}
      priority={priority}
    />
  );
}

/**
 * Full Showmelove mascot (transparent PNG).
 */
export function ShowmeloveMascotSvg({
  className = 'w-44 h-44',
  priority = false,
}: {
  className?: string;
  holdingGift?: boolean;
  priority?: boolean;
}) {
  return (
    <LoveCoinHeartSvg
      className={className}
      alt="Showmelove smiling pink heart mascot"
      priority={priority}
    />
  );
}

/**
 * High-resolution transparent 3D gift artwork for the 4 catalogue gifts:
 * Heart, Velvet Rose, Teddy Hug, Celebration Box.
 */
export function GiftArtworkSvg({
  artworkId,
  className = 'w-20 h-20',
  priority = false,
}: {
  artworkId: GiftArtworkId;
  className?: string;
  priority?: boolean;
}) {
  const [failed, setFailed] = useState(false);
  const src = SHOWMELOVE_ASSETS.gifts[artworkId] ?? SHOWMELOVE_ASSETS.gifts['gift-box'];

  if (failed) {
    return artworkId === 'gift-box' ? (
      <FallbackBoxSvg className={className} />
    ) : (
      <FallbackHeartSvg className={className} />
    );
  }

  return (
    <OptimizedAssetImage
      src={src}
      alt={GIFT_ALT_TEXT[artworkId] ?? 'Animated gift artwork'}
      onError={() => setFailed(true)}
      className={`object-contain select-none asset-drop-shadow ${className}`}
      priority={priority}
    />
  );
}
