# Showmelove

Showmelove is a mobile-first web application for sending animated 3D digital gifts with personal voice notes, Digital Promise Cards, and real cash value claimable to a Nigerian bank account.

## Local Setup & Commands

```bash
# Install dependencies
npm install

# Run development server on port 3000
npm run dev

# Run pure-logic unit tests (economy, checkout idempotency, claim & withdrawal rules)
npx --yes tsx --test src/services/giftRules.test.ts

# Typecheck and production build
npm run lint
npm run build
```

## Best Screen-Recording Walkthrough

Start at `/` (or jump directly to `/gift/sample` for an instant reveal clip):

1. **Home (`/`)**: Show `"Send a little love"`, the featured floating Celebration Gift Box + Digital Promise Card preview, the 4-gift catalog (`Little Heart`, `Velvet Rose`, `Teddy Hug`, `Celebration Gift Box`), and the Valentine's Seasonal Collection.
2. **Compose (`/send`)**: Walk through the 3 steps (**Choose gift → Make it personal → Review**) as a Guest—pick a gift and preset/custom amount (`₦100`–`₦100,000`), write a **Digital Promise Card** watching the live paper card preview update, attach the **sample voice note** (or record up to 30s) with the waveform player, and tap **Preview 3D gift reveal** (or **Preview gift** on mobile).
3. **Review & Demo Checkout**: Continue as Guest, test **Simulate failed payment** + **Retry**, then complete **Pay (Flutterwave Demo)** to get the shareable link, **Copy link**, **Share on WhatsApp**, and **Open recipient view**.
4. **Share & Second-Tab Reveal (`/gift/:id`)**: Open the link on the same browser (or `/gift/sample` anywhere). Tap **Open gift** to trigger the sealed squash-spring, start the voice note, watch the 3D mascot blink and hand over the gift, see the gift-specific payoff + Lottie burst, and unfold the Promise Card.
5. **Claim, Inbox & Withdraw (`/inbox` → `/withdraw`)**: Tap **Claim gift**, sign in as `ada@showmelove.ng` (or test wrong-recipient / already-claimed states), inspect **Love Coins** vs **Available to withdraw**, top up coins via the **Buy Love Coins** sheet, and test **Pending**, **Paid**, and **Failed** Nigerian bank demo payouts.
6. **Seasonal Admin (`/admin`)**: Update a gift name, price, or seasonal drop toggle and approve/reject pending demo payouts; old sent gifts retain their original snapshot.

## Demo Limitations & Security Boundary

- **Same-Browser Demo Storage**: Structured demo data (catalog, gifts, wallets, payouts) is persisted in `localStorage` (`src/services/storage.ts`) and recorded voice notes are stored in `IndexedDB` (`src/services/audioStorage.ts`). Newly created gift links require opening on the **same browser**.
- **Bundled Sample URL**: `/gift/sample` is bundled in `src/services/seedData.ts` and works on every deployment with zero setup.
- **Demo-Only Balances & Claim Checks**: All Love Coin balances, naira earnings, recipient email verification checks, Flutterwave checkout simulation, and bank payout reservations currently run client-side for demonstration. **In production, payment verification, balance mutations, claim authorization, and payout execution must be handled exclusively on a trusted server.**

## Production Integration Guide

The codebase separates UI components from storage, economy, and business rules so real services can replace the demo layer cleanly:

- **Coin Conversion & Fees**: Configured in one file at `src/config/economy.ts` (`ECONOMY_CONFIG`).
- **Supabase Auth**: Replace `switchRole` and `signInDemoEmail` in `src/context/ShowmeloveContext.tsx` with `supabase.auth.signInWithOtp` / session listeners so gift claims verify authenticated JWT email claims server-side.
- **Postgres Persistence**: Replace `BrowserStorageAdapter` in `src/services/storage.ts` with API calls backed by Postgres tables (`gifts`, `wallets`, `coin_transactions`, `earnings_transactions`, `payout_requests`), enforcing `checkoutAttemptId` uniqueness and atomic claim transactions with database constraints.
- **Private Audio Storage**: Replace `IndexedDbAudioStorage` in `src/services/audioStorage.ts` with signed upload/download URLs in Supabase Storage (or S3/R2) so voice notes work across devices and remain private to authorized gift recipients.
- **Flutterwave Payments & Transfers**: Move `createPaidGiftIdempotent` and `resolveWithdrawal` (`src/services/giftRules.ts`) into server webhooks/endpoints that verify Flutterwave transaction signatures (`verif-hash` / `/v3/transactions/:id/verify`) before crediting Love Coins, creating gifts, or initiating NIP bank transfers.
