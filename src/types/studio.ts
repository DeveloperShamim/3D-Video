export type ScenePresetId =
  | 'kahf-sanctuary'
  | 'chronometer'
  | 'architecture'
  | 'rover'
  | 'observatory';

export type CameraShotId =
  | 'kahf-story'
  | 'cinema-dolly'
  | 'hero-orbit'
  | 'low-sweep'
  | 'crane-dive'
  | 'free-orbit';

export type LightingMoodId =
  | 'obsidian-noir'
  | 'golden-hour'
  | 'studio-daylight'
  | 'arctic-dusk';

export type MaterialFinishId =
  | 'brushed-gold'
  | 'titanium-chrome'
  | 'anodized-cobalt'
  | 'matte-obsidian';

export interface SceneMeta {
  id: ScenePresetId;
  name: string;
  subtitle: string;
  defaultTarget: [number, number, number];
  defaultRadius: number;
}

export interface StudioConfig {
  sceneId: ScenePresetId;
  cameraShot: CameraShotId;
  lightingMood: LightingMoodId;
  materialFinish: MaterialFinishId;
  previewMode: '10s' | '1m' | 'full';
  duration: number; // active timeline duration in seconds (10s, 60s, or full VO length)
  speed: number; // 0.5, 1, 1.5, 2
  motionIntensity: number; // 0.25 .. 2.0
  explodeAmount: number; // 0 .. 1
  bloomEnabled: boolean;
  subtitlesEnabled: boolean;
  loop: boolean;
  audioEnabled: boolean;
  fps: 30 | 60;
  exportResolution: ExportResolutionId;
  exportMode: ExportModeId;
}

export type ExportResolutionId = '1080p' | '1440p' | '4k';

/**
 * 'frame'    = offline frame-by-frame render (WebCodecs → MP4). Every frame is drawn
 *              fully and encoded at high quality; no dropped frames regardless of GPU speed.
 * 'realtime' = live MediaRecorder capture while the timeline plays (faster, lower quality).
 */
export type ExportModeId = 'frame' | 'realtime';

export const EXPORT_RESOLUTIONS: {
  id: ExportResolutionId;
  label: string;
  width: number;
  height: number;
  /** Target video bitrate in bits/s at 30 fps and 60 fps. */
  bitrate: { 30: number; 60: number };
}[] = [
  { id: '1080p', label: '1080p', width: 1920, height: 1080, bitrate: { 30: 20_000_000, 60: 30_000_000 } },
  { id: '1440p', label: '1440p', width: 2560, height: 1440, bitrate: { 30: 35_000_000, 60: 50_000_000 } },
  { id: '4k', label: '4K', width: 3840, height: 2160, bitrate: { 30: 60_000_000, 60: 85_000_000 } },
];

export function getExportResolution(id: ExportResolutionId) {
  return EXPORT_RESOLUTIONS.find((r) => r.id === id) ?? EXPORT_RESOLUTIONS[0];
}

export interface RecordedVideo {
  url: string;
  blob: Blob;
  mimeType: string;
  extension: string;
  duration: number;
  sizeBytes: number;
  sceneName: string;
  createdAt: number;
  width?: number;
  height?: number;
  /** Set when the frame-by-frame renderer streamed the file straight to disk. */
  savedFileName?: string;
}

export const DEFAULT_VO_URL = '/assets/aistudio/ashab_al_kahf_voiceover_0dc03ed0.mp3';
export const DEFAULT_SRT_URL = '/assets/aistudio/ashab_al_kahf_voiceover_536c8add.srt';

export const SCENE_PRESETS: SceneMeta[] = [
  {
    id: 'kahf-sanctuary',
    name: 'Ashab al-Kahf Sanctuary',
    subtitle: 'Natural limestone cavern, canyon trail & 309-year sky',
    defaultTarget: [0, 1.75, -0.3],
    defaultRadius: 7.4,
  },
  {
    id: 'chronometer',
    name: 'Orbital Chronometer',
    subtitle: 'Beveled tourbillon gears & crystal dome',
    defaultTarget: [0, 1.55, 0],
    defaultRadius: 6.2,
  },
  {
    id: 'architecture',
    name: 'Kinetic Pavilion',
    subtitle: '144 instanced wave monoliths & spire',
    defaultTarget: [0, 1.4, 0],
    defaultRadius: 8.6,
  },
  {
    id: 'rover',
    name: 'Atmospheric Rover',
    subtitle: 'Articulated 6-wheel craft on sculpted dunes',
    defaultTarget: [0, 1.1, 0],
    defaultRadius: 6.8,
  },
  {
    id: 'observatory',
    name: 'Stellar Astrolabe',
    subtitle: 'Gyroscopic rings, probes & 400-star field',
    defaultTarget: [0, 1.8, 0],
    defaultRadius: 7.4,
  },
];

