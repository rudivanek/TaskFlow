import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    const payload = await req.json();
    const comment = payload.record as {
      user_id: string;
      author_name: string;
      content: string;
      project_id: string;
      notify_all: boolean;
      notified_user_ids: string[];
    };

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

    let targetUserIds: string[] = [];

    if (comment.notify_all) {
      const { data: profiles } = await supabase
        .from("profiles")
        .select("id")
        .neq("id", comment.user_id);
      targetUserIds = profiles?.map((p: { id: string }) => p.id) ?? [];
    } else {
      targetUserIds = (comment.notified_user_ids ?? []).filter((id) => id !== comment.user_id);
    }

    if (targetUserIds.length === 0) {
      return new Response("ok", { headers: corsHeaders });
    }

    const { data: project } = await supabase
      .from("projects")
      .select("project")
      .eq("id", comment.project_id)
      .single();

    const pushPromise = fetch(`${SUPABASE_URL}/functions/v1/send-push-notification`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${SUPABASE_SERVICE_KEY}`,
      },
      body: JSON.stringify({
        user_ids: targetUserIds,
        title: `${comment.author_name} in ${project?.project ?? "a project"}`,
        body: comment.content || "Sent an image",
        url: "/?page=tasks",
      }),
    });

    (globalThis as any).EdgeRuntime?.waitUntil(pushPromise);
    await pushPromise;

    return new Response("ok", { headers: corsHeaders });
  } catch (err: unknown) {
    const errMessage = err instanceof Error ? err.message : String(err);
    console.error("on-discussion-comment error:", err);
    return new Response(JSON.stringify({ error: errMessage }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
