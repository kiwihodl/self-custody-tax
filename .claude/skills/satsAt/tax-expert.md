---
name: satsAt:tax-expert
description: Use this skill for crypto tax knowledge, IRS reporting requirements, state tax laws, competitor analysis, cost basis methods, and tax law research. Reference this when building tax-related features or creating content about crypto taxation.
version: 1.0.0
---

# Crypto Tax Expert Knowledge Base

You are a crypto tax expert for SatsAt. This skill provides authoritative knowledge on cryptocurrency taxation, competitor features, IRS requirements, and state-by-state tax laws.

---

## Part 1: IRS Cryptocurrency Tax Rules

### Classification

The IRS classifies cryptocurrency as **property**, not currency. This means crypto is taxed like stocks or real estate - any sale, trade, or disposal can trigger capital gains or losses.

### Taxable Events

| Event | Tax Treatment |
|-------|---------------|
| Selling crypto for fiat | Capital gain/loss |
| Trading crypto for crypto | Capital gain/loss |
| Using crypto to buy goods/services | Capital gain/loss |
| Receiving crypto as payment | Ordinary income |
| Mining rewards | Ordinary income |
| Staking rewards | Ordinary income |
| Airdrops | Ordinary income |
| Hard fork tokens | Ordinary income (at receipt) |

### Non-Taxable Events

| Event | Why Not Taxable |
|-------|-----------------|
| Buying crypto with fiat | No disposal |
| Transferring between own wallets | No change in ownership |
| Gifting crypto (under $18k/year) | Gift tax exclusion |
| Donating to charity | Deduction, not income |
| Holding crypto | No realization event |

### Capital Gains Tax Rates (2025-2026)

**Short-Term (held ≤ 1 year):** Taxed as ordinary income

| Tax Bracket (Single) | Rate |
|---------------------|------|
| $0 - $11,600 | 10% |
| $11,601 - $47,150 | 12% |
| $47,151 - $100,525 | 22% |
| $100,526 - $191,950 | 24% |
| $191,951 - $243,725 | 32% |
| $243,726 - $609,350 | 35% |
| $609,351+ | 37% |

**Long-Term (held > 1 year):**

| Income Level (Single) | Rate |
|----------------------|------|
| $0 - $47,025 | 0% |
| $47,026 - $518,900 | 15% |
| $518,901+ | 20% |

**Net Investment Income Tax (NIIT):** Additional 3.8% for incomes over $200,000 (single) or $250,000 (married).

---

## Part 2: Required Tax Forms

### Form 8949 - Sales and Dispositions

**Purpose:** Report each individual crypto transaction with capital gain/loss.

**Parts:**
- **Part I:** Short-term transactions (held ≤ 1 year)
- **Part II:** Long-term transactions (held > 1 year)

**Box Codes:**
| Box | Description |
|-----|-------------|
| A | Short-term, basis reported to IRS (exchange sales) |
| B | Short-term, basis NOT reported to IRS (self-custody) |
| C | Short-term, no 1099-B received |
| D | Long-term, basis reported to IRS |
| E | Long-term, basis NOT reported to IRS |
| F | Long-term, no 1099-B received |

**Required Columns:**
1. Description (e.g., "0.5 BTC")
2. Date Acquired
3. Date Sold
4. Proceeds
5. Cost Basis
6. Adjustment Code (if any)
7. Adjustment Amount
8. Gain or Loss

### Schedule D - Capital Gains Summary

**Purpose:** Summarize totals from Form 8949.

**Lines:**
- Lines 1-7: Short-term gains/losses
- Lines 8-14: Long-term gains/losses
- Line 16: Net gain/loss

### Form 1099-DA (NEW for 2025)

**Purpose:** Brokers report digital asset sales to IRS.

**Timeline:**
- 2025: Brokers must report gross proceeds
- 2026: Brokers must report cost basis
- Early 2026: Taxpayers receive 1099-DA for 2025 transactions

**Important:** Self-custody transactions won't appear on 1099-DA. Users must still self-report.

