import type { EmoteOption } from '../../types/showmelove';

type LottieParticleSpec = {
  id: string;
  color: [number, number, number, number];
  endX: number;
  endY: number;
  size: number;
  delay: number;
  rot: number;
  isStar?: boolean;
};

function buildBurstLottieJson(name: string, particles: LottieParticleSpec[]) {
  const totalFrames = 72; // 1.2s at 60fps for ultra-smooth TikTok Live burst
  const layers = particles.map((p, idx) => {
    const startFrame = p.delay;
    const popFrame = p.delay + 16;
    const endFrame = totalFrames - 4;

    const shapeItem = p.isStar
      ? {
          ty: 'sr',
          sy: 1,
          d: 1,
          pt: { a: 0, k: 4 },
          p: { a: 0, k: [0, 0] },
          r: { a: 0, k: 0 },
          ir: { a: 0, k: p.size * 0.42 },
          is: { a: 0, k: 0 },
          or: { a: 0, k: p.size },
          os: { a: 0, k: 0 },
          nm: 'Star',
        }
      : {
          ty: 'el',
          d: 1,
          s: { a: 0, k: [p.size * 2, p.size * 2] },
          p: { a: 0, k: [0, 0] },
          nm: 'Dot',
        };

    return {
      ddd: 0,
      ind: idx + 1,
      ty: 4,
      nm: p.id,
      sr: 1,
      ks: {
        o: {
          a: 1,
          k: [
            { t: 0, s: [0], e: [0] },
            { t: startFrame, s: [0], e: [100] },
            { t: startFrame + 4, s: [100], e: [100] },
            { t: endFrame - 16, s: [100], e: [0] },
            { t: endFrame, s: [0] },
          ],
        },
        r: {
          a: 1,
          k: [
            { t: startFrame, s: [0], e: [p.rot] },
            { t: endFrame, s: [p.rot] },
          ],
        },
        p: {
          a: 1,
          k: [
            {
              t: startFrame,
              s: [160, 160, 0],
              e: [160 + p.endX * 0.8, 160 + p.endY * 0.8, 0],
              i: { x: 0.16, y: 1 },
              o: { x: 0.2, y: 0 },
            },
            {
              t: popFrame,
              s: [160 + p.endX * 0.8, 160 + p.endY * 0.8, 0],
              e: [160 + p.endX, 160 + p.endY + 14, 0],
              i: { x: 0.4, y: 1 },
              o: { x: 0.4, y: 0 },
            },
            {
              t: endFrame,
              s: [160 + p.endX, 160 + p.endY + 14, 0],
            },
          ],
        },
        a: { a: 0, k: [0, 0, 0] },
        s: {
          a: 1,
          k: [
            { t: startFrame, s: [25, 25, 100], e: [125, 125, 100] },
            { t: popFrame, s: [125, 125, 100], e: [55, 55, 100] },
            { t: endFrame, s: [55, 55, 100] },
          ],
        },
      },
      ao: 0,
      shapes: [
        {
          ty: 'gr',
          it: [
            shapeItem,
            {
              ty: 'fl',
              c: { a: 0, k: p.color },
              o: { a: 0, k: 100 },
              r: 1,
              nm: 'Fill',
            },
            {
              ty: 'tr',
              p: { a: 0, k: [0, 0] },
              a: { a: 0, k: [0, 0] },
              s: { a: 0, k: [100, 100] },
              r: { a: 0, k: 0 },
              o: { a: 0, k: 100 },
            },
          ],
          nm: 'Shape',
        },
      ],
      ip: 0,
      op: totalFrames,
      st: 0,
    };
  });

  return {
    v: '5.9.0',
    fr: 60,
    ip: 0,
    op: totalFrames,
    w: 320,
    h: 320,
    nm: name,
    ddd: 0,
    assets: [],
    layers,
  };
}

const RED: [number, number, number, number] = [0.9, 0.18, 0.27, 1];
const PINK: [number, number, number, number] = [1, 0.65, 0.72, 1];
const GOLD: [number, number, number, number] = [0.96, 0.72, 0.24, 1];
const ROSE: [number, number, number, number] = [0.85, 0.15, 0.31, 1];
const IVORY: [number, number, number, number] = [0.99, 0.94, 0.9, 1];

