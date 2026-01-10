# SatsAt Skills Reference

Quick reference for all available Claude Code skills. Invoke with `/satsAt:<skill-name>`.

---

## Planning & Strategy

| Skill | When to Use |
|-------|-------------|
| `/satsAt:prd` | Writing requirements for a new feature |
| `/satsAt:product` | Prioritizing features, simplifying scope |
| `/satsAt:workflow` | Understanding the development process |
| `/satsAt:adr` | Documenting architectural decisions |

## Development

| Skill | When to Use |
|-------|-------------|
| `/satsAt:onboarding` | Getting familiar with the codebase |
| `/satsAt:db-design` | Creating or modifying Supabase schema |
| `/satsAt:code-review` | Reviewing code before merge |
| `/satsAt:refactor` | Restructuring code safely |

## Quality & Testing

| Skill | When to Use |
|-------|-------------|
| `/satsAt:test-plan` | Planning test coverage |
| `/satsAt:security` | Auditing for vulnerabilities |
| `/satsAt:accessibility` | Checking WCAG compliance |
| `/satsAt:tech-debt` | Identifying and tracking debt |

## Operations

| Skill | When to Use |
|-------|-------------|
| `/satsAt:deploy` | Deploying to Vercel production |
| `/satsAt:incident` | Responding to production issues |
| `/satsAt:docs` | Generating documentation |

## Growth

| Skill | When to Use |
|-------|-------------|
| `/satsAt:marketing` | SEO, content, conversion optimization |

---

## Skill Details

### `/satsAt:prd`
Creates Product Requirements Documents with user stories, acceptance criteria, edge cases, and success metrics. Use before starting any feature.

### `/satsAt:product`
Jobs/Wozniak-style product thinking. Helps simplify features, cut scope, and focus on user value. "Plan twice, execute once."

### `/satsAt:workflow`
Defines the 6-phase development process: Discovery → Planning → Approval → Implementation → Review → Deploy.

### `/satsAt:adr`
Architecture Decision Records. Documents why we chose Supabase, UTXO-level tracking, etc. Use for decisions that are hard to reverse.

### `/satsAt:onboarding`
New developer guide. Covers tech stack, project structure, data models, key algorithms (cost basis, internal transfer detection).

### `/satsAt:db-design`
Supabase/PostgreSQL schema design with RLS policies, proper indexing, and JSONB patterns for multisig configs.

### `/satsAt:code-review`
Systematic code review for TypeScript, Next.js patterns, Supabase security, BigNumber precision for crypto amounts.

### `/satsAt:refactor`
Safe refactoring process. Critical for cost basis code - ensures tests exist before changes, verifies behavior preservation.

### `/satsAt:test-plan`
Test case generation. Covers happy paths, edge cases (empty wallet, 1000+ txs), and critical financial calculations.

### `/satsAt:security`
OWASP Top 10 + Bitcoin-specific security. Validates xpub-only storage, RLS policies, no private keys ever.

### `/satsAt:accessibility`
WCAG compliance for financial data tables, keyboard navigation, screen reader support, color contrast.

### `/satsAt:tech-debt`
Identifies TODOs, `any` types, outdated deps, large files. Prioritizes by business impact and risk.

### `/satsAt:deploy`
Full Vercel deployment workflow with pre-checks (build, lint, test), deploy commands, post-verification, and rollback.

### `/satsAt:incident`
Production incident response. Severity levels, communication templates, post-mortem format.

### `/satsAt:docs`
Generates API docs, README, user guides, architecture diagrams, CHANGELOG.

### `/satsAt:marketing`
SEO keywords, brand voice, competitor analysis, content templates for Bitcoin portfolio tracking niche.