export const CAMERA_SHOTS: { id: CameraShotId; label: string; description: string }[] = [
  {
    id: 'kahf-story',
    label: 'Story Choreography',
    description: 'Beat-synced push-in, dawn sweep & celestial reveal',
  },
  {
    id: 'cinema-dolly',
    label: 'Cinema Dolly',
    description: 'Sweeping crane arc with gentle push-in',
  },
  {
    id: 'hero-orbit',
    label: 'Hero Orbit',
    description: 'Smooth 360-degree turntable glide',
  },
  {
    id: 'low-sweep',
    label: 'Low Sweep',
    description: 'Dramatic low-angle lateral pass',
  },
  {
    id: 'crane-dive',
    label: 'Crane Dive',
    description: 'High overhead descent to close-up',
  },
  {
    id: 'free-orbit',
    label: 'Free Camera',
    description: 'Manual drag, zoom & pan control',
  },
];

export const LIGHTING_MOODS: {
  id: LightingMoodId;
  label: string;
  bgHex: number;
  fogHex: number;
  fogDensity: number;
  keyHex: number;
  keyIntensity: number;
  hemiSkyHex: number;
  hemiGroundHex: number;
  hemiIntensity: number;
  rimHex: number;
  rimIntensity: number;
  accentHex: string;
}[] = [
  {
    id: 'obsidian-noir',
    label: 'Midnight Sanctuary',
    bgHex: 0x070a12,
    fogHex: 0x070a12,
    fogDensity: 0.028,
    keyHex: 0xffe4c4,
    keyIntensity: 2.3,
    hemiSkyHex: 0x6c8ebf,
    hemiGroundHex: 0x161412,
    hemiIntensity: 0.8,
    rimHex: 0x60a5fa,
    rimIntensity: 1.7,
    accentHex: '#1e293b',
  },
  {
    id: 'golden-hour',
    label: 'Golden Dawn',
    bgHex: 0x18110e,
    fogHex: 0x18110e,
    fogDensity: 0.028,
    keyHex: 0xffb36b,
    keyIntensity: 3.1,
    hemiSkyHex: 0xf4a261,
    hemiGroundHex: 0x1f1411,
    hemiIntensity: 0.9,
    rimHex: 0xfde68a,
    rimIntensity: 1.7,
    accentHex: '#d97706',
  },
  {
    id: 'studio-daylight',
    label: 'Studio Daylight',
    bgHex: 0x1a1e26,
    fogHex: 0x1a1e26,
    fogDensity: 0.024,
    keyHex: 0xfff8ee,
    keyIntensity: 2.8,
    hemiSkyHex: 0xcbd5e1,
    hemiGroundHex: 0x262b36,
    hemiIntensity: 1.15,
    rimHex: 0x93c5fd,
    rimIntensity: 1.5,
    accentHex: '#64748b',
  },
  {
    id: 'arctic-dusk',
    label: 'Starlight Dusk',
    bgHex: 0x09131c,
    fogHex: 0x09131c,
    fogDensity: 0.03,
    keyHex: 0xe0f2fe,
    keyIntensity: 2.4,
    hemiSkyHex: 0x7dd3fc,
    hemiGroundHex: 0x0f172a,
    hemiIntensity: 0.95,
    rimHex: 0x2dd4bf,
    rimIntensity: 2.0,
    accentHex: '#0284c7',
  },
];

export const MATERIAL_FINISHES: {
  id: MaterialFinishId;
  label: string;
  color: number;
  swatch: string;
  metalness: number;
  roughness: number;
  anisotropy: number;
  clearcoat: number;
  accentColor: number;
}[] = [
  {
    id: 'brushed-gold',
    label: 'Brushed Brass',
    color: 0xd9a74a,
    swatch: '#d9a74a',
    metalness: 0.94,
    roughness: 0.22,
    anisotropy: 0.85,
    clearcoat: 0.2,
    accentColor: 0xf59e0b,
  },
  {
    id: 'titanium-chrome',
    label: 'Silver Alloy',
    color: 0xcbd5e1,
    swatch: '#cbd5e1',
    metalness: 0.96,
    roughness: 0.16,
    anisotropy: 0.8,
    clearcoat: 0.35,
    accentColor: 0x38bdf8,
  },
  {
    id: 'anodized-cobalt',
    label: 'Cobalt Alloy',
    color: 0x2563eb,
    swatch: '#2563eb',
    metalness: 0.86,
    roughness: 0.26,
    anisotropy: 0.65,
    clearcoat: 0.6,
    accentColor: 0x60a5fa,
  },
  {
    id: 'matte-obsidian',
    label: 'Obsidian',
    color: 0x272a33,
    swatch: '#272a33',
    metalness: 0.55,
    roughness: 0.42,
    anisotropy: 0.2,
    clearcoat: 0.45,
    accentColor: 0xf97316,
  },
];
