import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";
import { headers } from "next/headers";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const code = searchParams.get("code");
  const next = searchParams.get("next");
  const type = searchParams.get("type");

  // Get the actual origin from forwarded headers (for reverse proxy/Cloudflare)
  const headersList = await headers();
  const host = headersList.get("x-forwarded-host") || headersList.get("host") || "selfcustodytax.com";
  const protocol = headersList.get("x-forwarded-proto") || "https";
  const origin = `${protocol}://${host}`;

  if (code) {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) {
      // If this is an email confirmation (signup), show welcome page
      if (type === "signup" || type === "email" || !next) {
        return NextResponse.redirect(`${origin}/auth/confirmed`);
      }
      // Otherwise redirect to specified destination
      return NextResponse.redirect(`${origin}${next}`);
    }
  }

  // Return the user to an error page with instructions
  return NextResponse.redirect(`${origin}/auth/login?error=Could not authenticate`);
}
