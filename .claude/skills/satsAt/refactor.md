---
name: satsAt:refactor
description: This skill should be used when the user asks to 'refactor', 'clean up code', 'restructure', 'improve code quality', or mentions 'code smell'. It guides safe refactoring with verification steps for SatsAt.
version: 1.0.0
---

# Safe Refactoring

You are guiding a refactoring effort for SatsAt. For a financial application, refactoring must preserve behavior exactly - especially cost basis calculations.

## Refactoring Philosophy

### Golden Rules

1. **Never change behavior** - Refactoring improves structure, not function
2. **Small steps** - Each change should be independently verifiable
3. **Tests first** - Have tests before refactoring; run after each change
4. **One thing at a time** - Don't mix refactoring with feature work

### For SatsAt Specifically

**Critical paths that need extra caution:**
- Cost basis calculations (FIFO, LIFO, HIFO)
- Internal transfer detection
- Tax lot creation/disposal
- UTXO tracking
- Balance calculations

**Before refactoring any of these:** Write comprehensive tests if they don't exist.

---

## Refactoring Process

### Phase 1: Preparation

**1. Ensure test coverage:**

```bash
# Check current coverage
npm test -- --coverage

# Focus on the module being refactored
npm test -- --coverage --collectCoverageFrom='src/lib/tax/**/*.ts'
```

**2. Identify scope:**

```markdown
## Refactoring Scope

**Target:** [file/module/function]
**Reason:** [why refactor - tech debt, performance, readability]
**Risk level:** [Low/Medium/High based on criticality]

**Behavior to preserve:**
- [ ] [Behavior 1]
- [ ] [Behavior 2]

**Not changing:**
- [ ] [Related code staying the same]
```

**3. Create baseline:**

```bash
# Create a branch
git checkout -b refactor/[module-name]

# Run tests and save output
npm test > baseline-results.txt 2>&1
```

### Phase 2: Refactoring

**Work in small, verifiable steps:**

1. Make one small change
2. Run tests
3. Commit if passing
4. Repeat

**Example commit sequence:**

```
refactor(cost-basis): extract lot selection into separate function
refactor(cost-basis): rename variables for clarity
refactor(cost-basis): convert to async/await from promises
refactor(cost-basis): add type annotations
```

### Phase 3: Verification

**1. Run full test suite:**

```bash
npm test
```

**2. Compare outputs:**

```bash
npm test > new-results.txt 2>&1
diff baseline-results.txt new-results.txt
```

**3. Manual verification for critical paths:**

```typescript
// For cost basis changes, verify with known data
const result = await calculateDisposal({
  amount: '0.5',
  method: 'FIFO',
  lots: [
    { amount: '0.3', cost_basis: 10000, date: '2024-01-01' },
    { amount: '0.4', cost_basis: 15000, date: '2024-02-01' },
  ]
});

// Expected: Uses all of lot 1 (0.3) + 0.2 from lot 2
// Cost basis: 10000 + (0.2/0.4 * 15000) = 17500
console.assert(result.totalCostBasis === 17500);
```

### Phase 4: Review & Merge

```bash
# Ensure clean history
git log --oneline -10

# PR with refactoring label
gh pr create --title "refactor(module): [description]" --label "refactoring"
```

---

## Common Refactoring Patterns

### Extract Function

**Before:**

```typescript
async function calculateTax(userId: string, year: number) {
  // 50 lines of lot fetching
  const lots = await supabase.from('tax_lots')...
  // ... filtering, sorting ...

  // 50 lines of calculation
  let totalGain = 0;
  for (const lot of lots) {
    // ... complex calculation ...
  }

  return { totalGain };
}
```

**After:**

```typescript
async function calculateTax(userId: string, year: number) {
  const lots = await fetchDisposedLots(userId, year);
  const summary = calculateGainSummary(lots);
  return summary;
}

async function fetchDisposedLots(userId: string, year: number): Promise<TaxLot[]> {
  // Extracted lot fetching logic
}

function calculateGainSummary(lots: TaxLot[]): TaxSummary {
  // Extracted calculation logic
}
```

### Rename for Clarity

**Before:**

```typescript
function calc(t: any[], m: string) {
  const s = t.filter(x => !x.d);
  // ...
}
```

**After:**

