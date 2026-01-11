'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';

interface ClientSummary {
  total_clients: number;
  active_clients: number;
  pending_invitations: number;
  total_btc: number;
  total_usd: number;
  clients_needing_attention: number;
}

interface Client {
  id: string;
  client_id: string | null;
  client_email: string;
  permission_level: 'view' | 'manage';
  status: 'pending' | 'active' | 'revoked' | 'expired';
  advisor_notes: string | null;
  invited_at: string;
  accepted_at: string | null;
  client_profile?: {
    id: string;
    email: string;
    full_name: string | null;
  } | null;
  wallet_count?: number;
  total_balance_btc?: number;
  total_balance_usd?: number;
  last_synced_at?: string | null;
  needs_attention?: boolean;
}

export default function AdvisorDashboardPage() {
  const [clients, setClients] = useState<Client[]>([]);
  const [summary, setSummary] = useState<ClientSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [inviteEmail, setInviteEmail] = useState('');
  const [invitePermission, setInvitePermission] = useState<'view' | 'manage'>('view');
  const [inviteNote, setInviteNote] = useState('');
  const [inviting, setInviting] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'pending'>('all');
  const [selectedClients, setSelectedClients] = useState<Set<string>>(new Set());
  const [bulkSyncing, setBulkSyncing] = useState(false);
  const [bulkGenerating, setBulkGenerating] = useState(false);
  const [showReportModal, setShowReportModal] = useState(false);
  const [reportYear, setReportYear] = useState(new Date().getFullYear());
  const [reportMethod, setReportMethod] = useState<'FIFO' | 'LIFO' | 'HIFO'>('FIFO');
  const [bulkResult, setBulkResult] = useState<{ type: 'sync' | 'report'; message: string } | null>(null);

  const fetchClients = useCallback(async () => {
    try {
      const params = new URLSearchParams();
      if (statusFilter !== 'all') params.set('status', statusFilter);
      if (searchQuery) params.set('search', searchQuery);

      const response = await fetch(`/api/advisor/clients?${params}`);
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to fetch clients');
      }

      setClients(data.data.clients);
      setSummary(data.data.summary);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  }, [statusFilter, searchQuery]);

  useEffect(() => {
    fetchClients();
  }, [fetchClients]);

  const handleInvite = async () => {
    if (!inviteEmail.trim()) return;

    setInviting(true);
    try {
      const response = await fetch('/api/advisor/clients', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: inviteEmail.trim(),
          permission_level: invitePermission,
          note: inviteNote.trim() || undefined,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to send invitation');
      }

      setShowInviteModal(false);
      setInviteEmail('');
      setInviteNote('');
      setInvitePermission('view');
      fetchClients();
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to send invitation');
    } finally {
      setInviting(false);
    }
  };

  const handleRemoveClient = async (clientId: string) => {
    if (!confirm('Are you sure you want to remove this client?')) return;

    try {
      const response = await fetch(`/api/advisor/clients/${clientId}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to remove client');
      }

      fetchClients();
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to remove client');
    }
  };

  const handleViewClient = async (clientId: string) => {
    try {
      const response = await fetch('/api/advisor/context', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ clientId }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to enter client view');
      }

      window.location.href = '/dashboard';
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to view client');
    }
  };

  const toggleClientSelection = (id: string) => {
    const newSelected = new Set(selectedClients);
    if (newSelected.has(id)) {
      newSelected.delete(id);
    } else {
      newSelected.add(id);
    }
    setSelectedClients(newSelected);
  };

  const selectAllClients = () => {
    const activeClients = clients.filter(c => c.status === 'active');
    if (selectedClients.size === activeClients.length) {
      setSelectedClients(new Set());
    } else {
      setSelectedClients(new Set(activeClients.map(c => c.id)));
    }
  };

  const handleBulkSync = async () => {
    if (selectedClients.size === 0) return;

    setBulkSyncing(true);
    setBulkResult(null);

    try {
      const response = await fetch('/api/advisor/bulk/sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ clientIds: Array.from(selectedClients) }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Bulk sync failed');
      }

      const result = data.data;
      setBulkResult({
        type: 'sync',
        message: `Synced ${result.successfulClients}/${result.totalClients} clients. ${result.totalNewTransactions} new transactions found.`,
      });
      setSelectedClients(new Set());
      fetchClients();
    } catch (err) {
      setBulkResult({
        type: 'sync',
        message: err instanceof Error ? err.message : 'Bulk sync failed',
      });
    } finally {
      setBulkSyncing(false);
    }
  };

  const handleBulkReports = async () => {
    if (selectedClients.size === 0) return;

    setBulkGenerating(true);
    setBulkResult(null);

    try {
      const response = await fetch('/api/advisor/bulk/reports', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          clientIds: Array.from(selectedClients),
          year: reportYear,
          method: reportMethod,
          format: 'zip',
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Bulk report generation failed');
      }

      const result = data.data;

      // Download all CSV files
      if (result.files && result.files.length > 0) {
        for (const file of result.files) {
          const blob = new Blob([file.content], { type: 'text/csv' });
          const url = URL.createObjectURL(blob);
          const a = document.createElement('a');
          a.href = url;
          a.download = file.filename;
          document.body.appendChild(a);
          a.click();
          document.body.removeChild(a);
          URL.revokeObjectURL(url);
        }
      }

      setBulkResult({
        type: 'report',
        message: `Generated ${result.successfulReports}/${result.totalClients} reports for ${reportYear}.`,
      });
      setShowReportModal(false);
      setSelectedClients(new Set());
    } catch (err) {
      setBulkResult({
        type: 'report',
        message: err instanceof Error ? err.message : 'Bulk report generation failed',
      });
    } finally {
      setBulkGenerating(false);
    }
  };

  const formatBtc = (btc: number) => {
    return btc.toLocaleString('en-US', {
      minimumFractionDigits: 4,
      maximumFractionDigits: 8,
    });
  };

  const formatUsd = (usd: number) => {
    return usd.toLocaleString('en-US', {
      style: 'currency',
      currency: 'USD',
      maximumFractionDigits: 0,
    });
  };

  if (loading) {
    return (
      <main className="max-w-7xl mx-auto px-4 py-8">
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </div>
      </main>
    );
  }

  if (error) {
    return (
      <main className="max-w-7xl mx-auto px-4 py-8">
        <div className="card p-6 text-center">
          <p className="text-red-400">{error}</p>
          <button onClick={fetchClients} className="btn-primary mt-4">
            Try Again
          </button>
        </div>
      </main>
    );
  }

  return (
    <main className="max-w-7xl mx-auto px-4 py-8">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-text-primary">Advisor Dashboard</h1>
          <p className="text-text-secondary">Manage your clients and their portfolios</p>
        </div>
        <button
          onClick={() => setShowInviteModal(true)}
          className="btn-primary"
        >
          + Invite Client
        </button>
      </div>

      {/* Summary Cards */}
      {summary && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <div className="card p-4">
            <p className="text-text-secondary text-sm">Active Clients</p>
            <p className="text-2xl font-bold text-text-primary">{summary.active_clients}</p>
            {summary.pending_invitations > 0 && (
              <p className="text-xs text-yellow-400">{summary.pending_invitations} pending</p>
            )}
          </div>
          <div className="card p-4">
            <p className="text-text-secondary text-sm">Total AUM</p>
            <p className="text-2xl font-bold text-text-primary">{formatUsd(summary.total_usd)}</p>
            <p className="text-xs text-text-muted">{formatBtc(summary.total_btc)} BTC</p>
          </div>
          <div className="card p-4">
            <p className="text-text-secondary text-sm">Need Attention</p>
            <p className={`text-2xl font-bold ${summary.clients_needing_attention > 0 ? 'text-yellow-400' : 'text-green-400'}`}>
              {summary.clients_needing_attention}
            </p>
            <p className="text-xs text-text-muted">clients with stale data</p>
          </div>
          <div className="card p-4">
            <p className="text-text-secondary text-sm">Quick Actions</p>
            <div className="flex gap-2 mt-2">
              <Link href="/advisor/branding" className="text-xs text-primary hover:underline">
                Branding
              </Link>
              <Link href="/advisor/audit-log" className="text-xs text-primary hover:underline">
                Audit Log
              </Link>
            </div>
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="card p-4 mb-6">
        <div className="flex flex-wrap gap-4 items-center">
          <div className="flex-1 min-w-[200px]">
            <input
              type="text"
              placeholder="Search clients..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="input w-full"
            />
          </div>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as 'all' | 'active' | 'pending')}
            className="input"
          >
            <option value="all">All Status</option>
            <option value="active">Active</option>
            <option value="pending">Pending</option>
          </select>
          {selectedClients.size > 0 && (
            <div className="flex items-center gap-2">
              <span className="text-sm text-text-secondary">{selectedClients.size} selected</span>
              <button
                onClick={handleBulkSync}
                disabled={bulkSyncing}
                className="btn-secondary text-sm py-1 px-3 disabled:opacity-50"
              >
                {bulkSyncing ? 'Syncing...' : 'Bulk Sync'}
              </button>
              <button
                onClick={() => setShowReportModal(true)}
                disabled={bulkGenerating}
                className="btn-secondary text-sm py-1 px-3 disabled:opacity-50"
              >
                Generate Reports
              </button>
            </div>
          )}
          {bulkResult && (
            <div className={`text-sm px-3 py-1 rounded ${
              bulkResult.message.includes('failed') ? 'bg-red-500/20 text-red-400' : 'bg-green-500/20 text-green-400'
            }`}>
              {bulkResult.message}
            </div>
          )}
        </div>
      </div>

      {/* Client Table */}
      <div className="card overflow-hidden">
        {clients.length === 0 ? (
          <div className="p-12 text-center">
            <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-bg-elevated flex items-center justify-center">
              <svg className="w-8 h-8 text-text-muted" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
              </svg>
            </div>
            <h3 className="text-lg font-medium text-text-primary mb-2">No clients yet</h3>
            <p className="text-text-secondary mb-4">
              Invite your first client to start managing their Bitcoin portfolios.
            </p>
            <button
              onClick={() => setShowInviteModal(true)}
              className="btn-primary"
            >
              Invite Your First Client
            </button>
          </div>
        ) : (
          <table className="w-full">
            <thead className="bg-bg-elevated border-b border-border-subtle">
              <tr>
                <th className="px-4 py-3 text-left">
                  <input
                    type="checkbox"
                    checked={selectedClients.size === clients.filter(c => c.status === 'active').length && clients.some(c => c.status === 'active')}
                    onChange={selectAllClients}
                    className="rounded"
                  />
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-text-secondary uppercase">Client</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-text-secondary uppercase">Wallets</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-text-secondary uppercase">Balance</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-text-secondary uppercase">Status</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-text-secondary uppercase">Permission</th>
                <th className="px-4 py-3 text-right text-xs font-medium text-text-secondary uppercase">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border-subtle">
              {clients.map((client) => (
                <tr key={client.id} className="hover:bg-bg-elevated/50">
                  <td className="px-4 py-3">
                    {client.status === 'active' && (
                      <input
                        type="checkbox"
                        checked={selectedClients.has(client.id)}
                        onChange={() => toggleClientSelection(client.id)}
                        className="rounded"
                      />
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <div>
                      <p className="font-medium text-text-primary">
                        {client.client_profile?.full_name || client.client_email}
                      </p>
                      {client.client_profile?.full_name && (
                        <p className="text-xs text-text-muted">{client.client_email}</p>
                      )}
                    </div>
                  </td>
                  <td className="px-4 py-3 text-text-secondary">
                    {client.status === 'active' ? client.wallet_count || 0 : '-'}
                  </td>
                  <td className="px-4 py-3">
                    {client.status === 'active' ? (
                      <div>
                        <p className="text-text-primary">{formatBtc(client.total_balance_btc || 0)} BTC</p>
                        <p className="text-xs text-text-muted">{formatUsd(client.total_balance_usd || 0)}</p>
                      </div>
                    ) : (
                      <span className="text-text-muted">-</span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    {client.status === 'active' && !client.needs_attention && (
                      <span className="inline-flex items-center gap-1 text-green-400 text-sm">
                        <span className="w-2 h-2 rounded-full bg-green-400"></span>
                        Synced
                      </span>
                    )}
                    {client.status === 'active' && client.needs_attention && (
                      <span className="inline-flex items-center gap-1 text-yellow-400 text-sm">
                        <span className="w-2 h-2 rounded-full bg-yellow-400"></span>
                        Stale
                      </span>
                    )}
                    {client.status === 'pending' && (
                      <span className="inline-flex items-center gap-1 text-blue-400 text-sm">
                        <span className="w-2 h-2 rounded-full bg-blue-400"></span>
                        Pending
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <span className={`text-xs px-2 py-1 rounded ${
                      client.permission_level === 'manage'
                        ? 'bg-purple-500/20 text-purple-400'
                        : 'bg-gray-500/20 text-gray-400'
                    }`}>
                      {client.permission_level}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <div className="flex items-center justify-end gap-2">
                      {client.status === 'active' && (
                        <button
                          onClick={() => handleViewClient(client.client_id!)}
                          className="text-sm text-primary hover:underline"
                        >
                          View
                        </button>
                      )}
                      <button
                        onClick={() => handleRemoveClient(client.id)}
                        className="text-sm text-red-400 hover:underline"
                      >
                        Remove
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Invite Modal */}
      {showInviteModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="card max-w-md w-full mx-4 p-6">
            <h2 className="text-xl font-semibold text-text-primary mb-4">Invite Client</h2>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-text-secondary mb-1">
                  Client Email
                </label>
                <input
                  type="email"
                  value={inviteEmail}
                  onChange={(e) => setInviteEmail(e.target.value)}
                  placeholder="client@example.com"
                  className="input w-full"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-text-secondary mb-1">
                  Permission Level
                </label>
                <select
                  value={invitePermission}
                  onChange={(e) => setInvitePermission(e.target.value as 'view' | 'manage')}
                  className="input w-full"
                >
                  <option value="view">View Only - Can view but not edit client data</option>
                  <option value="manage">Manage - Can view and edit client data</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-text-secondary mb-1">
                  Note (optional)
                </label>
                <textarea
                  value={inviteNote}
                  onChange={(e) => setInviteNote(e.target.value)}
                  placeholder="Personal message to include in the invitation..."
                  className="input w-full h-20 resize-none"
                />
              </div>
            </div>
            <div className="flex justify-end gap-3 mt-6">
              <button
                onClick={() => setShowInviteModal(false)}
                className="btn-secondary"
              >
                Cancel
              </button>
              <button
                onClick={handleInvite}
                disabled={!inviteEmail.trim() || inviting}
                className="btn-primary"
              >
                {inviting ? 'Sending...' : 'Send Invitation'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Bulk Report Modal */}
      {showReportModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="card max-w-md w-full mx-4 p-6">
            <h2 className="text-xl font-semibold text-text-primary mb-4">
              Generate Tax Reports
            </h2>
            <p className="text-text-secondary text-sm mb-4">
              Generate IRS Form 8949 CSV reports for {selectedClients.size} selected client{selectedClients.size !== 1 ? 's' : ''}.
            </p>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-text-secondary mb-1">
                  Tax Year
                </label>
                <select
                  value={reportYear}
                  onChange={(e) => setReportYear(parseInt(e.target.value))}
                  className="input w-full"
                >
                  {[...Array(5)].map((_, i) => {
                    const year = new Date().getFullYear() - i;
                    return (
                      <option key={year} value={year}>
                        {year}
                      </option>
                    );
                  })}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-text-secondary mb-1">
                  Cost Basis Method
                </label>
                <select
                  value={reportMethod}
                  onChange={(e) => setReportMethod(e.target.value as 'FIFO' | 'LIFO' | 'HIFO')}
                  className="input w-full"
                >
                  <option value="FIFO">FIFO - First In, First Out</option>
                  <option value="LIFO">LIFO - Last In, First Out</option>
                  <option value="HIFO">HIFO - Highest In, First Out</option>
                </select>
                <p className="text-xs text-text-muted mt-1">
                  {reportMethod === 'FIFO' && 'Sells oldest coins first. Most commonly used method.'}
                  {reportMethod === 'LIFO' && 'Sells newest coins first. May result in more short-term gains.'}
                  {reportMethod === 'HIFO' && 'Sells highest cost basis first. Minimizes taxable gains.'}
                </p>
              </div>
            </div>
            <div className="flex justify-end gap-3 mt-6">
              <button
                onClick={() => setShowReportModal(false)}
                className="btn-secondary"
                disabled={bulkGenerating}
              >
                Cancel
              </button>
              <button
                onClick={handleBulkReports}
                disabled={bulkGenerating}
                className="btn-primary"
              >
                {bulkGenerating ? 'Generating...' : 'Generate Reports'}
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
