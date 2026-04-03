import { useState, useEffect, useRef } from "react";
import { motion } from "framer-motion";
import { ArrowLeft, BookOpen, HardDrive, Share2, Users, Shield, Store, MessageSquare, Bell, Trash2, Settings, Code, Image, Folder, Search, Tag, BarChart3, Zap, Globe, CreditCard, Eye, ChevronRight } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { cn } from "@/lib/utils";
import { ScrollArea } from "@/components/ui/scroll-area";

interface DocSection {
  id: string;
  title: string;
  icon: any;
  content: DocBlock[];
}

interface DocBlock {
  type: "heading" | "paragraph" | "list" | "code" | "note" | "table";
  content?: string;
  items?: string[];
  rows?: string[][];
  language?: string;
}

const sections: DocSection[] = [
  {
    id: "file-management",
    title: "File Management",
    icon: HardDrive,
    content: [
      { type: "heading", content: "File Management System" },
      { type: "paragraph", content: "YoCloud provides a complete cloud file management system with upload, download, rename, move, star, and trash capabilities. Files are stored using Cloudinary CDN for fast global access with automatic optimization." },
      { type: "list", items: [
        "**Upload**: Drag & drop or click to upload. Max 100MB per file. Supports all file types including images, videos, documents, archives, and code files.",
        "**Multi-upload**: Queue multiple files simultaneously with individual progress tracking, retry on failure, and cancel support.",
        "**Folder system**: Create nested folders with unlimited depth. Move files between folders with cycle detection to prevent circular references.",
        "**Rename**: Inline rename with extension preservation. Duplicate name detection within the same folder prevents conflicts.",
        "**Star/Favorite**: Mark important files for quick access from the Favorites sidebar section.",
        "**Download**: Direct download via signed URLs (60s expiry) or Cloudinary CDN links.",
        "**File preview**: In-app preview for images, videos (with controls), PDFs (via Google Viewer), text files (with editing), and audio files.",
        "**Bulk operations**: Multi-select files for bulk trash, restore, delete, star, move, download, and share actions.",
        "**Grid/List view**: Toggle between list and grid layouts with sort by name, size, or date.",
      ]},
      { type: "note", content: "Storage limits are plan-based: Free (5GB), Pro (50GB), Business (200GB), Enterprise (1TB). Admins can override limits per-user." },
    ],
  },
  {
    id: "file-preview",
    title: "File Preview",
    icon: Eye,
    content: [
      { type: "heading", content: "Advanced File Preview System" },
      { type: "paragraph", content: "The preview modal provides rich file viewing with navigation, zoom, and inline actions." },
      { type: "list", items: [
        "**Image preview**: Full-resolution display with pinch-to-zoom (mobile), scroll zoom (desktop), and drag-to-pan in zoomed state.",
        "**Video preview**: HTML5 video player with play/pause, seek, and fullscreen. Autoplay disabled by default.",
        "**PDF preview**: Google Docs Viewer integration with zoom in/out controls and fit-to-screen button. Falls back to download if viewer fails.",
        "**Text/Code preview**: Syntax-highlighted code editor with save functionality and unsaved changes warning dialog.",
        "**Audio preview**: Native audio player with controls for supported formats (MP3, WAV, OGG, FLAC).",
        "**Office files**: Google Docs Viewer for DOCX, XLSX, PPTX with download fallback.",
        "**Navigation**: Previous/Next file navigation via arrow buttons and keyboard shortcuts (← →).",
        "**File details header**: Shows filename, file size, MIME type, and last modified date in the preview header.",
        "**Quick actions**: Download, Share, and Delete buttons directly inside the preview modal.",
        "**Fullscreen mode**: Toggle true fullscreen on desktop.",
        "**Preview type indicator**: Header badge showing file type (Image, Video, PDF, Text, etc.).",
        "**Lazy loading**: Heavy content defers loading until modal is fully open for faster perceived performance.",
      ]},
    ],
  },
  {
    id: "folder-system",
    title: "Folder System",
    icon: Folder,
    content: [
      { type: "heading", content: "Hierarchical Folder System" },
      { type: "paragraph", content: "Full nested folder support with breadcrumb navigation, permissions, and workspace integration." },
      { type: "list", items: [
        "**Create folders**: Quick create dialog with name validation and duplicate detection.",
        "**Nested folders**: Unlimited depth with recursive size calculation for parent folders.",
        "**Breadcrumb navigation**: Clickable breadcrumb trail showing full folder path with horizontal scroll on mobile.",
        "**Move files**: Move files/folders between locations with drag or dialog. Cycle detection prevents moving a folder into its own child.",
        "**Folder permissions**: Per-folder permission control in workspaces (view, edit, upload, delete).",
        "**Open from menu**: 3-dot menu includes 'Open' option for folders that navigates into the folder.",
      ]},
    ],
  },
  {
    id: "trash-system",
    title: "Trash System",
    icon: Trash2,
    content: [
      { type: "heading", content: "Soft-Delete Trash System" },
      { type: "paragraph", content: "A dedicated trash page with full management capabilities. Deleted files are soft-deleted first, allowing restoration within the auto-cleanup window." },
      { type: "list", items: [
        "**Dedicated trash page**: Separate `/trash` route with its own sidebar navigation entry.",
        "**Restore**: One-click restore returns files to their original location.",
        "**Permanent delete**: Two-step confirmation with file size and child count display for folders.",
        "**Bulk operations**: Select multiple trashed files for bulk restore or permanent delete.",
        "**Auto-cleanup**: Configurable auto-cleanup interval (7, 15, or 30 days) via Settings or Admin panel.",
        "**Storage recovery**: Permanent deletion shows exact storage space that will be freed.",
        "**Warning banner**: Persistent warning about permanent deletion being irreversible.",
        "**Empty state**: Friendly empty state when trash is empty with navigation back to storage.",
      ]},
    ],
  },
  {
    id: "sharing",
    title: "File Sharing",
    icon: Share2,
    content: [
      { type: "heading", content: "Advanced File Sharing System" },
      { type: "paragraph", content: "Comprehensive sharing with multiple access methods, security controls, and analytics tracking." },
      { type: "list", items: [
        "**Share link**: Generate unique shareable links with configurable permissions (view/edit).",
        "**Share code**: Short alphanumeric codes (e.g., `ABC123`) for easy verbal/text sharing.",
        "**QR code**: Auto-generated QR code for each share link with one-click download as PNG.",
        "**Password protection**: Optional password with strength indicator (weak/medium/strong). Server-side bcrypt hashing.",
        "**Expiry dates**: Set expiration (1 hour, 1 day, 7 days, 30 days, or custom date). Expired shares show clear error messages.",
        "**Download limits**: Set maximum download count. Shares auto-disable when limit is reached with user-friendly messaging.",
        "**Access types**: Public (anyone with link), Private (invited users only), or Domain-restricted.",
        "**Email invitations**: Send share invitations via email with the share link embedded.",
        "**Share analytics**: View count, download count, last accessed date, and access log with device/location info.",
        "**Edit existing shares**: Modify password, expiry, download limit, and permissions on active shares via edit dialog.",
        "**Custom slugs**: Set custom URL slugs for branded share links.",
        "**Shared file page**: Clean, branded page for recipients with download button, file info, and optional password prompt.",
      ]},
      { type: "note", content: "Share links use cryptographically secure tokens. Password-protected shares use bcrypt hashing via Edge Functions." },
    ],
  },
  {
    id: "workspaces",
    title: "Workspaces",
    icon: Users,
    content: [
      { type: "heading", content: "Workspace & Team Collaboration" },
      { type: "paragraph", content: "Multi-workspace system for team collaboration with role-based access, invitations, and isolated storage." },
      { type: "list", items: [
        "**Personal workspace**: Auto-created on first login. All existing files are migrated automatically.",
        "**Team workspaces**: Create shared workspaces with custom names, descriptions, and avatars.",
        "**Roles**: Three-tier role system — Owner, Admin, Member — with granular permission differences.",
        "**Invite members**: Email invitation with unique join link and configurable role assignment.",
        "**Invite links**: Reusable join links with optional max uses and expiry date.",
        "**Workspace switcher**: Global dropdown with mobile-responsive bottom sheet for switching contexts.",
        "**Member management**: Search, filter, change roles, remove members, and transfer ownership.",
        "**Per-member permissions**: Granular control over upload, edit, delete, share, invite, and folder management per member.",
        "**Folder permissions**: Per-folder access control within workspaces for fine-grained security.",
        "**Storage analytics**: 14-day activity trends and storage growth charts per workspace.",
        "**Activity export**: Export workspace activity logs as CSV or JSON.",
        "**Templates**: Pre-built folder structures for common workspace types (Engineering, Marketing, etc.).",
        "**Color themes**: Custom color theme per workspace for visual differentiation.",
        "**Workspace search**: Cross-workspace file search with relevance scoring.",
        "**Leave workspace**: Non-owner members can leave workspaces with confirmation.",
      ]},
      { type: "note", content: "Data isolation is enforced at the database level with RLS policies. Files in one workspace are completely invisible to members of other workspaces." },
    ],
  },
  {
    id: "marketplace",
    title: "Marketplace",
    icon: Store,
    content: [
      { type: "heading", content: "File Marketplace" },
      { type: "paragraph", content: "A community marketplace where users can publish, discover, and download shared files and templates." },
      { type: "list", items: [
        "**Publish files**: Share any file to the marketplace with title, description, category, and tags.",
        "**Categories**: Organized by system-defined categories with icons for easy browsing.",
        "**Search & filter**: Full-text search with category and tag filtering.",
        "**Like & Save**: Like listings and save them to your collection for later access.",
        "**Download tracking**: Automatic download count tracking with daily analytics.",
        "**Comments**: Threaded comment system on listings with reply support.",
        "**User profiles**: Public profile pages showing user's published listings and activity.",
        "**Dashboard**: Seller dashboard with analytics charts showing downloads, likes, and saves over time.",
        "**Featured listings**: Admin-curated featured listings highlighted on the marketplace homepage.",
        "**Reports**: Users can report listings for policy violations. Admins review and resolve reports.",
        "**Marketplace ban**: Admins can ban users from the marketplace separately from platform ban.",
        "**My listings**: Dedicated page to manage all your published marketplace items.",
      ]},
    ],
  },
  {
    id: "chat",
    title: "Marketplace Chat",
    icon: MessageSquare,
    content: [
      { type: "heading", content: "Marketplace Chat System" },
      { type: "paragraph", content: "Real-time messaging between marketplace users with rich features for communication about listed items." },
      { type: "list", items: [
        "**Real-time messaging**: Instant message delivery using real-time subscriptions.",
        "**Chat inbox**: Conversation list showing last message, timestamp, and unread indicators.",
        "**Product context**: Attach marketplace listings to messages as rich product cards with thumbnail and details.",
        "**Message actions**: Long-press or hover to reveal edit, delete, reply, and copy options.",
        "**Reply system**: Messenger-style reply bubbles with quoted original message and swipe-to-reply gesture.",
        "**Edit messages**: Edit sent messages with 'edited' indicator displayed.",
        "**Delete messages**: Soft-delete with 'message deleted' placeholder.",
        "**Image sending**: Share images in chat via Cloudinary upload with preview.",
        "**Timestamp grouping**: Messages grouped by date (Today, Yesterday, or date) with time shown on each message.",
        "**Scroll to bottom**: Floating button appears when scrolled up, with unread count badge.",
        "**Empty state**: Friendly empty state when no conversations exist with marketplace link.",
        "**Online presence**: Last active indicator on chat partners.",
        "**Fixed layout**: Header and input bar stay fixed on mobile for reliable UX.",
      ]},
    ],
  },
  {
    id: "notifications",
    title: "Notifications",
    icon: Bell,
    content: [
      { type: "heading", content: "Notification System" },
      { type: "paragraph", content: "Comprehensive notification system with real-time updates, filtering, and management." },
      { type: "list", items: [
        "**Real-time notifications**: Instant delivery for file shares, workspace invites, storage warnings, and system announcements.",
        "**Notification page**: Dedicated `/notifications` page with full history and management.",
        "**Header badge**: Unread count badge on the notification bell icon in the header.",
        "**Mark as read**: Individual or bulk mark-as-read functionality.",
        "**Pin notifications**: Pin important notifications to keep them at the top.",
        "**Filter by type**: Filter notifications by type (share, workspace, storage, system, etc.).",
        "**Sound & vibration**: Configurable notification sound and vibration (can be toggled in Settings).",
        "**Do Not Disturb**: DND mode to temporarily silence all notifications.",
        "**Mute by type**: Selectively mute specific notification types.",
        "**Admin bulk notifications**: Admins can send bulk notifications to all users or filtered groups.",
      ]},
    ],
  },
  {
    id: "tags",
    title: "Tags & Organization",
    icon: Tag,
    content: [
      { type: "heading", content: "File Tagging System" },
      { type: "paragraph", content: "Color-coded tag system for organizing and categorizing files across your storage." },
      { type: "list", items: [
        "**Create tags**: Custom tags with user-selected colors from a preset palette.",
        "**Assign tags**: Assign multiple tags to any file via the 3-dot menu → Manage Tags.",
        "**Tag display**: Tags shown as colored badges in file table rows and grid cards.",
        "**Search by tag**: Filter files by tag using the search and filter system.",
        "**Edit/Delete tags**: Manage tags from the tag management interface.",
        "**Per-user tags**: Tags are scoped to individual users — each user has their own tag library.",
      ]},
    ],
  },
  {
    id: "file-versions",
    title: "File Versions",
    icon: BarChart3,
    content: [
      { type: "heading", content: "File Version History" },
      { type: "paragraph", content: "Version control for files with upload, preview, and restore capabilities." },
      { type: "list", items: [
        "**Version history**: View all versions of a file with version number, upload date, and file size.",
        "**Upload new version**: Upload a new version of an existing file while preserving history.",
        "**Download any version**: Download any previous version of a file.",
        "**Version comparison**: Compare file sizes between versions to track changes.",
        "**Auto-versioning**: Version numbers auto-increment on each upload.",
      ]},
    ],
  },
  {
    id: "search",
    title: "Search System",
    icon: Search,
    content: [
      { type: "heading", content: "Advanced Search" },
      { type: "paragraph", content: "Multi-faceted search with filters, cross-workspace support, and relevance scoring." },
      { type: "list", items: [
        "**Instant search**: Debounced search (300ms) with real-time results as you type.",
        "**Type filters**: Filter by file type — Images, Videos, Documents, Audio, Archives, Code.",
        "**Size filters**: Filter by file size range (min/max).",
        "**Cross-workspace search**: Search across all your workspaces simultaneously with workspace name indicators.",
        "**Advanced search**: Database-level full-text search with trigram matching for fuzzy results.",
        "**Sort results**: Sort search results by relevance, name, size, or date.",
        "**Result count**: Display total result count with dynamic update.",
      ]},
    ],
  },
  {
    id: "qr-scanner",
    title: "QR Scanner",
    icon: Zap,
    content: [
      { type: "heading", content: "QR Code Scanner" },
      { type: "paragraph", content: "Built-in QR code scanner for quickly accessing shared files via share codes." },
      { type: "list", items: [
        "**Camera scanner**: Use device camera to scan QR codes with real-time detection.",
        "**Share code recognition**: Automatically recognizes YoCloud share links and codes.",
        "**Scan result drawer**: Clean drawer UI showing scan results with action buttons.",
        "**Direct navigation**: One-tap navigation to the shared file after scanning.",
        "**URL detection**: Handles both full URLs and short share codes.",
        "**Swipe to close**: Native-feel gesture to dismiss the scan result drawer.",
      ]},
    ],
  },
  {
    id: "developer-api",
    title: "Developer API",
    icon: Code,
    content: [
      { type: "heading", content: "Public REST API" },
      { type: "paragraph", content: "Full-featured REST API for programmatic access to YoCloud with comprehensive documentation and SDK examples." },
      { type: "list", items: [
        "**API key management**: Create, rotate, and revoke API keys with custom names and expiry dates.",
        "**Scoped permissions**: Fine-grained scopes — files:read, files:write, files:delete, shares:read, shares:write, tags:read, tags:write, user:read, workspaces:read, ai:analyze.",
        "**Plan-based rate limiting**: Free (3 RPM), Pro (9 RPM), Enterprise (Unlimited).",
        "**Usage analytics**: Real-time request logs with endpoint, status code, response time, and IP tracking.",
        "**Webhook system**: Configure webhooks for file events with delivery tracking and failure logging.",
      ]},
      { type: "heading", content: "API Endpoints" },
      { type: "table", rows: [
        ["Method", "Endpoint", "Description"],
        ["GET", "/files", "List all files with pagination"],
        ["GET", "/files/:id", "Get single file details"],
        ["POST", "/files", "Upload a new file"],
        ["PUT", "/files/:id", "Update file metadata"],
        ["DELETE", "/files/:id", "Permanently delete a file"],
        ["GET", "/folders", "List all folders"],
        ["POST", "/folders", "Create a new folder"],
        ["GET", "/shares", "List all shares"],
        ["POST", "/shares", "Create a new share"],
        ["GET", "/tags", "List all tags"],
        ["POST", "/tags", "Create a new tag"],
        ["GET", "/user/me", "Get current user profile"],
        ["GET", "/workspaces", "List all workspaces with details"],
        ["GET", "/workspaces/:id", "Get workspace details with members"],
        ["POST", "/ai/analyze", "AI image analysis (Gemini)"],
        ["GET", "/usage", "Get API usage statistics"],
      ]},
      { type: "heading", content: "Documentation Portal" },
      { type: "list", items: [
        "**Interactive docs**: Multi-pane layout with scroll-spy progress tracker.",
        "**Code examples**: Copy-ready examples in cURL, JavaScript, Python, Go, and PHP.",
        "**API key integration**: Code blocks auto-populate with your active API key.",
        "**Framework guides**: Step-by-step integration guides for Next.js, React, Vue, Flutter, Python, and Go.",
        "**AI analysis endpoint**: Detailed docs for the Gemini-powered image analysis API with JSON response schema.",
      ]},
    ],
  },
  {
    id: "ai-analysis",
    title: "AI Image Analysis",
    icon: Image,
    content: [
      { type: "heading", content: "AI-Powered Image Analysis" },
      { type: "paragraph", content: "Gemini AI integration for automatic image content analysis, returning structured JSON with descriptions, tags, and metadata." },
      { type: "list", items: [
        "**Automatic analysis**: Send any image URL to get AI-generated content analysis.",
        "**Structured output**: Returns JSON with title, description, detected objects, colors, text (OCR), and content tags.",
        "**API access**: Available via the `/ai/analyze` endpoint with the `ai:analyze` scope.",
        "**Powered by Gemini**: Uses Google's Gemini model for high-quality multi-modal analysis.",
        "**Rate limited**: Subject to API plan rate limits to prevent abuse.",
      ]},
      { type: "code", language: "json", content: `{
  "title": "Mountain Landscape at Sunset",
  "description": "A panoramic view of snow-capped mountains...",
  "objects": ["mountain", "lake", "trees", "clouds"],
  "colors": ["#2563eb", "#f59e0b", "#10b981"],
  "text_content": "",
  "tags": ["nature", "landscape", "sunset", "mountains"],
  "confidence": 0.94
}` },
    ],
  },
  {
    id: "auth",
    title: "Authentication",
    icon: Shield,
    content: [
      { type: "heading", content: "Authentication System" },
      { type: "paragraph", content: "Secure email-based authentication with email verification, OTP support, and session management." },
      { type: "list", items: [
        "**Email signup**: Register with email and password. Email verification required before sign-in.",
        "**Email login**: Secure login with email/password credentials.",
        "**OTP verification**: 6-digit OTP input with auto-focus, paste support, and resend functionality.",
        "**Session management**: Automatic session refresh with auth state change listeners.",
        "**Route guards**: Protected routes redirect unauthenticated users to login. Admin routes check role.",
        "**Profile auto-creation**: User profile is automatically created on first sign-in via database trigger.",
        "**Password security**: Passwords handled by auth system — never stored in application database.",
      ]},
    ],
  },
  {
    id: "admin",
    title: "Admin Panel",
    icon: Shield,
    content: [
      { type: "heading", content: "Admin Dashboard" },
      { type: "paragraph", content: "Comprehensive admin panel for platform management with user control, file oversight, and system configuration." },
      { type: "list", items: [
        "**Dashboard overview**: System health summary with user count, file count, storage usage, and active users.",
        "**Charts**: Signup trends, upload activity, and active user charts with configurable date ranges.",
        "**User management**: Search, filter, view, ban/suspend, and unban users. View per-user storage and file details.",
        "**Plan management**: Manually upgrade/downgrade user plans and storage limits.",
        "**File management**: Browse and manage all files across the platform.",
        "**File cleanup**: Find and clean orphaned files, manage trashed files, and recover storage.",
        "**Storage analytics**: Per-user storage breakdown with usage charts.",
        "**Marketplace moderation**: Review reported listings, approve/reject content, ban marketplace users.",
        "**Workspace management**: View all workspaces, freeze/unfreeze, transfer ownership.",
        "**Activity logs**: Platform-wide activity timeline with filtering.",
        "**Audit logs**: Admin action audit trail for accountability.",
        "**System config**: Configure system settings (auto-trash days, etc.) via key-value config table.",
        "**Payment transactions**: View all payment transactions and subscription status.",
        "**API system management**: Monitor API keys, usage, and subscriptions across all users.",
        "**Bulk notifications**: Send notifications to all users or filtered groups.",
      ]},
    ],
  },
  {
    id: "payments",
    title: "Payments & Plans",
    icon: CreditCard,
    content: [
      { type: "heading", content: "Payment & Subscription System" },
      { type: "paragraph", content: "UddoktaPay integration for plan upgrades and storage purchases." },
      { type: "list", items: [
        "**Plan tiers**: Free, Pro, Business, and Enterprise plans with different storage and feature limits.",
        "**Upgrade page**: Clean comparison page showing plan features and pricing.",
        "**Payment flow**: Redirect to UddoktaPay for secure payment processing.",
        "**Automatic activation**: Plan upgrades activate immediately after successful payment verification.",
        "**Transaction history**: Full payment history in user dashboard and admin panel.",
        "**API subscriptions**: Separate subscription plans for API access (Free, Pro, Enterprise).",
        "**Payment result pages**: Success and failure pages with clear status and next steps.",
      ]},
    ],
  },
  {
    id: "theme",
    title: "Theme System",
    icon: Settings,
    content: [
      { type: "heading", content: "Dark/Light Theme System" },
      { type: "paragraph", content: "Full application-wide theme support with system preference detection and persistence." },
      { type: "list", items: [
        "**Three modes**: Light, Dark, and System (auto-detects OS preference).",
        "**Instant switch**: Theme changes apply immediately without page reload.",
        "**Persistent**: Theme preference saved to localStorage and restored on next visit.",
        "**System sync**: System mode automatically updates when OS preference changes.",
        "**Settings UI**: Dedicated Appearance section in Settings dialog with visual toggle buttons.",
        "**Full coverage**: All components, modals, dialogs, charts, and pages respect the active theme.",
        "**Semantic tokens**: Uses CSS custom properties for consistent theming — no hardcoded colors.",
      ]},
    ],
  },
  {
    id: "settings",
    title: "Settings",
    icon: Settings,
    content: [
      { type: "heading", content: "User Settings" },
      { type: "paragraph", content: "Comprehensive settings panel covering sharing defaults, notification preferences, file behavior, and appearance." },
      { type: "list", items: [
        "**Sharing defaults**: Default access type (public/private), default expiry, require password, allow download, show view count.",
        "**Notification preferences**: Sound, vibration, DND mode, and per-type muting.",
        "**File settings**: Auto-rename duplicates, file preview enabled, auto-trash cleanup days.",
        "**Privacy**: Activity visibility and analytics tracking toggles.",
        "**Appearance**: Theme selection (Light/Dark/System).",
        "**Profile picture**: Upload avatar from Menu page with camera overlay. Syncs globally to header and chat.",
        "**Responsive**: Settings dialog adapts to drawer on mobile for native feel.",
      ]},
    ],
  },
  {
    id: "mobile-ux",
    title: "Mobile Experience",
    icon: Globe,
    content: [
      { type: "heading", content: "Mobile-First UX" },
      { type: "paragraph", content: "The entire application is designed mobile-first with touch-optimized interactions and responsive layouts." },
      { type: "list", items: [
        "**Bottom navigation**: Fixed bottom navbar on mobile with Home, Photos, Upload, Recents, and Menu tabs.",
        "**Responsive sidebar**: Slide-out sidebar with overlay backdrop and swipe-to-close gesture.",
        "**Touch targets**: All interactive elements have minimum 44px touch targets for accessibility.",
        "**Responsive dialogs**: Dialogs render as bottom-sheet drawers on mobile for thumb-friendly interaction.",
        "**Swipe gestures**: Swipe-to-reply in chat, swipe-to-close on drawers and modals.",
        "**Viewport-safe**: All fixed elements respect safe area insets for devices with notches.",
        "**Optimized loading**: Lazy-loaded pages with skeleton fallbacks for fast navigation.",
      ]},
    ],
  },
];

