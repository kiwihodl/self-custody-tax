# PRD: Multi-Client Dashboard (Phase 9)

**Status:** Draft
**Author:** Self Custody Tax Team
**Created:** January 11, 2026
**Last Updated:** January 11, 2026
**Target Tier:** Advisor ($499/year)
**Dependencies:** Phase 8 (Public API) recommended but not required

---

## 1. Overview

### Problem Statement

CPAs and wealth managers serving multiple Bitcoin clients currently have no way to manage them efficiently. Each client requires:
- Separate login
- Manual report generation
- Individual data review
- No consolidated view

Competitors like Ledgible, CryptoTaxCalculator, and CoinTracker offer CPA portals with multi-client management. Our Advisor tier promises this but doesn't deliver.

### Proposed Solution

Build a multi-client dashboard that allows Advisor tier users to:
- Invite and link client accounts
- View all clients from one dashboard
- Bulk generate reports
- Switch between client views seamlessly
- Maintain audit trail of advisor actions

### Goals

1. **Single pane of glass** - Advisor sees all clients in one view
2. **Efficient workflows** - Bulk operations for common tasks
3. **Secure delegation** - Permission-based access to client data
4. **Audit compliance** - Full log of advisor actions

### Non-Goals

- Client management (creating accounts on behalf) - clients self-register
- Full account impersonation - advisors see data, not settings
- Pricing per client - included in Advisor tier
- Team features - single advisor account per subscription

---

## 2. User Stories

### Primary User: CPA/Tax Professional

**Story 1: Client Onboarding**
As a CPA, I want to invite my clients to link their accounts so that I can view their portfolio data.

**Acceptance Criteria:**
- [ ] Given I'm on the advisor dashboard, when I click "Invite Client", then I see an invitation form
- [ ] Given I enter a client email, when I send the invitation, then the client receives an email with accept link
- [ ] Given a client accepts, when they confirm, then they appear in my client list with "Active" status

**Story 2: Portfolio Overview**
As a wealth manager, I want to see all client portfolios at a glance so that I can quickly identify who needs attention.

**Acceptance Criteria:**
- [ ] Given I have 10 linked clients, when I view the dashboard, then I see all 10 with key metrics
- [ ] Given a client hasn't synced in 30 days, when I view the dashboard, then I see a warning indicator
- [ ] Given I filter by tax year, when I select 2025, then I see 2025-specific data for all clients

**Story 3: Bulk Report Generation**
As a CPA at tax time, I want to generate all client reports at once so that I can deliver them efficiently.

**Acceptance Criteria:**
- [ ] Given I select multiple clients, when I click "Generate Reports", then all reports are queued
- [ ] Given reports are generating, when I view progress, then I see status for each client
- [ ] Given all reports complete, when I click "Download All", then I get a ZIP with all reports

**Story 4: Client Data Review**
As a tax professional, I want to review a specific client's data so that I can verify accuracy before filing.

**Acceptance Criteria:**
- [ ] Given I click on a client, when I enter their view, then I see their dashboard as they would
- [ ] Given I'm viewing a client, when I make changes (if permitted), then changes are logged
- [ ] Given I'm done reviewing, when I click "Back to Advisor", then I return to my dashboard

---

## 3. Requirements

### Functional Requirements

| ID | Requirement | Priority | Notes |
|----|-------------|----------|-------|
| FR-1 | Client invitation system | Must Have | Email-based invitation flow |
| FR-2 | Client acceptance flow | Must Have | Client confirms link |
| FR-3 | Advisor dashboard with client list | Must Have | /advisor/dashboard |
| FR-4 | Client status indicators | Must Have | Sync status, warnings |
| FR-5 | Client filtering and search | Must Have | By name, status, tax year |
| FR-6 | Client view switching | Must Have | View client data as advisor |
| FR-7 | Permission levels (view/manage) | Must Have | Granular access control |
| FR-8 | Bulk sync all clients | Should Have | Single action to sync all |
| FR-9 | Bulk report generation | Should Have | Generate multiple at once |
| FR-10 | Bulk export (ZIP) | Should Have | Download all reports |
| FR-11 | Advisor action audit log | Should Have | Track all actions |
| FR-12 | Client removal/revocation | Must Have | Client or advisor can unlink |
| FR-13 | AUM summary across clients | Nice to Have | Total assets managed |
| FR-14 | Client notes | Nice to Have | Advisor can add notes |

### Non-Functional Requirements

