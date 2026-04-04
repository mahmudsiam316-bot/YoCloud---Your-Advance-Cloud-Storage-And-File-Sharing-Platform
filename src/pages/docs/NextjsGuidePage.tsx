import { useEffect, useState } from "react";
import { AlertTriangle, Check, FolderPlus, Package, Play, Shield } from "lucide-react";
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
  "nextjs-manager",
  "nextjs-page",
  "nextjs-run",
  "nextjs-structure",
  "nextjs-tips",
];

const SETUP_CODE = String.raw`# Create project
npx create-next-app@latest my-yocloud-app --typescript --tailwind --eslint --app --src-dir
cd my-yocloud-app

# No extra package is required for this uploader example
# Next.js + the built-in fetch API are enough`;

const ENV_CODE = String.raw`# .env.local
YOCLOUD_API_KEY={{API_KEY}}
YOCLOUD_BASE_URL={{BASE_URL}}`;

const TYPES_CODE = String.raw`// src/types/yocloud.ts
export interface CloudFile {
  id: string;
  name: string;
  size: number | null;
  mime_type: string | null;
  is_folder: boolean;
  parent_id: string | null;
  workspace_id: string | null;
  cloudinary_url: string | null;
  created_at: string;
  updated_at: string;
}

export interface UploadResponse {
  file: CloudFile;
  upload_details?: {
    size?: string;
    cloudinary_id?: string;
  };
}

export interface FilesListResponse {
  files: CloudFile[];
  count: number;
  limit: number;
  offset: number;
}

export interface ApiError {
  error: string;
  help?: string;
  status_code?: number;
}`;

const CLIENT_CODE = String.raw`// src/lib/yocloud.ts
import "server-only";
import type { ApiError, CloudFile, FilesListResponse, UploadResponse } from "@/types/yocloud";

const API_KEY = process.env.YOCLOUD_API_KEY;
const BASE_URL = process.env.YOCLOUD_BASE_URL;

if (!API_KEY || !BASE_URL) {
  throw new Error("Missing YOCLOUD_API_KEY or YOCLOUD_BASE_URL in .env.local");
}

const API_BASE = BASE_URL.replace(/\/$/, "");

async function api<T>(path: string, init: RequestInit = {}): Promise<T> {
  const response = await fetch(\`\${API_BASE}\${path}\`, {
    ...init,
    headers: {
      "X-API-Key": API_KEY,
      ...(init.body ? { "Content-Type": "application/json" } : {}),
      ...init.headers,
    },
    cache: "no-store",
  });

  const payload = (await response.json().catch(() => null)) as T | ApiError | null;

  if (!response.ok) {
    const errorMessage =
      payload && typeof payload === "object" && "error" in payload
        ? payload.error
        : \`API request failed with status \${response.status}\`;

    throw new Error(errorMessage);
  }

  return payload as T;
}

export async function listFiles(options?: {
  limit?: number;
  offset?: number;
  parentId?: string | null;
}): Promise<FilesListResponse> {
  const params = new URLSearchParams();
  params.set("limit", String(options?.limit ?? 50));
  params.set("offset", String(options?.offset ?? 0));

  if (options?.parentId) {
    params.set("parent_id", options.parentId);
  }

  return api<FilesListResponse>(\`/files?\${params.toString()}\`);
}

export async function getFileDetails(id: string): Promise<{ file: CloudFile }> {
  return api<{ file: CloudFile }>(\`/files/\${id}/details\`);
}

export async function uploadFile(input: {
  name: string;
  contentBase64: string;
  mimeType?: string;
  parentId?: string | null;
  workspaceId?: string | null;
}): Promise<UploadResponse> {
  return api<UploadResponse>("/files/upload", {
    method: "POST",
    body: JSON.stringify({
      name: input.name,
      content_base64: input.contentBase64,
      ...(input.mimeType ? { mime_type: input.mimeType } : {}),
      ...(input.parentId ? { parent_id: input.parentId } : {}),
      ...(input.workspaceId ? { workspace_id: input.workspaceId } : {}),
    }),
  });
}

export async function deleteFile(id: string): Promise<{ message: string }> {
  return api<{ message: string }>(\`/files/\${id}\`, {
    method: "DELETE",
  });
}`;

