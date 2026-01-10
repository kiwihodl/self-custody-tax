---
name: satsAt:docs
description: This skill should be used when the user asks to 'generate documentation', 'write API docs', 'create README', 'document this', or mentions 'documentation'. It generates technical documentation for SatsAt including API docs, user guides, and architecture overviews.
version: 1.0.0
---

# Documentation Generator

You are generating technical documentation for SatsAt. Good documentation enables self-service, reduces support burden, and improves developer experience.

## Documentation Types

| Type | Purpose | Audience |
|------|---------|----------|
| **API Documentation** | Endpoint reference | Developers integrating |
| **README** | Quick start guide | New developers |
| **User Guide** | How to use features | End users |
| **Architecture Doc** | System design overview | Development team |
| **CHANGELOG** | Version history | Users and developers |

---

## API Documentation Template

```markdown
# API Reference: [Section Name]

**Base URL:** `https://api.satsat.io/v1`

## Overview

[Brief description of this API section]

## Authentication

All API requests require authentication via Bearer token:

```
Authorization: Bearer <your-api-token>
```

Tokens are JWT issued by Supabase Auth.

---

## Endpoints

### [Endpoint Name]

`[METHOD] /path/:parameter`

**Description:**
[What this endpoint does]

**Authentication:** Required / Optional / None

**Rate Limit:** [X requests per minute]

#### Parameters

| Name | Type | In | Required | Description |
|------|------|-----|----------|-------------|
| `id` | string | path | Yes | Wallet identifier (UUID) |
| `page` | number | query | No | Page number (default: 1) |
| `limit` | number | query | No | Items per page (default: 50, max: 100) |

#### Request Body

```json
{
  "name": "string",
  "xpub": "string",
  "type": "single_sig | multisig | exchange"
}
```

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `name` | string | Yes | Display name for wallet |
| `xpub` | string | Yes* | Extended public key (Bitcoin only) |
| `type` | string | Yes | Wallet type |

#### Response

| Status | Description |
|--------|-------------|
| 200 | Success |
| 400 | Bad request (validation error) |
| 401 | Unauthorized |
| 403 | Forbidden (not your resource) |
| 404 | Not found |
| 429 | Rate limited |

**Success Response (200):**

```json
{
  "data": {
    "id": "uuid",
    "name": "My Cold Storage",
    "type": "single_sig",
    "balance_sats": 150000000,
    "balance_usd": 67500.00,
    "created_at": "2024-01-15T10:30:00Z"
  }
}
```

**Error Response (400):**

```json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Invalid xpub format",
    "details": {
      "field": "xpub",
      "reason": "Must start with xpub, ypub, or zpub"
    }
  }
}
```

#### Example

```bash
curl -X POST https://api.satsat.io/v1/wallets \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "My Cold Storage",
    "xpub": "xpub...",
    "type": "single_sig"
  }'
```
```

---

## README Template

```markdown
# SatsAt

Portfolio tracking for serious Bitcoiners.