export const LOTTIE_EMOTE_DATA: Record<Exclude<EmoteOption, 'none'>, object> = {
  'heart-burst': buildBurstLottieJson('HeartBurst', [
    { id: 'h1', color: RED, endX: -102, endY: -86, size: 11, delay: 0, rot: 45, isStar: true },
    { id: 'h2', color: PINK, endX: 105, endY: -88, size: 10, delay: 1, rot: -45, isStar: true },
    { id: 'h3', color: RED, endX: -128, endY: 16, size: 9, delay: 2, rot: 90 },
    { id: 'h4', color: PINK, endX: 126, endY: 12, size: 9, delay: 2, rot: -90 },
    { id: 'h5', color: GOLD, endX: -54, endY: -124, size: 8, delay: 3, rot: 120, isStar: true },
    { id: 'h6', color: GOLD, endX: 56, endY: -120, size: 8, delay: 4, rot: -120, isStar: true },
    { id: 'h7', color: RED, endX: -78, endY: 82, size: 8, delay: 5, rot: 60 },
    { id: 'h8', color: PINK, endX: 82, endY: 76, size: 8, delay: 5, rot: -60 },
    { id: 'h9', color: RED, endX: 0, endY: -134, size: 9, delay: 1, rot: 180, isStar: true },
    { id: 'h10', color: GOLD, endX: -132, endY: -36, size: 7, delay: 4, rot: 150, isStar: true },
    { id: 'h11', color: GOLD, endX: 132, endY: -34, size: 7, delay: 4, rot: -150, isStar: true },
  ]),
  'rose-petals': buildBurstLottieJson('RosePetals', [
    { id: 'r1', color: ROSE, endX: -108, endY: -74, size: 11, delay: 0, rot: 140 },
    { id: 'r2', color: PINK, endX: 110, endY: -78, size: 10, delay: 1, rot: -140 },
    { id: 'r3', color: ROSE, endX: -58, endY: -118, size: 9, delay: 2, rot: 80, isStar: true },
    { id: 'r4', color: GOLD, endX: 60, endY: -116, size: 8, delay: 3, rot: -80, isStar: true },
    { id: 'r5', color: PINK, endX: -122, endY: 34, size: 9, delay: 4, rot: 110 },
    { id: 'r6', color: ROSE, endX: 120, endY: 36, size: 9, delay: 4, rot: -110 },
    { id: 'r7', color: IVORY, endX: 0, endY: -128, size: 8, delay: 2, rot: 180, isStar: true },
    { id: 'r8', color: ROSE, endX: -84, endY: 86, size: 8, delay: 5, rot: 95 },
    { id: 'r9', color: PINK, endX: 86, endY: 82, size: 8, delay: 5, rot: -95 },
  ]),
  'sparkle-hug': buildBurstLottieJson('SparkleHug', [
    { id: 's1', color: GOLD, endX: -98, endY: -94, size: 12, delay: 0, rot: 120, isStar: true },
    { id: 's2', color: GOLD, endX: 100, endY: -92, size: 12, delay: 1, rot: -120, isStar: true },
    { id: 's3', color: PINK, endX: -124, endY: -10, size: 10, delay: 2, rot: 60, isStar: true },
    { id: 's4', color: PINK, endX: 124, endY: -8, size: 10, delay: 2, rot: -60, isStar: true },
    { id: 's5', color: RED, endX: -56, endY: 84, size: 9, delay: 4, rot: 90 },
    { id: 's6', color: RED, endX: 58, endY: 86, size: 9, delay: 4, rot: -90 },
    { id: 's7', color: GOLD, endX: 0, endY: -124, size: 11, delay: 1, rot: 180, isStar: true },
    { id: 's8', color: IVORY, endX: -112, endY: 48, size: 8, delay: 3, rot: 140, isStar: true },
    { id: 's9', color: IVORY, endX: 112, endY: 48, size: 8, delay: 3, rot: -140, isStar: true },
  ]),
  'party-confetti': buildBurstLottieJson('PartyConfetti', [
    { id: 'c1', color: RED, endX: -116, endY: -96, size: 11, delay: 0, rot: 220, isStar: true },
    { id: 'c2', color: GOLD, endX: 118, endY: -94, size: 11, delay: 0, rot: -220, isStar: true },
    { id: 'c3', color: PINK, endX: -66, endY: -124, size: 10, delay: 1, rot: 160 },
    { id: 'c4', color: RED, endX: 68, endY: -122, size: 10, delay: 1, rot: -160 },
    { id: 'c5', color: GOLD, endX: -130, endY: 16, size: 9, delay: 2, rot: 180 },
    { id: 'c6', color: PINK, endX: 130, endY: 18, size: 9, delay: 2, rot: -180 },
    { id: 'c7', color: RED, endX: -84, endY: 82, size: 9, delay: 4, rot: 140, isStar: true },
    { id: 'c8', color: GOLD, endX: 86, endY: 82, size: 9, delay: 4, rot: -140, isStar: true },
    { id: 'c9', color: IVORY, endX: 0, endY: -132, size: 9, delay: 1, rot: 90, isStar: true },
    { id: 'c10', color: GOLD, endX: -126, endY: -44, size: 8, delay: 3, rot: 240 },
    { id: 'c11', color: RED, endX: 126, endY: -42, size: 8, delay: 3, rot: -240 },
  ]),
};

export const EMOTE_LABELS: Record<EmoteOption, string> = {
  none: 'No extra emote',
  'heart-burst': 'Heart Burst',
  'rose-petals': 'Rose Petals',
  'sparkle-hug': 'Warm Sparkle',
  'party-confetti': 'Celebration Confetti',
};
