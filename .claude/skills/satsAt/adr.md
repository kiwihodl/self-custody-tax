---
name: satsAt:adr
description: This skill should be used when the user asks to 'document a decision', 'architecture decision', 'ADR', 'why did we choose', or mentions 'technical decision'. It creates Architecture Decision Records to document important technical decisions for SatsAt.
version: 1.0.0
---

# Architecture Decision Record (ADR)

You are creating an ADR to document an important technical decision for SatsAt. ADRs capture context, options considered, and rationale for future reference.

## When to Write an ADR

Write an ADR for decisions that:

- **Are hard to reverse** (architectural choices)
- **Affect multiple parts of the system** (cross-cutting concerns)
- **Have long-term implications** (framework, database, patterns)
- **Were debated significantly** (multiple valid options)
- **Future developers would ask "why?"** (non-obvious choices)

### Examples for SatsAt

**Should have ADR:**
- Choice of Supabase over Prisma/custom auth
- UTXO-level vs wallet-level cost basis
- FIFO/LIFO/HIFO algorithm implementation
- Internal transfer detection approach
- Historical price data source

**Doesn't need ADR:**
- Which button color to use
- Minor refactoring choices
- Standard library usage

---

## ADR Template

```markdown
# ADR-[XXX]: [Title]

**Status:** [Proposed | Accepted | Deprecated | Superseded by ADR-XXX]
**Date:** [YYYY-MM-DD]
**Decision makers:** [Names]

## Context

[2-3 paragraphs describing the situation that requires a decision]

- What problem are we solving?
- What constraints do we have?
- What triggered this decision?

## Decision Drivers

- [Driver 1: e.g., "Must calculate cost basis accurately"]
- [Driver 2: e.g., "Should support 10,000+ transactions per user"]
- [Driver 3: e.g., "Team has limited Rust experience"]
- [Driver 4: e.g., "Budget constraint for external services"]

## Considered Options

### Option 1: [Option Name]

[Description of this option - how would it work?]

**Pros:**
- [Pro 1]
- [Pro 2]

**Cons:**
- [Con 1]
- [Con 2]

**Effort:** [Low/Medium/High]
**Risk:** [Low/Medium/High]

---

### Option 2: [Option Name]

[Description]

**Pros:**
- [Pro 1]

**Cons:**
- [Con 1]

**Effort:** [Low/Medium/High]
**Risk:** [Low/Medium/High]

---

### Option 3: [Option Name]
...

## Decision

**Chosen option:** [Option Name]

[1-2 paragraphs explaining WHY this option was chosen over others]

## Consequences

### Positive
- [Positive consequence 1]
- [Positive consequence 2]

### Negative
- [Negative consequence 1 - trade-off we're accepting]
- [Mitigation strategy if applicable]

### Neutral
- [Neutral impact]

## Follow-up Actions

- [ ] [Action item 1]
- [ ] [Action item 2]
- [ ] Schedule review in [X months]

## Related Decisions

- ADR-XXX: [Related decision]
- [External resource link]
```

---

## SatsAt ADR Examples

### ADR-001: Database and Auth Platform

```markdown
# ADR-001: Use Supabase for Database and Authentication

**Status:** Accepted
**Date:** 2024-01-15
**Decision makers:** Ben

## Context

SatsAt needs a database for storing user portfolios, transactions, and tax calculations. We also need authentication. Options range from fully managed (Firebase, Supabase) to self-hosted (PostgreSQL + custom auth).

Key requirements:
- PostgreSQL for complex queries (tax calculations)
- Row Level Security for multi-tenant isolation
- Real-time updates for sync status
- Easy auth with email/password

## Decision Drivers

- Must have PostgreSQL (complex financial queries)
- Need Row Level Security (user data isolation)
- Prefer managed service (reduce ops burden)
- Budget-conscious for early stage

## Considered Options

### Option 1: Supabase

Full PostgreSQL database with built-in auth, RLS, and real-time.

**Pros:**
- Native PostgreSQL with RLS
- Built-in auth (email, OAuth)
- Real-time subscriptions
- Generous free tier
- TypeScript SDK

**Cons:**
- Vendor lock-in risk
- Less control than self-hosted

**Effort:** Low
**Risk:** Low

### Option 2: PlanetScale + NextAuth

MySQL-compatible with separate auth.

**Pros:**
- Excellent scaling
- Branching for migrations

**Cons:**
- No native RLS
- MySQL, not PostgreSQL
- Two services to manage

**Effort:** Medium
**Risk:** Medium

### Option 3: Self-hosted PostgreSQL + Custom Auth

Full control with self-managed infrastructure.

**Pros:**
- Complete control
- No vendor lock-in

**Cons:**
- Significant ops burden
- Security responsibility
- Time to market impact

**Effort:** High
**Risk:** High

## Decision

**Chosen option:** Supabase

Supabase provides the best balance of PostgreSQL features (critical for cost basis queries), built-in RLS (critical for security), and managed infrastructure (critical for speed to market). The generous free tier supports our MVP phase.

## Consequences

### Positive
- Fast development with batteries-included auth
- Native RLS for security
- Real-time for sync status updates

### Negative
- Some vendor lock-in (mitigated by standard PostgreSQL)
- Must stay within Supabase pricing tiers

## Follow-up Actions
- [ ] Set up Supabase project
- [ ] Configure RLS policies for all tables
- [ ] Review pricing as usage grows
```