![License](https://img.shields.io/badge/license-MIT-blue)
![Build](https://img.shields.io/github/actions/workflow/status/org/satsat/ci.yml)

## Features

- **Multisig Native** - 2-of-3, 3-of-5 wallets tracked as single entities
- **UTXO-Level Tracking** - Accurate cost basis per output
- **Internal Transfer Detection** - No phantom taxable events
- **Tax Reports** - IRS Form 8949 generation

## Quick Start

### Prerequisites

- Node.js 18+
- Supabase account (or local Supabase)

### Installation

```bash
# Clone repository
git clone https://github.com/org/satsat.git
cd satsat

# Install dependencies
npm install

# Set up environment
cp .env.example .env.local
# Edit .env.local with your Supabase credentials

# Run development server
npm run dev
```

### Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `NEXT_PUBLIC_SUPABASE_URL` | Yes | Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Yes | Supabase anon key |
| `SUPABASE_SERVICE_ROLE_KEY` | Yes | Supabase service role key |
| `COINGECKO_API_KEY` | No | Increases rate limit |
| `ETHERSCAN_API_KEY` | Yes* | Required for stablecoins |

## Usage

### Adding a Wallet

1. Navigate to Wallets
2. Click "Add Wallet"
3. Enter your xpub (watch-only, we never see private keys)
4. Wait for sync to complete

### Generating Tax Reports

1. Navigate to Tax
2. Select tax year
3. Choose cost basis method (FIFO, LIFO, HIFO)
4. Click "Generate Report"
5. Download CSV or 8949 format

## Project Structure

```
src/
├── app/                    # Next.js App Router
├── components/             # React components
├── lib/                    # Utilities
│   ├── bitcoin/            # Bitcoin utilities
│   └── tax/                # Tax calculations
└── types/                  # TypeScript types
```

## Development

```bash
npm run dev          # Development server
npm run build        # Production build
npm run lint         # Lint code
npm test             # Run tests
npm run type-check   # TypeScript check
```

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Run tests
5. Submit a pull request

## License

MIT License - see [LICENSE](LICENSE) for details.
```

---

## User Guide Template

```markdown
# SatsAt User Guide

## Getting Started

### Creating Your Account

1. Go to [satsat.io/signup](https://satsat.io/signup)
2. Enter your email and password
3. Verify your email
4. Complete your profile

### Adding Your First Wallet

SatsAt uses **watch-only** data. We never have access to your private keys.

**What is an xpub?**

An extended public key (xpub) allows us to see your wallet's transactions without being able to spend your Bitcoin. Find it in your wallet software under "Settings" or "Export."

**Steps:**

1. Click "Add Wallet" on the dashboard
2. Enter a name (e.g., "Cold Storage")
3. Paste your xpub
4. Select wallet type
5. Click "Add"

Your wallet will begin syncing. This may take a few minutes for wallets with many transactions.

### Understanding Your Dashboard

**Portfolio Summary**
- Total value across all wallets
- 24-hour change
- Holdings breakdown by asset

**Recent Activity**
- Latest transactions
- Pending syncs
- Alerts

### Tax Reporting

**Supported Methods:**
- **FIFO** (First In, First Out) - Most common
- **LIFO** (Last In, First Out) - May minimize short-term gains
- **HIFO** (Highest In, First Out) - Minimizes gains

**Generating a Report:**

1. Go to Tax → Reports
2. Select the tax year
3. Choose your cost basis method
4. Review the summary
5. Download Form 8949 or CSV

**Important:** Consult a tax professional. SatsAt provides data for informational purposes only.

## FAQ

**Q: Is my data secure?**
A: Yes. We use Supabase with Row Level Security. Your data is encrypted and only accessible to you.

**Q: Why can't you see my private keys?**
A: We only store xpubs (extended public keys), which can view transactions but cannot spend funds.

**Q: How accurate is the cost basis?**
A: We track at the UTXO level for maximum accuracy. Our calculations follow IRS guidelines.

**Q: Can I track multiple wallets?**
A: Yes! Free tier: 3 wallets. Holder: 10 wallets. Sovereign: Unlimited.
```

---

## Architecture Documentation Template

```markdown
# SatsAt Architecture Overview

## System Diagram

```
┌─────────────────────────────────────────────────────────────┐
│                         FRONTEND                             │
│  Next.js 14 (App Router) + TypeScript + Tailwind            │
│  - Dashboard, Wallets, Transactions, Tax, Settings          │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                      API LAYER                               │
│  Next.js API Routes + Server Actions                         │
│  - /api/wallets/*, /api/transactions/*, /api/tax/*          │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                      DATA LAYER                              │
│  Supabase (PostgreSQL + Auth + RLS)                          │
│  - users, wallets, transactions, tax_lots                   │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                   EXTERNAL SERVICES                          │
│  - Mempool.space (Bitcoin data)                              │
│  - CoinGecko (prices)                                        │
│  - Etherscan (stablecoins)                                   │
│  - Stripe (payments)                                         │
└─────────────────────────────────────────────────────────────┘
```

## Key Components

### Wallet Sync Engine

Responsible for fetching blockchain data and updating local state.

```
xpub → Derive addresses → Fetch from Mempool →
Parse UTXOs → Create transactions → Create tax lots
```

### Cost Basis Calculator

Implements FIFO, LIFO, HIFO algorithms at UTXO level.

### Internal Transfer Detector

Identifies transactions between user's own wallets to exclude from taxable events.

## Data Flow

### Adding a Wallet

1. User submits xpub
2. API validates xpub format
3. Wallet record created
4. Background job triggers sync
5. Transactions fetched from blockchain
6. Tax lots created for receives
7. UI updated via real-time subscription

### Generating Tax Report

1. User selects year and method
2. API retrieves all disposed tax lots for year
3. Cost basis calculated using selected method
4. Report formatted (8949 or CSV)
5. File returned for download

## Security Architecture

- **Authentication:** Supabase Auth (JWT)
- **Authorization:** Row Level Security on all tables
- **Data:** Encrypted at rest (Supabase default)
- **Transport:** HTTPS only (Vercel)
- **Keys:** Never stored - xpubs only
```

---

## CHANGELOG Template

```markdown
# Changelog

All notable changes to SatsAt will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/).

## [Unreleased]

### Added
- [Feature description]

### Changed
- [Change description]

### Fixed
- [Bug fix description]

## [1.2.0] - 2024-02-15

### Added
- Multisig wallet support (2-of-3, 3-of-5)
- Internal transfer detection
- HIFO cost basis method

### Changed
- Improved sync performance for large wallets
- Updated dashboard UI

### Fixed
- Cost basis calculation for same-day transactions
- Timezone handling in tax reports

## [1.1.0] - 2024-01-30

### Added
- USDT/USDC tracking (Ethereum)
- Exchange CSV import (Coinbase, Kraken)

### Fixed
- Historical price lookup for weekends

## [1.0.0] - 2024-01-15

### Added
- Initial release
- Bitcoin wallet tracking via xpub
- Transaction history
- Cost basis calculation (FIFO, LIFO)
- Tax report generation (8949, CSV)
- User authentication
- Subscription tiers
```
