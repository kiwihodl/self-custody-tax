# PRD: Phase 11 - Tax Optimization Tools

**Status:** Approved
**Author:** Claude Code
**Created:** January 11, 2026
**Last Updated:** January 11, 2026

---

## 1. Overview

### Problem Statement
Self-custody Bitcoin holders lack proactive tax optimization tools. While they can view their unrealized gains, they have no way to simulate selling positions to harvest losses, identify when holdings approach long-term status (>1 year), or export their tax data directly to TurboTax Desktop. Competitors like Koinly, CoinTracker, and CoinLedger all offer tax-loss harvesting tools and TurboTax integration that we currently lack.

### Proposed Solution
Add three tax optimization features: (1) A Tax-Loss Harvesting Tool that shows unrealized losses with "what-if" sale simulations, (2) TurboTax TXF export format for direct import to TurboTax Desktop, and (3) Holding Period Alerts that notify users when lots approach long-term capital gains eligibility.

### Goals
1. **Primary:** Enable users to strategically reduce tax liability through loss harvesting simulation
2. **Secondary:** Provide seamless TurboTax Desktop integration via TXF export
3. **Tertiary:** Help users optimize timing of sales for favorable tax treatment

### Non-Goals
- Real-time portfolio rebalancing recommendations
- Integration with trading/exchange APIs for automated selling
- Support for TurboTax Online (doesn't support file import)
- Wash sale rule enforcement (currently doesn't apply to crypto, but we add educational warning)

---

## 2. Decisions Made

### Open Questions Resolved

1. **Tax bracket input:** YES - Allow users to input their marginal tax rate for accurate savings estimates
2. **Summary mode for >4,000 transactions:** YES - Provide summary totals when transaction count exceeds TurboTax limit
3. **Holding period alerts:** BOTH - Default ON with clear language about transaction date vs purchase date, allow manual override
4. **Wash sale warnings:** EDUCATIONAL ONLY - Add informational warning (wash sale rules don't currently apply to crypto, but best practice is to wait before repurchasing)

---

## 3. User Stories

### Primary User: Bitcoin Self-Custody Holder
As a Bitcoin holder with unrealized losses, I want to see which positions I could sell to offset my gains so that I can minimize my tax liability for the year.

**Acceptance Criteria:**
- [ ] Given I have tax lots with unrealized losses, when I view the harvesting tool, then I see all positions with negative unrealized gains sorted by loss amount
- [ ] Given I select lots to "simulate sell", when I run the simulation, then I see the estimated tax impact including reduced liability
- [ ] Given I input my tax bracket (e.g., 24%), when I simulate harvesting, then savings are calculated using my rate

### Secondary User: Bitcoin Holder Filing Taxes
As a Bitcoin holder using TurboTax Desktop, I want to export my transactions in TXF format so that I can import directly without manual data entry.

**Acceptance Criteria:**
- [ ] Given I have disposed tax lots, when I export in TXF format, then the file uses correct YYYYMMDD date format
- [ ] Given I have >4,000 transactions, when I export, then I get a summary mode option
- [ ] Given I import the TXF file into TurboTax, when TurboTax parses it, then all transactions appear correctly on Form 8949

### Tertiary User: Long-Term Holder
As a Bitcoin holder approaching 1-year holding periods, I want to be notified when lots become long-term eligible so that I can plan sales for lower tax rates.

**Acceptance Criteria:**
- [ ] Given I have a lot that will become long-term in 30 days, when I view my dashboard, then I see a notification
- [ ] Given I opt into email alerts, when a lot becomes long-term, then I receive an email notification
- [ ] Given a lot's transaction date differs from actual purchase date, when I view alerts, I see clear language explaining this

---

## 4. Requirements

### Functional Requirements

| ID | Requirement | Priority | Notes |
|----|-------------|----------|-------|
| FR-1 | Tax-Loss Harvesting page showing all lots with unrealized losses | Must Have | Sorted by loss amount descending |
| FR-2 | "Simulate Sale" feature to calculate tax impact of selling selected lots | Must Have | Show before/after tax liability |
| FR-3 | User tax bracket input (10-37%) for accurate savings estimate | Must Have | Default 24% |
| FR-4 | Summary card showing total harvestable losses vs realized gains YTD | Must Have | Quick glance optimization |
| FR-5 | Educational wash sale warning in simulation results | Must Have | Informational only |
| FR-6 | TXF file export for TurboTax Desktop | Must Have | YYYYMMDD format |
| FR-7 | Summary mode for >4,000 transactions in TXF export | Must Have | Aggregate totals |
| FR-8 | Holding period countdown showing days until long-term | Must Have | On gains page per lot |
| FR-9 | Dashboard widget showing lots approaching long-term (30 days) | Should Have | Quick visibility |
| FR-10 | Email notification when lot becomes long-term eligible | Should Have | Opt-in setting |
| FR-11 | Clear language distinguishing transaction date vs purchase date | Must Have | User education |
| FR-12 | Batch select lots for harvest simulation | Nice to Have | Select multiple to simulate |

### Non-Functional Requirements

| ID | Requirement | Target |
|----|-------------|--------|
| NFR-1 | Performance | Harvest simulation < 500ms |
| NFR-2 | Security | Auth required for all features |
| NFR-3 | Accuracy | Tax calculations match 8949 output |
| NFR-4 | Export Size | TXF supports up to 4,000 transactions (summary mode beyond) |

---

## 5. Technical Implementation

### New Files to Create
- `/src/app/api/tax/harvest-simulation/route.ts` - Simulation API
- `/src/lib/export/txf-generator.ts` - TXF file format generator
- `/src/components/harvest-simulation.tsx` - Harvest UI component
- `/src/components/holding-alerts.tsx` - Holding period alerts component

### Files to Modify
- `/src/app/gains/page.tsx` - Add harvest tab
- `/src/app/tax/page.tsx` - Add TXF export option
- `/src/app/dashboard/page.tsx` - Add holding period alert widget
- `/src/app/settings/page.tsx` - Add alert preferences

---

## 6. Sources

- [Koinly Tax-Loss Harvesting Tool](https://koinly.io/blog/best-free-crypto-tax-loss-harvesting-tool/)
- [CoinTracker Tax-Loss Harvesting](https://www.cointracker.io/blog/the-2020-tax-loss-harvesting-guide)
- [TurboTax TXF Import Guide](https://ttlc.intuit.com/turbotax-support/en-us/help-article/import-export-data-files/import-txf-file/L47YK56cd_US_en_US)
- [Crypto Wash Sale Rule 2026](https://tokentax.co/blog/wash-sale-trading-in-crypto)
- [CoinLedger Wash Sale Analysis](https://coinledger.io/blog/crypto-wash-sale-rule)
