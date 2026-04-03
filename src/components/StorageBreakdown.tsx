import { ImageIcon, FileText, Film, Music, Archive } from "lucide-react";
import type { FileItem } from "./RecentFiles";

interface StorageBreakdownProps {
  files: FileItem[];
}

type Category = {
  label: string;
  icon: typeof ImageIcon;
  color: string;
  check: (mime: string) => boolean;
};

const CATEGORIES: Category[] = [
  { label: "Images", icon: ImageIcon, color: "bg-primary", check: (m) => m.startsWith("image/") },
  { label: "Documents", icon: FileText, color: "bg-accent", check: (m) => m.includes("pdf") || m.includes("document") || m.includes("word") || m.includes("text") || m.includes("sheet") },
  { label: "Videos", icon: Film, color: "bg-chart-1", check: (m) => m.startsWith("video/") },
  { label: "Audio", icon: Music, color: "bg-chart-2", check: (m) => m.startsWith("audio/") },
];

function formatSize(bytes: number): string {
  if (bytes >= 1e9) return `${(bytes / 1e9).toFixed(1)} GB`;
  if (bytes >= 1e6) return `${(bytes / 1e6).toFixed(1)} MB`;
  if (bytes >= 1e3) return `${Math.round(bytes / 1e3)} KB`;
  return `${bytes} B`;
}

export function StorageBreakdown({ files }: StorageBreakdownProps) {
  const nonTrashed = files.filter((f) => !f.is_trashed && !f.is_folder);

  const breakdown = CATEGORIES.map((cat) => {
    const matching = nonTrashed.filter((f) => cat.check(f.mime_type));
    const size = matching.reduce((sum, f) => sum + (f.size || 0), 0);
    return { ...cat, size, count: matching.length };
  });

  const categorizedSize = breakdown.reduce((s, b) => s + b.size, 0);
  const totalSize = nonTrashed.reduce((s, f) => s + (f.size || 0), 0);
  const otherSize = totalSize - categorizedSize;

  if (otherSize > 0) {
    breakdown.push({ label: "Other", icon: Archive, color: "bg-muted-foreground", size: otherSize, count: nonTrashed.length - breakdown.reduce((s, b) => s + b.count, 0), check: () => false });
  }

  const nonZero = breakdown.filter((b) => b.size > 0);
  if (nonZero.length === 0) return null;

  return (
    <div className="space-y-2">
      <h4 className="text-xs font-semibold text-foreground">Storage breakdown</h4>
      {/* Bar */}
      <div className="flex h-2 rounded-full overflow-hidden bg-secondary">
        {nonZero.map((b) => (
          <div
            key={b.label}
            className={`${b.color} transition-all duration-500`}
            style={{ width: `${(b.size / totalSize) * 100}%` }}
          />
        ))}
      </div>
      {/* Legend */}
      <div className="grid grid-cols-2 gap-1.5">
        {nonZero.map((b) => (
          <div key={b.label} className="flex items-center gap-2">
            <div className={`w-2 h-2 rounded-full ${b.color} shrink-0`} />
            <span className="text-[10px] text-muted-foreground truncate">{b.label}</span>
            <span className="text-[10px] font-mono-data text-foreground ml-auto">{formatSize(b.size)}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
