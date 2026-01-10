---
name: satsAt:incident
description: This skill should be used when the user mentions 'incident', 'outage', 'production issue', 'site down', 'bug in production', or asks to 'investigate an error'. It guides incident response and post-mortem processes for SatsAt.
version: 1.0.0
---

# Incident Response

You are helping respond to a production incident in SatsAt. For a financial tool, data integrity and accuracy are paramount.

## Severity Levels

| Level | Definition | Examples | Response |
|-------|------------|----------|----------|
| SEV-1 | Service down or data integrity compromised | Site unreachable, cost basis wrong, data loss | Immediate, all-hands |
| SEV-2 | Major feature broken, many users affected | Wallet sync fails, tax reports wrong | Priority, within 1 hour |
| SEV-3 | Minor feature broken, workaround exists | UI glitch, slow performance | Same day |
| SEV-4 | Minor issue, cosmetic | Typo, minor styling | Next sprint |

### SatsAt-Specific Severity

**Automatic SEV-1:**
- Cost basis calculations returning wrong values
- Tax reports generating incorrect data
- User data visible to other users
- Wallet balances showing wrong amounts

**Automatic SEV-2:**
- Wallet sync not completing
- Historical prices not loading
- Authentication issues
- Subscription/payment failures

---

## Incident Response Process

### Phase 1: Assess (First 5 minutes)

**Questions to ask:**

1. **What exactly is broken?**
   - Which feature/page?
   - What error are users seeing?

2. **When did it start?**
   - Check deployment history
   - Check external service status

3. **What changed recently?**
   ```bash
   # Recent deployments
   vercel ls

   # Recent commits
   git log --oneline -10
   ```

4. **Who is affected?**
   - All users or specific segment?
   - Free tier only? Paid tier only?

5. **What's the impact?**
   - Is financial data affected?
   - Can users access their portfolios?

### Phase 2: Stabilize (If SEV-1/SEV-2)

**Option 1: Rollback**

```bash
# List recent deployments
vercel ls

# Rollback to last known good
vercel rollback

# Verify rollback
curl -s https://your-domain.com/api/health
```

**Option 2: Feature Disable**

If a specific feature is broken:
- Use feature flag to disable
- Or deploy hotfix to hide broken UI

**Option 3: Scale/Failover**

If overload:
- Vercel auto-scales, but check limits
- Check Supabase connection limits

### Phase 3: Investigate

**Check Application Logs:**

```bash
# Vercel logs
vercel logs --follow

# Filter for errors
vercel logs | grep -i error

# Check specific deployment
vercel logs [deployment-url]
```

**Check Database (Supabase):**

```sql
-- Check if database is responsive
SELECT 1;

-- Check recent errors in logs
-- (Use Supabase dashboard)

-- Check RLS policies are intact
SELECT tablename, rowsecurity
FROM pg_tables
WHERE schemaname = 'public';
```

**Check External Services:**

| Service | How to Check |
|---------|--------------|
| Mempool.space | `curl https://mempool.space/api/v1/blocks` |
| CoinGecko | `curl https://api.coingecko.com/api/v3/ping` |
| Etherscan | `curl https://api.etherscan.io/api?module=stats&action=ethsupply` |
| Stripe | Check Stripe dashboard |
| Supabase | Check Supabase dashboard |

**Check Recent Changes:**

```bash
# What changed in last deployment?
git log --oneline -10

# Diff from last release
git diff HEAD~1
```

### Phase 4: Resolve

**Implement Fix:**

```bash
# Make fix
# ... code changes ...

# Build and test locally
npm run build && npm run lint && npm test

# Commit with incident reference
git add -A
git commit -m "fix: [INC-XXX] resolve [issue description]"
git push origin main

# Deploy
vercel --prod --yes

# Watch logs
vercel logs --follow
```

**Verify Fix:**

- [ ] Error no longer occurring in logs
- [ ] Affected users can use feature
- [ ] No new errors introduced
- [ ] Financial calculations verified correct

### Phase 5: Post-Mortem (For SEV-1/SEV-2)

