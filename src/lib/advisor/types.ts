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

// Phase 10: White-Label Reports
export interface AdvisorProfile {
  id: string;
  firm_name: string | null;
  logo_path: string | null;
  primary_color: string;
  secondary_color: string;
  accent_color: string | null;
  contact_email: string | null;
  contact_phone: string | null;
  address_line_1: string | null;
  address_line_2: string | null;
  city: string | null;
  state: string | null;
  postal_code: string | null;
  country: string;
  footer_text: string | null;
  website_url: string | null;
  created_at: string;
  updated_at: string;
}

export interface UpdateBrandingRequest {
  firm_name?: string;
  primary_color?: string;
  secondary_color?: string;
  accent_color?: string;
  contact_email?: string;
  contact_phone?: string;
  address_line_1?: string;
  address_line_2?: string;
  city?: string;
  state?: string;
  postal_code?: string;
  country?: string;
  footer_text?: string;
  website_url?: string;
}