function DocBlock({ block }: { block: DocBlock }) {
  if (block.type === "heading") return <h3 className="text-lg font-display font-bold text-foreground mt-6 mb-3">{block.content}</h3>;
  if (block.type === "paragraph") return <p className="text-sm text-muted-foreground leading-relaxed mb-4">{block.content}</p>;
  if (block.type === "note") return (
    <div className="p-3 rounded-lg bg-primary/5 border border-primary/10 text-xs text-muted-foreground mb-4">
      <span className="font-semibold text-primary">Note: </span>{block.content}
    </div>
  );
  if (block.type === "code") return (
    <pre className="p-4 rounded-lg bg-secondary/50 border border-border text-xs font-mono text-foreground overflow-x-auto mb-4">
      <code>{block.content}</code>
    </pre>
  );
  if (block.type === "table" && block.rows) {
    const [header, ...body] = block.rows;
    return (
      <div className="overflow-x-auto mb-4">
        <table className="w-full text-xs border border-border rounded-lg overflow-hidden">
          <thead><tr className="bg-secondary">{header.map((h, i) => <th key={i} className="px-3 py-2 text-left font-semibold text-foreground">{h}</th>)}</tr></thead>
          <tbody>{body.map((row, ri) => <tr key={ri} className="border-t border-border">{row.map((cell, ci) => <td key={ci} className="px-3 py-2 text-muted-foreground font-mono">{cell}</td>)}</tr>)}</tbody>
        </table>
      </div>
    );
  }
  if (block.type === "list" && block.items) return (
    <ul className="space-y-2 mb-4">
      {block.items.map((item, i) => {
        const boldMatch = item.match(/^\*\*(.*?)\*\*:?\s*(.*)/);
        return (
          <li key={i} className="flex items-start gap-2 text-sm">
            <ChevronRight className="w-3.5 h-3.5 text-primary shrink-0 mt-1" />
            <span className="text-muted-foreground leading-relaxed">
              {boldMatch ? <><span className="font-semibold text-foreground">{boldMatch[1]}</span>: {boldMatch[2]}</> : item}
            </span>
          </li>
        );
      })}
    </ul>
  );
  return null;
}

