# YoCloud — Modern Cloud Storage Platform

YoCloud is a full-featured cloud storage and file management application built with React, Vite, TypeScript, Tailwind CSS, and Supabase.

---

## 🚀 Features

- **File Management** — Upload, organize, rename, move, star, trash & restore files/folders
- **Workspaces** — Create team workspaces with role-based permissions (owner/admin/member)
- **File Sharing** — Share files via links with expiry, password protection, download limits, QR codes
- **Marketplace** — Publish and discover community files with likes, saves, comments
- **Chat** — Real-time messaging between marketplace users with message editing, replies, image sharing
- **Developer API** — REST API with key management, usage analytics, webhooks
- **AI Image Analysis** — Analyze images using Google Gemini AI via API endpoint
- **File Versioning** — Upload new versions and track version history
- **Tags & Comments** — Organize files with color-coded tags, leave threaded comments
- **Admin Panel** — User management, storage analytics, marketplace moderation
- **Dark/Light Mode** — Full theme support with system auto-detection
- **PWA** — Installable as a native-like app on mobile and desktop
- **QR Scanner** — Scan QR codes to open shared files (mobile)
- **Notifications** — Real-time notifications for shares, comments, workspace invites

---

## 📦 Tech Stack

| Layer | Technology |
|---|---|
| Frontend | React 18, TypeScript, Vite 5 |
| Styling | Tailwind CSS 3, shadcn/ui, Framer Motion |
| Backend | Supabase |
| Database | PostgreSQL (Supabase) |
| Auth | Supabase Auth (email/password) |
| Storage | Cloudinary (file uploads) |
| AI | Google Gemini API |
| State | TanStack React Query |
| Routing | React Router v6 |

---

## 🛠️ Local Development Setup

### Prerequisites

- **Node.js** >= 18.x
- **npm**, **bun**, or **pnpm**
- A Supabase project

### 1. Clone the repository

```bash
git clone <your-repo-url>
cd yocloud
```

### 2. Install dependencies

```bash
npm install
# or
bun install
```

### 3. Environment Variables

Create a `.env` file in the project root:

```env
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=your-anon-key
VITE_SUPABASE_PROJECT_ID=your-project-id
```

>

### 4. Start Development Server

```bash
npm run dev
```

The app will be available at `http://localhost:5173`

### 5. Build for Production

```bash
npm run build
```

Output will be in the `dist/` directory.

---

## 🗄️ Database Setup

The database uses Supabase PostgreSQL. All migrations are in `supabase/migrations/`.

### Core Tables

| Table | Purpose |
|---|---|
| `profiles` | User profiles (display name, avatar, storage plan) |
| `files` | Files & folders with workspace association |
| `file_shares` | Share links with tokens, passwords, expiry |
| `file_versions` | Version history for files |
| `file_comments` | Threaded comments on files |
| `file_tags` / `tags` | Color-coded tagging system |
| `workspaces` | Team workspaces |
| `workspace_members` | Workspace membership with roles |
| `workspace_invites` | Email-based workspace invitations |
| `workspace_invite_links` | Shareable invite links |
| `workspace_folder_permissions` | Per-folder permissions |
| `workspace_member_permissions` | Per-member permissions |
| `marketplace_listings` | Published marketplace items |
| `marketplace_likes` / `marketplace_saves` | Social interactions |
| `marketplace_comments` | Comments on listings |
| `marketplace_categories` | Listing categories |
| `marketplace_reports` | Content reports |
| `chats` / `chat_messages` | Real-time messaging |
| `notifications` | User notifications |
| `activity_log` | File activity tracking |
| `user_settings` | Per-user preferences |
| `user_roles` | Admin/moderator/user roles |
| `api_keys` | Developer API keys |
| `api_usage_logs` | API usage tracking |
| `api_webhooks` | Webhook configurations |
| `api_subscriptions` | API plan subscriptions |
| `transactions` | Payment records |
| `system_config` | System-wide settings |
| `share_access_log` | Share link analytics |
| `share_invites` | Email share invitations |
| `admin_action_logs` | Admin audit trail |

### Running Migrations

If using Supabase CLI:

```bash
supabase db push
```

Or apply migrations manually via SQL editor in Supabase Dashboard.

### Key Database Functions

| Function | Purpose |
|---|---|
| `has_role(user_id, role)` | Check if user has an app role (admin/moderator/user) |
| `has_workspace_role(user_id, workspace_id, role)` | Check workspace role |
| `is_workspace_member(user_id, workspace_id)` | Check workspace membership |
| `is_workspace_admin_or_owner(user_id, workspace_id)` | Check admin/owner access |
| `search_files_advanced(...)` | Full-text search with filters |
| `record_marketplace_download(listing_id)` | Track downloads |
| `record_marketplace_like(listing_id, delta)` | Track likes |

### Inserting Initial Data

#### Create Admin User

After signing up, make yourself admin:

