---
name: satsAt:onboarding
description: This skill should be used when the user asks to 'onboard me', 'explain the codebase', 'how does this project work', 'getting started', or mentions 'new developer'. It provides comprehensive project onboarding for the SatsAt codebase.
version: 1.0.0
---

# Project Onboarding

Welcome to SatsAt! This guide will get you productive in the codebase quickly.

## What is SatsAt?

SatsAt is a Bitcoin portfolio tracker for serious self-custody users. Our differentiators:

- **Multisig-native:** Understands 2-of-3, 3-of-5 wallets as single entities
- **UTXO-level tracking:** Cost basis per output, not per wallet
- **Internal transfer detection:** Moving between your wallets isn't taxable
- **Collaborative custody:** Unchained/Casa wallet support

## Tech Stack

| Layer | Technology | Purpose |
|-------|------------|---------|
| Frontend | Next.js 14 (App Router) | React framework with SSR |
| Language | TypeScript | Type safety |
| Styling | Tailwind CSS | Utility-first CSS |
| Database | Supabase (PostgreSQL) | Database + Auth + RLS |
| Deployment | Vercel | Hosting + Edge functions |
| Payments | Stripe | Subscription management |

## Project Structure

```
satsAt/
├── src/
│   ├── app/                    # Next.js App Router
│   │   ├── (auth)/             # Auth-protected routes
│   │   │   ├── dashboard/      # Main dashboard
│   │   │   ├── wallets/        # Wallet management
│   │   │   ├── transactions/   # Transaction views
│   │   │   ├── tax/            # Tax reports
│   │   │   └── settings/       # User settings
│   │   ├── api/                # API routes
│   │   │   ├── wallets/        # Wallet CRUD + sync
│   │   │   ├── transactions/   # Transaction ops
│   │   │   ├── tax/            # Tax calculations
│   │   │   ├── prices/         # Historical prices
│   │   │   └── webhooks/       # Stripe webhooks
│   │   ├── auth/               # Auth pages (login, register)
│   │   └── page.tsx            # Landing page
│   ├── components/
│   │   ├── ui/                 # Base UI components
│   │   ├── wallet/             # Wallet-specific components
│   │   ├── transaction/        # Transaction components
│   │   └── tax/                # Tax report components
│   ├── lib/
│   │   ├── supabase/           # Supabase client setup
│   │   ├── bitcoin/            # Bitcoin utilities
│   │   │   ├── xpub.ts         # xpub validation/derivation
│   │   │   ├── utxo.ts         # UTXO handling
│   │   │   └── sync.ts         # Blockchain sync
│   │   ├── tax/                # Tax calculation logic
│   │   │   ├── cost-basis.ts   # FIFO/LIFO/HIFO
│   │   │   └── reports.ts      # 8949 generation
│   │   └── utils.ts            # General utilities
│   ├── types/
│   │   ├── database.ts         # Supabase generated types
│   │   ├── wallet.ts           # Wallet interfaces
│   │   ├── transaction.ts      # Transaction interfaces
│   │   └── tax.ts              # Tax-related types
│   └── styles/
│       └── globals.css         # Global styles
├── supabase/
│   ├── migrations/             # Database migrations
│   └── seed.sql                # Development seed data
├── public/                     # Static assets
├── .env.example                # Environment template
├── .env.local                  # Local environment (gitignored)
└── package.json
```

## Key Data Models

### User
```typescript
interface User {
  id: string;                    // UUID from Supabase Auth
  email: string;
  subscription_tier: 'free' | 'holder' | 'sovereign' | 'advisor';
  settings: {
    default_currency: 'USD' | 'AUD';
    cost_basis_method: 'FIFO' | 'LIFO' | 'HIFO';
    tax_year_start: string;      // "01-01" for US
  };
}
```

### Wallet
```typescript
interface Wallet {
  id: string;
  user_id: string;
  name: string;
  type: 'single_sig' | 'multisig' | 'collaborative' | 'exchange' | 'stablecoin';
  network: 'bitcoin' | 'ethereum';
  xpub?: string;                 // For Bitcoin
  address?: string;              // For Ethereum
  multisig_config?: {
    quorum_required: number;     // e.g., 2
    total_keys: number;          // e.g., 3
    provider?: 'unchained' | 'casa' | 'custom';
  };
  last_synced_at: Date | null;
  sync_status: 'idle' | 'syncing' | 'error';
}
```

### Transaction
```typescript
interface Transaction {
  id: string;
  user_id: string;
  wallet_id: string;
  txid: string;
  network: 'bitcoin' | 'ethereum';
  block_timestamp: Date;

  // Bitcoin-specific
  inputs: TransactionInput[];
  outputs: TransactionOutput[];

  // Classification
  category: 'receive' | 'send' | 'internal' | 'fee';
  is_internal_transfer: boolean;

  fee: string;
  fee_usd: number;
}
```