### Schedule 1 / Schedule C

**Purpose:** Report crypto income (mining, staking, payments).

- **Schedule 1:** Occasional income
- **Schedule C:** Business/self-employment income

---

## Part 3: Cost Basis Methods

### FIFO (First In, First Out)

**How it works:** Oldest lots sold first.

**Best for:**
- Markets that appreciated over time
- Maximizing long-term gains treatment
- Default IRS method

**Example:**
```
Lot 1: Bought 1 BTC at $20,000 (Jan 2023)
Lot 2: Bought 1 BTC at $40,000 (Jan 2024)

Selling 1 BTC → Uses Lot 1 ($20,000 basis)
```

### LIFO (Last In, First Out)

**How it works:** Newest lots sold first.

**Best for:**
- Minimizing gains in appreciating markets
- Tax loss harvesting on recent purchases
- Volatile markets with recent high-cost purchases

**Example:**
```
Lot 1: Bought 1 BTC at $20,000 (Jan 2023)
Lot 2: Bought 1 BTC at $40,000 (Jan 2024)

Selling 1 BTC → Uses Lot 2 ($40,000 basis)
```

### HIFO (Highest In, First Out)

**How it works:** Highest cost basis lots sold first.

**Best for:**
- Minimizing taxable gains
- Tax optimization (legal tax minimization)
- Most favorable for most users

**Example:**
```
Lot 1: Bought 1 BTC at $20,000 (Jan 2023)
Lot 2: Bought 1 BTC at $65,000 (Nov 2024)
Lot 3: Bought 1 BTC at $40,000 (Jan 2024)

Selling 1 BTC → Uses Lot 2 ($65,000 basis)
```

### Specific Identification

**How it works:** User chooses which lot to sell.

**Requirements:**
- Must identify lot at time of sale
- Must maintain records proving identification
- Most control but most record-keeping

### IRS Requirements (Rev. Proc. 2024-28)

Starting 2025, brokers must use **per-wallet cost basis tracking**. This affects:
- Exchange reporting
- Transfers between exchanges
- Cost basis portability

**SatsAt Advantage:** We already track at UTXO level, exceeding IRS requirements.

---

## Part 4: State Tax Laws

### States with NO Income Tax

| State | Notes |
|-------|-------|
| Alaska | No state income or capital gains tax |
| Florida | No state income tax |
| Nevada | No state income tax |
| New Hampshire | No income tax on wages/gains (interest/dividends taxed until 2025) |
| South Dakota | No state income tax |
| Tennessee | No state income tax (interest/dividends exemption ended 2021) |
| Texas | No state income tax |
| Washington | No income tax, BUT 7% capital gains tax on gains > $262,000 |
| Wyoming | No state income tax |

### States with Capital Gains Benefits

| State | Benefit |
|-------|---------|
| **Arizona** | Flat 2.5% income tax rate on all income including crypto |
| **Colorado** | 4.4% flat tax rate |
| **Iowa** | Phasing to 3.9% flat rate by 2026 |
| **Missouri** | Capital gains exempt from state tax (2025+) |
| **Montana** | Long-term gains taxed at 3-4.1% (lower than income) |
| **New Mexico** | 40% deduction on net capital gains |
| **North Dakota** | 40% deduction on long-term gains |
| **South Carolina** | 44% deduction on long-term gains |
| **Vermont** | $5,000 deduction on capital gains |
| **Wisconsin** | 30% deduction on long-term gains |

### High-Tax States

| State | Max Rate | Notes |
|-------|----------|-------|
| **California** | 13.3% | No preferential treatment for long-term gains |
| **New York** | 10.9% | Plus NYC can add 3.876% |
| **New Jersey** | 10.75% | High rate, limited deductions |
| **Oregon** | 9.9% | No sales tax offset |
| **Minnesota** | 9.85% | |
| **Vermont** | 8.75% | Despite $5k deduction |
| **Hawaii** | 11% | Highest bracket |

### Washington State Special Rules

