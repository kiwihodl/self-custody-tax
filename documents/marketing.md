# Self Custody Tax - Marketing & Technical Reference

**Document Purpose:** Complete context for marketing AI agents to understand the product, features, branding, and user flows.

---

## 1. Product Overview

### What is Self Custody Tax?

A crypto tax tracking SaaS for self-custody users. Unlike exchange-only tools (Koinly, CoinTracker), we specialize in:

- **Watch-only wallet tracking** - xpub, zpub, ypub, addresses only. Private keys never leave user devices.
- **Multisig native** - 2-of-3, 3-of-5 wallets tracked as single entities. Works with Unchained, Casa, Sparrow.
- **UTXO-level accuracy** - Bitcoin cost basis calculated per UTXO, not approximated.
- **Internal transfer detection** - Moves between own wallets don't create phantom taxable events.

### Tagline

> "Crypto tax tracking for self-custody users"

### Problem Statement

Self-custody users (hardware wallets, multisig setups) have been underserved by existing tax software that focuses on exchange imports. They face:

1. **Spreadsheet hell** - Manual tracking across multiple wallets
2. **Phantom gains** - Tools that treat internal transfers as sales
3. **Inaccurate cost basis** - Approximations instead of UTXO-level precision
4. **Multisig confusion** - No support for collaborative custody

### Solution

Self Custody Tax automatically:
1. Connects via read-only public keys (xpub/zpub/addresses)
2. Syncs full transaction history from blockchain
3. Calculates UTXO-level cost basis (FIFO/LIFO/HIFO)
4. Detects internal transfers between user's wallets
5. Generates IRS Form 8949 and tax reports

---

## 2. Target Audience

### Primary Personas

1. **The HODLer** (Holder tier)
   - Holds 1-10 wallets
   - Uses hardware wallet (Ledger, Trezor, Coldcard)
   - Buys and holds, occasional sells
   - Wants accurate tax reports without complexity

2. **The Sovereign** (Sovereign tier)
   - Multiple wallets including multisig
   - Uses Unchained, Casa, or self-managed quorum
   - Privacy-conscious, won't share private keys
   - Needs internal transfer detection

3. **The Advisor** (Advisor tier)
   - CPAs, tax professionals, wealth managers
   - Manages crypto taxes for multiple clients
   - Needs white-label reports and API access
   - Values accuracy and audit-readiness

### Secondary Personas

- **Stablecoin users** - USDT/USDC on Ethereum for payments
- **DCA buyers** - Frequent small purchases, many tax lots
- **Estate planners** - Tracking for inheritance purposes

---

## 3. Branding & Design System

### Color Palette

```
Primary (Gold):       #FBDC7B      - CTAs, highlights, brand accent
Primary Glow:         #FDE9A0      - Hover states, glows
Primary Dark:         #D4B85A      - Text on light backgrounds
Primary Muted:        rgba(251, 220, 123, 0.15)  - Subtle backgrounds

Background Base:      #050508      - Main app background (near-black)
Background Raised:    #0D0D12      - Cards, elevated surfaces
Background Elevated:  #141419      - Modals, dropdowns
Background Surface:   #1A1A21      - Interactive surfaces
Background Hover:     #22222B      - Hover states
Background Active:    #2A2A35      - Active/pressed states

Success:              #00D4AA      - Positive amounts, confirmations (Teal)
Error:                #FF4757      - Negative amounts, errors (Red)
Warning:              #FFB347      - Caution states (Orange)
Info:                 #4A9FFF      - Information, links (Blue)

Text Primary:         #F5F5F7      - Main text (near-white)
Text Secondary:       #A0A0B0      - Descriptions, metadata
Text Tertiary:        #707080      - Placeholder, disabled
Text Muted:           #505060      - Very subtle text

Border Default:       rgba(255, 255, 255, 0.06)  - Card borders
Border Hover:         rgba(255, 255, 255, 0.1)   - Hover borders
Border Focus:         rgba(251, 220, 123, 0.5)   - Focus rings
```

