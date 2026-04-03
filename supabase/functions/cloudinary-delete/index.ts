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

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("Missing authorization header");

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    });

    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) throw new Error("Not authenticated");

    const { publicIds, resourceType = "image" } = await req.json();
    if (!publicIds || !Array.isArray(publicIds) || publicIds.length === 0) {
      throw new Error("publicIds array required");
    }

    // Delete from Cloudinary
    const timestamp = Math.floor(Date.now() / 1000);

    for (const publicId of publicIds) {
      const signStr = `public_id=${publicId}&timestamp=${timestamp}${API_SECRET}`;
      const encoder = new TextEncoder();
      const data = encoder.encode(signStr);
      const hashBuffer = await crypto.subtle.digest("SHA-1", data);
      const hashArray = Array.from(new Uint8Array(hashBuffer));
      const signature = hashArray.map(b => b.toString(16).padStart(2, "0")).join("");

      const deleteForm = new FormData();
      deleteForm.append("public_id", publicId);
      deleteForm.append("api_key", API_KEY);
      deleteForm.append("timestamp", String(timestamp));
      deleteForm.append("signature", signature);

      await fetch(
        `https://api.cloudinary.com/v1_1/${CLOUD_NAME}/${resourceType}/destroy`,
        { method: "POST", body: deleteForm }
      );
    }

    return new Response(
      JSON.stringify({ success: true, deleted: publicIds.length }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    console.error("Delete error:", err);
    return new Response(
      JSON.stringify({ error: (err as Error).message }),
      {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
