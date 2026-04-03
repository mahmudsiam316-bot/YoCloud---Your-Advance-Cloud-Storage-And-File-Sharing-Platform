import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "npm:@supabase/supabase-js@2.99.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const CLOUD_NAME = Deno.env.get("CLOUDINARY_CLOUD_NAME");
    const API_KEY = Deno.env.get("CLOUDINARY_API_KEY");
    const API_SECRET = Deno.env.get("CLOUDINARY_API_SECRET");
    if (!CLOUD_NAME || !API_KEY || !API_SECRET) {
      throw new Error("Cloudinary credentials not configured");
    }

    // Auth check
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("Missing authorization header");

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    });

    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) throw new Error("Not authenticated");

    // Parse multipart form data
    const formData = await req.formData();
    const file = formData.get("file") as File;
    const parentId = formData.get("parentId") as string | null;
    const fileName = formData.get("fileName") as string || file.name;
    const workspaceId = formData.get("workspaceId") as string | null;

    if (!file) throw new Error("No file provided");

    // 100MB limit
    if (file.size > 100 * 1024 * 1024) {
      throw new Error("File exceeds 100MB limit");
    }

    // Upload to Cloudinary
    const timestamp = Math.floor(Date.now() / 1000);
    const folder = `yocloud/${user.id}`;
    
    // Generate signature
    const signStr = `folder=${folder}&timestamp=${timestamp}${API_SECRET}`;
    const encoder = new TextEncoder();
    const data = encoder.encode(signStr);
    const hashBuffer = await crypto.subtle.digest("SHA-1", data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    const signature = hashArray.map(b => b.toString(16).padStart(2, "0")).join("");

    const cloudinaryForm = new FormData();
    cloudinaryForm.append("file", file);
    cloudinaryForm.append("api_key", API_KEY);
    cloudinaryForm.append("timestamp", String(timestamp));
    cloudinaryForm.append("signature", signature);
    cloudinaryForm.append("folder", folder);

    // Determine resource type
    const mimeType = file.type || "application/octet-stream";
    let resourceType = "auto";
    if (mimeType.startsWith("image/")) resourceType = "image";
    else if (mimeType.startsWith("video/")) resourceType = "video";
    else resourceType = "raw";

    const uploadUrl = `https://api.cloudinary.com/v1_1/${CLOUD_NAME}/${resourceType}/upload`;
    const cloudRes = await fetch(uploadUrl, { method: "POST", body: cloudinaryForm });

    if (!cloudRes.ok) {
      const errBody = await cloudRes.text();
      throw new Error(`Cloudinary upload failed [${cloudRes.status}]: ${errBody}`);
    }

    const cloudData = await cloudRes.json();

    // Save to DB using service role for insert
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const adminClient = createClient(supabaseUrl, serviceKey);

    const sanitizedName = fileName.replace(/[~#%&*{}\\:<>?/+|"]/g, "_");

    const insertData: Record<string, unknown> = {
        name: sanitizedName,
        storage_path: cloudData.public_id,
        cloudinary_url: cloudData.secure_url,
        cloudinary_public_id: cloudData.public_id,
        size: file.size,
        mime_type: mimeType,
        user_id: user.id,
        parent_id: parentId || null,
      };
    if (workspaceId) insertData.workspace_id = workspaceId;

    const { data: inserted, error: dbError } = await adminClient
      .from("files")
      .insert(insertData)
      .select("id")
      .single();

    if (dbError) throw new Error(`DB insert failed: ${dbError.message}`);

    // Log activity
    await adminClient.from("activity_log").insert({
      user_id: user.id,
      action: "upload",
      file_name: sanitizedName,
      file_id: inserted.id,
    });

    return new Response(
      JSON.stringify({
        id: inserted.id,
        url: cloudData.secure_url,
        public_id: cloudData.public_id,
        size: file.size,
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (err) {
    console.error("Upload error:", err);
    return new Response(
      JSON.stringify({ error: (err as Error).message }),
      {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
