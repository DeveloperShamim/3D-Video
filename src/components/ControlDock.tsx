import { useState } from 'react';
import {
  Camera,
  Captions,
  ChevronDown,
  ChevronUp,
  Film,
  Pause,
  Play,
  Repeat,
  RotateCcw,
  Volume2,
  VolumeX,
} from 'lucide-react';
import {
  CAMERA_SHOTS,
  LIGHTING_MOODS,
  MATERIAL_FINISHES,
  SCENE_PRESETS,
  StudioConfig,
} from '../types/studio';
import { SrtCue, formatTimecode } from '../utils/srtParser';

type DockTab = 'storyboard' | 'scenes' | 'camera' | 'style' | 'export';

interface ControlDockProps {
  config: StudioConfig;
  srtCues: SrtCue[];
  fullVoDuration: number;
  isPlaying: boolean;
  currentTime: number;
  isCollapsed: boolean;
  isRecording: boolean;
  recordingProgress: number;
  onToggleCollapse: () => void;
  onTogglePlay: () => void;
  onSeek: (time: number) => void;
  onRestart: () => void;
  onUpdateConfig: (patch: Partial<StudioConfig>) => void;
  onResetCamera: () => void;
  onStartRecording: () => void;
  onCancelRecording: () => void;
  onTakeSnapshot: () => void;
}

