import type { GiftArtworkId } from '../types/showmelove';

/**
 * Smiling glossy heart icon matching the reference Love Coin & Balance Info cards.
 */
export function LoveCoinHeartSvg({ className = 'w-16 h-16' }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 120 120"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-hidden="true"
    >
      <defs>
        <radialGradient id="refHeartGloss" cx="34%" cy="26%" r="74%">
          <stop offset="0%" stopColor="#FF7AA8" />
          <stop offset="48%" stopColor="#FF176C" />
          <stop offset="100%" stopColor="#A90744" />
        </radialGradient>
      </defs>
      <path
        d="M60 102 C60 102 12 72 12 39 C12 20 27 8 44 8 C53 8 58 14 60 20 C62 14 67 8 76 8 C93 8 108 20 108 39 C108 72 60 102 60 102 Z"
        fill="url(#refHeartGloss)"
      />
      <ellipse
        cx="35"
        cy="27"
        rx="11"
        ry="5.5"
        transform="rotate(-28 35 27)"
        fill="#FFFFFF"
        fillOpacity="0.45"
      />
      {/* Smiling eyes matching reference curved/dot expression */}
      <circle cx="44" cy="46" r="4.2" fill="#220A16" />
      <circle cx="76" cy="46" r="4.2" fill="#220A16" />
      <circle cx="42.5" cy="44.5" r="1.4" fill="#FFFFFF" />
      <circle cx="74.5" cy="44.5" r="1.4" fill="#FFFFFF" />
      <path
        d="M49 58 Q60 69 71 58"
        stroke="#220A16"
        strokeWidth="4.4"
        strokeLinecap="round"
        fill="none"
      />
    </svg>
  );
}

/**
 * Purple 3D-shaded Gift Box matching Gifted Rewards & Withdraw Rewards panels.
 */
export function PurpleGiftBoxSvg({ className = 'w-16 h-16' }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 120 120"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-hidden="true"
    >
      <defs>
        <linearGradient id="purpleBoxBody" x1="18" y1="42" x2="96" y2="104" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#A855F7" />
          <stop offset="100%" stopColor="#6D28D9" />
        </linearGradient>
        <linearGradient id="purpleBoxLid" x1="16" y1="30" x2="104" y2="52" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#C084FC" />
          <stop offset="100%" stopColor="#7E22CE" />
        </linearGradient>
        <linearGradient id="purpleRibbon" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#F3E8FF" />
          <stop offset="100%" stopColor="#D8B4FE" />
        </linearGradient>
      </defs>
      <ellipse cx="60" cy="108" rx="34" ry="6" fill="#09080D" fillOpacity="0.28" />
      <rect x="24" y="48" width="72" height="54" rx="11" fill="url(#purpleBoxBody)" />
      <rect x="19" y="34" width="82" height="19" rx="6" fill="url(#purpleBoxLid)" />
      <rect x="52" y="34" width="16" height="68" fill="url(#purpleRibbon)" />
      <rect x="24" y="68" width="72" height="11" fill="url(#purpleRibbon)" />
      <path
        d="M60 34 C46 14 27 20 37 33 C43 38 60 34 60 34 Z M60 34 C74 14 93 20 83 33 C77 38 60 34 60 34 Z"
        fill="#E9D5FF"
      />
      <circle cx="60" cy="34" r="6" fill="#F5F3FF" />
      <rect x="26" y="37" width="68" height="4" rx="2" fill="#FFFFFF" fillOpacity="0.28" />
    </svg>
  );
}

/**
 * Gold coin badge matching the Buy Coins list rows.
 */
