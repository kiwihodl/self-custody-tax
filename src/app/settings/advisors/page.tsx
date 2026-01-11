'use client';

import { useEffect, useState, useCallback } from 'react';
import { createClient } from '@/lib/supabase/client';
import { Nav } from '@/components/nav';

interface ConnectedAdvisor {
  id: string;
  advisorEmail: string;
  advisorName: string | null;
  permissionLevel: 'view' | 'manage';
  status: string;
  connectedAt: string;
}

export default function ConnectedAdvisorsPage() {
  const [advisors, setAdvisors] = useState<ConnectedAdvisor[]>([]);
  const [loading, setLoading] = useState(true);
  const [revoking, setRevoking] = useState<string | null>(null);

  const loadAdvisors = useCallback(async () => {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) return;

    // Get all advisor connections for this client
    const { data, error } = await supabase
      .from('advisor_clients')
      .select(`
        id,
        permission_level,
        status,
        created_at,
        advisor_id,
        user_profiles!advisor_clients_advisor_id_fkey (
          email,
          full_name
        )
      `)
      .eq('client_id', user.id)
      .eq('status', 'active');

    if (error) {
      console.error('Failed to load advisors:', error);
      setLoading(false);
      return;
    }

    const mapped = (data || []).map((row) => {
      const profile = row.user_profiles as unknown as { email: string; full_name: string | null } | null;
      return {
        id: row.id,
        advisorEmail: profile?.email || 'Unknown',
        advisorName: profile?.full_name || null,
        permissionLevel: row.permission_level as 'view' | 'manage',
        status: row.status,
        connectedAt: row.created_at,
      };
    });

    setAdvisors(mapped);
    setLoading(false);
  }, []);

  useEffect(() => {
    loadAdvisors();
  }, [loadAdvisors]);

  const handleRevoke = async (id: string) => {
    if (!confirm('Are you sure you want to disconnect from this advisor? They will no longer be able to view your data.')) {
      return;
    }

    setRevoking(id);

    try {
      const supabase = createClient();
      const { error } = await supabase
        .from('advisor_clients')
        .update({
          status: 'revoked',
          updated_at: new Date().toISOString(),
        })
        .eq('id', id);

      if (error) throw error;

      // Remove from local state
      setAdvisors(prev => prev.filter(a => a.id !== id));
    } catch (error) {
      console.error('Failed to revoke access:', error);
      alert('Failed to disconnect advisor. Please try again.');
    } finally {
      setRevoking(null);
    }
  };

  return (
    <div className="min-h-screen bg-bg-primary">
      <Nav />

      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-text-primary mb-2">Connected Advisors</h1>
          <p className="text-text-secondary">
            Manage the tax professionals and advisors who have access to view your portfolio.
          </p>
        </div>

        {/* Info Box */}
        <div className="bg-primary/5 border border-primary/20 rounded-lg p-4 mb-8">
          <div className="flex items-start gap-3">
            <svg
              className="w-5 h-5 text-primary mt-0.5 flex-shrink-0"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
            <div>
              <h3 className="text-sm font-medium text-text-primary mb-1">About Advisor Access</h3>
              <p className="text-sm text-text-secondary">
                When you connect with an advisor, they can view your wallet balances, transactions,
                and tax reports. They cannot access your private keys or move any funds.
                You can revoke their access at any time.
              </p>
            </div>
          </div>
        </div>

        {/* Loading State */}
        {loading && (
          <div className="bg-bg-surface border border-border rounded-xl p-8 flex items-center justify-center">
            <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
          </div>
        )}

        {/* Empty State */}
        {!loading && advisors.length === 0 && (
          <div className="bg-bg-surface border border-border rounded-xl p-8 text-center">
            <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-bg-hover flex items-center justify-center">
              <svg
                className="w-8 h-8 text-text-tertiary"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={1.5}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z"
                />
              </svg>
            </div>
            <h3 className="text-lg font-medium text-text-primary mb-2">No Connected Advisors</h3>
            <p className="text-text-secondary max-w-sm mx-auto">
              When a tax professional or advisor sends you an invitation link, you can accept it
              to give them view access to your portfolio.
            </p>
          </div>
        )}

        {/* Advisors List */}
        {!loading && advisors.length > 0 && (
          <div className="bg-bg-surface border border-border rounded-xl overflow-hidden">
            <table className="w-full">
              <thead className="bg-bg-hover border-b border-border">
                <tr>
                  <th className="text-left px-6 py-3 text-xs font-medium text-text-tertiary uppercase tracking-wider">
                    Advisor
                  </th>
                  <th className="text-left px-6 py-3 text-xs font-medium text-text-tertiary uppercase tracking-wider">
                    Permission
                  </th>
                  <th className="text-left px-6 py-3 text-xs font-medium text-text-tertiary uppercase tracking-wider">
                    Connected
                  </th>
                  <th className="text-right px-6 py-3 text-xs font-medium text-text-tertiary uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {advisors.map((advisor) => (
                  <tr key={advisor.id} className="hover:bg-bg-hover/50 transition-colors">
                    <td className="px-6 py-4">
                      <div>
                        <div className="text-sm font-medium text-text-primary">
                          {advisor.advisorName || 'Unknown'}
                        </div>
                        <div className="text-sm text-text-secondary">
                          {advisor.advisorEmail}
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span
                        className={`
                          inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium
                          ${advisor.permissionLevel === 'manage'
                            ? 'bg-warning/10 text-warning'
                            : 'bg-text-tertiary/10 text-text-secondary'
                          }
                        `}
                      >
                        {advisor.permissionLevel === 'manage' ? 'Full Access' : 'View Only'}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-sm text-text-secondary">
                      {new Date(advisor.connectedAt).toLocaleDateString()}
                    </td>
                    <td className="px-6 py-4 text-right">
                      <button
                        onClick={() => handleRevoke(advisor.id)}
                        disabled={revoking === advisor.id}
                        className="
                          inline-flex items-center px-3 py-1.5 rounded-lg
                          text-sm font-medium text-error
                          hover:bg-error/10 transition-colors
                          disabled:opacity-50 disabled:cursor-not-allowed
                        "
                      >
                        {revoking === advisor.id ? (
                          <>
                            <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin mr-2" />
                            Disconnecting...
                          </>
                        ) : (
                          'Disconnect'
                        )}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Audit Log Notice */}
        {!loading && advisors.length > 0 && (
          <p className="text-sm text-text-tertiary mt-4 text-center">
            All advisor access is logged for your records.
          </p>
        )}
      </main>
    </div>
  );
}