export function ControlDock({
  config,
  srtCues,
  fullVoDuration,
  isPlaying,
  currentTime,
  isCollapsed,
  isRecording,
  recordingProgress,
  onToggleCollapse,
  onTogglePlay,
  onSeek,
  onRestart,
  onUpdateConfig,
  onResetCamera,
  onStartRecording,
  onCancelRecording,
  onTakeSnapshot,
}: ControlDockProps) {
  const [activeTab, setActiveTab] = useState<DockTab>('storyboard');

  const visibleCues =
    config.previewMode === '10s'
      ? srtCues.filter((c) => c.start < 10.5)
      : config.previewMode === '1m'
        ? srtCues.filter((c) => c.start < 62.5)
        : srtCues;

  return (
    <div
      className="fixed bottom-5 left-1/2 z-20 w-[min(940px,94vw)] transition-transform duration-300 ease-out"
      style={{
        transform: isCollapsed
          ? 'translate(-50%, calc(100% + 26px))'
          : 'translate(-50%, 0)',
      }}
    >
      {/* Collapse / Expand Handle Tab */}
      <div className="flex justify-center">
        <button
          type="button"
          onClick={onToggleCollapse}
          style={{
            transform: isCollapsed ? 'translateY(-44px)' : 'translateY(0)',
          }}
          className="inline-flex items-center gap-1.5 rounded-t-lg border border-b-0 border-white/12 bg-[#0f1218]/95 px-3.5 py-1.5 text-xs font-medium text-slate-300 hover:text-white transition-all duration-300 cursor-pointer"
          aria-label={isCollapsed ? 'Show Controls' : 'Hide Controls'}
        >
          {isCollapsed ? (
            <>
              <ChevronUp className="h-3.5 w-3.5" />
              <span>Show Controls (H)</span>
            </>
          ) : (
            <>
              <ChevronDown className="h-3.5 w-3.5" />
              <span>Hide Controls (H)</span>
            </>
          )}
        </button>
      </div>

      {/* Main Dock Container — Solid/RGBA surface, zero backdrop-filter over WebGL */}
      <div className="rounded-xl border border-white/12 bg-[#0f1218]/95 shadow-2xl">
        {/* Transport & Timeline Scrubber Row */}
        <div className="flex flex-wrap items-center gap-3 px-4 py-3 border-b border-white/10">
          <div className="flex items-center gap-1.5 shrink-0">
            <button
              type="button"
              onClick={onTogglePlay}
              disabled={isRecording}
              className="inline-flex h-8 w-8 items-center justify-center rounded-lg bg-amber-500 text-slate-950 hover:bg-amber-400 disabled:opacity-40 transition-colors cursor-pointer"
              aria-label={isPlaying ? 'Pause' : 'Play'}
            >
              {isPlaying ? (
                <Pause className="h-4 w-4 fill-current" />
              ) : (
                <Play className="h-4 w-4 fill-current ml-0.5" />
              )}
            </button>

            <button
              type="button"
              onClick={onRestart}
              disabled={isRecording}
              className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-white/10 bg-[#171b24] text-slate-300 hover:text-white hover:bg-[#1f2531] disabled:opacity-40 transition-colors cursor-pointer"
              title="Restart Timeline"
              aria-label="Restart Timeline"
            >
              <RotateCcw className="h-3.5 w-3.5" />
            </button>
          </div>

          {/* Scrubber Bar */}
          <div className="flex flex-1 items-center gap-3 min-w-[180px]">
            <input
              type="range"
              min={0}
              max={config.duration}
              step={0.05}
              value={Math.min(config.duration, currentTime)}
              disabled={isRecording}
              onChange={(e) => onSeek(parseFloat(e.target.value))}
              className="studio-slider flex-1"
              aria-label="Timeline Scrubber"
            />
            <span className="font-mono-tabular text-xs text-slate-300 whitespace-nowrap shrink-0">
              {formatTimecode(currentTime)}{' '}
              <span className="text-slate-500">/</span>{' '}
              {formatTimecode(config.duration)}
            </span>
          </div>

          {/* Preview Scope Toggle (10s vs Full), Subtitles, Loop, VO Audio */}
          <div className="flex items-center gap-1.5 shrink-0">
            <div className="flex items-center rounded-lg bg-[#171b24] p-0.5 border border-white/8">
              <button
                type="button"
                disabled={isRecording}
                onClick={() =>
                  onUpdateConfig({ previewMode: '10s', duration: 10 })
                }
                className={`px-2 py-1 text-[11px] font-medium rounded-md transition-colors cursor-pointer whitespace-nowrap ${
                  config.previewMode === '10s'
                    ? 'bg-amber-500 text-slate-950 font-semibold'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                10s
              </button>
              <button
                type="button"
                disabled={isRecording}
                onClick={() =>
                  onUpdateConfig({ previewMode: '1m', duration: 60 })
                }
                className={`px-2 py-1 text-[11px] font-medium rounded-md transition-colors cursor-pointer whitespace-nowrap ${
                  config.previewMode === '1m'
                    ? 'bg-amber-500 text-slate-950 font-semibold'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                First 1m
              </button>
              <button
                type="button"
                disabled={isRecording}
                onClick={() =>
                  onUpdateConfig({
                    previewMode: 'full',
                    duration: fullVoDuration,
                  })
                }
                className={`px-2 py-1 text-[11px] font-medium rounded-md transition-colors cursor-pointer whitespace-nowrap ${
                  config.previewMode === 'full'
                    ? 'bg-amber-500 text-slate-950 font-semibold'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                Full
              </button>
            </div>

            <button
              type="button"
              onClick={() =>
                onUpdateConfig({ subtitlesEnabled: !config.subtitlesEnabled })
              }
              disabled={isRecording}
              className={`inline-flex h-8 w-8 items-center justify-center rounded-lg border transition-colors cursor-pointer ${
                config.subtitlesEnabled
                  ? 'border-amber-500/40 bg-amber-500/15 text-amber-400'
                  : 'border-white/10 bg-[#171b24] text-slate-400 hover:text-slate-200'
              }`}
              title="Toggle Bengali Subtitles"
              aria-label="Toggle Bengali Subtitles"
            >
              <Captions className="h-3.5 w-3.5" />
            </button>

            <button
              type="button"
              onClick={() => onUpdateConfig({ loop: !config.loop })}
              disabled={isRecording}
              className={`inline-flex h-8 w-8 items-center justify-center rounded-lg border transition-colors cursor-pointer ${
                config.loop
                  ? 'border-amber-500/40 bg-amber-500/15 text-amber-400'
                  : 'border-white/10 bg-[#171b24] text-slate-400 hover:text-slate-200'
              }`}
              title="Toggle Loop"
              aria-label="Toggle Loop"
            >
              <Repeat className="h-3.5 w-3.5" />
            </button>

            <button
              type="button"
              onClick={() => onUpdateConfig({ audioEnabled: !config.audioEnabled })}
              className={`inline-flex h-8 w-8 items-center justify-center rounded-lg border transition-colors cursor-pointer ${
                config.audioEnabled
                  ? 'border-amber-500/40 bg-amber-500/15 text-amber-400'
                  : 'border-white/10 bg-[#171b24] text-slate-400 hover:text-slate-200'
              }`}
              title="Toggle Voiceover Audio"
              aria-label="Toggle Voiceover Audio"
            >
              {config.audioEnabled ? (
                <Volume2 className="h-3.5 w-3.5" />
              ) : (
                <VolumeX className="h-3.5 w-3.5" />
              )}
            </button>
          </div>
        </div>

        {/* Navigation Tabs */}
        <div className="flex items-center justify-between gap-4 px-4 pt-2 border-b border-white/8">
          <div className="flex items-center gap-1 overflow-x-auto">
            {(
              [
                { id: 'storyboard', label: 'SRT & Voiceover' },
                { id: 'scenes', label: '3D Scenes' },
                { id: 'camera', label: 'Camera Shots' },
                { id: 'style', label: 'Materials & Light' },
                { id: 'export', label: 'Video Export' },
              ] as { id: DockTab; label: string }[]
            ).map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id)}
                className={`px-3 py-2 text-xs font-medium border-b-2 transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                  activeTab === tab.id
                    ? 'border-amber-500 text-slate-100'
                    : 'border-transparent text-slate-400 hover:text-slate-200'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          <span className="hidden md:inline text-xs text-slate-500 whitespace-nowrap shrink-0 pb-2">
            Synced with Ashab al-Kahf MP3 &amp; SRT
          </span>
        </div>

        {/* Tab Content Panel */}
        <div className="p-3.5">
          {activeTab === 'storyboard' && (
            <div className="flex items-stretch gap-2.5 overflow-x-auto pb-0.5">
              {visibleCues.map((cue) => {
                const isActive =
                  currentTime >= cue.start && currentTime <= cue.end;
                return (
                  <button
                    key={cue.index}
                    type="button"
                    disabled={isRecording}
                    onClick={() => onSeek(cue.start)}
                    className={`flex min-w-[175px] max-w-[220px] flex-col justify-between rounded-lg border p-2.5 text-left transition-colors cursor-pointer shrink-0 ${
                      isActive
                        ? 'border-amber-500/75 bg-amber-500/12'
                        : 'border-white/8 bg-[#151922] hover:border-white/20'
                    }`}
                  >
                    <span className="font-mono-tabular text-[11px] text-amber-400">
                      {formatTimecode(cue.start)} → {formatTimecode(cue.end)}
                    </span>
                    <span className="font-bengali mt-1 text-xs leading-snug text-slate-100 line-clamp-2">
                      {cue.text}
                    </span>
                  </button>
                );
              })}
            </div>
          )}

          {activeTab === 'scenes' && (
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-2.5">
              {SCENE_PRESETS.map((scene) => {
                const active = config.sceneId === scene.id;
                return (
                  <button
                    key={scene.id}
                    type="button"
                    disabled={isRecording}
                    onClick={() => onUpdateConfig({ sceneId: scene.id })}
                    className={`flex flex-col items-start rounded-lg p-2.5 text-left border transition-colors cursor-pointer disabled:opacity-50 ${
                      active
                        ? 'border-amber-500/70 bg-amber-500/10'
                        : 'border-white/8 bg-[#151922] hover:border-white/20'
                    }`}
                  >
                    <span className="text-xs font-semibold text-slate-100 whitespace-nowrap truncate w-full">
                      {scene.name}
                    </span>
                    <span className="mt-0.5 text-[11px] text-slate-400 line-clamp-1">
                      {scene.subtitle}
                    </span>
                  </button>
                );
              })}
            </div>
          )}

          {activeTab === 'camera' && (
            <div className="flex flex-wrap items-center justify-between gap-2.5">
              <div className="flex flex-wrap items-center gap-2">
                {CAMERA_SHOTS.map((shot) => {
                  const active = config.cameraShot === shot.id;
                  return (
                    <button
                      key={shot.id}
                      type="button"
                      disabled={isRecording}
                      onClick={() => onUpdateConfig({ cameraShot: shot.id })}
                      className={`rounded-lg px-3 py-2 text-left border transition-colors cursor-pointer whitespace-nowrap shrink-0 disabled:opacity-50 ${
                        active
                          ? 'border-amber-500/70 bg-amber-500/12 text-amber-300'
                          : 'border-white/10 bg-[#151922] text-slate-300 hover:border-white/25'
                      }`}
                      title={shot.description}
                    >
                      <span className="text-xs font-medium">{shot.label}</span>
                    </button>
                  );
                })}
              </div>

              <button
                type="button"
                onClick={onResetCamera}
                className="rounded-lg border border-white/10 bg-[#151922] px-3 py-2 text-xs font-medium text-slate-300 hover:text-white hover:border-white/25 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
              >
                Reset Camera
              </button>
            </div>
          )}

          {activeTab === 'style' && (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5 items-center">
              <div>
                <div className="text-[11px] font-medium text-slate-400 mb-1.5">
                  Hero Brass / Metal Finish
                </div>
                <div className="flex items-center gap-2">
                  {MATERIAL_FINISHES.map((fin) => {
                    const active = config.materialFinish === fin.id;
                    return (
                      <button
                        key={fin.id}
                        type="button"
                        onClick={() => onUpdateConfig({ materialFinish: fin.id })}
                        title={fin.label}
                        aria-label={fin.label}
                        className={`h-7 w-7 rounded-md border transition-transform cursor-pointer ${
                          active
                            ? 'border-white scale-110'
                            : 'border-white/20 hover:scale-105'
                        }`}
                        style={{ backgroundColor: fin.swatch }}
                      />
                    );
                  })}
                </div>
              </div>

              <div>
                <div className="text-[11px] font-medium text-slate-400 mb-1.5">
                  Atmosphere Mood
                </div>
                <select
                  value={config.lightingMood}
                  onChange={(e) =>
                    onUpdateConfig({
                      lightingMood: e.target.value as StudioConfig['lightingMood'],
                    })
                  }
                  className="w-full rounded-lg border border-white/12 bg-[#151922] px-2.5 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-amber-500"
                >
                  {LIGHTING_MOODS.map((m) => (
                    <option key={m.id} value={m.id}>
                      {m.label}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <div className="flex items-center justify-between text-[11px] text-slate-400 mb-1.5">
                  <span>Layer Separation</span>
                  <span className="font-mono-tabular text-slate-200">
                    {Math.round(config.explodeAmount * 100)}%
                  </span>
                </div>
                <input
                  type="range"
                  min={0}
                  max={1}
                  step={0.01}
                  value={config.explodeAmount}
                  onChange={(e) =>
                    onUpdateConfig({ explodeAmount: parseFloat(e.target.value) })
                  }
                  className="studio-slider w-full"
                  aria-label="Layer Separation"
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <div className="flex items-center justify-between text-[11px] text-slate-400">
                  <span>Celestial Pace</span>
                  <span className="font-mono-tabular text-slate-200">
                    {config.motionIntensity.toFixed(1)}x
                  </span>
                </div>
                <div className="flex items-center gap-2.5">
                  <input
                    type="range"
                    min={0.3}
                    max={2.0}
                    step={0.1}
                    value={config.motionIntensity}
                    onChange={(e) =>
                      onUpdateConfig({
                        motionIntensity: parseFloat(e.target.value),
                      })
                    }
                    className="studio-slider flex-1"
                    aria-label="Celestial Pace"
                  />
                  <button
                    type="button"
                    onClick={() =>
                      onUpdateConfig({ bloomEnabled: !config.bloomEnabled })
                    }
                    className={`rounded-md px-2 py-1 text-[11px] font-medium border transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                      config.bloomEnabled
                        ? 'border-amber-500/50 bg-amber-500/15 text-amber-300'
                        : 'border-white/10 bg-[#151922] text-slate-400'
                    }`}
                  >
                    Glow
                  </button>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'export' && (
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div className="flex flex-wrap items-center gap-4">
                <div>
                  <div className="text-[11px] font-medium text-slate-400 mb-1">
                    Export Range
                  </div>
                  <div className="flex items-center gap-1 rounded-lg bg-[#151922] p-0.5 border border-white/10">
                    <button
                      type="button"
                      disabled={isRecording}
                      onClick={() =>
                        onUpdateConfig({ previewMode: '10s', duration: 10 })
                      }
                      className={`px-2.5 py-1 text-xs rounded-md transition-colors cursor-pointer ${
                        config.previewMode === '10s'
                          ? 'bg-slate-700 text-white'
                          : 'text-slate-400 hover:text-slate-200'
                      }`}
                    >
                      10s
                    </button>
                    <button
                      type="button"
                      disabled={isRecording}
                      onClick={() =>
                        onUpdateConfig({ previewMode: '1m', duration: 60 })
                      }
                      className={`px-2.5 py-1 text-xs rounded-md transition-colors cursor-pointer ${
                        config.previewMode === '1m'
                          ? 'bg-slate-700 text-white'
                          : 'text-slate-400 hover:text-slate-200'
                      }`}
                    >
                      First 1m
                    </button>
                    <button
                      type="button"
                      disabled={isRecording}
                      onClick={() =>
                        onUpdateConfig({
                          previewMode: 'full',
                          duration: fullVoDuration,
                        })
                      }
                      className={`px-2.5 py-1 text-xs rounded-md transition-colors cursor-pointer ${
                        config.previewMode === 'full'
                          ? 'bg-slate-700 text-white'
                          : 'text-slate-400 hover:text-slate-200'
                      }`}
                    >
                      Full ({Math.round(fullVoDuration)}s)
                    </button>
                  </div>
                </div>

                <div>
                  <div className="text-[11px] font-medium text-slate-400 mb-1">
                    Frame Rate
                  </div>
                  <div className="flex items-center gap-1 rounded-lg bg-[#151922] p-0.5 border border-white/10">
                    {([30, 60] as const).map((fps) => (
                      <button
                        key={fps}
                        type="button"
                        disabled={isRecording}
                        onClick={() => onUpdateConfig({ fps })}
                        className={`px-2.5 py-1 text-xs font-mono-tabular rounded-md transition-colors cursor-pointer ${
                          config.fps === fps
                            ? 'bg-slate-700 text-white'
                            : 'text-slate-400 hover:text-slate-200'
                        }`}
                      >
                        {fps} fps
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-2.5">
                <button
                  type="button"
                  onClick={onTakeSnapshot}
                  disabled={isRecording}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-white/12 bg-[#151922] px-3.5 py-2 text-xs font-medium text-slate-200 hover:bg-[#1c212c] disabled:opacity-40 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
                >
                  <Camera className="h-3.5 w-3.5" />
                  <span>Save PNG</span>
                </button>

                {isRecording ? (
                  <button
                    type="button"
                    onClick={onCancelRecording}
                    className="inline-flex items-center gap-2 rounded-lg bg-red-600 px-4 py-2 text-xs font-semibold text-white hover:bg-red-500 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
                  >
                    <span className="font-mono-tabular">
                      Cancel Export ({Math.round(recordingProgress)}%)
                    </span>
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={onStartRecording}
                    className="inline-flex items-center gap-2 rounded-lg bg-amber-500 px-4 py-2 text-xs font-semibold text-slate-950 hover:bg-amber-400 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
                  >
                    <Film className="h-3.5 w-3.5" />
                    <span>
                      {config.previewMode === '10s'
                        ? 'Render 10s Preview'
                        : config.previewMode === '1m'
                          ? 'Render 1m Video'
                          : 'Render Full Video'}
                    </span>
                  </button>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
