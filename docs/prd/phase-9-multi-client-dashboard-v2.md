# PRD: Multi-Client Dashboard (Phase 9) - Enhanced

**Status:** Final
**Author:** Self Custody Tax Team
**Created:** January 11, 2026
**Last Updated:** January 11, 2026
**Target Tier:** Advisor ($499/year)
**Dependencies:** Phase 8 (Public API) - completed

---

## 1. Overview

### Problem Statement

CPAs, tax professionals, and wealth managers serving multiple Bitcoin/crypto clients face significant inefficiencies:
- Each client requires separate login credentials and manual context switching
- No consolidated portfolio view across all managed clients
- Report generation is one-by-one, taking hours during tax season
- No audit trail of advisor actions (compliance risk)
- Limited visibility into which clients need attention (stale data, missing imports)

Competitors like Ledgible ($99/client), Koinly ($59-69/license), and CoinTracker offer multi-client features but with notable pain points:
- **Pricing opacity** - costs scale unpredictably with transaction volume
- **Limited automation** - bulk operations still require significant manual work
- **Poor DeFi/complex transaction handling** - 90% of automated reports overstate liability
- **Slow customer support** - premium tiers required for priority response
- **No self-custody focus** - generalist platforms miss Bitcoin-specific nuances

### Proposed Solution

Build a dedicated Advisor Dashboard within Self Custody Tax that enables:
- **Unified client management** from a single pane of glass
- **Email-based invitation system** with permission levels (view/manage)
- **Bulk operations** for syncing, report generation, and export
- **Complete audit trail** for all advisor actions (7-year retention for tax compliance)
- **Client health indicators** showing sync status, data quality, and attention needed
- **Seamless context switching** with "Viewing as [Client]" mode

**Competitive Differentiation:**
- Included in $499/year Advisor tier (unlimited clients, no per-client fees)
- Bitcoin/self-custody specialist focus vs. generalist competitors
- Full API access already included (competitors charge extra)
- Audit-ready from day one (unlike Koinly, CoinTracker)

### Goals

1. **Primary:** Enable advisors to manage 20+ clients efficiently from one dashboard
2. **Secondary:** Reduce report generation time by 80% via bulk operations
3. **Tertiary:** Provide audit-compliant action logging meeting IRS requirements

### Non-Goals

- **Team/staff accounts** - Single advisor per subscription (future Phase 11)
- **Client account creation** - Clients self-register, then link to advisor
- **Full impersonation** - Advisors see data, not settings/billing
- **Per-client pricing** - Unlimited clients included in tier
- **White-label branding** - Phase 10 covers this separately

---

## 2. User Stories

### Primary User: Sarah the CPA

**Persona:** Sarah runs a small CPA firm specializing in crypto taxation. She manages 35 Bitcoin clients, ranging from HODLers with simple wallets to active traders with multiple hardware wallets.

**Story 1: Client Onboarding**
As Sarah, I want to invite new clients via email so they can securely link their accounts without sharing credentials.

**Acceptance Criteria:**
- [ ] Given I'm on /advisor/dashboard, when I click "Invite Client", then I see an invitation form
- [ ] Given I enter a client's email, when I submit, then the client receives a branded email within 30 seconds
- [ ] Given the client clicks "Accept", when they log in, then they see a confirmation page explaining what access they're granting
- [ ] Given the client confirms, when I refresh my dashboard, then they appear with "Active" status
- [ ] Given 7 days pass without acceptance, when I check the invite, then it shows "Expired" with option to resend

**Story 2: Portfolio Health Overview**
As Sarah, I want to see all client portfolios at a glance so I can quickly identify who needs attention before tax filing.

**Acceptance Criteria:**
- [ ] Given I have 35 linked clients, when dashboard loads, then I see all 35 in under 2 seconds
- [ ] Given a client hasn't synced in 14+ days, when I view dashboard, then I see a yellow "Stale" warning
- [ ] Given a client has transactions needing review, when I view dashboard, then I see a red "Needs Attention" badge
- [ ] Given I filter by "Needs Attention", when I apply filter, then only problem clients appear
- [ ] Given I search "Smith", when results appear, then I see all clients with "Smith" in name or email

**Story 3: Bulk Report Generation**
As Sarah at tax time, I want to generate Form 8949 reports for all clients at once so I can deliver them efficiently.

