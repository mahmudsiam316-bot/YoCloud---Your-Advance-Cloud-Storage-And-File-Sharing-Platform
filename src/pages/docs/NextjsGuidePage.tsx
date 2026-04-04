import { useState, useEffect } from "react";
import { Check, AlertTriangle, FolderPlus, Play, Package, Shield, Copy, CheckCheck } from "lucide-react";
import DocsLayout, { CodeBlock, useDocsContext } from "@/components/docs/DocsLayout";
import nextjsIcon from "@/assets/nextjs-icon.png";

const SECTION_IDS = [
  "nextjs-overview",
  "nextjs-setup",
  "nextjs-env",
  "nextjs-types",
  "nextjs-client",
  "nextjs-upload-route",
  "nextjs-files-route",
  "nextjs-delete-route",
  "nextjs-uploader",
  "nextjs-filelist",
  "nextjs-page",
  "nextjs-run",
  "nextjs-structure",
  "nextjs-tips",
];

export default function NextjsGuidePage() {
  const [activeSection, setActiveSection] = useState("nextjs-overview");

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        for (const e of entries) if (e.isIntersecting) setActiveSection(e.target.id);
      },
      { rootMargin: "-80px 0px -60% 0px", threshold: 0.1 }
    );
    SECTION_IDS.forEach((id) => {
      const el = document.getElementById(id);
      if (el) observer.observe(el);
    });
    return () => observer.disconnect();
  }, []);

  return (
    <DocsLayout sectionIds={SECTION_IDS} activeSection={activeSection} onSectionChange={setActiveSection}>
      <Content />
    </DocsLayout>
  );
}

