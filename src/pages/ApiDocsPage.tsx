import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import {
  Shield, Zap, Globe, Code, Terminal,
  FileText, FolderPlus, Share2, Tag, Check,
  Rocket, AlertTriangle, User, HardDrive, Users, Brain
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { useApiKeys } from "@/hooks/useApiKeys";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import DocsLayout, { CodeBlock, useDocsContext } from "@/components/docs/DocsLayout";

const ENDPOINTS = [
  {
    id: "list-files", method: "GET", path: "/files", title: "List Files",
    desc: "Retrieve a paginated list of files from your storage. Results are sorted by folders first, then by creation date (newest first).",
    scope: "files:read",
    params: [
      { name: "parent_id", type: "string", required: false, desc: "Filter by parent folder ID." },
      { name: "workspace_id", type: "string", required: false, desc: "Filter by workspace." },
      { name: "limit", type: "integer", required: false, desc: "Results per page (default: 50, max: 100)." },
      { name: "offset", type: "integer", required: false, desc: "Pagination offset (default: 0)." },
    ],
    responseFields: [
      { name: "files", type: "array", desc: "Array of file objects." },
      { name: "count", type: "integer", desc: "Number of files returned." },
    ],
    examples: {
      curl: `curl -X GET "{{BASE_URL}}/files?limit=10" \\\n  -H "X-API-Key: {{API_KEY}}"`,
      javascript: `const response = await fetch("{{BASE_URL}}/files?limit=10", {\n  headers: { "X-API-Key": "{{API_KEY}}" }\n});\nconst data = await response.json();`,
      python: `import requests\nresponse = requests.get("{{BASE_URL}}/files", headers={"X-API-Key": "{{API_KEY}}"}, params={"limit": 10})\ndata = response.json()`,
      php: `$ch = curl_init("{{BASE_URL}}/files?limit=10");\ncurl_setopt($ch, CURLOPT_HTTPHEADER, ["X-API-Key: {{API_KEY}}"]);\ncurl_setopt($ch, CURLOPT_RETURNTRANSFER, true);\n$data = json_decode(curl_exec($ch), true);`,
      go: `req, _ := http.NewRequest("GET", "{{BASE_URL}}/files?limit=10", nil)\nreq.Header.Set("X-API-Key", "{{API_KEY}}")\nresp, _ := http.DefaultClient.Do(req)`,
    },
    sampleResponse: `{\n  "files": [{ "id": "...", "name": "photo.jpg", "size": 1024000 }],\n  "count": 1\n}`,
  },
  {
    id: "get-file", method: "GET", path: "/files/:id", title: "Get File Details",
    desc: "Retrieve complete metadata for a specific file.",
    scope: "files:read",
    params: [{ name: "id", type: "string", required: true, desc: "File UUID (path parameter)." }],
    responseFields: [{ name: "file", type: "object", desc: "Complete file object." }],
    examples: {
      curl: `curl -X GET "{{BASE_URL}}/files/FILE_ID" \\\n  -H "X-API-Key: {{API_KEY}}"`,
      javascript: `const response = await fetch(\`{{BASE_URL}}/files/\${fileId}\`, {\n  headers: { "X-API-Key": "{{API_KEY}}" }\n});`,
      python: `response = requests.get(f"{{BASE_URL}}/files/{file_id}", headers={"X-API-Key": "{{API_KEY}}"})`,
      php: `$ch = curl_init("{{BASE_URL}}/files/" . $fileId);\ncurl_setopt($ch, CURLOPT_HTTPHEADER, ["X-API-Key: {{API_KEY}}"]);`,
      go: `req, _ := http.NewRequest("GET", "{{BASE_URL}}/files/"+fileId, nil)\nreq.Header.Set("X-API-Key", "{{API_KEY}}")`,
    },
    sampleResponse: `{ "file": { "id": "...", "name": "photo.jpg" } }`,
  },
  {
    id: "upload-file", method: "POST", path: "/files/upload", title: "Upload File",
    desc: "Upload a file using base64-encoded content. Stored in Cloudinary CDN.",
    scope: "files:write",
    params: [
      { name: "name", type: "string", required: true, desc: "Filename with extension." },
      { name: "content_base64", type: "string", required: true, desc: "Base64-encoded file content." },
      { name: "mime_type", type: "string", required: false, desc: "MIME type." },
      { name: "parent_id", type: "string", required: false, desc: "Parent folder ID." },
    ],
    responseFields: [{ name: "file", type: "object", desc: "Created file object." }],
    examples: {
      curl: `curl -X POST "{{BASE_URL}}/files/upload" \\\n  -H "X-API-Key: {{API_KEY}}" \\\n  -H "Content-Type: application/json" \\\n  -d '{"name":"hello.txt","content_base64":"SGVsbG8=","mime_type":"text/plain"}'`,
      javascript: `const response = await fetch("{{BASE_URL}}/files/upload", {\n  method: "POST",\n  headers: { "X-API-Key": "{{API_KEY}}", "Content-Type": "application/json" },\n  body: JSON.stringify({ name: "hello.txt", content_base64: btoa("Hello"), mime_type: "text/plain" })\n});`,
      python: `import base64\nresponse = requests.post("{{BASE_URL}}/files/upload",\n  headers={"X-API-Key": "{{API_KEY}}", "Content-Type": "application/json"},\n  json={"name": "hello.txt", "content_base64": base64.b64encode(b"Hello").decode()})`,
      php: `$ch = curl_init("{{BASE_URL}}/files/upload");\ncurl_setopt($ch, CURLOPT_POST, true);\ncurl_setopt($ch, CURLOPT_HTTPHEADER, ["X-API-Key: {{API_KEY}}", "Content-Type: application/json"]);\ncurl_setopt($ch, CURLOPT_POSTFIELDS, json_encode(["name"=>"hello.txt","content_base64"=>base64_encode("Hello")]));`,
      go: `body, _ := json.Marshal(map[string]string{"name":"hello.txt","content_base64":"SGVsbG8="})\nreq, _ := http.NewRequest("POST", "{{BASE_URL}}/files/upload", bytes.NewBuffer(body))\nreq.Header.Set("X-API-Key", "{{API_KEY}}")`,
    },
    sampleResponse: `{ "file": { "id": "...", "name": "hello.txt", "cloudinary_url": "..." } }`,
  },
  {
    id: "delete-file", method: "DELETE", path: "/files/:id", title: "Delete File",
    desc: "Move a file to trash (soft delete).",
    scope: "files:delete",
    params: [{ name: "id", type: "string", required: true, desc: "File UUID (path parameter)." }],
    responseFields: [{ name: "message", type: "string", desc: "Confirmation." }],
    examples: {
      curl: `curl -X DELETE "{{BASE_URL}}/files/FILE_ID" \\\n  -H "X-API-Key: {{API_KEY}}"`,
      javascript: `await fetch(\`{{BASE_URL}}/files/\${fileId}\`, { method: "DELETE", headers: { "X-API-Key": "{{API_KEY}}" } });`,
      python: `requests.delete(f"{{BASE_URL}}/files/{file_id}", headers={"X-API-Key": "{{API_KEY}}"})`,
      php: `$ch = curl_init("{{BASE_URL}}/files/FILE_ID");\ncurl_setopt($ch, CURLOPT_CUSTOMREQUEST, "DELETE");\ncurl_setopt($ch, CURLOPT_HTTPHEADER, ["X-API-Key: {{API_KEY}}"]);`,
      go: `req, _ := http.NewRequest("DELETE", "{{BASE_URL}}/files/"+fileId, nil)\nreq.Header.Set("X-API-Key", "{{API_KEY}}")`,
    },
    sampleResponse: `{ "message": "File moved to trash" }`,
  },
  {
    id: "create-folder", method: "POST", path: "/folders", title: "Create Folder",
    desc: "Create a new folder in your file hierarchy.",
    scope: "folders:create",
    params: [
      { name: "name", type: "string", required: true, desc: "Folder name." },
      { name: "parent_id", type: "string", required: false, desc: "Parent folder ID." },
    ],
    responseFields: [{ name: "folder", type: "object", desc: "Created folder." }],
    examples: {
      curl: `curl -X POST "{{BASE_URL}}/folders" \\\n  -H "X-API-Key: {{API_KEY}}" \\\n  -d '{"name": "Project Files"}'`,
      javascript: `await fetch("{{BASE_URL}}/folders", {\n  method: "POST",\n  headers: { "X-API-Key": "{{API_KEY}}", "Content-Type": "application/json" },\n  body: JSON.stringify({ name: "Project Files" })\n});`,
      python: `requests.post("{{BASE_URL}}/folders", headers={"X-API-Key": "{{API_KEY}}"}, json={"name": "Project Files"})`,
      php: `$ch = curl_init("{{BASE_URL}}/folders");\ncurl_setopt($ch, CURLOPT_POST, true);\ncurl_setopt($ch, CURLOPT_POSTFIELDS, json_encode(["name" => "Project Files"]));`,
      go: `body, _ := json.Marshal(map[string]string{"name": "Project Files"})\nreq, _ := http.NewRequest("POST", "{{BASE_URL}}/folders", bytes.NewBuffer(body))`,
    },
    sampleResponse: `{ "folder": { "id": "...", "name": "Project Files", "is_folder": true } }`,
  },
  {
    id: "list-shares", method: "GET", path: "/shares", title: "List Shares",
    desc: "Retrieve all your active file share links.",
    scope: "shares:read", params: [], responseFields: [{ name: "shares", type: "array", desc: "Share objects." }],
    examples: {
      curl: `curl -X GET "{{BASE_URL}}/shares" -H "X-API-Key: {{API_KEY}}"`,
      javascript: `const { shares } = await (await fetch("{{BASE_URL}}/shares", { headers: { "X-API-Key": "{{API_KEY}}" } })).json();`,
      python: `shares = requests.get("{{BASE_URL}}/shares", headers={"X-API-Key": "{{API_KEY}}"}).json()["shares"]`,
      php: `$ch = curl_init("{{BASE_URL}}/shares"); curl_setopt($ch, CURLOPT_HTTPHEADER, ["X-API-Key: {{API_KEY}}"]);`,
      go: `req, _ := http.NewRequest("GET", "{{BASE_URL}}/shares", nil)\nreq.Header.Set("X-API-Key", "{{API_KEY}}")`,
    },
    sampleResponse: `{ "shares": [{ "id": "...", "token": "abc123", "view_count": 42 }] }`,
  },
  {
    id: "create-share", method: "POST", path: "/shares", title: "Create Share Link",
    desc: "Generate a public share link for a file.",
    scope: "shares:write",
    params: [
      { name: "file_id", type: "string", required: true, desc: "File UUID to share." },
      { name: "permission", type: "string", required: false, desc: "'viewer' or 'editor'." },
    ],
    responseFields: [{ name: "share", type: "object", desc: "Created share." }],
    examples: {
      curl: `curl -X POST "{{BASE_URL}}/shares" \\\n  -H "X-API-Key: {{API_KEY}}" \\\n  -d '{"file_id": "FILE_ID"}'`,
      javascript: `await fetch("{{BASE_URL}}/shares", {\n  method: "POST",\n  headers: { "X-API-Key": "{{API_KEY}}", "Content-Type": "application/json" },\n  body: JSON.stringify({ file_id: "FILE_ID" })\n});`,
      python: `requests.post("{{BASE_URL}}/shares", headers={"X-API-Key": "{{API_KEY}}"}, json={"file_id": "FILE_ID"})`,
      php: `curl_setopt($ch, CURLOPT_POSTFIELDS, json_encode(["file_id" => "FILE_ID"]));`,
      go: `body, _ := json.Marshal(map[string]string{"file_id": "FILE_ID"})`,
    },
    sampleResponse: `{ "share": { "token": "...", "share_code": "ABC123" } }`,
  },
  {
    id: "list-tags", method: "GET", path: "/tags", title: "List Tags",
    desc: "Retrieve all your custom tags.", scope: "tags:read", params: [],
    responseFields: [{ name: "tags", type: "array", desc: "Tag objects." }],
    examples: {
      curl: `curl -X GET "{{BASE_URL}}/tags" -H "X-API-Key: {{API_KEY}}"`,
      javascript: `const { tags } = await (await fetch("{{BASE_URL}}/tags", { headers: { "X-API-Key": "{{API_KEY}}" } })).json();`,
      python: `tags = requests.get("{{BASE_URL}}/tags", headers={"X-API-Key": "{{API_KEY}}"}).json()["tags"]`,
      php: `$ch = curl_init("{{BASE_URL}}/tags"); curl_setopt($ch, CURLOPT_HTTPHEADER, ["X-API-Key: {{API_KEY}}"]);`,
      go: `req, _ := http.NewRequest("GET", "{{BASE_URL}}/tags", nil)`,
    },
    sampleResponse: `{ "tags": [{ "id": "...", "name": "Important", "color": "#3b82f6" }] }`,
  },
  {
    id: "create-tag", method: "POST", path: "/tags", title: "Create Tag",
    desc: "Create a new tag for organizing files.", scope: "tags:write",
    params: [
      { name: "name", type: "string", required: true, desc: "Tag name." },
      { name: "color", type: "string", required: false, desc: "Hex color." },
    ],
    responseFields: [{ name: "tag", type: "object", desc: "Created tag." }],
    examples: {
      curl: `curl -X POST "{{BASE_URL}}/tags" \\\n  -H "X-API-Key: {{API_KEY}}" \\\n  -d '{"name": "Urgent", "color": "#ef4444"}'`,
      javascript: `await fetch("{{BASE_URL}}/tags", {\n  method: "POST",\n  headers: { "X-API-Key": "{{API_KEY}}", "Content-Type": "application/json" },\n  body: JSON.stringify({ name: "Urgent", color: "#ef4444" })\n});`,
      python: `requests.post("{{BASE_URL}}/tags", headers={"X-API-Key": "{{API_KEY}}"}, json={"name": "Urgent", "color": "#ef4444"})`,
      php: `curl_setopt($ch, CURLOPT_POSTFIELDS, json_encode(["name" => "Urgent", "color" => "#ef4444"]));`,
      go: `body, _ := json.Marshal(map[string]string{"name": "Urgent", "color": "#ef4444"})`,
    },
    sampleResponse: `{ "tag": { "id": "...", "name": "Urgent", "color": "#ef4444" } }`,
  },
  {
    id: "get-usage", method: "GET", path: "/usage", title: "Get Usage Stats",
    desc: "Retrieve your API usage statistics.", scope: "No scope required",
    params: [{ name: "days", type: "integer", required: false, desc: "Lookback days (default: 30)." }],
    responseFields: [
      { name: "total_calls", type: "integer", desc: "Total API calls." },
      { name: "error_rate", type: "string", desc: "Error percentage." },
    ],
    examples: {
      curl: `curl -X GET "{{BASE_URL}}/usage?days=7" -H "X-API-Key: {{API_KEY}}"`,
      javascript: `const stats = await (await fetch("{{BASE_URL}}/usage?days=7", { headers: { "X-API-Key": "{{API_KEY}}" } })).json();`,
      python: `stats = requests.get("{{BASE_URL}}/usage", headers={"X-API-Key": "{{API_KEY}}"}, params={"days": 7}).json()`,
      php: `$ch = curl_init("{{BASE_URL}}/usage?days=7"); curl_setopt($ch, CURLOPT_HTTPHEADER, ["X-API-Key: {{API_KEY}}"]);`,
      go: `req, _ := http.NewRequest("GET", "{{BASE_URL}}/usage?days=7", nil)`,
    },
    sampleResponse: `{ "total_calls": 1523, "avg_response_time_ms": 45, "error_rate": "0.79%" }`,
  },
  // === USER ENDPOINTS ===
  {
    id: "get-me", method: "GET", path: "/user/me", title: "Get Current User",
    desc: "Retrieve your full profile including storage usage, file count, and workspace count.",
    scope: "user:read", params: [],
    responseFields: [
      { name: "user.id", type: "string", desc: "User UUID." },
      { name: "user.email", type: "string", desc: "Email address." },
      { name: "user.display_name", type: "string", desc: "Display name." },
      { name: "user.storage_used", type: "integer", desc: "Storage used in bytes." },
      { name: "user.storage_percent", type: "integer", desc: "Storage usage percentage." },
      { name: "user.file_count", type: "integer", desc: "Total files owned." },
      { name: "user.workspace_count", type: "integer", desc: "Workspaces joined." },
    ],
    examples: {
      curl: `curl -X GET "{{BASE_URL}}/user/me" \\\n  -H "X-API-Key: {{API_KEY}}"`,
      javascript: `const { user } = await (await fetch("{{BASE_URL}}/user/me", {\n  headers: { "X-API-Key": "{{API_KEY}}" }\n})).json();`,
      python: `user = requests.get("{{BASE_URL}}/user/me", headers={"X-API-Key": "{{API_KEY}}"}).json()["user"]`,
      php: `$ch = curl_init("{{BASE_URL}}/user/me");\ncurl_setopt($ch, CURLOPT_HTTPHEADER, ["X-API-Key: {{API_KEY}}"]);`,
      go: `req, _ := http.NewRequest("GET", "{{BASE_URL}}/user/me", nil)\nreq.Header.Set("X-API-Key", "{{API_KEY}}")`,
    },
    sampleResponse: `{\n  "user": {\n    "id": "uuid",\n    "email": "user@example.com",\n    "display_name": "John",\n    "storage_used": 1073741824,\n    "storage_used_formatted": "1 GB",\n    "storage_percent": 20,\n    "file_count": 142,\n    "workspace_count": 3\n  }\n}`,
  },
  {
    id: "get-user", method: "GET", path: "/user/:id", title: "Get User by ID",
    desc: "Retrieve public profile information for any user by their UUID.",
    scope: "user:read",
    params: [{ name: "id", type: "string", required: true, desc: "User UUID (path parameter)." }],
    responseFields: [
      { name: "user.display_name", type: "string", desc: "Display name." },
      { name: "user.avatar_url", type: "string", desc: "Avatar URL." },
    ],
    examples: {
      curl: `curl -X GET "{{BASE_URL}}/user/USER_ID" \\\n  -H "X-API-Key: {{API_KEY}}"`,
      javascript: `const { user } = await (await fetch(\`{{BASE_URL}}/user/\${userId}\`, {\n  headers: { "X-API-Key": "{{API_KEY}}" }\n})).json();`,
      python: `user = requests.get(f"{{BASE_URL}}/user/{user_id}", headers={"X-API-Key": "{{API_KEY}}"}).json()["user"]`,
      php: `$ch = curl_init("{{BASE_URL}}/user/" . $userId);\ncurl_setopt($ch, CURLOPT_HTTPHEADER, ["X-API-Key: {{API_KEY}}"]);`,
      go: `req, _ := http.NewRequest("GET", "{{BASE_URL}}/user/"+userId, nil)\nreq.Header.Set("X-API-Key", "{{API_KEY}}")`,
    },
    sampleResponse: `{ "user": { "id": "uuid", "display_name": "John", "avatar_url": "https://..." } }`,
  },
  // === FILE DETAILS ENDPOINT ===
  {
    id: "get-file-details", method: "GET", path: "/files/:id/details", title: "Get File Full Details",
    desc: "Retrieve comprehensive file metadata including tags, versions, shares, and comment count.",
    scope: "files:read",
    params: [{ name: "id", type: "string", required: true, desc: "File UUID (path parameter)." }],
    responseFields: [
      { name: "file.tags", type: "array", desc: "Attached tags with name and color." },
      { name: "file.versions", type: "array", desc: "Version history." },
      { name: "file.shares", type: "array", desc: "Active share links." },
      { name: "file.comment_count", type: "integer", desc: "Total comments." },
      { name: "file.size_formatted", type: "string", desc: "Human-readable size." },
    ],
    examples: {
      curl: `curl -X GET "{{BASE_URL}}/files/FILE_ID/details" \\\n  -H "X-API-Key: {{API_KEY}}"`,
      javascript: `const { file } = await (await fetch(\`{{BASE_URL}}/files/\${fileId}/details\`, {\n  headers: { "X-API-Key": "{{API_KEY}}" }\n})).json();`,
      python: `file = requests.get(f"{{BASE_URL}}/files/{file_id}/details", headers={"X-API-Key": "{{API_KEY}}"}).json()["file"]`,
      php: `$ch = curl_init("{{BASE_URL}}/files/" . $fileId . "/details");\ncurl_setopt($ch, CURLOPT_HTTPHEADER, ["X-API-Key: {{API_KEY}}"]);`,
      go: `req, _ := http.NewRequest("GET", "{{BASE_URL}}/files/"+fileId+"/details", nil)\nreq.Header.Set("X-API-Key", "{{API_KEY}}")`,
    },
    sampleResponse: `{\n  "file": {\n    "id": "uuid", "name": "report.pdf",\n    "size_formatted": "2.4 MB",\n    "tags": [{ "name": "Important", "color": "#ef4444" }],\n    "versions": [{ "version_number": 2, "size": 2500000 }],\n    "shares": [{ "share_code": "ABC123", "view_count": 15 }],\n    "comment_count": 3\n  }\n}`,
  },
  // === WORKSPACE ENDPOINTS ===
  {
    id: "list-workspaces", method: "GET", path: "/workspaces", title: "List Workspaces",
    desc: "Retrieve all workspaces you're a member of, with member counts, file counts, and your role.",
    scope: "workspaces:read", params: [],
    responseFields: [
      { name: "workspaces", type: "array", desc: "Array of workspace objects." },
      { name: "workspaces[].member_count", type: "integer", desc: "Total members." },
      { name: "workspaces[].file_count", type: "integer", desc: "Total files." },
      { name: "workspaces[].your_role", type: "string", desc: "Your role: owner, admin, or member." },
    ],
    examples: {
      curl: `curl -X GET "{{BASE_URL}}/workspaces" \\\n  -H "X-API-Key: {{API_KEY}}"`,
      javascript: `const { workspaces } = await (await fetch("{{BASE_URL}}/workspaces", {\n  headers: { "X-API-Key": "{{API_KEY}}" }\n})).json();`,
      python: `workspaces = requests.get("{{BASE_URL}}/workspaces", headers={"X-API-Key": "{{API_KEY}}"}).json()["workspaces"]`,
      php: `$ch = curl_init("{{BASE_URL}}/workspaces");\ncurl_setopt($ch, CURLOPT_HTTPHEADER, ["X-API-Key: {{API_KEY}}"]);`,
      go: `req, _ := http.NewRequest("GET", "{{BASE_URL}}/workspaces", nil)\nreq.Header.Set("X-API-Key", "{{API_KEY}}")`,
    },
    sampleResponse: `{\n  "workspaces": [\n    { "id": "uuid", "name": "Personal", "type": "personal", "member_count": 1, "file_count": 42, "your_role": "owner" },\n    { "id": "uuid", "name": "Team Alpha", "type": "team", "member_count": 5, "file_count": 128, "your_role": "admin" }\n  ],\n  "count": 2\n}`,
  },
  {
    id: "get-workspace", method: "GET", path: "/workspaces/:id", title: "Get Workspace Details",
    desc: "Retrieve full workspace details including storage usage, owner info, and member/file counts.",
    scope: "workspaces:read",
    params: [{ name: "id", type: "string", required: true, desc: "Workspace UUID (path parameter)." }],
    responseFields: [
      { name: "workspace.storage_used", type: "integer", desc: "Storage used in bytes." },
      { name: "workspace.storage_percent", type: "integer", desc: "Storage usage %." },
      { name: "workspace.owner", type: "object", desc: "Owner profile (name, email, avatar)." },
      { name: "workspace.your_role", type: "string", desc: "Your role in this workspace." },
    ],
    examples: {
      curl: `curl -X GET "{{BASE_URL}}/workspaces/WS_ID" \\\n  -H "X-API-Key: {{API_KEY}}"`,
      javascript: `const { workspace } = await (await fetch(\`{{BASE_URL}}/workspaces/\${wsId}\`, {\n  headers: { "X-API-Key": "{{API_KEY}}" }\n})).json();`,
      python: `ws = requests.get(f"{{BASE_URL}}/workspaces/{ws_id}", headers={"X-API-Key": "{{API_KEY}}"}).json()["workspace"]`,
      php: `$ch = curl_init("{{BASE_URL}}/workspaces/" . $wsId);\ncurl_setopt($ch, CURLOPT_HTTPHEADER, ["X-API-Key: {{API_KEY}}"]);`,
      go: `req, _ := http.NewRequest("GET", "{{BASE_URL}}/workspaces/"+wsId, nil)\nreq.Header.Set("X-API-Key", "{{API_KEY}}")`,
    },
    sampleResponse: `{\n  "workspace": {\n    "id": "uuid", "name": "Team Alpha",\n    "member_count": 5, "file_count": 128, "folder_count": 12,\n    "storage_used_formatted": "3.2 GB", "storage_percent": 64,\n    "owner": { "display_name": "John", "email": "john@example.com" },\n    "your_role": "admin"\n  }\n}`,
  },
  {
    id: "list-workspace-members", method: "GET", path: "/workspaces/:id/members", title: "List Workspace Members",
    desc: "Retrieve all members of a workspace with their profiles, roles, and activity status.",
    scope: "workspaces:read",
    params: [{ name: "id", type: "string", required: true, desc: "Workspace UUID (path parameter)." }],
    responseFields: [
      { name: "members", type: "array", desc: "Array of member objects." },
      { name: "members[].role", type: "string", desc: "Role: owner, admin, or member." },
      { name: "members[].last_active_at", type: "string", desc: "Last activity timestamp." },
    ],
    examples: {
      curl: `curl -X GET "{{BASE_URL}}/workspaces/WS_ID/members" \\\n  -H "X-API-Key: {{API_KEY}}"`,
      javascript: `const { members } = await (await fetch(\`{{BASE_URL}}/workspaces/\${wsId}/members\`, {\n  headers: { "X-API-Key": "{{API_KEY}}" }\n})).json();`,
      python: `members = requests.get(f"{{BASE_URL}}/workspaces/{ws_id}/members", headers={"X-API-Key": "{{API_KEY}}"}).json()["members"]`,
      php: `$ch = curl_init("{{BASE_URL}}/workspaces/" . $wsId . "/members");\ncurl_setopt($ch, CURLOPT_HTTPHEADER, ["X-API-Key: {{API_KEY}}"]);`,
      go: `req, _ := http.NewRequest("GET", "{{BASE_URL}}/workspaces/"+wsId+"/members", nil)\nreq.Header.Set("X-API-Key", "{{API_KEY}}")`,
    },
    sampleResponse: `{\n  "members": [\n    { "user_id": "uuid", "display_name": "John", "email": "john@example.com", "role": "owner", "last_active_at": "2026-03-28T10:00:00Z" },\n    { "user_id": "uuid", "display_name": "Jane", "role": "member", "joined_at": "2026-03-15T08:00:00Z" }\n  ],\n  "count": 2\n}`,
  },
  // === AI ENDPOINT ===
  {
    id: "ai-analyze", method: "POST", path: "/ai/analyze-image", title: "AI Image Analysis",
    desc: "Analyze an image using Google Gemini AI. Returns structured metadata including title, description, detected objects, colors, tags, mood, and any text found in the image.",
    scope: "ai:analyze",
    params: [
      { name: "image_url", type: "string", required: true, desc: "Public URL of the image to analyze." },
      { name: "prompt", type: "string", required: false, desc: "Custom analysis prompt (optional)." },
    ],
    responseFields: [
      { name: "analysis.title", type: "string", desc: "Concise image title (3-8 words)." },
      { name: "analysis.description", type: "string", desc: "Detailed description (2-4 sentences)." },
      { name: "analysis.objects", type: "array", desc: "Detected objects/elements." },
      { name: "analysis.colors", type: "array", desc: "Dominant hex colors." },
      { name: "analysis.tags", type: "array", desc: "Suggested tags (5-10)." },
      { name: "analysis.mood", type: "string", desc: "Overall mood (serene, energetic, etc.)." },
      { name: "analysis.text_detected", type: "string|null", desc: "Any text visible in image." },
      { name: "analysis.category", type: "string", desc: "Image category (photo, illustration, etc.)." },
      { name: "analysis.quality_score", type: "number", desc: "Quality estimate (1-10)." },
    ],
    examples: {
      curl: `curl -X POST "{{BASE_URL}}/ai/analyze-image" \\\n  -H "X-API-Key: {{API_KEY}}" \\\n  -H "Content-Type: application/json" \\\n  -d '{"image_url": "https://example.com/photo.jpg"}'`,
      javascript: `const { analysis } = await (await fetch("{{BASE_URL}}/ai/analyze-image", {\n  method: "POST",\n  headers: { "X-API-Key": "{{API_KEY}}", "Content-Type": "application/json" },\n  body: JSON.stringify({ image_url: "https://example.com/photo.jpg" })\n})).json();`,
      python: `result = requests.post("{{BASE_URL}}/ai/analyze-image",\n  headers={"X-API-Key": "{{API_KEY}}", "Content-Type": "application/json"},\n  json={"image_url": "https://example.com/photo.jpg"}).json()\nanalysis = result["analysis"]`,
      php: `$ch = curl_init("{{BASE_URL}}/ai/analyze-image");\ncurl_setopt($ch, CURLOPT_POST, true);\ncurl_setopt($ch, CURLOPT_HTTPHEADER, ["X-API-Key: {{API_KEY}}", "Content-Type: application/json"]);\ncurl_setopt($ch, CURLOPT_POSTFIELDS, json_encode(["image_url" => "https://example.com/photo.jpg"]));`,
      go: `body, _ := json.Marshal(map[string]string{"image_url": "https://example.com/photo.jpg"})\nreq, _ := http.NewRequest("POST", "{{BASE_URL}}/ai/analyze-image", bytes.NewBuffer(body))\nreq.Header.Set("X-API-Key", "{{API_KEY}}")\nreq.Header.Set("Content-Type", "application/json")`,
    },
    sampleResponse: `{\n  "analysis": {\n    "title": "Mountain Sunset Landscape",\n    "description": "A scenic photo showing snow-capped mountains against a vibrant orange and purple sunset sky.",\n    "objects": ["mountain", "sky", "clouds", "snow", "trees"],\n    "colors": ["#FF6B35", "#1E3A5F", "#FFFFFF", "#8B5CF6"],\n    "tags": ["nature", "landscape", "sunset", "mountains", "scenic"],\n    "mood": "serene",\n    "text_detected": null,\n    "category": "photo",\n    "quality_score": 8.5\n  },\n  "metadata": {\n    "model": "gemini-2.5-flash",\n    "response_time_ms": 1200\n  }\n}`,
  },
];

const SECTION_IDS = [
  "overview", "authentication", "rate-limits", "errors", "quickstart",
  ...ENDPOINTS.map(e => e.id),
  "webhooks-guide",
];

export default function ApiDocsPage() {
  const [activeSection, setActiveSection] = useState("overview");

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
      <ApiDocsContent />
    </DocsLayout>
  );
}

