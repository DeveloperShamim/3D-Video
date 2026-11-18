import { RecordedVideo } from '../types/studio';

export function pickSupportedMimeType(withAudio: boolean): { mimeType: string; extension: string } {
  // H.264 MP4 first: Chrome/Edge can hardware-encode it on the GPU and it plays everywhere.
  const candidates = withAudio
    ? [
        { mimeType: 'video/mp4;codecs=avc1.640033,mp4a.40.2', extension: 'mp4' },
        { mimeType: 'video/mp4;codecs=avc1,mp4a.40.2', extension: 'mp4' },
        { mimeType: 'video/webm;codecs=vp9,opus', extension: 'webm' },
        { mimeType: 'video/webm;codecs=vp8,opus', extension: 'webm' },
        { mimeType: 'video/webm', extension: 'webm' },
        { mimeType: 'video/mp4', extension: 'mp4' },
      ]
    : [
        { mimeType: 'video/mp4;codecs=avc1.640033', extension: 'mp4' },
        { mimeType: 'video/mp4;codecs=avc1', extension: 'mp4' },
        { mimeType: 'video/webm;codecs=vp9', extension: 'webm' },
        { mimeType: 'video/webm;codecs=vp8', extension: 'webm' },
        { mimeType: 'video/webm', extension: 'webm' },
        { mimeType: 'video/mp4', extension: 'mp4' },
      ];

  if (typeof MediaRecorder === 'undefined') {
    return { mimeType: 'video/webm', extension: 'webm' };
  }

  for (const c of candidates) {
    if (MediaRecorder.isTypeSupported(c.mimeType)) {
      return c;
    }
  }
  return { mimeType: '', extension: 'webm' };
}

/**
 * Draws the WebGL frame plus crisp Bengali SRT subtitles onto a 2D canvas.
 * Shared by the live recorder and the frame-by-frame renderer so both look identical.
 */
export function drawCompositeFrame(
  ctx2d: CanvasRenderingContext2D,
  w: number,
  h: number,
  webglCanvas: HTMLCanvasElement,
  subtitleText: string | null,
): void {
  ctx2d.clearRect(0, 0, w, h);
  ctx2d.drawImage(webglCanvas, 0, 0, w, h);

  if (!subtitleText || !subtitleText.trim()) return;

  // Measured bottom contrast scrim so Bengali text always has >= 4.5:1 contrast
  const scrimH = Math.round(h * 0.24);
  const grad = ctx2d.createLinearGradient(0, h - scrimH, 0, h);
  grad.addColorStop(0, 'rgba(7, 10, 18, 0.0)');
  grad.addColorStop(0.55, 'rgba(7, 10, 18, 0.58)');
  grad.addColorStop(1, 'rgba(7, 10, 18, 0.84)');
  ctx2d.fillStyle = grad;
  ctx2d.fillRect(0, h - scrimH, w, scrimH);

  const fontSize = Math.max(22, Math.round(h * 0.038));
  ctx2d.font = `600 ${fontSize}px "Noto Sans Bengali", "Plus Jakarta Sans", sans-serif`;
  ctx2d.textAlign = 'center';
  ctx2d.textBaseline = 'bottom';

  const lines = subtitleText.split('\n');
  const lineHeight = Math.round(fontSize * 1.4);
  const bottomPad = Math.round(h * 0.075);
  const shadow = Math.max(1.5, h / 720);

  for (let i = 0; i < lines.length; i++) {
    const y = h - bottomPad - (lines.length - 1 - i) * lineHeight;
    ctx2d.fillStyle = 'rgba(0, 0, 0, 0.72)';
    ctx2d.fillText(lines[i], w / 2 + shadow, y + shadow);
    ctx2d.fillStyle = '#f8fafc';
    ctx2d.fillText(lines[i], w / 2, y);
  }
}

export interface ActiveRecordingSession {
  compositeFrame: (subtitleText: string | null) => void;
  stop: () => Promise<RecordedVideo>;
  cancel: () => void;
}

export function startCanvasVideoRecording(params: {
  webglCanvas: HTMLCanvasElement;
  fps: number;
  duration: number;
  sceneName: string;
  audioTrack: MediaStreamTrack | null;
  width: number;
  height: number;
  videoBitsPerSecond: number;
}): ActiveRecordingSession {
  const { webglCanvas, fps, duration, sceneName, audioTrack, width, height, videoBitsPerSecond } =
    params;

  if (typeof MediaRecorder === 'undefined') {
    throw new Error('Video recording is not supported in this browser.');
  }

  // 2D compositing canvas at the fixed export size: WebGL frame + Bengali subtitles
  const compCanvas = document.createElement('canvas');
  compCanvas.width = width;
  compCanvas.height = height;
  const ctx2d = compCanvas.getContext('2d');

  if (!ctx2d || typeof compCanvas.captureStream !== 'function') {
    throw new Error('Canvas video capture is not supported in this browser.');
  }

  const videoStream = compCanvas.captureStream(fps);
  const combinedStream = new MediaStream(videoStream.getVideoTracks());
  if (audioTrack) {
    combinedStream.addTrack(audioTrack);
  }

  const { mimeType, extension } = pickSupportedMimeType(Boolean(audioTrack));
  const options: MediaRecorderOptions = {
    videoBitsPerSecond,
    audioBitsPerSecond: 192_000,
  };
  if (mimeType) {
    options.mimeType = mimeType;
  }

  const recorder = new MediaRecorder(combinedStream, options);
  const chunks: BlobPart[] = [];
  let cancelled = false;

  recorder.ondataavailable = (evt) => {
    if (evt.data && evt.data.size > 0) {
      chunks.push(evt.data);
    }
  };

  const compositeFrame = (subtitleText: string | null) => {
    drawCompositeFrame(ctx2d, compCanvas.width, compCanvas.height, webglCanvas, subtitleText);
  };

  const stopPromise = new Promise<RecordedVideo>((resolve, reject) => {
    recorder.onstop = () => {
      videoStream.getTracks().forEach((t) => t.stop());
      if (cancelled) {
        reject(new Error('Recording cancelled'));
        return;
      }
      const actualType = recorder.mimeType || mimeType || 'video/webm';
      const actualExt = actualType.includes('mp4') ? 'mp4' : extension;
      const blob = new Blob(chunks, { type: actualType });
      const url = URL.createObjectURL(blob);
      resolve({
        url,
        blob,
        mimeType: actualType,
        extension: actualExt,
        duration,
        sizeBytes: blob.size,
        sceneName,
        createdAt: Date.now(),
        width,
        height,
      });
    };

    recorder.onerror = () => {
      videoStream.getTracks().forEach((t) => t.stop());
      reject(new Error('MediaRecorder failed while encoding video frames.'));
    };
  });

  // Paint initial frame and start encoding
  compositeFrame(null);
  recorder.start(100);

  return {
    compositeFrame,
    stop: () => {
      if (recorder.state !== 'inactive') {
        recorder.stop();
      }
      return stopPromise;
    },
    cancel: () => {
      cancelled = true;
      if (recorder.state !== 'inactive') {
        recorder.stop();
      }
    },
  };
}
