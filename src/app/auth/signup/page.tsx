"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import Link from "next/link";

export default function SignupPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const supabase = createClient();

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (password !== confirmPassword) {
      setError("Passwords do not match");
      return;
    }

    if (password.length < 6) {
      setError("Password must be at least 6 characters");
      return;
    }

    setLoading(true);

    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: `${window.location.origin}/auth/callback`,
      },
    });

    if (error) {
      setError(error.message);
      setLoading(false);
    } else {
      setSuccess(true);
      setLoading(false);
    }
  };

  if (success) {
    return (
      <main className="min-h-screen flex items-center justify-center px-4 bg-bg-base relative overflow-hidden">
        {/* Background effects */}
        <div className="absolute inset-0 mesh-gradient" />
        <div className="absolute top-1/3 left-1/4 w-80 h-80 bg-success/15 rounded-full blur-3xl" />

        <div className="w-full max-w-md relative z-10 text-center">
          <div className="flex items-center justify-center gap-2 mb-6">
            <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
              <svg className="w-6 h-6 text-primary" viewBox="0 0 24 24" fill="currentColor">
                <path d="M12.5 3.5c-3.6 0-6.5 2.9-6.5 6.5 0 2.6 1.5 4.8 3.7 5.8v4.7c0 .6.4 1 1 1h3.5c.6 0 1-.4 1-1v-4.7c2.2-1 3.8-3.2 3.8-5.8 0-3.6-2.9-6.5-6.5-6.5zm.5 6.5c0 .6-.4 1-1 1s-1-.4-1-1 .4-1 1-1 1 .4 1 1z"/>
              </svg>
            </div>
            <span className="text-4xl font-bold tracking-tight">
              <span className="text-primary">Sats</span>
              <span className="text-text-primary">At</span>
            </span>
          </div>

          <div className="glass rounded-2xl p-8">
            <div className="w-16 h-16 rounded-full bg-success/10 flex items-center justify-center mx-auto mb-6">
              <svg className="w-8 h-8 text-success" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
              </svg>
            </div>
            <h2 className="text-2xl font-semibold mb-3 text-text-primary">Check your email</h2>
            <p className="text-text-secondary mb-8 leading-relaxed">
              We sent a confirmation link to <strong className="text-text-primary">{email}</strong>.
              Click the link to activate your account.
            </p>
            <Link href="/auth/login" className="btn-secondary inline-block px-8 py-3">
              Back to Login
            </Link>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen flex items-center justify-center px-4 py-12 bg-bg-base relative overflow-hidden">
      {/* Background effects */}
      <div className="absolute inset-0 mesh-gradient" />
      <div className="absolute top-1/3 left-1/4 w-80 h-80 bg-primary/15 rounded-full blur-3xl" />
      <div className="absolute bottom-1/3 right-1/4 w-64 h-64 bg-info/10 rounded-full blur-3xl" />

      <div className="w-full max-w-md relative z-10">
        {/* Logo */}
        <div className="text-center mb-10">
          <Link href="/" className="inline-flex flex-col items-center group">
            <div className="flex items-center gap-2 mb-2">
              <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center group-hover:bg-primary/20 transition-colors">
                <svg className="w-6 h-6 text-primary" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M12.5 3.5c-3.6 0-6.5 2.9-6.5 6.5 0 2.6 1.5 4.8 3.7 5.8v4.7c0 .6.4 1 1 1h3.5c.6 0 1-.4 1-1v-4.7c2.2-1 3.8-3.2 3.8-5.8 0-3.6-2.9-6.5-6.5-6.5zm.5 6.5c0 .6-.4 1-1 1s-1-.4-1-1 .4-1 1-1 1 .4 1 1z"/>
                </svg>
              </div>
              <span className="text-4xl font-bold tracking-tight">
                <span className="text-primary">SCT</span>
              </span>
            </div>
          </Link>
          <p className="text-text-secondary mt-3">Create your account</p>
        </div>

        {/* Signup Form */}
        <div className="glass rounded-2xl p-8">
          <form onSubmit={handleSignup} className="space-y-5">
            {error && (
              <div className="bg-error/10 border border-error/30 text-error px-4 py-3 rounded-lg text-sm flex items-center gap-2">
                <svg className="w-4 h-4 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
                {error}
              </div>
            )}

            <div>
              <label htmlFor="email" className="block text-sm font-medium text-text-secondary mb-2">
                Email
              </label>
              <input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="input w-full"
                placeholder="you@example.com"
              />
            </div>

            <div>
              <label htmlFor="password" className="block text-sm font-medium text-text-secondary mb-2">
                Password
              </label>
              <input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                className="input w-full"
                placeholder="••••••••"
              />
              <p className="text-xs text-text-muted mt-1.5">Minimum 6 characters</p>
            </div>

            <div>
              <label htmlFor="confirmPassword" className="block text-sm font-medium text-text-secondary mb-2">
                Confirm Password
              </label>
              <input
                id="confirmPassword"
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
                className="input w-full"
                placeholder="••••••••"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full btn-primary py-3.5 text-base disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? (
                <span className="flex items-center justify-center gap-2">
                  <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                  </svg>
                  Creating account...
                </span>
              ) : (
                "Create Account"
              )}
            </button>
          </form>

          <p className="mt-5 text-xs text-text-muted text-center">
            By signing up, you agree to our Terms of Service and Privacy Policy.
          </p>

          <div className="mt-8 pt-6 border-t border-border text-center text-sm text-text-tertiary">
            Already have an account?{" "}
            <Link href="/auth/login" className="text-primary hover:text-primary-glow transition-colors font-medium">
              Sign in
            </Link>
          </div>
        </div>

        {/* Features reminder */}
        <div className="mt-10 text-center">
          <div className="glass rounded-xl p-4 inline-block">
            <p className="text-sm text-text-secondary mb-2">Free tier includes:</p>
            <div className="flex items-center justify-center gap-4 text-xs text-text-tertiary">
              <span className="flex items-center gap-1">
                <svg className="w-3.5 h-3.5 text-primary" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                </svg>
                3 wallets
              </span>
              <span className="flex items-center gap-1">
                <svg className="w-3.5 h-3.5 text-primary" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                </svg>
                100 transactions
              </span>
              <span className="flex items-center gap-1">
                <svg className="w-3.5 h-3.5 text-primary" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                </svg>
                Basic reports
              </span>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
