/**
 * Frame-by-frame offline video renderer.
 *
 * Instead of recording the canvas while the timeline plays in real time (which drops
 * frames and lowers quality whenever the GPU or encoder falls behind), this steps the
 * timeline exactly 1/fps per frame, renders each frame fully, and hands it to the
 * browser's WebCodecs VideoEncoder (GPU H.264 when available). The voiceover is decoded
 * and encoded separately, and both are muxed into a standard MP4.
 *
 * Slow frames simply make the render take longer — they never reduce output quality.
 */
import { ArrayBufferTarget, FileSystemWritableFileStreamTarget, Muxer } from 'mp4-muxer';
import { RecordedVideo } from '../types/studio';
import { drawCompositeFrame } from './videoRecorder';

export interface OfflineRenderProgress {
  frame: number;
  totalFrames: number;
  /** Frames rendered per second of wall-clock time. */
  renderFps: number;
  etaSeconds: number;
  encoderLabel: string;
}

export interface OfflineRenderParams {
  webglCanvas: HTMLCanvasElement;
  width: number;
  height: number;
  fps: number;
  duration: number;
  bitrate: number;
  sceneName: string;
  audioUrl: string | null;
  /** Where to stream the MP4. When null the file is built in memory (fine for short clips). */
  fileHandle: FileSystemFileHandle | null;
  /** Advance the scene to time t (seconds) and render it into webglCanvas. */
  renderFrameAt: (t: number, dt: number) => void;
  getSubtitle: (t: number) => string | null;
  onProgress: (p: OfflineRenderProgress) => void;
  isCancelled: () => boolean;
}

export class RenderCancelledError extends Error {
  constructor() {
    super('Recording cancelled');
  }
}

export function isFrameRenderSupported(): boolean {
  return typeof VideoEncoder !== 'undefined' && typeof VideoFrame !== 'undefined';
}

// Yield to the event loop without setTimeout clamping/throttling (keeps UI responsive).
const yieldChannel = typeof MessageChannel !== 'undefined' ? new MessageChannel() : null;
function yieldToBrowser(): Promise<void> {
  if (!yieldChannel) return new Promise((r) => setTimeout(r, 0));
  return new Promise((resolve) => {
    yieldChannel.port1.onmessage = () => resolve();
    yieldChannel.port2.postMessage(null);
  });
}

type VideoMuxCodec = 'avc' | 'vp9';

async function pickVideoConfig(
  width: number,
  height: number,
  fps: number,
  bitrate: number,
): Promise<{ config: VideoEncoderConfig; muxCodec: VideoMuxCodec; label: string }> {
  const pixels = width * height;
  // H.264 High profile; level must cover resolution × frame rate.
  const avcCodecs =
    pixels > 2560 * 1440
      ? ['avc1.640034', 'avc1.640033']
      : pixels > 1920 * 1080
        ? ['avc1.640033', 'avc1.640034']
        : ['avc1.64002A', 'avc1.640033', 'avc1.640034'];

  const candidates: { codec: string; mux: VideoMuxCodec; name: string }[] = [
    ...avcCodecs.map((codec) => ({ codec, mux: 'avc' as const, name: 'H.264' })),
    { codec: 'vp09.00.51.08', mux: 'vp9', name: 'VP9' },
  ];

  for (const accel of ['prefer-hardware', 'no-preference'] as const) {
    for (const c of candidates) {
      const config: VideoEncoderConfig = {
        codec: c.codec,
        width,
        height,
        bitrate,
        framerate: fps,
        bitrateMode: 'variable',
        latencyMode: 'quality',
        hardwareAcceleration: accel,
        ...(c.mux === 'avc' ? { avc: { format: 'avc' as const } } : {}),
      };
      try {
        const support = await VideoEncoder.isConfigSupported(config);
        if (support.supported) {
          return {
            config,
            muxCodec: c.mux,
            label: `${c.name} · ${accel === 'prefer-hardware' ? 'GPU encoder' : 'CPU encoder'}`,
          };
        }
      } catch {
        // try next candidate
      }
    }
  }
  throw new Error(
    `This browser cannot encode ${width}×${height} video. Try a lower export resolution.`,
  );
}