### TaxLot
```typescript
interface TaxLot {
  id: string;
  user_id: string;
  transaction_id: string;

  asset: 'BTC' | 'USDT' | 'USDC';
  amount: string;                // BigNumber string

  // For Bitcoin UTXO reference
  txid?: string;
  vout?: number;

  // Cost basis
  acquisition_date: Date;
  acquisition_price_usd: number;
  cost_basis_usd: number;

  // Disposal
  is_disposed: boolean;
  disposal_date?: Date;
  proceeds_usd?: number;
  gain_loss_usd?: number;
  is_long_term?: boolean;        // > 1 year
}
```

## Critical Algorithms

### 1. Cost Basis Calculation (FIFO)

Location: `src/lib/tax/cost-basis.ts`

```typescript
function calculateFIFO(disposal: Disposal, lots: TaxLot[]): DisposalResult {
  // Sort by acquisition date (oldest first)
  const sortedLots = lots
    .filter(l => !l.is_disposed)
    .sort((a, b) => a.acquisition_date - b.acquisition_date);

  let remaining = new BigNumber(disposal.amount);
  const usedLots: UsedLot[] = [];

  for (const lot of sortedLots) {
    if (remaining.lte(0)) break;

    const lotAmount = new BigNumber(lot.amount);
    const amountToUse = BigNumber.min(lotAmount, remaining);

    // ... consume lot proportionally
  }

  return { usedLots, totalCostBasis, gainLoss };
}
```

### 2. Internal Transfer Detection

Location: `src/lib/bitcoin/sync.ts`

```typescript
async function detectInternalTransfers(userId: string): Promise<void> {
  // Get all user addresses
  const userAddresses = await getAllUserAddresses(userId);

  // Find transactions where both sender and receiver are user's
  for (const tx of transactions) {
    const allInputsOurs = tx.inputs.every(i => userAddresses.has(i.address));
    const outputsToUs = tx.outputs.filter(o => userAddresses.has(o.address));

    if (allInputsOurs && outputsToUs.length > 0) {
      await markAsInternalTransfer(tx.id);
    }
  }
}
```

### 3. xpub Derivation

Location: `src/lib/bitcoin/xpub.ts`

```typescript
// Derive addresses from xpub for transaction matching
function deriveAddresses(xpub: string, path: string, count: number): string[] {
  // Uses bitcoinjs-lib or similar
  // Derives receive (m/0/*) and change (m/1/*) addresses
}
```

## Development Workflow

### Initial Setup

```bash
# Clone repo
git clone [repo-url]
cd satsAt

# Install dependencies
npm install

# Copy environment template
cp .env.example .env.local

# Configure .env.local with your Supabase credentials
# NEXT_PUBLIC_SUPABASE_URL=...
# NEXT_PUBLIC_SUPABASE_ANON_KEY=...
# SUPABASE_SERVICE_ROLE_KEY=...

# Start development server
npm run dev
```

### Running Supabase Locally

```bash
# Start local Supabase
npx supabase start

# Apply migrations
npx supabase db push

# Open Supabase Studio
npx supabase studio
```

### Common Commands

```bash
npm run dev          # Start dev server
npm run build        # Production build
npm run lint         # Run ESLint
npm test             # Run tests
npm run type-check   # TypeScript check

# Database
npx supabase migration new [name]   # Create migration
npx supabase db push                # Apply migrations
npx supabase gen types typescript   # Generate types
```

## External APIs

### Mempool.space (Bitcoin)

```typescript
// Get address transactions
GET https://mempool.space/api/address/:address/txs

// Get xpub info
GET https://mempool.space/api/v1/xpub/:xpub

// Rate limit: 10 req/sec (no key needed)
```

### CoinGecko (Prices)

```typescript
// Historical price
GET https://api.coingecko.com/api/v3/coins/bitcoin/history?date=DD-MM-YYYY

// Rate limit: 10-30 calls/min (free tier)
```

### Etherscan (Stablecoins)

```typescript
// ERC-20 transfers
GET https://api.etherscan.io/api?module=account&action=tokentx&address=:address

// USDT: 0xdAC17F958D2ee523a2206206994597C13D831ec7
// USDC: 0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48
```

## Security Rules

1. **NEVER store private keys** - xpubs and addresses only
2. **RLS on everything** - All tables have Row Level Security
3. **Validate inputs** - All xpubs/addresses validated before storing
4. **BigNumber for money** - Never use JavaScript `number` for crypto amounts

## Getting Help

- Check `/satsAt:code-review` for code patterns
- Check `/satsAt:db-design` for database questions
- Check `/satsAt:security` for security concerns
- Read the PRD for feature requirements
