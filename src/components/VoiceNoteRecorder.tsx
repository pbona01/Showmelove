import { useEffect, useRef, useState } from 'react';
import { AudioLines, Mic, Pause, Play, RotateCcw, Square, Trash2, Volume2 } from 'lucide-react';
import { ECONOMY_CONFIG } from '../config/economy';
import { audioStorage } from '../services/audioStorage';
import { getBundledSampleVoiceNoteUrl } from '../audio/sampleVoiceNote';

export interface VoiceNoteValue {
  source: 'none' | 'sample' | 'recorded';
  blobKey?: string;
  durationSec?: number;
}

interface VoiceNoteRecorderProps {
  value: VoiceNoteValue;
  onChange: (next: VoiceNoteValue) => void;
}

const WAVEFORM_BARS = [
  24, 44, 68, 38, 84, 58, 96, 48, 76, 92, 54, 40, 82, 66, 36, 72, 88, 52, 42, 74, 60, 44, 80, 48, 30, 56, 36,
];

function formatDuration(seconds: number): string {
  const safe = Math.max(0, Math.round(seconds));
  const mins = Math.floor(safe / 60);
  const secs = safe % 60;
  return `${mins}:${String(secs).padStart(2, '0')}`;
}

export function VoiceNoteRecorder({ value, onChange }: VoiceNoteRecorderProps) {
  const [recordingState, setRecordingState] = useState<'idle' | 'recording'>('idle');
  const [elapsedSec, setElapsedSec] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [playbackProgress, setPlaybackProgress] = useState(0);
  const [micError, setMicError] = useState<string | null>(null);
  const [recordedPreviewUrl, setRecordedPreviewUrl] = useState<string | null>(null);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<number | null>(null);
  const audioElRef = useRef<HTMLAudioElement | null>(null);
  const rafRef = useRef<number | null>(null);
  const durationOnStopRef = useRef(0);

  const maxSec = ECONOMY_CONFIG.MAX_VOICE_NOTE_SECONDS;
  const recordingSupported =
    typeof window !== 'undefined' &&
    typeof navigator !== 'undefined' &&
    !!navigator.mediaDevices?.getUserMedia &&
    typeof MediaRecorder !== 'undefined';

  useEffect(() => {
    let active = true;
    if (value.source === 'recorded' && value.blobKey) {
      audioStorage
        .getVoiceNote(value.blobKey)
        .then((blob) => {
          if (!active || !blob) return;
          const url = URL.createObjectURL(blob);
          setRecordedPreviewUrl((prev) => {
            if (prev) URL.revokeObjectURL(prev);
            return url;
          });
        })
        .catch(() => undefined);
    }
    return () => {
      active = false;
    };
  }, [value.source, value.blobKey]);

  useEffect(() => {
    return () => {
      if (timerRef.current) window.clearInterval(timerRef.current);
      if (rafRef.current) window.cancelAnimationFrame(rafRef.current);
      streamRef.current?.getTracks().forEach((t) => t.stop());
      audioElRef.current?.pause();
    };
  }, []);

  const stopProgressLoop = () => {
    if (rafRef.current) {
      window.cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
    }
  };

  const stopPlayback = () => {
    stopProgressLoop();
    if (audioElRef.current) {
      audioElRef.current.pause();
      audioElRef.current.currentTime = 0;
    }
    setIsPlaying(false);
    setPlaybackProgress(0);
  };

  const stopRecording = () => {
    if (timerRef.current) {
      window.clearInterval(timerRef.current);
      timerRef.current = null;
    }
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop();
    }
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
    setRecordingState('idle');
  };

  const startRecording = async () => {
    stopPlayback();
    setMicError(null);

    if (!recordingSupported) {
      setMicError(
        'Microphone recording is unavailable in this browser. Attach the bundled sample voice note below.',
      );
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;
      chunksRef.current = [];
      durationOnStopRef.current = 0;
      setElapsedSec(0);

      const mimeType = MediaRecorder.isTypeSupported('audio/webm;codecs=opus')
        ? 'audio/webm;codecs=opus'
        : undefined;
      const recorder = mimeType
        ? new MediaRecorder(stream, { mimeType })
        : new MediaRecorder(stream);

      recorder.ondataavailable = (evt) => {
        if (evt.data.size > 0) chunksRef.current.push(evt.data);
      };

      recorder.onstop = async () => {
        const blob = new Blob(chunksRef.current, {
          type: recorder.mimeType || 'audio/webm',
        });
        const key = `vn_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
        try {
          await audioStorage.saveVoiceNote(key, blob);
          const url = URL.createObjectURL(blob);
          setRecordedPreviewUrl((prev) => {
            if (prev) URL.revokeObjectURL(prev);
            return url;
          });
          onChange({
            source: 'recorded',
            blobKey: key,
            durationSec: Math.max(1, durationOnStopRef.current),
          });
        } catch {
          setMicError(
            'Could not save the recording locally. Attach the bundled sample voice note instead.',
          );
        }
      };

      mediaRecorderRef.current = recorder;
      recorder.start(250);
      setRecordingState('recording');

      timerRef.current = window.setInterval(() => {
        durationOnStopRef.current += 1;
        setElapsedSec((prev) => {
          const next = prev + 1;
          if (next >= maxSec) {
            stopRecording();
            return maxSec;
          }
          return next;
        });
      }, 1000);
    } catch {
      setMicError(
        'Microphone permission was denied or unavailable. Allow mic access or attach the bundled sample voice note.',
      );
      setRecordingState('idle');
    }
  };

  const handlePlayToggle = () => {
    const src =
      value.source === 'sample'
        ? getBundledSampleVoiceNoteUrl()
        : value.source === 'recorded'
          ? recordedPreviewUrl
          : null;
    if (!src) return;

    if (isPlaying && audioElRef.current) {
      audioElRef.current.pause();
      stopProgressLoop();
      setIsPlaying(false);
      return;
    }

    if (!audioElRef.current || audioElRef.current.src !== src) {
      audioElRef.current?.pause();
      audioElRef.current = new Audio(src);
    }

    const audio = audioElRef.current;
    if (audio.ended || playbackProgress >= 99) {
      audio.currentTime = 0;
      setPlaybackProgress(0);
    }

    const tick = () => {
      if (!audioElRef.current || audioElRef.current.paused) return;
      const dur = audioElRef.current.duration || value.durationSec || 5;
      const pct = Math.min(100, (audioElRef.current.currentTime / Math.max(0.5, dur)) * 100);
      setPlaybackProgress(pct);
      rafRef.current = window.requestAnimationFrame(tick);
    };

    audio.onended = () => {
      stopProgressLoop();
      setIsPlaying(false);
      setPlaybackProgress(0);
    };
    audio.onerror = () => {
      stopProgressLoop();
      setIsPlaying(false);
    };

    audio
      .play()
      .then(() => {
        setIsPlaying(true);
        rafRef.current = window.requestAnimationFrame(tick);
      })
      .catch(() => setIsPlaying(false));
  };

  const handleDelete = async () => {
    stopPlayback();
    if (value.source === 'recorded' && value.blobKey) {
      await audioStorage.deleteVoiceNote(value.blobKey).catch(() => undefined);
    }
    if (recordedPreviewUrl) {
      URL.revokeObjectURL(recordedPreviewUrl);
      setRecordedPreviewUrl(null);
    }
    onChange({ source: 'none' });
  };

  const handleUseSample = () => {
    stopPlayback();
    setMicError(null);
    onChange({
      source: 'sample',
      durationSec: 5,
    });
  };

  const totalDuration = value.durationSec ?? 5;
  const activeSeconds =
    recordingState === 'recording'
      ? elapsedSec
      : Math.round((playbackProgress / 100) * totalDuration);

  return (
    <div className="rounded-[22px] border border-[var(--border-subtle)] bg-[var(--bg-raised)] p-4 sm:p-5 space-y-3.5">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <AudioLines className="w-4 h-4 text-[#E10B5C] dark:text-[#FF2A85]" />
          <h3 className="text-sm sm:text-[15px] font-semibold text-[var(--text-primary)]">
            Add a voice note
          </h3>
          <span className="text-xs text-[var(--text-secondary)]">
            (up to {maxSec}s)
          </span>
        </div>
        <span className="text-xs font-semibold tabular-nums text-[var(--text-secondary)]">
          {formatDuration(recordingState === 'recording' ? elapsedSec : value.source !== 'none' ? activeSeconds : 0)}{' '}
          / {formatDuration(value.source !== 'none' ? totalDuration : maxSec)}
        </span>
      </div>

      {micError && (
        <div
          role="alert"
          className="rounded-xl bg-[#FFEAF2] dark:bg-[#2F1426] border border-[#E10B5C]/25 px-3 py-2 text-xs text-[var(--text-primary)]"
        >
          {micError}
        </div>
      )}

      {recordingState === 'recording' ? (
        <div className="space-y-3">
          <div className="flex items-center gap-3.5">
            <button
              type="button"
              onClick={stopRecording}
              aria-label="Stop recording"
              className="w-12 h-12 rounded-full cta-pink-surface text-white flex items-center justify-center shrink-0 shadow-[0_0_24px_rgba(255,23,108,0.55)] cursor-pointer"
            >
              <Square className="w-4 h-4 fill-current" />
            </button>

            <div className="flex-1 flex items-center gap-[3px] h-9">
              {WAVEFORM_BARS.map((height, idx) => (
                <span
                  key={idx}
                  className="flex-1 rounded-full bg-gradient-to-t from-[#E10B5C] to-[#FF66A8] dark:from-[#FF176C] dark:to-[#C084FC]"
                  style={{ height: `${Math.max(20, (height + ((elapsedSec * 17 + idx * 13) % 35)) % 100)}%` }}
                />
              ))}
            </div>

            <button
              type="button"
              onClick={stopRecording}
              className="min-h-[38px] px-3.5 py-1.5 rounded-xl bg-[var(--bg-card)] border border-[var(--border-subtle)] text-[var(--text-primary)] text-xs font-semibold whitespace-nowrap shrink-0 cursor-pointer"
            >
              Stop
            </button>
          </div>
          <div className="h-1.5 w-full rounded-full bg-[var(--bg-card)] overflow-hidden">
            <div
              className="h-full rounded-full cta-pink-surface transition-[width] duration-300"
              style={{ width: `${Math.min(100, (elapsedSec / maxSec) * 100)}%` }}
            />
          </div>
        </div>
      ) : value.source === 'none' ? (
        <div className="space-y-3">
          <div className="flex items-center gap-3.5">
            <button
              type="button"
              onClick={startRecording}
              aria-label="Record voice note"
              className="w-12 h-12 rounded-full cta-pink-surface text-white flex items-center justify-center shrink-0 shadow-[0_8px_22px_-6px_rgba(255,23,108,0.65)] hover:brightness-105 active:scale-95 transition-all cursor-pointer"
            >
              <Mic className="w-5 h-5" />
            </button>

            <div className="flex-1 flex items-center gap-[3px] h-8 opacity-45">
              {WAVEFORM_BARS.map((height, idx) => (
                <span
                  key={idx}
                  className="flex-1 rounded-full bg-[var(--text-secondary)]/45"
                  style={{ height: `${height}%` }}
                />
              ))}
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={startRecording}
              className="min-h-[40px] px-4 py-2 rounded-xl cta-pink-surface text-white text-xs font-semibold inline-flex items-center gap-1.5 whitespace-nowrap cursor-pointer"
            >
              <Mic className="w-3.5 h-3.5" />
              <span>Record voice note</span>
            </button>
            <button
              type="button"
              onClick={handleUseSample}
              className="min-h-[40px] px-4 py-2 rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-card)] text-[var(--text-primary)] text-xs font-semibold inline-flex items-center gap-1.5 hover:border-[#8439D5]/45 transition-colors whitespace-nowrap cursor-pointer"
            >
              <Volume2 className="w-3.5 h-3.5 text-[#E10B5C] dark:text-[#FF2A85]" />
              <span>Use sample voice note</span>
            </button>
          </div>
        </div>
      ) : (
        <div className="space-y-3">
          <div className="flex items-center gap-3.5">
            <button
              type="button"
              onClick={handlePlayToggle}
              aria-label={isPlaying ? 'Pause voice note' : 'Play voice note'}
              className="w-12 h-12 rounded-full cta-pink-surface text-white flex items-center justify-center shrink-0 shadow-[0_8px_22px_-6px_rgba(255,23,108,0.65)] hover:brightness-105 active:scale-95 transition-all cursor-pointer"
            >
              {isPlaying ? (
                <Pause className="w-4 h-4 fill-current" />
              ) : (
                <Play className="w-4 h-4 fill-current ml-0.5" />
              )}
            </button>

            <div className="flex-1 min-w-0 space-y-2">
              <div
                className="flex items-center gap-[3px] h-8"
                aria-label="Voice note waveform"
                data-testid="voice-note-waveform"
              >
                {WAVEFORM_BARS.map((height, idx) => {
                  const barPct = ((idx + 1) / WAVEFORM_BARS.length) * 100;
                  const active = isPlaying ? playbackProgress >= barPct : idx < 11;
                  return (
                    <span
                      key={idx}
                      className={`flex-1 rounded-full transition-colors ${
                        active
                          ? 'bg-gradient-to-t from-[#E10B5C] to-[#FF66A8] dark:from-[#FF176C] dark:to-[#C084FC]'
                          : 'bg-[var(--text-secondary)]/25'
                      }`}
                      style={{ height: `${height}%` }}
                    />
                  );
                })}
              </div>
              <div className="h-1.5 w-full rounded-full bg-[var(--bg-card)] overflow-hidden">
                <div
                  className="h-full rounded-full cta-pink-surface transition-[width] duration-150"
                  style={{ width: `${isPlaying ? playbackProgress : 38}%` }}
                />
              </div>
            </div>
          </div>

          <div className="flex items-center justify-between gap-2 pt-2 border-t border-[var(--border-subtle)]">
            <span className="text-[11px] font-medium text-[var(--text-secondary)] truncate">
              {value.source === 'sample' ? 'Sample ready' : 'Recorded'}
            </span>
            <div className="flex items-center gap-1.5 shrink-0">
              <button
                type="button"
                onClick={startRecording}
                className="min-h-[34px] px-2.5 py-1 rounded-xl bg-[var(--bg-card)] border border-[var(--border-subtle)] text-[var(--text-primary)] text-xs font-semibold inline-flex items-center gap-1.5 whitespace-nowrap cursor-pointer"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Re-record</span>
              </button>
              <button
                type="button"
                onClick={handleDelete}
                className="min-h-[34px] px-2.5 py-1 rounded-xl text-[#E10B5C] dark:text-[#FF7AA8] text-xs font-semibold inline-flex items-center gap-1 hover:bg-[var(--bg-card)] whitespace-nowrap cursor-pointer"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Delete</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
