"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export default function ConfirmedPage() {
  const router = useRouter();
  const [status, setStatus] = useState<"checking" | "ready">("checking");
  const supabase = createClient();

  useEffect(() => {
    let attempts = 0;
    const maxAttempts = 10; // 5 seconds max wait

    // Poll for session to be established
    // Cookies may take a moment to be processed by the browser after redirect
    const checkSession = async () => {
      attempts++;

      const { data: { user } } = await supabase.auth.getUser();

      if (user) {
        // Session established - safe to redirect
        setStatus("ready");
        // Small delay to show success state
        setTimeout(() => {
          router.replace("/dashboard");
        }, 500);
        return;
      }

      if (attempts >= maxAttempts) {
        // Session never established - redirect to login instead of showing error
        // This handles cases where user navigates here directly or with expired token
        router.replace("/auth/login");
        return;
      }

      // Keep polling
      setTimeout(checkSession, 500);
    };

    checkSession();
  }, [router, supabase.auth]);

  return (
    <main className="min-h-screen bg-bg-base flex items-center justify-center">
      <div className="text-center">
        {status === "checking" && (
          <>
            <div className="w-12 h-12 border-4 border-primary/30 border-t-primary rounded-full animate-spin mx-auto mb-4" />
            <p className="text-text-secondary">Setting up your account...</p>
          </>
        )}

        {status === "ready" && (
          <>
            <div className="w-12 h-12 bg-success/20 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-6 h-6 text-success" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <p className="text-text-secondary">Taking you to your dashboard...</p>
          </>
        )}
      </div>
    </main>
  );
}
