// Advisor client management
// CRUD operations for advisor-client relationships

import { createClient } from '@/lib/supabase/server';
import { randomBytes } from 'crypto';
import type {
  AdvisorClientWithProfile,
  InviteClientParams,
  ClientSummary,
  PermissionLevel,
} from './types';
import { logAdvisorAction, AuditActions } from './audit';
import { sendAdvisorInvitationEmail, sendInvitationAcceptedEmail } from '@/lib/email';

/**
 * Generate a secure invitation token
 */
function generateInvitationToken(): string {
  return randomBytes(32).toString('hex');
}

/**
 * Get all clients for an advisor
 */
export async function getAdvisorClients(
  advisorId: string,
  options?: {
    status?: 'all' | 'active' | 'pending';
    search?: string;
  }
): Promise<AdvisorClientWithProfile[]> {
  const supabase = await createClient();

  let query = supabase
    .from('advisor_clients')
    .select(`
      *,
      client_profile:user_profiles!client_id(
        id,
        email,
        full_name
      )
    `)
    .eq('advisor_id', advisorId)
    .order('created_at', { ascending: false });

  if (options?.status === 'active') {
    query = query.eq('status', 'active');
  } else if (options?.status === 'pending') {
    query = query.eq('status', 'pending');
  } else {
    query = query.in('status', ['active', 'pending']);
  }

  if (options?.search) {
    query = query.ilike('client_email', `%${options.search}%`);
  }

  const { data, error } = await query;

  if (error) {
    console.error('Failed to fetch advisor clients:', error);
    return [];
  }

  // Fetch wallet stats for active clients
  const activeClientIds = (data || [])
    .filter(c => c.status === 'active' && c.client_id)
    .map(c => c.client_id);

  const walletStats: Record<string, { count: number; balance: number; lastSync: string | null }> = {};

  if (activeClientIds.length > 0) {
    const { data: wallets } = await supabase
      .from('wallets')
      .select('user_id, balance, last_synced_at')
      .in('user_id', activeClientIds);

    if (wallets) {
      wallets.forEach(w => {
        if (!walletStats[w.user_id]) {
          walletStats[w.user_id] = { count: 0, balance: 0, lastSync: null };
        }
        walletStats[w.user_id].count += 1;
        walletStats[w.user_id].balance += parseFloat(w.balance || '0');
        if (w.last_synced_at && (!walletStats[w.user_id].lastSync || w.last_synced_at > walletStats[w.user_id].lastSync!)) {
          walletStats[w.user_id].lastSync = w.last_synced_at;
        }
      });
    }
  }

  return (data || []).map(client => {
    const stats = client.client_id ? walletStats[client.client_id] : null;
    const lastSync = stats?.lastSync ? new Date(stats.lastSync) : null;
    const staleThreshold = new Date();
    staleThreshold.setDate(staleThreshold.getDate() - 14);

    return {
      ...client,
      client_profile: client.client_profile as AdvisorClientWithProfile['client_profile'],
      wallet_count: stats?.count || 0,
      total_balance_btc: stats?.balance || 0,
      total_balance_usd: (stats?.balance || 0) * 95000, // TODO: Get real price
      last_synced_at: stats?.lastSync || null,
      needs_attention: lastSync ? lastSync < staleThreshold : false,
    };
  });
}

/**
 * Get client summary stats for dashboard header
 */
export async function getClientSummary(advisorId: string): Promise<ClientSummary> {
  const clients = await getAdvisorClients(advisorId, { status: 'all' });

  const activeClients = clients.filter(c => c.status === 'active');
  const pendingClients = clients.filter(c => c.status === 'pending');

  const totalBtc = activeClients.reduce((sum, c) => sum + (c.total_balance_btc || 0), 0);
  const needsAttention = activeClients.filter(c => c.needs_attention).length;

  return {
    total_clients: clients.length,
    active_clients: activeClients.length,
    pending_invitations: pendingClients.length,
    total_btc: totalBtc,
    total_usd: totalBtc * 95000, // TODO: Get real price
    clients_needing_attention: needsAttention,
  };
}

/**
 * Invite a new client
 */