const UPLOAD_ROUTE_CODE = String.raw`// src/app/api/upload/route.ts
import { NextRequest, NextResponse } from "next/server";
import { uploadFile } from "@/lib/yocloud";
import type { ApiError } from "@/types/yocloud";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const MAX_FILE_BYTES = 100 * 1024 * 1024;

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get("file");
    const parentId = formData.get("parentId")?.toString() || null;
    const workspaceId = formData.get("workspaceId")?.toString() || null;

    if (!(file instanceof File)) {
      return NextResponse.json<ApiError>(
        { error: "No file selected" },
        { status: 400 }
      );
    }

    if (file.size > MAX_FILE_BYTES) {
      return NextResponse.json<ApiError>(
        { error: "File exceeds 100MB limit" },
        { status: 400 }
      );
    }

    const bytes = Buffer.from(await file.arrayBuffer());
    const result = await uploadFile({
      name: file.name,
      contentBase64: bytes.toString("base64"),
      mimeType: file.type || "application/octet-stream",
      parentId,
      workspaceId,
    });

    return NextResponse.json(result, { status: 201 });
  } catch (error) {
    return NextResponse.json<ApiError>(
      {
        error:
          error instanceof Error ? error.message : "Upload failed unexpectedly",
      },
      { status: 500 }
    );
  }
}`;

const FILES_ROUTE_CODE = String.raw`// src/app/api/files/route.ts
import { NextRequest, NextResponse } from "next/server";
import { listFiles } from "@/lib/yocloud";
import type { ApiError } from "@/types/yocloud";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);

    const limit = Number(searchParams.get("limit") || "50");
    const offset = Number(searchParams.get("offset") || "0");
    const parentId = searchParams.get("parent_id");

    const data = await listFiles({
      limit,
      offset,
      parentId: parentId || null,
    });

    return NextResponse.json(data);
  } catch (error) {
    return NextResponse.json<ApiError>(
      {
        error:
          error instanceof Error
            ? error.message
            : "Failed to load file list",
      },
      { status: 500 }
    );
  }
}`;

const DELETE_ROUTE_CODE = String.raw`// src/app/api/files/[id]/route.ts
import { NextRequest, NextResponse } from "next/server";
import { deleteFile, getFileDetails } from "@/lib/yocloud";
import type { ApiError } from "@/types/yocloud";

export const dynamic = "force-dynamic";

export async function GET(
  _request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const data = await getFileDetails(params.id);
    return NextResponse.json(data);
  } catch (error) {
    return NextResponse.json<ApiError>(
      {
        error:
          error instanceof Error
            ? error.message
            : "Failed to load file details",
      },
      { status: 500 }
    );
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const data = await deleteFile(params.id);
    return NextResponse.json(data);
  } catch (error) {
    return NextResponse.json<ApiError>(
      {
        error:
          error instanceof Error
            ? error.message
            : "Failed to delete file",
      },
      { status: 500 }
    );
  }
}`;

