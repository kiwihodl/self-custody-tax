---
name: satsAt:deploy
description: This skill should be used when the user asks to 'deploy', 'push to production', 'release', 'ship', or mentions 'vercel deployment'. It guides the full deployment workflow for the SatsAt Bitcoin portfolio tracker including pre-deployment checks, Vercel deployment, and post-deployment verification.
version: 1.0.0
---

# Deployment Workflow

You are guiding a deployment to production for SatsAt. Follow this systematic process to ensure a safe, successful deployment.

## Phase 1: Pre-Deployment Checks

Run these commands to verify readiness:

```bash
# 1. Ensure clean working directory
git status

# 2. Build passes
npm run build

# 3. Linting passes
npm run lint

# 4. Tests pass
npm test

# 5. On correct branch
git branch --show-current

# 6. Up to date with remote
git fetch origin
git status
```

### Checklist Before Proceeding

- [ ] Build succeeds locally
- [ ] Lint passes with no errors
- [ ] Tests pass (or acknowledged as skipped)
- [ ] On main branch
- [ ] All changes committed
- [ ] No pending PRs that should be merged first

## Phase 2: Environment Verification

Verify environment configuration:

- [ ] `NEXT_PUBLIC_SUPABASE_URL` configured
- [ ] `NEXT_PUBLIC_SUPABASE_ANON_KEY` configured
- [ ] `SUPABASE_SERVICE_ROLE_KEY` set (server-side)
- [ ] `COINGECKO_API_KEY` set (optional, increases rate limit)
- [ ] `ETHERSCAN_API_KEY` set (required for stablecoins)
- [ ] `STRIPE_SECRET_KEY` configured for subscriptions
- [ ] Production URL configured correctly

## Phase 3: Database Migrations

If there are schema changes:

```bash
# Check migration status (Supabase)
npx supabase migration list

# Apply pending migrations
npx supabase db push

# Or for local development
npx supabase migration up
```

**Critical:** Ensure Row Level Security policies are in place for:
- `user_profiles`
- `wallets`
- `transactions`
- `tax_lots`

## Phase 4: Deployment

```bash
# 1. Commit and push to GitHub
git add -A
git commit -m "<type>(<scope>): <description>"
git push origin main

# 2. Deploy to Vercel
vercel --prod --yes

# 3. Watch logs
vercel logs --follow
```

### Commit Message Format

Use conventional commits:
- `feat(wallets)`: New feature
- `fix(tax)`: Bug fix
- `refactor(sync)`: Code refactoring
- `docs(api)`: Documentation
- `chore(deps)`: Dependencies/maintenance

## Phase 5: Post-Deployment Verification

### Manual Verification Checklist

**Core Functionality:**
- [ ] Site loads at production URL
- [ ] Authentication works (Supabase login/logout)
- [ ] Dashboard displays portfolio correctly
- [ ] Wallet list loads

**Wallet Features:**
- [ ] Add new Bitcoin wallet (xpub)
- [ ] Wallet sync completes successfully
- [ ] Transaction history displays
- [ ] Balance matches expected value

**Tax Features:**
- [ ] Tax summary calculates correctly
- [ ] Cost basis method selection works
- [ ] 8949 report generates
- [ ] CSV export downloads

**Subscriptions:**
- [ ] Stripe checkout creates
- [ ] Subscription upgrade works
- [ ] Feature gates work correctly

### Automated Health Check

```bash
# Check API health
curl -s https://your-domain.com/api/health | jq

# Expected response:
# { "status": "ok", "timestamp": "..." }
```

## Rollback Procedure

If issues are detected:

### Quick Rollback (Vercel)

```bash
# List recent deployments
vercel ls

# Rollback to previous deployment
vercel rollback
```

### Manual Rollback

```bash
# Revert the commit
git revert HEAD
git push origin main

# Redeploy
vercel --prod --yes
```

### Database Rollback

If migration caused issues:

```bash
# List migrations
npx supabase migration list

# Rollback specific migration (create reverse migration)
# Then apply
npx supabase db push
```

## Severity Assessment

| Issue Type | Severity | Action |
|------------|----------|--------|
| Site down | SEV-1 | Immediate rollback |
| Cost basis wrong | SEV-1 | Immediate rollback |
| Sync broken | SEV-2 | Fix forward or rollback |
| UI glitch | SEV-3 | Fix in next deploy |
| Minor styling | SEV-4 | Track for later |

## Post-Deploy Communication

After successful deployment:

1. Update changelog if significant changes
2. Notify team in Slack/Discord
3. Monitor error tracking (if configured)
4. Watch for user-reported issues

---

**Remember:** For SatsAt, cost basis accuracy is critical. Any deployment affecting tax calculations should be thoroughly tested before and after deployment.
