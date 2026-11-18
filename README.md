# Showmelove

Showmelove is a mobile-first gifting web app for sending animated 3D digital gifts with personal voice notes, Digital Promise Cards, Love Coins, and Gifted Rewards claimable to Nigerian bank accounts.

## Local Setup & Commands

```bash
# Install dependencies
npm install

# Run development server on port 3000
npm run dev

# Run pure-logic unit tests (20% fee math, coin packages, idempotency, claim & withdrawal rules)
npx --yes tsx --test src/services/giftRules.test.ts

# Typecheck and production build
npm run lint
npm run build
```

## Theme & Design System

- **System / Light / Dark Modes**: Persisted in `localStorage` (`showmelove_theme_preference_v1`) and applied before first paint via inline script in `index.html` to prevent theme flashes.
- **Typography**: `DM Sans` with `tabular-nums` on all coin balances, naira totals, prices, and voice-note timers.
- **Economy Config**: Configurable in `src/config/economy.ts` (`1 Love Coin = ₦1`, `20%` demo platform fee -> `80%` recipient creator share; e.g., a `1,000`-coin gift creates `₦800` in withdrawable Gifted Rewards).

## Best Screen-Recording Walkthrough

Start at `/wallet` or `/` (or jump directly to `/gift/sample` for an instant reveal clip):

1. **Wallet (`/wallet` → `/balance-info` → `/buy-coins` → `/withdraw`)**:
   - Inspect the **Love Coin** card (`4,000` Coins / `₦4,000`), **Gifted Rewards** card (`₦6,000` withdrawable), and recent transaction history.
   - Tap the `(i)` **Balance Info** icon to inspect coin conversion and the `20%` fee / `80%` creator earnings split.
   - Tap **Buy Coins** to purchase preset (`100`, `500 Most Popular`, `1,000`, `5,000`, `10,000`) or custom packages, or test simulated failure and retry.
   - Tap **Withdraw** to manage a Nigerian bank account, preview payout fees and net payout, and submit or resolve `Pending`, `Paid`, and `Failed` demo payouts.
2. **Gifts & Composer (`/` → `/send`)**:
   - Browse the 4 gifts (`Little Heart`, `Velvet Rose`, `Teddy Hug`, `Celebration Gift Box`) and Valentine's seasonal collection.
   - Compose a gift with preset/custom coin amount, Digital Promise Card, and recorded/sample voice note, preview the 3D reveal, and complete simulated checkout.
3. **TikTok Live-Inspired Gift Reveal (`/gift/sample` or `/gift/:id`)**:
   - Tap **Open gift** to watch the 5.4s mascot carry-and-handoff reveal, gift-specific payoff animation, Lottie emote burst, and scrubbable voice-note player (`Play/Pause` + progress bar).
   - Tap **Claim gift** to trigger the celebration confetti explosion and credit `Gifted Rewards`.

## Demo Limitations & Production Architecture (Supabase + Flutterwave)

- **Preview Zero-Config Mode**: Without environment variables, gifts, wallets, and payouts persist in browser `localStorage` (`src/services/storage.ts`) and recorded voice notes persist in `IndexedDB` (`src/services/audioStorage.ts`). `/gift/sample` works everywhere with zero setup.
- **Optional Cross-Device Sync**: Setting `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` (see `.env.example`) enables `src/services/supabaseBridge.ts` to sync shared gift links across browsers via the `gifts` table.
- **Production Backend Requirements**:
  1. **Supabase Auth**: Replace `switchRole` / `signInDemoEmail` with OTP/JWT auth (`supabase.auth`) so recipient claims verify authenticated server-side JWT emails.
  2. **Postgres & RLS**: Move `createPaidGiftIdempotent`, `claimGiftIdempotent`, and `requestWithdrawal` into Postgres RPCs / Edge Functions with unique `checkoutAttemptId` constraints and Row-Level Security.
  3. **Private Voice-Note Storage**: Upload recorded audio blobs to a private Supabase Storage bucket and issue short-lived signed URLs after recipient authorization.
  4. **Flutterwave Webhooks & Transfers**: Verify Flutterwave payment signatures (`verif-hash` / `/v3/transactions/:id/verify`) server-side before crediting Love Coins or triggering NIP bank transfers.