| ID | Requirement | Target |
|----|-------------|--------|
| NFR-1 | Dashboard load time | < 2s for 50 clients |
| NFR-2 | Invitation delivery | < 30 seconds |
| NFR-3 | Bulk report generation | Handle 20 concurrent |
| NFR-4 | Audit log retention | 7 years (tax compliance) |

---

## 4. User Experience

### Invitation Flow

1. Advisor clicks "Invite Client" on dashboard
2. Enters client email and optional note
3. System sends branded invitation email
4. Client receives email with "Accept Invitation" button
5. Client logs in (or registers) and confirms link
6. Advisor sees client appear with "Active" status

### Dashboard Layout

```
┌─────────────────────────────────────────────────────────────────┐
│  Advisor Dashboard                          [Invite Client]     │
├─────────────────────────────────────────────────────────────────┤
│  AUM: $2.4M across 12 clients     Last synced: 5 min ago       │
├─────────────────────────────────────────────────────────────────┤
│  Filter: [All ▼]  [2025 ▼]  [Search...]         [Bulk Actions ▼]│
├─────────────────────────────────────────────────────────────────┤
│  Client          | Wallets | Balance    | Status  | Actions     │
│  ─────────────────────────────────────────────────────────────  │
│  John Smith      | 3       | $450,000   | ✓ Synced | [View]     │
│  Jane Doe        | 5       | $1,200,000 | ✓ Synced | [View]     │
│  Bob Wilson      | 2       | $89,000    | ⚠ Stale  | [View]     │
│  ...                                                            │
└─────────────────────────────────────────────────────────────────┘
```

### Client View Mode

- Top banner shows "Viewing as: John Smith" with "Exit" button
- All navigation shows client's data
- Settings and billing are hidden
- Edit actions require "manage" permission
- All actions logged to audit trail

### Edge Cases

- **Client declines invitation:** Invitation expires after 7 days, advisor notified
- **Client revokes access:** Advisor loses access immediately, notified via email
- **Advisor removes client:** Client notified, can re-invite later
- **Client deletes account:** Automatically removed from advisor's list
- **Duplicate invitation:** Show error "Already invited" or "Already linked"

---

## 5. Technical Considerations

### Database Schema

```sql
-- Advisor-Client relationship
CREATE TABLE public.advisor_clients (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  advisor_id UUID NOT NULL REFERENCES public.user_profiles(id) ON DELETE CASCADE,
  client_id UUID REFERENCES public.user_profiles(id) ON DELETE CASCADE,
  client_email TEXT NOT NULL,  -- For pending invitations
  permission_level TEXT DEFAULT 'view' CHECK (permission_level IN ('view', 'manage')),
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'active', 'revoked')),
  invitation_token TEXT,  -- For accepting invitation
  invitation_expires_at TIMESTAMPTZ,
  invited_at TIMESTAMPTZ DEFAULT NOW(),
  accepted_at TIMESTAMPTZ,
  revoked_at TIMESTAMPTZ,
  revoked_by TEXT,  -- 'advisor' or 'client'
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),

  UNIQUE(advisor_id, client_email)
);

-- Audit log for advisor actions
CREATE TABLE public.advisor_audit_log (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  advisor_id UUID NOT NULL REFERENCES public.user_profiles(id),
  client_id UUID REFERENCES public.user_profiles(id),
  action TEXT NOT NULL,  -- 'view_dashboard', 'generate_report', 'edit_transaction', etc.
  details JSONB,
  ip_address INET,
  user_agent TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- RLS Policies
ALTER TABLE public.advisor_clients ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.advisor_audit_log ENABLE ROW LEVEL SECURITY;

-- Advisors can see their own client links
CREATE POLICY "Advisors can manage their clients"
  ON public.advisor_clients
  FOR ALL
  USING (auth.uid() = advisor_id);

-- Clients can see and revoke their advisor links
CREATE POLICY "Clients can see their advisor links"
  ON public.advisor_clients
  FOR SELECT
  USING (auth.uid() = client_id);

CREATE POLICY "Clients can revoke advisor access"
  ON public.advisor_clients
  FOR UPDATE
  USING (auth.uid() = client_id)
  WITH CHECK (status = 'revoked');

-- Allow advisors to read client data (wallets, transactions, etc.)
-- This requires updating existing RLS policies with advisor access
```

### Modified RLS Policies

Existing tables need updated policies to allow advisor access:

```sql
-- Wallets: Allow advisor access to linked clients
CREATE POLICY "Advisors can view linked client wallets"
  ON public.wallets
  FOR SELECT
  USING (
    auth.uid() = user_id OR
    EXISTS (
      SELECT 1 FROM public.advisor_clients ac
      WHERE ac.advisor_id = auth.uid()
      AND ac.client_id = wallets.user_id
      AND ac.status = 'active'
    )
  );

-- Similar policies for transactions, tax_lots, etc.
```

