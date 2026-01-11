import { createServerClient } from "@supabase/ssr";
import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import type { EmailOtpType } from "@supabase/supabase-js";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const code = searchParams.get("code");
  const token_hash = searchParams.get("token_hash");
  const type = searchParams.get("type") as EmailOtpType | null;
  const next = searchParams.get("next");

  // Use NEXT_PUBLIC_APP_URL for reliable origin behind Cloudflare
  const origin = process.env.NEXT_PUBLIC_APP_URL || "https://selfcustodytax.com";

  // Get cookies for reading
  const cookieStore = await cookies();

  // Helper to create redirect with cookies attached
  const createRedirectResponse = (url: string) => {
    return NextResponse.redirect(url);
  };

  // Create Supabase client that writes cookies to the response
  // We'll set cookies on the final response before returning
  let responseCookies: { name: string; value: string; options?: Record<string, unknown> }[] = [];

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet: { name: string; value: string; options?: Record<string, unknown> }[]) {
          responseCookies = cookiesToSet;
        },
      },
    }
  );

  let authError: Error | null = null;
  let isNewSignup = false;

  // Handle email confirmation (token_hash flow - when using custom email template)
  if (token_hash && type) {
    const { error } = await supabase.auth.verifyOtp({
      token_hash,
      type,
    });
    authError = error;
    isNewSignup = type === "signup" || type === "email";
  }
  // Handle OAuth/PKCE flow (code exchange - default Supabase email flow)
  else if (code) {
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    authError = error;
    // Check if this is a signup confirmation
    isNewSignup = type === "signup" || type === "email" || type === "magiclink";
  }

  // If authentication succeeded
  if (!authError && (token_hash || code)) {
    // Determine where to redirect
    let redirectTo: string;
    if (isNewSignup) {
      redirectTo = `${origin}/auth/confirmed`;
    } else if (next) {
      // Validate next parameter starts with / to prevent open redirect
      redirectTo = next.startsWith("/") ? `${origin}${next}` : `${origin}/dashboard`;
    } else {
      redirectTo = `${origin}/dashboard`;
    }

    const response = createRedirectResponse(redirectTo);

    // Attach session cookies to the response
    responseCookies.forEach(({ name, value, options }) => {
      response.cookies.set(name, value, options);
    });

    return response;
  }

  // Authentication failed - include error details for debugging
  const errorMessage = authError?.message || "No code or token provided";
  return NextResponse.redirect(
    `${origin}/auth/login?error=${encodeURIComponent(errorMessage)}`
  );
}