### Typography

- **Headings:** Inter (system font stack fallback: -apple-system, BlinkMacSystemFont, Segoe UI, Roboto)
- **Body:** Inter, same stack
- **Monospace:** JetBrains Mono, SF Mono, Fira Code (for addresses, txids, code)

### Design Principles

1. **Dark-first** - Near-black backgrounds, gold accents. Feels premium, reduces eye strain.
2. **Glassmorphism** - Subtle transparency with backdrop-blur for depth.
3. **Minimal chrome** - Content-focused, no unnecessary decoration.
4. **Micro-animations** - 200ms transitions, slide-up/fade-in for polish.

### Visual Motifs

- **Gold glow** - Primary brand color creates subtle glow effects (`shadow-glow`)
- **Mesh gradient** - Animated background on landing page
- **Rounded corners** - 10px default, 14px for cards, 18px for modals
- **Bitcoin symbol** - &#8383; used as brand icon alongside dollar signs

---

## 4. Feature State Machines

### 4.1 User Authentication Flow

```
                    ┌─────────────┐
                    │   Landing   │
                    │   Page      │
                    └──────┬──────┘
                           │
              ┌────────────┴────────────┐
              ▼                         ▼
       ┌─────────────┐          ┌─────────────┐
       │   Sign Up   │          │   Sign In   │
       └──────┬──────┘          └──────┬──────┘
              │                        │
              ▼                        ▼
       ┌─────────────┐          ┌─────────────┐
       │   Email     │          │   Email     │
       │   Confirm   │          │   Password  │
       └──────┬──────┘          └──────┬──────┘
              │                        │
              ▼                        │
       ┌─────────────┐                 │
       │  Onboarding │◄────────────────┘
       │   Wizard    │        (if no wallets)
       └──────┬──────┘
              │
              ▼
       ┌─────────────┐
       │  Dashboard  │
       └─────────────┘
```

### 4.2 Onboarding Wizard

```
┌─────────────┐     ┌─────────────┐     ┌─────────────┐
│   Welcome   │────▶│   Network   │────▶│   Input     │
│   Screen    │     │   Select    │     │   Details   │
└──────┬──────┘     └─────────────┘     └──────┬──────┘
       │                                       │
       │ (Skip)                                │ (Add Wallet)
       │                                       ▼
       │                                ┌─────────────┐
       │                                │   Syncing   │
       │                                └──────┬──────┘
       │                                       │
       │                                       ▼
       │                                ┌─────────────┐
       └───────────────────────────────▶│  Complete   │
                                        └──────┬──────┘
                                               │
                                               ▼
                                        ┌─────────────┐
                                        │  Dashboard  │
                                        └─────────────┘

Network Options:
├── Bitcoin      → Address or xpub input
├── Crypto (ETH) → Ethereum address input
└── Stablecoins  → Ethereum address (USDT/USDC)
```

### 4.3 Wallet Sync Flow

```
┌─────────────┐     ┌─────────────┐     ┌─────────────┐
│   Wallet    │────▶│   Sync      │────▶│   Fetch     │
│   Created   │     │   Started   │     │   Txs API   │
└─────────────┘     └──────┬──────┘     └──────┬──────┘
                           │                   │
                           │                   ▼
                    ┌──────┴──────┐     ┌─────────────┐
                    │   Error     │◄────│   Parse     │
                    │   State     │     │   Txs       │
                    └─────────────┘     └──────┬──────┘
                           ▲                   │
                           │                   ▼
                           │            ┌─────────────┐
                           │            │   Create    │
                           │            │   Tax Lots  │
                           │            └──────┬──────┘
                           │                   │
                           └───────────────────┤ (failure)
                                               │
                                               ▼ (success)
                                        ┌─────────────┐
                                        │   Synced    │
                                        │   (idle)    │
                                        └─────────────┘
```