export async function inviteClient(
  advisorId: string,
  params: InviteClientParams,
  requestInfo?: { ipAddress?: string; userAgent?: string }
): Promise<{ success: true; token: string } | { success: false; error: string }> {
  const supabase = await createClient();

  // Check if advisor is on Advisor tier
  const { data: advisor } = await supabase
    .from('user_profiles')
    .select('subscription_tier, email, full_name')
    .eq('id', advisorId)
    .single();

  if (!advisor || advisor.subscription_tier !== 'advisor') {
    return { success: false, error: 'Multi-client features require Advisor tier subscription' };
  }

  // Check for existing invitation or link
  const { data: existing } = await supabase
    .from('advisor_clients')
    .select('id, status')
    .eq('advisor_id', advisorId)
    .eq('client_email', params.email.toLowerCase())
    .single();

  if (existing) {
    if (existing.status === 'active') {
      return { success: false, error: 'This client is already connected to your account' };
    }
    if (existing.status === 'pending') {
      return { success: false, error: 'An invitation is already pending for this email' };
    }
    // If revoked or expired, we can delete and re-invite
    await supabase.from('advisor_clients').delete().eq('id', existing.id);
  }

  // Generate invitation token
  const token = generateInvitationToken();
  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + 7); // 7-day expiration

  // Create invitation record
  const { error } = await supabase.from('advisor_clients').insert({
    advisor_id: advisorId,
    client_email: params.email.toLowerCase(),
    permission_level: params.permission_level,
    status: 'pending',
    invitation_token: token,
    invitation_expires_at: expiresAt.toISOString(),
    invitation_note: params.note || null,
  });

  if (error) {
    console.error('Failed to create invitation:', error);
    return { success: false, error: 'Failed to create invitation' };
  }

  // Log the action
  logAdvisorAction({
    advisorId,
    action: AuditActions.SENT_INVITATION,
    category: 'invitation',
    details: {
      client_email: params.email,
      permission_level: params.permission_level,
    },
    ...requestInfo,
  });

  // Send invitation email
  const emailResult = await sendAdvisorInvitationEmail({
    to: params.email,
    advisorName: advisor.full_name || '',
    advisorEmail: advisor.email,
    invitationToken: token,
    permissionLevel: params.permission_level,
    note: params.note,
  });

  if (!emailResult.success) {
    console.error('Failed to send invitation email:', emailResult.error);
    // Don't fail the invitation - the record is created, user can resend
  }

  return { success: true, token };
}

/**
 * Accept an invitation (called by client)
 */
export async function acceptInvitation(
  token: string,
  clientId: string
): Promise<{ success: true } | { success: false; error: string }> {
  const supabase = await createClient();

  // Find the invitation
  const { data: invitation } = await supabase
    .from('advisor_clients')
    .select('*')
    .eq('invitation_token', token)
    .eq('status', 'pending')
    .single();

  if (!invitation) {
    return { success: false, error: 'Invalid or expired invitation' };
  }

  // Check expiration
  if (new Date(invitation.invitation_expires_at) < new Date()) {
    await supabase
      .from('advisor_clients')
      .update({ status: 'expired' })
      .eq('id', invitation.id);
    return { success: false, error: 'This invitation has expired' };
  }

  // Get client's email to verify
  const { data: client } = await supabase
    .from('user_profiles')
    .select('email')
    .eq('id', clientId)
    .single();

  if (!client) {
    return { success: false, error: 'Client account not found' };
  }

  // Verify email matches (case-insensitive)
  if (client.email.toLowerCase() !== invitation.client_email.toLowerCase()) {
    return { success: false, error: 'This invitation was sent to a different email address' };
  }

  // Accept the invitation
  const { error } = await supabase
    .from('advisor_clients')
    .update({
      client_id: clientId,
      status: 'active',
      accepted_at: new Date().toISOString(),
      invitation_token: null, // Clear token after use
    })
    .eq('id', invitation.id);

  if (error) {
    console.error('Failed to accept invitation:', error);
    return { success: false, error: 'Failed to accept invitation' };
  }

  // Log the action
  logAdvisorAction({
    advisorId: invitation.advisor_id,
    clientId,
    action: AuditActions.CLIENT_ACCEPTED,
    category: 'invitation',
    details: { client_email: invitation.client_email },
  });

  // Notify the advisor that client accepted
  const { data: advisor } = await supabase
    .from('user_profiles')
    .select('email')
    .eq('id', invitation.advisor_id)
    .single();

  if (advisor) {
    const { data: clientProfile } = await supabase
      .from('user_profiles')
      .select('email, full_name')
      .eq('id', clientId)
      .single();

    const emailResult = await sendInvitationAcceptedEmail({
      to: advisor.email,
      clientName: clientProfile?.full_name || '',
      clientEmail: clientProfile?.email || invitation.client_email,
    });

    if (!emailResult.success) {
      console.error('Failed to send acceptance notification:', emailResult.error);
      // Don't fail the acceptance - the link is already active
    }
  }

  return { success: true };
}

