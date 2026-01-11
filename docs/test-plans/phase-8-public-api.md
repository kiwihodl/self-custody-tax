# Test Plan: Phase 8 Public API

**Version:** 1.0
**Created:** January 11, 2026
**Author:** Self Custody Tax Team

---

## 1. Overview

### Feature Description
RESTful API for Advisor tier users with API key authentication, rate limiting, and endpoints for wallets, transactions, tax lots, and tax summaries.

### Test Objectives
- Verify API key generation produces secure, unique keys
- Ensure authentication correctly validates keys and rejects invalid ones
- Validate rate limiting enforces daily limits
- Confirm all endpoints return correct data with proper pagination
- Test error responses follow consistent format

### Out of Scope
- E2E browser tests (API only)
- Load testing (future)
- Webhook testing (Phase 2)

---

## 2. Test Environment

### Prerequisites
- [x] Jest test framework configured
- [x] TypeScript compilation working
- [x] Supabase tables created (api_keys, api_requests)
- [ ] Test database with seed data (manual testing)

### Test Data Requirements
| Data Type | Description | Source |
|-----------|-------------|--------|
| Advisor User | User with advisor tier | Manual setup |
| API Keys | Test keys for validation | Generated via tests |
| Wallets | Sample wallet data | Existing user data |

---

## 3. Test Cases

### 3.1 Unit Tests (Implemented)

#### Auth Tests (`auth.test.ts`)
| Test | Description | Status |
|------|-------------|--------|
| generateApiKey format | Key matches `sct_live_xxx` pattern | ✅ Pass |
| generateApiKey uniqueness | Each call produces unique key | ✅ Pass |
| generateApiKey hash consistency | Same key produces same hash | ✅ Pass |
| hashApiKey consistency | SHA-256 produces consistent output | ✅ Pass |
| hashApiKey different keys | Different keys produce different hashes | ✅ Pass |
| hashApiKey known output | Matches known SHA-256 | ✅ Pass |
| hasScope with scope | Returns true when scope exists | ✅ Pass |
| hasScope without scope | Returns false when scope missing | ✅ Pass |
| hasScope with wildcard | Returns true for any scope with `*` | ✅ Pass |
| hasScope empty array | Returns false for empty scopes | ✅ Pass |
| Key format validation | Rejects invalid key formats | ✅ Pass |

#### Rate Limit Tests (`rate-limit.test.ts`)
| Test | Description | Status |
|------|-------------|--------|
| getRateLimitHeaders allowed | Returns correct headers | ✅ Pass |
| getRateLimitHeaders limited | Returns zero remaining | ✅ Pass |
| getRateLimitHeaders custom limits | Handles different limits | ✅ Pass |
| Remaining calculation | Correct math for remaining | ✅ Pass |
| Limit exceeded detection | Identifies when at limit | ✅ Pass |
| Limit not exceeded | Identifies when under limit | ✅ Pass |
| Edge case at limit-1 | Handles boundary correctly | ✅ Pass |
| Reset at midnight UTC | Correct reset time calculation | ✅ Pass |

#### Response Tests (`response.test.ts`)
| Test | Description | Status |
|------|-------------|--------|
| parsePagination defaults | Returns defaults when no params | ✅ Pass |
| parsePagination custom values | Parses page and per_page | ✅ Pass |
| parsePagination min page | Enforces minimum page of 1 | ✅ Pass |
| parsePagination negative page | Handles negative values | ✅ Pass |
| parsePagination max per_page | Caps at maxPerPage | ✅ Pass |
| parsePagination min per_page | Enforces minimum of 1 | ✅ Pass |
| parsePagination offset calc | Correct offset for pages | ✅ Pass |
| parsePagination custom defaults | Uses custom defaults | ✅ Pass |
| parsePagination custom max | Respects custom maxPerPage | ✅ Pass |
| parsePagination NaN handling | Falls back to defaults | ✅ Pass |
| paginationMeta first page | Correct meta with has_more | ✅ Pass |
| paginationMeta last page | has_more is false | ✅ Pass |
| paginationMeta single page | has_more is false | ✅ Pass |
| paginationMeta exact boundary | Handles exact page boundary | ✅ Pass |
| paginationMeta partial page | has_more true for partial | ✅ Pass |
| paginationMeta empty | Handles zero results | ✅ Pass |
| API_ERRORS auth codes | 401 for auth errors | ✅ Pass |
| API_ERRORS authz codes | 403 for authorization | ✅ Pass |
| API_ERRORS rate limit code | 429 for rate limited | ✅ Pass |
| API_ERRORS resource codes | 404, 409 for resources | ✅ Pass |
| API_ERRORS validation codes | 400 for validation | ✅ Pass |
| API_ERRORS server codes | 500, 503 for server | ✅ Pass |
| API_ERRORS unique codes | All codes unique | ✅ Pass |
| API_ERRORS descriptive messages | All have messages | ✅ Pass |
| Success response shape | Correct structure | ✅ Pass |
| Error response shape | Correct structure | ✅ Pass |

