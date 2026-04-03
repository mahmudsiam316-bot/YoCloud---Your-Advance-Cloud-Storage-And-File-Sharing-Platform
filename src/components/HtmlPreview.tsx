import { useState } from "react";
import { Code, Eye } from "lucide-react";
import { Button } from "@/components/ui/button";

interface HtmlPreviewProps {
  content: string;
  fileName: string;
  onContentChange?: (content: string) => void;
}

export function HtmlPreview({ content, fileName, onContentChange }: HtmlPreviewProps) {
  const [mode, setMode] = useState<"preview" | "code">("preview");

  return (
    <div className="flex flex-col w-full h-full">
      {/* Toggle bar */}
      <div className="flex items-center gap-1 px-3 py-1.5 border-b border-border bg-card/80 shrink-0">
        <Button
          variant={mode === "preview" ? "secondary" : "ghost"}
          size="sm"
          className="h-7 text-xs gap-1.5"
          onClick={() => setMode("preview")}
        >
          <Eye className="w-3.5 h-3.5" />
          Preview
        </Button>
        <Button
          variant={mode === "code" ? "secondary" : "ghost"}
          size="sm"
          className="h-7 text-xs gap-1.5"
          onClick={() => setMode("code")}
        >
          <Code className="w-3.5 h-3.5" />
          Code
        </Button>
        <span className="ml-auto text-[10px] text-muted-foreground">{fileName}</span>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-hidden">
        {mode === "preview" ? (
          <iframe
            srcDoc={content}
            className="w-full h-full border-0 bg-white"
            title={`Preview: ${fileName}`}
            sandbox="allow-scripts allow-same-origin"
          />
        ) : (
          <textarea
            value={onContentChange ? content : content}
            onChange={(e) => onContentChange?.(e.target.value)}
            readOnly={!onContentChange}
            className="w-full h-full font-mono text-sm bg-card p-4 resize-none focus:outline-none focus:ring-2 focus:ring-ring/30 text-foreground border-0"
            spellCheck={false}
            aria-label={`Source code: ${fileName}`}
          />
        )}
      </div>
    </div>
  );
}