/**
 * Revoke client access (by advisor or client)
 */
export async function revokeAccess(
  linkId: string,
  revokedBy: 'advisor' | 'client',
  userId: string,
  requestInfo?: { ipAddress?: string; userAgent?: string }
): Promise<{ success: boolean; error?: string }> {
  const supabase = await createClient();

  // Get the link
  const { data: link } = await supabase
    .from('advisor_clients')
    .select('*')
    .eq('id', linkId)
    .single();

  if (!link) {
    return { success: false, error: 'Link not found' };
  }

  // Verify the user has permission to revoke
  if (revokedBy === 'advisor' && link.advisor_id !== userId) {
    return { success: false, error: 'Not authorized' };
  }
  if (revokedBy === 'client' && link.client_id !== userId) {
    return { success: false, error: 'Not authorized' };
  }

  // Revoke the link
  const { error } = await supabase
    .from('advisor_clients')
    .update({
      status: 'revoked',
      revoked_at: new Date().toISOString(),
      revoked_by: revokedBy,
    })
    .eq('id', linkId);

  if (error) {
    return { success: false, error: error.message };
  }

  // Log the action
  logAdvisorAction({
    advisorId: link.advisor_id,
    clientId: link.client_id,
    action: revokedBy === 'advisor' ? AuditActions.REMOVED_CLIENT : 'Client revoked access',
    category: 'access',
    details: { revoked_by: revokedBy },
    ...requestInfo,
  });

  return { success: true };
}

/**
 * Update client permission level
 */
export async function updatePermission(
  advisorId: string,
  linkId: string,
  newPermission: PermissionLevel,
  requestInfo?: { ipAddress?: string; userAgent?: string }
): Promise<{ success: boolean; error?: string }> {
  const supabase = await createClient();

  const { data: link } = await supabase
    .from('advisor_clients')
    .select('*')
    .eq('id', linkId)
    .eq('advisor_id', advisorId)
    .single();

  if (!link) {
    return { success: false, error: 'Link not found' };
  }

  const { error } = await supabase
    .from('advisor_clients')
    .update({ permission_level: newPermission })
    .eq('id', linkId);

  if (error) {
    return { success: false, error: error.message };
  }

  logAdvisorAction({
    advisorId,
    clientId: link.client_id,
    action: AuditActions.UPDATED_PERMISSION,
    category: 'access',
    details: {
      old_permission: link.permission_level,
      new_permission: newPermission,
    },
    ...requestInfo,
  });

  return { success: true };
}

/**
 * Update advisor notes for a client
 */
export async function updateClientNotes(
  advisorId: string,
  linkId: string,
  notes: string,
  requestInfo?: { ipAddress?: string; userAgent?: string }
): Promise<{ success: boolean; error?: string }> {
  const supabase = await createClient();

  const { data: link } = await supabase
    .from('advisor_clients')
    .select('client_id')
    .eq('id', linkId)
    .eq('advisor_id', advisorId)
    .single();

  if (!link) {
    return { success: false, error: 'Link not found' };
  }

  const { error } = await supabase
    .from('advisor_clients')
    .update({ advisor_notes: notes })
    .eq('id', linkId);

  if (error) {
    return { success: false, error: error.message };
  }

  logAdvisorAction({
    advisorId,
    clientId: link.client_id,
    action: AuditActions.ADDED_NOTE,
    category: 'edit',
    details: { notes_length: notes.length },
    ...requestInfo,
  });

  return { success: true };
}

/**
 * Get a specific client link
 */
export async function getClientLink(
  advisorId: string,
  linkId: string
): Promise<AdvisorClientWithProfile | null> {
  const clients = await getAdvisorClients(advisorId);
  return clients.find(c => c.id === linkId) || null;
}

/**
 * Check if advisor has access to a client
 */
export async function hasClientAccess(
  advisorId: string,
  clientId: string
): Promise<{ hasAccess: boolean; permission?: PermissionLevel }> {
  const supabase = await createClient();

  const { data } = await supabase
    .from('advisor_clients')
    .select('permission_level')
    .eq('advisor_id', advisorId)
    .eq('client_id', clientId)
    .eq('status', 'active')
    .single();

  if (!data) {
    return { hasAccess: false };
  }

  return {
    hasAccess: true,
    permission: data.permission_level as PermissionLevel,
  };
}
