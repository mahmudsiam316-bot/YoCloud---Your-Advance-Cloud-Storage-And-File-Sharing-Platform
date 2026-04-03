import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "npm:@supabase/supabase-js@2.99.2";
import JSZip from "npm:jszip@3.10.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { folderId, token } = await req.json();

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, serviceKey);

    // If token provided, validate share access
    if (token) {
      const { data: share, error: shareErr } = await supabase
        .from("file_shares")
        .select("*")
        .eq("token", token)
        .single();

      if (shareErr || !share) {
        return new Response(JSON.stringify({ error: "Invalid share link" }), {
          status: 403,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      if (share.expires_at && new Date(share.expires_at) < new Date()) {
        return new Response(JSON.stringify({ error: "Share link expired" }), {
          status: 403,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      if (share.file_id !== folderId) {
        return new Response(JSON.stringify({ error: "Access denied" }), {
          status: 403,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
    }

    // Get root folder
    const { data: rootFolder, error: rootErr } = await supabase
      .from("files")
      .select("id, name, user_id")
      .eq("id", folderId)
      .eq("is_folder", true)
      .single();

    if (rootErr || !rootFolder) {
      return new Response(JSON.stringify({ error: "Folder not found" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Recursively collect all files
    async function collectFiles(
      parentId: string,
      path: string
    ): Promise<{ path: string; storagePath: string }[]> {
      const { data: children } = await supabase
        .from("files")
        .select("id, name, is_folder, storage_path, is_trashed")
        .eq("parent_id", parentId)
        .eq("is_trashed", false);

      if (!children) return [];

      const results: { path: string; storagePath: string }[] = [];

      for (const child of children) {
        const childPath = path ? `${path}/${child.name}` : child.name;
        if (child.is_folder) {
          const subFiles = await collectFiles(child.id, childPath);
          results.push(...subFiles);
        } else {
          results.push({ path: childPath, storagePath: child.storage_path });
        }
      }

      return results;
    }

    const files = await collectFiles(folderId, "");

    if (files.length === 0) {
      return new Response(JSON.stringify({ error: "Folder is empty" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Size check - limit to 500MB
    const zip = new JSZip();

    let totalSize = 0;
    const MAX_SIZE = 500 * 1024 * 1024;

    for (const file of files) {
      const { data, error } = await supabase.storage
        .from("user-files")
        .download(file.storagePath);

      if (error || !data) continue;

      const arrayBuffer = await data.arrayBuffer();
      totalSize += arrayBuffer.byteLength;

      if (totalSize > MAX_SIZE) {
        return new Response(
          JSON.stringify({ error: "Folder too large (max 500MB)" }),
          {
            status: 400,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          }
        );
      }

      zip.file(file.path, arrayBuffer);
    }

    const zipBlob = await zip.generateAsync({ type: "uint8array" });

    return new Response(zipBlob, {
      headers: {
        ...corsHeaders,
        "Content-Type": "application/zip",
        "Content-Disposition": `attachment; filename="${rootFolder.name}.zip"`,
      },
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: (err as Error).message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