---

## Post-Mortem Template

```markdown
# Post-Mortem: [Incident Title]

**Date:** [incident date]
**Severity:** [SEV level]
**Duration:** [start time] to [end time] ([X hours/minutes])
**Author:** [name]

## Summary

[2-3 sentence summary of what happened and impact]

## Impact

- **Duration:** [X hours/minutes]
- **Users affected:** [number or percentage]
- **Financial impact:** [if any - e.g., incorrect tax calculations]
- **Data integrity:** [was any data corrupted/lost?]

## Timeline

| Time (UTC) | Event |
|------------|-------|
| [HH:MM] | First user report / alert triggered |
| [HH:MM] | Investigation started |
| [HH:MM] | Root cause identified |
| [HH:MM] | Fix deployed |
| [HH:MM] | Verified resolved |

## Root Cause

[Detailed technical explanation of what caused the incident]

## Detection

How was the incident detected?
- [ ] User report
- [ ] Monitoring alert
- [ ] Internal discovery
- [ ] External report

## Resolution

What was done to resolve the incident?

[Steps taken]

## What Went Well

- [Positive aspect of response]
- [Effective action taken]

## What Went Wrong

- [Issue with detection/response]
- [Process failure]

## Action Items

| Action | Owner | Due Date | Status |
|--------|-------|----------|--------|
| [Prevention measure] | [name] | [date] | [ ] |
| [Detection improvement] | [name] | [date] | [ ] |
| [Process change] | [name] | [date] | [ ] |

## Lessons Learned

1. [Key takeaway]
2. [Process improvement]
3. [Technical learning]
```

---

## SatsAt-Specific Incident Scenarios

### Scenario: Cost Basis Calculation Wrong

**Detection signals:**
- User reports tax totals don't match
- Automated tests failing (if running)
- Audit reveals discrepancy

**Investigation:**
```typescript
// Check specific calculation
const result = await calculateDisposal({
  user_id: 'affected-user-id',
  amount: '0.5',
  method: 'FIFO'
});

console.log('Lots used:', result.lotsUsed);
console.log('Cost basis:', result.totalCostBasis);
// Compare against expected
```

**Fix approach:**
1. Identify calculation bug
2. Fix algorithm
3. Recalculate affected users' tax lots
4. Notify affected users if reports were downloaded

### Scenario: Wallet Sync Failing

**Detection signals:**
- Sync status stuck on "syncing"
- API errors from Mempool.space
- User reports stale balances

**Investigation:**
```bash
# Check external API
curl https://mempool.space/api/v1/blocks

# Check for rate limiting
vercel logs | grep -i "rate limit"

# Check for timeout errors
vercel logs | grep -i "timeout"
```

**Fix approach:**
1. If external API down → wait or use fallback
2. If rate limited → implement backoff
3. If our bug → fix and redeploy

### Scenario: User Data Leaked

**SEV-1 - CRITICAL**

**Immediate actions:**
1. Disable affected endpoints immediately
2. Audit logs for unauthorized access
3. Identify scope of leak
4. Prepare user notification

**Investigation:**
```sql
-- Check for cross-user data access
SELECT * FROM audit_log
WHERE action = 'read'
AND accessed_user_id != requesting_user_id;
```

---

## Monitoring & Alerting

### Health Check Endpoint

```typescript
// GET /api/health
export async function GET() {
  const checks = {
    database: await checkDatabase(),
    external_apis: await checkExternalAPIs(),
    timestamp: new Date().toISOString()
  };

  const status = Object.values(checks).every(c => c === true || c.status === 'ok')
    ? 200
    : 503;

  return Response.json(checks, { status });
}
```

### Recommended Alerts

| Metric | Threshold | Severity |
|--------|-----------|----------|
| Error rate | > 1% | SEV-2 |
| Response time p99 | > 5s | SEV-3 |
| Failed syncs | > 10/hour | SEV-2 |
| Database connections | > 80% | SEV-2 |
| External API failures | > 5/min | SEV-3 |
