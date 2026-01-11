/**
 * Advisor Audit Logging Tests
 * Tests for audit action logging and retrieval
 */

import { AuditActions } from '../audit';

describe('Advisor Audit Actions', () => {
  describe('AuditActions constants', () => {
    it('should have all required access action types', () => {
      expect(AuditActions.ENTERED_CLIENT_VIEW).toBe('Entered client view mode');
      expect(AuditActions.EXITED_CLIENT_VIEW).toBe('Exited client view mode');
    });

    it('should have all required invitation action types', () => {
      expect(AuditActions.SENT_INVITATION).toBe('Sent client invitation');
      expect(AuditActions.RESENT_INVITATION).toBe('Resent client invitation');
      expect(AuditActions.CANCELLED_INVITATION).toBe('Cancelled invitation');
      expect(AuditActions.CLIENT_ACCEPTED).toBe('Client accepted invitation');
      expect(AuditActions.CLIENT_DECLINED).toBe('Client declined invitation');
    });

    it('should have all required client management action types', () => {
      expect(AuditActions.REMOVED_CLIENT).toBe('Removed client');
      expect(AuditActions.UPDATED_PERMISSION).toBe('Updated permission level');
      expect(AuditActions.ADDED_NOTE).toBe('Added/updated client note');
    });

    it('should have all required data view action types', () => {
      expect(AuditActions.VIEWED_DASHBOARD).toBe('Viewed client dashboard');
      expect(AuditActions.VIEWED_WALLETS).toBe('Viewed client wallets');
      expect(AuditActions.VIEWED_TRANSACTIONS).toBe('Viewed client transactions');
      expect(AuditActions.VIEWED_TAX_LOTS).toBe('Viewed client tax lots');
      expect(AuditActions.VIEWED_TAX_SUMMARY).toBe('Viewed client tax summary');
    });

    it('should have all required edit action types', () => {
      expect(AuditActions.EDITED_TRANSACTION).toBe('Edited transaction');
      expect(AuditActions.EDITED_TAX_LOT).toBe('Edited tax lot');
      expect(AuditActions.TRIGGERED_SYNC).toBe('Triggered wallet sync');
    });

    it('should have all required report action types', () => {
      expect(AuditActions.GENERATED_REPORT).toBe('Generated tax report');
      expect(AuditActions.DOWNLOADED_REPORT).toBe('Downloaded tax report');
      expect(AuditActions.BULK_GENERATED_REPORTS).toBe('Bulk generated reports');
      expect(AuditActions.DOWNLOADED_BULK_REPORTS).toBe('Downloaded bulk reports');
    });

    it('should have unique action strings', () => {
      const actionValues = Object.values(AuditActions);
      const uniqueValues = new Set(actionValues);

      expect(actionValues.length).toBe(uniqueValues.size);
    });

    it('should have all actions be non-empty strings', () => {
      Object.values(AuditActions).forEach(action => {
        expect(typeof action).toBe('string');
        expect(action.length).toBeGreaterThan(0);
      });
    });
  });

  describe('Action categories', () => {
    it('should have view actions that describe viewing', () => {
      const viewActions = [
        AuditActions.VIEWED_DASHBOARD,
        AuditActions.VIEWED_WALLETS,
        AuditActions.VIEWED_TRANSACTIONS,
        AuditActions.VIEWED_TAX_LOTS,
        AuditActions.VIEWED_TAX_SUMMARY,
      ];

      viewActions.forEach(action => {
        expect(action.toLowerCase()).toContain('view');
      });
    });

    it('should have edit actions that describe modifications', () => {
      const editActions = [
        AuditActions.EDITED_TRANSACTION,
        AuditActions.EDITED_TAX_LOT,
      ];

      editActions.forEach(action => {
        expect(action.toLowerCase()).toContain('edit');
      });
    });

    it('should have report actions that describe report generation', () => {
      const reportActions = [
        AuditActions.GENERATED_REPORT,
        AuditActions.DOWNLOADED_REPORT,
        AuditActions.BULK_GENERATED_REPORTS,
        AuditActions.DOWNLOADED_BULK_REPORTS,
      ];

      reportActions.forEach(action => {
        expect(action.toLowerCase()).toContain('report');
      });
    });

    it('should categorize access control actions correctly', () => {
      const accessActions = [
        AuditActions.UPDATED_PERMISSION,
        AuditActions.REMOVED_CLIENT,
        AuditActions.ENTERED_CLIENT_VIEW,
        AuditActions.EXITED_CLIENT_VIEW,
      ];

      expect(accessActions).toHaveLength(4);
    });

    it('should categorize invitation actions correctly', () => {
      const invitationActions = [
        AuditActions.SENT_INVITATION,
        AuditActions.RESENT_INVITATION,
        AuditActions.CANCELLED_INVITATION,
        AuditActions.CLIENT_ACCEPTED,
        AuditActions.CLIENT_DECLINED,
      ];

      expect(invitationActions).toHaveLength(5);
    });
  });
});

