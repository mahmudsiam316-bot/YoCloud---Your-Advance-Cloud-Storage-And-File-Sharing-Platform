import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-api-key",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
};

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

function errResponse(message: string, status = 400, details?: Record<string, any>) {
  return json({
    error: message,
    status_code: status,
    ...(details || {}),
    help: getErrorHelp(status, message),
  }, status);
}

function getErrorHelp(status: number, message: string): string {
  if (status === 401 && message.includes("Missing")) {
    return "Include your API key in the X-API-Key header. Example: curl -H 'X-API-Key: yoc_xxxxx' https://api-url/files";
  }
  if (status === 401 && message.includes("Invalid")) {
    return "Your API key is invalid. Check that you're using the correct key from Developer Console. Keys start with 'yoc_'.";
  }
  if (status === 401 && message.includes("expired")) {
    return "Your API key has expired. Generate a new key from Developer Console > API Keys > Create Key.";
  }
  if (status === 403) {
    return "Your API key lacks the required scope for this endpoint. Edit key permissions in Developer Console.";
  }
  if (status === 429) {
    return "You've exceeded your rate limit. Upgrade your plan at /developer > Billing for higher limits.";
  }
  if (status === 404) {
    return "The requested resource was not found. Check the endpoint path and resource ID.";
  }
  if (status === 500) {
    return "An internal server error occurred. If this persists, contact support with the request ID.";
  }
  return "Check the API documentation for correct usage.";
}

// Sensitive data masking
const SENSITIVE_KEYS = ["password", "token", "secret", "api_key", "authorization", "cookie", "x-api-key", "key_hash", "content_base64"];

function maskSensitive(obj: any, depth = 0): any {
  if (depth > 5 || obj === null || obj === undefined) return obj;
  if (typeof obj === "string") return obj;
  if (Array.isArray(obj)) return obj.map(i => maskSensitive(i, depth + 1));
  if (typeof obj === "object") {
    const masked: Record<string, any> = {};
    for (const [key, val] of Object.entries(obj)) {
      if (SENSITIVE_KEYS.some(sk => key.toLowerCase().includes(sk))) {
        masked[key] = typeof val === "string" ? val.substring(0, 4) + "••••••••" : "••••••••";
      } else {
        masked[key] = maskSensitive(val, depth + 1);
      }
    }
    return masked;
  }
  return obj;
}

function sanitizeHeaders(headers: Headers): Record<string, string> {
  const result: Record<string, string> = {};
  const skipHeaders = ["authorization", "cookie", "x-api-key"];
  headers.forEach((value, key) => {
    if (skipHeaders.includes(key.toLowerCase())) {
      result[key] = value.substring(0, 8) + "••••••••";
    } else {
      result[key] = value;
    }
  });
  return result;
}

function truncateResponse(body: string, maxBytes = 8192): string {
  if (body.length <= maxBytes) return body;
  return body.substring(0, maxBytes) + `\n... [truncated, ${body.length} total bytes]`;
}

function detectAiMetadata(endpoint: string, reqBody: any, resBody: any): any | null {
  if (!endpoint.includes("/ai/")) return null;
  return {
    prompt: reqBody?.prompt || reqBody?.image_url || null,
    model_name: resBody?.model || "gemini-2.5-flash",
    response_preview: typeof resBody === "object" ? JSON.stringify(resBody).substring(0, 500) : null,
  };
}

function extractFileMetadata(reqBody: any): any | null {
  if (!reqBody?.content_base64 && !reqBody?.file) return null;
  return {
    file_name: reqBody.name || reqBody.fileName || "unknown",
    file_type: reqBody.mime_type || reqBody.type || "application/octet-stream",
    file_size: reqBody.content_base64 ? Math.ceil((reqBody.content_base64.length * 3) / 4) : null,
  };
}

async function hashKey(key: string): Promise<string> {
  const encoded = new TextEncoder().encode(key);
  const hash = await crypto.subtle.digest("SHA-256", encoded);
  return Array.from(new Uint8Array(hash)).map(b => b.toString(16).padStart(2, "0")).join("");
}

