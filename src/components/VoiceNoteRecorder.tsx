import { useEffect, useRef, useState } from 'react';
import { Mic, Pause, Play, RotateCcw, Square, Trash2, Volume2 } from 'lucide-react';
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
  28, 48, 72, 42, 86, 60, 38, 76, 92, 54, 44, 80, 64, 34, 68, 88, 52, 40, 74, 58, 46, 82, 50, 32,
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

  return (
    <div className="rounded-2xl border border-[var(--border-subtle)] bg-[var(--bg-raised)] p-4 space-y-3">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h3 className="text-sm sm:text-base font-semibold text-[var(--text-primary)]">
            Personal voice note
          </h3>
          <p className="text-xs text-[var(--text-secondary)] mt-0.5">
            Plays when they tap Open gift · Up to {maxSec}s
          </p>
        </div>
        {recordingState === 'recording' && (
          <span className="text-xs font-semibold tabular-nums text-[#DF0756] dark:text-[#FF176C]">
            {formatDuration(elapsedSec)} / {formatDuration(maxSec)}
          </span>
        )}
      </div>

      {micError && (
        <div
          role="alert"
          className="rounded-xl bg-[#FFEAF2] dark:bg-[#2F1426] border border-[#DF0756]/25 px-3 py-2 text-xs text-[var(--text-primary)]"
        >
          {micError}
        </div>
      )}

      {recordingState === 'recording' ? (
        <div className="rounded-xl bg-[var(--bg-card)] border border-[#DF0756]/30 dark:border-[#FF176C]/35 p-3 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2.5 min-w-0">
            <span className="w-2.5 h-2.5 rounded-full bg-[#DF0756] dark:bg-[#FF176C] shrink-0" />
            <span className="text-xs font-medium text-[var(--text-primary)] truncate">
              Recording voice note…
            </span>
          </div>
          <button
            type="button"
            onClick={stopRecording}
            className="min-h-[40px] px-4 py-1.5 rounded-xl bg-[#201727] dark:bg-[#FF176C] text-white text-xs font-semibold inline-flex items-center gap-1.5 whitespace-nowrap shrink-0"
          >
            <Square className="w-3.5 h-3.5 fill-current" />
            <span>Stop</span>
          </button>
        </div>
      ) : value.source === 'none' ? (
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={startRecording}
            className="min-h-[44px] px-4 py-2 rounded-xl bg-[#DF0756] hover:bg-[#C00549] dark:bg-[#FF176C] dark:hover:bg-[#E0105D] text-white text-sm font-semibold inline-flex items-center gap-2 transition-colors whitespace-nowrap shrink-0"
          >
            <Mic className="w-4 h-4" />
            <span>Record</span>
          </button>
          <button
            type="button"
            onClick={handleUseSample}
            className="min-h-[44px] px-4 py-2 rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-card)] text-[var(--text-primary)] text-sm font-medium inline-flex items-center gap-2 hover:border-[#8439D5]/45 transition-colors whitespace-nowrap shrink-0"
          >
            <Volume2 className="w-4 h-4 text-[#DF0756] dark:text-[#FF176C]" />
            <span>Use sample voice note</span>
          </button>
        </div>
      ) : (
        <div className="rounded-xl bg-[var(--bg-card)] border border-[var(--border-subtle)] p-3 space-y-2.5">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={handlePlayToggle}
              aria-label={isPlaying ? 'Pause voice note' : 'Play voice note'}
              className="w-10 h-10 rounded-xl bg-[#DF0756] dark:bg-[#FF176C] text-white flex items-center justify-center shrink-0 transition-colors"
            >
              {isPlaying ? (
                <Pause className="w-4 h-4 fill-current" />
              ) : (
                <Play className="w-4 h-4 fill-current ml-0.5" />
              )}
            </button>

            <div className="flex-1 min-w-0 space-y-1">
              <div
                className="flex items-end gap-[3px] h-7"
                aria-label="Voice note waveform"
                data-testid="voice-note-waveform"
              >
                {WAVEFORM_BARS.map((height, idx) => {
                  const barPct = ((idx + 1) / WAVEFORM_BARS.length) * 100;
                  const active = playbackProgress >= barPct;
                  return (
                    <span
                      key={idx}
                      className={`flex-1 rounded-full transition-colors ${
                        active
                          ? 'bg-[#DF0756] dark:bg-[#FF176C]'
                          : 'bg-[var(--text-secondary)]/25'
                      }`}
                      style={{ height: `${height}%` }}
                    />
                  );
                })}
              </div>
              <div className="flex items-center justify-between text-[11px] text-[var(--text-secondary)]">
                <span className="truncate">
                  {value.source === 'sample' ? 'Sample voice note' : 'Recorded voice note'}
                </span>
                <span className="tabular-nums font-medium text-[var(--text-primary)]">
                  {formatDuration(totalDuration)}
                </span>
              </div>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2 pt-1 border-t border-[var(--border-subtle)]">
            <button
              type="button"
              onClick={handlePlayToggle}
              className="min-h-[38px] px-3 py-1.5 rounded-lg bg-[var(--bg-raised)] border border-[var(--border-subtle)] text-[var(--text-primary)] text-xs font-semibold inline-flex items-center gap-1.5"
            >
              {isPlaying ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
              <span>{isPlaying ? 'Pause' : 'Play'}</span>
            </button>
            <button
              type="button"
              onClick={startRecording}
              className="min-h-[38px] px-3 py-1.5 rounded-lg bg-[var(--bg-raised)] border border-[var(--border-subtle)] text-[var(--text-primary)] text-xs font-semibold inline-flex items-center gap-1.5"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Record again</span>
            </button>
            <button
              type="button"
              onClick={handleDelete}
              className="min-h-[38px] px-3 py-1.5 rounded-lg text-[#DF0756] dark:text-[#FF7AA8] text-xs font-semibold inline-flex items-center gap-1.5 hover:bg-[var(--bg-raised)] ml-auto"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>Delete</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