function Content() {
  const { selectedLang, showApiKey, setShowApiKey, activeKey, apiKeyDisplay, baseUrl, rawKeyAvailable } = useDocsContext();
  const codeProps = {
    showApiKey,
    onToggleKey: () => setShowApiKey(!showApiKey),
    hasKey: !!activeKey,
    baseUrl,
    apiKey: apiKeyDisplay,
    rawKeyAvailable,
  };

  return (
    <>
      {/* ── Overview ── */}
      <section id="nextjs-overview">
        <div className="flex items-center gap-3 mb-3">
          <img src={nextjsIcon} alt="Next.js" className="w-8 h-8 rounded-lg" />
          <div>
            <h2 className="text-xl md:text-2xl font-bold text-foreground">Next.js Integration Guide</h2>
            <p className="text-xs text-muted-foreground">Full working codebase — copy-paste every file</p>
          </div>
        </div>
        <p className="text-sm text-muted-foreground leading-relaxed mb-4">
          Build a complete file manager app with <strong className="text-foreground">Next.js 14+ App Router</strong> and the YoCloud API.
          This guide gives you every file you need — API client, server routes, uploader component, file list, and the main page.
          Every snippet includes correct imports so you can copy-paste directly.
        </p>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          {[
            { icon: Shield, title: "Server-Side Secure", desc: "API keys never leave the server. All calls proxied via API routes." },
            { icon: Package, title: "App Router", desc: "Next.js 14+ with Server Components, API Routes & TypeScript." },
            { icon: Play, title: "Copy-Paste Ready", desc: "Every file has full imports. Just paste and run." },
          ].map((f) => (
            <div key={f.title} className="p-3 rounded-xl border border-border bg-secondary/20">
              <f.icon className="w-5 h-5 text-primary mb-2" />
              <h3 className="text-sm font-bold text-foreground">{f.title}</h3>
              <p className="text-[11px] text-muted-foreground mt-1">{f.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ── Step 1: Setup ── */}
      <section id="nextjs-setup">
        <StepHeader step={1} title="Create Project & Install Dependencies" />
        <p className="text-[11px] text-muted-foreground mb-3">Create a new Next.js project and install the required package:</p>
        <CodeBlock
          code={`# Create project
npx create-next-app@latest my-yocloud-app --typescript --tailwind --eslint --app --src-dir
cd my-yocloud-app

# Install axios for HTTP requests
npm install axios`}
          lang="bash"
          {...codeProps}
        />
        <p className="text-[10px] text-muted-foreground mt-2">
          <code className="text-primary font-mono">axios</code> is only needed for the API client helper. All other imports are built into Next.js.
        </p>
      </section>

      {/* ── Step 2: Env ── */}
      <section id="nextjs-env">
        <StepHeader step={2} title="Environment Variables" />
        <p className="text-[11px] text-muted-foreground mb-3">
          Create <code className="text-primary font-mono">.env.local</code> in the project root:
        </p>
        <CodeBlock
          code={`# .env.local — git-ignored by default

YOCLOUD_API_KEY={{API_KEY}}
YOCLOUD_BASE_URL={{BASE_URL}}`}
          lang="bash"
          {...codeProps}
        />
        <div className="mt-2 p-2.5 rounded-lg bg-yellow-500/10 border border-yellow-500/20">
          <div className="flex items-start gap-2">
            <AlertTriangle className="w-3.5 h-3.5 text-yellow-500 mt-0.5 shrink-0" />
            <p className="text-[10px] text-muted-foreground">
              <strong className="text-foreground">Security:</strong> Do NOT prefix with{" "}
              <code className="font-mono">NEXT_PUBLIC_</code>. API keys must stay server-side only.
            </p>
          </div>
        </div>
      </section>

      {/* ── Step 3: Types ── */}
      <section id="nextjs-types">
        <StepHeader step={3} title="Shared Types" />
        <p className="text-[11px] text-muted-foreground mb-3">
          Create <code className="text-primary font-mono">src/types/yocloud.ts</code> — shared interfaces used everywhere:
        </p>
        <CodeBlock
          code={`// src/types/yocloud.ts

export interface CloudFile {
  id: string;
  name: string;
  size: number;
  mime_type: string;
  is_folder: boolean;
  cloudinary_url: string | null;
  created_at: string;
  updated_at: string;
}

export interface UploadResponse {
  file: CloudFile;
}

export interface FilesListResponse {
  files: CloudFile[];
  total: number;
  limit: number;
  offset: number;
}

export interface ApiError {
  error: string;
}`}
          lang="typescript"
          {...codeProps}
        />
      </section>

      {/* ── Step 4: API Client ── */}
      <section id="nextjs-client">
        <StepHeader step={4} title="API Client (Server-Only)" />
        <p className="text-[11px] text-muted-foreground mb-3">
          Create <code className="text-primary font-mono">src/lib/yocloud.ts</code> — this runs only on the server:
        </p>
        <CodeBlock
          code={`// src/lib/yocloud.ts
import type { CloudFile, FilesListResponse, UploadResponse } from "@/types/yocloud";

const API_KEY = process.env.YOCLOUD_API_KEY!;
const BASE_URL = process.env.YOCLOUD_BASE_URL!;

// ─── Generic fetch wrapper ───
async function api<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
  const url = \`\${BASE_URL}\${endpoint}\`;

  const res = await fetch(url, {
    ...options,
    headers: {
      "X-API-Key": API_KEY,
      "Content-Type": "application/json",
      ...options.headers,
    },
  });

  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.error || \`API error \${res.status}\`);
  }

  return res.json();
}

// ─── Typed helpers ───
export async function listFiles(limit = 50, offset = 0): Promise<FilesListResponse> {
  return api(\`/files?limit=\${limit}&offset=\${offset}\`);
}

export async function getFileDetails(id: string): Promise<{ file: CloudFile }> {
  return api(\`/files/\${id}/details\`);
}

export async function uploadFile(
  name: string,
  content_base64: string,
  mime_type?: string
): Promise<UploadResponse> {
  return api("/files/upload", {
    method: "POST",
    body: JSON.stringify({ name, content_base64, ...(mime_type && { mime_type }) }),
  });
}

export async function deleteFile(id: string): Promise<{ success: boolean }> {
  return api(\`/files/\${id}\`, { method: "DELETE" });
}

export async function createFolder(
  name: string,
  parent_id?: string
): Promise<{ folder: CloudFile }> {
  return api("/folders", {
    method: "POST",
    body: JSON.stringify({ name, ...(parent_id && { parent_id }) }),
  });
}`}
          lang="typescript"
          {...codeProps}
        />
      </section>

      {/* ── Step 5: Upload Route ── */}
      <section id="nextjs-upload-route">
        <StepHeader step={5} title="Upload API Route" />
        <p className="text-[11px] text-muted-foreground mb-3">
          Create <code className="text-primary font-mono">src/app/api/upload/route.ts</code>:
        </p>
        <CodeBlock
          code={`// src/app/api/upload/route.ts
import { NextRequest, NextResponse } from "next/server";
import { uploadFile } from "@/lib/yocloud";
import type { UploadResponse, ApiError } from "@/types/yocloud";

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get("file") as File | null;

    if (!file) {
      return NextResponse.json<ApiError>(
        { error: "No file provided" },
        { status: 400 }
      );
    }

    // Convert File → base64
    const bytes = await file.arrayBuffer();
    const content_base64 = Buffer.from(bytes).toString("base64");

    // Upload to YoCloud
    const result: UploadResponse = await uploadFile(
      file.name,
      content_base64,
      file.type
    );

    return NextResponse.json(result);
  } catch (error: any) {
    console.error("Upload error:", error);
    return NextResponse.json<ApiError>(
      { error: error.message || "Upload failed" },
      { status: 500 }
    );
  }
}

// Increase body size limit for large files
export const config = {
  api: { bodyParser: { sizeLimit: "100mb" } },
};`}
          lang="typescript"
          {...codeProps}
        />
      </section>

      {/* ── Step 6: Files Route ── */}
      <section id="nextjs-files-route">
        <StepHeader step={6} title="List Files API Route" />
        <p className="text-[11px] text-muted-foreground mb-3">
          Create <code className="text-primary font-mono">src/app/api/files/route.ts</code>:
        </p>
        <CodeBlock
          code={`// src/app/api/files/route.ts
import { NextRequest, NextResponse } from "next/server";
import { listFiles } from "@/lib/yocloud";
import type { ApiError } from "@/types/yocloud";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const limit = Number(searchParams.get("limit") || "50");
    const offset = Number(searchParams.get("offset") || "0");

    const data = await listFiles(limit, offset);
    return NextResponse.json(data);
  } catch (error: any) {
    console.error("List files error:", error);
    return NextResponse.json<ApiError>(
      { error: error.message || "Failed to fetch files" },
      { status: 500 }
    );
  }
}`}
          lang="typescript"
          {...codeProps}
        />
      </section>

      {/* ── Step 7: Delete Route ── */}
      <section id="nextjs-delete-route">
        <StepHeader step={7} title="Delete File API Route" />
        <p className="text-[11px] text-muted-foreground mb-3">
          Create <code className="text-primary font-mono">src/app/api/files/[id]/route.ts</code>:
        </p>
        <CodeBlock
          code={`// src/app/api/files/[id]/route.ts
import { NextRequest, NextResponse } from "next/server";
import { deleteFile, getFileDetails } from "@/lib/yocloud";
import type { ApiError } from "@/types/yocloud";

// GET /api/files/:id → file details
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const data = await getFileDetails(params.id);
    return NextResponse.json(data);
  } catch (error: any) {
    return NextResponse.json<ApiError>(
      { error: error.message },
      { status: 500 }
    );
  }
}

// DELETE /api/files/:id → delete file
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const result = await deleteFile(params.id);
    return NextResponse.json(result);
  } catch (error: any) {
    return NextResponse.json<ApiError>(
      { error: error.message },
      { status: 500 }
    );
  }
}`}
          lang="typescript"
          {...codeProps}
        />
      </section>

      {/* ── Step 8: Uploader Component ── */}
      <section id="nextjs-uploader">
        <StepHeader step={8} title="FileUploader Component" />
        <p className="text-[11px] text-muted-foreground mb-3">
          Create <code className="text-primary font-mono">src/components/FileUploader.tsx</code> — drag & drop, progress bar, multi-file queue:
        </p>
        <CodeBlock
          code={`// src/components/FileUploader.tsx
"use client";

import { useState, useRef, useCallback } from "react";
import type { CloudFile } from "@/types/yocloud";

// ─── Types ───
interface QueueItem {
  id: string;
  file: File;
  progress: number;
  status: "queued" | "uploading" | "done" | "error";
  result?: CloudFile;
  error?: string;
}

// ─── Helpers ───
function formatBytes(bytes: number): string {
  if (bytes < 1024) return bytes + " B";
  if (bytes < 1048576) return (bytes / 1024).toFixed(1) + " KB";
  return (bytes / 1048576).toFixed(2) + " MB";
}

function generateId(): string {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
}

// ─── Upload with XHR for real progress ───
function uploadWithProgress(
  file: File,
  onProgress: (percent: number) => void
): Promise<CloudFile> {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    const formData = new FormData();
    formData.append("file", file);

    xhr.open("POST", "/api/upload");

    // Track real upload progress
    xhr.upload.onprogress = (e) => {
      if (e.lengthComputable) {
        const pct = Math.round((e.loaded / e.total) * 95);
        onProgress(pct);
      }
    };

    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        onProgress(100);
        try {
          const data = JSON.parse(xhr.responseText);
          resolve(data.file);
        } catch {
          reject(new Error("Invalid response"));
        }
      } else {
        try {
          const err = JSON.parse(xhr.responseText);
          reject(new Error(err.error || \`Upload failed (\${xhr.status})\`));
        } catch {
          reject(new Error(\`Upload failed (\${xhr.status})\`));
        }
      }
    };

    xhr.onerror = () => reject(new Error("Network error"));
    xhr.ontimeout = () => reject(new Error("Upload timed out"));
    xhr.timeout = 300000; // 5 min timeout

    xhr.send(formData);
  });
}

// ─── Component ───
export default function FileUploader({
  onUploadComplete,
}: {
  onUploadComplete?: () => void;
}) {
  const [queue, setQueue] = useState<QueueItem[]>([]);
  const [isDragging, setIsDragging] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const processingRef = useRef(false);

  // Update a single queue item
  const updateItem = useCallback(
    (id: string, updates: Partial<QueueItem>) => {
      setQueue((prev) =>
        prev.map((item) => (item.id === id ? { ...item, ...updates } : item))
      );
    },
    []
  );

  // Process the queue sequentially
  const processQueue = useCallback(
    async (items: QueueItem[]) => {
      if (processingRef.current) return;
      processingRef.current = true;

      for (const item of items) {
        updateItem(item.id, { status: "uploading", progress: 0 });

        try {
          const result = await uploadWithProgress(item.file, (progress) => {
            updateItem(item.id, { progress });
          });

          updateItem(item.id, {
            status: "done",
            progress: 100,
            result,
          });
        } catch (err: any) {
          updateItem(item.id, {
            status: "error",
            error: err.message || "Upload failed",
          });
        }
      }

      processingRef.current = false;
      onUploadComplete?.();
    },
    [updateItem, onUploadComplete]
  );

  // Add files to queue
  const addFiles = useCallback(
    (fileList: FileList | File[]) => {
      const newItems: QueueItem[] = Array.from(fileList).map((file) => ({
        id: generateId(),
        file,
        progress: 0,
        status: "queued" as const,
      }));

      setQueue((prev) => [...prev, ...newItems]);
      processQueue(newItems);
    },
    [processQueue]
  );

  // Drag handlers
  const onDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };
  const onDragLeave = () => setIsDragging(false);
  const onDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files.length) addFiles(e.dataTransfer.files);
  };

  const clearDone = () =>
    setQueue((prev) => prev.filter((q) => q.status !== "done"));

  const doneCount = queue.filter((q) => q.status === "done").length;
  const activeCount = queue.filter(
    (q) => q.status === "uploading" || q.status === "queued"
  ).length;

  return (
    <div className="space-y-4">
      {/* ── Drop Zone ── */}
      <div
        onDragOver={onDragOver}
        onDragLeave={onDragLeave}
        onDrop={onDrop}
        onClick={() => inputRef.current?.click()}
        className={\`
          border-2 border-dashed rounded-xl p-8 text-center cursor-pointer
          transition-all duration-200
          \${isDragging
            ? "border-blue-500 bg-blue-50 scale-[1.01]"
            : "border-gray-300 hover:border-blue-400 hover:bg-gray-50"
          }
        \`}
      >
        <div className="text-4xl mb-2">📁</div>
        <p className="text-lg font-medium text-gray-700">
          {isDragging ? "Drop files here!" : "Drag & drop files here"}
        </p>
        <p className="text-sm text-gray-500 mt-1">
          or click to browse · max 100MB per file
        </p>
        <input
          ref={inputRef}
          type="file"
          multiple
          className="hidden"
          onChange={(e) => {
            if (e.target.files?.length) addFiles(e.target.files);
            e.target.value = "";
          }}
        />
      </div>

      {/* ── Queue List ── */}
      {queue.length > 0 && (
        <div className="rounded-xl border border-gray-200 overflow-hidden">
          {/* Header */}
          <div className="flex justify-between items-center px-4 py-2.5 bg-gray-50 border-b border-gray-200">
            <p className="text-sm font-semibold text-gray-700">
              {activeCount > 0
                ? \`Uploading \${activeCount} file\${activeCount > 1 ? "s" : ""}...\`
                : \`\${doneCount} of \${queue.length} uploaded\`}
            </p>
            {doneCount > 0 && (
              <button
                onClick={clearDone}
                className="text-xs text-blue-600 hover:underline"
              >
                Clear completed
              </button>
            )}
          </div>

          {/* Scrollable file list */}
          <div className="max-h-80 overflow-y-auto divide-y divide-gray-100">
            {queue.map((item) => (
              <div key={item.id} className="px-4 py-3">
                {/* File info row */}
                <div className="flex items-center justify-between mb-1.5">
                  <div className="flex items-center gap-2 min-w-0 flex-1">
                    <span className="text-base shrink-0">
                      {item.status === "done"
                        ? "✅"
                        : item.status === "error"
                        ? "❌"
                        : item.status === "uploading"
                        ? "⬆️"
                        : "⏳"}
                    </span>
                    <p className="text-sm font-medium text-gray-800 truncate">
                      {item.file.name}
                    </p>
                  </div>
                  <span className="text-xs text-gray-500 shrink-0 ml-2">
                    {formatBytes(item.file.size)}
                  </span>
                </div>

                {/* Progress bar */}
                {(item.status === "uploading" || item.status === "queued") && (
                  <div className="w-full bg-gray-200 rounded-full h-2 mb-1">
                    <div
                      className="bg-blue-600 h-2 rounded-full transition-all duration-300 ease-out"
                      style={{ width: \`\${item.progress}%\` }}
                    />
                  </div>
                )}

                {/* Status text */}
                <p className={\`text-xs \${
                  item.status === "done"
                    ? "text-green-600"
                    : item.status === "error"
                    ? "text-red-600"
                    : item.status === "uploading"
                    ? "text-blue-600"
                    : "text-gray-400"
                }\`}>
                  {item.status === "queued" && "Waiting in queue..."}
                  {item.status === "uploading" && \`Uploading — \${item.progress}%\`}
                  {item.status === "done" && "Upload complete"}
                  {item.status === "error" && (item.error || "Upload failed")}
                </p>

                {/* File details after upload */}
                {item.status === "done" && item.result && (
                  <div className="mt-2 p-3 rounded-lg bg-green-50 border border-green-200 text-xs space-y-1">
                    <p className="text-gray-700">
                      <strong>File ID:</strong>{" "}
                      <code className="bg-white px-1 py-0.5 rounded text-green-700">
                        {item.result.id}
                      </code>
                    </p>
                    <p className="text-gray-700">
                      <strong>Type:</strong> {item.result.mime_type}
                    </p>
                    <p className="text-gray-700">
                      <strong>Size:</strong> {formatBytes(item.result.size)}
                    </p>
                    <p className="text-gray-700">
                      <strong>Created:</strong>{" "}
                      {new Date(item.result.created_at).toLocaleString()}
                    </p>
                    {item.result.cloudinary_url && (
                      <a
                        href={item.result.cloudinary_url}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-block text-blue-600 hover:underline mt-1"
                      >
                        🔗 View / Download file
                      </a>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}`}
          lang="typescript"
          {...codeProps}
        />

        <div className="mt-3 p-3 rounded-xl border border-border bg-secondary/20">
          <p className="text-[10px] font-semibold text-foreground mb-1">📋 What this component includes:</p>
          <ul className="space-y-1 text-[10px] text-muted-foreground">
            <li className="flex gap-2"><Check className="w-3 h-3 text-emerald-500 shrink-0 mt-0.5" /><span><strong className="text-foreground">Drag & Drop</strong> — drop zone with visual feedback</span></li>
            <li className="flex gap-2"><Check className="w-3 h-3 text-emerald-500 shrink-0 mt-0.5" /><span><strong className="text-foreground">Real XHR Progress</strong> — actual upload percentage, not fake</span></li>
            <li className="flex gap-2"><Check className="w-3 h-3 text-emerald-500 shrink-0 mt-0.5" /><span><strong className="text-foreground">Multi-file Queue</strong> — sequential processing, scrollable list</span></li>
            <li className="flex gap-2"><Check className="w-3 h-3 text-emerald-500 shrink-0 mt-0.5" /><span><strong className="text-foreground">File Details</strong> — ID, type, size, date & download link after upload</span></li>
            <li className="flex gap-2"><Check className="w-3 h-3 text-emerald-500 shrink-0 mt-0.5" /><span><strong className="text-foreground">Error Handling</strong> — per-file error messages with 5-min timeout</span></li>
          </ul>
        </div>
      </section>

      {/* ── Step 9: FileList Component ── */}
      <section id="nextjs-filelist">
        <StepHeader step={9} title="FileList Component" />
        <p className="text-[11px] text-muted-foreground mb-3">
          Create <code className="text-primary font-mono">src/components/FileList.tsx</code> — fetches & displays files with delete:
        </p>
        <CodeBlock
          code={`// src/components/FileList.tsx
"use client";

import { useState, useEffect, useCallback } from "react";
import type { CloudFile } from "@/types/yocloud";

function formatBytes(bytes: number): string {
  if (bytes < 1024) return bytes + " B";
  if (bytes < 1048576) return (bytes / 1024).toFixed(1) + " KB";
  return (bytes / 1048576).toFixed(2) + " MB";
}

export default function FileList({ refreshKey }: { refreshKey?: number }) {
  const [files, setFiles] = useState<CloudFile[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchFiles = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/files?limit=50&offset=0");
      const data = await res.json();
      if (res.ok) {
        setFiles(data.files || []);
      } else {
        setError(data.error || "Failed to load files");
      }
    } catch {
      setError("Network error");
    } finally {
      setLoading(false);
    }
  }, []);

  // Refresh when refreshKey changes (after upload)
  useEffect(() => {
    fetchFiles();
  }, [fetchFiles, refreshKey]);

  const handleDelete = async (id: string, name: string) => {
    if (!confirm(\`Delete "\${name}"?\`)) return;
    try {
      const res = await fetch(\`/api/files/\${id}\`, { method: "DELETE" });
      if (res.ok) {
        setFiles((prev) => prev.filter((f) => f.id !== id));
      } else {
        const data = await res.json();
        alert(data.error || "Delete failed");
      }
    } catch {
      alert("Network error");
    }
  };

  if (loading) {
    return (
      <div className="text-center py-12 text-gray-400">
        <div className="animate-spin text-3xl mb-2">⏳</div>
        Loading files...
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-12">
        <p className="text-red-500 mb-2">❌ {error}</p>
        <button onClick={fetchFiles} className="text-blue-600 hover:underline text-sm">
          Retry
        </button>
      </div>
    );
  }

  if (files.length === 0) {
    return (
      <div className="text-center py-16 text-gray-400">
        <div className="text-4xl mb-2">📂</div>
        <p>No files yet. Upload something above!</p>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {files.map((file) => (
        <div
          key={file.id}
          className="flex items-center gap-4 p-4 rounded-lg border border-gray-200 hover:bg-gray-50 transition-colors"
        >
          <span className="text-2xl">{file.is_folder ? "📁" : "📄"}</span>
          <div className="flex-1 min-w-0">
            <p className="font-medium text-gray-800 truncate">{file.name}</p>
            <p className="text-sm text-gray-500">
              {file.is_folder
                ? "Folder"
                : \`\${formatBytes(file.size)} · \${file.mime_type}\`}
            </p>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            {file.cloudinary_url && (
              <a
                href={file.cloudinary_url}
                target="_blank"
                rel="noreferrer"
                className="text-blue-600 text-sm hover:underline"
              >
                Download
              </a>
            )}
            <button
              onClick={() => handleDelete(file.id, file.name)}
              className="text-red-500 text-sm hover:underline"
            >
              Delete
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}`}
          lang="typescript"
          {...codeProps}
        />
      </section>

      {/* ── Step 10: Main Page ── */}
      <section id="nextjs-page">
        <StepHeader step={10} title="Main Page — Putting It Together" />
        <p className="text-[11px] text-muted-foreground mb-3">
          Update <code className="text-primary font-mono">src/app/page.tsx</code> — combines uploader + file list:
        </p>
        <CodeBlock
          code={`// src/app/page.tsx
"use client";

import { useState } from "react";
import FileUploader from "@/components/FileUploader";
import FileList from "@/components/FileList";

export default function HomePage() {
  // Increment to trigger file list refresh after upload
  const [refreshKey, setRefreshKey] = useState(0);

  return (
    <main className="max-w-3xl mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold text-gray-900 mb-2">
        My Cloud Files
      </h1>
      <p className="text-gray-500 mb-8">
        Upload and manage your files with YoCloud
      </p>

      {/* Upload section */}
      <section className="mb-8">
        <h2 className="text-xl font-semibold text-gray-800 mb-4">
          Upload Files
        </h2>
        <FileUploader
          onUploadComplete={() => setRefreshKey((k) => k + 1)}
        />
      </section>

      {/* File list section */}
      <section>
        <h2 className="text-xl font-semibold text-gray-800 mb-4">
          Your Files
        </h2>
        <FileList refreshKey={refreshKey} />
      </section>
    </main>
  );
}`}
          lang="typescript"
          {...codeProps}
        />
      </section>

      {/* ── Step 11: Run ── */}
      <section id="nextjs-run">
        <StepHeader step={11} title="Run the Dev Server" last />
        <CodeBlock
          code={`npm run dev

# ✅ App running at http://localhost:3000
# ✅ Upload files via drag & drop or click
# ✅ Files auto-refresh after upload
# ✅ Delete files from the list`}
          lang="bash"
          {...codeProps}
        />
      </section>

      {/* ── Project Structure ── */}
      <section id="nextjs-structure">
        <div className="p-4 rounded-xl border border-border bg-secondary/20">
          <h3 className="text-sm font-bold text-foreground mb-2 flex items-center gap-2">
            <FolderPlus className="w-4 h-4 text-primary" />
            Complete Project Structure
          </h3>
          <pre className="text-[11px] font-mono text-muted-foreground whitespace-pre leading-relaxed">{`my-yocloud-app/
├── .env.local                    ← API key (git-ignored)
├── package.json
├── tsconfig.json
└── src/
    ├── types/
    │   └── yocloud.ts            ← Shared TypeScript interfaces
    ├── lib/
    │   └── yocloud.ts            ← Server-only API client
    ├── app/
    │   ├── page.tsx              ← Main page (uploader + file list)
    │   ├── layout.tsx            ← Root layout (auto-generated)
    │   └── api/
    │       ├── upload/
    │       │   └── route.ts      ← POST /api/upload
    │       └── files/
    │           ├── route.ts      ← GET /api/files
    │           └── [id]/
    │               └── route.ts  ← GET & DELETE /api/files/:id
    └── components/
        ├── FileUploader.tsx      ← Drag & drop uploader with progress
        └── FileList.tsx          ← File listing with delete`}</pre>
        </div>
      </section>

      {/* ── Tips ── */}
      <section id="nextjs-tips">
        <div className="p-4 rounded-xl border border-border bg-primary/5">
          <h3 className="text-sm font-bold text-foreground mb-2">💡 Pro Tips</h3>
          <ul className="space-y-1.5 text-[11px] text-muted-foreground">
            <li className="flex gap-2"><Check className="w-3.5 h-3.5 text-emerald-500 shrink-0 mt-0.5" /><span>All API keys stay <strong className="text-foreground">server-side</strong> — never exposed to the browser</span></li>
            <li className="flex gap-2"><Check className="w-3.5 h-3.5 text-emerald-500 shrink-0 mt-0.5" /><span>Use <strong className="text-foreground">revalidatePath("/")</strong> in API routes for ISR cache busting</span></li>
            <li className="flex gap-2"><Check className="w-3.5 h-3.5 text-emerald-500 shrink-0 mt-0.5" /><span>Add <strong className="text-foreground">loading.tsx</strong> for Suspense skeleton states</span></li>
            <li className="flex gap-2"><Check className="w-3.5 h-3.5 text-emerald-500 shrink-0 mt-0.5" /><span>Add <strong className="text-foreground">error.tsx</strong> for error boundaries per route</span></li>
            <li className="flex gap-2"><Check className="w-3.5 h-3.5 text-emerald-500 shrink-0 mt-0.5" /><span>Use <strong className="text-foreground">middleware.ts</strong> to protect routes with auth</span></li>
          </ul>
        </div>
      </section>
    </>
  );
}

function StepHeader({ step, title, last }: { step: number; title: string; last?: boolean }) {
  return (
    <div className="flex items-center gap-3 mb-2">
      <div className="w-7 h-7 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-xs font-bold shrink-0">
        {step}
      </div>
      <h3 className="text-base md:text-lg font-bold text-foreground">{title}</h3>
    </div>
  );
}