async function decodeVoiceover(url: string): Promise<AudioBuffer> {
  const res = await fetch(url);
  if (!res.ok) throw new Error('Unable to load the voiceover audio for export.');
  const data = await res.arrayBuffer();
  // Decoding through a 48 kHz context resamples to the rate both AAC and Opus support.
  const ctx = new OfflineAudioContext(2, 48000, 48000);
  return ctx.decodeAudioData(data);
}

async function pickAudioConfig(
  sampleRate: number,
  numberOfChannels: number,
): Promise<{ config: AudioEncoderConfig; muxCodec: 'aac' | 'opus' } | null> {
  if (typeof AudioEncoder === 'undefined') return null;
  const candidates: { codec: string; mux: 'aac' | 'opus' }[] = [
    { codec: 'mp4a.40.2', mux: 'aac' },
    { codec: 'opus', mux: 'opus' },
  ];
  for (const c of candidates) {
    const config: AudioEncoderConfig = {
      codec: c.codec,
      sampleRate,
      numberOfChannels,
      bitrate: 192_000,
    };
    try {
      const support = await AudioEncoder.isConfigSupported(config);
      if (support.supported) return { config, muxCodec: c.mux };
    } catch {
      // try next
    }
  }
  return null;
}

export async function renderVideoOffline(params: OfflineRenderParams): Promise<RecordedVideo> {
  const {
    webglCanvas,
    width,
    height,
    fps,
    duration,
    bitrate,
    sceneName,
    audioUrl,
    fileHandle,
    renderFrameAt,
    getSubtitle,
    onProgress,
    isCancelled,
  } = params;

  if (!isFrameRenderSupported()) {
    throw new Error(
      'Frame-by-frame export needs WebCodecs (Chrome or Edge). Switch Export Mode to Live.',
    );
  }

  const video = await pickVideoConfig(width, height, fps, bitrate);

  // ---- Audio (voiceover) ----
  let audioBuffer: AudioBuffer | null = null;
  let audio: Awaited<ReturnType<typeof pickAudioConfig>> = null;
  if (audioUrl) {
    audioBuffer = await decodeVoiceover(audioUrl);
    audio = await pickAudioConfig(audioBuffer.sampleRate, Math.min(2, audioBuffer.numberOfChannels));
    if (!audio) audioBuffer = null;
  }

  // Make sure the Bengali subtitle font is ready before the first frame is drawn
  try {
    await document.fonts.load(`600 ${Math.round(height * 0.038)}px "Noto Sans Bengali"`, 'অআক');
  } catch {
    // fall back to whatever font is available
  }

  // ---- Output target ----
  let writable: FileSystemWritableFileStream | null = null;
  let target: ArrayBufferTarget | FileSystemWritableFileStreamTarget;
  if (fileHandle) {
    writable = await fileHandle.createWritable();
    target = new FileSystemWritableFileStreamTarget(writable);
  } else {
    target = new ArrayBufferTarget();
  }

  const muxer = new Muxer({
    target,
    video: { codec: video.muxCodec, width, height, frameRate: fps },
    ...(audio && audioBuffer
      ? {
          audio: {
            codec: audio.muxCodec,
            numberOfChannels: audio.config.numberOfChannels,
            sampleRate: audio.config.sampleRate,
          },
        }
      : {}),
    fastStart: writable ? false : 'in-memory',
    firstTimestampBehavior: 'offset',
  });

  let encoderError: Error | null = null;
  const videoEncoder = new VideoEncoder({
    output: (chunk, meta) => muxer.addVideoChunk(chunk, meta),
    error: (e) => {
      encoderError = e instanceof Error ? e : new Error(String(e));
    },
  });
  videoEncoder.configure(video.config);

  let audioEncoder: AudioEncoder | null = null;
  if (audio && audioBuffer) {
    audioEncoder = new AudioEncoder({
      output: (chunk, meta) => muxer.addAudioChunk(chunk, meta),
      error: (e) => {
        encoderError = e instanceof Error ? e : new Error(String(e));
      },
    });
    audioEncoder.configure(audio.config);
  }

  // Interleave audio with video so the muxer writes balanced chunks
  const sampleRate = audioBuffer?.sampleRate ?? 48000;
  const audioChannels = audio?.config.numberOfChannels ?? 0;
  const totalAudioFrames = audioBuffer
    ? Math.min(audioBuffer.length, Math.round(duration * sampleRate))
    : 0;
  let audioCursor = 0;
  const encodeAudioUntil = (seconds: number) => {
    if (!audioEncoder || !audioBuffer) return;
    const until = Math.min(totalAudioFrames, Math.round(seconds * sampleRate));
    while (audioCursor < until) {
      const n = Math.min(sampleRate, until - audioCursor);
      const planar = new Float32Array(n * audioChannels);
      for (let ch = 0; ch < audioChannels; ch++) {
        planar.set(audioBuffer.getChannelData(ch).subarray(audioCursor, audioCursor + n), ch * n);
      }
      const data = new AudioData({
        format: 'f32-planar',
        sampleRate,
        numberOfFrames: n,
        numberOfChannels: audioChannels,
        timestamp: Math.round((audioCursor / sampleRate) * 1e6),
        data: planar,
      });
      audioEncoder.encode(data);
      data.close();
      audioCursor += n;
    }
  };

  const compCanvas = document.createElement('canvas');
  compCanvas.width = width;
  compCanvas.height = height;
  const ctx2d = compCanvas.getContext('2d', { alpha: false });
  if (!ctx2d) throw new Error('Unable to create the export compositing canvas.');

  const totalFrames = Math.max(1, Math.round(duration * fps));
  const frameDurationUs = 1e6 / fps;
  const keyFrameInterval = fps * 2;
  const startWall = performance.now();
  let lastProgress = 0;

  const cleanup = async () => {
    try {
      if (videoEncoder.state !== 'closed') videoEncoder.close();
    } catch {
      /* ignore */
    }
    try {
      if (audioEncoder && audioEncoder.state !== 'closed') audioEncoder.close();
    } catch {
      /* ignore */
    }
    if (writable) {
      try {
        await writable.abort();
      } catch {
        /* ignore */
      }
    }
  };

  try {
    // Settle damped camera moves at t=0 so the first frame matches the timeline exactly
    renderFrameAt(0, 2);

    for (let i = 0; i < totalFrames; i++) {
      if (isCancelled()) throw new RenderCancelledError();
      if (encoderError) throw encoderError;

      const t = i / fps;
      renderFrameAt(t, 1 / fps);
      drawCompositeFrame(ctx2d, width, height, webglCanvas, getSubtitle(t));

      const frame = new VideoFrame(compCanvas, {
        timestamp: Math.round(i * frameDurationUs),
        duration: Math.round(frameDurationUs),
      });
      videoEncoder.encode(frame, { keyFrame: i % keyFrameInterval === 0 });
      frame.close();

      encodeAudioUntil(t + 1);

      // Back-pressure: don't let the encoder queue grow unbounded (memory at 4K)
      while (videoEncoder.encodeQueueSize > 4) {
        if (encoderError) throw encoderError;
        await new Promise((r) => setTimeout(r, 2));
      }

      const now = performance.now();
      if (now - lastProgress > 250 || i === totalFrames - 1) {
        lastProgress = now;
        const elapsed = (now - startWall) / 1000;
        const renderFps = (i + 1) / Math.max(elapsed, 0.001);
        onProgress({
          frame: i + 1,
          totalFrames,
          renderFps,
          etaSeconds: (totalFrames - i - 1) / Math.max(renderFps, 0.001),
          encoderLabel: video.label,
        });
      }
      await yieldToBrowser();
    }

    await videoEncoder.flush();
    encodeAudioUntil(Number.POSITIVE_INFINITY);
    if (audioEncoder) await audioEncoder.flush();
    if (encoderError) throw encoderError;

    muxer.finalize();
    videoEncoder.close();
    audioEncoder?.close();
  } catch (err) {
    await cleanup();
    throw err;
  }

  let blob: Blob;
  let savedFileName: string | undefined;
  if (writable && fileHandle) {
    await writable.close();
    blob = await fileHandle.getFile();
    savedFileName = fileHandle.name;
  } else {
    blob = new Blob([(target as ArrayBufferTarget).buffer], { type: 'video/mp4' });
  }

  return {
    url: URL.createObjectURL(blob),
    blob,
    mimeType: 'video/mp4',
    extension: 'mp4',
    duration,
    sizeBytes: blob.size,
    sceneName,
    createdAt: Date.now(),
    width,
    height,
    savedFileName,
  };
}