### 4.4 Tax Calculation Flow

```
┌─────────────┐
│   Tax Page  │
│   Load      │
└──────┬──────┘
       │
       ▼
┌─────────────┐     ┌─────────────┐
│   Select    │────▶│   Fetch     │
│   Year      │     │   Tax Lots  │
└─────────────┘     └──────┬──────┘
                           │
       ┌───────────────────┼───────────────────┐
       ▼                   ▼                   ▼
┌─────────────┐     ┌─────────────┐     ┌─────────────┐
│   Batch     │     │   Apply     │     │   Calculate │
│   Price     │     │   Cost      │     │   Short/    │
│   Fetch     │     │   Basis     │     │   Long Term │
└──────┬──────┘     │   Method    │     └──────┬──────┘
       │            └──────┬──────┘            │
       │                   │                   │
       └───────────────────┴───────────────────┘
                           │
                           ▼
                    ┌─────────────┐
                    │   Display   │
                    │   Summary   │
                    └──────┬──────┘
                           │
              ┌────────────┴────────────┐
              ▼                         ▼
       ┌─────────────┐          ┌─────────────┐
       │   View      │          │   Export    │
       │   Details   │          │   Report    │
       └─────────────┘          └─────────────┘
```

### 4.5 Exchange CSV Import Flow

```
┌─────────────┐     ┌─────────────┐     ┌─────────────┐
│   Select    │────▶│   Upload    │────▶│   Detect    │
│   Wallet    │     │   CSV       │     │   Exchange  │
└─────────────┘     └─────────────┘     └──────┬──────┘
                                               │
       ┌───────────────────────────────────────┤
       │                                       │
       ▼                                       ▼
┌─────────────┐                         ┌─────────────┐
│   Manual    │                         │   Auto      │
│   Select    │                         │   Detected  │
│   Exchange  │                         │   (6 types) │
└──────┬──────┘                         └──────┬──────┘
       │                                       │
       └───────────────────────────────────────┘
                           │
                           ▼
                    ┌─────────────┐
                    │   Parse     │
                    │   CSV       │
                    └──────┬──────┘
                           │
                           ▼
                    ┌─────────────┐
                    │   Create    │
                    │   Txs &     │
                    │   Tax Lots  │
                    └──────┬──────┘
                           │
                           ▼
                    ┌─────────────┐
                    │   Import    │
                    │   Complete  │
                    └─────────────┘

Supported Exchanges:
├── AmberApp
├── Coinbase
├── Kraken
├── Gemini
├── River
└── Swan Bitcoin
```

### 4.6 Subscription Flow

```
┌─────────────┐
│   Free      │
│   User      │
└──────┬──────┘
       │
       ▼
┌─────────────┐     ┌─────────────┐
│   Hit       │────▶│   Upgrade   │
│   Limit     │     │   Prompt    │
└─────────────┘     └──────┬──────┘
                           │
                           ▼
                    ┌─────────────┐
                    │   Pricing   │
                    │   Page      │
                    └──────┬──────┘
                           │
                           ▼
                    ┌─────────────┐
                    │   Stripe    │
                    │   Checkout  │
                    └──────┬──────┘
                           │
              ┌────────────┴────────────┐
              ▼                         ▼
       ┌─────────────┐          ┌─────────────┐
       │   Payment   │          │   Payment   │
       │   Success   │          │   Failed    │
       └──────┬──────┘          └─────────────┘
              │
              ▼
       ┌─────────────┐
       │   Webhook   │
       │   Process   │
       └──────┬──────┘
              │
              ▼
       ┌─────────────┐
       │   Tier      │
       │   Updated   │
       └─────────────┘
```

---

## 5. Complete Feature List

### Dashboard