**Acceptance Criteria:**
- [ ] Given I select 20 clients via checkboxes, when I click "Generate Reports", then all 20 are queued
- [ ] Given reports are processing, when I view status, then I see progress (0/20, 5/20, etc.)
- [ ] Given all reports complete, when I click "Download All", then I receive a ZIP file with all PDFs
- [ ] Given one report fails, when I view status, then I see which client failed and can retry individually
- [ ] Given I'm generating reports, when I navigate away, then generation continues in background

**Story 4: Client Data Review**
As Sarah, I want to review a specific client's transactions so I can verify accuracy before filing.

**Acceptance Criteria:**
- [ ] Given I click "View" on John Smith, when the page loads, then I see John's dashboard exactly as he would
- [ ] Given I'm viewing John's data, when I look at header, then I see "Viewing as: John Smith" banner with "Exit" button
- [ ] Given I have "manage" permission, when I edit a transaction category, then the change is saved and logged
- [ ] Given I have "view" permission, when I try to edit, then I see "Read-only access" message
- [ ] Given I click "Exit", when the page reloads, then I'm back on my advisor dashboard

**Story 5: Audit Trail Review**
As Sarah preparing for a potential audit, I want to see a log of all my actions on client accounts.

**Acceptance Criteria:**
- [ ] Given I navigate to /advisor/audit-log, when the page loads, then I see all my actions sorted by date
- [ ] Given I filter by client "John Smith", when I apply filter, then I see only actions on John's account
- [ ] Given I filter by action type "Report Generated", when I apply filter, then I see only report generations
- [ ] Given I view an action, when I click details, then I see timestamp, IP, and action specifics

---

### Secondary User: Mike the Client

**Story 6: Advisor Connection**
As Mike, I want to connect my CPA to my account so they can prepare my taxes without me sharing login credentials.

**Acceptance Criteria:**
- [ ] Given I receive an invitation email, when I click "Accept", then I'm taken to login/register page
- [ ] Given I'm logged in, when I see the confirmation, then I understand exactly what access I'm granting
- [ ] Given I confirm the link, when I check settings, then I see "Connected Advisors" showing Sarah's firm
- [ ] Given I want to revoke access, when I click "Revoke", then Sarah immediately loses access
- [ ] Given I revoke access, when Sarah tries to view my data, then she gets "Access Revoked" error

---

## 3. Requirements

### Functional Requirements

| ID | Requirement | Priority | Notes |
|----|-------------|----------|-------|
| FR-1 | Email-based client invitation system | Must Have | 7-day expiration, resend capability |
| FR-2 | Client acceptance flow with clear permission disclosure | Must Have | Shows exactly what access advisor gets |
| FR-3 | Advisor dashboard at /advisor/dashboard | Must Have | Client list with key metrics |
| FR-4 | Client status indicators (synced, stale, needs attention) | Must Have | Color-coded badges |
| FR-5 | Client search and filtering (name, email, status) | Must Have | Instant filtering |
| FR-6 | Permission levels: view-only vs manage | Must Have | Client chooses on acceptance |
| FR-7 | "Viewing as" client context mode | Must Have | Banner + scoped data access |
| FR-8 | Client revocation (by client or advisor) | Must Have | Immediate access removal |
| FR-9 | Bulk sync all clients | Should Have | Single-click sync queue |
| FR-10 | Bulk report generation with progress | Should Have | Queue + ZIP download |
| FR-11 | Advisor action audit log | Should Have | 7-year retention |
| FR-12 | Client notes (advisor-only) | Should Have | Private notes per client |
| FR-13 | AUM summary across all clients | Nice to Have | Total BTC, total USD |
| FR-14 | Client sorting (by name, balance, last sync) | Nice to Have | Column headers clickable |
| FR-15 | Duplicate invitation prevention | Must Have | Error if already invited/linked |

### Non-Functional Requirements

| ID | Requirement | Target |
|----|-------------|--------|
| NFR-1 | Dashboard load time | < 2 seconds for 50 clients |
| NFR-2 | Invitation email delivery | < 30 seconds |
| NFR-3 | Bulk report generation | 20 concurrent reports |
| NFR-4 | Audit log retention | 7 years (IRS compliance) |
| NFR-5 | Context switch time | < 500ms to enter/exit client view |
| NFR-6 | Mobile responsive | Dashboard usable on tablet |
| NFR-7 | Accessibility | WCAG 2.1 AA for dashboard |

---

## 4. User Experience

### Invitation Flow

```
Advisor Dashboard → "Invite Client" button
         ↓
   Modal: Enter email, permission level, optional note
         ↓
   Email sent to client (branded, clear CTA)
         ↓
   Client clicks "Accept Invitation"
         ↓
   Client logs in (or registers if new)
         ↓
   Confirmation page: "Grant access to [Advisor]?"
         ↓
   Client confirms → Appears in advisor's dashboard
```

