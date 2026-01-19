import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface VerificationRequest {
  user_id: string;
  email: string;
}

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const { user_id, email }: VerificationRequest = await req.json();

    if (!user_id || !email) {
      return new Response(
        JSON.stringify({ error: "User ID and email are required" }),
        { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    // Generate a verification token
    const verificationToken = crypto.randomUUID();

    // Store the verification token in the profiles table directly
    const { error: updateError } = await supabase
      .from('profiles')
      .update({ 
        email, 
        email_verified: false,
        email_verification_token: verificationToken,
        email_verification_sent_at: new Date().toISOString()
      })
      .eq('id', user_id);

    if (updateError) {
      console.error("Profile update error:", updateError);
      return new Response(
        JSON.stringify({ error: "Failed to send verification" }),
        { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    // Generate verification link
    const verificationLink = `${req.headers.get('origin')}/verify-email?token=${verificationToken}`;

    console.log("Verification link generated:", verificationLink);

    // In production, you would send an actual email here via Resend
    // For now, we return the link for development purposes

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: "Verification email sent",
        // Remove this in production - only for development
        debug_link: verificationLink 
      }),
      { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  } catch (error: any) {
    console.error("Error in send-verification-email:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  }
};

serve(handler);