- No income tax BUT has capital gains tax
- 7% on gains over ~$262,000 (indexed for inflation)
- Additional 2.9% on gains over $1 million (effective 9.9%)
- $278,000 exemption limit

### Maryland Special Rules

- Additional 2% surtax on capital gains
- Only applies to income > $350,000

---

## Part 5: Competitor Analysis

### Koinly

**Pricing:**
| Plan | Price | Transactions |
|------|-------|--------------|
| Newbie | $49/yr | 100 |
| Hodler | $99/yr | 1,000 |
| Trader | $179/yr | 3,000 |
| Oracle | $279/yr | 10,000+ |

**Strengths:**
- 800+ exchange/wallet integrations
- 20+ country support
- DeFi/NFT support
- TurboTax/H&R Block export
- Free transaction import (pay only for reports)

**Weaknesses:**
- No native multisig support
- Treats each address as separate wallet
- Internal transfers create phantom events
- No UTXO-level tracking
- Support only on higher tiers

**API:** Limited - CSV/API import only, no public API for developers

**Accountant Features:** Team plan available but limited

---

### CoinTracker

**Pricing:**
| Plan | Price | Transactions |
|------|-------|--------------|
| Free | $0 | 25 |
| Base | $59/yr | 100 |
| Prime | $199/yr | 1,000 |
| Ultra | $599/yr | 10,000 |

**Strengths:**
- 500+ integrations
- Official TurboTax partner
- Rev. Proc. 2024-28 compliant (per-wallet basis)
- AI-powered transaction search
- Real-time portfolio tracking

**Weaknesses:**
- Priority support only on Ultra ($599)
- Tax loss harvesting only on Prime+
- Expensive for high transaction users
- No multisig support

**API:** Private API for CPA partners only

**Accountant Features:**
- Dedicated CPA section
- Client management dashboard
- One-on-one training available

---

### CoinLedger (formerly CryptoTrader.Tax)

**Pricing:**
| Plan | Price | Transactions |
|------|-------|--------------|
| Hobbyist | $49/yr | 100 |
| Day Trader | $99/yr | 1,500 |
| High Volume | $199/yr | 5,000 |
| Unlimited | $299/yr | Unlimited |

**Strengths:**
- Unlimited plan available
- Simple UI
- Fast tax report generation
- Good for beginners

**Weaknesses:**
- Limited DeFi support
- No multisig support
- Basic portfolio tracking
- No UTXO tracking

**Accountant Features:**
- CPA portal for client management
- Bulk client import
- Download reports on behalf

---

### CryptoTaxCalculator

**Pricing:**
| Plan | Price | Transactions |
|------|-------|--------------|
| Rookie | $49/yr | 100 |
| Hobbyist | $99/yr | 1,000 |
| Investor | $189/yr | 10,000 |
| Trader | $299/yr | 100,000 |

**Strengths:**
- Best DeFi/NFT support
- Advanced transaction categorization
- Real-time collaboration
- 22+ country support

**Weaknesses:**
- Complex UI for beginners
- Higher prices for volume
- No multisig support

**Accountant Features:**
- Free Accountant Portal
- Real-time client collaboration
- Notes and flagging system
- View tax obligations

---

### Ledgible

**Pricing:** Custom enterprise pricing

**Strengths:**
- Built for CPAs/professionals
- AICPA SOC 1 & 2 Type 2 certified
- Multi-client management
- Audit trail transparency
- Integrates with accounting software

**Weaknesses:**
- Expensive (enterprise focus)
- Less suitable for individuals
- Overkill for small portfolios

**API:** Full API access for enterprise clients

**Accountant Features:**
- Primary focus
- Unlimited client management
- White-label options
- Custom reporting

---

### TaxBit (Enterprise Only)

**Note:** Shut down consumer product in 2023. Now B2B only.

**Strengths:**
- Powers exchange 1099 reporting
- Government contracts
- TaxBit Network for verified data
- Enterprise-grade accuracy

**Target:** Exchanges, brokers, institutions, governments

**API:** Full enterprise API

---

### Cryptoworth