```sql
INSERT INTO public.user_roles (user_id, role)
VALUES ('your-user-uuid', 'admin');
```

#### Create Marketplace Categories

```sql
INSERT INTO public.marketplace_categories (name, icon, sort_order) VALUES
  ('Documents', '📄', 1),
  ('Images', '🖼️', 2),
  ('Videos', '🎬', 3),
  ('Audio', '🎵', 4),
  ('Design', '🎨', 5),
  ('Code', '💻', 6),
  ('Templates', '📋', 7),
  ('Other', '📦', 8);
```

#### Create Workspace Templates

```sql
INSERT INTO public.workspace_templates (name, description, folder_structure, is_system) VALUES
  ('Empty', 'Start with a clean workspace', '[]', true),
  ('Project', 'Standard project structure', '[{"name":"Documents"},{"name":"Images"},{"name":"Videos"},{"name":"Archives"}]', true),
  ('Team', 'Team collaboration workspace', '[{"name":"Shared"},{"name":"Resources"},{"name":"Drafts"},{"name":"Final"}]', true);
```

---

## 🔌 Edge Functions

Located in `supabase/functions/`:

| Function | Purpose |
|---|---|
| `public-api` | REST API for developers (files, users, workspaces, AI) |
| `cloudinary-upload` | Upload files to Cloudinary |
| `cloudinary-delete` | Delete files from Cloudinary |
| `ai-image-analyze` | Analyze images using Google Gemini |
| `send-email` | Send transactional emails |
| `send-share-invite` | Send share invitation emails |
| `send-workspace-invite` | Send workspace invitation emails |
| `share-password` | Verify share link passwords |
| `download-folder-zip` | Generate ZIP downloads for folders |
| `uddoktapay-init` | Initialize payments |
| `uddoktapay-verify` | Verify payment status |
| `check-subscriptions` | Check API subscription status |

### Required Secrets (Edge Functions)

Set these in your Supabase project secrets:

| Secret | Purpose |
|---|---|
| `CLOUDINARY_CLOUD_NAME` | Cloudinary account name |
| `CLOUDINARY_API_KEY` | Cloudinary API key |
| `CLOUDINARY_API_SECRET` | Cloudinary API secret |
| `GEMINI_API_KEY` | Google Gemini API key for AI analysis |
| `UDDOKTAPAY_API_KEY` | Payment gateway key |
| `RESEND_API_KEY` | Email service key (optional) |

---

## 📱 PWA Installation

YoCloud is installable as a Progressive Web App:

1. Open the app in Chrome/Edge/Safari
2. Click "Add to Home Screen" or the install prompt
3. The app runs in standalone mode like a native app

---

## 🧪 Testing

```bash
# Unit tests
npm run test

# E2E tests (Playwright)
npx playwright test
```

---

## 📂 Project Structure

```
├── public/                  # Static assets, manifest, icons
├── src/
│   ├── assets/icons/        # File type icon images
│   ├── components/          # React components
│   │   ├── admin/           # Admin panel components
│   │   ├── chat/            # Chat/messaging components
│   │   ├── docs/            # Documentation layout
│   │   ├── marketplace/     # Marketplace components
│   │   └── ui/              # shadcn/ui primitives
│   ├── config/              # Configuration files (fileIcons.json)
│   ├── hooks/               # Custom React hooks
│   ├── integrations/        # Supabase client & types
│   ├── lib/                 # Utility functions
│   └── pages/               # Route pages
│       └── docs/            # Framework guide pages
├── supabase/
│   ├── functions/           # Edge functions
│   ├── migrations/          # Database migrations
│   └── config.toml          # Supabase config
├── index.html
├── vite.config.ts
├── tailwind.config.ts
└── tsconfig.json
```

---

## 📄 API Documentation

Full API documentation is available at `/api-docs` in the app, covering:

- **Authentication** — API key generation and usage
- **Files API** — List, upload, download, delete files
- **Users API** — Get user profile and storage info
- **Workspaces API** — List workspaces, get details with members
- **AI Analysis API** — Analyze images with Google Gemini
- **Webhooks** — Real-time event notifications

### Quick API Example

```bash
# List your files
curl -X GET "https://your-project.supabase.co/functions/v1/public-api/files" \
  -H "X-API-Key: yoc_your_api_key"

# Analyze an image
curl -X POST "https://your-project.supabase.co/functions/v1/public-api/ai/analyze-image" \
  -H "X-API-Key: yoc_your_api_key" \
  -H "Content-Type: application/json" \
  -d '{"image_url": "https://example.com/image.jpg"}'
```

---

## 🤝 Community

- **Discord**: [discord.gg/8jz3pUaebk](https://discord.gg/8jz3pUaebk)
- **Facebook**: [facebook.com/yocloud](https://facebook.com/yocloud)
- **Instagram**: [instagram.com/yocloud](https://instagram.com/yocloud)

---

## 📜 License

This project is proprietary. All rights reserved.

---

**Built with ❤️ by the YoCloud Team**
