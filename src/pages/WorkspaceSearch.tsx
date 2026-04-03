import { useState, useEffect, useCallback, useRef } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { Search, ArrowLeft, X, FileText, Folder, Image, Video, Music, Archive, Loader2, SlidersHorizontal, Star, Store, ExternalLink } from "lucide-react";
import { useAdvancedSearch, DEFAULT_FILTERS, type SearchFilters, type SearchResult } from "@/hooks/useAdvancedSearch";
import { useMarketplaceListings } from "@/hooks/useMarketplace";
import { useDebounce } from "@/hooks/useDebounce";
import { useWorkspaceContext } from "@/hooks/useWorkspaces";
import { useIsMobile } from "@/hooks/use-mobile";
import { cn } from "@/lib/utils";
import { motion, AnimatePresence } from "framer-motion";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";

// --- Helpers ---
function getFileIcon(mime: string | null, isFolder: boolean) {
  if (isFolder) return <Folder className="w-5 h-5 text-primary" />;
  if (!mime) return <FileText className="w-5 h-5 text-muted-foreground" />;
  if (mime.startsWith("image/")) return <Image className="w-5 h-5 text-emerald-500" />;
  if (mime.startsWith("video/")) return <Video className="w-5 h-5 text-violet-500" />;
  if (mime.startsWith("audio/")) return <Music className="w-5 h-5 text-amber-500" />;
  if (mime.includes("zip") || mime.includes("archive")) return <Archive className="w-5 h-5 text-yellow-500" />;
  if (mime.includes("pdf")) return <FileText className="w-5 h-5 text-red-500" />;
  return <FileText className="w-5 h-5 text-muted-foreground" />;
}

function formatSize(bytes: number | null) {
  if (!bytes) return "";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1048576) return `${(bytes / 1024).toFixed(1)} KB`;
  if (bytes < 1073741824) return `${(bytes / 1048576).toFixed(1)} MB`;
  return `${(bytes / 1073741824).toFixed(1)} GB`;
}

function highlightMatch(text: string, query: string) {
  if (!query || query.length < 2) return text;
  const idx = text.toLowerCase().indexOf(query.toLowerCase());
  if (idx === -1) return text;
  return (
    <>
      {text.slice(0, idx)}
      <span className="bg-primary/20 text-primary font-semibold rounded-sm px-0.5">{text.slice(idx, idx + query.length)}</span>
      {text.slice(idx + query.length)}
    </>
  );
}

const WORKSPACE_SCOPES = [
  { value: "all", label: "All Workspaces" },
  { value: "personal", label: "My Drive" },
  { value: "team", label: "Team Workspaces" },
];

const FILE_TYPES = [
  { value: null, label: "All Types" },
  { value: "image", label: "Images" },
  { value: "video", label: "Videos" },
  { value: "audio", label: "Audio" },
  { value: "document", label: "Documents" },
  { value: "pdf", label: "PDFs" },
  { value: "spreadsheet", label: "Spreadsheets" },
  { value: "archive", label: "Archives" },
  { value: "folder", label: "Folders" },
];

const SORT_OPTIONS = [
  { value: "relevance", label: "Most Relevant" },
  { value: "newest", label: "Newest First" },
  { value: "oldest", label: "Oldest First" },
  { value: "largest", label: "Largest First" },
  { value: "smallest", label: "Smallest First" },
];

const SIZE_OPTIONS = [
  { label: "Any size", min: null, max: null },
  { label: "< 1 MB", min: null, max: 1e6 },
  { label: "1–10 MB", min: 1e6, max: 10e6 },
  { label: "10–100 MB", min: 10e6, max: 100e6 },
  { label: "> 100 MB", min: 100e6, max: null },
];

type SearchTab = "files" | "marketplace";

