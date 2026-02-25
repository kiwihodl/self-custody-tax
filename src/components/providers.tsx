"use client";

import { ReactNode, useEffect } from "react";
import { ErrorBoundary } from "./error-boundary";

export function Providers({ children }: { children: ReactNode }) {
  useEffect(() => {
    if ("serviceWorker" in navigator) {
      navigator.serviceWorker.register("/sw.js").catch((err) => {
        console.warn("SW registration failed:", err);
      });
    }
  }, []);

  return <ErrorBoundary>{children}</ErrorBoundary>;
}