| Feature | Description | Tier |
|---------|-------------|------|
| Portfolio value | Total holdings in USD | All |
| Holdings breakdown | By asset (BTC, ETH, USDT, USDC) | All |
| Recent transactions | Last 10 transactions | All |
| Quick actions | Add wallet, sync, view reports | All |
| Unrealized gains | Current P&L on holdings | Holder+ |

### Wallets

| Feature | Description | Tier |
|---------|-------------|------|
| Single address | Track one Bitcoin/ETH address | All |
| xpub/zpub/ypub | Track HD wallet (all addresses) | All |
| Multisig descriptor | 2-of-3, 3-of-5 collaborative custody | Sovereign+ |
| Stablecoin wallets | USDT/USDC on Ethereum | All |
| Auto-sync | Periodic blockchain sync | All |
| Manual sync | On-demand refresh | All |
| Wallet rename/delete | Manage wallet list | All |

### Transactions

| Feature | Description | Tier |
|---------|-------------|------|
| Transaction list | All txs across all wallets | All |
| Filter by wallet | View single wallet activity | All |
| Filter by category | receive, send, internal, fee | All |
| Category editing | Recategorize transactions | All |
| Notes | Add notes to transactions | All |
| Internal transfer detection | Auto-detect between own wallets | Sovereign+ |
| Linked transactions | See both sides of internal transfer | Sovereign+ |

### Tax Reports

| Feature | Description | Tier |
|---------|-------------|------|
| Year selection | 2020-current year support | All |
| Short-term gains | < 1 year holding period | All |
| Long-term gains | >= 1 year holding period | All |
| Cost basis methods | FIFO, LIFO, HIFO | Holder+ |
| Tax lot viewer | See individual acquisition lots | All |
| Cost basis tooltip | Explains calculation method | All |
| Form 8949 export | IRS-ready CSV | Holder+ |
| TurboTax format | Direct import compatible | Holder+ |

### Gains Analysis

| Feature | Description | Tier |
|---------|-------------|------|
| Disposals list | All sales/spends with P&L | All |
| Tax lot pairing | Which lots were sold | All |
| Cost basis override | Manual adjustment | Holder+ |
| Lot-level editing | Edit acquisition price | Holder+ |

### Settings

| Feature | Description | Tier |
|---------|-------------|------|
| Currency | USD/AUD display | All |
| Cost basis method | FIFO/LIFO/HIFO | Holder+ |
| Tax jurisdiction | US/AU/Other | All |
| Timezone | Local time display | All |
| Subscription management | Via Stripe portal | All |
| Account deletion | GDPR-compliant data removal | All |

### Exchange Import

| Feature | Description | Tier |
|---------|-------------|------|
| AmberApp CSV | Full support | All |
| Coinbase CSV | Standard export | All |
| Kraken CSV | Ledger export | All |
| Gemini CSV | Transaction history | All |
| River CSV | Account activity | All |
| Swan Bitcoin CSV | Purchases/deposits | All |
| Auto-detection | Detects exchange format | All |

---

## 6. Pricing Tiers

### Free Tier
- **Price:** $0/forever
- **Wallets:** 1
- **Transactions:** 50
- **Features:**
  - Basic portfolio view
  - $21 one-time export fee (for tax reports)
- **Target:** Tire kickers, minimal users

### Holder Tier
- **Price:** $99/year
- **Wallets:** 10
- **Transactions:** Unlimited
- **Features:**
  - All Free features
  - Tax reports (Form 8949)
  - FIFO/LIFO/HIFO cost basis
  - xpub wallet support
  - Email support
- **Target:** Individual HODLers, 1-10 wallets

### Sovereign Tier (Most Popular)
- **Price:** $249/year
- **Wallets:** Unlimited
- **Transactions:** Unlimited
- **Features:**
  - All Holder features
  - Multisig support
  - Internal transfer detection
  - Priority support
- **Target:** Serious self-custodians, multisig users

