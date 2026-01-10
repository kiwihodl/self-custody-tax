# Self Custody Tax

Bitcoin portfolio tracker with tax lot accounting for capital gains reporting.

## Features

### Wallet Management
- Single address and xpub/ypub/zpub HD wallet support
- BIP44/49/84 address derivation (legacy, wrapped SegWit, native SegWit)
- Real-time balance sync via Mempool.space API
- Multi-wallet aggregation

### Transaction Tracking
- Automatic transaction categorization (receive, send, internal)
- Manual category override (income, mining, interest, airdrop)
- Full transaction history with mempool.space links

### Tax Reporting
- Tax lot creation with historical price lookup
- FIFO, LIFO, HIFO cost basis methods
- Short-term vs long-term capital gains tracking
- Income categorization for proper tax treatment
- Historical price fallback for older dates

### Settings
- Tax jurisdiction selection (US, Australia)
- Default currency (USD, AUD)
- Cost basis method preference

## Tech Stack

- **Framework**: Next.js 14 (App Router)
- **Database**: Supabase (PostgreSQL + Auth)
- **Styling**: Tailwind CSS
- **Bitcoin**: @scure/bip32, @scure/btc-signer
- **Prices**: CoinGecko API with historical fallback

## Getting Started

### Prerequisites
- Node.js 18+
- Supabase project (for auth and database)

### Environment Variables
Create `.env.local`:
```
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
```

### Development
```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000)

## Project Structure

```
src/
├── app/                    # Next.js pages
│   ├── dashboard/          # Portfolio overview
│   ├── wallets/            # Wallet management
│   ├── transactions/       # Transaction list + categorization
│   ├── tax/                # Tax lot processing + reporting
│   ├── settings/           # User preferences
│   └── api/                # API routes
│       ├── prices/         # CoinGecko proxy
│       └── proxy/          # Mempool.space proxy
├── components/             # React components
├── lib/
│   ├── bitcoin/            # Address derivation, sync logic
│   ├── prices/             # Price fetching + caching
│   ├── supabase/           # Supabase clients
│   └── tax/                # Tax lot creation + reporting
└── types/                  # TypeScript definitions
```

## Roadmap

See [ROADMAP.md](./ROADMAP.md) for detailed implementation plan.

### Completed
- [x] Wallet management (single address + xpub)
- [x] Transaction sync via Mempool.space
- [x] Tax lot creation with historical prices
- [x] FIFO/LIFO/HIFO cost basis methods
- [x] Transaction categorization (income, mining, etc.)
- [x] Settings page (jurisdiction, currency)

### In Progress
- [ ] CSV export (8949 format)
- [ ] Improved price caching

### Planned
- [ ] Multi-signature wallet support
- [ ] Exchange CSV import
- [ ] State-specific tax rules
- [ ] PDF tax report generation

## License

Private - All rights reserved
