'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

interface ClientContext {
  clientId: string;
  clientEmail: string;
  clientName: string | null;
  permissionLevel: 'view' | 'manage';
  enteredAt: string;
}

export function AdvisorContextBanner() {
  const router = useRouter();
  const [context, setContext] = useState<ClientContext | null>(null);
  const [exiting, setExiting] = useState(false);

  useEffect(() => {
    async function checkContext() {
      try {
        const res = await fetch('/api/advisor/context');
        if (res.ok) {
          const data = await res.json();
          if (data.data?.isViewingClient && data.data.context) {
            setContext(data.data.context);
          }
        }
      } catch {
        // Silently fail - user might not be advisor
      }
    }
    checkContext();
  }, []);

  const handleExit = async () => {
    setExiting(true);
    try {
      const res = await fetch('/api/advisor/context', { method: 'DELETE' });
      if (res.ok) {
        setContext(null);
        router.push('/advisor/dashboard');
        router.refresh();
      }
    } catch {
      setExiting(false);
    }
  };

  if (!context) {
    return null;
  }

  const displayName = context.clientName || context.clientEmail;
  const permissionBadge = context.permissionLevel === 'manage' ? 'Full Access' : 'View Only';

  return (
    <div className="sticky top-16 z-40 bg-warning/10 border-b border-warning/30">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between py-2">
          <div className="flex items-center gap-3">
            {/* Eye icon */}
            <svg
              className="w-5 h-5 text-warning"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
              />
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"
              />
            </svg>

            <span className="text-sm text-text-primary">
              Viewing as{' '}
              <span className="font-semibold">{displayName}</span>
            </span>

            <span
              className={`
                inline-flex items-center px-2 py-0.5 rounded text-xs font-medium
                ${context.permissionLevel === 'manage'
                  ? 'bg-success/20 text-success'
                  : 'bg-text-tertiary/20 text-text-secondary'
                }
              `}
            >
              {permissionBadge}
            </span>
          </div>

          <button
            onClick={handleExit}
            disabled={exiting}
            className="
              inline-flex items-center gap-2 px-3 py-1.5 rounded-lg
              text-sm font-medium
              bg-bg-surface border border-border
              text-text-secondary hover:text-text-primary hover:border-text-tertiary
              disabled:opacity-50 disabled:cursor-not-allowed
              transition-colors
            "
          >
            {exiting ? (
              <>
                <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
                Exiting...
              </>
            ) : (
              <>
                <svg
                  className="w-4 h-4"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={2}
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M6 18L18 6M6 6l12 12"
                  />
                </svg>
                Exit Client View
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