export function GoldLoveCoinSvg({ className = 'w-9 h-9' }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 64 64"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-hidden="true"
    >
      <defs>
        <radialGradient id="goldCoinGrad" cx="32%" cy="28%" r="74%">
          <stop offset="0%" stopColor="#FDE68A" />
          <stop offset="55%" stopColor="#F59E0B" />
          <stop offset="100%" stopColor="#B45309" />
        </radialGradient>
      </defs>
      <circle cx="32" cy="32" r="27" fill="url(#goldCoinGrad)" />
      <circle cx="32" cy="32" r="21" stroke="#FFFBEB" strokeOpacity="0.55" strokeWidth="2.4" />
      <path
        d="M32 42 C32 42 20 34.5 20 26 C20 21.5 23.6 18.5 27.6 18.5 C29.8 18.5 31.3 19.7 32 21.2 C32.7 19.7 34.2 18.5 36.4 18.5 C40.4 18.5 44 21.5 44 26 C44 34.5 32 42 32 42 Z"
        fill="#FFFBEB"
      />
    </svg>
  );
}

/**
 * Full Showmelove mascot (bright glossy heart with dot eyes, smile, simple black limbs).
 */
export function ShowmeloveMascotSvg({
  className = 'w-44 h-44',
  holdingGift = true,
}: {
  className?: string;
  holdingGift?: boolean;
}) {
  return (
    <svg
      viewBox="0 0 240 240"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      role="img"
      aria-label="Showmelove smiling red heart mascot"
    >
      <defs>
        <radialGradient id="mascotHeartGrad" cx="35%" cy="28%" r="72%">
          <stop offset="0%" stopColor="#FF75A3" />
          <stop offset="50%" stopColor="#FF176C" />
          <stop offset="100%" stopColor="#A90744" />
        </radialGradient>
        <linearGradient id="mascotBoxGrad" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#F5EEFF" />
          <stop offset="100%" stopColor="#D8B4FE" />
        </linearGradient>
      </defs>

      <ellipse cx="120" cy="218" rx="64" ry="12" fill="#09080D" fillOpacity="0.2" />

      {/* Left arm */}
      <path
        d={holdingGift ? 'M54 128 C34 134, 42 162, 78 164' : 'M54 128 C30 116, 26 96, 40 84'}
        stroke="#151019"
        strokeWidth="9"
        strokeLinecap="round"
      />
      <circle cx={holdingGift ? 79 : 40} cy={holdingGift ? 164 : 84} r="6.5" fill="#151019" />

      {/* Right arm */}
      <path
        d={holdingGift ? 'M186 128 C206 134, 198 162, 162 164' : 'M186 128 C210 116, 214 96, 200 84'}
        stroke="#151019"
        strokeWidth="9"
        strokeLinecap="round"
      />
      <circle cx={holdingGift ? 161 : 200} cy={holdingGift ? 164 : 84} r="6.5" fill="#151019" />

      {/* Legs */}
      <path d="M98 182 L94 210" stroke="#151019" strokeWidth="9" strokeLinecap="round" />
      <path d="M142 182 L146 210" stroke="#151019" strokeWidth="9" strokeLinecap="round" />
      <ellipse cx="90" cy="212" rx="10" ry="5" fill="#151019" />
      <ellipse cx="150" cy="212" rx="10" ry="5" fill="#151019" />

      {/* Glossy heart body */}
      <path
        d="M120 192 C120 192 44 146 44 88 C44 57 68 38 94 38 C108 38 116 46 120 54 C124 46 132 38 146 38 C172 38 196 57 196 88 C196 146 120 192 120 192 Z"
        fill="url(#mascotHeartGrad)"
      />

      <ellipse
        cx="78"
        cy="66"
        rx="16"
        ry="9"
        transform="rotate(-28 78 66)"
        fill="#FFFFFF"
        fillOpacity="0.4"
      />

      {/* Rosy cheeks */}
      <ellipse cx="83" cy="112" rx="9" ry="5" fill="#FFACC8" fillOpacity="0.55" />
      <ellipse cx="157" cy="112" rx="9" ry="5" fill="#FFACC8" fillOpacity="0.55" />

      {/* Dot eyes */}
      <circle cx="96" cy="96" r="7" fill="#151019" />
      <circle cx="144" cy="96" r="7" fill="#151019" />
      <circle cx="93.5" cy="93.5" r="2.2" fill="#FFFFFF" />
      <circle cx="141.5" cy="93.5" r="2.2" fill="#FFFFFF" />

      {/* Smile */}
      <path
        d="M104 114 Q120 129 136 114"
        stroke="#151019"
        strokeWidth="6"
        strokeLinecap="round"
        fill="none"
      />

      {holdingGift && (
        <g transform="translate(88, 144)">
          <rect
            x="0"
            y="8"
            width="64"
            height="46"
            rx="10"
            fill="url(#mascotBoxGrad)"
            stroke="#151019"
            strokeWidth="3.2"
          />
          <rect x="26" y="8" width="12" height="46" fill="#FF176C" />
          <rect x="0" y="24" width="64" height="10" fill="#FF176C" />
          <path
            d="M32 8 C22 -4 10 2 18 10 C24 14 32 8 32 8 Z M32 8 C42 -4 54 2 46 10 C40 14 32 8 32 8 Z"
            fill="#FF176C"
            stroke="#151019"
            strokeWidth="2.4"
          />
        </g>
      )}
    </svg>
  );
}