### File Structure

```
src/
├── app/
│   ├── advisor/
│   │   ├── page.tsx                  # Redirect to dashboard
│   │   ├── dashboard/
│   │   │   └── page.tsx              # Main advisor dashboard
│   │   ├── clients/
│   │   │   ├── page.tsx              # Client list
│   │   │   ├── invite/
│   │   │   │   └── page.tsx          # Invite flow
│   │   │   └── [id]/
│   │   │       └── page.tsx          # View client (as advisor)
│   │   └── reports/
│   │       └── page.tsx              # Bulk report generation
│   └── accept-invitation/
│       └── [token]/
│           └── page.tsx              # Client accepts link
├── lib/
│   └── advisor/
│       ├── clients.ts                # Client management logic
│       ├── permissions.ts            # Permission checking
│       └── audit.ts                  # Audit logging
├── components/
│   └── advisor/
│       ├── client-list.tsx           # Client table
│       ├── client-card.tsx           # Client summary card
│       ├── invite-modal.tsx          # Invitation form
│       ├── bulk-actions.tsx          # Bulk operations
│       └── advisor-banner.tsx        # "Viewing as" banner
└── emails/
    └── advisor-invitation.tsx        # Invitation email template
```

### Invitation Email

```html
Subject: [Advisor Name] has invited you to connect on Self Custody Tax

Hi [Client Name],

[Advisor Name] ([advisor@firm.com]) has invited you to connect your
Self Custody Tax account with their advisor dashboard.

By accepting, [Advisor Name] will be able to:
- View your wallet balances and transactions
- Generate tax reports on your behalf
- Review your portfolio data

You remain in full control and can revoke access at any time.

[Accept Invitation]

This invitation expires in 7 days.

If you don't have an account, you'll be prompted to create one.
```

### Session Management

When advisor views a client:
1. Store `viewing_client_id` in session/cookie
2. All data queries check for this context
3. Audit log entry created on switch
4. Banner displays client name
5. Exit button clears context

---

## 6. Success Metrics

### Key Metrics

| Metric | Current Baseline | Target | How to Measure |
|--------|-----------------|--------|----------------|
| Advisors with linked clients | 0 | 80% of Advisor users | Count active links |
| Average clients per advisor | 0 | 5+ | Links per advisor |
| Bulk report usage | N/A | 50% of advisors | Track bulk actions |
| Client link retention | N/A | 90% stay linked | Track revocations |

### Definition of Done

- [ ] Invitation flow complete
- [ ] Client acceptance flow working
- [ ] Advisor dashboard functional
- [ ] Client view switching works
- [ ] Bulk operations functional
- [ ] Audit logging complete
- [ ] RLS policies updated
- [ ] Email templates created
- [ ] Tests for permission logic

---

## 7. Phases

### Phase 1: Core Infrastructure

**Deliverables:**
- Database schema and migrations
- Invitation system
- Client acceptance flow
- Basic advisor dashboard with client list

### Phase 2: Client View Mode

**Deliverables:**
- View client data as advisor
- Permission enforcement
- Audit logging
- "Viewing as" banner

### Phase 3: Bulk Operations

**Deliverables:**
- Bulk sync
- Bulk report generation
- ZIP export
- Progress tracking

### Phase 4: Polish

**Deliverables:**
- Client notes
- AUM summary
- Advanced filtering
- Status notifications

---

## 8. Open Questions

- [ ] Should clients be able to choose permission level (view-only vs full access)?
- [ ] Maximum clients per advisor? (Suggest unlimited for $499/year)
- [ ] Should we notify clients when advisor views their data?
- [ ] Do we need a client-side view of connected advisors?
- [ ] Should bulk reports have a daily limit?

---

## Appendix

### Competitor Features

| Feature | Ledgible | CryptoTaxCalculator | CoinTracker | Recap |
|---------|----------|---------------------|-------------|-------|
| Multi-client dashboard | Yes | Yes | Limited | Yes |
| Client invitation | Yes | Yes | No | Yes |
| Bulk reports | Yes | Yes | No | Yes |
| Permission levels | Yes | No | N/A | No |
| Audit log | Yes | No | N/A | No |
| Free for accountants | No | Yes | No | Yes |

### SEO Keywords

- crypto tax software for cpas
- bitcoin tax accountant portal
- multi-client crypto tax management
- wealth manager crypto reporting
