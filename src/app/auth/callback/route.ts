import { createServerClient } from "@supabase/ssr";
import { NextResponse } from "next/server";
import { headers, cookies } from "next/headers";
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

  // Determine redirect URL
  let redirectTo = `${origin}${next}`;
  if (token_hash && type && (type === "signup" || type === "email")) {
    redirectTo = `${origin}/auth/confirmed`;
  }

  // Create response first so we can attach cookies to it
  const response = NextResponse.redirect(redirectTo);

  // Get cookies for reading
  const cookieStore = await cookies();

  // Create Supabase client that writes cookies to the response
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) => {
            response.cookies.set(name, value, options);
          });
        },
      },
    }
  );

  // Handle email confirmation (token_hash flow)
  if (token_hash && type) {
    const { error } = await supabase.auth.verifyOtp({
      token_hash,
      type,
    });

    if (!error) {
      return response;
    }
  }

  // Handle OAuth/PKCE flow (code exchange)
  if (code) {
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) {
      return response;
    }
  }

  // Authentication failed
  return NextResponse.redirect(`${origin}/auth/login?error=Could not authenticate`);
}
