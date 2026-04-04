import { useState, useEffect } from "react";
import { Check, AlertTriangle, FolderPlus, Play, Package, Shield, Zap } from "lucide-react";
import DocsLayout, { CodeBlock, useDocsContext } from "@/components/docs/DocsLayout";
import vueIcon from "@/assets/vue-icon.png";

const SECTION_IDS = ["vue-overview", "vue-setup", "vue-env", "vue-client", "vue-composables", "vue-components", "vue-upload", "vue-app", "vue-structure", "vue-tips"];

export default function VueGuidePage() {
  const [activeSection, setActiveSection] = useState("vue-overview");

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
      <section id="vue-overview">
        <div className="flex items-center gap-3 mb-3">
          <img src={vueIcon} alt="Vue.js" className="w-8 h-8 rounded-lg" />
          <div>
            <h2 className="text-xl md:text-2xl font-bold text-foreground">Vue.js Integration Guide</h2>
            <p className="text-xs text-muted-foreground">Complete guide to integrate YoCloud API with Vue 3 + Vite</p>
          </div>
        </div>
        <p className="text-sm text-muted-foreground leading-relaxed mb-4">
          This guide covers setting up a Vue 3 project with the Composition API, creating a reactive API client,
          building composable functions for data management, and implementing file listing and upload components.
          Vue's reactive system makes it a perfect fit for real-time file management interfaces.
        </p>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          {[
            { icon: Package, title: "Vue 3 + Vite", desc: "Composition API, SFC, and blazing-fast development." },
            { icon: Zap, title: "Reactive", desc: "Vue's reactivity system auto-updates UI on data changes." },
            { icon: Shield, title: "Composables", desc: "Reusable, testable logic with Vue composable functions." },
          ].map(f => (
            <div key={f.title} className="p-3 rounded-xl border border-border bg-secondary/20">
              <f.icon className="w-5 h-5 text-primary mb-2" />
              <h3 className="text-sm font-bold text-foreground">{f.title}</h3>
              <p className="text-[11px] text-muted-foreground mt-1">{f.desc}</p>
            </div>
          ))}
        </div>
      </section>

      <section id="vue-setup">
        <StepHeader step={1} title="Create a New Vue 3 Project" />
        <p className="text-[11px] text-muted-foreground mb-3">
          Scaffold a new Vue 3 project using Vite with TypeScript support:
        </p>
        <CodeBlock code={`npm create vite@latest my-yocloud-vue -- --template vue-ts
cd my-yocloud-vue
npm install`} lang="bash" {...codeProps} />
        <p className="text-[10px] text-muted-foreground mt-2">
          This gives you Vue 3 with TypeScript, Vite, and Single File Components (SFC) ready to go.
        </p>
        <div className="mt-3">
          <p className="text-[10px] font-semibold text-foreground mb-1">📦 Install required dependencies:</p>
          <CodeBlock code={`# Install packages
npm install axios @tanstack/vue-query
# or with yarn
yarn add axios @tanstack/vue-query
# or with pnpm
pnpm add axios @tanstack/vue-query`} lang="bash" {...codeProps} />
        </div>
        <div className="mt-3">
          <p className="text-[10px] font-semibold text-foreground mb-1">📥 Import in your files:</p>
          <CodeBlock code={`// In your Vue components or composables:
import axios from 'axios';
import { ref, reactive, onMounted } from 'vue';

// Vue Query (optional but recommended for caching):
import { useQuery, useMutation } from '@tanstack/vue-query';`} lang="typescript" {...codeProps} />
        </div>
      </section>

      <section id="vue-env">
        <StepHeader step={2} title="Configure Environment Variables" />
        <p className="text-[11px] text-muted-foreground mb-3">
          Create a <code className="text-primary font-mono">.env</code> file. Vite exposes variables prefixed with <code className="text-primary font-mono">VITE_</code>:
        </p>
        <CodeBlock code={`# .env
VITE_YOCLOUD_API_KEY={{API_KEY}}
VITE_YOCLOUD_BASE_URL={{BASE_URL}}`} lang="bash" {...codeProps} />
        <div className="mt-2 p-2.5 rounded-lg bg-yellow-500/10 border border-yellow-500/20">
          <div className="flex items-start gap-2">
            <AlertTriangle className="w-3.5 h-3.5 text-yellow-500 mt-0.5 shrink-0" />
            <p className="text-[10px] text-muted-foreground">
              <strong className="text-foreground">Security Note:</strong> Client-side Vue apps expose environment variables in the browser.
              Use a server-side proxy (Nuxt, Express) for production deployments to protect your API key.
            </p>
          </div>
        </div>
      </section>

      <section id="vue-client">
        <StepHeader step={3} title="Create the API Client" />
        <p className="text-[11px] text-muted-foreground mb-3">
          Create <code className="text-primary font-mono">src/lib/yocloud.ts</code> — the same type-safe API client works with Vue:
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
  cloudinary_url: string | null;
  created_at: string;
}

