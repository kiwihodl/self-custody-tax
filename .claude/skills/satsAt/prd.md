---
name: satsAt:prd
description: This skill should be used when the user asks to 'create a PRD', 'write requirements', 'spec this feature', 'document requirements', or mentions 'product requirements'. It creates comprehensive Product Requirements Documents for SatsAt features.
version: 1.0.0
---

# Product Requirements Document

You are creating a PRD for a SatsAt feature. Follow this structured approach to ensure clear, actionable requirements.

## PRD Process

### Step 1: Gather Context

Ask these questions (skip any already answered):

1. **What problem are we solving?**
   - Who has this problem?
   - How painful is it?
   - How are they solving it today?

2. **What is the proposed solution?**
   - High-level description
   - Why this approach?

3. **Who are the users?**
   - Primary user segment (Holder, Sovereign, Advisor?)
   - Technical level assumed

4. **What are the constraints?**
   - Timeline
   - Technical limitations
   - Dependencies

5. **How will we measure success?**
   - Key metrics
   - Definition of done

### Step 2: Generate PRD

---

## PRD Template

```markdown
# PRD: [Feature Name]

**Status:** Draft | In Review | Approved | In Development | Shipped
**Author:** [Name]
**Created:** [Date]
**Last Updated:** [Date]

---

## 1. Overview

### Problem Statement
[2-3 sentences describing the problem clearly. Who has it? Why does it matter?]

### Proposed Solution
[2-3 sentences describing the solution at a high level]

### Goals
1. [Primary goal - what MUST this achieve]
2. [Secondary goal]
3. [Tertiary goal]

### Non-Goals
- [What this feature explicitly will NOT do]
- [Scope boundaries to prevent creep]

---

## 2. User Stories

### Primary User: [Persona]

**US-1: [Title]**
As a [user type], I want to [action] so that [benefit].

**Acceptance Criteria:**
- [ ] Given [context], when [action], then [result]
- [ ] Given [context], when [action], then [result]

**US-2: [Title]**
...

---

## 3. Requirements

### Functional Requirements

| ID | Requirement | Priority | Notes |
|----|-------------|----------|-------|
| FR-1 | [Requirement description] | Must Have | |
| FR-2 | [Requirement description] | Should Have | |
| FR-3 | [Requirement description] | Nice to Have | |

### Non-Functional Requirements

| ID | Requirement | Target | Notes |
|----|-------------|--------|-------|
| NFR-1 | Performance | [e.g., Sync < 30s for 1000 txs] | |
| NFR-2 | Security | [e.g., RLS on all tables] | |
| NFR-3 | Accessibility | [e.g., WCAG 2.1 AA] | |

---

## 4. User Experience

### User Flow
1. User navigates to [page/screen]
2. User performs [action]
3. System responds with [behavior]
4. User sees [result]

### Wireframes/Mockups
[Link to designs or description of key screens]

### Edge Cases
- **Empty state:** [What shows when no data]
- **Error state:** [What shows on failure]
- **Loading state:** [What shows while processing]
- **Limit reached:** [What happens at tier limits]

---

## 5. Technical Approach

### Data Model Changes
[New tables, columns, or relationships]

```sql
-- Example: New table or column
ALTER TABLE wallets ADD COLUMN multisig_config JSONB;
```

### API Changes
[New endpoints or modifications]

```typescript
// POST /api/wallets/:id/sync
interface SyncRequest {
  force?: boolean;
}
```

### Dependencies
- [External API needed: e.g., Mempool.space]
- [Library needed: e.g., bitcoinjs-lib]
- [Feature dependency: e.g., Requires wallet sync first]

### Technical Risks
| Risk | Likelihood | Impact | Mitigation |
|------|------------|--------|------------|
| [Risk description] | Low/Med/High | Low/Med/High | [Mitigation strategy] |

---

## 6. Security Considerations

- [ ] No private keys required
- [ ] RLS policies defined
- [ ] Input validation specified
- [ ] Audit logging needed?

---

## 7. Testing Strategy

### Test Cases

| ID | Scenario | Expected Result | Priority |
|----|----------|-----------------|----------|
| TC-1 | [Happy path] | [Expected] | P0 |
| TC-2 | [Edge case] | [Expected] | P1 |
| TC-3 | [Error case] | [Expected] | P1 |

### Regression Impact
[What existing features might be affected?]

---

## 8. Launch Plan

### Rollout Strategy
- [ ] Feature flag for gradual rollout?
- [ ] Beta testing with specific users?
- [ ] Immediate release to all?

### Success Metrics
| Metric | Current | Target | How to Measure |
|--------|---------|--------|----------------|
| [Metric name] | [Baseline] | [Goal] | [Method] |

### Monitoring
- [ ] Error tracking configured
- [ ] Performance monitoring
- [ ] User feedback mechanism

---

## 9. Open Questions

- [ ] [Unresolved question that needs input]
- [ ] [Decision that needs stakeholder approval]

---

## 10. Appendix

### Related Documents
- [Link to technical spec]
- [Link to designs]
- [Link to ADR]

### Changelog
| Date | Author | Change |
|------|--------|--------|
| [Date] | [Name] | Initial draft |
```

---

## PRD Examples for SatsAt

### Example: Multisig Wallet Support

**Problem:** Users with 2-of-3 or 3-of-5 multisig wallets cannot accurately track their holdings. Generic tools treat each key's view as a separate wallet.

**Solution:** Native multisig support that understands quorum configurations and tracks the wallet as a single entity.

**User Story:**
As a Sovereign user with a 2-of-3 multisig, I want to add my wallet using any of the three xpubs so that I can track my holdings accurately.

**Acceptance Criteria:**
- Given I have a 2-of-3 multisig, when I add any of the xpubs, then the system recognizes it as one wallet
- Given a multisig wallet, when I view transactions, then I see consolidated history
- Given a multisig wallet, when I generate a tax report, then it treats all addresses as one entity

---

### Example: Internal Transfer Detection

**Problem:** Moving Bitcoin between your own wallets shows up as a taxable sale in most tools, creating phantom gains/losses.

**Solution:** Automatic detection of transfers between user's own wallets, with manual override capability.

**User Story:**
As a Holder with multiple wallets, I want internal transfers auto-detected so that I don't have false taxable events.

**Acceptance Criteria:**
- Given I have wallets A and B, when I move BTC from A to B, then it's marked as internal transfer
- Given an internal transfer, when I generate a tax report, then it's excluded from disposals
- Given a misclassified transaction, when I manually toggle internal flag, then it updates accordingly

---

## Quality Checklist

Before finalizing a PRD:

- [ ] Problem is clearly articulated
- [ ] Solution addresses the problem
- [ ] User stories have acceptance criteria
- [ ] Requirements are prioritized
- [ ] Edge cases documented
- [ ] Security considered
- [ ] Testing strategy defined
- [ ] Open questions listed
- [ ] No assumptions left unstated