**Pricing:** Starting $89/month

**Strengths:**
- Real-time crypto accounting
- QuickBooks/Netsuite/Xero/Sage integration
- DeFi accounting
- Multi-entity support

**Target:** Businesses and funds

**API:** Full API for accounting integrations

---

## Part 6: Feature Gap Analysis (SatsAt Opportunities)

### What Competitors LACK (Our Differentiators)

| Feature | Koinly | CoinTracker | CoinLedger | SatsAt |
|---------|--------|-------------|------------|--------|
| Native multisig support | No | No | No | **Yes** |
| UTXO-level cost basis | No | No | No | **Yes** |
| Auto internal transfer detection | Partial | Partial | No | **Yes** |
| Collaborative custody (Unchained/Casa) | No | No | No | **Yes** |
| Descriptor-based wallet import | No | No | No | **Yes** |
| Self-custody focused | No | No | No | **Yes** |

### Competitor Features We Should Add

| Feature | Competitors Have | Priority |
|---------|------------------|----------|
| Public API | Ledgible, TaxBit, Cryptoworth | **P1 - Advisor tier** |
| Multi-client dashboard | All CPA tools | **P1 - Advisor tier** |
| White-label reports | Ledgible, Monaco CPA | **P2 - Advisor tier** |
| TurboTax integration | Koinly, CoinTracker | P2 |
| Tax loss harvesting alerts | CoinTracker Prime | P3 |
| Real-time portfolio alerts | Most competitors | P3 |

---

## Part 7: Advisor/CPA Features Research

### What CPAs Need

1. **Multi-Client Dashboard**
   - Single view of all client portfolios
   - Quick status check (missing data, pending review)
   - Bulk report generation
   - Client invitation system

2. **API Access**
   - Programmatic data export
   - Integration with practice management
   - Automated report generation
   - Webhook notifications

3. **White-Label Reports**
   - Custom branding (logo, colors)
   - Firm name on reports
   - Professional PDF formatting
   - Client-ready deliverables

4. **Collaboration Features**
   - Client notes and flags
   - Transaction review workflow
   - Audit trail for changes
   - Role-based access (view/edit)

### Pricing Benchmarks

| Software | Accountant Plan | Per Client |
|----------|-----------------|------------|
| Ledgible | Custom | Enterprise pricing |
| CoinTracker | Ultra $599 | Included |
| CryptoTaxCalculator | Free portal | Client pays |
| Recap | Free for accountants | Client pays |

**SatsAt Advisor at $499/year is competitive** - needs to deliver:
- Unlimited clients (or high limit)
- API access
- White-label capability
- Priority support

---

## Part 8: International Considerations

### CARF (Crypto-Asset Reporting Framework)

- OECD framework for international crypto tax info sharing
- Similar to CRS (Common Reporting Standard)
- 48+ countries committed
- US considering implementation (2025 Treasury recommendation)

### Countries with No Crypto Tax

| Country | Notes |
|---------|-------|
| UAE | No income or capital gains tax |
| Cayman Islands | No direct taxation |
| Bermuda | No income tax |
| Portugal | Was tax-free, now taxed (2023+) |
| Singapore | No capital gains tax |
| Hong Kong | No capital gains tax |
| Malaysia | No capital gains tax |
| Switzerland | No capital gains for individuals (income from trading is taxed) |

### Major Markets with Crypto Tax

| Country | Treatment |
|---------|-----------|
| **UK** | Capital gains, £3,000 allowance (reduced from £12,300) |
| **Germany** | Tax-free after 1 year hold |
| **Australia** | Capital gains, 50% discount for 1+ year |
| **Canada** | 50% of gains taxable as income |
| **Japan** | Up to 55% as miscellaneous income |

---

## Part 9: Common Tax Scenarios

### Scenario 1: Exchange to Self-Custody

**Problem:** User buys on exchange, withdraws to hardware wallet.

**Tax Impact:** None - this is an internal transfer.

**SatsAt Advantage:** Auto-detects wallet-to-wallet transfers.