const UPLOADER_CODE = String.raw`// src/components/FileUploader.tsx
"use client";

import { useCallback, useRef, useState } from "react";
import type { CloudFile } from "@/types/yocloud";

type UploadStatus = "queued" | "uploading" | "done" | "error";

interface QueueItem {
  id: string;
  file: File;
  progress: number;
  status: UploadStatus;
  result?: CloudFile;
  error?: string;
}

function uid() {
  return Math.random().toString(36).slice(2) + Date.now().toString(36);
}

function formatBytes(bytes?: number | null) {
  if (!bytes) return "0 B";
  if (bytes < 1024) return bytes + " B";
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + " KB";
  return (bytes / (1024 * 1024)).toFixed(2) + " MB";
}

function xhrUpload(
  file: File,
  onProgress: (pct: number) => void
): Promise<CloudFile> {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    const fd = new FormData();
    fd.append("file", file);

    xhr.open("POST", "/api/upload");
    xhr.responseType = "json";
    xhr.timeout = 300_000;

    xhr.upload.onprogress = (e) => {
      if (e.lengthComputable) onProgress(Math.round((e.loaded / e.total) * 100));
    };

    xhr.onload = () => {
      const data = xhr.response ?? (xhr.responseText ? JSON.parse(xhr.responseText) : null);
      if (xhr.status >= 200 && xhr.status < 300 && data?.file) {
        resolve(data.file as CloudFile);
      } else {
        reject(new Error(data?.error || "Upload failed (" + xhr.status + ")"));
      }
    };

    xhr.onerror = () => reject(new Error("Network error"));
    xhr.ontimeout = () => reject(new Error("Upload timed out"));
    xhr.send(fd);
  });
}

export default function FileUploader({
  onUploadComplete,
}: {
  onUploadComplete?: (files: CloudFile[]) => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const busyRef = useRef(false);

  const [items, setItems] = useState<QueueItem[]>([]);
  const [isDragging, setIsDragging] = useState(false);

  // --- Queue processor (reads latest state via callback) ---
  const processQueue = useCallback(async () => {
    if (busyRef.current) return;
    busyRef.current = true;

    const uploaded: CloudFile[] = [];

    while (true) {
      // Get the next queued item from the latest state
      let nextItem: QueueItem | undefined;
      await new Promise<void>((r) => {
        setItems((prev) => {
          nextItem = prev.find((i) => i.status === "queued");
          return prev; // no mutation
        });
        r();
      });

      if (!nextItem) break;
      const itemId = nextItem.id;

      // Mark uploading
      setItems((prev) =>
        prev.map((i) => (i.id === itemId ? { ...i, status: "uploading" as const, progress: 0 } : i))
      );

      try {
        const result = await xhrUpload(nextItem.file, (pct) => {
          setItems((prev) =>
            prev.map((i) => (i.id === itemId ? { ...i, progress: pct } : i))
          );
        });
        uploaded.push(result);
        setItems((prev) =>
          prev.map((i) =>
            i.id === itemId ? { ...i, status: "done" as const, progress: 100, result } : i
          )
        );
      } catch (err) {
        setItems((prev) =>
          prev.map((i) =>
            i.id === itemId
              ? { ...i, status: "error" as const, error: err instanceof Error ? err.message : "Failed" }
              : i
          )
        );
      }
    }

    busyRef.current = false;
    if (uploaded.length > 0) onUploadComplete?.(uploaded);
  }, [onUploadComplete]);

  // --- Add files to queue ---
  const addFiles = useCallback(
    (fileList: FileList | File[]) => {
      const newItems: QueueItem[] = Array.from(fileList).map((file) => ({
        id: uid(),
        file,
        progress: 0,
        status: "queued" as const,
      }));
      if (newItems.length === 0) return;
      setItems((prev) => [...prev, ...newItems]);
      // Kick the processor (safe even if already running)
      setTimeout(() => processQueue(), 0);
    },
    [processQueue]
  );

  const clearDone = () => setItems((prev) => prev.filter((i) => i.status !== "done"));

  const activeCount = items.filter((i) => i.status === "queued" || i.status === "uploading").length;

  return (
    <div className="space-y-4">
      {/* Drop zone */}
      <div
        onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
        onDragLeave={(e) => { e.preventDefault(); setIsDragging(false); }}
        onDrop={(e) => {
          e.preventDefault();
          setIsDragging(false);
          if (e.dataTransfer.files.length) addFiles(e.dataTransfer.files);
        }}
        className={"rounded-2xl border-2 border-dashed p-8 transition " +
          (isDragging ? "border-blue-500 bg-blue-50" : "border-gray-300 bg-white")}
      >
        <div className="mx-auto max-w-xl text-center">
          <div className="text-4xl">📤</div>
          <h2 className="mt-3 text-xl font-semibold text-gray-900">
            Drag & drop files here
          </h2>
          <p className="mt-2 text-sm text-gray-500">Or click the button below</p>

          <div className="mt-5 flex flex-wrap items-center justify-center gap-3">
            <button
              type="button"
              onClick={() => inputRef.current?.click()}
              className="rounded-lg bg-gray-900 px-4 py-2 text-sm font-medium text-white hover:bg-gray-800"
            >
              Browse files
            </button>
            <span className="text-xs text-gray-500">Max 100 MB per file</span>
          </div>

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
      </div>

      {/* Queue list */}
      {items.length > 0 && (
        <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white">
          <div className="flex items-center justify-between border-b border-gray-200 px-4 py-3">
            <p className="text-sm font-semibold text-gray-900">
              {activeCount > 0 ? activeCount + " uploading…" : "All done"}
            </p>
            <button type="button" onClick={clearDone} className="text-xs font-medium text-blue-600">
              Clear completed
            </button>
          </div>

          <div className="max-h-80 overflow-y-auto divide-y divide-gray-100">
            {items.map((item) => (
              <div key={item.id} className="px-4 py-3">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-gray-900">{item.file.name}</p>
                    <p className="mt-0.5 text-xs text-gray-500">{formatBytes(item.file.size)}</p>
                  </div>
                  <span className="shrink-0 text-xs font-medium text-gray-500">
                    {item.status === "queued" && "Queued"}
                    {item.status === "uploading" && item.progress + "%"}
                    {item.status === "done" && "✓ Done"}
                    {item.status === "error" && "✗ Error"}
                  </span>
                </div>

                {(item.status === "queued" || item.status === "uploading") && (
                  <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-gray-200">
                    <div
                      className="h-full rounded-full bg-blue-600 transition-all duration-300"
                      style={{ width: item.progress + "%" }}
                    />
                  </div>
                )}

                {item.status === "error" && (
                  <p className="mt-1 text-xs text-red-600">{item.error}</p>
                )}

                {item.status === "done" && item.result && (
                  <div className="mt-2 rounded-lg border border-green-200 bg-green-50 p-2.5 text-xs text-gray-700 space-y-0.5">
                    <p><strong>ID:</strong> {item.result.id}</p>
                    <p><strong>Type:</strong> {item.result.mime_type || "unknown"}</p>
                    <p><strong>Created:</strong> {new Date(item.result.created_at).toLocaleString()}</p>
                    {item.result.cloudinary_url && (
                      <a href={item.result.cloudinary_url} target="_blank" rel="noreferrer"
                        className="mt-1 inline-block text-blue-600 underline">
                        Open file ↗
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
}`;