function formatBytes(bytes: number): string {
  if (bytes === 0) return "0 B";
  const k = 1024;
  const sizes = ["B", "KB", "MB", "GB", "TB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
}

// Fire-and-forget log helper
function logRequest(admin: any, logData: Record<string, any>) {
  admin.from("api_usage_logs").insert(logData).then(() => {}).catch((e: any) => console.error("Log insert error:", e));
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const startTime = Date.now();
  const url = new URL(req.url);
  const pathParts = url.pathname.split("/").filter(Boolean);
  const fnIndex = pathParts.indexOf("public-api");
  const apiPath = pathParts.slice(fnIndex + 1);
  const endpoint = `/${apiPath.join("/")}`;
  const method = req.method;

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const admin = createClient(supabaseUrl, serviceKey);

  const reqHeaders = sanitizeHeaders(req.headers);
  const ipAddress = req.headers.get("x-forwarded-for") || req.headers.get("cf-connecting-ip") || "unknown";
  const userAgent = req.headers.get("user-agent") || "unknown";

  // Clone request body for logging
  let clonedBody: any = null;
  if (method === "POST" || method === "PUT" || method === "PATCH") {
    try {
      const clonedReq = req.clone();
      clonedBody = await clonedReq.json().catch(() => null);
    } catch { /* non-JSON body */ }
  }

  const apiKey = req.headers.get("x-api-key");

  // === MISSING API KEY ===
  if (!apiKey) {
    const response = errResponse("Missing X-API-Key header. Include your API key in the request headers.", 401, {
      error_type: "MISSING_API_KEY",
      required_header: "X-API-Key",
      example: "curl -H 'X-API-Key: yoc_your_key_here' https://...",
    });
    const responseTime = Date.now() - startTime;
    const resText = await response.clone().text();
    logRequest(admin, {
      api_key_id: null, user_id: null, endpoint, method,
      status_code: 401, response_time_ms: responseTime,
      ip_address: ipAddress, user_agent: userAgent,
      request_headers: reqHeaders, request_body: clonedBody ? maskSensitive(clonedBody) : null,
      response_body: truncateResponse(resText), request_size: 0, response_size: resText.length,
      error_message: "Missing X-API-Key header", error_type: "MISSING_API_KEY",
    });
    return response;
  }

  // Validate API key
  const keyPrefix = apiKey.substring(0, 8);
  const keyHash = await hashKey(apiKey);

  const { data: keyData, error: keyError } = await admin
    .from("api_keys")
    .select("*")
    .eq("key_prefix", keyPrefix)
    .eq("key_hash", keyHash)
    .eq("is_active", true)
    .maybeSingle();

  // === INVALID API KEY ===
  if (keyError || !keyData) {
    const errorDetail = keyError ? `Database error: ${keyError.message}` : "No matching active key found";
    const response = errResponse("Invalid API key. The key does not exist or has been revoked.", 401, {
      error_type: "INVALID_API_KEY",
      key_prefix: keyPrefix,
      possible_reasons: [
        "The API key is incorrect or has a typo",
        "The key has been revoked from Developer Console",
        "The key was deleted",
        "You're using a key from a different account",
      ],
      action: "Generate a new API key from Developer Console > API Keys",
    });
    const responseTime = Date.now() - startTime;
    const resText = await response.clone().text();
    logRequest(admin, {
      api_key_id: null, user_id: null, endpoint, method,
      status_code: 401, response_time_ms: responseTime,
      ip_address: ipAddress, user_agent: userAgent,
      request_headers: reqHeaders, request_body: clonedBody ? maskSensitive(clonedBody) : null,
      response_body: truncateResponse(resText), request_size: 0, response_size: resText.length,
      error_message: `Invalid API key (prefix: ${keyPrefix}). ${errorDetail}`,
      error_type: "INVALID_API_KEY",
    });
    return response;
  }

  // === EXPIRED KEY ===
  if (keyData.expires_at && new Date(keyData.expires_at) < new Date()) {
    const response = errResponse("API key expired. Generate a new key from Developer Console.", 401, {
      error_type: "EXPIRED_API_KEY",
      key_name: keyData.name,
      expired_at: keyData.expires_at,
      action: "Create a new API key or update the expiry from Developer Console > API Keys",
    });
    const responseTime = Date.now() - startTime;
    const resText = await response.clone().text();
    logRequest(admin, {
      api_key_id: keyData.id, user_id: keyData.user_id, endpoint, method,
      status_code: 401, response_time_ms: responseTime,
      ip_address: ipAddress, user_agent: userAgent,
      request_headers: reqHeaders, request_body: clonedBody ? maskSensitive(clonedBody) : null,
      response_body: truncateResponse(resText), request_size: 0, response_size: resText.length,
      error_message: `API key "${keyData.name}" expired at ${keyData.expires_at}`,
      error_type: "EXPIRED_API_KEY",
    });
    return response;
  }

  const userId = keyData.user_id;
  const scopes: string[] = keyData.scopes || [];

  // Update last_used_at
  await admin.from("api_keys").update({ last_used_at: new Date().toISOString() }).eq("id", keyData.id);

  // Get user's API plan for rate limiting
  const PLAN_LIMITS: Record<string, number> = { free: 3, pro: 9, enterprise: 999999 };

  let userPlan = "free";
  const { data: subscription } = await admin
    .from("api_subscriptions")
    .select("plan, status, expires_at")
    .eq("user_id", userId)
    .maybeSingle();

  if (subscription && subscription.status === "active") {
    if (subscription.expires_at && new Date(subscription.expires_at) < new Date()) {
      await admin.from("api_subscriptions").update({ status: "expired", plan: "free" }).eq("user_id", userId);
      userPlan = "free";
    } else {
      userPlan = subscription.plan || "free";
    }
  }

  const rateLimit = PLAN_LIMITS[userPlan] || PLAN_LIMITS.free;

  // Rate limiting
  const oneMinAgo = new Date(Date.now() - 60000).toISOString();
  const { count: recentCount } = await admin
    .from("api_usage_logs")
    .select("*", { count: "exact", head: true })
    .eq("api_key_id", keyData.id)
    .gte("created_at", oneMinAgo);

  // === RATE LIMITED ===
  if ((recentCount || 0) >= rateLimit) {
    const response = errResponse(
      `Rate limit exceeded. Your ${userPlan} plan allows ${rateLimit} requests/minute.`,
      429,
      {
        error_type: "RATE_LIMIT_EXCEEDED",
        current_plan: userPlan,
        limit: rateLimit,
        requests_made: recentCount,
        retry_after_seconds: 60,
        upgrade_url: "/developer",
        upgrade_options: userPlan === "free"
          ? { next_plan: "Pro", price: "49 BDT/month", new_limit: "9 req/min" }
          : { next_plan: "Enterprise", price: "199 BDT/month", new_limit: "Unlimited" },
      }
    );
    const responseTime = Date.now() - startTime;
    const resText = await response.clone().text();
    logRequest(admin, {
      api_key_id: keyData.id, user_id: userId, endpoint, method,
      status_code: 429, response_time_ms: responseTime,
      ip_address: ipAddress, user_agent: userAgent,
      request_headers: reqHeaders, request_body: clonedBody ? maskSensitive(clonedBody) : null,
      response_body: truncateResponse(resText), request_size: 0, response_size: resText.length,
      error_message: `Rate limit exceeded: ${recentCount}/${rateLimit} req/min on ${userPlan} plan`,
      error_type: "RATE_LIMIT_EXCEEDED",
    });
    return response;
  }

  const userClient = createClient(supabaseUrl, serviceKey);

  let response: Response;
  let errorMessage = "";
  let errorType = "";
  let errorStack = "";

  try {
    // Route: GET /files - List files
    if (apiPath[0] === "files" && method === "GET" && apiPath.length === 1) {
      if (!scopes.includes("files:read")) {
        response = errResponse("Insufficient scope: files:read required. Update key permissions in Developer Console.", 403, {
          error_type: "INSUFFICIENT_SCOPE", required_scope: "files:read", current_scopes: scopes,
        });
        errorMessage = "Missing scope: files:read"; errorType = "INSUFFICIENT_SCOPE";
      } else {
        const parentId = url.searchParams.get("parent_id") || null;
        const workspaceId = url.searchParams.get("workspace_id");
        const limit = Math.min(parseInt(url.searchParams.get("limit") || "50"), 100);
        const offset = parseInt(url.searchParams.get("offset") || "0");

        let query = admin.from("files").select("id, name, mime_type, size, is_folder, is_starred, created_at, updated_at, parent_id, workspace_id, cloudinary_url")
          .eq("user_id", userId).eq("is_trashed", false)
          .order("is_folder", { ascending: false }).order("created_at", { ascending: false })
          .range(offset, offset + limit - 1);

        if (parentId) query = query.eq("parent_id", parentId);
        else query = query.is("parent_id", null);
        if (workspaceId) query = query.eq("workspace_id", workspaceId);

        const { data, error } = await query;
        if (error) { response = errResponse(error.message, 500); errorMessage = error.message; errorType = "DB_ERROR"; }
        else response = json({ files: data, count: data?.length || 0, limit, offset });
      }

    } else if (apiPath[0] === "files" && method === "GET" && apiPath.length === 2) {
      if (!scopes.includes("files:read")) {
        response = errResponse("Insufficient scope: files:read required.", 403, { error_type: "INSUFFICIENT_SCOPE", required_scope: "files:read", current_scopes: scopes });
        errorMessage = "Missing scope: files:read"; errorType = "INSUFFICIENT_SCOPE";
      } else {
        const { data, error } = await admin.from("files").select("*").eq("id", apiPath[1]).eq("user_id", userId).single();
        if (error) { response = errResponse("File not found", 404); errorMessage = "File not found"; errorType = "NOT_FOUND"; }
        else response = json({ file: data });
      }

    } else if (apiPath[0] === "files" && apiPath[1] === "upload" && method === "POST") {
      if (!scopes.includes("files:write")) {
        response = errResponse("Insufficient scope: files:write required.", 403, { error_type: "INSUFFICIENT_SCOPE", required_scope: "files:write", current_scopes: scopes });
        errorMessage = "Missing scope: files:write"; errorType = "INSUFFICIENT_SCOPE";
      } else {
        const body = await req.json();
        const { name, content_base64, mime_type, parent_id, workspace_id } = body;
        if (!name || !content_base64) {
          response = errResponse("name and content_base64 are required fields", 400, { error_type: "VALIDATION_ERROR", required_fields: ["name", "content_base64"] });
          errorMessage = "Missing required fields"; errorType = "VALIDATION_ERROR";
        } else {
          let wsId = workspace_id;
          if (!wsId) {
            const { data: ws } = await admin.from("workspaces").select("id").eq("owner_id", userId).eq("type", "personal").single();
            wsId = ws?.id;
          }

          // Upload directly to Cloudinary API (not via cloudinary-upload edge fn which expects FormData)
          const CLOUD_NAME = Deno.env.get("CLOUDINARY_CLOUD_NAME");
          const CLD_API_KEY = Deno.env.get("CLOUDINARY_API_KEY");
          const CLD_API_SECRET = Deno.env.get("CLOUDINARY_API_SECRET");

          if (!CLOUD_NAME || !CLD_API_KEY || !CLD_API_SECRET) {
            response = errResponse("Cloudinary not configured on server", 500, { error_type: "CONFIG_ERROR" });
            errorMessage = "Cloudinary credentials missing"; errorType = "CONFIG_ERROR";
          } else {
            const timestamp = Math.floor(Date.now() / 1000);
            const folder = `yocloud/${userId}`;
            const signStr = `folder=${folder}&timestamp=${timestamp}${CLD_API_SECRET}`;
            const sigBuf = await crypto.subtle.digest("SHA-1", new TextEncoder().encode(signStr));
            const signature = Array.from(new Uint8Array(sigBuf)).map(b => b.toString(16).padStart(2, "0")).join("");

            const mType = mime_type || "application/octet-stream";
            let resourceType = "raw";
            if (mType.startsWith("image/")) resourceType = "image";
            else if (mType.startsWith("video/")) resourceType = "video";

            const cldForm = new FormData();
            cldForm.append("file", `data:${mType};base64,${content_base64}`);
            cldForm.append("api_key", CLD_API_KEY);
            cldForm.append("timestamp", String(timestamp));
            cldForm.append("signature", signature);
            cldForm.append("folder", folder);

            const cldRes = await fetch(`https://api.cloudinary.com/v1_1/${CLOUD_NAME}/${resourceType}/upload`, {
              method: "POST",
              body: cldForm,
            });

            if (!cldRes.ok) {
              const errText = await cldRes.text();
              response = errResponse(`Upload failed: ${errText}`, 500, { error_type: "UPLOAD_FAILED" });
              errorMessage = `Upload failed: ${errText}`; errorType = "UPLOAD_FAILED";
            } else {
              const cloudData = await cldRes.json();
              const fileSize = Math.ceil((content_base64.length * 3) / 4);
              const fileRecord = {
                name, user_id: userId, workspace_id: wsId, parent_id: parent_id || null,
                mime_type: mType, size: fileSize,
                storage_path: cloudData.public_id || name,
                cloudinary_url: cloudData.secure_url || cloudData.url,
                cloudinary_public_id: cloudData.public_id, is_folder: false,
              };
              const { data: file, error } = await admin.from("files").insert(fileRecord).select().single();
              if (error) { response = errResponse(error.message, 500); errorMessage = error.message; errorType = "DB_ERROR"; }
              else {
                await triggerWebhooks(admin, userId, "file.uploaded", { file });
                response = json({ file, upload_details: { size: formatBytes(fileSize), cloudinary_id: cloudData.public_id } }, 201);
              }
            }
          }
        }
      }

    } else if (apiPath[0] === "files" && method === "DELETE" && apiPath.length === 2) {
      if (!scopes.includes("files:delete")) {
        response = errResponse("Insufficient scope: files:delete required.", 403, { error_type: "INSUFFICIENT_SCOPE", required_scope: "files:delete", current_scopes: scopes });
        errorMessage = "Missing scope: files:delete"; errorType = "INSUFFICIENT_SCOPE";
      } else {
        const { data: file, error: findErr } = await admin.from("files").select("id, cloudinary_public_id").eq("id", apiPath[1]).eq("user_id", userId).single();
        if (findErr || !file) { response = errResponse("File not found", 404); errorMessage = "File not found"; errorType = "NOT_FOUND"; }
        else {
          const { error } = await admin.from("files").update({ is_trashed: true }).eq("id", file.id);
          if (error) { response = errResponse(error.message, 500); errorMessage = error.message; errorType = "DB_ERROR"; }
          else {
            await triggerWebhooks(admin, userId, "file.deleted", { file_id: file.id });
            response = json({ message: "File moved to trash" });
          }
        }
      }

    } else if (apiPath[0] === "folders" && method === "POST") {
      if (!scopes.includes("folders:create") && !scopes.includes("folders:write")) {
        response = errResponse("Insufficient scope: folders:create required.", 403, { error_type: "INSUFFICIENT_SCOPE", required_scope: "folders:create", current_scopes: scopes });
        errorMessage = "Missing scope: folders:create"; errorType = "INSUFFICIENT_SCOPE";
      } else {
        const body = await req.json();
        const { name, parent_id, workspace_id } = body;
        if (!name) { response = errResponse("name is required", 400, { error_type: "VALIDATION_ERROR" }); errorMessage = "Missing name"; errorType = "VALIDATION_ERROR"; }
        else {
          let wsId = workspace_id;
          if (!wsId) {
            const { data: ws } = await admin.from("workspaces").select("id").eq("owner_id", userId).eq("type", "personal").single();
            wsId = ws?.id;
          }
          const { data: folder, error } = await admin.from("files").insert({
            name, user_id: userId, workspace_id: wsId, parent_id: parent_id || null,
            is_folder: true, storage_path: `folders/${name}`, mime_type: null,
          }).select().single();
          if (error) { response = errResponse(error.message, 500); errorMessage = error.message; errorType = "DB_ERROR"; }
          else response = json({ folder }, 201);
        }
      }

    } else if (apiPath[0] === "shares" && method === "GET") {
      if (!scopes.includes("shares:read")) {
        response = errResponse("Insufficient scope: shares:read required.", 403, { error_type: "INSUFFICIENT_SCOPE", required_scope: "shares:read", current_scopes: scopes });
        errorMessage = "Missing scope: shares:read"; errorType = "INSUFFICIENT_SCOPE";
      } else {
        const { data, error } = await admin.from("file_shares")
          .select("id, file_id, token, share_code, access_type, permission, expires_at, view_count, download_count, created_at")
          .eq("user_id", userId).order("created_at", { ascending: false }).limit(50);
        if (error) { response = errResponse(error.message, 500); errorMessage = error.message; errorType = "DB_ERROR"; }
        else response = json({ shares: data });
      }

    } else if (apiPath[0] === "shares" && method === "POST") {
      if (!scopes.includes("shares:write")) {
        response = errResponse("Insufficient scope: shares:write required.", 403, { error_type: "INSUFFICIENT_SCOPE", required_scope: "shares:write", current_scopes: scopes });
        errorMessage = "Missing scope: shares:write"; errorType = "INSUFFICIENT_SCOPE";
      } else {
        const body = await req.json();
        const { file_id, access_type, permission, expires_at } = body;
        if (!file_id) { response = errResponse("file_id required", 400, { error_type: "VALIDATION_ERROR" }); errorMessage = "Missing file_id"; errorType = "VALIDATION_ERROR"; }
        else {
          const { data: file } = await admin.from("files").select("id").eq("id", file_id).eq("user_id", userId).single();
          if (!file) { response = errResponse("File not found or not owned", 404); errorMessage = "File not found"; errorType = "NOT_FOUND"; }
          else {
            const { data: share, error } = await admin.from("file_shares").insert({
              file_id, user_id: userId, access_type: access_type || "public",
              permission: permission || "viewer", expires_at: expires_at || null,
            }).select().single();
            if (error) { response = errResponse(error.message, 500); errorMessage = error.message; errorType = "DB_ERROR"; }
            else {
              await triggerWebhooks(admin, userId, "file.shared", { share });
              response = json({ share }, 201);
            }
          }
        }
      }

    } else if (apiPath[0] === "tags" && method === "GET") {
      if (!scopes.includes("tags:read")) {
        response = errResponse("Insufficient scope: tags:read required.", 403, { error_type: "INSUFFICIENT_SCOPE", required_scope: "tags:read", current_scopes: scopes });
        errorMessage = "Missing scope: tags:read"; errorType = "INSUFFICIENT_SCOPE";
      } else {
        const { data, error } = await admin.from("tags").select("*").eq("user_id", userId);
        if (error) { response = errResponse(error.message, 500); errorMessage = error.message; errorType = "DB_ERROR"; }
        else response = json({ tags: data });
      }

    } else if (apiPath[0] === "tags" && method === "POST") {
      if (!scopes.includes("tags:write")) {
        response = errResponse("Insufficient scope: tags:write required.", 403, { error_type: "INSUFFICIENT_SCOPE", required_scope: "tags:write", current_scopes: scopes });
        errorMessage = "Missing scope: tags:write"; errorType = "INSUFFICIENT_SCOPE";
      } else {
        const body = await req.json();
        const { name, color } = body;
        if (!name) { response = errResponse("name required", 400, { error_type: "VALIDATION_ERROR" }); errorMessage = "Missing name"; errorType = "VALIDATION_ERROR"; }
        else {
          const { data: tag, error } = await admin.from("tags").insert({ name, user_id: userId, color: color || "#3b82f6" }).select().single();
          if (error) { response = errResponse(error.message, 500); errorMessage = error.message; errorType = "DB_ERROR"; }
          else response = json({ tag }, 201);
        }
      }

    } else if (apiPath[0] === "usage" && method === "GET") {
      const days = parseInt(url.searchParams.get("days") || "30");
      const since = new Date(Date.now() - days * 86400000).toISOString();
      const { data, error } = await admin.from("api_usage_logs")
        .select("endpoint, method, status_code, response_time_ms, created_at")
        .eq("user_id", userId).gte("created_at", since)
        .order("created_at", { ascending: false }).limit(1000);
      if (error) { response = errResponse(error.message, 500); errorMessage = error.message; errorType = "DB_ERROR"; }
      else {
        const totalCalls = data?.length || 0;
        const avgResponseTime = totalCalls > 0 ? Math.round(data!.reduce((sum, l) => sum + (l.response_time_ms || 0), 0) / totalCalls) : 0;
        const errorCount = data?.filter(l => l.status_code >= 400).length || 0;
        response = json({
          total_calls: totalCalls, avg_response_time_ms: avgResponseTime,
          error_count: errorCount,
          error_rate: totalCalls > 0 ? ((errorCount / totalCalls) * 100).toFixed(2) + "%" : "0%",
          period_days: days,
        });
      }

    } else if (apiPath[0] === "user" && apiPath[1] === "me" && method === "GET") {
      if (!scopes.includes("user:read")) {
        response = errResponse("Insufficient scope: user:read required.", 403, { error_type: "INSUFFICIENT_SCOPE", required_scope: "user:read", current_scopes: scopes });
        errorMessage = "Missing scope: user:read"; errorType = "INSUFFICIENT_SCOPE";
      } else {
        const { data: profile, error: pErr } = await admin.from("profiles")
          .select("id, email, display_name, avatar_url, storage_plan, storage_limit, created_at, last_active_at")
          .eq("id", userId).single();
        if (pErr || !profile) { response = errResponse("Profile not found", 404); errorMessage = "Profile not found"; errorType = "NOT_FOUND"; }
        else {
          const { data: files } = await admin.from("files").select("size").eq("user_id", userId).eq("is_trashed", false).eq("is_folder", false);
          const storageUsed = files?.reduce((sum, f) => sum + (f.size || 0), 0) || 0;
          const { count: wsCount } = await admin.from("workspace_members").select("*", { count: "exact", head: true }).eq("user_id", userId);
          const { count: fileCount } = await admin.from("files").select("*", { count: "exact", head: true }).eq("user_id", userId).eq("is_trashed", false).eq("is_folder", false);
          response = json({
            user: {
              ...profile, storage_used: storageUsed, storage_used_formatted: formatBytes(storageUsed),
              storage_limit_formatted: formatBytes(profile.storage_limit),
              storage_percent: profile.storage_limit > 0 ? Math.round((storageUsed / profile.storage_limit) * 100) : 0,
              workspace_count: wsCount || 0, file_count: fileCount || 0,
            }
          });
        }
      }

    } else if (apiPath[0] === "user" && method === "GET" && apiPath.length === 2) {
      if (!scopes.includes("user:read")) {
        response = errResponse("Insufficient scope: user:read required.", 403, { error_type: "INSUFFICIENT_SCOPE", required_scope: "user:read", current_scopes: scopes });
        errorMessage = "Missing scope: user:read"; errorType = "INSUFFICIENT_SCOPE";
      } else {
        const { data: profile, error: pErr } = await admin.from("profiles").select("id, display_name, avatar_url, created_at").eq("id", apiPath[1]).single();
        if (pErr || !profile) { response = errResponse("User not found", 404); errorMessage = "User not found"; errorType = "NOT_FOUND"; }
        else response = json({ user: profile });
      }

    } else if (apiPath[0] === "files" && apiPath.length === 3 && apiPath[2] === "details" && method === "GET") {
      if (!scopes.includes("files:read")) {
        response = errResponse("Insufficient scope: files:read required.", 403, { error_type: "INSUFFICIENT_SCOPE", required_scope: "files:read", current_scopes: scopes });
        errorMessage = "Missing scope: files:read"; errorType = "INSUFFICIENT_SCOPE";
      } else {
        const { data: file, error: fErr } = await admin.from("files").select("*").eq("id", apiPath[1]).eq("user_id", userId).single();
        if (fErr || !file) { response = errResponse("File not found", 404); errorMessage = "File not found"; errorType = "NOT_FOUND"; }
        else {
          const { data: fileTags } = await admin.from("file_tags").select("tag_id, tags(id, name, color)").eq("file_id", file.id);
          const { data: versions } = await admin.from("file_versions").select("id, version_number, size, cloudinary_url, uploaded_at").eq("file_id", file.id).order("version_number", { ascending: false });
          const { data: shares } = await admin.from("file_shares").select("id, token, share_code, access_type, permission, view_count, download_count, expires_at, created_at").eq("file_id", file.id).eq("user_id", userId);
          const { count: commentCount } = await admin.from("file_comments").select("*", { count: "exact", head: true }).eq("file_id", file.id);
          response = json({
            file: {
              ...file, size_formatted: formatBytes(file.size || 0),
              tags: fileTags?.map((ft: any) => ft.tags) || [], versions: versions || [],
              version_count: versions?.length || 0, shares: shares || [],
              share_count: shares?.length || 0, comment_count: commentCount || 0,
            }
          });
        }
      }

    } else if (apiPath[0] === "workspaces" && method === "GET" && apiPath.length === 1) {
      if (!scopes.includes("workspaces:read")) {
        response = errResponse("Insufficient scope: workspaces:read required.", 403, { error_type: "INSUFFICIENT_SCOPE", required_scope: "workspaces:read", current_scopes: scopes });
        errorMessage = "Missing scope: workspaces:read"; errorType = "INSUFFICIENT_SCOPE";
      } else {
        const { data: memberships, error: mErr } = await admin.from("workspace_members").select("workspace_id, role, joined_at").eq("user_id", userId);
        if (mErr) { response = errResponse(mErr.message, 500); errorMessage = mErr.message; errorType = "DB_ERROR"; }
        else {
          const wsIds = memberships?.map(m => m.workspace_id) || [];
          if (wsIds.length === 0) {
            response = json({ workspaces: [], count: 0 });
          } else {
            const { data: workspaces } = await admin.from("workspaces")
              .select("id, name, type, description, avatar_url, color_theme, storage_limit, storage_plan, is_frozen, created_at, updated_at, owner_id")
              .in("id", wsIds);
            const enriched = await Promise.all((workspaces || []).map(async (ws: any) => {
              const { count: memberCount } = await admin.from("workspace_members").select("*", { count: "exact", head: true }).eq("workspace_id", ws.id);
              const { count: fileCount } = await admin.from("files").select("*", { count: "exact", head: true }).eq("workspace_id", ws.id).eq("is_trashed", false);
              const membership = memberships?.find(m => m.workspace_id === ws.id);
              return { ...ws, member_count: memberCount || 0, file_count: fileCount || 0, your_role: membership?.role || "member", joined_at: membership?.joined_at };
            }));
            response = json({ workspaces: enriched, count: enriched.length });
          }
        }
      }

    } else if (apiPath[0] === "workspaces" && method === "GET" && apiPath.length === 2) {
      if (!scopes.includes("workspaces:read")) {
        response = errResponse("Insufficient scope: workspaces:read required.", 403, { error_type: "INSUFFICIENT_SCOPE", required_scope: "workspaces:read", current_scopes: scopes });
        errorMessage = "Missing scope: workspaces:read"; errorType = "INSUFFICIENT_SCOPE";
      } else {
        const wsId = apiPath[1];
        const { data: membership } = await admin.from("workspace_members").select("role").eq("user_id", userId).eq("workspace_id", wsId).maybeSingle();
        if (!membership) { response = errResponse("Not a member of this workspace", 403); errorMessage = "Not a workspace member"; errorType = "FORBIDDEN"; }
        else {
          const { data: ws, error: wsErr } = await admin.from("workspaces").select("*").eq("id", wsId).single();
          if (wsErr || !ws) { response = errResponse("Workspace not found", 404); errorMessage = "Workspace not found"; errorType = "NOT_FOUND"; }
          else {
            const { count: memberCount } = await admin.from("workspace_members").select("*", { count: "exact", head: true }).eq("workspace_id", wsId);
            const { data: wsFiles } = await admin.from("files").select("size, is_folder").eq("workspace_id", wsId).eq("is_trashed", false);
            const totalFiles = wsFiles?.filter(f => !f.is_folder).length || 0;
            const totalFolders = wsFiles?.filter(f => f.is_folder).length || 0;
            const storageUsed = wsFiles?.reduce((sum, f) => sum + (f.size || 0), 0) || 0;
            const { data: ownerProfile } = await admin.from("profiles").select("id, display_name, email, avatar_url").eq("id", ws.owner_id).single();
            response = json({
              workspace: {
                ...ws, your_role: membership.role, member_count: memberCount || 0,
                file_count: totalFiles, folder_count: totalFolders,
                storage_used: storageUsed, storage_used_formatted: formatBytes(storageUsed),
                storage_limit_formatted: formatBytes(ws.storage_limit),
                storage_percent: ws.storage_limit > 0 ? Math.round((storageUsed / ws.storage_limit) * 100) : 0,
                owner: ownerProfile,
              }
            });
          }
        }
      }

    } else if (apiPath[0] === "workspaces" && apiPath.length === 3 && apiPath[2] === "members" && method === "GET") {
      if (!scopes.includes("workspaces:read")) {
        response = errResponse("Insufficient scope: workspaces:read required.", 403, { error_type: "INSUFFICIENT_SCOPE", required_scope: "workspaces:read", current_scopes: scopes });
        errorMessage = "Missing scope: workspaces:read"; errorType = "INSUFFICIENT_SCOPE";
      } else {
        const wsId = apiPath[1];
        const { data: membership } = await admin.from("workspace_members").select("role").eq("user_id", userId).eq("workspace_id", wsId).maybeSingle();
        if (!membership) { response = errResponse("Not a member of this workspace", 403); errorMessage = "Not a workspace member"; errorType = "FORBIDDEN"; }
        else {
          const { data: members, error: memErr } = await admin.from("workspace_members").select("user_id, role, joined_at").eq("workspace_id", wsId);
          if (memErr) { response = errResponse(memErr.message, 500); errorMessage = memErr.message; errorType = "DB_ERROR"; }
          else {
            const memberIds = members?.map(m => m.user_id) || [];
            const { data: profiles } = await admin.from("profiles").select("id, display_name, email, avatar_url, last_active_at").in("id", memberIds);
            const enriched = members?.map((m: any) => {
              const profile = profiles?.find((p: any) => p.id === m.user_id);
              return { user_id: m.user_id, role: m.role, joined_at: m.joined_at, display_name: profile?.display_name || null, email: profile?.email || null, avatar_url: profile?.avatar_url || null, last_active_at: profile?.last_active_at || null };
            }) || [];
            response = json({ members: enriched, count: enriched.length });
          }
        }
      }

    } else if (apiPath[0] === "ai" && apiPath[1] === "analyze-image" && method === "POST") {
      if (!scopes.includes("ai:analyze")) {
        response = errResponse("Insufficient scope: ai:analyze required.", 403, { error_type: "INSUFFICIENT_SCOPE", required_scope: "ai:analyze", current_scopes: scopes });
        errorMessage = "Missing scope: ai:analyze"; errorType = "INSUFFICIENT_SCOPE";
      } else {
        const body = await req.json();
        const aiRes = await fetch(`${supabaseUrl}/functions/v1/ai-image-analyze`, {
          method: "POST",
          headers: { "Content-Type": "application/json", "X-API-Key": apiKey },
          body: JSON.stringify(body),
        });
        const aiData = await aiRes.json();
        response = json(aiData, aiRes.status);
      }

    } else {
      response = errResponse(`Unknown endpoint: ${method} ${endpoint}. Check the API documentation for available endpoints.`, 404, {
        error_type: "ENDPOINT_NOT_FOUND",
        available_endpoints: [
          "GET /files", "GET /files/:id", "GET /files/:id/details",
          "POST /files/upload", "DELETE /files/:id", "POST /folders",
          "GET /shares", "POST /shares", "GET /tags", "POST /tags",
          "GET /usage", "GET /user/me", "GET /user/:id",
          "GET /workspaces", "GET /workspaces/:id", "GET /workspaces/:id/members",
          "POST /ai/analyze-image",
        ],
      });
      errorMessage = `Unknown endpoint: ${method} ${endpoint}`;
      errorType = "ENDPOINT_NOT_FOUND";
    }
  } catch (e) {
    const error = e as Error;
    console.error("API Error:", error);
    errorMessage = error.message || "Internal server error";
    errorType = error.name || "Error";
    errorStack = error.stack || "";
    response = errResponse("Internal server error: " + errorMessage, 500, {
      error_type: errorType,
      error_id: crypto.randomUUID(),
    });
  }

  // Log usage with full request/response capture (async, non-blocking)
  const responseTime = Date.now() - startTime;
  const responseClone = response.clone();
  const responseText = await responseClone.text().catch(() => "");

  let aiMeta: any = null;
  if (endpoint.includes("/ai/") && responseText) {
    try {
      const resJson = JSON.parse(responseText);
      aiMeta = detectAiMetadata(endpoint, clonedBody, resJson);
    } catch { /* ignore */ }
  }

  const logData: Record<string, any> = {
    api_key_id: keyData.id,
    user_id: userId,
    endpoint,
    method,
    status_code: response.status,
    response_time_ms: responseTime,
    ip_address: ipAddress,
    user_agent: userAgent,
    request_headers: reqHeaders,
    request_body: clonedBody ? maskSensitive(clonedBody) : null,
    response_body: truncateResponse(responseText),
    request_size: clonedBody ? JSON.stringify(clonedBody).length : 0,
    response_size: responseText.length,
    file_metadata: clonedBody ? extractFileMetadata(clonedBody) : null,
    error_message: errorMessage || null,
    error_type: errorType || null,
    error_stack: errorStack || null,
    ai_metadata: aiMeta,
  };

  logRequest(admin, logData);

  return response;
});

async function triggerWebhooks(admin: any, userId: string, event: string, payload: any) {
  try {
    const { data: webhooks } = await admin.from("api_webhooks")
      .select("*").eq("user_id", userId).eq("is_active", true).contains("events", [event]);
    if (!webhooks?.length) return;
    for (const wh of webhooks) {
      try {
        await fetch(wh.url, {
          method: "POST",
          headers: { "Content-Type": "application/json", "X-Webhook-Secret": wh.secret, "X-Webhook-Event": event },
          body: JSON.stringify({ event, data: payload, timestamp: new Date().toISOString() }),
        });
        await admin.from("api_webhooks").update({ last_triggered_at: new Date().toISOString(), failure_count: 0 }).eq("id", wh.id);
      } catch {
        await admin.from("api_webhooks").update({ failure_count: wh.failure_count + 1 }).eq("id", wh.id);
      }
    }
  } catch (e) { console.error("Webhook trigger error:", e); }
}
