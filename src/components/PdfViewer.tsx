import { useState, useEffect, useRef, useCallback } from "react";
import { ChevronLeft, ChevronRight, ZoomIn, ZoomOut, Maximize2, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import * as pdfjsLib from "pdfjs-dist";

// Configure worker
pdfjsLib.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/4.4.168/pdf.worker.min.mjs`;

interface PdfViewerProps {
  url: string;
  fileName: string;
  zoom: number;
  onZoomChange: (zoom: number) => void;
  onError: () => void;
}

export function PdfViewer({ url, fileName, zoom, onZoomChange, onError }: PdfViewerProps) {
  const [pdf, setPdf] = useState<pdfjsLib.PDFDocumentProxy | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(0);
  const [rendering, setRendering] = useState(false);
  const [loading, setLoading] = useState(true);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const renderTaskRef = useRef<pdfjsLib.RenderTask | null>(null);

  // Load PDF document — fetch as ArrayBuffer first to avoid CORS issues with pdfjs direct URL loading
  useEffect(() => {
    let cancelled = false;
    setLoading(true);

    const loadPdf = async () => {
      try {
        // Fetch the PDF as binary data first
        const response = await fetch(url);
        if (!response.ok) throw new Error("Failed to fetch PDF");
        const arrayBuffer = await response.arrayBuffer();

        const loadingTask = pdfjsLib.getDocument({
          data: arrayBuffer,
          cMapUrl: "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/4.4.168/cmaps/",
          cMapPacked: true,
        });
        const doc = await loadingTask.promise;
        if (cancelled) return;
        setPdf(doc);
        setTotalPages(doc.numPages);
        setCurrentPage(1);
        setLoading(false);
      } catch (err) {
        console.error("PDF load error:", err);
        if (!cancelled) onError();
      }
    };

    loadPdf();
    return () => { cancelled = true; };
  }, [url, onError]);

  // Render current page
  const renderPage = useCallback(async () => {
    if (!pdf || !canvasRef.current || !containerRef.current) return;

    if (renderTaskRef.current) {
      try { renderTaskRef.current.cancel(); } catch {}
    }

    setRendering(true);
    try {
      const page = await pdf.getPage(currentPage);
      const canvas = canvasRef.current;
      const ctx = canvas.getContext("2d");
      if (!ctx) return;

      const container = containerRef.current;
      const containerWidth = container.clientWidth - 32;
      const viewport = page.getViewport({ scale: 1 });
      
      const baseScale = containerWidth / viewport.width;
      const scale = baseScale * (zoom / 100);
      const scaledViewport = page.getViewport({ scale });

      const dpr = window.devicePixelRatio || 1;
      canvas.width = scaledViewport.width * dpr;
      canvas.height = scaledViewport.height * dpr;
      canvas.style.width = `${scaledViewport.width}px`;
      canvas.style.height = `${scaledViewport.height}px`;
      ctx.scale(dpr, dpr);

      const renderTask = page.render({
        canvasContext: ctx,
        viewport: scaledViewport,
      });
      renderTaskRef.current = renderTask;
      await renderTask.promise;
    } catch (err: any) {
      if (err?.name !== "RenderingCancelledException") {
        console.error("PDF render error:", err);
      }
    } finally {
      setRendering(false);
    }
  }, [pdf, currentPage, zoom]);

  useEffect(() => { renderPage(); }, [renderPage]);

  const goToPage = (page: number) => {
    if (page >= 1 && page <= totalPages) setCurrentPage(page);
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center gap-3 p-8 w-full h-full">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
        <p className="text-sm text-muted-foreground">Loading PDF…</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col w-full h-full">
      {/* Toolbar */}
      <div className="flex items-center justify-between px-3 py-1.5 border-b border-border bg-card/80 shrink-0 gap-2">
        <div className="flex items-center gap-1">
          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => goToPage(currentPage - 1)} disabled={currentPage <= 1} aria-label="Previous page">
            <ChevronLeft className="w-4 h-4" />
          </Button>
          <div className="flex items-center gap-1 text-xs">
            <input
              type="number"
              min={1}
              max={totalPages}
              value={currentPage}
              onChange={(e) => {
                const val = parseInt(e.target.value);
                if (!isNaN(val)) goToPage(val);
              }}
              className="w-10 h-6 text-center text-xs bg-secondary border border-border rounded px-1 font-mono text-foreground focus:outline-none focus:ring-1 focus:ring-ring"
              aria-label="Current page"
            />
            <span className="text-muted-foreground">/ {totalPages}</span>
          </div>
          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => goToPage(currentPage + 1)} disabled={currentPage >= totalPages} aria-label="Next page">
            <ChevronRight className="w-4 h-4" />
          </Button>
        </div>

        <div className="flex items-center gap-1">
          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => onZoomChange(Math.max(50, zoom - 25))} aria-label="Zoom out">
            <ZoomOut className="w-3.5 h-3.5" />
          </Button>
          <span className="text-[10px] text-muted-foreground w-9 text-center font-mono">{zoom}%</span>
          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => onZoomChange(Math.min(300, zoom + 25))} aria-label="Zoom in">
            <ZoomIn className="w-3.5 h-3.5" />
          </Button>
          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => onZoomChange(100)} aria-label="Reset zoom">
            <Maximize2 className="w-3.5 h-3.5" />
          </Button>
        </div>
      </div>

      {/* Canvas area */}
      <div ref={containerRef} className="flex-1 overflow-auto flex justify-center p-4 bg-secondary/40 relative">
        {rendering && (
          <div className="absolute inset-0 flex items-center justify-center bg-background/50 z-10">
            <Loader2 className="w-6 h-6 animate-spin text-primary" />
          </div>
        )}
        <canvas
          ref={canvasRef}
          className="shadow-lg rounded bg-white"
          aria-label={`${fileName} - Page ${currentPage} of ${totalPages}`}
        />
      </div>
    </div>
  );
}