### Advisor Tier
- **Price:** $499/year
- **Wallets:** Unlimited
- **Transactions:** Unlimited
- **Features:**
  - All Sovereign features
  - Multi-client dashboard
  - White-label reports
  - API access
  - Dedicated support
- **Target:** CPAs, wealth managers, tax professionals

---

## 7. Technical Architecture

### Stack

| Layer | Technology |
|-------|------------|
| Frontend | Next.js 14, React 18, TypeScript |
| Styling | Tailwind CSS (custom theme) |
| Database | Supabase (PostgreSQL) |
| Auth | Supabase Auth (email/password) |
| Payments | Stripe (subscriptions) |
| Bitcoin API | Mempool.space (for xpub/address sync) |
| Ethereum API | Etherscan (for address sync) |
| Price Data | CoinGecko (historical prices) |
| Hosting | VPS with PM2 |

### Key Libraries

```json
{
  "@bitcoinerlab/descriptors": "Multisig descriptor parsing",
  "@scure/bip32": "HD wallet derivation",
  "@stripe/stripe-js": "Payment integration",
  "@supabase/supabase-js": "Database client",
  "bignumber.js": "Precise decimal math",
  "swr": "Data fetching with caching"
}
```

### API Endpoints

```
Auth:
POST /api/auth/signup       - Create account
POST /api/auth/login        - Sign in
POST /api/auth/logout       - Sign out
POST /api/auth/callback     - OAuth callback

Wallets:
GET  /api/wallets           - List user wallets
POST /api/wallets           - Create wallet
GET  /api/wallets/[id]      - Get wallet details
PUT  /api/wallets/[id]      - Update wallet
DELETE /api/wallets/[id]    - Soft delete wallet
POST /api/wallets/[id]/sync - Trigger sync

Transactions:
GET  /api/transactions      - List transactions
PUT  /api/transactions/[id] - Update category/notes

Tax:
GET  /api/tax/summary       - Year summary
GET  /api/tax/lots          - Tax lot list
PATCH /api/tax-lots/[id]    - Update cost basis
GET  /api/tax/export        - Export Form 8949

Import:
POST /api/import/csv        - Import exchange CSV

Stripe:
POST /api/stripe/checkout   - Create checkout session
POST /api/stripe/webhook    - Handle Stripe events
POST /api/stripe/portal     - Customer portal redirect

Prices:
GET  /api/prices            - Current prices
GET  /api/prices/history    - Historical price
```

---

## 8. Key Selling Points (Marketing Copy)

### Headlines

1. **"Your keys, your coins, your accurate taxes"**
   - Emphasizes self-custody without compromising tax compliance

2. **"Multisig-native tax tracking"**
   - Only product with true multisig descriptor support

3. **"UTXO-level precision"**
   - Maximum accuracy for Bitcoin cost basis

4. **"No phantom gains from internal transfers"**
   - Smart detection saves users from overpaying taxes

### Trust Signals

- "Watch-only access - private keys never leave your device"
- "No credit card required for free trial"
- "14-day free trial on all paid plans"
- "IRS Form 8949 ready"
- "Works with Unchained, Casa, Sparrow, Ledger, Trezor, Coldcard"

### Differentiators vs Competitors

| Feature | Self Custody Tax | Koinly | CoinTracker |
|---------|-----------------|--------|-------------|
| Multisig support | Native | No | Limited |
| xpub tracking | Full | Limited | Limited |
| UTXO-level | Yes | No | No |
| Internal transfer detection | Auto | Manual | Limited |
| Self-custody focus | Core | Secondary | Secondary |

---

## 9. User Experience Notes

### Onboarding Philosophy

1. **Low friction** - Can skip onboarding, add wallet anytime
2. **Education-first** - Explains what xpub means, why watch-only is safe
3. **Progressive disclosure** - Advanced features (multisig) not shown to new users
4. **Immediate value** - Wallet syncs and shows balance in ~30 seconds

### Error Handling

