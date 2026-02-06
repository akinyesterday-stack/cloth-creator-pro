import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    });

    // Get all approved profiles
    const { data: profiles, error: profilesError } = await supabaseAdmin
      .from("profiles")
      .select("user_id, username")
      .eq("status", "approved");

    if (profilesError) {
      throw profilesError;
    }

    const results: { username: string; success: boolean; error?: string }[] = [];

    for (const profile of profiles || []) {
      try {
        const { error } = await supabaseAdmin.auth.admin.updateUserById(
          profile.user_id,
          { password: "demo123" }
        );

        if (error) {
          results.push({ username: profile.username, success: false, error: error.message });
        } else {
          results.push({ username: profile.username, success: true });
        }
      } catch (err) {
        results.push({ username: profile.username, success: false, error: String(err) });
      }
    }

    console.log("Password update results:", results);

    return new Response(JSON.stringify({ success: true, results }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Error updating passwords:", error);
    return new Response(JSON.stringify({ success: false, error: String(error) }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
