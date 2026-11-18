/**
 * Procedurally generates a warm 5.2-second musical voice-note placeholder WAV
 * so the bundled sample gift and demo walkthrough always have real playable
 * <audio> without external network dependencies.
 */

let cachedSampleBlobUrl: string | null = null;

function writeString(view: DataView, offset: number, str: string) {
  for (let i = 0; i < str.length; i++) {
    view.setUint8(offset + i, str.charCodeAt(i));
  }
}

export function getBundledSampleVoiceNoteUrl(): string {
  if (cachedSampleBlobUrl) return cachedSampleBlobUrl;
  if (typeof window === 'undefined') return '';

  const sampleRate = 22050;
  const durationSec = 5.2;
  const numSamples = Math.floor(sampleRate * durationSec);
  const buffer = new ArrayBuffer(44 + numSamples * 2);
  const view = new DataView(buffer);

  // RIFF header
  writeString(view, 0, 'RIFF');
  view.setUint32(4, 36 + numSamples * 2, true);
  writeString(view, 8, 'WAVE');
  writeString(view, 12, 'fmt ');
  view.setUint32(16, 16, true); // PCM chunk size
  view.setUint16(20, 1, true); // PCM format
  view.setUint16(22, 1, true); // mono
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, sampleRate * 2, true);
  view.setUint16(32, 2, true);
  view.setUint16(34, 16, true);
  writeString(view, 36, 'data');
  view.setUint32(40, numSamples * 2, true);

  // Warm romantic electric-piano arpeggio (Fmaj7 -> Dm9 -> Bbmaj7 -> C6)
  const notes: Array<{ start: number; dur: number; freq: number; gain: number }> = [
    { start: 0.05, dur: 1.4, freq: 349.23, gain: 0.22 }, // F4
    { start: 0.24, dur: 1.3, freq: 440.0, gain: 0.2 }, // A4
    { start: 0.44, dur: 1.2, freq: 523.25, gain: 0.2 }, // C5
    { start: 0.66, dur: 1.4, freq: 659.25, gain: 0.22 }, // E5

    { start: 1.45, dur: 1.3, freq: 293.66, gain: 0.2 }, // D4
    { start: 1.65, dur: 1.2, freq: 440.0, gain: 0.18 }, // A4
    { start: 1.85, dur: 1.2, freq: 523.25, gain: 0.2 }, // C5
    { start: 2.08, dur: 1.3, freq: 659.25, gain: 0.19 }, // E5

    { start: 2.85, dur: 1.2, freq: 466.16, gain: 0.2 }, // Bb4
    { start: 3.08, dur: 1.1, freq: 587.33, gain: 0.2 }, // D5
    { start: 3.3, dur: 1.1, freq: 698.46, gain: 0.22 }, // F5

    { start: 3.8, dur: 1.35, freq: 523.25, gain: 0.22 }, // C5
    { start: 4.02, dur: 1.15, freq: 659.25, gain: 0.22 }, // E5
    { start: 4.25, dur: 0.95, freq: 783.99, gain: 0.24 }, // G5
  ];

  for (let i = 0; i < numSamples; i++) {
    const t = i / sampleRate;
    let sample = 0;

    for (const n of notes) {
      if (t >= n.start && t <= n.start + n.dur) {
        const localT = t - n.start;
        const attack = Math.min(1, localT / 0.025);
        const decay = Math.exp(-localT * 2.4);
        const vibrato = Math.sin(2 * Math.PI * 5.2 * localT) * 0.004;
        const phase = 2 * Math.PI * n.freq * (1 + vibrato) * localT;
        const tone =
          Math.sin(phase) * 0.72 +
          Math.sin(phase * 2) * 0.2 +
          Math.sin(phase * 3) * 0.08;
        sample += tone * attack * decay * n.gain;
      }
    }

    // Soft master fade-out at end
    if (t > durationSec - 0.35) {
      sample *= Math.max(0, (durationSec - t) / 0.35);
    }

    const clamped = Math.max(-0.95, Math.min(0.95, sample));
    view.setInt16(44 + i * 2, Math.round(clamped * 32767), true);
  }

  const blob = new Blob([buffer], { type: 'audio/wav' });
  cachedSampleBlobUrl = URL.createObjectURL(blob);
  return cachedSampleBlobUrl;
}

/**
 * Plays a gentle, low-volume sparkle chime during the gift payoff
 * so it sits softly underneath any recorded voice note.
 */
export function playSoftPayoffChime(muted: boolean): void {
  if (muted || typeof window === 'undefined') return;
  const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
  if (!AudioCtx) return;

  try {
    const ctx = new AudioCtx();
    const now = ctx.currentTime;
    const freqs = [587.33, 783.99, 1046.5];

    freqs.forEach((f, idx) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(f, now + idx * 0.075);

      gain.gain.setValueAtTime(0.0001, now + idx * 0.075);
      gain.gain.linearRampToValueAtTime(0.045, now + idx * 0.075 + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + idx * 0.075 + 0.45);

      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now + idx * 0.075);
      osc.stop(now + idx * 0.075 + 0.5);
    });

    window.setTimeout(() => {
      void ctx.close();
    }, 1000);
  } catch {
    // Ignore audio context blocks in restricted environments
  }
}
