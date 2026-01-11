"use client";

import Link from "next/link";
import Image from "next/image";
import { useEffect, useState } from "react";

export default function ConfirmedPage() {
  const [countdown, setCountdown] = useState(5);

  useEffect(() => {
    const timer = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          window.location.href = "/dashboard";
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  return (
    <main className="min-h-screen bg-bg-base flex items-center justify-center p-4">
      {/* Background effects */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-success/10 rounded-full blur-3xl animate-pulse-slow" />
        <div className="absolute bottom-1/4 right-1/4 w-80 h-80 bg-primary/10 rounded-full blur-3xl animate-pulse-slow" style={{ animationDelay: '1s' }} />
      </div>

      <div className="relative w-full max-w-md">
        <div className="card text-center py-12 px-8">
          {/* Success Icon */}
          <div className="w-20 h-20 mx-auto mb-6 rounded-full bg-success/20 flex items-center justify-center">
            <svg
              className="w-10 h-10 text-success"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M5 13l4 4L19 7"
              />
            </svg>
          </div>

          {/* Logo */}
          <div className="mb-6">
            <Image
              src="/logo-icon.png"
              alt="Self Custody Tax"
              width={48}
              height={48}
              className="mx-auto mb-3"
            />
            <h1
              className="text-2xl font-bold"
              style={{
                background: 'linear-gradient(180deg, #FBDC7B 0%, #D4B85A 100%)',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
                backgroundClip: 'text',
              }}
            >
              Welcome to Self Custody Tax!
            </h1>
          </div>

          {/* Message */}
          <div className="space-y-4 mb-8">
            <p className="text-text-primary text-lg">
              Your email has been confirmed.
            </p>
            <p className="text-text-secondary">
              You&apos;re all set to start tracking your crypto portfolio and generating tax reports with confidence.
            </p>
          </div>

          {/* Features reminder */}
          <div className="bg-bg-raised rounded-lg p-4 mb-8 text-left">
            <p className="text-text-tertiary text-sm mb-3">What you can do now:</p>
            <ul className="space-y-2 text-sm text-text-secondary">
              <li className="flex items-center gap-2">
                <span className="text-success">&#10003;</span>
                Add your Bitcoin or Ethereum wallets
              </li>
              <li className="flex items-center gap-2">
                <span className="text-success">&#10003;</span>
                Import exchange history (Coinbase, Kraken, etc.)
              </li>
              <li className="flex items-center gap-2">
                <span className="text-success">&#10003;</span>
                View your portfolio and calculate taxes
              </li>
            </ul>
          </div>

          {/* CTA */}
          <Link
            href="/dashboard"
            className="btn-primary w-full py-3 text-lg shadow-glow"
          >
            Go to Dashboard
          </Link>

          {/* Auto redirect notice */}
          <p className="text-text-muted text-sm mt-4">
            Redirecting automatically in {countdown}s...
          </p>
        </div>

        {/* Trust signal */}
        <p className="text-center text-text-muted text-xs mt-6">
          Watch-only access &bull; Your keys never leave your device
        </p>
      </div>
    </main>
  );
}
