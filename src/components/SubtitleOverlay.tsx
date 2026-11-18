import { SrtCue } from '../utils/srtParser';

interface SubtitleOverlayProps {
  cue: SrtCue | null;
  enabled: boolean;
  isDockCollapsed: boolean;
}

export function SubtitleOverlay({
  cue,
  enabled,
  isDockCollapsed,
}: SubtitleOverlayProps) {
  if (!enabled || !cue) return null;

  return (
    <div
      className="pointer-events-none fixed left-1/2 z-10 w-[min(740px,90vw)] -translate-x-1/2 transition-all duration-300 flex justify-center"
      style={{
        bottom: isDockCollapsed ? '52px' : '212px',
      }}
    >
      <div className="rounded-lg bg-[#070a12]/85 px-5 py-2.5 text-center border border-white/10 shadow-lg">
        <p className="font-bengali text-base sm:text-xl font-medium leading-relaxed text-slate-50 whitespace-pre-line">
          {cue.text}
        </p>
      </div>
    </div>
  );
}
