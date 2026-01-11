/**
 * Advisor Types Tests
 * Tests for type structures and validation
 */

import type {
  AdvisorClient,
  AdvisorClientWithProfile,
  ClientSummary,
  PermissionLevel,
  ClientStatus,
  InviteClientParams,
  AuditLogEntry,
  AuditCategory,
} from '../types';

describe('Advisor Types', () => {
  describe('PermissionLevel', () => {
    it('should only allow view or manage values', () => {
      const validLevels: PermissionLevel[] = ['view', 'manage'];

      expect(validLevels).toContain('view');
      expect(validLevels).toContain('manage');
      expect(validLevels).toHaveLength(2);
    });
  });

  describe('ClientStatus', () => {
    it('should include all valid status values', () => {
      const validStatuses: ClientStatus[] = ['pending', 'active', 'revoked', 'expired'];

      expect(validStatuses).toContain('pending');
      expect(validStatuses).toContain('active');
      expect(validStatuses).toContain('revoked');
      expect(validStatuses).toContain('expired');
      expect(validStatuses).toHaveLength(4);
    });
  });

  describe('AuditCategory', () => {
    it('should include all valid categories', () => {
      const validCategories: AuditCategory[] = ['view', 'edit', 'report', 'sync', 'access', 'invitation'];

      expect(validCategories).toContain('view');
      expect(validCategories).toContain('edit');
      expect(validCategories).toContain('report');
      expect(validCategories).toContain('sync');
      expect(validCategories).toContain('access');
      expect(validCategories).toContain('invitation');
      expect(validCategories).toHaveLength(6);
    });
  });

  describe('AdvisorClient', () => {
    it('should create a valid pending client', () => {
      const pendingClient: AdvisorClient = {
        id: 'uuid-1',
        advisor_id: 'advisor-uuid',
        client_id: null,
        client_email: 'client@example.com',
        permission_level: 'view',
        status: 'pending',
        invitation_token: 'token123',
        invitation_expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
        invitation_note: 'Welcome!',
        accepted_at: null,
        advisor_notes: null,
        revoked_at: null,
        revoked_by: null,
        invited_at: new Date().toISOString(),
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      expect(pendingClient.status).toBe('pending');
      expect(pendingClient.client_id).toBeNull();
      expect(pendingClient.invitation_token).toBeDefined();
      expect(pendingClient.accepted_at).toBeNull();
    });

    it('should create a valid active client', () => {
      const activeClient: AdvisorClient = {
        id: 'uuid-2',
        advisor_id: 'advisor-uuid',
        client_id: 'client-uuid',
        client_email: 'client@example.com',
        permission_level: 'manage',
        status: 'active',
        invitation_token: null,
        invitation_expires_at: null,
        invitation_note: null,
        accepted_at: new Date().toISOString(),
        advisor_notes: 'Important client',
        revoked_at: null,
        revoked_by: null,
        invited_at: new Date().toISOString(),
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      expect(activeClient.status).toBe('active');
      expect(activeClient.client_id).toBeDefined();
      expect(activeClient.invitation_token).toBeNull();
      expect(activeClient.accepted_at).toBeDefined();
    });

    it('should create a revoked client', () => {
      const revokedClient: AdvisorClient = {
        id: 'uuid-3',
        advisor_id: 'advisor-uuid',
        client_id: 'client-uuid',
        client_email: 'client@example.com',
        permission_level: 'view',
        status: 'revoked',
        invitation_token: null,
        invitation_expires_at: null,
        invitation_note: null,
        accepted_at: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(),
        advisor_notes: null,
        revoked_at: new Date().toISOString(),
        revoked_by: 'advisor',
        invited_at: new Date().toISOString(),
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      expect(revokedClient.status).toBe('revoked');
      expect(revokedClient.revoked_at).toBeDefined();
      expect(revokedClient.revoked_by).toBe('advisor');
    });

    it('should support client revoked by client', () => {
      const revokedByClient: AdvisorClient = {
        id: 'uuid-4',
        advisor_id: 'advisor-uuid',
        client_id: 'client-uuid',
        client_email: 'client@example.com',
        permission_level: 'view',
        status: 'revoked',
        invitation_token: null,
        invitation_expires_at: null,
        invitation_note: null,
        accepted_at: new Date().toISOString(),
        advisor_notes: null,
        revoked_at: new Date().toISOString(),
        revoked_by: 'client',
        invited_at: new Date().toISOString(),
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      expect(revokedByClient.revoked_by).toBe('client');
    });
  });

  describe('AdvisorClientWithProfile', () => {
    it('should include client profile data for active clients', () => {
      const clientWithProfile: AdvisorClientWithProfile = {
        id: 'uuid-1',
        advisor_id: 'advisor-uuid',
        client_id: 'client-uuid',
        client_email: 'client@example.com',
        permission_level: 'view',
        status: 'active',
        invitation_token: null,
        invitation_expires_at: null,
        invitation_note: null,
        accepted_at: new Date().toISOString(),
        advisor_notes: null,
        revoked_at: null,
        revoked_by: null,
        invited_at: new Date().toISOString(),
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        client_profile: {
          id: 'client-uuid',
          email: 'client@example.com',
          full_name: 'John Client',
        },
        wallet_count: 3,
        total_balance_btc: 1.5,
        total_balance_usd: 142500,
        last_synced_at: new Date().toISOString(),
        needs_attention: false,
      };

      expect(clientWithProfile.client_profile).toBeDefined();
      expect(clientWithProfile.client_profile?.full_name).toBe('John Client');
      expect(clientWithProfile.wallet_count).toBe(3);
      expect(clientWithProfile.total_balance_btc).toBe(1.5);
      expect(clientWithProfile.needs_attention).toBe(false);
    });

    it('should handle null profile for pending invitations', () => {
      const pendingWithoutProfile: AdvisorClientWithProfile = {
        id: 'uuid-2',
        advisor_id: 'advisor-uuid',
        client_id: null,
        client_email: 'pending@example.com',
        permission_level: 'view',
        status: 'pending',
        invitation_token: 'token',
        invitation_expires_at: new Date().toISOString(),
        invitation_note: null,
        accepted_at: null,
        advisor_notes: null,
        revoked_at: null,
        revoked_by: null,
        invited_at: new Date().toISOString(),
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        client_profile: null,
        wallet_count: 0,
        total_balance_btc: 0,
        total_balance_usd: 0,
        last_synced_at: null,
        needs_attention: false,
      };

      expect(pendingWithoutProfile.client_profile).toBeNull();
      expect(pendingWithoutProfile.wallet_count).toBe(0);
    });

    it('should flag clients needing attention when data is stale', () => {
      const staleClient: AdvisorClientWithProfile = {
        id: 'uuid-3',
        advisor_id: 'advisor-uuid',
        client_id: 'client-uuid',
        client_email: 'stale@example.com',
        permission_level: 'view',
        status: 'active',
        invitation_token: null,
        invitation_expires_at: null,
        invitation_note: null,
        accepted_at: new Date().toISOString(),
        advisor_notes: null,
        revoked_at: null,
        revoked_by: null,
        invited_at: new Date().toISOString(),
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        client_profile: {
          id: 'client-uuid',
          email: 'stale@example.com',
          full_name: 'Stale Client',
        },
        wallet_count: 2,
        total_balance_btc: 0.5,
        total_balance_usd: 47500,
        last_synced_at: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(), // 30 days ago
        needs_attention: true,
      };

      expect(staleClient.needs_attention).toBe(true);
    });
  });

  describe('ClientSummary', () => {
    it('should contain all required summary fields', () => {
      const summary: ClientSummary = {
        total_clients: 25,
        active_clients: 20,
        pending_invitations: 5,
        total_btc: 15.75,
        total_usd: 1496250,
        clients_needing_attention: 3,
      };

      expect(summary.total_clients).toBe(25);
      expect(summary.active_clients).toBe(20);
      expect(summary.pending_invitations).toBe(5);
      expect(summary.total_btc).toBe(15.75);
      expect(summary.total_usd).toBe(1496250);
      expect(summary.clients_needing_attention).toBe(3);
    });

    it('should handle empty dashboard state', () => {
      const emptySummary: ClientSummary = {
        total_clients: 0,
        active_clients: 0,
        pending_invitations: 0,
        total_btc: 0,
        total_usd: 0,
        clients_needing_attention: 0,
      };

      expect(emptySummary.total_clients).toBe(0);
      expect(emptySummary.total_btc).toBe(0);
    });

    it('should calculate totals correctly', () => {
      const summary: ClientSummary = {
        total_clients: 10,
        active_clients: 8,
        pending_invitations: 2,
        total_btc: 10,
        total_usd: 950000,
        clients_needing_attention: 1,
      };

      expect(summary.active_clients + summary.pending_invitations).toBe(summary.total_clients);
    });
  });

  describe('InviteClientParams', () => {
    it('should require email and permission level', () => {
      const inviteParams: InviteClientParams = {
        email: 'new.client@example.com',
        permission_level: 'view',
      };

      expect(inviteParams.email).toBe('new.client@example.com');
      expect(inviteParams.permission_level).toBe('view');
      expect(inviteParams.note).toBeUndefined();
    });

    it('should allow optional note', () => {
      const inviteWithNote: InviteClientParams = {
        email: 'new.client@example.com',
        permission_level: 'manage',
        note: 'Looking forward to working with you!',
      };

      expect(inviteWithNote.note).toBe('Looking forward to working with you!');
    });

    it('should support both permission levels', () => {
      const viewInvite: InviteClientParams = {
        email: 'view@example.com',
        permission_level: 'view',
      };

      const manageInvite: InviteClientParams = {
        email: 'manage@example.com',
        permission_level: 'manage',
      };

      expect(viewInvite.permission_level).toBe('view');
      expect(manageInvite.permission_level).toBe('manage');
    });
  });

  describe('AuditLogEntry', () => {
    it('should have all required fields', () => {
      const logEntry: AuditLogEntry = {
        id: 'log-uuid',
        advisor_id: 'advisor-uuid',
        client_id: 'client-uuid',
        action: 'Viewed client dashboard',
        action_category: 'view',
        details: { page: 'dashboard', tab: 'overview' },
        ip_address: '10.0.0.1',
        user_agent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)',
        created_at: new Date().toISOString(),
      };

      expect(logEntry.id).toBeDefined();
      expect(logEntry.advisor_id).toBeDefined();
      expect(logEntry.action).toBe('Viewed client dashboard');
      expect(logEntry.action_category).toBe('view');
      expect(logEntry.created_at).toBeDefined();
    });

    it('should allow valid action categories', () => {
      const categories: AuditCategory[] = ['view', 'edit', 'report', 'sync', 'access', 'invitation'];

      categories.forEach(category => {
        const entry: AuditLogEntry = {
          id: 'log-uuid',
          advisor_id: 'advisor-uuid',
          client_id: null,
          action: 'Test action',
          action_category: category,
          details: null,
          ip_address: null,
          user_agent: null,
          created_at: new Date().toISOString(),
        };

        expect(entry.action_category).toBe(category);
      });
    });

    it('should support null values for optional fields', () => {
      const minimalEntry: AuditLogEntry = {
        id: 'log-uuid',
        advisor_id: 'advisor-uuid',
        client_id: null,
        action: 'System action',
        action_category: 'access',
        details: null,
        ip_address: null,
        user_agent: null,
        created_at: new Date().toISOString(),
      };

      expect(minimalEntry.client_id).toBeNull();
      expect(minimalEntry.details).toBeNull();
      expect(minimalEntry.ip_address).toBeNull();
      expect(minimalEntry.user_agent).toBeNull();
    });

    it('should store complex details object', () => {
      const entryWithDetails: AuditLogEntry = {
        id: 'log-uuid',
        advisor_id: 'advisor-uuid',
        client_id: 'client-uuid',
        action: 'Updated permission level',
        action_category: 'access',
        details: {
          old_permission: 'view',
          new_permission: 'manage',
          reason: 'Client requested full access',
        },
        ip_address: '192.168.1.1',
        user_agent: 'Mozilla/5.0',
        created_at: new Date().toISOString(),
      };

      expect(entryWithDetails.details).toEqual({
        old_permission: 'view',
        new_permission: 'manage',
        reason: 'Client requested full access',
      });
    });
  });
});
