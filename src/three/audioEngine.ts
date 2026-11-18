/**
 * Voiceover Audio Engine — plays strictly the user's Voiceover MP3 narration
 * synchronized to the 3D timeline, and exposes a MediaStreamTrack so exported
 * videos contain the exact narration audio without unsolicited background music.
 */
export class VoiceoverAudioEngine {
  private audioEl: HTMLAudioElement | null = null;
  private ctx: AudioContext | null = null;
  private sourceNode: MediaElementAudioSourceNode | null = null;
  private gainNode: GainNode | null = null;
  private streamDest: MediaStreamAudioDestinationNode | null = null;
  private currentSrc = '';
  private onDurationLoaded?: (duration: number) => void;
  private onAutoplayBlocked?: (blocked: boolean) => void;

  constructor(callbacks?: {
    onDurationLoaded?: (duration: number) => void;
    onAutoplayBlocked?: (blocked: boolean) => void;
  }) {
    this.onDurationLoaded = callbacks?.onDurationLoaded;
    this.onAutoplayBlocked = callbacks?.onAutoplayBlocked;
  }

  public loadSource(src: string): void {
    if (this.currentSrc === src && this.audioEl) return;
    this.currentSrc = src;

    if (!this.audioEl) {
      const audio = new Audio();
      audio.crossOrigin = 'anonymous';
      audio.preload = 'auto';
      audio.addEventListener('loadedmetadata', () => {
        if (Number.isFinite(audio.duration) && audio.duration > 0) {
          this.onDurationLoaded?.(audio.duration);
        }
      });
      this.audioEl = audio;
    }

    this.audioEl.src = src;
    this.audioEl.load();
  }

  private ensureWebAudioGraph(): void {
    if (!this.audioEl || this.ctx) return;
    const AudioCtx =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext: typeof AudioContext })
        .webkitAudioContext;
    if (!AudioCtx) return;

    this.ctx = new AudioCtx();
    this.sourceNode = this.ctx.createMediaElementSource(this.audioEl);
    this.gainNode = this.ctx.createGain();
    this.gainNode.gain.value = 1.0;
    this.streamDest = this.ctx.createMediaStreamDestination();

    this.sourceNode.connect(this.gainNode);
    this.gainNode.connect(this.ctx.destination);
    this.gainNode.connect(this.streamDest);
  }

  public syncPlayback(params: {
    playing: boolean;
    enabled: boolean;
    timelineTime: number;
    speed: number;
  }): void {
    if (!this.audioEl) return;
    const { playing, enabled, timelineTime, speed } = params;

    if (this.audioEl.playbackRate !== speed) {
      this.audioEl.playbackRate = speed;
    }

    if (enabled && playing) {
      this.ensureWebAudioGraph();
      if (this.ctx && this.ctx.state === 'suspended') {
        void this.ctx.resume();
      }
      if (this.gainNode) {
        this.gainNode.gain.value = 1.0;
      }

      if (Math.abs(this.audioEl.currentTime - timelineTime) > 0.22) {
        this.audioEl.currentTime = Math.max(0, timelineTime);
      }

      if (this.audioEl.paused) {
        this.audioEl
          .play()
          .then(() => {
            this.onAutoplayBlocked?.(false);
          })
          .catch(() => {
            this.onAutoplayBlocked?.(true);
          });
      }
    } else {
      if (!this.audioEl.paused) {
        this.audioEl.pause();
      }
      if (!playing && Math.abs(this.audioEl.currentTime - timelineTime) > 0.08) {
        this.audioEl.currentTime = Math.max(0, timelineTime);
      }
    }
  }

  public seekTo(time: number): void {
    if (!this.audioEl) return;
    this.audioEl.currentTime = Math.max(0, time);
  }

  public getAudioTrack(): MediaStreamTrack | null {
    this.ensureWebAudioGraph();
    if (!this.streamDest) return null;
    const tracks = this.streamDest.stream.getAudioTracks();
    return tracks.length > 0 ? tracks[0] : null;
  }

  public dispose(): void {
    if (this.audioEl) {
      this.audioEl.pause();
      this.audioEl.src = '';
      this.audioEl = null;
    }
    if (this.sourceNode) {
      try {
        this.sourceNode.disconnect();
      } catch {
        // ignore
      }
      this.sourceNode = null;
    }
    if (this.gainNode) {
      try {
        this.gainNode.disconnect();
      } catch {
        // ignore
      }
      this.gainNode = null;
    }
    if (this.ctx) {
      void this.ctx.close();
      this.ctx = null;
    }
    this.streamDest = null;
  }
}
