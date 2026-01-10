---
name: sct:deploy
description: This skill should be used when the user asks to 'deploy', 'push to production', 'release', 'ship', or mentions deployment. It guides the full deployment workflow for Self Custody Tax including VPS (DigitalOcean + Cloudflare Tunnel) and Vercel deployment options.
version: 2.0.0
---

# Deployment Workflow

You are guiding a deployment to production for Self Custody Tax. This app can be deployed via **VPS (DigitalOcean + Cloudflare Tunnel)** or **Vercel**.

---

## Option A: VPS Deployment (DigitalOcean + Cloudflare Tunnel)

### Infrastructure Setup (One-Time)

**1. Create DigitalOcean Droplet**
- Size: $6/month (1GB RAM minimum - 512MB will OOM during builds)
- OS: Debian 13 or Ubuntu 22.04
- Region: Choose closest to users

**2. Create Cloudflare Tunnel**
- Cloudflare Dashboard → Zero Trust → Networks → Tunnels → Create
- Name: `selfcustodytax`
- Copy the install token

**3. SSH into Droplet**
```bash
ssh root@YOUR_DROPLET_IP
```

**4. Install Dependencies**
```bash
# Update system
apt update && apt upgrade -y

# Install Node.js 20
curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
apt install -y nodejs

# Install PM2
npm install -g pm2

# Install cloudflared
curl -fsSL https://pkg.cloudflare.com/cloudflare-main.gpg | tee /usr/share/keyrings/cloudflare-main.gpg >/dev/null
echo 'deb [signed-by=/usr/share/keyrings/cloudflare-main.gpg] https://pkg.cloudflare.com/cloudflared any main' | tee /etc/apt/sources.list.d/cloudflared.list
apt update && apt install cloudflared -y

# Install cloudflared service with your token
sudo cloudflared service install YOUR_TUNNEL_TOKEN
```

**5. Configure Cloudflare Public Hostname**
- Zero Trust → Tunnels → selfcustodytax → Public Hostname
- Domain: `selfcustodytax.com`
- Service: `http://localhost:3000`

### Deployment Commands

```bash
# Stop existing app
pm2 delete selfcustodytax 2>/dev/null || true

# Add swap if not already done (prevents OOM)
sudo fallocate -l 2G /swapfile
sudo chmod 600 /swapfile
sudo mkswap /swapfile
sudo swapon /swapfile

# Navigate to app directory
cd /var/www

# Clone or pull latest
git clone https://github.com/kiwihodl/self-custody-tax.git
# Or if already cloned:
# cd self-custody-tax && git pull

cd self-custody-tax

# Install dependencies
npm install

# Create/update environment file
nano .env.local
```

**Required `.env.local` contents:**
```
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
NEXT_PUBLIC_APP_URL=https://selfcustodytax.com

# Optional
COINGECKO_API_KEY=your-key
ETHERSCAN_API_KEY=your-key

# Stripe (for subscriptions)
STRIPE_SECRET_KEY=sk_live_...
STRIPE_HOLDER_PRICE_ID=price_...
STRIPE_SOVEREIGN_PRICE_ID=price_...
STRIPE_ADVISOR_PRICE_ID=price_...
```

```bash
# Build the app
npm run build

# Start with PM2
pm2 start npm --name "selfcustodytax" -- start

# Save PM2 config for reboot persistence
pm2 save
pm2 startup
```

### Update Deployment (Quick)

```bash
pm2 delete selfcustodytax
cd /var/www
rm -rf self-custody-tax
git clone https://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@github.com/kiwihodl/self-custody-tax.git
cd self-custody-tax
npm install
npm run build
pm2 start npm --name "selfcustodytax" -- start
```

Use `--update-env` with pm2 restart if only updating environment variables.

### Monitoring

```bash
# View logs
pm2 logs selfcustodytax

# Monitor resources
pm2 monit

# Check status
pm2 status
```

### Rollback (VPS)

```bash
cd /var/www/self-custody-tax
git log --oneline -5  # Find previous commit
git checkout PREVIOUS_COMMIT_HASH
npm run build
pm2 restart selfcustodytax
```

---

## Option B: Vercel Deployment

### Phase 1: Pre-Deployment Checks

```bash
# 1. Ensure clean working directory
git status

# 2. Build passes
npm run build

# 3. Linting passes
npm run lint

# 4. On correct branch
git branch --show-current

# 5. Up to date with remote
git fetch origin && git status
```

### Checklist Before Proceeding

- [ ] Build succeeds locally
- [ ] Lint passes with no errors
- [ ] On main branch
- [ ] All changes committed

### Phase 2: Environment Variables (Vercel Dashboard)

Configure in Vercel Project Settings → Environment Variables:

- [ ] `NEXT_PUBLIC_SUPABASE_URL`
- [ ] `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- [ ] `SUPABASE_SERVICE_ROLE_KEY`
- [ ] `NEXT_PUBLIC_APP_URL`
- [ ] `STRIPE_SECRET_KEY`
- [ ] `STRIPE_HOLDER_PRICE_ID`
- [ ] `STRIPE_SOVEREIGN_PRICE_ID`
- [ ] `STRIPE_ADVISOR_PRICE_ID`

### Phase 3: Deploy

```bash
# Commit and push
git add -A
git commit -m "<type>(<scope>): <description>"
git push origin main

# Deploy to Vercel
vercel --prod --yes

# Watch logs
vercel logs --follow
```

### Rollback (Vercel)

```bash
vercel ls          # List deployments
vercel rollback    # Rollback to previous
```

---

## Post-Deployment Verification

### Manual Checklist

**Core Functionality:**
- [ ] Site loads at production URL
- [ ] Authentication works (login/logout)
- [ ] Dashboard displays correctly

**Wallet Features:**
- [ ] Add new wallet works
- [ ] Wallet sync completes
- [ ] Transactions display

**Tax Features:**
- [ ] Tax summary calculates
- [ ] Cost basis methods work
- [ ] Export downloads

**Subscriptions:**
- [ ] Pricing page loads
- [ ] Stripe checkout works
- [ ] Tier limits enforced

---

## Severity Assessment

| Issue Type | Severity | Action |
|------------|----------|--------|
| Site down | SEV-1 | Immediate rollback |
| Cost basis wrong | SEV-1 | Immediate rollback |
| Sync broken | SEV-2 | Fix forward or rollback |
| UI glitch | SEV-3 | Fix in next deploy |

---

**Remember:** Cost basis accuracy is critical. Any deployment affecting tax calculations should be thoroughly tested.
