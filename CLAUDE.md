# Claude Code Configuration for Self Custody Tax

This file defines how Claude should approach work on the Self Custody Tax project.

---

## Project Overview

**Name:** Self Custody Tax (formerly IronLedger)
**Purpose:** Bitcoin and stablecoin portfolio tracker for serious self-custody users
**Differentiator:** Multisig-native, UTXO-level cost basis, internal transfer detection
**Stack:** Next.js 14, TypeScript, Supabase, Tailwind CSS, Vercel

---

## Required Skill Invocation

Before taking action, Claude MUST invoke the appropriate skill based on the task type. Reference `skills.md` for the full list.

### Workflow Phase → Required Skills

```
PLANNING
├── New feature request     → /sct:prd + /sct:product
├── Architecture decision   → /sct:adr
└── Sprint planning         → /sct:workflow

DEVELOPMENT
├── Starting work           → /sct:onboarding (if unfamiliar)
├── Database changes        → /sct:db-design
├── Code implementation     → (standard development)
└── Refactoring            → /sct:refactor

REVIEW
├── Code review            → /sct:code-review
├── Security check         → /sct:security
├── Accessibility check    → /sct:accessibility
└── Test planning          → /sct:test-plan

DEPLOYMENT
├── Pre-deploy             → /sct:deploy (pre-checks)
├── Deploy                 → /sct:deploy (execution)
└── Post-deploy            → /sct:deploy (verification)

OPERATIONS
├── Production incident    → /sct:incident
├── Tech debt review       → /sct:tech-debt
└── Documentation          → /sct:docs

GROWTH
└── Marketing/content      → /sct:marketing
```

---

## Automatic Skill Triggers

Invoke skills automatically when these patterns are detected:

| User Says | Invoke |
|-----------|--------|
| "new feature", "add feature", "implement" | `/sct:prd` first |
| "deploy", "push to prod", "release" | `/sct:deploy` |
| "review", "PR", "pull request" | `/sct:code-review` |
| "security", "audit", "vulnerabilities" | `/sct:security` |
| "refactor", "clean up", "restructure" | `/sct:refactor` |
| "test", "testing", "QA" | `/sct:test-plan` |
| "database", "schema", "migration" | `/sct:db-design` |
| "incident", "down", "broken in prod" | `/sct:incident` |
| "document", "docs", "README" | `/sct:docs` |
| "marketing", "SEO", "content" | `/sct:marketing` |
| "why did we", "decision", "ADR" | `/sct:adr` |
| "tech debt", "TODOs", "cleanup" | `/sct:tech-debt` |

---

## Critical Rules

### Financial Accuracy
- Cost basis calculations are TAX-CRITICAL
- Always use BigNumber for crypto amounts (never native floats)
- Test cost basis changes with known inputs/outputs before merge
- Reference `/sct:refactor` before modifying tax calculation code

### Security First
- NEVER store private keys - xpubs only
- All tables MUST have RLS policies (reference `/sct:security`)
- Validate all xpub inputs before storage
- No secrets in code or git

### Quality Gates
Before any deployment, verify:
- [ ] `npm run build` passes
- [ ] `npm run lint` passes
- [ ] `npm test` passes
- [ ] No `any` types in new code
- [ ] RLS policies exist for new tables

---

## Key Files

| File | Purpose |
|------|---------|
| `ROADMAP.md` | Full technical spec and business plan |
| `skills.md` | Quick reference for all skills |
| `.claude/skills/satsAt/*.md` | Detailed skill implementations |

---

## Development Phases (from ROADMAP.md)

### Phase 1: Foundation
- [ ] Next.js + Supabase setup
- [ ] Authentication
- [ ] Bitcoin wallet (xpub import)
- [ ] Transaction sync from Mempool.space
- [ ] Basic dashboard

### Phase 2: Core Features
- [ ] Cost basis tracking (FIFO)
- [ ] Tax lot creation/disposal
- [ ] Historical prices (CoinGecko)
- [ ] Tax summary page
- [ ] 8949 report export

### Phase 3: Differentiators
- [ ] Multisig wallet support
- [ ] Internal transfer detection
- [ ] LIFO/HIFO methods
- [ ] Unrealized gains view

### Phase 4: Stablecoins
- [ ] Ethereum wallet type
- [ ] USDT/USDC tracking (Etherscan)
- [ ] Combined portfolio view

### Phase 5: Polish & Launch
- [ ] Exchange CSV import
- [ ] Stripe subscriptions
- [ ] Onboarding wizard
- [ ] Documentation
- [ ] Beta launch

---

## Naming Convention

**Project:** Self Custody Tax
**Skills prefix:** `sct:`
**Domain:** satsat.io (or similar)
**Tagline:** "Portfolio tracking for serious Bitcoiners"

All branding should use "Self Custody Tax" (capital S, capital A).