### Dashboard Layout

```
┌─────────────────────────────────────────────────────────────────────────┐
│  🏢 Advisor Dashboard                              [Invite Client] btn  │
├─────────────────────────────────────────────────────────────────────────┤
│  📊 Portfolio Summary: 35 clients | $4.2M AUM | 127 BTC               │
│  Last sync: 5 min ago | 3 need attention                               │
├─────────────────────────────────────────────────────────────────────────┤
│  Filter: [All Status ▼] [2025 ▼] [Search...     ]    [Bulk Actions ▼]  │
├─────────────────────────────────────────────────────────────────────────┤
│  ☑ Client            | Wallets | Balance      | Status      | Actions  │
│  ─────────────────────────────────────────────────────────────────────  │
│  ☐ John Smith        | 3       | 2.5 BTC      | ✅ Synced    | [View]  │
│  ☐ Jane Doe          | 5       | 12.1 BTC     | ✅ Synced    | [View]  │
│  ☐ Bob Wilson        | 2       | 0.8 BTC      | ⚠️ Stale     | [View]  │
│  ☐ Alice Johnson     | 4       | 5.2 BTC      | 🔴 Attention | [View]  │
│  ☐ Charlie Brown     | 1       | 0.1 BTC      | ✅ Synced    | [View]  │
│  ...                                                                    │
├─────────────────────────────────────────────────────────────────────────┤
│  Showing 35 of 35 clients                          [← 1 2 3 ... →]     │
└─────────────────────────────────────────────────────────────────────────┘
```

### Client View Mode Banner

```
┌─────────────────────────────────────────────────────────────────────────┐
│  👁️ VIEWING AS: John Smith (john@example.com)           [Exit] button │
│  Permission: View Only | Connected since: Jan 1, 2026                  │
└─────────────────────────────────────────────────────────────────────────┘
```

### Edge Cases

| Scenario | Behavior |
|----------|----------|
| **Empty state (no clients)** | Show welcome message + prominent "Invite Your First Client" CTA |
| **Invitation already sent** | "Already invited - resend?" with last sent date |
| **Client already linked** | "Already connected" error, can't re-invite |
| **Client declines** | Remove from pending, advisor notified |
| **Client deletes account** | Auto-remove from advisor list, log event |
| **Advisor downgrades tier** | Clients retain data, advisor loses access until re-upgrade |
| **Bulk action partial failure** | Show success/fail count, list failures, offer retry |

---

## 5. Technical Considerations

### Database Schema

```sql
-- New table: advisor_clients
CREATE TABLE public.advisor_clients (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  advisor_id UUID NOT NULL REFERENCES public.user_profiles(id) ON DELETE CASCADE,
  client_id UUID REFERENCES public.user_profiles(id) ON DELETE CASCADE,
  client_email TEXT NOT NULL,
  permission_level TEXT DEFAULT 'view' CHECK (permission_level IN ('view', 'manage')),
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'active', 'revoked', 'expired')),
  invitation_token TEXT UNIQUE,
  invitation_expires_at TIMESTAMPTZ,
  invitation_note TEXT,
  advisor_notes TEXT, -- Private notes only advisor sees
  invited_at TIMESTAMPTZ DEFAULT NOW(),
  accepted_at TIMESTAMPTZ,
  revoked_at TIMESTAMPTZ,
  revoked_by TEXT CHECK (revoked_by IN ('advisor', 'client')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  UNIQUE(advisor_id, client_email)
);

-- New table: advisor_audit_log
CREATE TABLE public.advisor_audit_log (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  advisor_id UUID NOT NULL REFERENCES public.user_profiles(id) ON DELETE CASCADE,
  client_id UUID REFERENCES public.user_profiles(id) ON DELETE SET NULL,
  action TEXT NOT NULL,
  action_category TEXT NOT NULL, -- 'view', 'edit', 'report', 'sync', 'access'
  details JSONB,
  ip_address INET,
  user_agent TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_advisor_clients_advisor ON public.advisor_clients(advisor_id);
CREATE INDEX idx_advisor_clients_client ON public.advisor_clients(client_id);
CREATE INDEX idx_advisor_clients_token ON public.advisor_clients(invitation_token);
CREATE INDEX idx_advisor_clients_status ON public.advisor_clients(status);
CREATE INDEX idx_audit_log_advisor ON public.advisor_audit_log(advisor_id, created_at);
CREATE INDEX idx_audit_log_client ON public.advisor_audit_log(client_id, created_at);

-- RLS Policies
ALTER TABLE public.advisor_clients ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.advisor_audit_log ENABLE ROW LEVEL SECURITY;

-- Advisors can manage their client relationships
CREATE POLICY "Advisors manage own clients" ON public.advisor_clients
  FOR ALL USING (auth.uid() = advisor_id);

-- Clients can view and revoke their advisor links
CREATE POLICY "Clients view own advisor links" ON public.advisor_clients
  FOR SELECT USING (auth.uid() = client_id);

CREATE POLICY "Clients can revoke access" ON public.advisor_clients
  FOR UPDATE USING (auth.uid() = client_id)
  WITH CHECK (status = 'revoked' AND revoked_by = 'client');

-- Audit log: advisors see their own actions
CREATE POLICY "Advisors view own audit log" ON public.advisor_audit_log
  FOR SELECT USING (auth.uid() = advisor_id);

-- System inserts audit entries
CREATE POLICY "System inserts audit" ON public.advisor_audit_log
  FOR INSERT WITH CHECK (true);
```