**Total: 46 tests passing**

---

### 3.2 Integration Tests (Manual)

#### HP-1: Create API Key
**Priority:** P0 (Critical)

**Steps:**
| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Login as Advisor user | Dashboard loads |
| 2 | Navigate to Settings | API Keys section visible |
| 3 | Click "New Key" | Modal opens |
| 4 | Enter name, click Create | Key displayed once |
| 5 | Copy key | Can paste key |
| 6 | Key appears in list | Shows prefix, created date |

---

#### HP-2: Use API Key
**Priority:** P0 (Critical)

**Steps:**
| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Call GET /api/v1/wallets with Bearer token | 200 with wallet data |
| 2 | Check rate limit headers | X-RateLimit-* present |
| 3 | Call GET /api/v1/transactions | 200 with transactions |
| 4 | Call GET /api/v1/tax-lots | 200 with tax lots |
| 5 | Call GET /api/v1/tax/summary?year=2025 | 200 with summary |

---

#### EC-1: Invalid API Key
**Priority:** P0 (Critical)

**Steps:**
| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Call with no Authorization header | 401 Unauthorized |
| 2 | Call with invalid key format | 401 Invalid format |
| 3 | Call with revoked key | 401 Key revoked |
| 4 | Call as non-Advisor user | 403 Upgrade required |

---

#### EC-2: Rate Limiting
**Priority:** P1 (High)

**Steps:**
| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Make 1000 requests in one day | All succeed |
| 2 | Make 1001st request | 429 Rate limit exceeded |
| 3 | Check reset header | Shows next day midnight UTC |
| 4 | Wait for reset | Requests work again |

---

### 3.3 Security Tests

#### SEC-1: Key Storage
**Scenario:** Verify API keys are stored securely

**Checks:**
- [x] Keys stored as SHA-256 hash (code verified)
- [x] Only prefix shown in UI (code verified)
- [x] Full key shown only once at creation (code verified)

#### SEC-2: Cross-User Access
**Scenario:** User A cannot access User B's data via API

**Steps:**
| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | User A creates API key | Key generated |
| 2 | Use key to access User A's wallets | 200 Success |
| 3 | Try to access User B's wallet ID | 404 Not found |

---

## 4. Test Execution

### Commands
```bash
npm test                 # Run all tests
npm test:watch          # Watch mode
npm test:coverage       # With coverage report
```

### Order of Execution
1. ✅ Unit tests (automated)
2. ⬜ Integration tests (manual)
3. ⬜ Security tests (manual)

---

## 5. Exit Criteria

Testing is complete when:
- [x] All unit tests pass (46/46)
- [x] Build succeeds
- [ ] Manual integration tests verified
- [ ] Security tests verified
- [ ] Documentation reviewed

---

## 6. Test Results Summary

| Category | Tests | Passed | Failed |
|----------|-------|--------|--------|
| Auth | 11 | 11 | 0 |
| Rate Limit | 9 | 9 | 0 |
| Response | 26 | 26 | 0 |
| **Total** | **46** | **46** | **0** |

**Status: All automated tests passing**

---

## 7. Bugs Found & Fixed

| Bug | Severity | Status |
|-----|----------|--------|
| parsePagination doesn't handle NaN | Low | ✅ Fixed |

---

## Files Created

| File | Purpose |
|------|---------|
| `jest.config.js` | Jest configuration |
| `jest.setup.js` | Test environment setup |
| `src/lib/api/__tests__/auth.test.ts` | Auth unit tests |
| `src/lib/api/__tests__/rate-limit.test.ts` | Rate limit tests |
| `src/lib/api/__tests__/response.test.ts` | Response helper tests |
