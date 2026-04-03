import { useState } from "react";
import { Code, Eye } from "lucide-react";
import { Button } from "@/components/ui/button";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

interface MarkdownPreviewProps {
  content: string;
  fileName: string;
  onContentChange?: (content: string) => void;
}

export function MarkdownPreview({ content, fileName, onContentChange }: MarkdownPreviewProps) {
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
          Source
        </Button>
        <span className="ml-auto text-[10px] text-muted-foreground">{fileName}</span>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-auto">
        {mode === "preview" ? (
          <div className="prose prose-sm dark:prose-invert max-w-none p-6">
            <ReactMarkdown remarkPlugins={[remarkGfm]}>{content}</ReactMarkdown>
          </div>
        ) : (
          <textarea
            value={content}
            onChange={(e) => onContentChange?.(e.target.value)}
            readOnly={!onContentChange}
            className="w-full h-full font-mono text-sm bg-card p-4 resize-none focus:outline-none focus:ring-2 focus:ring-ring/30 text-foreground border-0"
            spellCheck={false}
            aria-label={`Source: ${fileName}`}
          />
        )}
      </div>
    </div>
  );
}