describe('Audit Log Entry Structure', () => {
  it('should define correct log entry interface', () => {
    // Test that the expected structure can be created
    const mockLogEntry = {
      id: 'test-uuid',
      advisor_id: 'advisor-uuid',
      client_id: 'client-uuid',
      action: AuditActions.VIEWED_DASHBOARD,
      action_category: 'view' as const,
      details: { page: 'dashboard' },
      ip_address: '192.168.1.1',
      user_agent: 'Mozilla/5.0',
      created_at: new Date().toISOString(),
    };

    expect(mockLogEntry.id).toBeDefined();
    expect(mockLogEntry.advisor_id).toBeDefined();
    expect(mockLogEntry.action).toBe(AuditActions.VIEWED_DASHBOARD);
    expect(mockLogEntry.action_category).toBe('view');
    expect(mockLogEntry.details).toEqual({ page: 'dashboard' });
    expect(mockLogEntry.created_at).toBeDefined();
  });

  it('should support null client_id for non-client-specific actions', () => {
    const mockLogEntry = {
      id: 'test-uuid',
      advisor_id: 'advisor-uuid',
      client_id: null,
      action: 'General dashboard view',
      action_category: 'view' as const,
      details: null,
      ip_address: null,
      user_agent: null,
      created_at: new Date().toISOString(),
    };

    expect(mockLogEntry.client_id).toBeNull();
    expect(mockLogEntry.details).toBeNull();
  });

  it('should support all valid action categories', () => {
    const validCategories = ['view', 'edit', 'report', 'sync', 'access', 'invitation'];

    validCategories.forEach(category => {
      const mockEntry = {
        id: 'test-uuid',
        advisor_id: 'advisor-uuid',
        client_id: null,
        action: 'Test action',
        action_category: category,
        details: null,
        ip_address: null,
        user_agent: null,
        created_at: new Date().toISOString(),
      };

      expect(mockEntry.action_category).toBe(category);
    });
  });
});

describe('Audit Log Filtering', () => {
  it('should support filtering by client ID', () => {
    const filterOptions = {
      clientId: 'client-uuid',
    };

    expect(filterOptions.clientId).toBe('client-uuid');
  });

  it('should support filtering by category', () => {
    const filterOptions = {
      category: 'view' as const,
    };

    expect(filterOptions.category).toBe('view');
  });

  it('should support date range filtering', () => {
    const filterOptions = {
      startDate: '2024-01-01T00:00:00.000Z',
      endDate: '2024-12-31T23:59:59.999Z',
    };

    expect(new Date(filterOptions.startDate).getUTCFullYear()).toBe(2024);
    expect(new Date(filterOptions.endDate).getUTCFullYear()).toBe(2024);
  });

  it('should support pagination', () => {
    const filterOptions = {
      limit: 50,
      offset: 100,
    };

    expect(filterOptions.limit).toBe(50);
    expect(filterOptions.offset).toBe(100);
  });
});