### Modified RLS for Advisor Access

```sql
-- Update wallets policy to allow advisor access
DROP POLICY IF EXISTS "Users can view their own wallets" ON public.wallets;
CREATE POLICY "Users and advisors can view wallets" ON public.wallets
  FOR SELECT USING (
    auth.uid() = user_id
    OR EXISTS (
      SELECT 1 FROM public.advisor_clients ac
      WHERE ac.advisor_id = auth.uid()
      AND ac.client_id = wallets.user_id
      AND ac.status = 'active'
    )
  );

-- Similar policies for: transactions, tax_lots, wallet_addresses, etc.
```

### File Structure

```
src/
├── app/
│   ├── advisor/
│   │   ├── page.tsx                    # Redirect to dashboard
│   │   ├── layout.tsx                  # Advisor layout with tier check
│   │   ├── dashboard/
│   │   │   └── page.tsx                # Main advisor dashboard
│   │   ├── clients/
│   │   │   ├── page.tsx                # Full client list
│   │   │   ├── invite/
│   │   │   │   └── page.tsx            # Invitation form
│   │   │   └── [id]/
│   │   │       ├── page.tsx            # View client (context switch)
│   │   │       └── notes/
│   │   │           └── page.tsx        # Client notes
│   │   ├── reports/
│   │   │   └── page.tsx                # Bulk report generation
│   │   └── audit-log/
│   │       └── page.tsx                # Action history
│   ├── accept-invitation/
│   │   └── [token]/
│   │       └── page.tsx                # Client accepts link
│   └── settings/
│       └── advisors/
│           └── page.tsx                # Client view of connected advisors
├── lib/
│   └── advisor/
│       ├── clients.ts                  # CRUD for advisor_clients
│       ├── permissions.ts              # Permission checking
│       ├── audit.ts                    # Audit logging helper
│       ├── context.ts                  # Client context management
│       └── invitations.ts              # Invitation email logic
├── components/
│   └── advisor/
│       ├── client-table.tsx            # Sortable client table
│       ├── client-card.tsx             # Client summary card
│       ├── client-status-badge.tsx     # Status indicator
│       ├── invite-modal.tsx            # Invitation form modal
│       ├── bulk-actions-menu.tsx       # Bulk operations dropdown
│       ├── viewing-as-banner.tsx       # Context mode banner
│       └── audit-log-table.tsx         # Audit history display
└── api/
    └── advisor/
        ├── clients/
        │   ├── route.ts                # GET list, POST invite
        │   └── [id]/
        │       └── route.ts            # GET, PATCH, DELETE client
        ├── invite/
        │   └── [token]/
        │       └── accept/
        │           └── route.ts        # POST accept invitation
        ├── bulk/
        │   ├── sync/
        │   │   └── route.ts            # POST bulk sync
        │   └── reports/
        │       └── route.ts            # POST bulk report generation
        └── audit-log/
            └── route.ts                # GET audit entries
```

### Risks & Mitigations

| Risk | Likelihood | Impact | Mitigation |
|------|------------|--------|------------|
| RLS bypass allowing cross-client access | Low | Critical | Extensive testing, security audit |
| Bulk operations overwhelming server | Medium | Medium | Queue with rate limiting, background jobs |
| Invitation token brute-force | Low | High | Cryptographically random tokens, expiration |
| Audit log storage growth | Medium | Low | Partition by month, archive after 2 years |
| Client confusion about access granted | Medium | Medium | Clear confirmation page with bullet points |

---

