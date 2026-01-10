---
name: satsAt:workflow
description: This skill should be used when the user asks about 'workflow', 'process', 'how do we work', 'development process', or mentions 'planning workflow'. It defines the planning and approval workflow for SatsAt development.
version: 1.0.0
---

# Development Workflow

You are following the SatsAt development workflow. This ensures quality, alignment, and systematic progress on features.

## Workflow Overview

```
┌─────────────┐    ┌─────────────┐    ┌─────────────┐
│  Discovery  │ →  │  Planning   │ →  │  Approval   │
└─────────────┘    └─────────────┘    └─────────────┘
                          │
                          ▼
┌─────────────┐    ┌─────────────┐    ┌─────────────┐
│   Deploy    │ ←  │   Review    │ ←  │Implementation│
└─────────────┘    └─────────────┘    └─────────────┘
```

---

## Phase 1: Discovery

**Goal:** Understand the problem and gather requirements

### Activities

1. **Problem definition**
   - What user problem are we solving?
   - Who is affected?
   - How painful is it?

2. **Research**
   - How do competitors solve this?
   - What patterns exist in our codebase?
   - What dependencies/APIs are needed?

3. **Scope clarification**
   - What's in scope?
   - What's explicitly out of scope?
   - What are the constraints?

### Output

```markdown
## Discovery Summary: [Feature Name]

**Problem:** [Clear problem statement]
**User:** [Who has this problem]
**Impact:** [Why it matters]

**Research Findings:**
- [Finding 1]
- [Finding 2]

**Open Questions:**
- [ ] [Question needing answer]
```

### Exit Criteria

- [ ] Problem clearly defined
- [ ] User segment identified
- [ ] Initial scope understood
- [ ] Open questions documented

---

## Phase 2: Planning

**Goal:** Design the solution and create implementation plan

### Activities

1. **Create PRD** (use `/satsAt:prd`)
   - User stories with acceptance criteria
   - Technical approach
   - Edge cases
   - Success metrics

2. **Technical design**
   - Data model changes
   - API design
   - Component structure
   - Integration points

3. **Break into tasks**
   - Small, deployable increments
   - Dependencies identified
   - Estimates if needed

### Output

```markdown
## Implementation Plan: [Feature Name]

**PRD:** [Link to PRD]

**Tasks:**
1. [ ] [Task 1] - [brief description]
2. [ ] [Task 2] - [brief description]
3. [ ] [Task 3] - [brief description]

**Dependencies:**
- [Dependency 1]

**Risks:**
- [Risk 1]: [Mitigation]

**Testing Strategy:**
- [How we'll verify correctness]
```

### Exit Criteria

- [ ] PRD complete and reviewed
- [ ] Technical approach agreed
- [ ] Tasks broken down
- [ ] Risks identified

---

## Phase 3: Approval

**Goal:** Get alignment before implementation

### Approval Checklist

**For Small Changes (< 1 day):**
- [ ] Self-review of plan
- [ ] No architectural changes
- [ ] Tests planned

**For Medium Changes (1-3 days):**
- [ ] PRD reviewed
- [ ] Technical approach validated
- [ ] Edge cases considered

**For Large Changes (3+ days):**
- [ ] Full PRD with stakeholder review
- [ ] ADR if architectural decision
- [ ] Phased rollout plan

### Approval Format

```markdown
## Approval Request: [Feature Name]

**Summary:** [One sentence]
**Size:** [Small/Medium/Large]
**PRD:** [Link]

**What I'm proposing:**
[Brief description of approach]

**What I need approval on:**
- [Decision point 1]
- [Decision point 2]

**Risks:**
- [Main risk and mitigation]

Ready to proceed? [Yes/No with feedback]
```

### Exit Criteria

- [ ] Plan reviewed
- [ ] Approach approved
- [ ] Concerns addressed

---

## Phase 4: Implementation

**Goal:** Build the feature with quality

