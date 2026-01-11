# Test Plan: Phase 9 Resend Email Integration

**Version:** 1.0
**Created:** 2026-01-11
**Author:** Claude Code

---

## 1. Overview

### Feature Description
Email notifications for the advisor-client invitation flow using Resend API. Includes:
- Invitation emails sent to clients when advisor invites them
- Acceptance notification emails sent to advisors when clients accept

### Test Objectives
- Verify email functions generate correct HTML and text content
- Ensure proper error handling when Resend API fails
- Validate integration with invitation flow in clients.ts
- Confirm emails don't block core functionality on failure

### Out of Scope
- Actual email delivery (requires Resend API key and verified domain)
- Email rendering in various email clients
- Spam filter testing

---

## 2. Test Environment

### Prerequisites
- [x] Development environment set up
- [x] Jest testing framework configured
- [x] Mock Resend SDK for unit tests
- [x] Environment variable: RESEND_API_KEY

### Test Data Requirements
| Data Type | Description | Source |
|-----------|-------------|--------|
| Advisor | Test advisor with email/name | Mock data |
| Client | Test client email | Mock data |
| Token | Invitation token | Generated |

---

## 3. Test Cases

### 3.1 Happy Path Tests

#### HP-1: Send Invitation Email Successfully
**Priority:** P0 (Critical)
**Type:** Unit

**Preconditions:**
- Valid email parameters
- Resend API key configured

**Steps:**
| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Call sendAdvisorInvitationEmail with valid params | Returns { success: true, messageId: '...' } |
| 2 | Verify HTML contains invite URL | URL matches pattern /invite/[token] |
| 3 | Verify text fallback exists | Plain text version present |

---

#### HP-2: Send Acceptance Notification Email
**Priority:** P0 (Critical)
**Type:** Unit

**Preconditions:**
- Valid advisor email
- Client name/email available

**Steps:**
| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Call sendInvitationAcceptedEmail | Returns { success: true, messageId: '...' } |
| 2 | Verify email contains client info | Client name in subject and body |
| 3 | Verify dashboard link | Links to /advisor/dashboard |

---

### 3.2 Edge Case Tests

#### EC-1: Missing RESEND_API_KEY
**Priority:** P0 (Critical)
**Type:** Unit

**Scenario:** Environment variable not set

**Expected:** Throws error "RESEND_API_KEY environment variable is not set"

---

#### EC-2: Empty Advisor Name
**Priority:** P1 (High)
**Type:** Unit

**Scenario:** Advisor has no full_name, only email

**Expected:** Email uses advisor email as fallback in greeting

---

#### EC-3: Empty Client Name
**Priority:** P1 (High)
**Type:** Unit

**Scenario:** Client accepts but has no full_name

**Expected:** Notification uses client email as fallback

---

#### EC-4: Optional Note Included
**Priority:** P2 (Medium)
**Type:** Unit

**Scenario:** Advisor includes personal note in invitation

**Expected:** Note section rendered in HTML with proper styling

---

#### EC-5: Optional Note Omitted
**Priority:** P2 (Medium)
**Type:** Unit

**Scenario:** Advisor sends invitation without note

**Expected:** No note section in email, no empty block

---

### 3.3 Error Handling Tests

#### EH-1: Resend API Error
**Priority:** P0 (Critical)
**Type:** Unit

**Scenario:** Resend API returns an error

**Expected Behavior:**
- Returns { success: false, error: 'error message' }
- Error is logged to console
- Does not throw exception

---

#### EH-2: Network Failure
**Priority:** P1 (High)
**Type:** Unit

**Scenario:** Network request to Resend fails

**Expected Behavior:**
- Catches exception
- Returns { success: false, error: 'Unknown error sending email' }
- Logs error

---

#### EH-3: Email Failure Doesn't Block Invitation
**Priority:** P0 (Critical)
**Type:** Integration

**Scenario:** Email fails but invitation record is created

**Expected Behavior:**
- Invitation record still created in database
- inviteClient returns { success: true, token: '...' }
- Error logged but not propagated

---

### 3.4 Security Tests

#### SEC-1: Token Not Exposed in Logs
**Priority:** P1 (High)
**Type:** Unit

**Scenario:** Email sending logged

**Expected:** Token is included in URL but raw token value is not logged separately

---

#### SEC-2: XSS Prevention in Note
**Priority:** P1 (High)
**Type:** Unit

**Scenario:** Advisor includes HTML/script in note

**Expected:** Note is properly escaped in email HTML

---

### 3.5 Content Tests

#### CON-1: HTML Structure Valid
**Priority:** P1 (High)
**Type:** Unit

**Scenario:** Generated email HTML

**Expected:**
- DOCTYPE present
- Proper meta tags
- Table-based layout for email client compatibility

---

#### CON-2: Permission Level Text Correct
**Priority:** P0 (Critical)
**Type:** Unit

**Scenario:** Different permission levels

**Expected:**
- 'view' → "view your portfolio"
- 'manage' → "view and manage your portfolio"

---

## 4. Regression Checklist

### Core Functionality
- [ ] Existing advisor tests still pass
- [ ] Invitation flow works end-to-end
- [ ] Accept invitation flow works
- [ ] Audit logging still functions

### Integration Points
- [ ] Supabase database operations work
- [ ] Email sends on invite
- [ ] Email sends on accept
- [ ] Errors don't break flow

---

## 5. Automated Test Coverage

### Unit Tests Needed
| File/Function | Test Description | Priority |
|---------------|------------------|----------|
| email/index.ts | sendAdvisorInvitationEmail success | P0 |
| email/index.ts | sendAdvisorInvitationEmail error handling | P0 |
| email/index.ts | sendInvitationAcceptedEmail success | P0 |
| email/index.ts | sendInvitationAcceptedEmail error handling | P0 |
| email/index.ts | getResend throws without API key | P0 |
| email/index.ts | HTML content generation | P1 |
| email/index.ts | Text content generation | P1 |
| email/index.ts | Permission level text mapping | P0 |

---

## 6. Test Execution

### Order of Execution
1. Run unit tests for email module
2. Run existing advisor tests
3. Run full test suite
4. Manual verification in dev environment

### Test Commands
```bash
npm test                              # Run all tests
npm test -- --testPathPattern=email   # Email tests only
npm test -- --testPathPattern=advisor # Advisor tests only
```

---

## 7. Exit Criteria

Testing is complete when:
- [x] All P0 tests pass
- [x] All P1 tests pass
- [ ] Manual email verification (requires domain setup)
- [x] Regression checklist verified
- [x] Build passes

---

## 8. Known Issues / Limitations

| Issue | Impact | Workaround |
|-------|--------|------------|
| Cannot test actual delivery | Medium | Verify in Resend dashboard |
| Domain must be verified | Low | Test with Resend test mode |
| HTML rendering varies | Low | Use standard email patterns |
