---
name: satsAt:test-plan
description: This skill should be used when the user asks to 'create a test plan', 'write tests', 'QA strategy', 'test coverage', or mentions 'testing'. It creates comprehensive test plans for SatsAt features with focus on financial accuracy.
version: 1.0.0
---

# Test Plan

You are creating a comprehensive test plan for SatsAt. For a portfolio tracker, financial accuracy is critical - wrong cost basis = wrong taxes = legal liability.

## Testing Philosophy

### Priority Order

1. **Cost basis calculations** - Must be mathematically correct
2. **Data integrity** - No data loss, proper persistence
3. **Security** - RLS, authentication, input validation
4. **User flows** - Registration, wallet add, sync, reports
5. **UI/UX** - Responsive, accessible, performant

---

## Test Types

| Type | Coverage | Purpose |
|------|----------|---------|
| Unit | Individual functions | Logic correctness |
| Integration | API routes, database | Components work together |
| E2E | Full user flows | System works as a whole |
| Manual | Visual, UX, edge cases | Human verification |

---

## Test Plan Template

```markdown
# Test Plan: [Feature Name]

**Version:** 1.0
**Created:** [Date]
**Feature:** [What's being tested]

---

## 1. Overview

### Feature Description
[Brief description of the feature]

### Test Objectives
- Verify [primary functionality]
- Ensure [critical requirement]
- Validate [edge case handling]

### Risk Areas
- [What could go wrong]
- [Where bugs are likely]

---

## 2. Test Cases

### 2.1 Happy Path Tests

#### HP-1: [Primary Success Scenario]
**Priority:** P0 (Critical)
**Type:** E2E

**Preconditions:**
- User is logged in
- [Other setup]

**Steps:**
| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | [Do this] | [See that] |
| 2 | [Do this] | [See that] |

**Postconditions:**
- [Final state]

---

### 2.2 Edge Case Tests

#### EC-1: [Empty State]
**Priority:** P1
**Scenario:** User has no wallets/transactions

#### EC-2: [Maximum Values]
**Priority:** P1
**Scenario:** User at tier limits

#### EC-3: [Invalid Input]
**Priority:** P1
**Scenario:** Malformed xpub/address

---

### 2.3 Error Handling Tests

#### EH-1: [Network Failure]
**Scenario:** API call fails during sync
**Expected:**
- User-friendly error message
- No data corruption
- Retry option available

#### EH-2: [Concurrent Operations]
**Scenario:** User triggers multiple syncs
**Expected:**
- Only one sync runs
- UI shows correct status

---

### 2.4 Security Tests

#### SEC-1: [Unauthorized Access]
**Scenario:** User tries to access another user's wallet
**Expected:** 403 Forbidden

#### SEC-2: [Invalid Token]
**Scenario:** Expired/invalid JWT
**Expected:** 401 Unauthorized, redirect to login

---

## 3. Regression Checklist

### Core Functionality
- [ ] User can register
- [ ] User can log in/out
- [ ] User can add wallet
- [ ] Wallet sync works
- [ ] Transaction history displays
- [ ] Tax report generates

### Critical Paths
- [ ] Cost basis calculated correctly (FIFO)
- [ ] Cost basis calculated correctly (LIFO)
- [ ] Cost basis calculated correctly (HIFO)
- [ ] Internal transfers excluded from tax
- [ ] 8949 report accuracy verified

---

## 4. Exit Criteria

Testing is complete when:
- [ ] All P0 tests pass
- [ ] All P1 tests pass
- [ ] No critical bugs open
- [ ] Regression checklist verified
- [ ] Code coverage > 80% on critical paths
```

---

## SatsAt Critical Test Cases

### Cost Basis Calculation

#### TC-COST-001: FIFO Calculation

**Scenario:** User has multiple purchase lots, makes a partial sale

**Setup:**
```
Lot 1: 0.5 BTC @ $20,000 (Jan 1, 2024)
Lot 2: 0.3 BTC @ $25,000 (Feb 1, 2024)
Lot 3: 0.2 BTC @ $30,000 (Mar 1, 2024)
Sale: 0.6 BTC @ $35,000 (Apr 1, 2024)
```

**Expected (FIFO):**
```
Uses: All of Lot 1 (0.5 BTC) + 0.1 from Lot 2 (0.1 BTC)
Cost basis: (0.5 × $20,000) + (0.1 × $25,000) = $12,500
Proceeds: 0.6 × $35,000 = $21,000
Gain: $21,000 - $12,500 = $8,500
```

**Test:**
```typescript
test('FIFO: partial sale uses oldest lots first', async () => {
  // Setup lots
  await createTaxLot({ amount: '0.5', price: 20000, date: '2024-01-01' });
  await createTaxLot({ amount: '0.3', price: 25000, date: '2024-02-01' });
  await createTaxLot({ amount: '0.2', price: 30000, date: '2024-03-01' });

  // Execute sale
  const result = await calculateDisposal({
    amount: '0.6',
    proceeds: 21000,
    method: 'FIFO'
  });

  expect(result.totalCostBasis).toBeCloseTo(12500);
  expect(result.gainLoss).toBeCloseTo(8500);
  expect(result.lotsUsed).toHaveLength(2);
});
```