```typescript
function calculateDisposal(
  taxLots: TaxLot[],
  method: CostBasisMethod
): DisposalResult {
  const availableLots = taxLots.filter(lot => !lot.is_disposed);
  // ...
}
```

### Replace Magic Numbers

**Before:**

```typescript
if (holdingDays > 365) {
  lot.is_long_term = true;
}

if (user.wallets.length >= 3) {
  return 'limit_reached';
}
```

**After:**

```typescript
const ONE_YEAR_DAYS = 365;
const FREE_TIER_WALLET_LIMIT = 3;

if (holdingDays > ONE_YEAR_DAYS) {
  lot.is_long_term = true;
}

if (user.wallets.length >= FREE_TIER_WALLET_LIMIT) {
  return 'limit_reached';
}
```

### Simplify Conditionals

**Before:**

```typescript
function getTaxRate(lot: TaxLot): number {
  if (lot.is_disposed) {
    if (lot.is_long_term) {
      if (lot.gain_loss > 0) {
        return 0.15;
      } else {
        return 0;
      }
    } else {
      if (lot.gain_loss > 0) {
        return 0.37;
      } else {
        return 0;
      }
    }
  }
  return 0;
}
```

**After:**

```typescript
function getTaxRate(lot: TaxLot): number {
  if (!lot.is_disposed || lot.gain_loss <= 0) {
    return 0;
  }

  return lot.is_long_term
    ? LONG_TERM_CAPITAL_GAINS_RATE
    : SHORT_TERM_CAPITAL_GAINS_RATE;
}
```

### Replace Promise Chains with Async/Await

**Before:**

```typescript
function syncWallet(walletId: string) {
  return getWallet(walletId)
    .then(wallet => fetchTransactions(wallet.xpub))
    .then(txs => parseTransactions(txs))
    .then(parsed => saveTransactions(walletId, parsed))
    .then(() => updateSyncStatus(walletId, 'complete'))
    .catch(err => {
      updateSyncStatus(walletId, 'error', err.message);
      throw err;
    });
}
```

**After:**

```typescript
async function syncWallet(walletId: string): Promise<void> {
  try {
    const wallet = await getWallet(walletId);
    const rawTxs = await fetchTransactions(wallet.xpub);
    const parsedTxs = await parseTransactions(rawTxs);
    await saveTransactions(walletId, parsedTxs);
    await updateSyncStatus(walletId, 'complete');
  } catch (error) {
    await updateSyncStatus(walletId, 'error', error.message);
    throw error;
  }
}
```

---

## High-Risk Refactoring Checklist

For changes to critical financial logic:

### Before Starting

- [ ] 100% test coverage on target code
- [ ] Tests include edge cases (empty, max values, precision)
- [ ] Tests verified against known correct outputs
- [ ] Baseline test output saved
- [ ] Branch created from main

### During Refactoring

- [ ] Changes made in small commits
- [ ] Tests run after each commit
- [ ] No functional changes mixed in
- [ ] Types preserved or improved

### Before Merging

- [ ] All tests pass
- [ ] Test output matches baseline
- [ ] Manual verification with test data
- [ ] PR reviewed by another developer
- [ ] No production incidents related to this code recently

### After Merging

- [ ] Monitor error rates
- [ ] Verify calculations in production
- [ ] Ready to rollback if needed

---

## Code Smells to Address

### In SatsAt Codebase

| Smell | Example | Refactoring |
|-------|---------|-------------|
| Long function | `syncWallet()` > 100 lines | Extract functions |
| Duplicate code | Same validation in 3 places | Extract to utility |
| Magic numbers | `365`, `100000000` | Named constants |
| Deep nesting | 4+ levels of if/for | Early returns, extract |
| Any types | `: any` in TypeScript | Proper type definitions |
| God component | `Dashboard.tsx` > 500 lines | Split into components |
| Large file | Any file > 400 lines | Split by responsibility |

### Priority Order

1. **Safety first:** Fix any code that could cause wrong calculations
2. **Readability:** Make code easier to understand
3. **Performance:** Optimize if measured bottleneck
4. **Consistency:** Align with codebase patterns

---

## When NOT to Refactor

- During active incident
- Right before major release
- Without tests in place
- When you don't understand the code
- Mixed with feature development (separate PRs)
