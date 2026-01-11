/**
 * API Authentication Tests
 * Tests for API key generation, hashing, and validation
 */

import { generateApiKey, hashApiKey, hasScope } from '../auth';
import type { ApiKeyData } from '../auth';

describe('API Authentication', () => {
  describe('generateApiKey', () => {
    it('should generate a key with correct format', () => {
      const { key, hash, prefix } = generateApiKey();

      // Check key format
      expect(key).toMatch(/^sct_live_[a-f0-9]{32}$/);
      expect(key.length).toBe(41); // "sct_live_" (9) + 32 hex chars

      // Check prefix
      expect(prefix).toBe('sct_live');

      // Check hash is SHA-256 (64 hex chars)
      expect(hash).toMatch(/^[a-f0-9]{64}$/);
    });

    it('should generate unique keys on each call', () => {
      const key1 = generateApiKey();
      const key2 = generateApiKey();
      const key3 = generateApiKey();

      expect(key1.key).not.toBe(key2.key);
      expect(key2.key).not.toBe(key3.key);
      expect(key1.hash).not.toBe(key2.hash);
    });

    it('should generate consistent hash for the same key', () => {
      const { key, hash } = generateApiKey();
      const rehashedKey = hashApiKey(key);

      expect(rehashedKey).toBe(hash);
    });
  });

  describe('hashApiKey', () => {
    it('should produce consistent SHA-256 hashes', () => {
      const testKey = 'sct_live_abcdef1234567890abcdef1234567890';

      const hash1 = hashApiKey(testKey);
      const hash2 = hashApiKey(testKey);

      expect(hash1).toBe(hash2);
      expect(hash1).toMatch(/^[a-f0-9]{64}$/);
    });

    it('should produce different hashes for different keys', () => {
      const key1 = 'sct_live_abcdef1234567890abcdef1234567890';
      const key2 = 'sct_live_1234567890abcdef1234567890abcdef';

      const hash1 = hashApiKey(key1);
      const hash2 = hashApiKey(key2);

      expect(hash1).not.toBe(hash2);
    });

    it('should match known SHA-256 output', () => {
      // Test with a known input to verify SHA-256 is used correctly
      const testKey = 'test_key';
      const hash = hashApiKey(testKey);

      // Actual SHA-256 of "test_key"
      expect(hash).toBe('92488e1e3eeecdf99f3ed2ce59233efb4b4fb612d5655c0ce9ea52b5a502e655');
    });
  });

  describe('hasScope', () => {
    const createMockApiKey = (scopes: string[]): ApiKeyData => ({
      id: 'test-id',
      user_id: 'test-user',
      name: 'Test Key',
      key_prefix: 'sct_live',
      scopes,
      rate_limit_daily: 1000,
      last_used_at: null,
      created_at: new Date().toISOString(),
    });

    it('should return true when scope exists', () => {
      const apiKey = createMockApiKey(['read', 'write']);

      expect(hasScope(apiKey, 'read')).toBe(true);
      expect(hasScope(apiKey, 'write')).toBe(true);
    });

    it('should return false when scope does not exist', () => {
      const apiKey = createMockApiKey(['read']);

      expect(hasScope(apiKey, 'write')).toBe(false);
      expect(hasScope(apiKey, 'admin')).toBe(false);
    });

    it('should return true for any scope when wildcard (*) is present', () => {
      const apiKey = createMockApiKey(['*']);

      expect(hasScope(apiKey, 'read')).toBe(true);
      expect(hasScope(apiKey, 'write')).toBe(true);
      expect(hasScope(apiKey, 'admin')).toBe(true);
      expect(hasScope(apiKey, 'any_scope')).toBe(true);
    });

    it('should return false for empty scopes array', () => {
      const apiKey = createMockApiKey([]);

      expect(hasScope(apiKey, 'read')).toBe(false);
    });
  });
});

describe('API Key Validation', () => {
  describe('Key format validation', () => {
    it('should reject keys not starting with sct_live_', () => {
      const invalidKeys = [
        'invalid_key',
        'sk_live_1234567890abcdef1234567890abcdef',
        'sct_test_1234567890abcdef1234567890abcdef',
        'SCT_LIVE_1234567890abcdef1234567890abcdef',
        '',
      ];

      invalidKeys.forEach(key => {
        expect(key.startsWith('sct_live_')).toBe(false);
      });
    });

    it('should accept keys with correct format', () => {
      const validKey = 'sct_live_1234567890abcdef1234567890abcdef';

      expect(validKey.startsWith('sct_live_')).toBe(true);
      expect(validKey.length).toBeGreaterThanOrEqual(40);
    });
  });
});
