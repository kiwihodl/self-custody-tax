"use client";

import { Component, ReactNode } from "react";

interface ErrorBoundaryProps {
  children: ReactNode;
  fallback?: ReactNode;
  onError?: (error: Error, errorInfo: React.ErrorInfo) => void;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error("Error caught by boundary:", error, errorInfo);
    this.props.onError?.(error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <div className="min-h-[400px] flex items-center justify-center">
          <div className="card max-w-md text-center">
            <div className="text-4xl mb-4">&#9888;</div>
            <h2 className="text-xl font-semibold mb-2">Something went wrong</h2>
            <p className="text-gray-400 mb-4">
              An unexpected error occurred. Please try refreshing the page.
            </p>
            <button
              onClick={() => this.setState({ hasError: false, error: null })}
              className="btn-primary"
            >
              Try Again
            </button>
            {process.env.NODE_ENV === "development" && this.state.error && (
              <details className="mt-4 text-left">
                <summary className="cursor-pointer text-sm text-gray-500">
                  Error Details
                </summary>
                <pre className="mt-2 p-3 bg-gray-900 rounded text-xs text-red-400 overflow-auto">
                  {this.state.error.message}
                  {"\n\n"}
                  {this.state.error.stack}
                </pre>
              </details>
            )}
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

interface PageErrorFallbackProps {
  title?: string;
  message?: string;
  onRetry?: () => void;
}

export function PageErrorFallback({
  title = "Failed to load page",
  message = "There was a problem loading this page. Please try again.",
  onRetry,
}: PageErrorFallbackProps) {
  return (
    <div className="min-h-[400px] flex items-center justify-center">
      <div className="card max-w-md text-center">
        <div className="text-4xl mb-4">&#9888;</div>
        <h2 className="text-xl font-semibold mb-2">{title}</h2>
        <p className="text-gray-400 mb-4">{message}</p>
        <div className="flex gap-3 justify-center">
          {onRetry && (
            <button onClick={onRetry} className="btn-primary">
              Retry
            </button>
          )}
          <button
            onClick={() => window.location.reload()}
            className="btn-secondary"
          >
            Refresh Page
          </button>
        </div>
      </div>
    </div>
  );
}

interface ApiErrorFallbackProps {
  error?: string;
  onRetry?: () => void;
}

export function ApiErrorFallback({ error, onRetry }: ApiErrorFallbackProps) {
  return (
    <div className="card border-red-500/30 bg-red-500/5">
      <div className="flex items-start gap-3">
        <span className="text-red-400 text-xl">&#9888;</span>
        <div className="flex-1">
          <p className="font-medium text-red-400">Failed to load data</p>
          {error && (
            <p className="text-sm text-gray-400 mt-1">{error}</p>
          )}
        </div>
        {onRetry && (
          <button onClick={onRetry} className="btn-secondary text-sm">
            Retry
          </button>
        )}
      </div>
    </div>
  );
}