const FeatureDocs = () => {
  const navigate = useNavigate();
  const [activeSection, setActiveSection] = useState(sections[0].id);
  const contentRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = document.getElementById(`section-${activeSection}`);
    if (el) el.scrollIntoView({ behavior: "smooth", block: "start" });
  }, [activeSection]);

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Header */}
      <header className="sticky top-0 z-30 bg-background/80 backdrop-blur-xl border-b border-border shrink-0">
        <div className="max-w-7xl mx-auto px-4 md:px-6 h-14 flex items-center gap-3">
          <button onClick={() => navigate(-1)} className="p-2 rounded-lg hover:bg-secondary transition-colors shrink-0">
            <ArrowLeft className="w-5 h-5 text-muted-foreground" />
          </button>
          <BookOpen className="w-5 h-5 text-primary shrink-0" />
          <h1 className="font-display font-bold text-foreground text-sm md:text-base truncate">Feature Documentation</h1>
          <span className="text-[10px] text-muted-foreground bg-secondary px-2 py-0.5 rounded-full ml-auto shrink-0">{sections.length} sections</span>
        </div>
      </header>

      {/* Mobile nav — horizontal scroll pills */}
      <div className="lg:hidden sticky top-14 z-20 bg-background/95 backdrop-blur-sm border-b border-border shrink-0">
        <div className="overflow-x-auto" style={{ scrollbarWidth: "none", WebkitOverflowScrolling: "touch" }}>
          <div className="flex gap-1.5 px-3 py-2 w-max">
            {sections.map((s) => (
              <button
                key={s.id}
                onClick={() => setActiveSection(s.id)}
                className={cn(
                  "px-3 py-1.5 rounded-full text-[11px] font-medium whitespace-nowrap transition-colors shrink-0",
                  activeSection === s.id
                    ? "bg-primary text-primary-foreground"
                    : "bg-secondary text-muted-foreground hover:text-foreground"
                )}
              >
                {s.title}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto flex flex-1 w-full min-h-0">
        {/* Sidebar nav — desktop only */}
        <aside className="hidden lg:block w-56 xl:w-64 shrink-0 sticky top-14 h-[calc(100vh-56px)] border-r border-border overflow-y-auto" style={{ scrollbarWidth: "thin" }}>
          <nav className="py-4 px-3 space-y-0.5">
            {sections.map((s) => (
              <button
                key={s.id}
                onClick={() => setActiveSection(s.id)}
                className={cn(
                  "flex items-center gap-2 w-full px-3 py-2 rounded-lg text-xs font-medium transition-colors text-left",
                  activeSection === s.id
                    ? "bg-primary text-primary-foreground"
                    : "text-muted-foreground hover:bg-secondary hover:text-foreground"
                )}
              >
                <s.icon className="w-3.5 h-3.5 shrink-0" />
                <span className="truncate">{s.title}</span>
              </button>
            ))}
          </nav>
        </aside>

        {/* Content */}
        <main className="flex-1 min-w-0 p-4 md:p-6 lg:p-8 overflow-y-auto" ref={contentRef}>
          {sections.map((section) => (
            <motion.section
              key={section.id}
              id={`section-${section.id}`}
              initial={{ opacity: 0, y: 10 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-50px" }}
              className="mb-10 scroll-mt-28 lg:scroll-mt-20"
            >
              <div className="flex items-center gap-3 mb-4 pb-3 border-b border-border">
                <div className="w-8 h-8 md:w-9 md:h-9 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                  <section.icon className="w-4 h-4 text-primary" />
                </div>
                <h2 className="text-lg md:text-xl font-display font-bold text-foreground">{section.title}</h2>
              </div>
              {section.content.map((block, i) => (
                <DocBlock key={i} block={block} />
              ))}
            </motion.section>
          ))}

          <div className="text-center py-10 text-xs text-muted-foreground">
            <p>YoCloud Feature Documentation — {sections.length} sections</p>
            <p className="mt-1">Last updated: {new Date().toLocaleDateString()}</p>
          </div>
        </main>
      </div>
    </div>
  );
};

export default FeatureDocs;
