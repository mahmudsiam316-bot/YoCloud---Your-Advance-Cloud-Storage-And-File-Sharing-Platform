import { useState, useEffect } from "react";
import { Check, AlertTriangle, FolderPlus, Play, Package, Shield } from "lucide-react";
import DocsLayout, { CodeBlock, useDocsContext } from "@/components/docs/DocsLayout";
import reactIcon from "@/assets/react-icon.png";

const SECTION_IDS = ["react-overview", "react-setup", "react-env", "react-client", "react-hooks", "react-components", "react-upload", "react-run", "react-structure", "react-tips"];

export default function ReactGuidePage() {
  const [activeSection, setActiveSection] = useState("react-overview");

  useEffect(() => {
    const observer = new IntersectionObserver(
      entries => { for (const e of entries) if (e.isIntersecting) setActiveSection(e.target.id); },
      { rootMargin: "-80px 0px -60% 0px", threshold: 0.1 }
    );
    SECTION_IDS.forEach(id => { const el = document.getElementById(id); if (el) observer.observe(el); });
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
  const codeProps = { showApiKey, onToggleKey: () => setShowApiKey(!showApiKey), hasKey: !!activeKey, baseUrl, apiKey: apiKeyDisplay, rawKeyAvailable };

  return (
    <>
      {/* Overview */}
      <section id="react-overview">
        <div className="flex items-center gap-3 mb-3">
          <img src={reactIcon} alt="React" className="w-8 h-8 rounded-lg" />
          <div>
            <h2 className="text-xl md:text-2xl font-bold text-foreground">React (Vite) Integration Guide</h2>
            <p className="text-xs text-muted-foreground">Complete guide to integrate YoCloud API with React + Vite</p>
          </div>
        </div>
        <p className="text-sm text-muted-foreground leading-relaxed mb-4">
          This guide walks you through building a React application powered by Vite that connects to the YoCloud REST API.
          You'll set up the project, create a type-safe API client, build custom hooks for data fetching, 
          create file listing and upload components, and run everything locally. By the end, you'll have a fully functional 
          React app that can list, upload, and manage files through YoCloud.
        </p>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          {[
            { icon: Package, title: "Vite + React", desc: "Lightning-fast HMR, TypeScript, modern tooling out of the box." },
            { icon: Shield, title: "Type-Safe", desc: "Full TypeScript types for API responses and requests." },
            { icon: Play, title: "Quick Setup", desc: "From zero to working app in under 10 minutes." },
          ].map(f => (
            <div key={f.title} className="p-3 rounded-xl border border-border bg-secondary/20">
              <f.icon className="w-5 h-5 text-primary mb-2" />
              <h3 className="text-sm font-bold text-foreground">{f.title}</h3>
              <p className="text-[11px] text-muted-foreground mt-1">{f.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Step 1: Create Project */}
      <section id="react-setup">
        <StepHeader step={1} title="Create a New React + Vite Project" />
        <p className="text-[11px] text-muted-foreground mb-3">
          Open your terminal and run the following command to scaffold a new Vite project with React and TypeScript:
        </p>
        <CodeBlock code={`npm create vite@latest my-yocloud-app -- --template react-ts
cd my-yocloud-app
npm install`} lang="bash" {...codeProps} />
        <p className="text-[10px] text-muted-foreground mt-2">
          This creates a new React project with TypeScript, Vite, and ESLint pre-configured. 
          Vite provides instant server start, lightning-fast HMR, and optimized builds.
        </p>
        <div className="mt-3">
          <p className="text-[10px] font-semibold text-foreground mb-1">Install additional dependencies:</p>
          <CodeBlock code={`npm install axios react-query
# axios for HTTP requests, react-query for data fetching & caching`} lang="bash" {...codeProps} />
        </div>
      </section>

      {/* Step 2: Environment Variables */}
      <section id="react-env">
        <StepHeader step={2} title="Configure Environment Variables" />
        <p className="text-[11px] text-muted-foreground mb-3">
          Create a <code className="text-primary font-mono">.env</code> file in your project root. Vite requires the <code className="text-primary font-mono">VITE_</code> prefix for client-side environment variables.
        </p>
        <CodeBlock code={`# .env
VITE_YOCLOUD_API_KEY={{API_KEY}}
VITE_YOCLOUD_BASE_URL={{BASE_URL}}`} lang="bash" {...codeProps} />
        <div className="mt-2 p-2.5 rounded-lg bg-yellow-500/10 border border-yellow-500/20">
          <div className="flex items-start gap-2">
            <AlertTriangle className="w-3.5 h-3.5 text-yellow-500 mt-0.5 shrink-0" />
            <p className="text-[10px] text-muted-foreground">
              <strong className="text-foreground">Important:</strong> Since React (Vite) is a client-side framework, your API key will be visible in the browser.
              For production apps, create a backend proxy (e.g., Express, Cloudflare Workers) to keep your key private.
              For development and internal tools, direct client-side usage is acceptable.
            </p>
          </div>
        </div>
      </section>

      {/* Step 3: API Client */}
      <section id="react-client">
        <StepHeader step={3} title="Create the API Client" />
        <p className="text-[11px] text-muted-foreground mb-3">
          Create <code className="text-primary font-mono">src/lib/yocloud.ts</code> — a type-safe API client that handles authentication, error handling, and typed responses.
        </p>
        <CodeBlock code={`// src/lib/yocloud.ts

const API_KEY = import.meta.env.VITE_YOCLOUD_API_KEY;
const BASE_URL = import.meta.env.VITE_YOCLOUD_BASE_URL;

export interface CloudFile {
  id: string;
  name: string;
  mime_type: string | null;
  size: number | null;
  is_folder: boolean;
  is_starred: boolean;
  cloudinary_url: string | null;
  created_at: string;
  updated_at: string;
  parent_id: string | null;
  workspace_id: string | null;
}

export interface CloudFolder {
  id: string;
  name: string;
  is_folder: true;
  created_at: string;
}

export interface ShareLink {
  id: string;
  file_id: string;
  token: string;
  share_code: string;
  permission: string;
  view_count: number;
  download_count: number;
}

export interface CloudTag {
  id: string;
  name: string;
  color: string;
}

interface ApiError {
  error: string;
}

async function apiRequest<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
  const url = \`\${BASE_URL}\${endpoint}\`;
  
  const response = await fetch(url, {
    ...options,
    headers: {
      "X-API-Key": API_KEY,
      "Content-Type": "application/json",
      ...options.headers,
    },
  });

  if (!response.ok) {
    const err: ApiError = await response.json();
    throw new Error(err.error || \`API error: \${response.status}\`);
  }

  return response.json();
}

// ========== Files ==========
export const listFiles = (params?: { limit?: number; offset?: number; parent_id?: string; workspace_id?: string }) => {
  const query = new URLSearchParams();
  if (params?.limit) query.set("limit", String(params.limit));
  if (params?.offset) query.set("offset", String(params.offset));
  if (params?.parent_id) query.set("parent_id", params.parent_id);
  if (params?.workspace_id) query.set("workspace_id", params.workspace_id);
  const qs = query.toString();
  return apiRequest<{ files: CloudFile[]; count: number }>(\`/files\${qs ? \`?\${qs}\` : ""}\`);
};

export const getFile = (id: string) =>
  apiRequest<{ file: CloudFile }>(\`/files/\${id}\`);

export const uploadFile = (name: string, content_base64: string, mime_type?: string, parent_id?: string) =>
  apiRequest<{ file: CloudFile }>("/files/upload", {
    method: "POST",
    body: JSON.stringify({ name, content_base64, ...(mime_type ? { mime_type } : {}), ...(parent_id ? { parent_id } : {}) }),
  });

export const deleteFile = (id: string) =>
  apiRequest<{ message: string }>(\`/files/\${id}\`, { method: "DELETE" });

// ========== Folders ==========
export const createFolder = (name: string, parent_id?: string) =>
  apiRequest<{ folder: CloudFolder }>("/folders", {
    method: "POST",
    body: JSON.stringify({ name, ...(parent_id ? { parent_id } : {}) }),
  });

// ========== Shares ==========
export const listShares = () =>
  apiRequest<{ shares: ShareLink[] }>("/shares");

export const createShare = (file_id: string, permission = "viewer") =>
  apiRequest<{ share: ShareLink }>("/shares", {
    method: "POST",
    body: JSON.stringify({ file_id, permission }),
  });

// ========== Tags ==========
export const listTags = () =>
  apiRequest<{ tags: CloudTag[] }>("/tags");

export const createTag = (name: string, color?: string) =>
  apiRequest<{ tag: CloudTag }>("/tags", {
    method: "POST",
    body: JSON.stringify({ name, ...(color ? { color } : {}) }),
  });`} lang="typescript" {...codeProps} />
      </section>

      {/* Step 4: React Hooks */}
      <section id="react-hooks">
        <StepHeader step={4} title="Create Custom Hooks" />
        <p className="text-[11px] text-muted-foreground mb-3">
          Create <code className="text-primary font-mono">src/hooks/useYoCloud.ts</code> — custom React hooks that wrap the API client with React Query for caching, loading states, and error handling.
        </p>
        <CodeBlock code={`// src/hooks/useYoCloud.ts

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { listFiles, getFile, uploadFile, deleteFile, createFolder, listShares, createShare, listTags, createTag } from "../lib/yocloud";

// ========== Files ==========
export function useFiles(params?: { limit?: number; offset?: number; parent_id?: string }) {
  return useQuery({
    queryKey: ["files", params],
    queryFn: () => listFiles(params),
  });
}

export function useFile(id: string) {
  return useQuery({
    queryKey: ["file", id],
    queryFn: () => getFile(id),
    enabled: !!id,
  });
}

export function useUploadFile() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ name, content_base64, mime_type, parent_id }: {
      name: string;
      content_base64: string;
      mime_type?: string;
      parent_id?: string;
    }) => uploadFile(name, content_base64, mime_type, parent_id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["files"] });
    },
  });
}

export function useDeleteFile() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => deleteFile(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["files"] });
    },
  });
}

// ========== Folders ==========
export function useCreateFolder() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ name, parent_id }: { name: string; parent_id?: string }) =>
      createFolder(name, parent_id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["files"] });
    },
  });
}

// ========== Shares ==========
export function useShares() {
  return useQuery({ queryKey: ["shares"], queryFn: listShares });
}

export function useCreateShare() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ file_id, permission }: { file_id: string; permission?: string }) =>
      createShare(file_id, permission),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["shares"] });
    },
  });
}

// ========== Tags ==========
export function useTags() {
  return useQuery({ queryKey: ["tags"], queryFn: listTags });
}

export function useCreateTag() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ name, color }: { name: string; color?: string }) =>
      createTag(name, color),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tags"] });
    },
  });
}`} lang="typescript" {...codeProps} />
      </section>

      {/* Step 5: Components */}
      <section id="react-components">
        <StepHeader step={5} title="Build the File List Component" />
        <p className="text-[11px] text-muted-foreground mb-3">
          Create <code className="text-primary font-mono">src/components/FileList.tsx</code> — a component that displays your cloud files with loading states and error handling.
        </p>
        <CodeBlock code={`// src/components/FileList.tsx

import { useFiles, useDeleteFile } from "../hooks/useYoCloud";

function formatSize(bytes: number | null) {
  if (!bytes) return "—";
  if (bytes < 1024) return \`\${bytes} B\`;
  if (bytes < 1024 * 1024) return \`\${(bytes / 1024).toFixed(1)} KB\`;
  return \`\${(bytes / (1024 * 1024)).toFixed(1)} MB\`;
}

export default function FileList() {
  const { data, isLoading, error } = useFiles({ limit: 50 });
  const deleteMutation = useDeleteFile();

  if (isLoading) return (
    <div className="space-y-2">
      {[...Array(5)].map((_, i) => (
        <div key={i} className="h-16 rounded-lg bg-gray-100 animate-pulse" />
      ))}
    </div>
  );

  if (error) return (
    <div className="p-4 rounded-lg bg-red-50 text-red-600 text-sm">
      Error: {error.message}
    </div>
  );

  const files = data?.files || [];

  return (
    <div className="space-y-1">
      {files.map((file) => (
        <div key={file.id} className="flex items-center gap-4 p-4 rounded-lg border hover:bg-gray-50 transition-colors">
          <span className="text-2xl">{file.is_folder ? "📁" : "📄"}</span>
          <div className="flex-1 min-w-0">
            <p className="font-medium truncate">{file.name}</p>
            <p className="text-sm text-gray-500">
              {file.is_folder ? "Folder" : \`\${formatSize(file.size)} · \${file.mime_type || "Unknown"}\`}
            </p>
          </div>
          {file.cloudinary_url && (
            <a href={file.cloudinary_url} target="_blank" rel="noreferrer"
              className="text-blue-600 text-sm hover:underline shrink-0">
              Download
            </a>
          )}
          {!file.is_folder && (
            <button
              onClick={() => deleteMutation.mutate(file.id)}
              disabled={deleteMutation.isPending}
              className="text-red-500 text-sm hover:underline shrink-0"
            >
              Delete
            </button>
          )}
        </div>
      ))}
      {files.length === 0 && (
        <p className="text-center text-gray-400 py-12">No files yet. Upload one!</p>
      )}
    </div>
  );
}`} lang="typescript" {...codeProps} />
      </section>

      {/* Step 6: Upload Component */}
      <section id="react-upload">
        <StepHeader step={6} title="Build the Upload Component" />
        <p className="text-[11px] text-muted-foreground mb-3">
          Create <code className="text-primary font-mono">src/components/UploadButton.tsx</code> — a client component that handles file selection and base64 upload.
        </p>
        <CodeBlock code={`// src/components/UploadButton.tsx

import { useRef, useState } from "react";
import { useUploadFile } from "../hooks/useYoCloud";

export default function UploadButton() {
  const fileRef = useRef<HTMLInputElement>(null);
  const [status, setStatus] = useState("");
  const uploadMutation = useUploadFile();

  const handleUpload = async () => {
    const file = fileRef.current?.files?.[0];
    if (!file) return;

    setStatus("Reading file...");

    // Convert to base64
    const reader = new FileReader();
    reader.onload = async () => {
      const base64 = (reader.result as string).split(",")[1]; // Remove data:... prefix
      setStatus("Uploading...");

      try {
        await uploadMutation.mutateAsync({
          name: file.name,
          content_base64: base64,
          mime_type: file.type,
        });
        setStatus(\`✅ Uploaded: \${file.name}\`);
        if (fileRef.current) fileRef.current.value = "";
      } catch (err: any) {
        setStatus(\`❌ \${err.message}\`);
      }
    };
    reader.readAsDataURL(file);
  };

  return (
    <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 p-4 rounded-lg border">
      <input ref={fileRef} type="file" className="text-sm" />
      <button
        onClick={handleUpload}
        disabled={uploadMutation.isPending}
        className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 text-sm"
      >
        {uploadMutation.isPending ? "Uploading..." : "Upload File"}
      </button>
      {status && <span className="text-sm text-gray-600">{status}</span>}
    </div>
  );
}`} lang="typescript" {...codeProps} />
      </section>

      {/* Step 7: App.tsx */}
      <section id="react-run">
        <StepHeader step={7} title="Wire Everything in App.tsx" last />
        <p className="text-[11px] text-muted-foreground mb-3">
          Update your <code className="text-primary font-mono">src/App.tsx</code> to use React Query provider and render the components:
        </p>
        <CodeBlock code={`// src/App.tsx

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import FileList from "./components/FileList";
import UploadButton from "./components/UploadButton";

const queryClient = new QueryClient();

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <main className="max-w-4xl mx-auto p-8">
        <h1 className="text-3xl font-bold mb-2">My Cloud Files</h1>
        <p className="text-gray-500 mb-6">Powered by YoCloud API</p>
        
        <div className="mb-6">
          <h2 className="text-lg font-semibold mb-2">Upload a File</h2>
          <UploadButton />
        </div>

        <h2 className="text-lg font-semibold mb-3">All Files</h2>
        <FileList />
      </main>
    </QueryClientProvider>
  );
}

export default App;`} lang="typescript" {...codeProps} />
        <div className="mt-4">
          <p className="text-[10px] font-semibold text-foreground mb-2">Start the dev server:</p>
          <CodeBlock code={`npm run dev

# Your app is now running at http://localhost:5173
# Files are fetched from YoCloud API with React Query caching
# Upload form converts files to base64 and sends to YoCloud`} lang="bash" {...codeProps} />
        </div>
      </section>

      {/* Project Structure */}
      <section id="react-structure">
        <div className="p-4 rounded-xl border border-border bg-secondary/20">
          <h3 className="text-sm font-bold text-foreground mb-2 flex items-center gap-2">
            <FolderPlus className="w-4 h-4 text-primary" />
            Final Project Structure
          </h3>
          <pre className="text-[11px] font-mono text-muted-foreground whitespace-pre">{`my-yocloud-app/
├── .env                     ← API key & base URL
├── src/
│   ├── App.tsx              ← Main app with QueryProvider
│   ├── lib/
│   │   └── yocloud.ts       ← Type-safe API client
│   ├── hooks/
│   │   └── useYoCloud.ts    ← React Query hooks
│   └── components/
│       ├── FileList.tsx      ← File listing component
│       └── UploadButton.tsx  ← File upload component
├── package.json
├── vite.config.ts
└── tsconfig.json`}</pre>
        </div>
      </section>

      {/* Tips */}
      <section id="react-tips">
        <div className="p-4 rounded-xl border border-border bg-primary/5">
          <h3 className="text-sm font-bold text-foreground mb-2">💡 Pro Tips</h3>
          <ul className="space-y-1.5 text-[11px] text-muted-foreground">
            <li className="flex gap-2"><Check className="w-3.5 h-3.5 text-emerald-500 shrink-0 mt-0.5" /><span>Use <strong className="text-foreground">React Query</strong> for automatic caching, refetching, and optimistic updates</span></li>
            <li className="flex gap-2"><Check className="w-3.5 h-3.5 text-emerald-500 shrink-0 mt-0.5" /><span>Add <strong className="text-foreground">React Router</strong> for folder navigation — pass <code className="font-mono text-primary">parent_id</code> as URL params</span></li>
            <li className="flex gap-2"><Check className="w-3.5 h-3.5 text-emerald-500 shrink-0 mt-0.5" /><span>For production, create a <strong className="text-foreground">backend proxy</strong> to hide your API key from the client</span></li>
            <li className="flex gap-2"><Check className="w-3.5 h-3.5 text-emerald-500 shrink-0 mt-0.5" /><span>Use <strong className="text-foreground">Suspense</strong> boundaries with React Query's <code className="font-mono text-primary">suspense: true</code> option for cleaner loading states</span></li>
            <li className="flex gap-2"><Check className="w-3.5 h-3.5 text-emerald-500 shrink-0 mt-0.5" /><span>Implement <strong className="text-foreground">drag-and-drop</strong> upload using the HTML5 Drag & Drop API with the same base64 conversion</span></li>
          </ul>
        </div>
      </section>
    </>
  );
}

function StepHeader({ step, title, last }: { step: number; title: string; last?: boolean }) {
  return (
    <div className="flex items-center gap-3 mb-2">
      <div className="w-7 h-7 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-xs font-bold shrink-0">{step}</div>
      <h3 className="text-base md:text-lg font-bold text-foreground">{title}</h3>
    </div>
  );
}
