import { ChevronRight, Home } from "lucide-react";
import type { FileItem } from "./RecentFiles";

interface BreadcrumbsProps {
  currentFolderId: string | null;
  allFiles: FileItem[];
  onNavigate: (folderId: string | null) => void;
}

export function Breadcrumbs({ currentFolderId, allFiles, onNavigate }: BreadcrumbsProps) {
  const crumbs: { id: string | null; name: string }[] = [{ id: null, name: "My storage" }];

  let current = currentFolderId ? allFiles.find((f) => f.id === currentFolderId) : null;
  const trail: { id: string; name: string }[] = [];
  while (current) {
    trail.unshift({ id: current.id, name: current.name });
    current = current.parent_id ? allFiles.find((f) => f.id === current!.parent_id) : undefined;
  }
  crumbs.push(...trail);

  if (crumbs.length <= 1) return null;

  return (
    <nav className="flex items-center gap-1 text-sm mb-4 flex-wrap">
      {crumbs.map((crumb, i) => (
        <span key={crumb.id ?? "root"} className="flex items-center gap-1">
          {i > 0 && <ChevronRight className="w-3.5 h-3.5 text-muted-foreground" />}
          <button
            onClick={() => onNavigate(crumb.id)}
            className={`flex items-center gap-1 px-1.5 py-0.5 rounded-md transition-colors ${
              i === crumbs.length - 1
                ? "font-semibold text-foreground"
                : "text-muted-foreground hover:text-foreground hover:bg-secondary"
            }`}
          >
            {i === 0 && <Home className="w-3.5 h-3.5" />}
            <span>{crumb.name}</span>
          </button>
        </span>
      ))}
    </nav>
  );
}