- Red badges with clear error messages
- Retry buttons for failed syncs
- Graceful degradation when price APIs rate-limited
- Toast notifications for async operations

### Performance Optimizations

- Batch price fetching (not N+1 queries)
- Price caching in Supabase (no repeated API calls)
- Background wallet sync
- SWR for client-side data with stale-while-revalidate

---

## 10. Roadmap Context

### Completed Features

1. Multi-wallet dashboard with portfolio value
2. Bitcoin xpub sync with UTXO tracking
3. Ethereum/stablecoin address sync
4. Six exchange CSV parsers (Amber, Coinbase, Kraken, Gemini, River, Swan)
5. Tax calculation with FIFO/LIFO/HIFO
6. Form 8949 export
7. Stripe subscription with tier limits
8. Onboarding wizard
9. Settings page with Stripe portal
10. Performance optimization (batch price fetching)

### Future Roadmap

- Multi-client advisor dashboard
- Additional exchange parsers
- Multisig descriptor UI for adding collaborative custody
- Tax loss harvesting suggestions
- DeFi transaction support (swaps, LP positions)
- Bitcoin Lightning network support

---

## 11. Brand Voice

### Tone

- **Confident** - We know self-custody taxation better than anyone
- **Technical but accessible** - Explain xpubs without talking down
- **Trustworthy** - Security and privacy are paramount
- **Direct** - No marketing fluff, clear value propositions

### Language Examples

**Do say:**
- "Watch-only access means your keys never leave your hardware wallet"
- "UTXO-level tracking for maximum tax accuracy"
- "Works with the wallets you already use"

**Don't say:**
- "Revolutionary blockchain solution"
- "Web3 tax platform"
- "Crypto made easy" (too generic)

### Keywords for SEO

- Self custody tax
- Bitcoin tax calculator
- Multisig tax tracking
- xpub tax software
- Hardware wallet taxes
- Coldcard tax report
- Unchained tax
- Casa multisig taxes
- UTXO cost basis
- Form 8949 Bitcoin

---

## 12. Asset Descriptions

### Logo

- Icon: Stylized Bitcoin symbol with gold gradient
- Text: "SELF CUSTODY TAX" in bold sans-serif
- File: `/public/logo-icon.png`

### Screenshots Needed

1. Dashboard with portfolio value
2. Wallet list with sync status
3. Transaction list with categories
4. Tax summary with short/long term gains
5. Cost basis tooltip
6. Onboarding wizard steps
7. Pricing page

---

## 13. Support Documentation

### Help Page Topics

1. Getting started
2. Adding a wallet (address vs xpub)
3. Understanding cost basis methods
4. Importing exchange history
5. Generating tax reports
6. Managing subscription
7. Data privacy and security

### FAQ

**Q: Do you have access to my Bitcoin?**
A: No. We only use extended public keys (xpubs) or addresses which can only view, never spend.

**Q: What's the difference between FIFO and LIFO?**
A: FIFO (First In First Out) sells your oldest coins first. LIFO (Last In First Out) sells your newest. HIFO (Highest In First Out) sells highest-cost coins first to minimize gains.

**Q: How do you detect internal transfers?**
A: We match transactions between your registered wallets. If the same amount leaves one wallet and arrives at another within 24 hours, we mark it as internal.

**Q: Can I import my exchange history?**
A: Yes. We support CSV imports from AmberApp, Coinbase, Kraken, Gemini, River, and Swan Bitcoin.

---

## 14. Metrics to Track

### Acquisition

- Landing page views
- Sign up conversion rate
- Free trial starts
- Paid conversion rate

### Engagement

- Wallets added per user
- Transactions synced
- Tax reports generated
- Time on tax page

### Retention

- Monthly active users
- Subscription renewal rate
- Churn by tier

### Revenue

- MRR by tier
- Export fee revenue (free tier)
- LTV by acquisition source

---

*Document last updated: January 2026*
*Version: 1.0*
