# Showmelove Animation Guide

Showmelove uses one motion language across navigation, cards, controls, checkout, and the gift reveal. The source of truth is `src/lib/animation.ts`; avoid adding one-off spring values inside screens.

## Motion principles

- Motion explains hierarchy or state. It never blocks input.
- Prefer `x`, `y`, `scale`, `rotate`, and `opacity`; avoid animating layout dimensions.
- Use a spring for direct manipulation and the Apple-style `easeOutExpo` curve for entrances.
- Every continuous animation must stop when the user requests reduced motion.
- Keep interaction feedback under 250ms and page choreography under 700ms.

## Tokens

```tsx
import { durations, easings, springs, staggers } from './lib/animation';

// Direct manipulation
transition={springs.springSnappy} // 300 / 24

// Content entrance
transition={{ duration: durations.slow, ease: easings.easeOutExpo }}

// Choreographed lists
transition={{ staggerChildren: staggers.normal }}
```

Available springs are `springDefault`, `springSnappy`, `springGentle`, `springBouncy`, and `springStiff`. Duration tokens run from `instant` (80ms) through `slowest` (700ms). Staggers are `tight`, `normal`, `loose`, and `page`.

## Page transitions

`PageTransition` supports `shared-axis`, `fade`, `slide`, and `push`. The app shell owns route transitions so individual screens should not add another full-page entrance.

```tsx
<AnimatePresence mode="wait" initial={false}>
  <PageTransition key={route} type="shared-axis">
    <Screen />
  </PageTransition>
</AnimatePresence>
```

Use `SharedLayout` for a visual element that persists between states. Use `StaggerContainer` and `StaggerItem` for short groups of related content.

## Primitives

All reusable primitives live in `src/components/ui/MotionPrimitives.tsx`.

- `Pressable`: accessible spring feedback for buttons and cards.
- `Magnetic`: subtle pointer attraction on fine-pointer devices.
- `Reveal`: once-only viewport entrance (`fade`, `slide-up`, `slide-right`, `scale`, or `blur`).
- `Floating`: slow ambient movement for decorative art.
- `Pulse`: low-amplitude attention treatment for an enabled CTA.
- `Shimmer`: loading placeholder highlight.
- `Counter`: animated, tabular numeric updates.
- `AnimatedTabs`: layout-preserving pill selection.
- `Switch`: iOS-style accessible toggle.
- `ProgressRing`: animated SVG progress indicator.
- `TiltCard`: pointer-driven 3D tilt with spring return.

```tsx
<Reveal type="slide-up">
  <Pressable onClick={submit}>Continue</Pressable>
</Reveal>

<Counter value={balance} formatter={formatNaira} />
```

The exported `create*Props` helpers provide the same behavior when a component cannot use the wrapper directly.

## Gift reveal timeline

The WebGL scene and `RevealFallback2D` read the same `giftRevealTimeline` object:

| Phase | Start | Duration |
| --- | ---: | ---: |
| Sealed box enters | 0.0s | 0.6s |
| Lid opens | 0.4s | 0.5s |
| Gift rises | 0.7s | 0.8s |
| Particle burst | 1.1s | 0.6s |
| Mascot reacts | 1.2s | 0.5s |
| Promise card unfolds | 1.5s | 0.7s |
| Voice note appears | 1.8s | 0.4s |
| Claim action enters | 2.1s | 0.5s |
| Idle float starts | 2.5s | continuous |

Three.js is lazy-loaded. The fallback is rendered while the chunk loads, when WebGL is unavailable, or after a WebGL error. Keep callbacks idempotent because the fallback and scene can overlap during Suspense handoff.

## Accessibility and performance

Use `usePrefersReducedMotion()` inside React components. For non-React code, use `prefersReducedMotion()` or `getMotionConfig()`. Reduced motion removes spatial transitions and continuous loops while preserving state changes.

Only add `will-change` immediately before a known animation; Framer Motion handles this for transformed values. The 3D canvas caps DPR at 1.5, uses demand rendering for software GL, disposes generated geometry/environment textures, and clamps frame deltas.

Before merging, run:

```bash
npm run lint
npm run build
```

Also manually verify keyboard focus, reduced motion, all routes, replay/skip behavior, and the 2D fallback.