const FILE_LIST_CODE = String.raw`// src/components/FileList.tsx
"use client";

import { useCallback, useEffect, useState } from "react";
import type { CloudFile } from "@/types/yocloud";

function formatBytes(bytes?: number | null) {
  if (!bytes) return "0 B";
  if (bytes < 1024) return \`\${bytes} B\`;
  if (bytes < 1024 * 1024) return \`\${(bytes / 1024).toFixed(1)} KB\`;
  return \`\${(bytes / 1024 / 1024).toFixed(2)} MB\`;
}

export default function FileList({
  initialFiles,
  initialError,
  refreshToken,
}: {
  initialFiles: CloudFile[];
  initialError?: string | null;
  refreshToken: number;
}) {
  const [files, setFiles] = useState(initialFiles);
  const [error, setError] = useState<string | null>(initialError ?? null);
  const [refreshing, setRefreshing] = useState(false);

  const fetchFiles = useCallback(async () => {
    setRefreshing(true);

    try {
      const response = await fetch("/api/files?limit=50&offset=0", {
        cache: "no-store",
      });
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to load files");
      }

      setFiles(data.files || []);
      setError(null);
    } catch (fetchError) {
      setError(
        fetchError instanceof Error
          ? fetchError.message
          : "Failed to refresh files"
      );
    } finally {
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    if (refreshToken === 0) return;
    void fetchFiles();
  }, [refreshToken, fetchFiles]);

  const handleDelete = async (id: string, name: string) => {
    const confirmed = window.confirm(\`Move "\${name}" to trash?\`);
    if (!confirmed) return;

    const previousFiles = files;
    setFiles((current) => current.filter((file) => file.id !== id));

    try {
      const response = await fetch(\`/api/files/\${id}\`, {
        method: "DELETE",
        cache: "no-store",
      });
      const data = await response.json().catch(() => null);

      if (!response.ok) {
        throw new Error(data?.error || "Delete failed");
      }
    } catch (deleteError) {
      setFiles(previousFiles);
      setError(
        deleteError instanceof Error
          ? deleteError.message
          : "Delete failed"
      );
    }
  };

  if (error) {
    return (
      <div className="rounded-2xl border border-red-200 bg-red-50 p-4">
        <p className="text-sm font-medium text-red-700">{error}</p>
        <button
          type="button"
          onClick={() => void fetchFiles()}
          className="mt-2 text-sm font-medium text-red-700 underline"
        >
          Retry
        </button>
      </div>
    );
  }

  if (files.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-gray-300 bg-white px-6 py-12 text-center">
        <div className="text-4xl">📁</div>
        <h3 className="mt-3 text-lg font-semibold text-gray-900">No files yet</h3>
        <p className="mt-2 text-sm text-gray-500">
          প্রথম upload complete হলেই এই list auto-refresh হবে
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between gap-3">
        <p className="text-sm text-gray-500">
          {files.length} item loaded
        </p>
        <button
          type="button"
          onClick={() => void fetchFiles()}
          className="text-sm font-medium text-blue-600"
        >
          {refreshing ? "Refreshing..." : "Refresh list"}
        </button>
      </div>

      <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white">
        <div className="divide-y divide-gray-100">
          {files.map((file) => (
            <div
              key={file.id}
              className="flex items-center justify-between gap-3 px-4 py-3"
            >
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium text-gray-900">
                  {file.name}
                </p>
                <p className="mt-1 text-xs text-gray-500">
                  {file.is_folder
                    ? "Folder"
                    : \`\${formatBytes(file.size)} • \${file.mime_type || "unknown"}\`}
                </p>
              </div>

              <div className="flex shrink-0 items-center gap-3 text-sm">
                {file.cloudinary_url && (
                  <a
                    href={file.cloudinary_url}
                    target="_blank"
                    rel="noreferrer"
                    className="text-blue-600"
                  >
                    Open
                  </a>
                )}
                <button
                  type="button"
                  onClick={() => void handleDelete(file.id, file.name)}
                  className="text-red-600"
                >
                  Delete
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}`;

