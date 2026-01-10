"use client";

import { useEffect } from "react";

interface ErrorPageProps {
  error: Error & { digest?: string };
  reset: () => void;
}

export default function ErrorPage({ error, reset }: ErrorPageProps) {
  useEffect(() => {
    console.error("App error:", error);
  }, [error]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-950">
      <div className="card max-w-md text-center">
        <div className="text-4xl mb-4">&#9888;</div>
        <h1 className="text-2xl font-bold mb-2">Something went wrong</h1>
        <p className="text-gray-400 mb-6">
          An unexpected error occurred. We apologize for the inconvenience.
        </p>
        <div className="flex gap-3 justify-center">
          <button onClick={reset} className="btn-primary">
            Try Again
          </button>
          <button
            onClick={() => (window.location.href = "/dashboard")}
            className="btn-secondary"
          >
            Go to Dashboard
          </button>
        </div>
        {process.env.NODE_ENV === "development" && (
          <details className="mt-6 text-left">
            <summary className="cursor-pointer text-sm text-gray-500">
              Error Details (dev only)
            </summary>
            <pre className="mt-2 p-3 bg-gray-900 rounded text-xs text-red-400 overflow-auto max-h-48">
              {error.message}
              {error.digest && `\n\nDigest: ${error.digest}`}
              {error.stack && `\n\n${error.stack}`}
            </pre>
          </details>
        )}
      </div>
    </div>
  );
}
