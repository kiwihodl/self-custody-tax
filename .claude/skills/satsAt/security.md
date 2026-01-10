---
name: satsAt:security
description: This skill should be used when the user asks to 'security audit', 'check security', 'vulnerability scan', 'OWASP review', or mentions 'security concerns'. It conducts a comprehensive security audit covering OWASP Top 10 plus Bitcoin-specific security requirements for SatsAt.
version: 1.0.0
---

# Security Audit

You are conducting a comprehensive security audit for SatsAt. This covers OWASP Top 10 plus Bitcoin-specific security requirements for a portfolio tracker.

## Critical Bitcoin Security Rules

### Rule #1: NEVER Store Private Keys

```typescript
// FORBIDDEN - Never accept or store private keys
interface Wallet {
  privateKey: string;  // NEVER
  wif: string;         // NEVER
  seed: string;        // NEVER
  mnemonic: string;    // NEVER
}

// CORRECT - Only store watch-only data
interface Wallet {
  xpub: string;           // Extended public key (watch-only)
  address: string;        // For ETH/stablecoins
  derivation_path: string; // For address derivation
}
```

### Rule #2: Validate All Crypto Inputs

```typescript
// xpub validation
const XPUB_REGEX = /^[xyz]pub[a-zA-HJ-NP-Z0-9]{100,}$/;

function validateXpub(xpub: string): boolean {
  if (!XPUB_REGEX.test(xpub)) return false;
  // Additional checksum validation
  try {
    // Use bitcoinjs-lib or similar for proper validation
    return true;
  } catch {
    return false;
  }
}

// Bitcoin address validation
const BTC_ADDRESS_REGEX = /^(bc1|[13])[a-zA-HJ-NP-Z0-9]{25,62}$/;
```

---

## OWASP Top 10 Review

### A01: Broken Access Control

**Checks:**
- [ ] Row Level Security enabled on ALL tables
- [ ] API routes verify user owns the resource
- [ ] No direct object references in URLs without auth check

**Supabase RLS Example:**
```sql
-- REQUIRED on every user-data table
ALTER TABLE wallets ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can only access own wallets" ON wallets
  FOR ALL USING (auth.uid() = user_id);

-- Verify RLS is working
SELECT tablename, rowsecurity
FROM pg_tables
WHERE schemaname = 'public';
```

**API Route Check:**
```typescript
// Every API route must verify ownership
export async function GET(req: Request, { params }: { params: { id: string } }) {
  const session = await getSession();
  if (!session) return new Response('Unauthorized', { status: 401 });

  const wallet = await getWallet(params.id);
  if (wallet.user_id !== session.user.id) {
    return new Response('Forbidden', { status: 403 });
  }
  // ...
}
```

### A02: Cryptographic Failures

**Checks:**
- [ ] HTTPS enforced (Vercel handles this)
- [ ] Sensitive data encrypted at rest (Supabase default)
- [ ] No secrets in client-side code
- [ ] Secure session handling

**Environment Variables:**
```bash
# Server-only (never exposed to client)
SUPABASE_SERVICE_ROLE_KEY=...
STRIPE_SECRET_KEY=...
ETHERSCAN_API_KEY=...

# Can be public (still use NEXT_PUBLIC_ prefix)
NEXT_PUBLIC_SUPABASE_URL=...
NEXT_PUBLIC_SUPABASE_ANON_KEY=...
```

### A03: Injection

**SQL Injection Prevention:**
```typescript
// CORRECT: Parameterized queries (Supabase handles this)
const { data } = await supabase
  .from('wallets')
  .select('*')
  .eq('user_id', userId);

// DANGEROUS: String concatenation
const query = `SELECT * FROM wallets WHERE user_id = '${userId}'`; // NEVER
```

**XSS Prevention:**
```typescript
// React escapes by default - but verify:
// SAFE
<div>{userInput}</div>

// DANGEROUS - only use if absolutely necessary
<div dangerouslySetInnerHTML={{ __html: userInput }} /> // AVOID

// If needed, sanitize first
import DOMPurify from 'dompurify';
<div dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(content) }} />
```

### A04: Insecure Design

