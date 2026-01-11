// Advisor module types

export type PermissionLevel = 'view' | 'manage';
export type ClientStatus = 'pending' | 'active' | 'revoked' | 'expired';
export type AuditCategory = 'view' | 'edit' | 'report' | 'sync' | 'access' | 'invitation';

export interface AdvisorClient {
  id: string;
  advisor_id: string;
  client_id: string | null;
  client_email: string;
  permission_level: PermissionLevel;
  status: ClientStatus;
  invitation_token: string | null;
  invitation_expires_at: string | null;
  invitation_note: string | null;
  advisor_notes: string | null;
  invited_at: string;
  accepted_at: string | null;
  revoked_at: string | null;
  revoked_by: 'advisor' | 'client' | null;
  created_at: string;
  updated_at: string;
}

export interface AdvisorClientWithProfile extends AdvisorClient {
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

export interface AuditLogEntry {
  id: string;
  advisor_id: string;
  client_id: string | null;
  action: string;
  action_category: AuditCategory;
  details: Record<string, unknown> | null;
  ip_address: string | null;
  user_agent: string | null;
  created_at: string;
}

export interface InviteClientParams {
  email: string;
  permission_level: PermissionLevel;
  note?: string;
}

export interface ClientSummary {
  total_clients: number;
  active_clients: number;
  pending_invitations: number;
  total_btc: number;
  total_usd: number;
  clients_needing_attention: number;
}