---

### ADR-002: Cost Basis Tracking Granularity

```markdown
# ADR-002: UTXO-Level Cost Basis Tracking

**Status:** Accepted
**Date:** 2024-01-20
**Decision makers:** Ben

## Context

Bitcoin uses UTXOs (Unspent Transaction Outputs). When tracking cost basis for tax purposes, we must decide whether to track at the wallet level (simpler) or UTXO level (more accurate but complex).

For tax compliance, the IRS technically expects specific identification of lots disposed. Generic tools track at wallet level, creating inaccuracies when users consolidate UTXOs or make partial sends.

## Decision Drivers

- Tax accuracy is paramount (legal liability)
- Users have complex UTXO structures
- Differentiator vs competitors (Koinly, CoinTracker)
- Must support FIFO, LIFO, HIFO methods

## Considered Options

### Option 1: Wallet-Level Tracking

Track total balance per wallet, allocate cost basis proportionally.

**Pros:**
- Simpler implementation
- Faster queries
- Less storage

**Cons:**
- Less accurate for partial disposals
- Can't properly track UTXO consolidation
- Matches competitors (no differentiation)

**Effort:** Low
**Risk:** Low (technical), High (accuracy)

### Option 2: UTXO-Level Tracking

Track each UTXO as a separate tax lot with its own cost basis.

**Pros:**
- Maximum accuracy
- Proper specific identification
- True FIFO/LIFO/HIFO
- Major differentiator

**Cons:**
- More complex implementation
- More storage required
- Slower queries for large wallets

**Effort:** High
**Risk:** Medium (complexity)

## Decision

**Chosen option:** UTXO-Level Tracking

Despite higher implementation complexity, UTXO-level tracking is essential for our differentiator position and tax accuracy. Users with multisig and complex setups (our target market) benefit most from this precision.

## Consequences

### Positive
- Maximum tax accuracy
- True differentiator vs competitors
- Proper support for UTXO consolidation

### Negative
- More complex codebase
- Higher storage requirements
- Longer sync times for large wallets

## Follow-up Actions
- [ ] Design TaxLot model with UTXO reference
- [ ] Implement FIFO algorithm with UTXO tracking
- [ ] Add UTXO view in transaction detail
```

---

## ADR Index

Maintain an index of all ADRs:

```markdown
# Architecture Decision Records

| ID | Title | Status | Date |
|----|-------|--------|------|
| ADR-001 | Use Supabase for Database and Auth | Accepted | 2024-01-15 |
| ADR-002 | UTXO-Level Cost Basis Tracking | Accepted | 2024-01-20 |
| ADR-003 | Historical Price Data Source | Accepted | 2024-01-25 |
| ADR-004 | Internal Transfer Detection Algorithm | Proposed | 2024-02-01 |
```

---

## ADR Best Practices

### Do
- Write ADRs before implementing
- Include context future readers need
- Document rejected alternatives
- Keep ADRs immutable (supersede, don't edit)
- Link related ADRs

### Don't
- Write ADRs for trivial decisions
- Edit accepted ADRs (create new ones)
- Skip the "Consequences" section
- Forget to update the index
- Make ADRs too long (1-2 pages max)

### Review Schedule

Set calendar reminders to review ADRs:
- 3 months: Is the decision still valid?
- 6 months: Any unexpected consequences?
- 12 months: Should this be superseded?
