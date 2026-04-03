import { Filter, X } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";

export interface SearchFilterState {
  type: string | null; // image, document, spreadsheet, pdf, other
  sizeMin: number | null;
  sizeMax: number | null;
}

interface SearchFiltersProps {
  filters: SearchFilterState;
  onFiltersChange: (filters: SearchFilterState) => void;
}

const FILE_TYPES = [
  { value: "image", label: "Images" },
  { value: "document", label: "Documents" },
  { value: "pdf", label: "PDFs" },
  { value: "spreadsheet", label: "Spreadsheets" },
  { value: "other", label: "Other" },
];

const SIZE_OPTIONS = [
  { label: "Any size", min: null, max: null },
  { label: "< 1 MB", min: null, max: 1e6 },
  { label: "1-10 MB", min: 1e6, max: 10e6 },
  { label: "10-100 MB", min: 10e6, max: 100e6 },
  { label: "> 100 MB", min: 100e6, max: null },
];

export function SearchFilters({ filters, onFiltersChange }: SearchFiltersProps) {
  const [open, setOpen] = useState(false);
  const hasFilters = filters.type || filters.sizeMin || filters.sizeMax;

  const clearFilters = () => onFiltersChange({ type: null, sizeMin: null, sizeMax: null });

  return (
    <div className="flex items-center gap-1.5">
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button variant="outline" size="sm" className="h-8 gap-1.5 text-xs">
            <Filter className="w-3.5 h-3.5" />
            Filters
            {hasFilters && (
              <span className="w-4 h-4 rounded-full bg-primary text-primary-foreground text-[10px] flex items-center justify-center">
                {(filters.type ? 1 : 0) + (filters.sizeMin || filters.sizeMax ? 1 : 0)}
              </span>
            )}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-56 p-3" align="start">
          <div className="space-y-3">
            <div>
              <p className="text-xs font-semibold text-foreground mb-1.5">File type</p>
              <div className="flex flex-wrap gap-1">
                {FILE_TYPES.map((t) => (
                  <button
                    key={t.value}
                    onClick={() => onFiltersChange({ ...filters, type: filters.type === t.value ? null : t.value })}
                    className={`px-2 py-1 rounded-md text-xs transition-colors ${
                      filters.type === t.value
                        ? "bg-primary text-primary-foreground"
                        : "bg-secondary text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    {t.label}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <p className="text-xs font-semibold text-foreground mb-1.5">File size</p>
              <div className="space-y-0.5">
                {SIZE_OPTIONS.map((opt) => {
                  const selected = filters.sizeMin === opt.min && filters.sizeMax === opt.max;
                  return (
                    <button
                      key={opt.label}
                      onClick={() => onFiltersChange({ ...filters, sizeMin: opt.min, sizeMax: opt.max })}
                      className={`w-full text-left px-2 py-1.5 rounded-md text-xs transition-colors ${
                        selected ? "bg-primary text-primary-foreground" : "hover:bg-secondary text-muted-foreground"
                      }`}
                    >
                      {opt.label}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        </PopoverContent>
      </Popover>
      {hasFilters && (
        <Button variant="ghost" size="sm" className="h-8 text-xs gap-1 text-muted-foreground" onClick={clearFilters}>
          <X className="w-3 h-3" /> Clear
        </Button>
      )}
    </div>
  );
}

export function matchesTypeFilter(mime: string, type: string | null): boolean {
  if (!type) return true;
  switch (type) {
    case "image": return mime.startsWith("image/");
    case "document": return mime.includes("document") || mime.includes("word") || mime.startsWith("text/");
    case "pdf": return mime.includes("pdf");
    case "spreadsheet": return mime.includes("sheet") || mime.includes("excel") || mime.includes("csv");
    case "other": return !mime.startsWith("image/") && !mime.includes("pdf") && !mime.includes("document") && !mime.includes("word") && !mime.includes("sheet") && !mime.includes("excel");
    default: return true;
  }
}