const MANAGER_CODE = String.raw`// src/components/FileManager.tsx
"use client";

import { useState } from "react";
import FileList from "@/components/FileList";
import FileUploader from "@/components/FileUploader";
import type { CloudFile } from "@/types/yocloud";

export default function FileManager({
  initialFiles,
  initialError,
}: {
  initialFiles: CloudFile[];
  initialError?: string | null;
}) {
  const [refreshToken, setRefreshToken] = useState(0);
  const [lastUploadCount, setLastUploadCount] = useState(0);

  return (
    <div className="space-y-8">
      <section className="space-y-4">
        <div>
          <h2 className="text-2xl font-semibold text-gray-900">Upload files</h2>
          <p className="mt-1 text-sm text-gray-500">
            File select, drag & drop, real progress, queue processing — সব একসাথে
          </p>
        </div>

        <FileUploader
          onUploadComplete={(uploadedFiles) => {
            setLastUploadCount(uploadedFiles.length);
            setRefreshToken((value) => value + 1);
          }}
        />

        {lastUploadCount > 0 && (
          <p className="text-sm text-green-700">
            {lastUploadCount} file uploaded successfully. File list refreshed.
          </p>
        )}
      </section>

      <section className="space-y-4">
        <div className="flex items-center justify-between gap-3">
          <div>
            <h2 className="text-2xl font-semibold text-gray-900">Your files</h2>
            <p className="mt-1 text-sm text-gray-500">
              Initial list server থেকে আসে, তাই first render এ late loading লাগে না
            </p>
          </div>
        </div>

        <FileList
          initialFiles={initialFiles}
          initialError={initialError}
          refreshToken={refreshToken}
        />
      </section>
    </div>
  );
}`;

