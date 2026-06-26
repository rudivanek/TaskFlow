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
    const message = payload.record as {
      author_id: string;
      author_name: string;
      content: string;
      channel_id: string | null;
      conversation_id: string | null;
    };

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

    let targetUserIds: string[] = [];

    if (message.conversation_id) {
      const { data: conv } = await supabase
        .from("chat_direct_conversations")
        .select("user_a_id, user_b_id")
        .eq("id", message.conversation_id)
        .single();
      if (conv) {
        targetUserIds = [conv.user_a_id, conv.user_b_id].filter((id) => id !== message.author_id);
      }
    } else {
      const { data: profiles } = await supabase
        .from("profiles")
        .select("id")
        .neq("id", message.author_id);
      targetUserIds = profiles?.map((p: { id: string }) => p.id) ?? [];
    }

    if (targetUserIds.length === 0) {
      return new Response("ok", { headers: corsHeaders });
    }

    let channelLabel = "TaskFlow Chat";
    if (message.channel_id) {
      const { data: channel } = await supabase
        .from("chat_channels")
        .select("name")
        .eq("id", message.channel_id)
        .single();
      if (channel) channelLabel = `#${channel.name}`;
    }

    await fetch(`${SUPABASE_URL}/functions/v1/send-push-notification`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${SUPABASE_SERVICE_KEY}`,
      },
      body: JSON.stringify({
        user_ids: targetUserIds,
        title: `${message.author_name} in ${channelLabel}`,
        body: message.content || "Sent an image",
        url: "/chat",
      }),
    });

    return new Response("ok", { headers: corsHeaders });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    console.error("on-chat-message error:", err);
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
