import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const DEMO_USERS = [
  { username: "buyer", fullName: "Satın Alma Uzmanı", email: "buyer@tahagiyim.com", userType: "buyer" },
  { username: "fabric", fullName: "Kumaş Sorumlusu", email: "fabric@tahagiyim.com", userType: "fabric" },
  { username: "planlama", fullName: "Planlama Uzmanı", email: "planlama@tahagiyim.com", userType: "planlama" },
  { username: "fason", fullName: "Fason Takip", email: "fason@tahagiyim.com", userType: "fason" },
  { username: "kesim", fullName: "Kesim Takip Uzmanı", email: "kesim@tahagiyim.com", userType: "kesim_takip" },
  { username: "tedarik_muduru", fullName: "Tedarik Müdürü", email: "tedarik.muduru@tahagiyim.com", userType: "tedarik_muduru" },
  { username: "isletme_muduru", fullName: "İşletme Müdürü", email: "isletme.muduru@tahagiyim.com", userType: "isletme_muduru" },
  { username: "tedarik_sorumlusu", fullName: "Tedarik Sorumlusu", email: "tedarik.sorumlusu@tahagiyim.com", userType: "tedarik_sorumlusu" },
];

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

    const results: { username: string; success: boolean; error?: string }[] = [];

    for (const user of DEMO_USERS) {
      try {
        // Check if user already exists
        const { data: existingProfile } = await supabaseAdmin
          .from("profiles")
          .select("id")
          .eq("username", user.username)
          .maybeSingle();

        if (existingProfile) {
          results.push({ username: user.username, success: true, error: "Already exists" });
          continue;
        }

        // Create auth user
        const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
          email: user.email,
          password: "demo123",
          email_confirm: true,
        });

        if (authError) {
          results.push({ username: user.username, success: false, error: authError.message });
          continue;
        }

        if (authData.user) {
          // Create profile
          const { error: profileError } = await supabaseAdmin
            .from("profiles")
            .insert({
              user_id: authData.user.id,
              username: user.username,
              full_name: user.fullName,
              email: user.email,
              status: "approved",
              user_type: user.userType,
            });

          if (profileError) {
            results.push({ username: user.username, success: false, error: profileError.message });
            continue;
          }

          // Add user role
          await supabaseAdmin.from("user_roles").insert({
            user_id: authData.user.id,
            role: "user",
          });

          results.push({ username: user.username, success: true });
        }
      } catch (err) {
        results.push({ username: user.username, success: false, error: String(err) });
      }
    }

    console.log("Demo users creation results:", results);

    return new Response(JSON.stringify({ success: true, results }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Error creating demo users:", error);
    return new Response(JSON.stringify({ success: false, error: String(error) }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