export function GiftArtworkSvg({
  artworkId,
  className = 'w-20 h-20',
}: {
  artworkId: GiftArtworkId;
  className?: string;
}) {
  if (artworkId === 'little-heart') {
    return (
      <svg viewBox="0 0 120 120" fill="none" className={className} aria-hidden="true">
        <defs>
          <radialGradient id="artHeart" cx="35%" cy="30%" r="70%">
            <stop offset="0%" stopColor="#FF7AA8" />
            <stop offset="52%" stopColor="#FF176C" />
            <stop offset="100%" stopColor="#A90744" />
          </radialGradient>
        </defs>
        <ellipse cx="60" cy="105" rx="28" ry="6" fill="#09080D" fillOpacity="0.22" />
        <path
          d="M60 98 C60 98 16 70 16 39 C16 22 30 12 45 12 C53 12 58 17 60 22 C62 17 67 12 75 12 C90 12 104 22 104 39 C104 70 60 98 60 98 Z"
          fill="url(#artHeart)"
        />
        <ellipse cx="38" cy="31" rx="10" ry="5.5" transform="rotate(-30 38 31)" fill="#FFF" fillOpacity="0.45" />
        <circle cx="48" cy="48" r="3.6" fill="#1E0B14" />
        <circle cx="72" cy="48" r="3.6" fill="#1E0B14" />
        <path d="M52 57 Q60 65 68 57" stroke="#1E0B14" strokeWidth="3.4" strokeLinecap="round" />
      </svg>
    );
  }

  if (artworkId === 'rose') {
    return (
      <svg viewBox="0 0 120 120" fill="none" className={className} aria-hidden="true">
        <defs>
          <radialGradient id="artRose" cx="35%" cy="28%" r="70%">
            <stop offset="0%" stopColor="#FF7AA8" />
            <stop offset="55%" stopColor="#E11D62" />
            <stop offset="100%" stopColor="#880E3E" />
          </radialGradient>
        </defs>
        <ellipse cx="60" cy="108" rx="22" ry="5" fill="#09080D" fillOpacity="0.22" />
        <path d="M60 58 C60 76 58 90 60 104" stroke="#24C888" strokeWidth="6" strokeLinecap="round" />
        <path d="M60 82 C44 78 36 68 38 62 C46 62 56 70 60 82 Z" fill="#24C888" />
        <path d="M60 76 C76 72 84 62 82 56 C74 56 64 64 60 76 Z" fill="#087F56" />
        <ellipse cx="44" cy="44" rx="20" ry="22" fill="#B5124B" />
        <ellipse cx="76" cy="44" rx="20" ry="22" fill="#B5124B" />
        <circle cx="60" cy="42" r="24" fill="url(#artRose)" />
        <path
          d="M46 38 C52 26 70 26 74 40 C76 50 64 56 54 52 C48 49 47 40 56 38 C63 36 66 43 60 45"
          stroke="#FFE4F0"
          strokeWidth="3.5"
          strokeLinecap="round"
          fill="none"
        />
        <ellipse cx="47" cy="29" rx="7" ry="3.5" transform="rotate(-25 47 29)" fill="#FFF" fillOpacity="0.4" />
      </svg>
    );
  }

  if (artworkId === 'teddy-hug') {
    return (
      <svg viewBox="0 0 120 120" fill="none" className={className} aria-hidden="true">
        <defs>
          <radialGradient id="artTeddy" cx="35%" cy="28%" r="75%">
            <stop offset="0%" stopColor="#E6A47A" />
            <stop offset="60%" stopColor="#C47448" />
            <stop offset="100%" stopColor="#8A4826" />
          </radialGradient>
        </defs>
        <ellipse cx="60" cy="108" rx="30" ry="6" fill="#09080D" fillOpacity="0.22" />
        <circle cx="34" cy="28" r="12" fill="#9E5530" />
        <circle cx="34" cy="28" r="6.5" fill="#FBCFE8" />
        <circle cx="86" cy="28" r="12" fill="#9E5530" />
        <circle cx="86" cy="28" r="6.5" fill="#FBCFE8" />
        <ellipse cx="60" cy="78" rx="27" ry="26" fill="url(#artTeddy)" />
        <ellipse cx="32" cy="74" rx="10" ry="15" transform="rotate(24 32 74)" fill="#C47448" />
        <ellipse cx="88" cy="68" rx="10" ry="15" transform="rotate(-38 88 68)" fill="#C47448" />
        <circle cx="60" cy="44" r="24" fill="url(#artTeddy)" />
        <ellipse cx="60" cy="50" rx="11" ry="8.5" fill="#FAF7FB" />
        <ellipse cx="60" cy="47" rx="4" ry="2.8" fill="#1E141D" />
        <path d="M55 53 Q60 57 65 53" stroke="#1E141D" strokeWidth="2.4" strokeLinecap="round" />
        <circle cx="50" cy="40" r="3.2" fill="#1E141D" />
        <circle cx="70" cy="40" r="3.2" fill="#1E141D" />
        <path
          d="M60 91 C60 91 45 81 45 71 C45 65 50 62 55 62 C58 62 59.5 64 60 66 C60.5 64 62 62 65 62 C70 62 75 65 75 71 C75 81 60 91 60 91 Z"
          fill="#FF176C"
        />
      </svg>
    );
  }

  // gift-box (Celebration Box)
  return (
    <svg viewBox="0 0 120 120" fill="none" className={className} aria-hidden="true">
      <defs>
        <linearGradient id="artBoxBody" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#FF5292" />
          <stop offset="100%" stopColor="#A855F7" />
        </linearGradient>
      </defs>
      <ellipse cx="60" cy="107" rx="34" ry="6.5" fill="#09080D" fillOpacity="0.22" />
      <rect x="24" y="46" width="72" height="56" rx="10" fill="url(#artBoxBody)" />
      <rect x="19" y="34" width="82" height="18" rx="6" fill="#FF176C" />
      <rect x="19" y="34" width="82" height="6" rx="3" fill="#FFFFFF" fillOpacity="0.28" />
      <rect x="53" y="34" width="14" height="68" fill="#FDE68A" />
      <rect x="24" y="66" width="72" height="12" fill="#FDE68A" />
      <path
        d="M60 34 C46 14 28 20 38 33 C44 38 60 34 60 34 Z M60 34 C74 14 92 20 82 33 C76 38 60 34 60 34 Z"
        fill="#FDE68A"
        stroke="#B45309"
        strokeWidth="2"
      />
      <circle cx="60" cy="34" r="5.5" fill="#F59E0B" />
    </svg>
  );
}
