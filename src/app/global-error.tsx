"use client";

import { useEffect } from "react";

interface GlobalErrorProps {
  error: Error & { digest?: string };
  reset: () => void;
}

export default function GlobalError({ error, reset }: GlobalErrorProps) {
  useEffect(() => {
    console.error("Global error:", error);
  }, [error]);

  return (
    <html lang="en" className="dark">
      <body className="font-sans antialiased bg-gray-950 text-white">
        <div className="min-h-screen flex items-center justify-center">
          <div className="bg-gray-900 border border-gray-800 rounded-xl p-8 max-w-md text-center">
            <div className="text-4xl mb-4">&#9888;</div>
            <h1 className="text-2xl font-bold mb-2">Critical Error</h1>
            <p className="text-gray-400 mb-6">
              A critical error has occurred. Please try refreshing the page.
            </p>
            <div className="flex gap-3 justify-center">
              <button
                onClick={reset}
                className="px-4 py-2 bg-primary text-black font-medium rounded-lg hover:bg-primary/90"
              >
                Try Again
              </button>
              <button
                onClick={() => (window.location.href = "/")}
                className="px-4 py-2 border border-gray-700 rounded-lg hover:bg-gray-800"
              >
                Go Home
              </button>
            </div>
          </div>
        </div>
      </body>
    </html>
  );
}
