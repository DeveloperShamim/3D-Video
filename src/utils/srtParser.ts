export interface SrtCue {
  index: number;
  start: number; // seconds
  end: number; // seconds
  text: string;
}

function parseSrtTimestamp(raw: string): number {
  const match = raw.trim().match(/^(\d{2}):(\d{2}):(\d{2})[,.](\d{3})$/);
  if (!match) return 0;
  const hours = parseInt(match[1], 10);
  const minutes = parseInt(match[2], 10);
  const seconds = parseInt(match[3], 10);
  const millis = parseInt(match[4], 10);
  return hours * 3600 + minutes * 60 + seconds + millis / 1000;
}

export function parseSrt(srtContent: string): SrtCue[] {
  const normalized = srtContent.replace(/\r\n/g, '\n').replace(/\r/g, '\n').trim();
  if (!normalized) return [];

  const blocks = normalized.split(/\n\s*\n/);
  const cues: SrtCue[] = [];

  for (const block of blocks) {
    const lines = block
      .split('\n')
      .map((l) => l.trim())
      .filter(Boolean);
    if (lines.length < 2) continue;

    let timeLineIdx = 0;
    let index = cues.length + 1;

    if (/^\d+$/.test(lines[0])) {
      index = parseInt(lines[0], 10);
      timeLineIdx = 1;
    }

    const timeLine = lines[timeLineIdx];
    if (!timeLine || !timeLine.includes('-->')) continue;

    const [startRaw, endRaw] = timeLine.split('-->');
    const start = parseSrtTimestamp(startRaw);
    const end = parseSrtTimestamp(endRaw);
    const text = lines.slice(timeLineIdx + 1).join('\n');

    if (text) {
      cues.push({ index, start, end, text });
    }
  }

  return cues;
}

export function getActiveCue(cues: SrtCue[], time: number): SrtCue | null {
  for (let i = 0; i < cues.length; i++) {
    const cue = cues[i];
    if (time >= cue.start && time <= cue.end) {
      return cue;
    }
  }
  return null;
}

export function formatTimecode(sec: number): string {
  const clamped = Math.max(0, sec);
  const mins = Math.floor(clamped / 60);
  const secs = Math.floor(clamped % 60);
  const tenths = Math.floor((clamped % 1) * 10);
  return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}.${tenths}`;
}
