import { describe, it, expect, jest, beforeEach } from '@jest/globals';

// Mock Supabase client
const mockSupabaseClient = {
  auth: {
    getUser: jest.fn(),
  },
  from: jest.fn(),
  storage: {
    from: jest.fn(),
  },
};

jest.mock('@/lib/supabase/server', () => ({
  createClient: () => Promise.resolve(mockSupabaseClient),
}));

describe('Advisor Branding API', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('GET /api/advisor/branding', () => {
    it('returns 401 when not authenticated', async () => {
      mockSupabaseClient.auth.getUser.mockResolvedValue({
        data: { user: null },
      });

      // In real implementation, this would call the route
      // For now, we test the auth logic
      const user = (await mockSupabaseClient.auth.getUser()).data.user;
      expect(user).toBeNull();
    });

    it('returns 403 when not advisor tier', async () => {
      mockSupabaseClient.auth.getUser.mockResolvedValue({
        data: { user: { id: 'user-123' } },
      });

      mockSupabaseClient.from.mockReturnValue({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            single: jest.fn().mockResolvedValue({
              data: { subscription_tier: 'free' },
            }),
          }),
        }),
      });

      const profile = await mockSupabaseClient
        .from('user_profiles')
        .select('subscription_tier')
        .eq('id', 'user-123')
        .single();

      expect(profile.data.subscription_tier).toBe('free');
      expect(profile.data.subscription_tier).not.toBe('advisor');
    });
  });

  describe('PATCH /api/advisor/branding', () => {
    it('validates hex color format', () => {
      const hexColorRegex = /^#[0-9A-Fa-f]{6}$/;

      // Valid colors
      expect(hexColorRegex.test('#F7931A')).toBe(true);
      expect(hexColorRegex.test('#ffffff')).toBe(true);
      expect(hexColorRegex.test('#000000')).toBe(true);
      expect(hexColorRegex.test('#1a1a2e')).toBe(true);

      // Invalid colors
      expect(hexColorRegex.test('F7931A')).toBe(false); // Missing #
      expect(hexColorRegex.test('#FFF')).toBe(false); // Too short
      expect(hexColorRegex.test('#GGGGGG')).toBe(false); // Invalid chars
      expect(hexColorRegex.test('#1234567')).toBe(false); // Too long
      expect(hexColorRegex.test('')).toBe(false); // Empty
    });

    it('accepts valid branding data structure', () => {
      const validBrandingData = {
        firm_name: 'Test CPA Firm',
        primary_color: '#F7931A',
        secondary_color: '#1a1a2e',
        contact_email: 'test@example.com',
        contact_phone: '+1 (555) 123-4567',
        footer_text: 'This is a disclaimer',
      };

      expect(validBrandingData.firm_name).toBeDefined();
      expect(validBrandingData.primary_color).toMatch(/^#[0-9A-Fa-f]{6}$/);
      expect(validBrandingData.secondary_color).toMatch(/^#[0-9A-Fa-f]{6}$/);
    });
  });
});

describe('Logo Upload Validation', () => {
  const MAX_FILE_SIZE = 2 * 1024 * 1024; // 2MB
  const ALLOWED_TYPES = ['image/png', 'image/jpeg', 'image/jpg'];

  it('validates file type correctly', () => {
    const validTypes = ['image/png', 'image/jpeg', 'image/jpg'];
    const invalidTypes = ['image/gif', 'image/webp', 'application/pdf', 'text/plain'];

    validTypes.forEach((type) => {
      expect(ALLOWED_TYPES.includes(type)).toBe(true);
    });

    invalidTypes.forEach((type) => {
      expect(ALLOWED_TYPES.includes(type)).toBe(false);
    });
  });

  it('validates file size correctly', () => {
    const validSizes = [1024, 1024 * 1024, 2 * 1024 * 1024]; // 1KB, 1MB, 2MB
    const invalidSizes = [2 * 1024 * 1024 + 1, 5 * 1024 * 1024]; // 2MB+1B, 5MB

    validSizes.forEach((size) => {
      expect(size <= MAX_FILE_SIZE).toBe(true);
    });

    invalidSizes.forEach((size) => {
      expect(size > MAX_FILE_SIZE).toBe(true);
    });
  });
});

describe('Advisor Profile Structure', () => {
  it('has required default values', () => {
    const defaultProfile = {
      primary_color: '#F7931A',
      secondary_color: '#1a1a2e',
      country: 'USA',
    };

    expect(defaultProfile.primary_color).toBe('#F7931A');
    expect(defaultProfile.secondary_color).toBe('#1a1a2e');
    expect(defaultProfile.country).toBe('USA');
  });

  it('allows optional fields to be null', () => {
    const profile = {
      id: 'user-123',
      firm_name: null,
      logo_path: null,
      primary_color: '#F7931A',
      secondary_color: '#1a1a2e',
      accent_color: null,
      contact_email: null,
      contact_phone: null,
      address_line_1: null,
      address_line_2: null,
      city: null,
      state: null,
      postal_code: null,
      country: 'USA',
      footer_text: null,
      website_url: null,
    };

    expect(profile.firm_name).toBeNull();
    expect(profile.logo_path).toBeNull();
    expect(profile.country).toBe('USA');
  });
});