function ApiDocsContent() {
  const navigate = useNavigate();
  const { selectedLang, showApiKey, setShowApiKey, activeKey, apiKeyDisplay, baseUrl, rawKeyAvailable } = useDocsContext();
  const codeProps = { showApiKey, onToggleKey: () => setShowApiKey(!showApiKey), hasKey: !!activeKey, baseUrl, apiKey: apiKeyDisplay, rawKeyAvailable };

  const methodColor = (m: string) => {
    if (m === "GET") return "text-emerald-500 bg-emerald-500/10 border-emerald-500/20";
    if (m === "POST") return "text-blue-500 bg-blue-500/10 border-blue-500/20";
    if (m === "DELETE") return "text-red-500 bg-red-500/10 border-red-500/20";
    return "text-yellow-500 bg-yellow-500/10 border-yellow-500/20";
  };

  return (
    <>
      {/* Overview */}
      <section id="overview" className="scroll-mt-28">
        <h2 className="text-xl md:text-2xl font-bold text-foreground mb-2">YoCloud REST API</h2>
        <p className="text-sm text-muted-foreground leading-relaxed mb-4">
          The YoCloud API provides programmatic access to your cloud storage. Upload, manage, and share files through a simple RESTful interface.
        </p>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          {[
            { icon: Shield, title: "Secure", desc: "API key authentication with scoped permissions." },
            { icon: Zap, title: "Fast", desc: "Under 100ms avg response. Cloudinary CDN delivery." },
            { icon: Globe, title: "RESTful", desc: "Standard HTTP methods. Works with any language." },
          ].map(f => (
            <div key={f.title} className="p-3 rounded-xl border border-border bg-secondary/20">
              <f.icon className="w-5 h-5 text-primary mb-2" />
              <h3 className="text-sm font-bold text-foreground">{f.title}</h3>
              <p className="text-[11px] text-muted-foreground mt-1">{f.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Auth */}
      <section id="authentication" className="scroll-mt-28">
        <h2 className="text-lg md:text-xl font-bold text-foreground mb-2">Authentication</h2>
        <p className="text-sm text-muted-foreground leading-relaxed mb-3">
          Include your key in the <code className="text-primary font-mono bg-primary/5 px-1 rounded">X-API-Key</code> header.
        </p>
        <div className="p-3 md:p-4 rounded-xl border border-border bg-card">
          <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider mb-2">Base URL</p>
          <div className="flex items-center gap-2 mb-4">
            <code className="text-[10px] md:text-xs font-mono text-foreground bg-secondary/50 px-2 md:px-3 py-1.5 rounded-lg flex-1 truncate">{baseUrl}</code>
            <button className="shrink-0 p-1.5 rounded-lg hover:bg-secondary text-muted-foreground" onClick={() => { navigator.clipboard.writeText(baseUrl); toast.success("Copied!"); }}>
              <Code className="w-3.5 h-3.5" />
            </button>
          </div>
          <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider mb-2">Example Header</p>
          <CodeBlock code={`X-API-Key: ${apiKeyDisplay}`} lang="text" {...codeProps} />
        </div>
      </section>

      {/* Rate Limits */}
      <section id="rate-limits" className="scroll-mt-28">
        <h2 className="text-lg md:text-xl font-bold text-foreground mb-2">Rate Limits</h2>
        <div className="overflow-x-auto rounded-xl border border-border">
          <table className="w-full text-sm">
            <thead><tr className="border-b border-border bg-secondary/30">
              <th className="text-left px-3 md:px-4 py-2 text-[10px] md:text-xs font-bold text-muted-foreground">Limit</th>
              <th className="text-left px-3 md:px-4 py-2 text-[10px] md:text-xs font-bold text-muted-foreground">Value</th>
              <th className="text-left px-3 md:px-4 py-2 text-[10px] md:text-xs font-bold text-muted-foreground">Window</th>
            </tr></thead>
            <tbody>
              {[["Requests per key", "100", "Per minute"], ["Max file size", "Plan-dependent", "Per request"], ["Pagination max", "100", "Items per page"]].map(([a, b, c]) => (
                <tr key={a} className="border-b border-border/50">
                  <td className="px-3 md:px-4 py-2 text-[11px] md:text-xs text-foreground font-medium">{a}</td>
                  <td className="px-3 md:px-4 py-2 text-[11px] md:text-xs text-foreground font-mono">{b}</td>
                  <td className="px-3 md:px-4 py-2 text-[11px] md:text-xs text-muted-foreground">{c}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {/* Errors */}
      <section id="errors" className="scroll-mt-28">
        <h2 className="text-lg md:text-xl font-bold text-foreground mb-2">Error Handling</h2>
        <p className="text-sm text-muted-foreground leading-relaxed mb-4">
          The API returns structured error responses with context-aware metadata to help you debug issues quickly.
          Every error response includes the error message, HTTP status code, possible reasons, and actionable fix suggestions.
        </p>

        {/* Error Response Format */}
        <h3 className="text-sm font-bold text-foreground mb-2">Error Response Format</h3>
        <p className="text-[11px] text-muted-foreground mb-3">All errors follow a consistent JSON structure:</p>
        <div className="bg-card rounded-xl border border-border p-3 mb-5">
          <pre className="text-[10px] md:text-[11px] font-mono text-muted-foreground whitespace-pre-wrap">{`{
  "error": "Human-readable error message",
  "status_code": 401,
  "error_type": "INVALID_API_KEY",
  "possible_reasons": [
    "API key is incorrect or malformed",
    "Key was revoked or deleted"
  ],
  "action": "Generate a new API key from the Developer Console",
  "help": "Go to Developer Console → API Keys → Create New Key"
}`}</pre>
        </div>

        {/* HTTP Status Codes */}
        <h3 className="text-sm font-bold text-foreground mb-2">HTTP Status Codes</h3>
        <div className="overflow-x-auto rounded-xl border border-border mb-5">
          <table className="w-full text-sm">
            <thead><tr className="border-b border-border bg-secondary/30">
              <th className="text-left px-3 py-2 text-[10px] font-bold text-muted-foreground">Code</th>
              <th className="text-left px-3 py-2 text-[10px] font-bold text-muted-foreground">Type</th>
              <th className="text-left px-3 py-2 text-[10px] font-bold text-muted-foreground">Meaning</th>
              <th className="text-left px-3 py-2 text-[10px] font-bold text-muted-foreground hidden md:table-cell">What To Do</th>
            </tr></thead>
            <tbody>
              {[
                { code: "400", type: "VALIDATION_ERROR", m: "Bad Request", a: "Check your request body. Ensure all required fields are present and correctly typed." },
                { code: "401", type: "INVALID_API_KEY", m: "Unauthorized", a: "Verify your API key is correct, active, and not expired. Check the X-API-Key header." },
                { code: "403", type: "INSUFFICIENT_SCOPE", m: "Forbidden", a: "Your API key lacks the required scope. Edit key permissions in Developer Console." },
                { code: "404", type: "NOT_FOUND", m: "Not Found", a: "The requested resource doesn't exist, or you used an invalid endpoint path." },
                { code: "429", type: "RATE_LIMIT_EXCEEDED", m: "Rate Limited", a: "You've exceeded your plan's rate limit. Wait and retry, or upgrade your plan." },
                { code: "500", type: "DB_ERROR", m: "Server Error", a: "Internal error on our end. Retry after a few seconds. If persistent, contact support." },
              ].map(e => (
                <tr key={e.code} className="border-b border-border/50">
                  <td className="px-3 py-2"><Badge variant={parseInt(e.code) >= 500 ? "destructive" : "secondary"} className="text-[9px] font-mono">{e.code}</Badge></td>
                  <td className="px-3 py-2"><code className="text-[9px] font-mono text-primary bg-primary/5 px-1 rounded">{e.type}</code></td>
                  <td className="px-3 py-2 text-[11px] text-foreground font-medium">{e.m}</td>
                  <td className="px-3 py-2 text-[11px] text-muted-foreground hidden md:table-cell">{e.a}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Error Types */}
        <h3 className="text-sm font-bold text-foreground mb-2">Error Types Reference</h3>
        <p className="text-[11px] text-muted-foreground mb-3">
          Each error includes an <code className="text-primary font-mono bg-primary/5 px-1 rounded">error_type</code> field for programmatic handling:
        </p>
        <div className="space-y-2 mb-5">
          {[
            { type: "MISSING_API_KEY", desc: "No X-API-Key header was provided in the request.", fix: "Add the X-API-Key header to every request." },
            { type: "INVALID_API_KEY", desc: "The provided API key doesn't match any active key.", fix: "Check for typos or generate a new key." },
            { type: "EXPIRED_API_KEY", desc: "The API key has passed its expiration date.", fix: "Create a new key or extend the expiry in Developer Console." },
            { type: "RATE_LIMIT_EXCEEDED", desc: "Too many requests within the rate limit window.", fix: "Implement backoff/retry logic. Upgrade plan for higher limits." },
            { type: "INSUFFICIENT_SCOPE", desc: "The key doesn't have permission for this endpoint.", fix: "Edit the key's scopes to include the required permission." },
            { type: "ENDPOINT_NOT_FOUND", desc: "The requested API endpoint doesn't exist.", fix: "Check the endpoint path against the documentation." },
            { type: "VALIDATION_ERROR", desc: "Request body is missing required fields or has invalid types.", fix: "Review the endpoint's parameter requirements." },
            { type: "UPLOAD_FAILED", desc: "File upload to storage failed.", fix: "Check file size limits and base64 encoding." },
            { type: "NOT_FOUND", desc: "The requested file, folder, or resource doesn't exist.", fix: "Verify the resource ID is correct." },
          ].map(e => (
            <div key={e.type} className="p-3 rounded-xl border border-border">
              <div className="flex items-center gap-2 mb-1">
                <code className="text-[10px] font-mono font-bold text-primary">{e.type}</code>
              </div>
              <p className="text-[11px] text-muted-foreground">{e.desc}</p>
              <p className="text-[11px] text-foreground mt-1"><strong>Fix:</strong> {e.fix}</p>
            </div>
          ))}
        </div>

        {/* Rate Limit Upgrade Info */}
        <h3 className="text-sm font-bold text-foreground mb-2">Rate Limit Details</h3>
        <p className="text-[11px] text-muted-foreground mb-3">
          When you hit a rate limit, the response includes upgrade options and retry timing:
        </p>
        <div className="bg-card rounded-xl border border-border p-3 mb-5">
          <pre className="text-[10px] md:text-[11px] font-mono text-muted-foreground whitespace-pre-wrap">{`{
  "error": "Rate limit exceeded",
  "error_type": "RATE_LIMIT_EXCEEDED",
  "status_code": 429,
  "current_limit": "3 req/min",
  "retry_after_seconds": 60,
  "upgrade_options": {
    "next_plan": "Pro",
    "new_limit": "9 req/min",
    "price": "৳149/month"
  }
}`}</pre>
        </div>

        {/* Error Handling Best Practices */}
        <h3 className="text-sm font-bold text-foreground mb-2">Best Practices</h3>
        <CodeBlock code={selectedLang === "python"
          ? `import requests\n\ndef api_call(endpoint, method="GET", body=None):\n    try:\n        response = requests.request(\n            method, f"{{BASE_URL}}{endpoint}",\n            headers={"X-API-Key": "{{API_KEY}}"},\n            json=body\n        )\n        response.raise_for_status()\n        return response.json()\n    except requests.exceptions.HTTPError as e:\n        error_data = e.response.json()\n        error_type = error_data.get("error_type", "UNKNOWN")\n\n        if error_type == "RATE_LIMIT_EXCEEDED":\n            retry_after = error_data.get("retry_after_seconds", 60)\n            print(f"Rate limited. Retrying in {retry_after}s...")\n            time.sleep(retry_after)\n            return api_call(endpoint, method, body)  # Retry\n\n        elif error_type == "INSUFFICIENT_SCOPE":\n            print(f"Missing scope: {error_data.get('required_scope')}")\n\n        raise`
          : `async function apiCall(endpoint, options = {}) {\n  const res = await fetch(\`{{BASE_URL}}\${endpoint}\`, {\n    ...options,\n    headers: {\n      "X-API-Key": "{{API_KEY}}",\n      "Content-Type": "application/json",\n      ...options.headers,\n    },\n  });\n\n  if (!res.ok) {\n    const error = await res.json();\n\n    // Handle specific error types\n    switch (error.error_type) {\n      case "RATE_LIMIT_EXCEEDED":\n        const retryAfter = error.retry_after_seconds || 60;\n        console.log(\`Rate limited. Retrying in \${retryAfter}s...\`);\n        await new Promise(r => setTimeout(r, retryAfter * 1000));\n        return apiCall(endpoint, options); // Retry\n\n      case "INSUFFICIENT_SCOPE":\n        console.error(\`Missing scope: \${error.required_scope}\`);\n        break;\n\n      case "EXPIRED_API_KEY":\n        console.error("API key expired. Generate a new one.");\n        break;\n    }\n\n    throw new Error(error.error || \`API Error: \${res.status}\`);\n  }\n\n  return res.json();\n}`}
          lang={selectedLang} {...codeProps} />
      </section>

      {/* Quick Start */}
      <section id="quickstart" className="scroll-mt-28">
        <h2 className="text-lg md:text-xl font-bold text-foreground mb-2">Quick Start</h2>
        <p className="text-sm text-muted-foreground mb-4">Get started in 3 steps:</p>
        <div className="space-y-4">
          {[
            { step: 1, title: "Create API Key", desc: <><button onClick={() => navigate("/developer")} className="text-primary underline">Developer Dashboard</button> → Generate key</> },
            { step: 2, title: "List Files", desc: "Verify everything works:" },
            { step: 3, title: "Upload File", desc: "Upload your first file:" },
          ].map((s, idx) => (
            <div key={s.step} className="flex gap-3">
              <div className="w-7 h-7 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-xs font-bold shrink-0">{s.step}</div>
              <div className="flex-1">
                <h3 className="text-sm font-bold text-foreground">{s.title}</h3>
                <p className="text-[11px] text-muted-foreground mt-0.5 mb-2">{s.desc}</p>
                {idx > 0 && (
                  <CodeBlock
                    code={ENDPOINTS[idx === 1 ? 0 : 2].examples[selectedLang as keyof typeof ENDPOINTS[0]["examples"]] || ENDPOINTS[idx === 1 ? 0 : 2].examples.curl}
                    lang={selectedLang}
                    {...codeProps}
                  />
                )}
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Endpoints - grouped */}
      {ENDPOINTS.map((ep, idx) => {
        // Section group headers
        const groupHeaders: Record<string, { icon: typeof FileText; label: string }> = {
          "list-files": { icon: FileText, label: "📁 File Management" },
          "get-me": { icon: User, label: "👤 User Information" },
          "get-file-details": { icon: FileText, label: "📋 File Details" },
          "list-workspaces": { icon: HardDrive, label: "🏢 Workspace Management" },
          "ai-analyze": { icon: Brain, label: "🤖 AI Services" },
          "list-shares": { icon: Share2, label: "🔗 Sharing" },
          "list-tags": { icon: Tag, label: "🏷️ Tags" },
          "get-usage": { icon: Zap, label: "📊 Usage & Analytics" },
        };
        const groupHeader = groupHeaders[ep.id];

        return (
          <div key={ep.id}>
            {groupHeader && (
              <div className="flex items-center gap-2 mb-4 mt-2">
                <h2 className="text-base md:text-lg font-bold text-foreground">{groupHeader.label}</h2>
              </div>
            )}
            <section id={ep.id} className="scroll-mt-28">
              <div className="flex items-center gap-2 md:gap-3 mb-2 flex-wrap">
                <Badge className={cn("text-[10px] md:text-[11px] font-mono border", methodColor(ep.method))} variant="outline">{ep.method}</Badge>
                <code className="text-xs md:text-sm font-mono font-bold text-foreground">{ep.path}</code>
              </div>
              <h3 className="text-base md:text-lg font-bold text-foreground mb-1">{ep.title}</h3>
              <p className="text-[11px] md:text-sm text-muted-foreground leading-relaxed mb-3">{ep.desc}</p>

              {ep.scope && (
                <div className="flex items-center gap-2 mb-3 text-[10px] md:text-[11px]">
                  <Shield className="w-3.5 h-3.5 text-primary" />
                  <span className="text-muted-foreground">Scope:</span>
                  <code className="font-mono text-primary bg-primary/5 px-1.5 py-0.5 rounded">{ep.scope}</code>
                </div>
              )}

              {ep.params.length > 0 && (
                <div className="mb-4">
                  <h4 className="text-[10px] md:text-xs font-bold text-foreground mb-2 uppercase tracking-wider">Parameters</h4>
                  <div className="rounded-xl border border-border overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead><tr className="border-b border-border bg-secondary/30">
                        <th className="text-left px-2 md:px-3 py-1.5 text-[9px] md:text-[10px] font-bold text-muted-foreground">Name</th>
                        <th className="text-left px-2 md:px-3 py-1.5 text-[9px] md:text-[10px] font-bold text-muted-foreground">Type</th>
                        <th className="text-left px-2 md:px-3 py-1.5 text-[9px] md:text-[10px] font-bold text-muted-foreground">Req</th>
                        <th className="text-left px-2 md:px-3 py-1.5 text-[9px] md:text-[10px] font-bold text-muted-foreground hidden md:table-cell">Description</th>
                      </tr></thead>
                      <tbody>
                        {ep.params.map(p => (
                          <tr key={p.name} className="border-b border-border/30">
                            <td className="px-2 md:px-3 py-1.5 text-[10px] md:text-xs font-mono text-foreground font-semibold">{p.name}</td>
                            <td className="px-2 md:px-3 py-1.5 text-[10px] md:text-xs text-muted-foreground">{p.type}</td>
                            <td className="px-2 md:px-3 py-1.5">{p.required ? <Badge className="text-[8px] md:text-[9px]">Yes</Badge> : <span className="text-[9px] text-muted-foreground">No</span>}</td>
                            <td className="px-2 md:px-3 py-1.5 text-[10px] text-muted-foreground hidden md:table-cell">{p.desc}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              <div className="mb-4">
                <h4 className="text-[10px] md:text-xs font-bold text-foreground mb-2 uppercase tracking-wider">Code Example</h4>
                <CodeBlock code={ep.examples[selectedLang as keyof typeof ep.examples] || ep.examples.curl} lang={selectedLang} {...codeProps} />
              </div>

              <div className="mb-4">
                <h4 className="text-[10px] md:text-xs font-bold text-foreground mb-2 uppercase tracking-wider">Response</h4>
                <div className="bg-card rounded-xl border border-border p-3">
                  <pre className="text-[10px] md:text-[11px] font-mono text-muted-foreground whitespace-pre-wrap overflow-x-auto">{ep.sampleResponse}</pre>
                </div>
              </div>
              <div className="border-b border-border/30 mt-6" />
            </section>
          </div>
        );
      })}

      {/* Webhooks */}
      <section id="webhooks-guide" className="scroll-mt-28">
        <h2 className="text-lg md:text-xl font-bold text-foreground mb-2">Webhook Guide</h2>
        <p className="text-sm text-muted-foreground leading-relaxed mb-4">
          Webhooks deliver real-time HTTP POST notifications when events occur.
        </p>
        <h3 className="text-sm font-bold text-foreground mb-2">Available Events</h3>
        <div className="rounded-xl border border-border overflow-x-auto mb-4">
          <table className="w-full text-sm">
            <thead><tr className="border-b border-border bg-secondary/30">
              <th className="text-left px-3 md:px-4 py-2 text-[10px] md:text-xs font-bold text-muted-foreground">Event</th>
              <th className="text-left px-3 md:px-4 py-2 text-[10px] md:text-xs font-bold text-muted-foreground">Triggered When</th>
            </tr></thead>
            <tbody>
              {[["file.uploaded", "New file uploaded via API"], ["file.deleted", "File moved to trash"], ["file.shared", "New share link created"]].map(([ev, desc]) => (
                <tr key={ev} className="border-b border-border/50">
                  <td className="px-3 md:px-4 py-2 text-[10px] md:text-xs font-mono text-primary">{ev}</td>
                  <td className="px-3 md:px-4 py-2 text-[10px] md:text-xs text-muted-foreground">{desc}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <h3 className="text-sm font-bold text-foreground mb-2">Webhook Payload</h3>
        <div className="bg-card rounded-xl border border-border p-3 mb-4">
          <pre className="text-[10px] md:text-[11px] font-mono text-muted-foreground whitespace-pre-wrap">{`POST /your-webhook-endpoint
Headers:
  X-Webhook-Secret: whsec_your_secret
  X-Webhook-Event: file.uploaded

Body:
{
  "event": "file.uploaded",
  "data": { "file": { "id": "...", "name": "photo.jpg" } },
  "timestamp": "2026-03-28T14:00:00.000Z"
}`}</pre>
        </div>
        <h3 className="text-sm font-bold text-foreground mb-2">Verifying Signatures</h3>
        <CodeBlock
          code={selectedLang === "python"
            ? `import hmac, hashlib\n\ndef verify_webhook(payload, secret, signature):\n    expected = hmac.new(secret.encode(), payload, hashlib.sha256).hexdigest()\n    return hmac.compare_digest(expected, signature)`
            : selectedLang === "javascript"
            ? `const crypto = require("crypto");\n\nfunction verifyWebhook(payload, secret, signature) {\n  const expected = crypto.createHmac("sha256", secret).update(payload).digest("hex");\n  return crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(signature));\n}`
            : `# Verify using the X-Webhook-Secret header\n# Compare with your stored secret`}
          lang={selectedLang}
          {...codeProps}
        />
      </section>
    </>
  );
}
