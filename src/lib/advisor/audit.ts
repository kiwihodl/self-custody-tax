// Advisor audit logging
// All advisor actions on client data are logged for 7-year IRS compliance

import { createClient } from '@/lib/supabase/server';
import type { AuditCategory } from './types';

interface AuditParams {
  advisorId: string;
  clientId?: string | null;
  action: string;
  category: AuditCategory;
  details?: Record<string, unknown>;
  ipAddress?: string;
  userAgent?: string;
}

/**
 * Log an advisor action for audit trail
 * Fire-and-forget - doesn't block on completion
 */
export async function logAdvisorAction(params: AuditParams): Promise<void> {
  const supabase = await createClient();

  supabase
    .from('advisor_audit_log')
    .insert({
      advisor_id: params.advisorId,
      client_id: params.clientId || null,
      action: params.action,
      action_category: params.category,
      details: params.details || null,
      ip_address: params.ipAddress || null,
      user_agent: params.userAgent || null,
    })
    .then(({ error }) => {
      if (error) {
        console.error('Failed to log advisor action:', error);
      }
    });
}

/**
 * Get audit log entries for an advisor
 */
export async function getAuditLog(
  advisorId: string,
  options?: {
    clientId?: string;
    category?: AuditCategory;
    limit?: number;
    offset?: number;
    startDate?: string;
    endDate?: string;
  }
): Promise<{ entries: Array<{
  id: string;
  action: string;
  action_category: AuditCategory;
  details: Record<string, unknown> | null;
  created_at: string;
  client_email?: string;
}>; total: number }> {
  const supabase = await createClient();

  let query = supabase
    .from('advisor_audit_log')
    .select(`
      id,
      action,
      action_category,
      details,
      created_at,
      advisor_clients!left(client_email)
    `, { count: 'exact' })
    .eq('advisor_id', advisorId)
    .order('created_at', { ascending: false });

  if (options?.clientId) {
    query = query.eq('client_id', options.clientId);
  }

  if (options?.category) {
    query = query.eq('action_category', options.category);
  }

  if (options?.startDate) {
    query = query.gte('created_at', options.startDate);
  }

  if (options?.endDate) {
    query = query.lte('created_at', options.endDate);
  }

  const limit = options?.limit || 50;
  const offset = options?.offset || 0;
  query = query.range(offset, offset + limit - 1);

  const { data, error, count } = await query;

  if (error) {
    console.error('Failed to fetch audit log:', error);
    return { entries: [], total: 0 };
  }

  return {
    entries: (data || []).map(entry => ({
      id: entry.id,
      action: entry.action,
      action_category: entry.action_category as AuditCategory,
      details: entry.details as Record<string, unknown> | null,
      created_at: entry.created_at,
      client_email: (entry.advisor_clients as { client_email?: string } | null)?.client_email,
    })),
    total: count || 0,
  };
}

// Common audit action helpers
export const AuditActions = {
  // Access actions
  ENTERED_CLIENT_VIEW: 'Entered client view mode',
  EXITED_CLIENT_VIEW: 'Exited client view mode',

  // Invitation actions
  SENT_INVITATION: 'Sent client invitation',
  RESENT_INVITATION: 'Resent client invitation',
  CANCELLED_INVITATION: 'Cancelled invitation',
  CLIENT_ACCEPTED: 'Client accepted invitation',
  CLIENT_DECLINED: 'Client declined invitation',

  // Client management
  REMOVED_CLIENT: 'Removed client',
  UPDATED_PERMISSION: 'Updated permission level',
  ADDED_NOTE: 'Added/updated client note',

  // Data actions
  VIEWED_DASHBOARD: 'Viewed client dashboard',
  VIEWED_WALLETS: 'Viewed client wallets',
  VIEWED_TRANSACTIONS: 'Viewed client transactions',
  VIEWED_TAX_LOTS: 'Viewed client tax lots',
  VIEWED_TAX_SUMMARY: 'Viewed client tax summary',

  // Edit actions (manage permission required)
  EDITED_TRANSACTION: 'Edited transaction',
  EDITED_TAX_LOT: 'Edited tax lot',
  TRIGGERED_SYNC: 'Triggered wallet sync',

  // Report actions
  GENERATED_REPORT: 'Generated tax report',
  DOWNLOADED_REPORT: 'Downloaded tax report',
  BULK_GENERATED_REPORTS: 'Bulk generated reports',
  DOWNLOADED_BULK_REPORTS: 'Downloaded bulk reports',
} as const;