#### TC-COST-002: LIFO Calculation

**Same setup, using LIFO:**

**Expected (LIFO):**
```
Uses: All of Lot 3 (0.2 BTC) + All of Lot 2 (0.3 BTC) + 0.1 from Lot 1
Cost basis: (0.2 × $30,000) + (0.3 × $25,000) + (0.1 × $20,000) = $15,500
Gain: $21,000 - $15,500 = $5,500
```

### Internal Transfer Detection

#### TC-INT-001: Auto-detect Internal Transfer

**Scenario:** User sends BTC from Wallet A to Wallet B (both owned)

**Setup:**
```
Wallet A: User's cold storage (has 1 BTC)
Wallet B: User's hot wallet
Transaction: 0.5 BTC from A to B
```

**Expected:**
- Transaction marked as internal transfer
- No taxable event created
- Both wallets show correct balance
- No tax lot disposal recorded

**Test:**
```typescript
test('Internal transfer detected and excluded from tax', async () => {
  // Setup
  const walletA = await createWallet({ name: 'Cold Storage' });
  const walletB = await createWallet({ name: 'Hot Wallet' });

  // Simulate transfer
  await syncTransaction({
    from: walletA.address,
    to: walletB.address,
    amount: '0.5'
  });

  // Verify
  const tx = await getTransaction(txId);
  expect(tx.is_internal_transfer).toBe(true);
  expect(tx.category).toBe('internal');

  // Verify no disposal
  const lots = await getTaxLots({ is_disposed: true });
  expect(lots).toHaveLength(0);
});
```

### Wallet Sync

#### TC-SYNC-001: Bitcoin Wallet Sync

**Scenario:** Add new Bitcoin wallet and sync transactions

**Steps:**
1. Add wallet with valid xpub
2. Trigger sync
3. Verify transactions fetched
4. Verify balances calculated

**Assertions:**
- Transaction count matches block explorer
- Balance matches block explorer
- All UTXOs tracked
- Historical prices fetched for each tx

### Tax Report Generation

#### TC-TAX-001: 8949 Report Accuracy

**Scenario:** Generate Form 8949 for tax year

**Validation:**
- [ ] All disposals included
- [ ] Correct short-term vs long-term classification
- [ ] Cost basis matches lot calculations
- [ ] Proceeds calculated correctly
- [ ] Gain/loss totals match
- [ ] CSV format valid

---

## Test Data

### Test xpubs

```typescript
// Testnet xpubs for development
const TEST_XPUB_1 = 'tpub...'; // Known history, 10 transactions
const TEST_XPUB_2 = 'tpub...'; // Empty wallet
const TEST_XPUB_3 = 'tpub...'; // Large wallet, 1000+ transactions
```

### Test Scenarios

```typescript
// Scenario: Simple holder
const simpleHolder = {
  wallets: 1,
  transactions: 5,
  lots: 3,
  disposals: 1
};

// Scenario: Multisig user
const multisigUser = {
  wallets: 1, // 2-of-3 multisig
  multisig_config: { quorum: 2, total: 3 },
  transactions: 20,
  internal_transfers: 5
};

// Scenario: Advisor with clients
const advisorScenario = {
  clients: 5,
  total_wallets: 15,
  requires_multi_client_view: true
};
```

---

## Priority Definitions

| Priority | Definition | Must Pass? |
|----------|------------|------------|
| P0 | Critical path, data integrity, cost basis | Yes - blocker |
| P1 | Important functionality, security | Yes |
| P2 | Edge cases, nice-to-have | No, but track |
| P3 | Polish, minor issues | No |

---

## Automation Strategy

### Unit Tests (Vitest)

```typescript
// src/lib/tax/__tests__/cost-basis.test.ts
import { describe, test, expect } from 'vitest';
import { calculateFIFO, calculateLIFO, calculateHIFO } from '../cost-basis';

describe('Cost Basis Calculations', () => {
  describe('FIFO', () => {
    test('uses oldest lots first', () => { /* ... */ });
    test('handles partial lot consumption', () => { /* ... */ });
    test('tracks long-term vs short-term', () => { /* ... */ });
  });
});
```

### Integration Tests

```typescript
// src/app/api/wallets/__tests__/sync.test.ts
import { describe, test, expect, beforeEach } from 'vitest';

describe('Wallet Sync API', () => {
  beforeEach(async () => {
    await resetTestDatabase();
  });

  test('syncs Bitcoin wallet from xpub', async () => {
    const response = await fetch('/api/wallets/sync', {
      method: 'POST',
      body: JSON.stringify({ wallet_id: testWalletId })
    });

    expect(response.ok).toBe(true);
    // Verify transactions created
  });
});
```

### E2E Tests (Playwright)

```typescript
// e2e/wallet-flow.spec.ts
import { test, expect } from '@playwright/test';

test('user can add wallet and view transactions', async ({ page }) => {
  await page.goto('/wallets');
  await page.click('button:has-text("Add Wallet")');
  await page.fill('input[name="xpub"]', TEST_XPUB);
  await page.click('button:has-text("Add")');

  await expect(page.locator('.wallet-card')).toBeVisible();
  await expect(page.locator('.transaction-row')).toHaveCount(10);
});
```
