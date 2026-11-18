import { Camera, Film, Square, Volume2 } from 'lucide-react';
import { SCENE_PRESETS, StudioConfig } from '../types/studio';

interface TopBarProps {
  config: StudioConfig;
  isRecording: boolean;
  recordingProgress: number;
  hasRecordedVideo: boolean;
  autoplayBlocked: boolean;
  onUnlockAudio: () => void;
  onTakeSnapshot: () => void;
  onStartRecording: () => void;
  onCancelRecording: () => void;
  onOpenLastVideo: () => void;
}

export function TopBar({
  config,
  isRecording,
  recordingProgress,
  hasRecordedVideo,
  autoplayBlocked,
  onUnlockAudio,
  onTakeSnapshot,
  onStartRecording,
  onCancelRecording,
  onOpenLastVideo,
}: TopBarProps) {
  const activeScene =
    SCENE_PRESETS.find((s) => s.id === config.sceneId) ?? SCENE_PRESETS[0];

  const exportLabel =
    config.previewMode === '10s'
      ? 'Export 10s Preview'
      : config.previewMode === '1m'
        ? 'Export 1m Video'
        : 'Export Full Video';

  return (
    <header className="pointer-events-none fixed top-0 left-0 right-0 z-20 flex items-center justify-between gap-6 px-5 py-4 sm:px-7">
      {/* Minimal Brand & Quiet Unboxed Metadata */}
      <div className="pointer-events-auto flex items-baseline gap-3.5 rounded-lg bg-[#0f1218]/92 px-3.5 py-2 border border-white/10">
        <h1 className="font-display text-base font-semibold tracking-tight text-slate-100 whitespace-nowrap shrink-0">
          Ashab al-Kahf Studio
        </h1>
        <div className="hidden sm:flex items-center gap-2 text-xs text-slate-400 whitespace-nowrap">
          <span aria-hidden="true">/</span>
          <span className="text-slate-300">{activeScene.name}</span>
          <span aria-hidden="true">·</span>
          <span className="font-mono-tabular">
            {config.previewMode === '10s'
              ? '10s Preview'
              : config.previewMode === '1m'
                ? '1m Story Edit'
                : `${Math.round(config.duration)}s Full`}
          </span>
          <span aria-hidden="true">·</span>
          <span className="font-mono-tabular">{config.fps} fps</span>
        </div>
      </div>

      {/* Primary Studio Actions */}
      <div className="pointer-events-auto flex items-center gap-2.5 shrink-0">
        {autoplayBlocked && config.audioEnabled && !isRecording && (
          <button
            type="button"
            onClick={onUnlockAudio}
            className="inline-flex items-center gap-1.5 rounded-lg bg-amber-500/15 px-3 py-2 text-xs font-medium text-amber-300 border border-amber-500/35 hover:bg-amber-500/25 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
          >
            <Volume2 className="h-3.5 w-3.5" />
            <span>Enable Voiceover</span>
          </button>
        )}

        {hasRecordedVideo && !isRecording && (
          <button
            type="button"
            onClick={onOpenLastVideo}
            className="hidden md:inline-flex items-center gap-2 rounded-lg bg-[#0f1218]/92 px-3.5 py-2 text-xs font-medium text-slate-200 border border-white/12 hover:bg-[#191e28] transition-colors whitespace-nowrap shrink-0 cursor-pointer"
          >
            Preview Clip
          </button>
        )}

        <button
          type="button"
          onClick={onTakeSnapshot}
          disabled={isRecording}
          className="inline-flex items-center gap-1.5 rounded-lg bg-[#0f1218]/92 px-3.5 py-2 text-xs font-medium text-slate-200 border border-white/12 hover:bg-[#191e28] disabled:opacity-40 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
          title="Save PNG Snapshot"
        >
          <Camera className="h-3.5 w-3.5 text-slate-300" />
          <span className="hidden sm:inline">Snapshot</span>
        </button>

        {isRecording ? (
          <button
            type="button"
            onClick={onCancelRecording}
            className="inline-flex items-center gap-2 rounded-lg bg-red-600 px-4 py-2 text-xs font-semibold text-white hover:bg-red-500 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
          >
            <Square className="h-3.5 w-3.5 fill-current" />
            <span className="font-mono-tabular">
              Stop ({Math.round(recordingProgress)}%)
            </span>
          </button>
        ) : (
          <button
            type="button"
            onClick={onStartRecording}
            className="inline-flex items-center gap-2 rounded-lg bg-amber-500 px-4 py-2 text-xs font-semibold text-slate-950 hover:bg-amber-400 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
          >
            <Film className="h-3.5 w-3.5" />
            <span>{exportLabel}</span>
          </button>
        )}
      </div>
    </header>
  );
}
