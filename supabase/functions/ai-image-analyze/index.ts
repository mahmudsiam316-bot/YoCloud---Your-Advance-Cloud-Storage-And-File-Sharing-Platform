import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-api-key, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

function err(message: string, status = 400) {
  return json({ error: message }, status);
}

async function hashKey(key: string): Promise<string> {
  const encoded = new TextEncoder().encode(key);
  const hash = await crypto.subtle.digest("SHA-256", encoded);
  return Array.from(new Uint8Array(hash)).map(b => b.toString(16).padStart(2, "0")).join("");
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return err("Method not allowed", 405);
  }

  const startTime = Date.now();

  try {
    const apiKey = req.headers.get("x-api-key");
    if (!apiKey) return err("Missing X-API-Key header", 401);

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const googleApiKey = Deno.env.get("GOOGLE_AI_API_KEY");

    if (!googleApiKey) {
      return err("AI service not configured", 503);
    }

    const admin = createClient(supabaseUrl, serviceKey);

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

    if (keyError || !keyData) return err("Invalid API key", 401);
    if (keyData.expires_at && new Date(keyData.expires_at) < new Date()) return err("API key expired", 401);

    const userId = keyData.user_id;
    const scopes: string[] = keyData.scopes || [];

    if (!scopes.includes("ai:analyze")) {
      return err("Insufficient scope: ai:analyze. Add 'ai:analyze' scope to your API key.", 403);
    }

    // Update last_used_at
    await admin.from("api_keys").update({ last_used_at: new Date().toISOString() }).eq("id", keyData.id);

    // Rate limiting
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
      } else {
        userPlan = subscription.plan || "free";
      }
    }

    const rateLimit = PLAN_LIMITS[userPlan] || PLAN_LIMITS.free;
    const oneMinAgo = new Date(Date.now() - 60000).toISOString();
    const { count: recentCount } = await admin
      .from("api_usage_logs")
      .select("*", { count: "exact", head: true })
      .eq("api_key_id", keyData.id)
      .gte("created_at", oneMinAgo);

    if ((recentCount || 0) >= rateLimit) {
      return err(`Rate limit exceeded. Plan (${userPlan}) allows ${rateLimit} req/min.`, 429);
    }

    // Parse request
    const body = await req.json();
    const { image_url, prompt } = body;

    if (!image_url) return err("image_url is required");

    // Validate URL
    try {
      new URL(image_url);
    } catch {
      return err("Invalid image_url format");
    }

    // Fetch image and convert to base64
    const imageResponse = await fetch(image_url);
    if (!imageResponse.ok) return err("Failed to fetch image from URL", 400);

    const contentType = imageResponse.headers.get("content-type") || "image/jpeg";
    const imageBuffer = await imageResponse.arrayBuffer();
    const bytes = new Uint8Array(imageBuffer);
    let binary = "";
    const chunkSize = 8192;
    for (let i = 0; i < bytes.length; i += chunkSize) {
      binary += String.fromCharCode(...bytes.subarray(i, i + chunkSize));
    }
    const base64Image = btoa(binary);

    // Build Gemini request with structured output via function calling
    const userPrompt = prompt || "Analyze this image thoroughly.";

    const geminiPayload = {
      contents: [
        {
          parts: [
            {
              inline_data: {
                mime_type: contentType,
                data: base64Image,
              },
            },
            {
              text: `${userPrompt}\n\nAnalyze this image and extract structured information. Call the analyze_image function with your findings.`,
            },
          ],
        },
      ],
      tools: [
        {
          function_declarations: [
            {
              name: "analyze_image",
              description: "Return structured analysis of an image including title, description, detected objects, dominant colors, suggested tags, mood, and any text detected in the image.",
              parameters: {
                type: "object",
                properties: {
                  title: {
                    type: "string",
                    description: "A concise, descriptive title for the image (3-8 words)",
                  },
                  description: {
                    type: "string",
                    description: "A detailed description of what the image shows (2-4 sentences)",
                  },
                  objects: {
                    type: "array",
                    items: { type: "string" },
                    description: "List of distinct objects, people, or elements visible in the image",
                  },
                  colors: {
                    type: "array",
                    items: { type: "string" },
                    description: "Dominant colors in the image as hex codes (e.g. #FF6B35)",
                  },
                  tags: {
                    type: "array",
                    items: { type: "string" },
                    description: "Relevant tags/keywords for categorization (5-10 tags)",
                  },
                  mood: {
                    type: "string",
                    description: "Overall mood or feeling of the image (e.g. serene, energetic, dramatic, cozy)",
                  },
                  text_detected: {
                    type: "string",
                    description: "Any text visible in the image. null if no text is detected.",
                  },
                  category: {
                    type: "string",
                    description: "Primary category: photo, illustration, screenshot, document, meme, chart, logo, or other",
                  },
                  quality_score: {
                    type: "number",
                    description: "Image quality estimate from 1-10 based on composition, lighting, focus",
                  },
                },
                required: ["title", "description", "objects", "colors", "tags", "mood", "category"],
              },
            },
          ],
        },
      ],
      tool_config: {
        function_calling_config: {
          mode: "ANY",
          allowed_function_names: ["analyze_image"],
        },
      },
      generation_config: {
        temperature: 0.3,
        max_output_tokens: 2048,
      },
    };

    // Call Gemini API
    const geminiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${googleApiKey}`;

    const geminiRes = await fetch(geminiUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(geminiPayload),
    });

    if (!geminiRes.ok) {
      const errText = await geminiRes.text();
      console.error("Gemini API error:", geminiRes.status, errText);
      return err(`AI analysis failed: ${geminiRes.status}`, 502);
    }

    const geminiData = await geminiRes.json();

    // Extract function call result
    let analysis: any = null;

    const candidates = geminiData.candidates || [];
    for (const candidate of candidates) {
      const parts = candidate.content?.parts || [];
      for (const part of parts) {
        if (part.functionCall && part.functionCall.name === "analyze_image") {
          analysis = part.functionCall.args;
        }
      }
    }

    if (!analysis) {
      // Fallback: try to extract text response
      const textPart = candidates[0]?.content?.parts?.find((p: any) => p.text);
      if (textPart) {
        try {
          analysis = JSON.parse(textPart.text);
        } catch {
          analysis = {
            title: "Image Analysis",
            description: textPart.text,
            objects: [],
            colors: [],
            tags: [],
            mood: "unknown",
            category: "other",
          };
        }
      } else {
        return err("AI failed to analyze image", 500);
      }
    }

    const responseTime = Date.now() - startTime;

    // Log usage
    await admin.from("api_usage_logs").insert({
      api_key_id: keyData.id,
      user_id: userId,
      endpoint: "/ai/analyze-image",
      method: "POST",
      status_code: 200,
      response_time_ms: responseTime,
      ip_address: req.headers.get("x-forwarded-for") || "unknown",
      user_agent: req.headers.get("user-agent") || "unknown",
    });

    return json({
      analysis,
      metadata: {
        model: "gemini-2.5-flash",
        response_time_ms: responseTime,
        image_url: image_url,
      },
    });
  } catch (e) {
    console.error("AI analyze error:", e);
    return err("Internal server error", 500);
  }
});