## 6. Success Metrics

### Key Metrics

| Metric | Baseline | Target | Measurement |
|--------|----------|--------|-------------|
| Advisor tier users with 1+ client | 0% | 80% | Count active links |
| Avg clients per advisor | 0 | 10+ | Links / advisors |
| Bulk report usage | N/A | 60% of advisors | Track bulk actions |
| Client link retention (30 day) | N/A | 95% | Revocation rate |
| Time to generate 10 reports | 15 min (manual) | 2 min | User testing |
| Dashboard load time | N/A | < 2s | Performance monitoring |

### Definition of Done

- [ ] Invitation flow works end-to-end
- [ ] Client can accept and revoke access
- [ ] Advisor dashboard shows all clients with status
- [ ] "Viewing as" context mode works for all pages
- [ ] Bulk sync triggers for all selected clients
- [ ] Bulk report generation with ZIP download
- [ ] Audit log captures all advisor actions
- [ ] RLS policies tested with security scenarios
- [ ] Unit tests for permissions logic
- [ ] Integration tests for invitation flow
- [ ] Documentation for advisors

---

## 7. Implementation Phases

### Phase 9.1: Core Infrastructure
**Deliverables:**
- Database migration for advisor_clients and advisor_audit_log
- Updated RLS policies for advisor access
- Basic /advisor/dashboard page with client list
- Invitation system (send, accept, expire)
- Client revocation

**Dependencies:** Phase 8 API complete

### Phase 9.2: Client View Mode
**Deliverables:**
- Context switching ("Viewing as" mode)
- Permission enforcement (view vs manage)
- Audit logging for all actions
- "Viewing as" banner component

**Dependencies:** Phase 9.1

### Phase 9.3: Bulk Operations
**Deliverables:**
- Bulk client selection UI
- Bulk sync queue
- Bulk report generation
- ZIP download for multiple reports
- Progress tracking

**Dependencies:** Phase 9.2

### Phase 9.4: Polish & Enhancement
**Deliverables:**
- Client notes
- AUM summary
- Advanced filtering/sorting
- Audit log viewer
- Client-side "Connected Advisors" page

**Dependencies:** Phase 9.3

---

## 8. Open Questions

- [x] Maximum clients per advisor? → **Unlimited** (competitive advantage)
- [x] Should clients choose permission level? → **Yes**, on acceptance
- [ ] Notify clients when advisor views their data? → Propose: **No** (too noisy), but log everything
- [ ] Rate limit bulk operations? → Propose: **20 concurrent**, queue remainder
- [ ] Email service for invitations? → Need to confirm (Resend? Supabase built-in?)

---

## Appendix

### Competitive Analysis Summary

| Feature | Self Custody Tax | Ledgible | Koinly | CoinTracker |
|---------|-----------------|----------|--------|-------------|
| Multi-client dashboard | ✅ Included | ✅ $99/client | ✅ $59-69/license | ⚠️ Limited |
| Permission levels | ✅ View/Manage | ✅ Yes | ❌ No | ❌ No |
| Audit trail | ✅ 7-year | ✅ Yes | ❌ No | ❌ No |
| Bulk reports | ✅ Yes | ✅ Yes | ✅ Yes | ❌ No |
| API access | ✅ Included | ⚠️ Enterprise | ⚠️ Extra | ⚠️ Extra |
| Unlimited clients | ✅ Yes | ❌ Per-client | ❌ Per-license | ❌ Per-client |
| Self-custody focus | ✅ Core | ❌ General | ❌ General | ❌ General |

### Competitor Pain Points Addressed

1. **Pricing opacity** → Flat $499/year, unlimited clients
2. **No audit trail** → 7-year retention, IRS compliant
3. **Limited permissions** → View vs Manage choice
4. **Manual bulk work** → One-click bulk operations
5. **Slow support** → Self-serve with clear docs

### SEO Keywords
- crypto tax software for CPAs
- bitcoin tax professional dashboard
- multi-client crypto tax management
- CPA crypto tax portal
- self-custody tax reporting

### Research Sources
- [Ledgible Crypto Tax Pro | G2 Reviews](https://www.g2.com/products/ledgible-crypto-tax-pro/reviews)
- [Koinly for Accountants](https://koinly.io/accountant/)
- [CoinTracker Tax Professional Features](https://www.cointracker.io/)
- [Koinly Trustpilot Reviews](https://www.trustpilot.com/review/koinly.io)
- [Best Crypto Tax Software for CPAs 2026](https://cryptopotato.com/best-crypto-tax-software-for-cpas/)