// --- Filter Panel ---
function FilterPanel({ filters, onChange, workspaces, onClose }: {
  filters: SearchFilters;
  onChange: (f: SearchFilters) => void;
  workspaces: { id: string; name: string; type: string }[];
  onClose?: () => void;
}) {
  const activeFilterCount = [
    filters.workspaceScope !== "all",
    filters.fileType !== null,
    filters.sizeMin !== null || filters.sizeMax !== null,
    filters.dateFrom !== null || filters.dateTo !== null,
  ].filter(Boolean).length;

  return (
    <div className="space-y-6 p-1">
      <div>
        <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Workspace</h4>
        <div className="space-y-1">
          {WORKSPACE_SCOPES.map((s) => (
            <button key={s.value} onClick={() => onChange({ ...filters, workspaceScope: s.value })}
              className={cn("w-full text-left px-3 py-2 rounded-lg text-sm transition-colors",
                filters.workspaceScope === s.value ? "bg-primary/10 text-primary font-medium" : "text-muted-foreground hover:bg-secondary/60 hover:text-foreground"
              )}>{s.label}</button>
          ))}
          {workspaces.filter(w => w.type === 'team').map((ws) => (
            <button key={ws.id} onClick={() => onChange({ ...filters, workspaceScope: ws.id })}
              className={cn("w-full text-left px-3 py-2 rounded-lg text-sm transition-colors pl-6",
                filters.workspaceScope === ws.id ? "bg-primary/10 text-primary font-medium" : "text-muted-foreground hover:bg-secondary/60 hover:text-foreground"
              )}>{ws.name}</button>
          ))}
        </div>
      </div>

      <div>
        <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">File Type</h4>
        <div className="flex flex-wrap gap-1.5">
          {FILE_TYPES.map((t) => (
            <button key={t.value ?? "all"} onClick={() => onChange({ ...filters, fileType: t.value })}
              className={cn("px-2.5 py-1.5 rounded-lg text-xs font-medium transition-colors",
                filters.fileType === t.value ? "bg-primary text-primary-foreground" : "bg-secondary/60 text-muted-foreground hover:bg-secondary hover:text-foreground"
              )}>{t.label}</button>
          ))}
        </div>
      </div>

      <div>
        <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">File Size</h4>
        <div className="space-y-1">
          {SIZE_OPTIONS.map((opt) => {
            const selected = filters.sizeMin === opt.min && filters.sizeMax === opt.max;
            return (
              <button key={opt.label} onClick={() => onChange({ ...filters, sizeMin: opt.min, sizeMax: opt.max })}
                className={cn("w-full text-left px-3 py-2 rounded-lg text-sm transition-colors",
                  selected ? "bg-primary/10 text-primary font-medium" : "text-muted-foreground hover:bg-secondary/60 hover:text-foreground"
                )}>{opt.label}</button>
            );
          })}
        </div>
      </div>

      <div>
        <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Date Modified</h4>
        <div className="space-y-2">
          <input type="date" value={filters.dateFrom ?? ""} onChange={(e) => onChange({ ...filters, dateFrom: e.target.value || null })}
            className="w-full px-3 py-2 rounded-lg text-sm bg-secondary/60 border-0 focus:ring-2 focus:ring-primary/20 text-foreground" />
          <input type="date" value={filters.dateTo ?? ""} onChange={(e) => onChange({ ...filters, dateTo: e.target.value || null })}
            className="w-full px-3 py-2 rounded-lg text-sm bg-secondary/60 border-0 focus:ring-2 focus:ring-primary/20 text-foreground" />
        </div>
      </div>

      <div>
        <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Sort By</h4>
        <div className="space-y-1">
          {SORT_OPTIONS.map((s) => (
            <button key={s.value} onClick={() => onChange({ ...filters, sortBy: s.value })}
              className={cn("w-full text-left px-3 py-2 rounded-lg text-sm transition-colors",
                filters.sortBy === s.value ? "bg-primary/10 text-primary font-medium" : "text-muted-foreground hover:bg-secondary/60 hover:text-foreground"
              )}>{s.label}</button>
          ))}
        </div>
      </div>

      {activeFilterCount > 0 && (
        <Button variant="outline" size="sm" className="w-full" onClick={() => { onChange(DEFAULT_FILTERS); onClose?.(); }}>
          <X className="w-3.5 h-3.5 mr-1.5" /> Clear all filters ({activeFilterCount})
        </Button>
      )}
    </div>
  );
}

