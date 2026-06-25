import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  const supabaseAdmin = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  );

  const TARGET_UUID = "58e02521-6c14-4227-8b6e-92b1c07f2300";
  const TARGET_EMAIL = "proyectosweb@sharpen.studio";
  const TARGET_PASSWORD = "Istratega1*1";

  // Step 1: Delete the broken user via admin API (preserves UUID reuse)
  await supabaseAdmin.auth.admin.deleteUser(TARGET_UUID);

  // Step 2: Recreate via admin API with the same UUID
  const { data, error } = await supabaseAdmin.auth.admin.createUser({
    email: TARGET_EMAIL,
    password: TARGET_PASSWORD,
    email_confirm: true,
    user_metadata: {},
    // @ts-ignore - id is supported in newer versions
    id: TARGET_UUID,
  });

  if (error) {
    return new Response(JSON.stringify({ error: error.message, code: error.code }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  return new Response(JSON.stringify({ success: true, user_id: data.user?.id, email: data.user?.email }), {
    status: 200,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
});
