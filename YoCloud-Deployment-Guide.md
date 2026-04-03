# YoCloud — Complete Deployment & Self-Hosting Guide

> **Version**: 2.0 | **Last Updated**: March 2026  
> This guide covers everything from local development to production deployment on Vercel, Netlify, Cloudflare Pages, and any static hosting provider.

---

## Table of Contents

1. [Prerequisites](#1-prerequisites)
2. [Clone & Install](#2-clone--install)
3. [Environment Variables](#3-environment-variables)
4. [Supabase Project Setup](#4-supabase-project-setup)
5. [Database Schema & Migrations](#5-database-schema--migrations)
6. [Edge Functions Setup](#6-edge-functions-setup)
7. [Supabase Secrets Configuration](#7-supabase-secrets-configuration)
8. [Cloudinary Setup](#8-cloudinary-setup)
9. [Third-Party Integrations](#9-third-party-integrations)
10. [Local Development](#10-local-development)
11. [Build for Production](#11-build-for-production)
12. [Deploy to Vercel](#12-deploy-to-vercel)
13. [Deploy to Netlify](#13-deploy-to-netlify)
14. [Deploy to Cloudflare Pages](#14-deploy-to-cloudflare-pages)
15. [Deploy with Docker](#15-deploy-with-docker)
16. [Deploy to Any Static Host](#16-deploy-to-any-static-host)
17. [Custom Domain Setup](#17-custom-domain-setup)
18. [Post-Deployment Checklist](#18-post-deployment-checklist)
19. [Troubleshooting](#19-troubleshooting)

---

## 1. Prerequisites

Before starting, ensure you have:

| Tool | Version | Purpose |
|------|---------|---------|
| **Node.js** | >= 18.x | JavaScript runtime |
| **npm / bun / pnpm** | Latest | Package manager |
| **Git** | Latest | Version control |
| **Supabase CLI** | >= 1.100.0 | Database migrations & edge functions |
| **Supabase Account** | Free tier works | Backend (database, auth, edge functions) |
| **Cloudinary Account** | Free tier works | File storage & media optimization |

### Install Supabase CLI

```bash
# macOS
brew install supabase/tap/supabase

# npm (cross-platform)
npm install -g supabase

# Windows (scoop)
scoop bucket add supabase https://github.com/supabase/scoop-bucket.git
scoop install supabase
```

Verify installation:
```bash
supabase --version
```

---

## 2. Clone & Install

```bash
# Clone the repository
git clone <your-repo-url>
cd yocloud

# Install dependencies (choose one)
npm install
# or
bun install
# or
pnpm install
```

---

## 3. Environment Variables

Create a `.env` file in the project root:

```env
VITE_SUPABASE_URL=https://your-project-ref.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=your-anon-key
VITE_SUPABASE_PROJECT_ID=your-project-ref
```

> **Where to find these values:**
> 1. Go to [supabase.com/dashboard](https://supabase.com/dashboard)
> 2. Select your project
> 3. Go to **Settings → API**
> 4. Copy the **Project URL** → `VITE_SUPABASE_URL`
> 5. Copy the **anon/public key** → `VITE_SUPABASE_PUBLISHABLE_KEY`
> 6. The project ref is the subdomain in the URL (e.g., `abcdefghijkl`) → `VITE_SUPABASE_PROJECT_ID`

---

## 4. Supabase Project Setup

### 4.1 Create a Supabase Project

1. Go to [supabase.com/dashboard](https://supabase.com/dashboard)
2. Click **"New Project"**
3. Choose your organization
4. Set a **project name** (e.g., `yocloud-prod`)
5. Set a strong **database password** (save this — you'll need it)
6. Choose a **region** closest to your users
7. Click **"Create new project"**

### 4.2 Link Supabase CLI to Your Project

```bash
# Login to Supabase CLI
supabase login

# Link your project (run from project root)
supabase link --project-ref your-project-ref

# You'll be prompted for the database password you set earlier
```

### 4.3 Verify the Link

```bash
supabase status
```

This should show your project URL, API keys, and database connection info.

---

## 5. Database Schema & Migrations

YoCloud uses 30+ tables. All migrations are in `supabase/migrations/`.

### 5.1 Push All Migrations to Supabase

```bash
# Push all migrations to your Supabase project
supabase db push
```

This will apply all SQL migration files in order. If prompted about existing objects, choose to apply anyway.

### 5.2 Verify Tables Were Created

Go to your Supabase Dashboard → **Table Editor** and confirm these core tables exist:

| Table | Purpose |
|-------|---------|
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
| `marketplace_listings` | Published marketplace items |
| `marketplace_likes` / `marketplace_saves` | Social interactions |
| `marketplace_comments` | Comments on listings |
| `chats` / `chat_messages` | Real-time messaging |
| `notifications` | User notifications |
| `activity_log` | File activity tracking |
| `user_settings` | Per-user preferences |
| `user_roles` | Admin/moderator/user roles |
| `api_keys` | Developer API keys |
| `api_usage_logs` | API usage tracking |
| `api_subscriptions` | API plan subscriptions |
| `transactions` | Payment records |

### 5.3 Seed Initial Data

After migrations, run these SQL commands in Supabase SQL Editor:

#### Marketplace Categories

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

#### Workspace Templates

```sql
INSERT INTO public.workspace_templates (name, description, folder_structure, is_system) VALUES
  ('Empty', 'Start with a clean workspace', '[]', true),
  ('Project', 'Standard project structure', '[{"name":"Documents"},{"name":"Images"},{"name":"Videos"},{"name":"Archives"}]', true),
  ('Team', 'Team collaboration workspace', '[{"name":"Shared"},{"name":"Resources"},{"name":"Drafts"},{"name":"Final"}]', true);
```

### 5.4 Create Your Admin User

After signing up through the app, make yourself admin:

```sql
-- Replace 'your-user-uuid' with your actual user ID from auth.users
INSERT INTO public.user_roles (user_id, role)
VALUES ('your-user-uuid', 'admin');
```

> **Tip:** Find your user ID in Supabase Dashboard → **Authentication → Users**

---

## 6. Edge Functions Setup

YoCloud uses several Supabase Edge Functions. They are in `supabase/functions/`.

### 6.1 Deploy All Edge Functions

```bash
# Deploy all edge functions at once
supabase functions deploy

# Or deploy individually
supabase functions deploy cloudinary-upload --no-verify-jwt
supabase functions deploy cloudinary-delete --no-verify-jwt
supabase functions deploy download-folder-zip --no-verify-jwt
supabase functions deploy send-email --no-verify-jwt
supabase functions deploy send-share-invite --no-verify-jwt
supabase functions deploy send-workspace-invite --no-verify-jwt
supabase functions deploy share-password --no-verify-jwt
supabase functions deploy uddoktapay-init --no-verify-jwt
supabase functions deploy uddoktapay-verify --no-verify-jwt
supabase functions deploy ai-image-analyze
supabase functions deploy public-api
supabase functions deploy check-subscriptions
```

> **Note:** Functions with `--no-verify-jwt` are called from the client without JWT verification (they handle auth internally). Check `supabase/config.toml` for the full list.

### 6.2 Verify Deployment

```bash
supabase functions list
```

All functions should show as `ACTIVE`.

---

## 7. Supabase Secrets Configuration

Edge functions need these secrets. Set them via CLI:

```bash
# Cloudinary (required for file uploads)
supabase secrets set CLOUDINARY_CLOUD_NAME=your_cloud_name
supabase secrets set CLOUDINARY_API_KEY=your_api_key
supabase secrets set CLOUDINARY_API_SECRET=your_api_secret

# Google Gemini AI (required for AI image analysis)
supabase secrets set GOOGLE_AI_API_KEY=your_gemini_key
# Or alternatively:
supabase secrets set GEMINI_API_KEY=your_gemini_key

# Gmail SMTP (required for email notifications/invites)
supabase secrets set GMAIL_USER=your_email@gmail.com
supabase secrets set GMAIL_APP_PASSWORD=your_app_password

# UddoktaPay (required for payments — Bangladesh payment gateway)
supabase secrets set UDDOKTAPAY_API_KEY=your_uddoktapay_key
```

### Verify Secrets

```bash
supabase secrets list
```

> **Gmail App Password Setup:**
> 1. Go to Google Account → Security → 2-Step Verification (enable it)
> 2. Go to [myaccount.google.com/apppasswords](https://myaccount.google.com/apppasswords)
> 3. Generate a new app password for "Mail"
> 4. Use that 16-character password as `GMAIL_APP_PASSWORD`

---

## 8. Cloudinary Setup

YoCloud uses Cloudinary for all file storage and media optimization.

### 8.1 Create Cloudinary Account

1. Go to [cloudinary.com](https://cloudinary.com) and sign up (free tier gives 25GB)
2. Go to **Dashboard** → copy your **Cloud Name**, **API Key**, and **API Secret**

### 8.2 Configure Upload Preset (Optional)

For unsigned uploads, create an upload preset:
1. Go to **Settings → Upload**
2. Add an upload preset with **Signing Mode: Signed**
3. Set folder to `yocloud/`

> Files are stored in `yocloud/{user_id}/` folder structure automatically.

---

## 9. Third-Party Integrations

### 9.1 Google Gemini AI

1. Go to [aistudio.google.com/app/apikey](https://aistudio.google.com/app/apikey)
2. Create an API key
3. Set it as `GOOGLE_AI_API_KEY` in Supabase secrets

### 9.2 UddoktaPay (Bangladesh Payment Gateway)

1. Sign up at [uddoktapay.com](https://uddoktapay.com)
2. Get your API key from the dashboard
3. Set sandbox/production API URL in the edge function
4. Set `UDDOKTAPAY_API_KEY` in Supabase secrets

> **Note:** Switch from sandbox to production URL when going live.

---

## 10. Local Development

```bash
# Start the development server
npm run dev

# The app will be available at http://localhost:8080
```

### Local Supabase (Optional)

For fully local development without a remote Supabase:

```bash
# Start local Supabase (requires Docker)
supabase start

# This gives you local PostgreSQL, Auth, Storage, and Edge Functions
# Update .env to point to local URLs (shown after supabase start)

# Stop when done
supabase stop
```

---

## 11. Build for Production

```bash
# Build the app
npm run build

# Output will be in the dist/ directory
# Preview the build locally
npm run preview
```

The `dist/` folder contains static files ready for deployment.

---

## 12. Deploy to Vercel

### 12.1 Via Vercel Dashboard (Recommended)

1. Go to [vercel.com](https://vercel.com) and sign in
2. Click **"Add New Project"**
3. Import your Git repository
4. **Configure:**
   - **Framework Preset**: Vite
   - **Build Command**: `npm run build`
   - **Output Directory**: `dist`
   - **Install Command**: `npm install`
5. Add **Environment Variables**:
   ```
   VITE_SUPABASE_URL = https://your-project-ref.supabase.co
   VITE_SUPABASE_PUBLISHABLE_KEY = your-anon-key
   VITE_SUPABASE_PROJECT_ID = your-project-ref
   ```
6. Click **"Deploy"**

### 12.2 Via Vercel CLI

```bash
# Install Vercel CLI
npm install -g vercel

# Login
vercel login

# Deploy (from project root)
vercel

# For production deployment
vercel --prod
```

### 12.3 Vercel Configuration File (Optional)

Create `vercel.json` in project root for SPA routing:

```json
{
  "rewrites": [
    { "source": "/(.*)", "destination": "/index.html" }
  ],
  "buildCommand": "npm run build",
  "outputDirectory": "dist",
  "framework": "vite"
}
```

### 12.4 Auto-Deploy on Push

Vercel automatically deploys on every push to your connected Git branch:
- **Production**: pushes to `main` / `master`
- **Preview**: pushes to any other branch

---

## 13. Deploy to Netlify

### 13.1 Via Netlify Dashboard

1. Go to [app.netlify.com](https://app.netlify.com)
2. Click **"Add new site" → "Import an existing project"**
3. Connect your Git repository
4. **Configure:**
   - **Build Command**: `npm run build`
   - **Publish Directory**: `dist`
5. Add environment variables in **Site Settings → Environment Variables**
6. Click **"Deploy site"**

### 13.2 Netlify Configuration File

Create `netlify.toml` in project root:

```toml
[build]
  command = "npm run build"
  publish = "dist"

[[redirects]]
  from = "/*"
  to = "/index.html"
  status = 200
```

### 13.3 Via Netlify CLI

```bash
# Install
npm install -g netlify-cli

# Login
netlify login

# Deploy
netlify deploy --prod --dir=dist
```

---

## 14. Deploy to Cloudflare Pages

### 14.1 Via Cloudflare Dashboard

1. Go to [dash.cloudflare.com](https://dash.cloudflare.com) → **Pages**
2. Click **"Create a project" → "Connect to Git"**
3. Select your repository
4. **Configure:**
   - **Framework preset**: None (or Vite if available)
   - **Build command**: `npm run build`
   - **Build output directory**: `dist`
5. Add environment variables
6. Deploy

### 14.2 SPA Routing

Create `public/_redirects` file:
```
/*   /index.html   200
```

### 14.3 Via Wrangler CLI

```bash
# Install
npm install -g wrangler

# Login
wrangler login

# Deploy
npx wrangler pages deploy dist --project-name=yocloud
```

---

## 15. Deploy with Docker

### 15.1 Dockerfile

Create `Dockerfile` in project root:

```dockerfile
# Build stage
FROM node:20-alpine AS build

WORKDIR /app

COPY package*.json ./
RUN npm ci

COPY . .

ARG VITE_SUPABASE_URL
ARG VITE_SUPABASE_PUBLISHABLE_KEY
ARG VITE_SUPABASE_PROJECT_ID

RUN npm run build

# Production stage
FROM nginx:alpine

COPY --from=build /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
```

### 15.2 Nginx Config

Create `nginx.conf`:

```nginx
server {
    listen 80;
    server_name _;
    root /usr/share/nginx/html;
    index index.html;

    location / {
        try_files $uri $uri/ /index.html;
    }

    location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg|woff|woff2|ttf|eot)$ {
        expires 1y;
        add_header Cache-Control "public, immutable";
    }

    gzip on;
    gzip_types text/plain text/css application/json application/javascript text/xml application/xml text/javascript image/svg+xml;
}
```

### 15.3 Build & Run

```bash
# Build image
docker build \
  --build-arg VITE_SUPABASE_URL=https://your-ref.supabase.co \
  --build-arg VITE_SUPABASE_PUBLISHABLE_KEY=your-anon-key \
  --build-arg VITE_SUPABASE_PROJECT_ID=your-ref \
  -t yocloud .

# Run container
docker run -p 3000:80 yocloud
```

---

## 16. Deploy to Any Static Host

Since YoCloud builds to static files, you can deploy anywhere:

```bash
# Build
npm run build

# The dist/ folder is your deployable artifact
# Upload it to any static hosting provider
```

### Important: SPA Routing

YoCloud is a Single Page Application (SPA). You **must** configure your host to redirect all routes to `index.html`. Without this, refreshing any page other than `/` will return a 404.

| Platform | Config |
|----------|--------|
| Vercel | `vercel.json` rewrites |
| Netlify | `_redirects` or `netlify.toml` |
| Cloudflare | `_redirects` file |
| Nginx | `try_files $uri /index.html` |
| Apache | `.htaccess` with `RewriteRule` |
| Firebase | `firebase.json` rewrites |
| GitHub Pages | Use a 404.html hack or `spa-github-pages` |

### Apache `.htaccess` (if using Apache)

```apache
<IfModule mod_rewrite.c>
  RewriteEngine On
  RewriteBase /
  RewriteRule ^index\.html$ - [L]
  RewriteCond %{REQUEST_FILENAME} !-f
  RewriteCond %{REQUEST_FILENAME} !-d
  RewriteRule . /index.html [L]
</IfModule>
```

### Firebase Hosting

```json
{
  "hosting": {
    "public": "dist",
    "rewrites": [
      { "source": "**", "destination": "/index.html" }
    ]
  }
}
```

---

## 17. Custom Domain Setup

### On Vercel
1. Go to project → **Settings → Domains**
2. Add your domain
3. Update DNS: Add CNAME record pointing to `cname.vercel-dns.com`

### On Netlify
1. Go to **Site Settings → Domain Management**
2. Add custom domain
3. Update DNS as instructed

### On Cloudflare Pages
1. Go to project → **Custom Domains**
2. Add your domain (if domain is on Cloudflare, DNS is auto-configured)

### Supabase Custom Domain (Optional)
For a custom API domain instead of `*.supabase.co`:
1. Go to Supabase Dashboard → **Settings → Custom Domains**
2. Follow the verification steps
3. Update `VITE_SUPABASE_URL` in your deployment

---

## 18. Post-Deployment Checklist

After deploying, verify everything works:

- [ ] **Auth**: Sign up and login work
- [ ] **File Upload**: Upload a file via Cloudinary
- [ ] **File Preview**: Preview images, PDFs, HTML, and Markdown files
- [ ] **Workspaces**: Create and switch between workspaces
- [ ] **Sharing**: Share a file via link
- [ ] **Marketplace**: Publish and browse listings
- [ ] **Chat**: Send and receive messages
- [ ] **Notifications**: Receive in-app notifications
- [ ] **Admin Panel**: Access admin dashboard (if admin)
- [ ] **API**: Generate API key and test endpoints
- [ ] **PWA**: Install as PWA on mobile
- [ ] **Dark Mode**: Toggle between light/dark themes

### Supabase Auth Redirect URLs

**Critical:** Add your production URL to Supabase allowed redirect URLs:

1. Go to Supabase Dashboard → **Authentication → URL Configuration**
2. Add your production URL to **Redirect URLs**:
   ```
   https://yourdomain.com/**
   https://yourdomain.com
   ```

### CORS for Edge Functions

Edge functions have `Access-Control-Allow-Origin: *` by default. For production, consider restricting to your domain only.

---

## 19. Troubleshooting

### Common Issues

| Issue | Solution |
|-------|----------|
| **404 on page refresh** | Configure SPA routing (see Section 16) |
| **"Missing Supabase URL"** | Check environment variables are set correctly |
| **Auth not working** | Add production URL to Supabase redirect URLs |
| **File upload fails** | Verify Cloudinary secrets in Supabase |
| **Edge function errors** | Check `supabase functions logs <function-name>` |
| **CORS errors** | Ensure edge functions have proper CORS headers |
| **Build fails** | Run `npm run build` locally first to catch errors |
| **PWA not installing** | Ensure HTTPS and valid `manifest.json` |

### Debugging Edge Functions

```bash
# View logs for a specific function
supabase functions logs cloudinary-upload --tail

# Test a function locally
supabase functions serve cloudinary-upload --no-verify-jwt
```

### Resetting Database

```bash
# Reset and re-apply all migrations (DESTRUCTIVE — development only!)
supabase db reset
```

---

## Quick Reference Commands

```bash
# === Supabase CLI ===
supabase login                          # Authenticate CLI
supabase link --project-ref <ref>       # Link to project
supabase db push                        # Apply migrations
supabase db reset                       # Reset database (dev only)
supabase functions deploy               # Deploy all edge functions
supabase functions logs <name> --tail   # View function logs
supabase secrets set KEY=value          # Set a secret
supabase secrets list                   # List all secrets

# === Development ===
npm run dev                             # Start dev server (port 8080)
npm run build                           # Production build → dist/
npm run preview                         # Preview production build
npm run test                            # Run unit tests

# === Deployment ===
vercel --prod                           # Deploy to Vercel
netlify deploy --prod --dir=dist        # Deploy to Netlify
npx wrangler pages deploy dist          # Deploy to Cloudflare
```

---

**Built with ❤️ by the YoCloud Team**