// --- File Result Card ---
function ResultCard({ result, query, onClick }: { result: SearchResult; query: string; onClick: () => void }) {
  return (
    <motion.button initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} onClick={onClick}
      className="w-full flex items-center gap-3 px-3 md:px-4 py-3 rounded-xl text-left transition-all hover:bg-secondary/50 group">
      {result.cloudinary_url && result.mime_type?.startsWith("image/") ? (
        <img src={result.cloudinary_url} alt="" className="w-10 h-10 md:w-11 md:h-11 rounded-xl object-cover shrink-0 group-hover:ring-2 ring-primary/20 transition-all" loading="lazy" />
      ) : (
        <div className="w-10 h-10 md:w-11 md:h-11 rounded-xl flex items-center justify-center shrink-0 bg-secondary/60 group-hover:bg-primary/10 transition-colors">
          {getFileIcon(result.mime_type, result.is_folder)}
        </div>
      )}
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-foreground truncate">{highlightMatch(result.name, query)}</p>
        <div className="flex items-center gap-2 mt-0.5 flex-wrap">
          <span className={cn("text-[10px] font-semibold px-1.5 py-0.5 rounded-md",
            result.workspace_type === "personal" ? "bg-blue-500/10 text-blue-600" : "bg-emerald-500/10 text-emerald-600"
          )}>{result.workspace_type === "personal" ? "My Drive" : result.workspace_name}</span>
          {!result.is_folder && result.size && <span className="text-[10px] text-muted-foreground/60">{formatSize(result.size)}</span>}
          <span className="text-[10px] text-muted-foreground/40">{new Date(result.updated_at).toLocaleDateString()}</span>
          {result.is_starred && <Star className="w-3 h-3 text-amber-400 fill-amber-400" />}
        </div>
      </div>
      <ExternalLink className="w-4 h-4 text-muted-foreground/30 group-hover:text-muted-foreground shrink-0 transition-colors" />
    </motion.button>
  );
}

// --- Marketplace Result Card ---
function MarketplaceResultCard({ listing, query, onClick }: { listing: any; query: string; onClick: () => void }) {
  const file = listing.file || listing.files;
  return (
    <motion.button initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} onClick={onClick}
      className="w-full flex items-center gap-3 px-3 md:px-4 py-3 rounded-xl text-left transition-all hover:bg-secondary/50 group">
      {file?.cloudinary_url && file?.mime_type?.startsWith("image/") ? (
        <img src={file.cloudinary_url} alt="" className="w-10 h-10 md:w-11 md:h-11 rounded-xl object-cover shrink-0 group-hover:ring-2 ring-primary/20 transition-all" loading="lazy" />
      ) : (
        <div className="w-10 h-10 md:w-11 md:h-11 rounded-xl flex items-center justify-center shrink-0 bg-secondary/60 group-hover:bg-primary/10 transition-colors">
          {getFileIcon(file?.mime_type, false)}
        </div>
      )}
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-foreground truncate">{highlightMatch(listing.title, query)}</p>
        <div className="flex items-center gap-2 mt-0.5 flex-wrap">
          <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded-md bg-purple-500/10 text-purple-600">
            <Store className="w-2.5 h-2.5 inline mr-0.5" /> Marketplace
          </span>
          {file?.size && <span className="text-[10px] text-muted-foreground/60">{formatSize(file.size)}</span>}
          <span className="text-[10px] text-muted-foreground/40">
            ↓{listing.download_count} · ♥{listing.like_count}
          </span>
        </div>
      </div>
      <ExternalLink className="w-4 h-4 text-muted-foreground/30 group-hover:text-muted-foreground shrink-0 transition-colors" />
    </motion.button>
  );
}

