'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import Link from 'next/link';
import Image from 'next/image';

type InviteStatus = 'loading' | 'valid' | 'invalid' | 'expired' | 'already_accepted' | 'accepting' | 'accepted' | 'error';

interface InviteDetails {
  advisorEmail: string;
  advisorName: string | null;
  permissionLevel: 'view' | 'manage';
  expiresAt: string;
}

export default function AcceptInvitePage() {
  const params = useParams();
  const router = useRouter();
  const token = params.token as string;

  const [status, setStatus] = useState<InviteStatus>('loading');
  const [error, setError] = useState<string | null>(null);
  const [inviteDetails, setInviteDetails] = useState<InviteDetails | null>(null);
  const [isLoggedIn, setIsLoggedIn] = useState(false);

  useEffect(() => {
    async function validateInvite() {
      const supabase = createClient();

      // Check if user is logged in
      const { data: { user } } = await supabase.auth.getUser();
      setIsLoggedIn(!!user);

      // Validate the invitation token
      try {
        const res = await fetch(`/api/advisor/invite/${token}`);
        const data = await res.json();

        if (!res.ok) {
          if (data.error?.includes('expired')) {
            setStatus('expired');
          } else if (data.error?.includes('already')) {
            setStatus('already_accepted');
          } else {
            setStatus('invalid');
          }
          setError(data.error);
          return;
        }

        setInviteDetails(data.data);
        setStatus('valid');
      } catch {
        setStatus('error');
        setError('Failed to validate invitation');
      }
    }

    validateInvite();
  }, [token]);

  const handleAccept = async () => {
    setStatus('accepting');

    try {
      const res = await fetch(`/api/advisor/invite/${token}/accept`, {
        method: 'POST',
      });

      if (!res.ok) {
        const data = await res.json();
        setError(data.error || 'Failed to accept invitation');
        setStatus('error');
        return;
      }

      setStatus('accepted');

      // Redirect to settings after a short delay
      setTimeout(() => {
        router.push('/settings/advisors');
      }, 2000);
    } catch {
      setError('Failed to accept invitation');
      setStatus('error');
    }
  };

  const handleLoginRedirect = () => {
    // Store the invite URL to redirect back after login
    sessionStorage.setItem('redirectAfterLogin', `/invite/${token}`);
    router.push('/auth/login');
  };

  const handleSignupRedirect = () => {
    // Store the invite URL to redirect back after signup
    sessionStorage.setItem('redirectAfterLogin', `/invite/${token}`);
    router.push('/auth/signup');
  };

  return (
    <div className="min-h-screen bg-bg-primary flex flex-col items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="flex justify-center mb-8">
          <Link href="/" className="flex items-center gap-2">
            <Image
              src="/logo-icon.png"
              alt="Self Custody Tax"
              width={48}
              height={48}
              className="w-12 h-12"
            />
            <span className="text-xl font-semibold text-text-primary">
              Self Custody Tax
            </span>
          </Link>
        </div>

        {/* Card */}
        <div className="bg-bg-surface border border-border rounded-xl p-6 shadow-lg">
          {/* Loading State */}
          {status === 'loading' && (
            <div className="flex flex-col items-center py-8">
              <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin mb-4" />
              <p className="text-text-secondary">Validating invitation...</p>
            </div>
          )}

          {/* Invalid Token */}
          {status === 'invalid' && (
            <div className="text-center py-8">
              <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-error/10 flex items-center justify-center">
                <svg className="w-8 h-8 text-error" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </div>
              <h1 className="text-xl font-semibold text-text-primary mb-2">Invalid Invitation</h1>
              <p className="text-text-secondary mb-6">
                This invitation link is not valid. Please ask your advisor to send a new invitation.
              </p>
              <Link
                href="/"
                className="inline-flex items-center justify-center px-4 py-2 rounded-lg bg-primary text-white font-medium hover:bg-primary/90 transition-colors"
              >
                Go to Homepage
              </Link>
            </div>
          )}

          {/* Expired Token */}
          {status === 'expired' && (
            <div className="text-center py-8">
              <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-warning/10 flex items-center justify-center">
                <svg className="w-8 h-8 text-warning" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <h1 className="text-xl font-semibold text-text-primary mb-2">Invitation Expired</h1>
              <p className="text-text-secondary mb-6">
                This invitation has expired. Please ask your advisor to send a new invitation.
              </p>
              <Link
                href="/"
                className="inline-flex items-center justify-center px-4 py-2 rounded-lg bg-primary text-white font-medium hover:bg-primary/90 transition-colors"
              >
                Go to Homepage
              </Link>
            </div>
          )}

          {/* Already Accepted */}
          {status === 'already_accepted' && (
            <div className="text-center py-8">
              <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-success/10 flex items-center justify-center">
                <svg className="w-8 h-8 text-success" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <h1 className="text-xl font-semibold text-text-primary mb-2">Already Connected</h1>
              <p className="text-text-secondary mb-6">
                You are already connected to this advisor.
              </p>
              <Link
                href="/settings/advisors"
                className="inline-flex items-center justify-center px-4 py-2 rounded-lg bg-primary text-white font-medium hover:bg-primary/90 transition-colors"
              >
                View Connected Advisors
              </Link>
            </div>
          )}

          {/* Valid - Show invite details */}
          {status === 'valid' && inviteDetails && (
            <div className="py-4">
              <div className="text-center mb-6">
                <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-primary/10 flex items-center justify-center">
                  <svg className="w-8 h-8 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                  </svg>
                </div>
                <h1 className="text-xl font-semibold text-text-primary mb-2">Advisor Invitation</h1>
                <p className="text-text-secondary">
                  {inviteDetails.advisorName || inviteDetails.advisorEmail} has invited you to connect as a client.
                </p>
              </div>

              {/* Permissions info */}
              <div className="bg-bg-hover rounded-lg p-4 mb-6">
                <h2 className="text-sm font-medium text-text-primary mb-3">What they can access:</h2>
                <ul className="space-y-2">
                  <li className="flex items-start gap-2 text-sm text-text-secondary">
                    <svg className="w-4 h-4 text-success mt-0.5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                    </svg>
                    View your wallet balances and transactions
                  </li>
                  <li className="flex items-start gap-2 text-sm text-text-secondary">
                    <svg className="w-4 h-4 text-success mt-0.5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                    </svg>
                    View your tax reports and gains/losses
                  </li>
                  {inviteDetails.permissionLevel === 'manage' && (
                    <li className="flex items-start gap-2 text-sm text-text-secondary">
                      <svg className="w-4 h-4 text-success mt-0.5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                      </svg>
                      Add, edit, or sync wallets on your behalf
                    </li>
                  )}
                  <li className="flex items-start gap-2 text-sm text-text-secondary">
                    <svg className="w-4 h-4 text-error mt-0.5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                    </svg>
                    They cannot access your private keys or move funds
                  </li>
                </ul>
              </div>

              {/* Expiry note */}
              <p className="text-xs text-text-tertiary text-center mb-6">
                This invitation expires on {new Date(inviteDetails.expiresAt).toLocaleDateString()}
              </p>

              {/* Actions */}
              {isLoggedIn ? (
                <button
                  onClick={handleAccept}
                  className="w-full py-3 rounded-lg bg-primary text-white font-medium hover:bg-primary/90 transition-colors"
                >
                  Accept Invitation
                </button>
              ) : (
                <div className="space-y-3">
                  <button
                    onClick={handleLoginRedirect}
                    className="w-full py-3 rounded-lg bg-primary text-white font-medium hover:bg-primary/90 transition-colors"
                  >
                    Log In to Accept
                  </button>
                  <button
                    onClick={handleSignupRedirect}
                    className="w-full py-3 rounded-lg bg-bg-hover border border-border text-text-primary font-medium hover:bg-bg-elevated transition-colors"
                  >
                    Create Account
                  </button>
                </div>
              )}
            </div>
          )}

          {/* Accepting */}
          {status === 'accepting' && (
            <div className="flex flex-col items-center py-8">
              <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin mb-4" />
              <p className="text-text-secondary">Accepting invitation...</p>
            </div>
          )}

          {/* Accepted */}
          {status === 'accepted' && (
            <div className="text-center py-8">
              <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-success/10 flex items-center justify-center">
                <svg className="w-8 h-8 text-success" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <h1 className="text-xl font-semibold text-text-primary mb-2">Connected!</h1>
              <p className="text-text-secondary mb-6">
                You are now connected to your advisor. Redirecting...
              </p>
            </div>
          )}

          {/* Error */}
          {status === 'error' && (
            <div className="text-center py-8">
              <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-error/10 flex items-center justify-center">
                <svg className="w-8 h-8 text-error" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
              </div>
              <h1 className="text-xl font-semibold text-text-primary mb-2">Something went wrong</h1>
              <p className="text-text-secondary mb-6">{error}</p>
              <button
                onClick={() => window.location.reload()}
                className="inline-flex items-center justify-center px-4 py-2 rounded-lg bg-primary text-white font-medium hover:bg-primary/90 transition-colors"
              >
                Try Again
              </button>
            </div>
          )}
        </div>

        {/* Footer */}
        <p className="text-center text-text-tertiary text-sm mt-6">
          Having trouble?{' '}
          <Link href="/help" className="text-primary hover:underline">
            Contact Support
          </Link>
        </p>
      </div>
    </div>
  );
}