### Development Flow

```bash
# 1. Create branch
git checkout -b feature/[name]

# 2. Implement in small commits
git commit -m "feat(scope): implement [part]"

# 3. Run tests frequently
npm test

# 4. Self-review before PR
git diff main
```

### Commit Convention

```
<type>(<scope>): <description>

Types:
- feat: New feature
- fix: Bug fix
- refactor: Code restructuring
- docs: Documentation
- test: Tests
- chore: Maintenance

Example:
feat(wallets): add multisig wallet support
fix(tax): correct FIFO calculation for partial lots
```

### Quality Gates

- [ ] TypeScript compiles (`npm run type-check`)
- [ ] Linting passes (`npm run lint`)
- [ ] Tests pass (`npm test`)
- [ ] No console.logs in production code
- [ ] New code has test coverage

### Exit Criteria

- [ ] Feature complete per PRD
- [ ] All acceptance criteria met
- [ ] Tests written and passing
- [ ] Self-reviewed

---

## Phase 5: Review

**Goal:** Validate quality and correctness

### Code Review Checklist

Use `/satsAt:code-review` for detailed review.

**Reviewer checks:**
- [ ] Matches PRD requirements
- [ ] Code is readable
- [ ] No security issues
- [ ] Tests are meaningful
- [ ] Edge cases handled

### PR Format

```markdown
## [Feature Name]

**PRD:** [Link]

### Summary
[What this PR does]

### Changes
- [Change 1]
- [Change 2]

### Testing
- [ ] Unit tests added
- [ ] Manual testing done
- [ ] Edge cases verified

### Screenshots
[If UI changes]
```

### Exit Criteria

- [ ] PR approved
- [ ] All comments addressed
- [ ] CI passes
- [ ] Ready to merge

---

## Phase 6: Deploy

**Goal:** Ship to production safely

Use `/satsAt:deploy` for detailed deployment process.

### Pre-Deploy

```bash
npm run build
npm run lint
npm test
```

### Deploy

```bash
git checkout main
git pull
git merge feature/[name]
git push origin main
vercel --prod --yes
```

### Post-Deploy Verification

- [ ] Site loads
- [ ] Feature works as expected
- [ ] No new errors in logs
- [ ] Metrics normal

### Rollback Plan

```bash
vercel rollback
```

### Exit Criteria

- [ ] Deployed successfully
- [ ] Verified working
- [ ] Monitoring in place

---

## Workflow Variations

### Bug Fix (Urgent)

```
Report → Investigate → Fix → Test → Deploy
(Skip formal planning for critical bugs)
```

### Hotfix (Production Issue)

```
Detect → Stabilize → Fix → Deploy → Post-mortem
(Use /satsAt:incident)
```

### Refactoring

```
Identify → Test Coverage → Refactor → Verify → Deploy
(Use /satsAt:refactor)
```

### Exploration/Spike

```
Question → Time-boxed Research → Document Findings
(No deployment, just learning)
```

---

## Communication Templates

### Starting Work

```
Starting: [Feature Name]
PRD: [Link]
ETA: [Date]
```

### Blocked

```
Blocked on: [Feature Name]
Blocker: [What's blocking]
Need: [What would unblock]
```

### Completed

```
Completed: [Feature Name]
PR: [Link]
Deployed: [Yes/No]
Notes: [Any relevant info]
```

---

## Tools & Resources

| Purpose | Tool |
|---------|------|
| Code | VS Code / Cursor |
| Version Control | Git + GitHub |
| CI/CD | Vercel |
| Database | Supabase |
| Planning | Claude Code skills |
| Documentation | Markdown in repo |

---

## Workflow Principles

1. **Plan before coding** - Avoid rework
2. **Small increments** - Ship often, validate early
3. **Quality over speed** - Especially for financial code
4. **Document decisions** - Future you will thank you
5. **Automate verification** - Tests, linting, type checking