async function api<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
  const res = await fetch(\`\${BASE_URL}\${endpoint}\`, {
    ...options,
    headers: {
      "X-API-Key": API_KEY,
      "Content-Type": "application/json",
      ...options.headers,
    },
  });

  if (!res.ok) {
    const err = await res.json();
    throw new Error(err.error || \`API error: \${res.status}\`);
  }
  return res.json();
}

export const listFiles = (limit = 50) =>
  api<{ files: CloudFile[] }>(\`/files?limit=\${limit}\`);

export const uploadFile = (name: string, content_base64: string, mime_type?: string) =>
  api<{ file: CloudFile }>("/files/upload", {
    method: "POST",
    body: JSON.stringify({ name, content_base64, ...(mime_type ? { mime_type } : {}) }),
  });

export const deleteFile = (id: string) =>
  api<{ message: string }>(\`/files/\${id}\`, { method: "DELETE" });

export const createFolder = (name: string) =>
  api<{ folder: CloudFile }>("/folders", {
    method: "POST",
    body: JSON.stringify({ name }),
  });`} lang="typescript" {...codeProps} />
      </section>

      <section id="vue-composables">
        <StepHeader step={4} title="Create Vue Composables" />
        <p className="text-[11px] text-muted-foreground mb-3">
          Create <code className="text-primary font-mono">src/composables/useYoCloud.ts</code> — Vue composable functions using the Composition API for reactive data management:
        </p>
        <CodeBlock code={`// src/composables/useYoCloud.ts

import { ref, onMounted } from "vue";
import { listFiles, uploadFile, deleteFile, type CloudFile } from "../lib/yocloud";

export function useFiles() {
  const files = ref<CloudFile[]>([]);
  const loading = ref(true);
  const error = ref<string | null>(null);

  const fetchFiles = async () => {
    loading.value = true;
    error.value = null;
    try {
      const data = await listFiles(50);
      files.value = data.files;
    } catch (err: any) {
      error.value = err.message;
    } finally {
      loading.value = false;
    }
  };

  onMounted(fetchFiles);

  return { files, loading, error, refetch: fetchFiles };
}

export function useUpload() {
  const uploading = ref(false);
  const uploadStatus = ref("");

  const upload = async (file: File, onSuccess?: () => void) => {
    uploading.value = true;
    uploadStatus.value = "Reading file...";

    return new Promise<void>((resolve) => {
      const reader = new FileReader();
      reader.onload = async () => {
        const base64 = (reader.result as string).split(",")[1];
        uploadStatus.value = "Uploading...";

        try {
          await uploadFile(file.name, base64, file.type);
          uploadStatus.value = \`✅ Uploaded: \${file.name}\`;
          onSuccess?.();
        } catch (err: any) {
          uploadStatus.value = \`❌ \${err.message}\`;
        } finally {
          uploading.value = false;
          resolve();
        }
      };
      reader.readAsDataURL(file);
    });
  };

  return { uploading, uploadStatus, upload };
}

export function useDelete() {
  const deleting = ref(false);

  const remove = async (id: string, onSuccess?: () => void) => {
    deleting.value = true;
    try {
      await deleteFile(id);
      onSuccess?.();
    } catch (err: any) {
      console.error("Delete failed:", err.message);
    } finally {
      deleting.value = false;
    }
  };

  return { deleting, remove };
}`} lang="typescript" {...codeProps} />
      </section>

      <section id="vue-components">
        <StepHeader step={5} title="Build the File List Component" />
        <p className="text-[11px] text-muted-foreground mb-3">
          Create <code className="text-primary font-mono">src/components/FileList.vue</code>:
        </p>
        <CodeBlock code={`<!-- src/components/FileList.vue -->

<script setup lang="ts">
import { useFiles, useDelete } from "../composables/useYoCloud";

const { files, loading, error, refetch } = useFiles();
const { deleting, remove } = useDelete();

function formatSize(bytes: number | null) {
  if (!bytes) return "—";
  if (bytes < 1024) return \`\${bytes} B\`;
  if (bytes < 1024 * 1024) return \`\${(bytes / 1024).toFixed(1)} KB\`;
  return \`\${(bytes / (1024 * 1024)).toFixed(1)} MB\`;
}

function handleDelete(id: string) {
  remove(id, () => refetch());
}
</script>

<template>
  <!-- Loading State -->
  <div v-if="loading" class="space-y-2">
    <div v-for="i in 5" :key="i" class="h-16 rounded-lg bg-gray-100 animate-pulse" />
  </div>

  <!-- Error State -->
  <div v-else-if="error" class="p-4 rounded-lg bg-red-50 text-red-600 text-sm">
    Error: {{ error }}
  </div>

  <!-- File List -->
  <div v-else class="space-y-1">
    <div
      v-for="file in files"
      :key="file.id"
      class="flex items-center gap-4 p-4 rounded-lg border hover:bg-gray-50 transition-colors"
    >
      <span class="text-2xl">{{ file.is_folder ? "📁" : "📄" }}</span>
      <div class="flex-1 min-w-0">
        <p class="font-medium truncate">{{ file.name }}</p>
        <p class="text-sm text-gray-500">
          {{ file.is_folder ? "Folder" : \`\${formatSize(file.size)} · \${file.mime_type || "Unknown"}\` }}
        </p>
      </div>
      <a
        v-if="file.cloudinary_url"
        :href="file.cloudinary_url"
        target="_blank"
        class="text-blue-600 text-sm hover:underline"
      >
        Download
      </a>
      <button
        v-if="!file.is_folder"
        @click="handleDelete(file.id)"
        :disabled="deleting"
        class="text-red-500 text-sm hover:underline"
      >
        Delete
      </button>
    </div>

    <p v-if="files.length === 0" class="text-center text-gray-400 py-12">
      No files yet. Upload one!
    </p>
  </div>
</template>`} lang="html" {...codeProps} />
      </section>

      <section id="vue-upload">
        <StepHeader step={6} title="Build the Upload Component" />
        <p className="text-[11px] text-muted-foreground mb-3">
          Create <code className="text-primary font-mono">src/components/UploadButton.vue</code>:
        </p>
        <CodeBlock code={`<!-- src/components/UploadButton.vue -->

<script setup lang="ts">
import { ref } from "vue";
import { useUpload } from "../composables/useYoCloud";

const emit = defineEmits<{ uploaded: [] }>();
const fileInput = ref<HTMLInputElement | null>(null);
const { uploading, uploadStatus, upload } = useUpload();

async function handleUpload() {
  const file = fileInput.value?.files?.[0];
  if (!file) return;
  await upload(file, () => emit("uploaded"));
  if (fileInput.value) fileInput.value.value = "";
}
</script>

<template>
  <div class="flex flex-col sm:flex-row items-start sm:items-center gap-3 p-4 rounded-lg border">
    <input ref="fileInput" type="file" class="text-sm" />
    <button
      @click="handleUpload"
      :disabled="uploading"
      class="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 text-sm"
    >
      {{ uploading ? "Uploading..." : "Upload File" }}
    </button>
    <span v-if="uploadStatus" class="text-sm text-gray-600">{{ uploadStatus }}</span>
  </div>
</template>`} lang="html" {...codeProps} />
      </section>

      <section id="vue-app">
        <StepHeader step={7} title="Wire Everything in App.vue" last />
        <p className="text-[11px] text-muted-foreground mb-3">
          Update <code className="text-primary font-mono">src/App.vue</code>:
        </p>
        <CodeBlock code={`<!-- src/App.vue -->

<script setup lang="ts">
import { ref } from "vue";
import FileList from "./components/FileList.vue";
import UploadButton from "./components/UploadButton.vue";

const fileListKey = ref(0);

function handleUploaded() {
  fileListKey.value++; // Force re-mount to refetch
}
</script>

<template>
  <main class="max-w-4xl mx-auto p-8">
    <h1 class="text-3xl font-bold mb-2">My Cloud Files</h1>
    <p class="text-gray-500 mb-6">Powered by YoCloud API · Built with Vue 3</p>

    <div class="mb-6">
      <h2 class="text-lg font-semibold mb-2">Upload a File</h2>
      <UploadButton @uploaded="handleUploaded" />
    </div>

    <h2 class="text-lg font-semibold mb-3">All Files</h2>
    <FileList :key="fileListKey" />
  </main>
</template>`} lang="html" {...codeProps} />
        <div className="mt-4">
          <p className="text-[10px] font-semibold text-foreground mb-2">Start the dev server:</p>
          <CodeBlock code={`npm run dev
# Visit http://localhost:5173`} lang="bash" {...codeProps} />
        </div>
      </section>

      <section id="vue-structure">
        <div className="p-4 rounded-xl border border-border bg-secondary/20">
          <h3 className="text-sm font-bold text-foreground mb-2 flex items-center gap-2">
            <FolderPlus className="w-4 h-4 text-primary" />
            Final Project Structure
          </h3>
          <pre className="text-[11px] font-mono text-muted-foreground whitespace-pre">{`my-yocloud-vue/
├── .env                          ← API key
├── src/
│   ├── App.vue                   ← Main app
│   ├── lib/
│   │   └── yocloud.ts            ← API client
│   ├── composables/
│   │   └── useYoCloud.ts         ← Vue composables
│   └── components/
│       ├── FileList.vue           ← File listing
│       └── UploadButton.vue       ← Upload component
├── package.json
└── vite.config.ts`}</pre>
        </div>
      </section>

      <section id="vue-tips">
        <div className="p-4 rounded-xl border border-border bg-primary/5">
          <h3 className="text-sm font-bold text-foreground mb-2">💡 Pro Tips</h3>
          <ul className="space-y-1.5 text-[11px] text-muted-foreground">
            <li className="flex gap-2"><Check className="w-3.5 h-3.5 text-emerald-500 shrink-0 mt-0.5" /><span>Use <strong className="text-foreground">Pinia</strong> for centralized state management across components</span></li>
            <li className="flex gap-2"><Check className="w-3.5 h-3.5 text-emerald-500 shrink-0 mt-0.5" /><span>Use <strong className="text-foreground">Vue Router</strong> for nested folder navigation</span></li>
            <li className="flex gap-2"><Check className="w-3.5 h-3.5 text-emerald-500 shrink-0 mt-0.5" /><span>Consider <strong className="text-foreground">Nuxt 3</strong> for server-side rendering and API route proxying</span></li>
            <li className="flex gap-2"><Check className="w-3.5 h-3.5 text-emerald-500 shrink-0 mt-0.5" /><span>Use <strong className="text-foreground">VueUse</strong> library for utilities like <code className="font-mono text-primary">useFileDialog</code> for file uploads</span></li>
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
