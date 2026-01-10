---
name: satsAt:code-review
description: This skill should be used when the user asks to 'review code', 'check this PR', 'code review', or mentions 'QA'. It provides systematic code review focused on TypeScript, Next.js 14, Supabase patterns, and Bitcoin-specific accuracy requirements for SatsAt.
version: 1.0.0
---

# Code Review

You are conducting a code review for SatsAt. Focus on correctness, security, and maintainability for a Bitcoin portfolio tracker where financial accuracy is critical.

## Review Checklist

### 1. TypeScript Quality

**Type Safety:**
- [ ] No `any` types (use `unknown` if needed)
- [ ] Proper type narrowing
- [ ] Interfaces for all data structures
- [ ] Strict null checks respected

**SatsAt-Specific Types:**
```typescript
// Correct: Use BigNumber for crypto amounts
import BigNumber from 'bignumber.js';
const amount: BigNumber = new BigNumber(satoshis).dividedBy(1e8);

// Incorrect: Using number (precision loss)
const amount: number = satoshis / 100000000; // BAD
```

### 2. Next.js 14 Patterns

**App Router:**
- [ ] Server components by default
- [ ] `'use client'` only where needed
- [ ] Proper loading/error boundaries
- [ ] Metadata exports for SEO

**Server Actions:**
```typescript
// Correct: Server action with validation
'use server';
import { z } from 'zod';

const schema = z.object({
  xpub: z.string().regex(/^[xyz]pub[a-zA-Z0-9]{100,}$/),
});

export async function addWallet(formData: FormData) {
  const validated = schema.parse(Object.fromEntries(formData));
  // ...
}
```

**API Routes:**
- [ ] Proper error handling
- [ ] Authentication checks
- [ ] Rate limiting for external APIs
- [ ] Input validation with Zod

### 3. Supabase Patterns

**Row Level Security:**
```sql
-- Every table MUST have RLS enabled
ALTER TABLE wallets ENABLE ROW LEVEL SECURITY;

-- Policy must use auth.uid()
CREATE POLICY "Users own wallets" ON wallets
  FOR ALL USING (auth.uid() = user_id);
```

**Query Patterns:**
```typescript
// Correct: Uses server client with service role for admin
import { createClient } from '@supabase/supabase-js';

// Correct: Uses RLS-aware client for user requests
import { createServerClient } from '@supabase/ssr';
```

### 4. Bitcoin-Specific Accuracy

**UTXO Handling:**
```typescript
// Correct: Track individual UTXOs
interface UTXO {
  txid: string;
  vout: number;
  value_sats: bigint; // Use bigint for satoshis
  address: string;
}

// Incorrect: Aggregating without UTXO tracking
const balance = transactions.reduce((sum, tx) => sum + tx.amount, 0);
```

**Cost Basis Calculation:**
```typescript
// Correct: FIFO with proper lot tracking
function calculateFIFO(disposal: Disposal, lots: TaxLot[]): DisposalResult {
  const sortedLots = lots
    .filter(l => !l.is_disposed)
    .sort((a, b) => a.acquisition_date.getTime() - b.acquisition_date.getTime());

  let remaining = new BigNumber(disposal.amount);
  const usedLots: UsedLot[] = [];

  for (const lot of sortedLots) {
    if (remaining.lte(0)) break;
    // ... consume lot
  }

  return { usedLots, totalCostBasis, gainLoss };
}
```

**Price Precision:**
```typescript
// Correct: Use Decimal for USD values
import { Decimal } from 'decimal.js';

const priceUsd = new Decimal(apiPrice).toDecimalPlaces(8);
const costBasis = amount.times(priceUsd);
```

### 5. Security Review

**Input Validation:**
- [ ] All user inputs validated
- [ ] xpub/address format validation
- [ ] SQL injection prevention (parameterized)
- [ ] XSS prevention (React escaping)

**Authentication:**
- [ ] Protected routes check session
- [ ] API routes verify JWT
- [ ] No sensitive data in client components

**Data Exposure:**
- [ ] No private keys ever (xpubs only)
- [ ] User data filtered by user_id
- [ ] Error messages don't leak internals

### 6. Performance

**Database Queries:**
- [ ] Indexed columns used in WHERE
- [ ] Pagination for large datasets
- [ ] No N+1 queries

**React Patterns:**
- [ ] Memoization where beneficial
- [ ] Proper dependency arrays
- [ ] No unnecessary re-renders

### 7. Error Handling

```typescript
// Correct: Specific error handling
try {
  const result = await syncWallet(walletId);
  return { success: true, data: result };
} catch (error) {
  if (error instanceof RateLimitError) {
    return { success: false, error: 'API rate limited, retry later' };
  }
  if (error instanceof InvalidXpubError) {
    return { success: false, error: 'Invalid xpub format' };
  }
  // Log unexpected errors, return generic message
  console.error('Wallet sync failed:', error);
  return { success: false, error: 'Sync failed' };
}
```

## Review Output Format

### Summary
[2-3 sentence overview of the changes]

### Critical Issues (Must Fix)
- **[CRITICAL-1]** [Issue description]
  - Location: `file:line`
  - Problem: [What's wrong]
  - Fix: [How to fix]

### High Priority
- **[HIGH-1]** [Issue description]

### Suggestions
- **[SUGGEST-1]** [Optional improvement]

### Positive Notes
- [What was done well]

---

## SatsAt-Specific Concerns

Always verify:

1. **Cost basis accuracy** - Any code touching tax calculations must be mathematically correct
2. **UTXO integrity** - Bitcoin outputs must be properly tracked
3. **Internal transfer detection** - Moves between own wallets shouldn't create taxable events
4. **Multisig handling** - 2-of-3 wallet = one wallet, not three addresses
5. **Historical price lookup** - Prices must match transaction dates exactly