const PAGE_CODE = String.raw`// src/app/page.tsx
import FileManager from "@/components/FileManager";
import { listFiles } from "@/lib/yocloud";
import type { CloudFile } from "@/types/yocloud";

export default async function HomePage() {
  let initialFiles: CloudFile[] = [];
  let initialError: string | null = null;

  try {
    const data = await listFiles({ limit: 50, offset: 0 });
    initialFiles = data.files || [];
  } catch (error) {
    initialError =
      error instanceof Error ? error.message : "Failed to load initial files";
  }

  return (
    <main className="mx-auto max-w-5xl px-4 py-10">
      <div className="mb-8">
        <h1 className="text-4xl font-bold text-gray-900">YoCloud Files</h1>
        <p className="mt-2 text-sm text-gray-500">
          Secure Next.js integration with a server-side API key and a working uploader
        </p>
      </div>

      <FileManager initialFiles={initialFiles} initialError={initialError} />
    </main>
  );
}`;

const RUN_CODE = String.raw`npm run dev

# Open http://localhost:3000
# 1) Click “Browse files” or drag files into the drop zone
# 2) Watch real upload progress
# 3) After upload, the file list refreshes automatically
# 4) Delete moves the file to trash via the API`;

const STRUCTURE_TEXT = `my-yocloud-app/
├── .env.local
├── package.json
└── src/
    ├── app/
    │   ├── page.tsx
    │   └── api/
    │       ├── upload/
    │       │   └── route.ts
    │       └── files/
    │           ├── route.ts
    │           └── [id]/
    │               └── route.ts
    ├── components/
    │   ├── FileList.tsx
    │   ├── FileManager.tsx
    │   └── FileUploader.tsx
    ├── lib/
    │   └── yocloud.ts
    └── types/
        └── yocloud.ts`;

export default function NextjsGuidePage() {
  const [activeSection, setActiveSection] = useState("nextjs-overview");

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            setActiveSection(entry.target.id);
          }
        }
      },
      { rootMargin: "-80px 0px -60% 0px", threshold: 0.1 }
    );

    SECTION_IDS.forEach((id) => {
      const element = document.getElementById(id);
      if (element) observer.observe(element);
    });

    return () => observer.disconnect();
  }, []);

  return (
    <DocsLayout
      sectionIds={SECTION_IDS}
      activeSection={activeSection}
      onSectionChange={setActiveSection}
    >
      <Content />
    </DocsLayout>
  );
}

