"use client";

import { ReactNode } from "react";
import { SWRConfig } from "swr";
import { ErrorBoundary } from "./error-boundary";

interface ProvidersProps {
  children: ReactNode;
}

export function Providers({ children }: ProvidersProps) {
  return (
    <ErrorBoundary>
      <SWRConfig
        value={{
          // Global error handler
          onError: (error, key) => {
            if (process.env.NODE_ENV === "development") {
              console.error(`SWR Error for ${key}:`, error);
            }
          },
          // Retry configuration
          errorRetryCount: 3,
          errorRetryInterval: 5000,
          // Focus revalidation
          revalidateOnFocus: false,
          // Reconnect revalidation
          revalidateOnReconnect: true,
          // Dedupe interval
          dedupingInterval: 5000,
          // Loading timeout
          loadingTimeout: 10000,
        }}
      >
        {children}
      </SWRConfig>
    </ErrorBoundary>
  );
}