// --- Main Search Page ---
export default function WorkspaceSearch() {
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();
  const isMobile = useIsMobile();
  const { workspaces, switchWorkspace } = useWorkspaceContext();

  const initialQuery = searchParams.get("query") ?? "";
  const initialTab = (searchParams.get("tab") as SearchTab) ?? "files";
  const [inputValue, setInputValue] = useState(initialQuery);
  const debouncedQuery = useDebounce(inputValue, 300);
  const [filters, setFilters] = useState<SearchFilters>(DEFAULT_FILTERS);
  const [filterDrawerOpen, setFilterDrawerOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<SearchTab>(initialTab);
  const inputRef = useRef<HTMLInputElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  // Sync URL
  useEffect(() => {
    const params: Record<string, string> = {};
    if (debouncedQuery) params.query = debouncedQuery;
    if (activeTab !== "files") params.tab = activeTab;
    setSearchParams(params, { replace: true });
  }, [debouncedQuery, activeTab, setSearchParams]);

  useEffect(() => { inputRef.current?.focus(); }, []);

  // Workspace file search
  const { data, isLoading, hasNextPage, fetchNextPage, isFetchingNextPage } = useAdvancedSearch(debouncedQuery, filters);
  const allResults = data?.pages.flat() ?? [];

  // Marketplace search
  const { data: marketplaceData, isLoading: mpLoading, hasNextPage: mpHasNext, fetchNextPage: mpFetchNext, isFetchingNextPage: mpFetching } =
    useMarketplaceListings({ search: debouncedQuery.length >= 2 ? debouncedQuery : undefined });
  const mpResults = marketplaceData?.pages.flat() ?? [];

  // Navigate to file's location with workspace switch
  const handleFileClick = useCallback((result: SearchResult) => {
    // Switch to the file's workspace
    if (result.workspace_id) {
      switchWorkspace(result.workspace_id);
    }
    // Navigate to root — the workspace switch + parent_id could be used for folder navigation
    // For now navigate home; the workspace switch will show the correct files
    navigate("/");
  }, [switchWorkspace, navigate]);

  // Infinite scroll
  const handleScroll = useCallback(() => {
    const el = scrollRef.current;
    if (!el) return;
    if (el.scrollTop + el.clientHeight >= el.scrollHeight - 200) {
      if (activeTab === "files" && hasNextPage && !isFetchingNextPage) fetchNextPage();
      if (activeTab === "marketplace" && mpHasNext && !mpFetching) mpFetchNext();
    }
  }, [activeTab, hasNextPage, isFetchingNextPage, fetchNextPage, mpHasNext, mpFetching, mpFetchNext]);

  const activeFilterCount = [
    filters.workspaceScope !== "all",
    filters.fileType !== null,
    filters.sizeMin !== null || filters.sizeMax !== null,
    filters.dateFrom !== null || filters.dateTo !== null,
  ].filter(Boolean).length;

  const wsListForFilter = (workspaces ?? []).map(w => ({ id: w.id, name: w.name, type: w.type }));

  const currentIsLoading = activeTab === "files" ? isLoading : mpLoading;
  const currentResults = activeTab === "files" ? allResults : mpResults;
  const currentFetching = activeTab === "files" ? isFetchingNextPage : mpFetching;
  const currentHasNext = activeTab === "files" ? hasNextPage : mpHasNext;

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Search Header */}
      <div className="sticky top-0 z-30 bg-card/95 backdrop-blur-xl border-b border-border/60">
        <div className="max-w-5xl mx-auto px-3 md:px-6 py-3 flex items-center gap-3">
          <button onClick={() => navigate(-1)} className="w-9 h-9 rounded-lg hover:bg-secondary flex items-center justify-center transition-colors shrink-0">
            <ArrowLeft className="w-5 h-5 text-muted-foreground" />
          </button>
          <div className="flex-1 relative">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-[18px] h-[18px] text-muted-foreground pointer-events-none" />
            <input ref={inputRef} type="text" placeholder="Search files & marketplace..."
              value={inputValue} onChange={(e) => setInputValue(e.target.value)}
              className="w-full h-11 pl-10 pr-4 bg-secondary/50 rounded-xl text-sm text-foreground placeholder:text-muted-foreground/60 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:bg-secondary/80 transition-all border-0" />
            {inputValue && (
              <button onClick={() => setInputValue("")} className="absolute right-3 top-1/2 -translate-y-1/2 w-6 h-6 rounded-md hover:bg-secondary flex items-center justify-center">
                <X className="w-3.5 h-3.5 text-muted-foreground" />
              </button>
            )}
          </div>
          {activeTab === "files" && (
            <button onClick={() => isMobile ? setFilterDrawerOpen(true) : setFilterDrawerOpen(prev => !prev)}
              className={cn("w-9 h-9 rounded-lg flex items-center justify-center transition-colors shrink-0 relative",
                filterDrawerOpen && !isMobile ? "bg-primary/10 text-primary" : "hover:bg-secondary text-muted-foreground"
              )}>
              <SlidersHorizontal className="w-5 h-5" />
              {activeFilterCount > 0 && (
                <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-primary text-primary-foreground text-[9px] flex items-center justify-center font-bold">
                  {activeFilterCount}
                </span>
              )}
            </button>
          )}
        </div>

        {/* Tabs */}
        <div className="max-w-5xl mx-auto px-3 md:px-6 flex items-center gap-1">
          {(["files", "marketplace"] as SearchTab[]).map((tab) => (
            <button key={tab} onClick={() => setActiveTab(tab)}
              className={cn("px-4 py-2 text-sm font-medium border-b-2 transition-colors",
                activeTab === tab ? "border-primary text-primary" : "border-transparent text-muted-foreground hover:text-foreground"
              )}>
              {tab === "files" ? (
                <span className="flex items-center gap-1.5"><FileText className="w-3.5 h-3.5" /> Files{debouncedQuery.length >= 2 && !isLoading ? ` (${allResults.length})` : ""}</span>
              ) : (
                <span className="flex items-center gap-1.5"><Store className="w-3.5 h-3.5" /> Marketplace{debouncedQuery.length >= 2 && !mpLoading ? ` (${mpResults.length})` : ""}</span>
              )}
            </button>
          ))}
        </div>

        {/* Active filter chips - files tab only */}
        {activeTab === "files" && activeFilterCount > 0 && (
          <div className="max-w-5xl mx-auto px-3 md:px-6 pb-2 pt-1 flex items-center gap-1.5 overflow-x-auto">
            {filters.workspaceScope !== "all" && (
              <span className="shrink-0 px-2 py-1 rounded-md bg-primary/10 text-primary text-[11px] font-medium flex items-center gap-1">
                {WORKSPACE_SCOPES.find(s => s.value === filters.workspaceScope)?.label ?? wsListForFilter.find(w => w.id === filters.workspaceScope)?.name ?? filters.workspaceScope}
                <button onClick={() => setFilters(f => ({ ...f, workspaceScope: "all" }))}><X className="w-3 h-3" /></button>
              </span>
            )}
            {filters.fileType && (
              <span className="shrink-0 px-2 py-1 rounded-md bg-primary/10 text-primary text-[11px] font-medium flex items-center gap-1">
                {FILE_TYPES.find(t => t.value === filters.fileType)?.label}
                <button onClick={() => setFilters(f => ({ ...f, fileType: null }))}><X className="w-3 h-3" /></button>
              </span>
            )}
            {(filters.sizeMin !== null || filters.sizeMax !== null) && (
              <span className="shrink-0 px-2 py-1 rounded-md bg-primary/10 text-primary text-[11px] font-medium flex items-center gap-1">
                {SIZE_OPTIONS.find(o => o.min === filters.sizeMin && o.max === filters.sizeMax)?.label ?? "Custom size"}
                <button onClick={() => setFilters(f => ({ ...f, sizeMin: null, sizeMax: null }))}><X className="w-3 h-3" /></button>
              </span>
            )}
            {(filters.dateFrom || filters.dateTo) && (
              <span className="shrink-0 px-2 py-1 rounded-md bg-primary/10 text-primary text-[11px] font-medium flex items-center gap-1">
                {filters.dateFrom ?? "..."} → {filters.dateTo ?? "..."}
                <button onClick={() => setFilters(f => ({ ...f, dateFrom: null, dateTo: null }))}><X className="w-3 h-3" /></button>
              </span>
            )}
          </div>
        )}
      </div>

      {/* Content */}
      <div className="flex-1 flex max-w-5xl mx-auto w-full">
        {/* Desktop Filter Sidebar - files tab only */}
        <AnimatePresence>
          {filterDrawerOpen && !isMobile && activeTab === "files" && (
            <motion.aside initial={{ width: 0, opacity: 0 }} animate={{ width: 260, opacity: 1 }} exit={{ width: 0, opacity: 0 }} transition={{ duration: 0.25 }}
              className="border-r border-border/40 overflow-hidden shrink-0">
              <div className="w-[260px] p-4 overflow-y-auto h-[calc(100vh-160px)]">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-sm font-semibold text-foreground">Filters</h3>
                  <button onClick={() => setFilterDrawerOpen(false)} className="w-6 h-6 rounded-md hover:bg-secondary flex items-center justify-center">
                    <X className="w-3.5 h-3.5 text-muted-foreground" />
                  </button>
                </div>
                <FilterPanel filters={filters} onChange={setFilters} workspaces={wsListForFilter} />
              </div>
            </motion.aside>
          )}
        </AnimatePresence>

        {/* Results Area */}
        <div ref={scrollRef} onScroll={handleScroll} className="flex-1 overflow-y-auto h-[calc(100vh-160px)]">
          <div className="px-3 md:px-6 py-4">
            {/* Header */}
            {debouncedQuery.length >= 2 && !currentIsLoading && (
              <div className="mb-4">
                <p className="text-xs text-muted-foreground">
                  {currentResults.length} result{currentResults.length !== 1 ? "s" : ""} for{" "}
                  <span className="font-semibold text-foreground">"{debouncedQuery}"</span>
                  {activeTab === "files" && " across your workspaces"}
                  {activeTab === "marketplace" && " in marketplace"}
                </p>
              </div>
            )}

            {/* Empty state */}
            {debouncedQuery.length < 2 && (
              <div className="flex flex-col items-center justify-center py-20 text-center">
                <div className="w-16 h-16 rounded-2xl bg-secondary/60 flex items-center justify-center mb-4">
                  <Search className="w-7 h-7 text-muted-foreground/40" />
                </div>
                <h3 className="text-base font-semibold text-foreground mb-1">
                  {activeTab === "files" ? "Search your files" : "Search marketplace"}
                </h3>
                <p className="text-sm text-muted-foreground/60 max-w-sm">
                  {activeTab === "files"
                    ? "Search across all your workspaces — personal drive and team workspaces. Use filters to narrow results."
                    : "Search published files in the marketplace. Find documents, images, and more shared by the community."}
                </p>
              </div>
            )}

            {/* Loading */}
            {currentIsLoading && debouncedQuery.length >= 2 && (
              <div className="space-y-2">
                {Array.from({ length: 6 }).map((_, i) => (
                  <div key={i} className="flex items-center gap-3 px-4 py-3">
                    <Skeleton className="w-11 h-11 rounded-xl" />
                    <div className="flex-1 space-y-2">
                      <Skeleton className="h-4 w-3/4 rounded" />
                      <Skeleton className="h-3 w-1/2 rounded" />
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* No results */}
            {!currentIsLoading && debouncedQuery.length >= 2 && currentResults.length === 0 && (
              <div className="flex flex-col items-center justify-center py-20 text-center">
                <Search className="w-12 h-12 text-muted-foreground/30 mb-3" />
                <h3 className="text-base font-semibold text-foreground mb-1">No results found</h3>
                <p className="text-sm text-muted-foreground/60">Try different keywords or adjust your filters</p>
              </div>
            )}

            {/* File Results */}
            {activeTab === "files" && allResults.length > 0 && (
              <div className="space-y-0.5">
                {allResults.map((result) => (
                  <ResultCard key={result.id} result={result} query={debouncedQuery} onClick={() => handleFileClick(result)} />
                ))}
              </div>
            )}

            {/* Marketplace Results */}
            {activeTab === "marketplace" && mpResults.length > 0 && (
              <div className="space-y-0.5">
                {mpResults.map((listing: any) => (
                  <MarketplaceResultCard key={listing.id} listing={listing} query={debouncedQuery}
                    onClick={() => navigate(`/marketplace/${listing.id}`)} />
                ))}
              </div>
            )}

            {/* Loading more */}
            {currentFetching && (
              <div className="flex items-center justify-center py-6">
                <Loader2 className="w-5 h-5 text-primary animate-spin" />
              </div>
            )}

            {/* End */}
            {!currentHasNext && currentResults.length > 0 && (
              <p className="text-center text-xs text-muted-foreground/40 py-6">End of results</p>
            )}
          </div>
        </div>
      </div>

      {/* Mobile Filter Drawer */}
      {isMobile && activeTab === "files" && (
        <Sheet open={filterDrawerOpen} onOpenChange={setFilterDrawerOpen}>
          <SheetContent side="bottom" className="max-h-[80vh] rounded-t-2xl overflow-y-auto">
            <SheetHeader><SheetTitle>Search Filters</SheetTitle></SheetHeader>
            <div className="mt-4">
              <FilterPanel filters={filters} onChange={setFilters} workspaces={wsListForFilter} onClose={() => setFilterDrawerOpen(false)} />
            </div>
          </SheetContent>
        </Sheet>
      )}
    </div>
  );
}