**Threat Model for SatsAt:**
- Attacker tries to view other users' portfolios
- Attacker tries to manipulate cost basis calculations
- Attacker tries to exfiltrate xpubs (watch-only, but still sensitive)
- Attacker tries to enumerate user wallets

**Mitigations:**
- RLS on all tables
- Rate limiting on sync endpoints
- Audit logging on tax report exports
- No wallet enumeration via sequential IDs (use UUIDs)

### A05: Security Misconfiguration

**Checklist:**
- [ ] Debug mode disabled in production
- [ ] Error pages don't leak stack traces
- [ ] CORS configured correctly
- [ ] Security headers set

**Next.js Security Headers:**
```typescript
// next.config.js
const securityHeaders = [
  { key: 'X-DNS-Prefetch-Control', value: 'on' },
  { key: 'Strict-Transport-Security', value: 'max-age=63072000' },
  { key: 'X-Frame-Options', value: 'SAMEORIGIN' },
  { key: 'X-Content-Type-Options', value: 'nosniff' },
  { key: 'Referrer-Policy', value: 'origin-when-cross-origin' },
];
```

### A06: Vulnerable Components

**Dependency Audit:**
```bash
# Check for known vulnerabilities
npm audit

# Check for outdated packages
npm outdated

# Fix vulnerabilities
npm audit fix
```

**High-Risk Dependencies:**
- `bignumber.js` - Critical for financial calculations
- `@supabase/supabase-js` - Auth and data access
- `zod` - Input validation

### A07: Authentication Failures

**Supabase Auth Checks:**
- [ ] Email verification required
- [ ] Strong password policy
- [ ] Session timeout configured
- [ ] Secure cookie settings

```typescript
// Verify session on protected routes
import { createServerClient } from '@supabase/ssr';

export async function getSession() {
  const supabase = createServerClient(/* ... */);
  const { data: { session }, error } = await supabase.auth.getSession();

  if (error || !session) {
    redirect('/auth/login');
  }

  return session;
}
```

### A08: Software and Data Integrity

**Checks:**
- [ ] Dependencies from trusted sources
- [ ] CI/CD pipeline secured
- [ ] Deployment keys protected

### A09: Security Logging and Monitoring

**What to Log:**
```typescript
// Log authentication events
console.log(`[AUTH] User ${userId} logged in from ${ip}`);
console.log(`[AUTH] Failed login attempt for ${email}`);

// Log sensitive operations
console.log(`[AUDIT] User ${userId} exported tax report for ${year}`);
console.log(`[AUDIT] User ${userId} added wallet ${walletId}`);

// DON'T log sensitive data
console.log(`xpub: ${xpub}`); // NEVER log xpubs
```

### A10: Server-Side Request Forgery (SSRF)

**External API Calls:**
```typescript
// Allowlist external APIs
const ALLOWED_HOSTS = [
  'mempool.space',
  'api.coingecko.com',
  'api.etherscan.io',
];

function isAllowedHost(url: string): boolean {
  const hostname = new URL(url).hostname;
  return ALLOWED_HOSTS.some(h => hostname.endsWith(h));
}
```

---

## Security Audit Report Template

```markdown
# Security Audit Report: SatsAt

**Date:** [date]
**Scope:** [what was audited]
**Auditor:** Claude

## Executive Summary
[2-3 sentences on overall security posture]

## Critical Findings (Immediate Action Required)

### [CRITICAL-1] [Title]
**Risk:** [What could happen if exploited]
**Location:** [file:line]
**Evidence:** [code snippet]
**Remediation:** [How to fix]
**Priority:** Immediate

## High Severity Findings
...

## Medium Severity Findings
...

## Low Severity Findings
...

## Bitcoin-Specific Findings
- [Any xpub handling issues]
- [Cost basis calculation vulnerabilities]
- [UTXO tracking concerns]

## Recommendations
1. [Top priority action]
2. [Second priority]
3. [Third priority]
```

---

## Quick Security Checklist

- [ ] No private keys in codebase
- [ ] RLS enabled on all tables
- [ ] All inputs validated
- [ ] Sessions properly managed
- [ ] Secrets in environment variables
- [ ] Dependencies up to date
- [ ] Error messages sanitized
- [ ] Audit logging in place
