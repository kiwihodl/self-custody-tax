---
name: satsAt:tech-debt
description: This skill should be used when the user asks to 'identify tech debt', 'code quality audit', 'find TODOs', 'outdated dependencies', or mentions 'technical debt'. It identifies, documents, and prioritizes technical debt in SatsAt.
version: 1.0.0
---

# Technical Debt Tracker

You are helping identify, document, and prioritize technical debt in SatsAt. Proactive debt management prevents future incidents and maintains code quality.

## Types of Technical Debt

| Type | Description | Examples |
|------|-------------|----------|
| **Code Debt** | Poor code quality | Duplication, complexity, poor naming |
| **Architecture Debt** | Structural issues | Tight coupling, missing abstractions |
| **Test Debt** | Missing coverage | No tests, flaky tests, incomplete coverage |
| **Documentation Debt** | Missing/outdated docs | No README, stale API docs |
| **Dependency Debt** | Outdated packages | Security vulns, deprecated APIs |
| **Infrastructure Debt** | Operations issues | Manual deploys, no monitoring |

---

## Debt Discovery Commands

### Find TODO/FIXME Comments

```bash
# Search for debt markers
grep -rn "TODO\|FIXME\|HACK\|XXX\|TEMP\|OPTIMIZE" \
  --include="*.ts" --include="*.tsx" \
  src/

# Count by type
grep -rc "TODO" --include="*.ts" --include="*.tsx" src/ | grep -v ":0"
grep -rc "FIXME" --include="*.ts" --include="*.tsx" src/ | grep -v ":0"
grep -rc "HACK" --include="*.ts" --include="*.tsx" src/ | grep -v ":0"
```

### Find Large/Complex Files

```bash
# Files by line count (complexity indicator)
find src -name "*.ts" -o -name "*.tsx" | xargs wc -l | sort -n | tail -20

# Files with many functions (potentially needs splitting)
grep -l "function\|const.*=.*=>" src/**/*.ts | xargs wc -l | sort -n
```

### Check Dependency Health

```bash
# Security vulnerabilities
npm audit

# Outdated packages
npm outdated

# Check for deprecated packages
npx depcheck
```

### Find Duplicate Code

```bash
# Install jscpd if needed
npm install -g jscpd

# Run duplicate detection
jscpd src/ --min-lines 5 --min-tokens 50
```

### TypeScript Quality

```bash
# Find 'any' types (type safety debt)
grep -rn ": any" --include="*.ts" --include="*.tsx" src/

# Find type assertions (potential issues)
grep -rn "as any\|as unknown" --include="*.ts" --include="*.tsx" src/

# Run strict type check
npx tsc --noEmit --strict
```

---

## Priority Scoring Matrix

Score each debt item on these factors:

| Factor | Weight | 1 (Low) | 2 (Medium) | 3 (High) |
|--------|--------|---------|------------|----------|
| **Business Impact** | 3x | Rarely affects users | Sometimes affects users | Frequently affects users |
| **Development Drag** | 2x | Minor slowdown | Noticeable slowdown | Major blocker |
| **Risk** | 2x | Low risk | Moderate risk | High risk (security/data) |
| **Effort** | 1x (subtract) | Quick fix | Sprint-size | Major project |

**Priority Score = (Impact × 3) + (Drag × 2) + (Risk × 2) - (Effort × 1)**

Higher score = higher priority

**Example Scoring:**

```
DEBT-001: No tests for cost basis calculation
- Business Impact: 3 (tax accuracy critical) = 9
- Development Drag: 2 (hard to refactor safely) = 4
- Risk: 3 (high - financial accuracy) = 6
- Effort: 2 (sprint-size) = -2

Priority Score: 9 + 4 + 6 - 2 = 17 (HIGH PRIORITY)
```

---

## Debt Item Template

