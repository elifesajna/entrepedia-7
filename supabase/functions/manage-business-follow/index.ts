import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-session-token",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

    if (!supabaseUrl || !supabaseServiceKey) {
      console.error("Missing required env vars");
      return new Response(
        JSON.stringify({ error: "Server not configured" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Validate session token
    const sessionToken = req.headers.get("x-session-token");
    if (!sessionToken) {
      return new Response(
        JSON.stringify({ error: "No session token provided" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const { data: userId, error: sessionError } = await supabase
      .rpc("validate_session", { p_session_token: sessionToken });

    if (sessionError || !userId) {
      return new Response(
        JSON.stringify({ error: "Invalid or expired session" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const { action, business_id } = await req.json();

    if (!business_id) {
      return new Response(
        JSON.stringify({ error: "Business ID is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // FOLLOW business
    if (action === "follow") {
      const { error: followError } = await supabase
        .from("business_follows")
        .insert({
          business_id,
          user_id: userId,
        });

      if (followError) {
        // Check if already following (unique constraint violation)
        if (followError.code === "23505") {
          return new Response(
            JSON.stringify({ success: true, message: "Already following" }),
            { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }
        console.error("Follow business error:", followError);
        return new Response(
          JSON.stringify({ error: followError.message }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      return new Response(
        JSON.stringify({ success: true }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // UNFOLLOW business
    if (action === "unfollow") {
      const { error: unfollowError } = await supabase
        .from("business_follows")
        .delete()
        .eq("business_id", business_id)
        .eq("user_id", userId);

      if (unfollowError) {
        console.error("Unfollow business error:", unfollowError);
        return new Response(
          JSON.stringify({ error: unfollowError.message }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      return new Response(
        JSON.stringify({ success: true }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    return new Response(
      JSON.stringify({ error: "Invalid action. Use: follow, unfollow" }),
      { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    console.error("Unexpected error:", error);
    return new Response(
      JSON.stringify({ error: "Internal server error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