function Content() {
  const { showApiKey, setShowApiKey, activeKey, apiKeyDisplay, baseUrl, rawKeyAvailable } =
    useDocsContext();

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
      <section id="nextjs-overview">
        <div className="mb-3 flex items-center gap-3">
          <img src={nextjsIcon} alt="Next.js" className="h-8 w-8 rounded-lg" />
          <div>
            <h2 className="text-xl font-bold text-foreground md:text-2xl">
              Next.js Integration Guide
            </h2>
            <p className="text-xs text-muted-foreground">
              Fixed uploader, fixed listing flow, full copy-pasteable codebase
            </p>
          </div>
        </div>

        <p className="mb-4 text-sm leading-relaxed text-muted-foreground">
          এই version-এ uploader selection issue, queue issue, আর late file listing issue ঠিক করা হয়েছে।
          API key server-side থাকবে, uploader actual progress দেখাবে, আর file list initial render-এ server থেকে load হবে।
        </p>

        <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
          {[
            {
              icon: Shield,
              title: "Server-side API key",
              desc: "Key browser-এ expose হয় না — সব request Next.js route দিয়ে যায়.",
            },
            {
              icon: Play,
              title: "Working uploader",
              desc: "Browse button + drag & drop + real XHR progress + queue processing.",
            },
            {
              icon: Package,
              title: "Fast first file list",
              desc: "Initial files server থেকে আসে, তাই client-side blank loading কমে যায়.",
            },
          ].map((item) => (
            <div key={item.title} className="rounded-xl border border-border bg-secondary/20 p-3">
              <item.icon className="mb-2 h-5 w-5 text-primary" />
              <h3 className="text-sm font-bold text-foreground">{item.title}</h3>
              <p className="mt-1 text-[11px] text-muted-foreground">{item.desc}</p>
            </div>
          ))}
        </div>
      </section>

      <section id="nextjs-setup">
        <StepHeader step={1} title="Create the project" />
        <p className="mb-3 text-[11px] text-muted-foreground">
          Start with a clean Next.js App Router project:
        </p>
        <CodeBlock code={SETUP_CODE} lang="bash" {...codeProps} />
      </section>

      <section id="nextjs-env">
        <StepHeader step={2} title="Set environment variables" />
        <p className="mb-3 text-[11px] text-muted-foreground">
          Create <code className="font-mono text-primary">.env.local</code> and paste your API key:
        </p>
        <CodeBlock code={ENV_CODE} lang="bash" {...codeProps} />

        <div className="mt-3 rounded-xl border border-border bg-secondary/20 p-3">
          <div className="flex items-start gap-2">
            <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0 text-primary" />
            <div className="space-y-1 text-[11px] text-muted-foreground">
              <p>
                Create an API key with at least <strong className="text-foreground">files:read</strong>,{" "}
                <strong className="text-foreground">files:write</strong>, and{" "}
                <strong className="text-foreground">files:delete</strong> scopes.
              </p>
              <p>
                Do <strong className="text-foreground">not</strong> use <code className="font-mono">NEXT_PUBLIC_</code>
                . Keep the key server-side only.
              </p>
            </div>
          </div>
        </div>
      </section>

      <section id="nextjs-types">
        <StepHeader step={3} title="Add shared types" />
        <p className="mb-3 text-[11px] text-muted-foreground">
          Create <code className="font-mono text-primary">src/types/yocloud.ts</code>:
        </p>
        <CodeBlock code={TYPES_CODE} lang="typescript" {...codeProps} />
      </section>

      <section id="nextjs-client">
        <StepHeader step={4} title="Create the server-only API client" />
        <p className="mb-3 text-[11px] text-muted-foreground">
          Create <code className="font-mono text-primary">src/lib/yocloud.ts</code>:
        </p>
        <CodeBlock code={CLIENT_CODE} lang="typescript" {...codeProps} />
      </section>

      <section id="nextjs-upload-route">
        <StepHeader step={5} title="Create the upload route" />
        <p className="mb-3 text-[11px] text-muted-foreground">
          This route receives <code className="font-mono">FormData</code>, converts the selected file to base64,
          then forwards it to the API securely.
        </p>
        <CodeBlock code={UPLOAD_ROUTE_CODE} lang="typescript" {...codeProps} />
      </section>

      <section id="nextjs-files-route">
        <StepHeader step={6} title="Create the file listing route" />
        <p className="mb-3 text-[11px] text-muted-foreground">
          Create <code className="font-mono text-primary">src/app/api/files/route.ts</code>:
        </p>
        <CodeBlock code={FILES_ROUTE_CODE} lang="typescript" {...codeProps} />
      </section>

      <section id="nextjs-delete-route">
        <StepHeader step={7} title="Create the file details + delete route" />
        <p className="mb-3 text-[11px] text-muted-foreground">
          Create <code className="font-mono text-primary">src/app/api/files/[id]/route.ts</code>:
        </p>
        <CodeBlock code={DELETE_ROUTE_CODE} lang="typescript" {...codeProps} />
      </section>

      <section id="nextjs-uploader">
        <StepHeader step={8} title="Add the fixed uploader component" />
        <p className="mb-3 text-[11px] text-muted-foreground">
          This version fixes two common problems: <strong className="text-foreground">file selection not opening</strong>
          {' '}and <strong className="text-foreground">new files getting stuck in queue</strong>.
        </p>
        <CodeBlock code={UPLOADER_CODE} lang="typescript" {...codeProps} />

        <div className="mt-3 rounded-xl border border-border bg-secondary/20 p-3">
          <p className="mb-2 text-[10px] font-semibold text-foreground">What changed:</p>
          <ul className="space-y-1 text-[10px] text-muted-foreground">
            <li className="flex gap-2">
              <Check className="mt-0.5 h-3 w-3 shrink-0 text-primary" />
              <span>Visible <strong className="text-foreground">Browse files</strong> button with input ref — selection works reliably.</span>
            </li>
            <li className="flex gap-2">
              <Check className="mt-0.5 h-3 w-3 shrink-0 text-primary" />
              <span>Queue processor reads from a ref, so files added during upload are processed too.</span>
            </li>
            <li className="flex gap-2">
              <Check className="mt-0.5 h-3 w-3 shrink-0 text-primary" />
              <span>Upload list is scrollable and shows actual XHR progress percentage.</span>
            </li>
          </ul>
        </div>
      </section>

      <section id="nextjs-filelist">
        <StepHeader step={9} title="Add the fast file list component" />
        <p className="mb-3 text-[11px] text-muted-foreground">
          This list no longer waits for a client-side first fetch. It starts with server-loaded data and only refreshes after uploads.
        </p>
        <CodeBlock code={FILE_LIST_CODE} lang="typescript" {...codeProps} />
      </section>

      <section id="nextjs-manager">
        <StepHeader step={10} title="Add a small FileManager wrapper" />
        <p className="mb-3 text-[11px] text-muted-foreground">
          This wrapper connects the uploader and the file list cleanly.
        </p>
        <CodeBlock code={MANAGER_CODE} lang="typescript" {...codeProps} />
      </section>

      <section id="nextjs-page">
        <StepHeader step={11} title="Render everything from the main page" />
        <p className="mb-3 text-[11px] text-muted-foreground">
          Make <code className="font-mono text-primary">src/app/page.tsx</code> a server component so the first file list arrives immediately.
        </p>
        <CodeBlock code={PAGE_CODE} lang="typescript" {...codeProps} />
      </section>

      <section id="nextjs-run">
        <StepHeader step={12} title="Run the project" />
        <CodeBlock code={RUN_CODE} lang="bash" {...codeProps} />
      </section>

      <section id="nextjs-structure">
        <div className="rounded-xl border border-border bg-secondary/20 p-4">
          <h3 className="mb-2 flex items-center gap-2 text-sm font-bold text-foreground">
            <FolderPlus className="h-4 w-4 text-primary" />
            Final project structure
          </h3>
          <pre className="whitespace-pre text-[11px] leading-relaxed text-muted-foreground">
            {STRUCTURE_TEXT}
          </pre>
        </div>
      </section>

      <section id="nextjs-tips">
        <div className="rounded-xl border border-border bg-primary/5 p-4">
          <h3 className="mb-2 text-sm font-bold text-foreground">Quick fixes checklist</h3>
          <ul className="space-y-1.5 text-[11px] text-muted-foreground">
            <li className="flex gap-2">
              <Check className="mt-0.5 h-3.5 w-3.5 shrink-0 text-primary" />
              <span>If upload returns 401/403, verify your API key scopes first.</span>
            </li>
            <li className="flex gap-2">
              <Check className="mt-0.5 h-3.5 w-3.5 shrink-0 text-primary" />
              <span>If file selection does nothing, confirm the hidden input ref and click handler are both present.</span>
            </li>
            <li className="flex gap-2">
              <Check className="mt-0.5 h-3.5 w-3.5 shrink-0 text-primary" />
              <span>If new files never start after the first one, your queue processor is not reading the latest queue state.</span>
            </li>
            <li className="flex gap-2">
              <Check className="mt-0.5 h-3.5 w-3.5 shrink-0 text-primary" />
              <span>If listing feels slow, fetch the initial list in a server component instead of waiting for client <code className="font-mono">useEffect</code>.</span>
            </li>
          </ul>
        </div>
      </section>
    </>
  );
}

function StepHeader({ step, title }: { step: number; title: string }) {
  return (
    <div className="mb-2 flex items-center gap-3">
      <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary text-xs font-bold text-primary-foreground">
        {step}
      </div>
      <h3 className="text-base font-bold text-foreground md:text-lg">{title}</h3>
    </div>
  );
}