```markdown
## Debt Item: [DEBT-XXX] [Title]

**Type:** [Code/Architecture/Test/Documentation/Dependency/Infrastructure]
**Location:** [file:line or component/system]
**Discovered:** [date]
**Owner:** [who should fix]

### Description
[What is the debt and why does it exist?]

### Current Impact
- **Development velocity:** [How it slows development]
- **Reliability:** [Risk of bugs/outages]
- **Security:** [Vulnerability exposure]
- **User experience:** [How it affects users]

### Root Cause
[Why did this happen? Time pressure? Knowledge gap? Changed requirements?]

### Remediation Plan
[How to fix it - high level approach]

### Effort Estimate
[T-shirt size: XS/S/M/L/XL]

### Priority Score
[Calculated score] - [HIGH/MEDIUM/LOW]

### Related Issues
- [Link to related tickets]
- [Link to related debt items]
```

---

## SatsAt-Specific Debt Categories

### Critical Debt (Fix Immediately)

1. **Security vulnerabilities in dependencies**
2. **Missing RLS policies on tables**
3. **Cost basis calculation without tests**
4. **Hard-coded secrets in code**

### High Priority Debt

1. **Missing input validation on xpubs**
2. **No retry logic for external API calls**
3. **Missing error boundaries in React**
4. **Incomplete type safety (any usage)**

### Medium Priority Debt

1. **Large component files needing split**
2. **Duplicate sync logic**
3. **Missing loading states**
4. **No API documentation**

### Low Priority Debt

1. **Inconsistent naming conventions**
2. **Missing JSDoc comments**
3. **Console.log statements in production**
4. **Unused imports/variables**

---

## Debt Tracking Dashboard

```markdown
# Technical Debt Dashboard

**Last Updated:** [date]
**Total Items:** [count]
**Critical:** [count] | **High:** [count] | **Medium:** [count] | **Low:** [count]

## Critical Items (Fix This Sprint)

| ID | Title | Type | Score | Status |
|----|-------|------|-------|--------|
| DEBT-001 | No tests for cost basis | Test | 17 | 🔴 Open |
| DEBT-002 | npm audit high severity | Dependency | 15 | 🟡 In Progress |

## Upcoming (Next Sprint)

| ID | Title | Type | Score |
|----|-------|------|-------|
| DEBT-003 | Large WalletSync component | Code | 12 |
| DEBT-004 | Missing API rate limiting | Architecture | 11 |

## Backlog

| ID | Title | Type | Score |
|----|-------|------|-------|
| DEBT-005 | Inconsistent error handling | Code | 8 |
| DEBT-006 | No API documentation | Documentation | 6 |

## Recently Resolved

| ID | Title | Resolved Date |
|----|-------|---------------|
| DEBT-007 | Outdated Next.js version | 2024-01-15 |
```

---

## Debt Prevention Practices

### During Code Review

Ask:
- Does this introduce new debt?
- Is there a TODO that should be a ticket?
- Are tests included?
- Is the code well-documented?

### During Sprint Planning

- Reserve 10-20% capacity for debt reduction
- Include one debt item per sprint minimum
- Don't accumulate more debt than you pay down

### Debt Budgeting

| Sprint Velocity | Debt Allocation | Debt Items/Sprint |
|-----------------|-----------------|-------------------|
| 20 points | 4 points (20%) | 1-2 items |
| 40 points | 6 points (15%) | 2-3 items |

---

## Automated Debt Detection

### Pre-commit Hook

```bash
# .husky/pre-commit
#!/bin/sh

# Prevent new any types
if grep -r ": any" --include="*.ts" --include="*.tsx" $(git diff --cached --name-only); then
  echo "Warning: New 'any' type added. Consider proper typing."
fi

# Check for console.log
if grep -r "console.log" --include="*.ts" --include="*.tsx" $(git diff --cached --name-only); then
  echo "Warning: console.log detected. Remove before production."
fi
```

### CI Pipeline Check

```yaml
# GitHub Actions
- name: Debt Check
  run: |
    # Fail if critical vulnerabilities
    npm audit --audit-level=critical

    # Warn on TODOs in new code
    git diff origin/main --name-only | xargs grep -l "TODO\|FIXME" || true
```

---

## Quarterly Debt Review

Every quarter, conduct a debt review:

1. **Inventory:** List all known debt
2. **Score:** Re-score based on current impact
3. **Prioritize:** Rank by score
4. **Plan:** Assign to upcoming sprints
5. **Retrospect:** What debt was created? Why?