### Scenario 2: Multisig Consolidation

**Problem:** User consolidates UTXOs within same multisig.

**Tax Impact:** None - same wallet, just UTXO management.

**Competitor Failure:** May show as send+receive = phantom gain.

**SatsAt Advantage:** Understands multisig = one wallet.

### Scenario 3: DCA with Multiple Cost Bases

**Problem:** User buys weekly, now selling portion.

**Tax Impact:** Must select which lots to sell (FIFO/LIFO/HIFO).

**SatsAt Feature:** UTXO-level tracking with method selection.

### Scenario 4: Inherited Bitcoin

**Problem:** User inherited BTC, needs stepped-up basis.

**Tax Impact:** Cost basis = FMV at date of death.

**SatsAt Feature:** Manual cost basis override with notes.

### Scenario 5: Mining Income

**Problem:** User mined BTC, now selling.

**Tax Impact:**
1. Income at FMV when received
2. Capital gain/loss on disposal

**SatsAt Feature:** "Mining" acquisition type tracks both.

---

## Part 10: Tax Calendar

### Key Dates (US)

| Date | Event |
|------|-------|
| January 1 | Tax year begins |
| January 31 | Exchanges issue 1099s |
| April 15 | Tax filing deadline |
| October 15 | Extended filing deadline |
| December 31 | Last day for tax loss harvesting |

### Quarterly Estimated Taxes

If expecting to owe $1,000+ in taxes:

| Quarter | Due Date |
|---------|----------|
| Q1 (Jan-Mar) | April 15 |
| Q2 (Apr-May) | June 15 |
| Q3 (Jun-Aug) | September 15 |
| Q4 (Sep-Dec) | January 15 (next year) |

---

## Part 11: Tax Loss Harvesting

### What It Is

Selling at a loss to offset gains. The loss can offset:
1. Other capital gains (unlimited)
2. Ordinary income (up to $3,000/year)
3. Carried forward indefinitely

### Wash Sale Warning

The IRS wash sale rule (30-day rule) may apply to crypto soon. Currently:
- **Stocks:** Cannot repurchase within 30 days
- **Crypto:** Wash sale rule does NOT currently apply (but proposed legislation exists)

### Best Practices

1. Harvest losses in December
2. Document all transactions
3. Don't repurchase immediately (future-proofing)
4. Use HIFO method to minimize gains year-round

---

## Part 12: Audit Defense

### What IRS Looks For

1. **Unreported income** - Mining, staking, airdrops
2. **Incorrect cost basis** - Using exchange price vs actual
3. **Missing transactions** - P2P trades, DEX swaps
4. **Wash sale abuse** - If rules apply
5. **Foreign account reporting** - FBAR for overseas exchanges

### Documentation to Keep

- Exchange transaction history
- Wallet addresses owned
- Cost basis calculations
- Tax lot disposal records
- Internal transfer evidence

### SatsAt Audit Features

1. Complete transaction history export
2. Tax lot detail with acquisition source
3. Internal transfer documentation
4. Cost basis calculation methodology
5. Form 8949 generation with all required fields

---

## Sources

Research compiled from:
- [IRS Digital Assets](https://www.irs.gov/filing/digital-assets)
- [Koinly Crypto Tax Guide](https://koinly.io/guides/crypto-taxes/)
- [CoinLedger Tax Guide](https://coinledger.io/guides/crypto-tax)
- [Koinly State Tax Guide](https://koinly.io/blog/us-bitcoin-crypto-tax-rates/)
- [TokenTax Rate Guide](https://tokentax.co/blog/tax-rates-for-cryptocurrency)
- [CoinGecko Tax Software Comparison](https://www.coingecko.com/learn/top-crypto-tax-software)
- [Bloomberg Tax State Guide](https://pro.bloombergtax.com/insights/state-tax/cryptocurrency-tax-laws-by-state/)
- [Ledgible Professional Tools](https://ledgible.io/)
- [CryptoTaxCalculator CPA Features](https://cryptopotato.com/best-crypto-tax-software-for-cpas/)
