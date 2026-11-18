import type { GiftArtworkId } from '../types/showmelove';

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
          <stop offset="0%" stopColor="#FF5F73" />
          <stop offset="52%" stopColor="#E62E45" />
          <stop offset="100%" stopColor="#B8162B" />
        </radialGradient>
        <linearGradient id="mascotBoxGrad" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#FFF5F6" />
          <stop offset="100%" stopColor="#FFD6DD" />
        </linearGradient>
      </defs>

      {/* Soft ground shadow */}
      <ellipse cx="120" cy="218" rx="64" ry="12" fill="#171314" fillOpacity="0.1" />

      {/* Left arm (simple black expressive stroke) */}
      <path
        d={holdingGift ? 'M54 128 C34 134, 42 162, 78 164' : 'M54 128 C30 116, 26 96, 40 84'}
        stroke="#171314"
        strokeWidth="9"
        strokeLinecap="round"
      />
      <circle cx={holdingGift ? 79 : 40} cy={holdingGift ? 164 : 84} r="6.5" fill="#171314" />

      {/* Right arm */}
      <path
        d={holdingGift ? 'M186 128 C206 134, 198 162, 162 164' : 'M186 128 C210 116, 214 96, 200 84'}
        stroke="#171314"
        strokeWidth="9"
        strokeLinecap="round"
      />
      <circle cx={holdingGift ? 161 : 200} cy={holdingGift ? 164 : 84} r="6.5" fill="#171314" />

      {/* Legs */}
      <path d="M98 182 L94 210" stroke="#171314" strokeWidth="9" strokeLinecap="round" />
      <path d="M142 182 L146 210" stroke="#171314" strokeWidth="9" strokeLinecap="round" />
      <ellipse cx="90" cy="212" rx="10" ry="5" fill="#171314" />
      <ellipse cx="150" cy="212" rx="10" ry="5" fill="#171314" />

      {/* Bright red heart body */}
      <path
        d="M120 192 C120 192 44 146 44 88 C44 57 68 38 94 38 C108 38 116 46 120 54 C124 46 132 38 146 38 C172 38 196 57 196 88 C196 146 120 192 120 192 Z"
        fill="url(#mascotHeartGrad)"
      />

      {/* Glossy highlight */}
      <ellipse
        cx="78"
        cy="66"
        rx="16"
        ry="9"
        transform="rotate(-28 78 66)"
        fill="#FFFFFF"
        fillOpacity="0.34"
      />

      {/* Rosy cheeks */}
      <ellipse cx="83" cy="112" rx="9" ry="5" fill="#FF9AA8" fillOpacity="0.65" />
      <ellipse cx="157" cy="112" rx="9" ry="5" fill="#FF9AA8" fillOpacity="0.65" />

      {/* Recognizable dot eyes */}
      <circle cx="96" cy="96" r="7" fill="#171314" />
      <circle cx="144" cy="96" r="7" fill="#171314" />
      <circle cx="93.5" cy="93.5" r="2.2" fill="#FFFFFF" />
      <circle cx="141.5" cy="93.5" r="2.2" fill="#FFFFFF" />

      {/* Smiling mouth */}
      <path
        d="M104 114 Q120 129 136 114"
        stroke="#171314"
        strokeWidth="6"
        strokeLinecap="round"
        fill="none"
      />

      {/* Held mini gift */}
      {holdingGift && (
        <g transform="translate(88, 144)">
          <rect
            x="0"
            y="8"
            width="64"
            height="46"
            rx="10"
            fill="url(#mascotBoxGrad)"
            stroke="#171314"
            strokeWidth="3.5"
          />
          <rect x="26" y="8" width="12" height="46" fill="#E62E45" />
          <rect x="0" y="24" width="64" height="10" fill="#E62E45" />
          <path
            d="M32 8 C22 -4 10 2 18 10 C24 14 32 8 32 8 Z M32 8 C42 -4 54 2 46 10 C40 14 32 8 32 8 Z"
            fill="#E62E45"
            stroke="#171314"
            strokeWidth="2.5"
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
            <stop offset="0%" stopColor="#FF7588" />
            <stop offset="55%" stopColor="#E62E45" />
            <stop offset="100%" stopColor="#A61124" />
          </radialGradient>
        </defs>
        <ellipse cx="60" cy="105" rx="28" ry="6" fill="#171314" fillOpacity="0.1" />
        <path
          d="M60 98 C60 98 16 70 16 39 C16 22 30 12 45 12 C53 12 58 17 60 22 C62 17 67 12 75 12 C90 12 104 22 104 39 C104 70 60 98 60 98 Z"
          fill="url(#artHeart)"
        />
        <ellipse cx="38" cy="31" rx="10" ry="5.5" transform="rotate(-30 38 31)" fill="#FFF" fillOpacity="0.45" />
        <circle cx="48" cy="48" r="3.5" fill="#171314" />
        <circle cx="72" cy="48" r="3.5" fill="#171314" />
        <path d="M52 57 Q60 65 68 57" stroke="#171314" strokeWidth="3.2" strokeLinecap="round" />
      </svg>
    );
  }

  if (artworkId === 'rose') {
    return (
      <svg viewBox="0 0 120 120" fill="none" className={className} aria-hidden="true">
        <defs>
          <radialGradient id="artRose" cx="35%" cy="28%" r="70%">
            <stop offset="0%" stopColor="#FF6B8A" />
            <stop offset="55%" stopColor="#D9264E" />
            <stop offset="100%" stopColor="#8F112F" />
          </radialGradient>
        </defs>
        <ellipse cx="60" cy="108" rx="22" ry="5" fill="#171314" fillOpacity="0.1" />
        {/* Stem & leaves */}
        <path d="M60 58 C60 76 58 90 60 104" stroke="#2D7A4D" strokeWidth="6" strokeLinecap="round" />
        <path d="M60 82 C44 78 36 68 38 62 C46 62 56 70 60 82 Z" fill="#3B9B63" />
        <path d="M60 76 C76 72 84 62 82 56 C74 56 64 64 60 76 Z" fill="#2D7A4D" />
        {/* Outer petals */}
        <ellipse cx="44" cy="44" rx="20" ry="22" fill="#B8163A" />
        <ellipse cx="76" cy="44" rx="20" ry="22" fill="#B8163A" />
        {/* Main bloom */}
        <circle cx="60" cy="42" r="24" fill="url(#artRose)" />
        <path d="M46 38 C52 26 70 26 74 40 C76 50 64 56 54 52 C48 49 47 40 56 38 C63 36 66 43 60 45" stroke="#FFD6DF" strokeWidth="3.5" strokeLinecap="round" fill="none" />
        <ellipse cx="47" cy="29" rx="7" ry="3.5" transform="rotate(-25 47 29)" fill="#FFF" fillOpacity="0.4" />
      </svg>
    );
  }

  if (artworkId === 'teddy-hug') {
    return (
      <svg viewBox="0 0 120 120" fill="none" className={className} aria-hidden="true">
        <defs>
          <radialGradient id="artTeddy" cx="35%" cy="28%" r="75%">
            <stop offset="0%" stopColor="#DF9D74" />
            <stop offset="60%" stopColor="#B86B43" />
            <stop offset="100%" stopColor="#854524" />
          </radialGradient>
        </defs>
        <ellipse cx="60" cy="108" rx="30" ry="6" fill="#171314" fillOpacity="0.1" />
        {/* Ears */}
        <circle cx="34" cy="28" r="12" fill="#9E5530" />
        <circle cx="34" cy="28" r="6.5" fill="#FFD6DD" />
        <circle cx="86" cy="28" r="12" fill="#9E5530" />
        <circle cx="86" cy="28" r="6.5" fill="#FFD6DD" />
        {/* Body & Arms */}
        <ellipse cx="60" cy="78" rx="27" ry="26" fill="url(#artTeddy)" />
        <ellipse cx="32" cy="74" rx="10" ry="15" transform="rotate(24 32 74)" fill="#B86B43" />
        <ellipse cx="88" cy="68" rx="10" ry="15" transform="rotate(-38 88 68)" fill="#B86B43" />
        {/* Head */}
        <circle cx="60" cy="44" r="24" fill="url(#artTeddy)" />
        {/* Muzzle */}
        <ellipse cx="60" cy="50" rx="11" ry="8.5" fill="#FDF8F3" />
        <ellipse cx="60" cy="47" rx="4" ry="2.8" fill="#171314" />
        <path d="M55 53 Q60 57 65 53" stroke="#171314" strokeWidth="2.4" strokeLinecap="round" />
        {/* Eyes */}
        <circle cx="50" cy="40" r="3.2" fill="#171314" />
        <circle cx="70" cy="40" r="3.2" fill="#171314" />
        {/* Held Heart */}
        <path
          d="M60 91 C60 91 45 81 45 71 C45 65 50 62 55 62 C58 62 59.5 64 60 66 C60.5 64 62 62 65 62 C70 62 75 65 75 71 C75 81 60 91 60 91 Z"
          fill="#E62E45"
        />
      </svg>
    );
  }

  // gift-box
  return (
    <svg viewBox="0 0 120 120" fill="none" className={className} aria-hidden="true">
      <defs>
        <linearGradient id="artBoxBody" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#FF5F73" />
          <stop offset="100%" stopColor="#CC2238" />
        </linearGradient>
      </defs>
      <ellipse cx="60" cy="107" rx="34" ry="6.5" fill="#171314" fillOpacity="0.1" />
      {/* Box body */}
      <rect x="24" y="46" width="72" height="56" rx="10" fill="url(#artBoxBody)" />
      {/* Lid */}
      <rect x="19" y="34" width="82" height="18" rx="6" fill="#E62E45" />
      <rect x="19" y="34" width="82" height="6" rx="3" fill="#FFFFFF" fillOpacity="0.24" />
      {/* Gold/Ivory Ribbon */}
      <rect x="53" y="34" width="14" height="68" fill="#FDE68A" />
      <rect x="24" y="66" width="72" height="12" fill="#FDE68A" />
      {/* Bow */}
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
