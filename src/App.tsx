import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ViewportCanvas, ViewportHandle } from './components/ViewportCanvas';
import { TopBar } from './components/TopBar';
import { ControlDock } from './components/ControlDock';
import { SubtitleOverlay } from './components/SubtitleOverlay';
import { VideoPreviewModal } from './components/VideoPreviewModal';
import {
  DEFAULT_SRT_URL,
  DEFAULT_VO_URL,
  RecordedVideo,
  StudioConfig,
} from './types/studio';
import { SrtCue, getActiveCue, parseSrt } from './utils/srtParser';

const INITIAL_CONFIG: StudioConfig = {
  sceneId: 'kahf-sanctuary',
  cameraShot: 'kahf-story',
  lightingMood: 'obsidian-noir',
  materialFinish: 'brushed-gold',
  previewMode: 'full',
  duration: 527,
  speed: 1,
  motionIntensity: 1.0,
  explodeAmount: 0,
  bloomEnabled: true,
  subtitlesEnabled: true,
  loop: true,
  audioEnabled: true,
  fps: 60,
  exportResolution: '1080p',
  exportMode: 'frame',
};

export default function App() {
  const viewportRef = useRef<ViewportHandle | null>(null);
  const [config, setConfig] = useState<StudioConfig>(INITIAL_CONFIG);
  const [srtCues, setSrtCues] = useState<SrtCue[]>([]);
  const [fullVoDuration, setFullVoDuration] = useState<number>(527);
  const [autoplayBlocked, setAutoplayBlocked] = useState<boolean>(false);

  const [isPlaying, setIsPlaying] = useState(true);
  const [currentTime, setCurrentTime] = useState(0);
  const [isDockCollapsed, setIsDockCollapsed] = useState(false);

  const [isRecording, setIsRecording] = useState(false);
  const [recordingProgress, setRecordingProgress] = useState(0);
  const [recordingStatus, setRecordingStatus] = useState<string | null>(null);
  const [lastVideo, setLastVideo] = useState<RecordedVideo | null>(null);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Load uploaded Ashab al-Kahf Bengali SRT file
  useEffect(() => {
    let active = true;
    fetch(DEFAULT_SRT_URL)
      .then((res) => {
        if (!res.ok) throw new Error('Unable to load SRT subtitles.');
        return res.text();
      })
      .then((text) => {
        if (!active) return;
        const parsed = parseSrt(text);
        setSrtCues(parsed);
        if (parsed.length > 0) {
          const lastEnd = parsed[parsed.length - 1].end;
          const resolved = Math.max(527, Math.ceil(lastEnd));
          setFullVoDuration(resolved);
          setConfig((prev) =>
            prev.previewMode === 'full' ? { ...prev, duration: resolved } : prev,
          );
        }
      })
      .catch((err) => {
        if (active) {
          setErrorMsg(err instanceof Error ? err.message : 'Failed to parse SRT.');
        }
      });
    return () => {
      active = false;
    };
  }, []);

  const activeCue = useMemo(
    () => getActiveCue(srtCues, currentTime),
    [srtCues, currentTime],
  );

  const updateConfig = useCallback((patch: Partial<StudioConfig>) => {
    setConfig((prev) => {
      const next = { ...prev, ...patch };
      if (patch.duration !== undefined) {
        setCurrentTime((t) => Math.min(t, patch.duration!));
      }
      return next;
    });
  }, []);

  const handleTogglePlay = useCallback(() => {
    setIsPlaying((prev) => !prev);
  }, []);

  const handleSeek = useCallback((time: number) => {
    setCurrentTime(time);
    viewportRef.current?.seekAudio(time);
  }, []);

  const handleRestart = useCallback(() => {
    setCurrentTime(0);
    viewportRef.current?.seekAudio(0);
    setIsPlaying(true);
  }, []);

  const handleUnlockAudio = useCallback(() => {
    setAutoplayBlocked(false);
    viewportRef.current?.seekAudio(currentTime);
    setIsPlaying(true);
  }, [currentTime]);

  const handleCameraManualOverride = useCallback(() => {
    setConfig((prev) =>
      prev.cameraShot === 'free-orbit'
        ? prev
        : { ...prev, cameraShot: 'free-orbit' },
    );
  }, []);

  const handleRecordingStateChange = useCallback(
    (recording: boolean, progress: number, status?: string) => {
      setIsRecording(recording);
      setRecordingProgress(progress);
      setRecordingStatus(recording ? (status ?? null) : null);
    },
    [],
  );

  const handleVideoReady = useCallback((video: RecordedVideo) => {
    setLastVideo((prev) => {
      if (prev) URL.revokeObjectURL(prev.url);
      return video;
    });
    setPreviewOpen(true);
  }, []);

  const handleVoDurationLoaded = useCallback((dur: number) => {
    if (Number.isFinite(dur) && dur > 10) {
      const resolved = Math.ceil(dur);
      setFullVoDuration(resolved);
      setConfig((prev) =>
        prev.previewMode === 'full' ? { ...prev, duration: resolved } : prev,
      );
    }
  }, []);

  const handleError = useCallback((msg: string) => {
    setErrorMsg(msg);
  }, []);

  // Keyboard shortcuts: H = Cinema/Zen toggle, Space = Play/Pause
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      if (
        target &&
        (target.tagName === 'INPUT' ||
          target.tagName === 'SELECT' ||
          target.tagName === 'TEXTAREA')
      ) {
        return;
      }
      if (e.key === 'h' || e.key === 'H') {
        setIsDockCollapsed((c) => !c);
      } else if (e.code === 'Space' && !isRecording) {
        e.preventDefault();
        setIsPlaying((p) => !p);
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [isRecording]);

  const lastVideoRef = useRef<RecordedVideo | null>(null);
  lastVideoRef.current = lastVideo;

  useEffect(() => {
    return () => {
      if (lastVideoRef.current) {
        URL.revokeObjectURL(lastVideoRef.current.url);
      }
    };
  }, []);

  return (
    <main className="relative h-screen w-screen overflow-hidden bg-[#070a12]">
      {/* Full-Viewport Unobstructed Three.js WebGL Stage */}
      <ViewportCanvas
        ref={viewportRef}
        config={config}
        voUrl={DEFAULT_VO_URL}
        srtCues={srtCues}
        isPlaying={isPlaying}
        currentTime={currentTime}
        onTimeUpdate={setCurrentTime}
        onPlayingChange={setIsPlaying}
        onCameraManualOverride={handleCameraManualOverride}
        onRecordingStateChange={handleRecordingStateChange}
        onVideoReady={handleVideoReady}
        onVoDurationLoaded={handleVoDurationLoaded}
        onAutoplayBlocked={setAutoplayBlocked}
        onError={handleError}
      />

      {/* Minimal Top HUD */}
      <TopBar
        config={config}
        isRecording={isRecording}
        recordingProgress={recordingProgress}
        hasRecordedVideo={Boolean(lastVideo)}
        autoplayBlocked={autoplayBlocked}
        onUnlockAudio={handleUnlockAudio}
        onTakeSnapshot={() => viewportRef.current?.takeSnapshot()}
        onStartRecording={() => {
          setErrorMsg(null);
          setAutoplayBlocked(false);
          viewportRef.current?.startRecording();
        }}
        onCancelRecording={() => viewportRef.current?.cancelRecording()}
        onOpenLastVideo={() => setPreviewOpen(true)}
      />

      {/* Recording Progress Bar Banner */}
      {isRecording && (
        <div className="pointer-events-none fixed top-16 left-1/2 -translate-x-1/2 z-20 w-[min(520px,92vw)] rounded-lg border border-amber-500/30 bg-[#0f1218]/95 px-4 py-2.5">
          <div className="flex items-center justify-between text-xs text-slate-200 mb-1.5">
            <span>
              Rendering{' '}
              {config.previewMode === '10s'
                ? '10s Preview'
                : config.previewMode === '1m'
                  ? '1m Edit'
                  : 'Full Video'}
            </span>
            <span className="font-mono-tabular text-amber-400">
              {Math.round(recordingProgress)}%
            </span>
          </div>
          <div className="h-1.5 w-full rounded-full bg-white/10 overflow-hidden">
            <div
              className="h-full bg-amber-500 transition-all duration-100"
              style={{ width: `${Math.min(100, recordingProgress)}%` }}
            />
          </div>
          {recordingStatus && (
            <div className="mt-1.5 text-[11px] text-slate-400 font-mono-tabular truncate">
              {recordingStatus}
            </div>
          )}
        </div>
      )}

      {/* Error Banner */}
      {errorMsg && (
        <div className="fixed top-20 left-1/2 -translate-x-1/2 z-30 flex items-center gap-3 rounded-lg border border-red-500/40 bg-[#1a1114]/95 px-4 py-2.5 text-xs text-red-200">
          <span>{errorMsg}</span>
          <button
            type="button"
            onClick={() => setErrorMsg(null)}
            className="text-red-300 hover:text-white font-medium cursor-pointer"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Bengali SRT Subtitle Layer */}
      <SubtitleOverlay
        cue={activeCue}
        enabled={config.subtitlesEnabled}
        isDockCollapsed={isDockCollapsed}
      />

      {/* Collapsible Bottom Control Dock */}
      <ControlDock
        config={config}
        srtCues={srtCues}
        fullVoDuration={fullVoDuration}
        isPlaying={isPlaying}
        currentTime={currentTime}
        isCollapsed={isDockCollapsed}
        isRecording={isRecording}
        recordingProgress={recordingProgress}
        onToggleCollapse={() => setIsDockCollapsed((c) => !c)}
        onTogglePlay={handleTogglePlay}
        onSeek={handleSeek}
        onRestart={handleRestart}
        onUpdateConfig={updateConfig}
        onResetCamera={() => viewportRef.current?.resetCamera()}
        onStartRecording={() => {
          setErrorMsg(null);
          setAutoplayBlocked(false);
          viewportRef.current?.startRecording();
        }}
        onCancelRecording={() => viewportRef.current?.cancelRecording()}
        onTakeSnapshot={() => viewportRef.current?.takeSnapshot()}
      />

      {/* Video Player & Download Modal */}
      {previewOpen && (
        <VideoPreviewModal
          video={lastVideo}
          onClose={() => setPreviewOpen(false)}
        />
      )}
    </main>
  );
}
