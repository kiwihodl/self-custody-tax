import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";
import { headers } from "next/headers";
import type { EmailOtpType } from "@supabase/supabase-js";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const code = searchParams.get("code");
  const token_hash = searchParams.get("token_hash");
  const type = searchParams.get("type") as EmailOtpType | null;
  const next = searchParams.get("next") ?? "/dashboard";

  // Get the actual origin from forwarded headers (for reverse proxy/Cloudflare)
  const headersList = await headers();
  const host = headersList.get("x-forwarded-host") || headersList.get("host") || "selfcustodytax.com";
  const protocol = headersList.get("x-forwarded-proto") || "https";
  const origin = `${protocol}://${host}`;

  const supabase = await createClient();

  // Handle email confirmation (token_hash flow)
  if (token_hash && type) {
    const { error } = await supabase.auth.verifyOtp({
      token_hash,
      type,
    });

    if (!error) {
      // Email confirmed and user is now logged in
      // For new signups, show welcome page; otherwise go to dashboard
      if (type === "signup" || type === "email") {
        return NextResponse.redirect(`${origin}/auth/confirmed`);
      }
      return NextResponse.redirect(`${origin}${next}`);
    }
  }

  // Handle OAuth/PKCE flow (code exchange)
  if (code) {
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) {
      return NextResponse.redirect(`${origin}${next}`);
    }
  }

  // Authentication failed
  return NextResponse.redirect(`${origin}/auth/login?error=Could not authenticate`);
}
