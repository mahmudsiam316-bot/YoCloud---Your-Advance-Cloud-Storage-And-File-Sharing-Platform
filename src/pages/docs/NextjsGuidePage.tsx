import { useState, useEffect } from "react";
import { Check, AlertTriangle, FolderPlus, Play, Package, Shield } from "lucide-react";
import DocsLayout, { CodeBlock, useDocsContext } from "@/components/docs/DocsLayout";
import nextjsIcon from "@/assets/nextjs-icon.png";

const SECTION_IDS = ["nextjs-overview", "nextjs-setup", "nextjs-env", "nextjs-client", "nextjs-server", "nextjs-upload-route", "nextjs-upload-component", "nextjs-run", "nextjs-structure", "nextjs-tips"];

export default function NextjsGuidePage() {
  const [activeSection, setActiveSection] = useState("nextjs-overview");

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
      <section id="nextjs-overview">
        <div className="flex items-center gap-3 mb-3">
          <img src={nextjsIcon} alt="Next.js" className="w-8 h-8 rounded-lg" />
          <div>
            <h2 className="text-xl md:text-2xl font-bold text-foreground">Next.js Integration Guide</h2>
            <p className="text-xs text-muted-foreground">Complete guide to integrate YoCloud API with Next.js (App Router)</p>
          </div>
        </div>
        <p className="text-sm text-muted-foreground leading-relaxed mb-4">
          This guide walks you through integrating the YoCloud REST API into a Next.js application — from project creation
          to uploading files, listing them, and running the dev server. By the end, you'll have a fully working Next.js app
          connected to YoCloud with server-side security.
        </p>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          {[
            { icon: Shield, title: "Server-Side Secure", desc: "API keys stay on the server. Never exposed to clients." },
            { icon: Package, title: "App Router", desc: "Modern Next.js 14+ with Server Components and API Routes." },
            { icon: Play, title: "Full-Stack", desc: "Server Components + API Routes for complete file management." },
          ].map(f => (
            <div key={f.title} className="p-3 rounded-xl border border-border bg-secondary/20">
              <f.icon className="w-5 h-5 text-primary mb-2" />
              <h3 className="text-sm font-bold text-foreground">{f.title}</h3>
              <p className="text-[11px] text-muted-foreground mt-1">{f.desc}</p>
            </div>
          ))}
        </div>
      </section>

      <section id="nextjs-setup">
        <StepHeader step={1} title="Create a New Next.js Project" />
        <p className="text-[11px] text-muted-foreground mb-3">
          Open your terminal and run the following command to scaffold a new Next.js project with TypeScript and Tailwind CSS:
        </p>
        <CodeBlock code={`npx create-next-app@latest my-yocloud-app --typescript --tailwind --eslint --app --src-dir
cd my-yocloud-app`} lang="bash" {...codeProps} />
        <p className="text-[10px] text-muted-foreground mt-2">
          This creates a Next.js 14+ project with App Router, TypeScript, and Tailwind CSS pre-configured.
          The <code className="text-primary font-mono">--src-dir</code> flag puts source code in <code className="text-primary font-mono">src/</code>.
        </p>
        <div className="mt-3">
          <p className="text-[10px] font-semibold text-foreground mb-1">📦 Install required dependencies:</p>
          <CodeBlock code={`# Install packages
npm install axios
# or with yarn
yarn add axios
# or with pnpm
pnpm add axios`} lang="bash" {...codeProps} />
        </div>
        <div className="mt-3">
          <p className="text-[10px] font-semibold text-foreground mb-1">📥 Import in your files:</p>
          <CodeBlock code={`// Import in your server components or API routes:
import axios from 'axios';

// Next.js built-in (no install needed):
import { NextRequest, NextResponse } from 'next/server';
import { headers } from 'next/headers';`} lang="typescript" {...codeProps} />
        </div>
      </section>

      <section id="nextjs-env">
        <StepHeader step={2} title="Configure Environment Variables" />
        <p className="text-[11px] text-muted-foreground mb-3">
          Create a <code className="text-primary font-mono">.env.local</code> file in your project root:
        </p>
        <CodeBlock code={`# .env.local
YOCLOUD_API_KEY={{API_KEY}}
YOCLOUD_BASE_URL={{BASE_URL}}`} lang="bash" {...codeProps} />
        <div className="mt-2 p-2.5 rounded-lg bg-yellow-500/10 border border-yellow-500/20">
          <div className="flex items-start gap-2">
            <AlertTriangle className="w-3.5 h-3.5 text-yellow-500 mt-0.5 shrink-0" />
            <p className="text-[10px] text-muted-foreground">
              <strong className="text-foreground">Security:</strong> Never prefix with <code className="font-mono">NEXT_PUBLIC_</code> — API keys must only be used server-side.
              Client-side exposure will compromise your account.
            </p>
          </div>
        </div>
      </section>

      <section id="nextjs-client">
        <StepHeader step={3} title="Create the API Client Helper" />
        <p className="text-[11px] text-muted-foreground mb-3">
          Create <code className="text-primary font-mono">src/lib/yocloud.ts</code>:
        </p>
        <CodeBlock code={`// src/lib/yocloud.ts

const API_KEY = process.env.YOCLOUD_API_KEY!;
const BASE_URL = process.env.YOCLOUD_BASE_URL!;

interface YoCloudOptions {
  method?: string;
  body?: Record<string, unknown>;
  params?: Record<string, string>;
}

export async function yocloud(endpoint: string, options: YoCloudOptions = {}) {
  const { method = "GET", body, params } = options;
  
  const url = new URL(\`\${BASE_URL}\${endpoint}\`);
  if (params) {
    Object.entries(params).forEach(([k, v]) => url.searchParams.set(k, v));
  }

  const response = await fetch(url.toString(), {
    method,
    headers: {
      "X-API-Key": API_KEY,
      "Content-Type": "application/json",
    },
    ...(body ? { body: JSON.stringify(body) } : {}),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || \`API error: \${response.status}\`);
  }

  return response.json();
}

// Typed helpers
export const listFiles = (limit = 50, offset = 0) =>
  yocloud("/files", { params: { limit: String(limit), offset: String(offset) } });

export const getFile = (id: string) => yocloud(\`/files/\${id}\`);

export const uploadFile = (name: string, content_base64: string, mime_type?: string) =>
  yocloud("/files/upload", {
    method: "POST",
    body: { name, content_base64, ...(mime_type ? { mime_type } : {}) },
  });

export const deleteFile = (id: string) =>
  yocloud(\`/files/\${id}\`, { method: "DELETE" });

export const createFolder = (name: string, parent_id?: string) =>
  yocloud("/folders", { method: "POST", body: { name, ...(parent_id ? { parent_id } : {}) } });

export const listShares = () => yocloud("/shares");

export const createShare = (file_id: string, permission = "viewer") =>
  yocloud("/shares", { method: "POST", body: { file_id, permission } });`} lang="typescript" {...codeProps} />
      </section>

      <section id="nextjs-server">
        <StepHeader step={4} title="Display Files (Server Component)" />
        <p className="text-[11px] text-muted-foreground mb-3">
          Update <code className="text-primary font-mono">src/app/page.tsx</code> to fetch and display files server-side:
        </p>
        <CodeBlock code={`// src/app/page.tsx
import { listFiles } from "@/lib/yocloud";

interface CloudFile {
  id: string;
  name: string;
  mime_type: string;
  size: number;
  is_folder: boolean;
  cloudinary_url: string;
  created_at: string;
}

export default async function HomePage() {
  const data = await listFiles(20);
  const files: CloudFile[] = data.files;

  return (
    <main className="max-w-4xl mx-auto p-8">
      <h1 className="text-3xl font-bold mb-6">My Cloud Files</h1>
      <div className="space-y-2">
        {files.map((file) => (
          <div key={file.id} className="flex items-center gap-4 p-4 rounded-lg border hover:bg-gray-50">
            <div className="text-2xl">{file.is_folder ? "📁" : "📄"}</div>
            <div className="flex-1 min-w-0">
              <p className="font-medium truncate">{file.name}</p>
              <p className="text-sm text-gray-500">
                {file.is_folder ? "Folder" : \`\${(file.size / 1024).toFixed(1)} KB · \${file.mime_type}\`}
              </p>
            </div>
            {file.cloudinary_url && (
              <a href={file.cloudinary_url} target="_blank" rel="noreferrer"
                className="text-blue-600 text-sm hover:underline">Download</a>
            )}
          </div>
        ))}
      </div>
      {files.length === 0 && (
        <p className="text-center text-gray-400 py-16">No files yet. Upload one via the API!</p>
      )}
    </main>
  );
}`} lang="typescript" {...codeProps} />
      </section>

      <section id="nextjs-upload-route">
        <StepHeader step={5} title="Create Upload API Route" />
        <p className="text-[11px] text-muted-foreground mb-3">
          Create <code className="text-primary font-mono">src/app/api/upload/route.ts</code>:
        </p>
        <CodeBlock code={`// src/app/api/upload/route.ts
import { NextRequest, NextResponse } from "next/server";
import { uploadFile } from "@/lib/yocloud";

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get("file") as File;
    
    if (!file) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 });
    }

    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);
    const content_base64 = buffer.toString("base64");

    const result = await uploadFile(file.name, content_base64, file.type);
    return NextResponse.json(result);
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || "Upload failed" },
      { status: 500 }
    );
  }
}`} lang="typescript" {...codeProps} />
      </section>

      <section id="nextjs-upload-component">
        <StepHeader step={6} title="Create Upload Component (Client)" />
        <p className="text-[11px] text-muted-foreground mb-3">
          Create <code className="text-primary font-mono">src/components/UploadButton.tsx</code>:
        </p>
        <CodeBlock code={`// src/components/UploadButton.tsx
"use client";

import { useState, useRef } from "react";

export default function UploadButton() {
  const [uploading, setUploading] = useState(false);
  const [message, setMessage] = useState("");
  const fileRef = useRef<HTMLInputElement>(null);

  const handleUpload = async () => {
    const file = fileRef.current?.files?.[0];
    if (!file) return;

    setUploading(true);
    setMessage("");

    try {
      const formData = new FormData();
      formData.append("file", file);

      const res = await fetch("/api/upload", { method: "POST", body: formData });
      const data = await res.json();
      
      if (res.ok) {
        setMessage(\`✅ Uploaded: \${data.file.name}\`);
      } else {
        setMessage(\`❌ Error: \${data.error}\`);
      }
    } catch (err) {
      setMessage("❌ Upload failed");
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="flex items-center gap-3">
      <input ref={fileRef} type="file" className="text-sm" />
      <button onClick={handleUpload} disabled={uploading}
        className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50">
        {uploading ? "Uploading..." : "Upload"}
      </button>
      {message && <span className="text-sm">{message}</span>}
    </div>
  );
}`} lang="typescript" {...codeProps} />
      </section>

      <section id="nextjs-run">
        <StepHeader step={7} title="Run the Development Server" last />
        <p className="text-[11px] text-muted-foreground mb-3">
          Start your Next.js development server:
        </p>
        <CodeBlock code={`npm run dev

# Your app is now running at http://localhost:3000
# Files are loaded server-side via YoCloud API
# Upload form sends files through /api/upload route`} lang="bash" {...codeProps} />
      </section>

      <section id="nextjs-structure">
        <div className="p-4 rounded-xl border border-border bg-secondary/20">
          <h3 className="text-sm font-bold text-foreground mb-2 flex items-center gap-2">
            <FolderPlus className="w-4 h-4 text-primary" />
            Final Project Structure
          </h3>
          <pre className="text-[11px] font-mono text-muted-foreground whitespace-pre">{`my-yocloud-app/
├── .env.local              ← API key (git-ignored)
├── src/
│   ├── app/
│   │   ├── page.tsx         ← Server Component (list files)
│   │   └── api/
│   │       └── upload/
│   │           └── route.ts ← Upload API Route
│   ├── components/
│   │   └── UploadButton.tsx ← Client upload component
│   └── lib/
│       └── yocloud.ts       ← API client helper
├── package.json
└── tsconfig.json`}</pre>
        </div>
      </section>

      <section id="nextjs-tips">
        <div className="p-4 rounded-xl border border-border bg-primary/5">
          <h3 className="text-sm font-bold text-foreground mb-2">💡 Pro Tips</h3>
          <ul className="space-y-1.5 text-[11px] text-muted-foreground">
            <li className="flex gap-2"><Check className="w-3.5 h-3.5 text-emerald-500 shrink-0 mt-0.5" /><span>Use <strong className="text-foreground">Server Components</strong> for data fetching — API keys stay on the server</span></li>
            <li className="flex gap-2"><Check className="w-3.5 h-3.5 text-emerald-500 shrink-0 mt-0.5" /><span>Use <strong className="text-foreground">API Routes</strong> for mutations to proxy through your server</span></li>
            <li className="flex gap-2"><Check className="w-3.5 h-3.5 text-emerald-500 shrink-0 mt-0.5" /><span>Add <strong className="text-foreground">revalidation</strong> with <code className="font-mono text-primary">revalidatePath("/")</code> after uploads</span></li>
            <li className="flex gap-2"><Check className="w-3.5 h-3.5 text-emerald-500 shrink-0 mt-0.5" /><span>Implement <strong className="text-foreground">error boundaries</strong> to gracefully handle API failures</span></li>
            <li className="flex gap-2"><Check className="w-3.5 h-3.5 text-emerald-500 shrink-0 mt-0.5" /><span>Use <strong className="text-foreground">Suspense</strong> with loading.tsx for skeleton states</span></li>
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
