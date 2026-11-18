import { Download, X } from 'lucide-react';
import { RecordedVideo } from '../types/studio';

interface VideoPreviewModalProps {
  video: RecordedVideo | null;
  onClose: () => void;
}

function formatFileSize(bytes: number): string {
  if (bytes < 1024 * 1024) {
    return `${(bytes / 1024).toFixed(1)} KB`;
  }
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

export function VideoPreviewModal({ video, onClose }: VideoPreviewModalProps) {
  if (!video) return null;

  const fileName = `${video.sceneName.toLowerCase().replace(/\s+/g, '-')}-${video.duration}s.${video.extension}`;

  return (
    <div
      className="fixed inset-0 z-30 flex items-center justify-center bg-black/75 p-4"
      role="dialog"
      aria-modal="true"
      aria-label="Exported Three.js Video Preview"
    >
      <div className="w-full max-w-3xl rounded-xl border border-white/12 bg-[#12151d] shadow-2xl overflow-hidden">
        <div className="flex items-center justify-between gap-4 px-5 py-3.5 border-b border-white/10">
          <div>
            <h2 className="font-display text-base font-semibold text-slate-100">
              Rendered 3D Video Ready
            </h2>
            <p className="mt-0.5 text-xs text-slate-400 font-mono-tabular">
              {video.sceneName} · {video.duration}s · {formatFileSize(video.sizeBytes)} ·{' '}
              {video.extension.toUpperCase()}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-white/10 bg-[#181c26] text-slate-300 hover:text-white transition-colors cursor-pointer"
            aria-label="Close Video Preview"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="bg-black flex items-center justify-center max-h-[65vh]">
          <video
            src={video.url}
            controls
            autoPlay
            loop
            playsInline
            className="w-full max-h-[65vh] object-contain"
          />
        </div>

        <div className="flex items-center justify-between gap-4 px-5 py-3.5 border-t border-white/10">
          <span className="text-xs text-slate-400">
            Captured directly from Three.js WebGL canvas
          </span>

          <div className="flex items-center gap-2.5">
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg border border-white/12 bg-[#181c26] px-4 py-2 text-xs font-medium text-slate-200 hover:bg-[#202634] transition-colors cursor-pointer whitespace-nowrap"
            >
              Back to Studio
            </button>
            <a
              href={video.url}
              download={fileName}
              className="inline-flex items-center gap-2 rounded-lg bg-amber-500 px-4 py-2 text-xs font-semibold text-slate-950 hover:bg-amber-400 transition-colors whitespace-nowrap"
            >
              <Download className="h-3.5 w-3.5" />
              <span>Download Video</span>
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}
