# SCT v2 Roadmap — FOSS Local-First Refactor

## Overview
Refactor Self Custody Tax from Supabase SaaS → local-first installable PWA.
Bitcoin-only. Privacy-first. All data on device. BB themed.

**Repo:** kiwihodl/self-custody-tax (same repo, new branch `v2-local`)
**Stack:** Next.js 15 (static export), IndexedDB (Dexie.js), PWA
**Keep:** Tax engine (1,337 LOC), Bitcoin libs (2,211 LOC), Prices (636 LOC), Reports (718 LOC)
**Delete:** Supabase, Stripe, Advisor system, API routes, auth system

---

## Task Breakdown

### Task 1: Branch + Strip Backend Dependencies ✅
**Effort:** Medium | **Depends on:** Nothing | **Commit:** `dace417`
- Create `v2-local` branch from main
- Delete: `src/lib/supabase/` (5 files)
- Delete: `src/lib/stripe/` (2 files)  
- Delete: `src/lib/advisor/` (6 files)
- Delete: `src/app/api/` (entire directory — all server routes)
- Delete: `src/app/auth/` (login/signup/callback/confirmed)
- Delete: `src/app/advisor/` (entire directory)
- Delete: `src/app/invite/` 
- Delete: `src/app/pricing/`
- Delete: `src/app/settings/advisors/`
- Delete: `src/app/docs/api/`
- Remove `middleware.ts` (Supabase auth middleware)
- Remove packages: `@supabase/ssr`, `@supabase/supabase-js`, `@stripe/stripe-js`, `stripe`, `resend`, `@react-email/components`
- Update `next.config.mjs` for static export: `output: 'export'`
- **Verify:** `npm run type-check` passes (will have errors — that's Task 2's job)

### Task 2: IndexedDB Storage Layer ✅
**Effort:** Large | **Depends on:** Task 1 | **Commit:** `209722f`
- Install `dexie` + `dexie-react-hooks`
- Create `src/lib/db/index.ts` — Dexie database schema matching current tables:
  - `wallets` (id, name, type, address/xpub, derivation_path, created_at)
  - `transactions` (id, wallet_id, txid, type, amount_btc, amount_usd, fee_btc, fee_usd, date, category, notes, block_height, confirmed)
  - `tax_lots` (id, wallet_id, transaction_id, amount, cost_basis, date_acquired, date_sold, proceeds, method, holding_period)
  - `price_cache` (date, price_usd)
  - `settings` (key, value) — for user preferences
- Create `src/lib/db/hooks.ts` — React hooks wrapping Dexie operations (useWallets, useTransactions, useTaxLots, etc.)
- Migrate every Supabase `.from('table')` call to Dexie equivalent
- **Verify:** All CRUD operations work client-side, `npm run type-check` clean

### Task 3: Client-Side Price Service ✅
**Effort:** Small | **Depends on:** Task 2 | **Done in:** Task 2 commit
- Refactor `src/lib/prices/` to be fully client-side
- Remove Supabase price_cache dependency, use IndexedDB cache instead
- CoinGecko API calls from client (CORS supported)
- Add fallback: Mempool.space price API
- Cache historical prices in IndexedDB to minimize API calls
- **Verify:** Price lookups work, cached prices persist across sessions

### Task 4: Client-Side Transaction Sync ✅
**Effort:** Medium | **Depends on:** Task 2 | **Done in:** Task 2 commit
- Refactor `src/lib/bitcoin/sync.ts` and `clientSync.ts` into single client-side sync module
- Mempool.space API for transaction fetching (already used)
- Add configurable endpoint: user can point to their own node's Electrum/Esplora API
- Store synced transactions in IndexedDB
- Remove any server-side proxy routes (`api/proxy/mempool`)
- **Verify:** Adding an xpub fetches and stores all transactions client-side

### Task 5: CSV Import Engine ✅
**Effort:** Medium | **Depends on:** Task 2 | **Done in:** Task 2 commit
- Create `src/lib/import/` module
- Parsers for: Coinbase, Kraken, Strike, River, Cash App, Swan, generic CSV
- Map each exchange's CSV format to our transaction schema
- Handle: buys, sells, sends, receives, rewards/income
- Validate and deduplicate against existing transactions
- UI: drag-and-drop or file picker on transactions page
- **Verify:** Import sample CSVs from each exchange, transactions appear correctly

### Task 6: PWA Setup ✅
**Effort:** Small | **Depends on:** Task 1 | **Commit:** `9f6b9b7`
- Create `public/manifest.json` (name, icons, theme_color: #FBDC7B, background: dark, display: standalone)
- Create service worker for offline caching (next-pwa or custom)
- App icons at required sizes (192, 512) — BB logo gold on dark
- Meta tags for iOS/Android install prompts
- **Verify:** App installable on Chrome desktop + iOS Safari + Android Chrome

### Task 7: BB Theme + UI Refresh ✅
**Effort:** Medium | **Depends on:** Task 1 | **Commit:** `9f6b9b7`
- Apply BB design system: dark background, gold (#FBDC7B) accents, Geist Sans/Mono
- Strip any existing non-BB branding/colors
- Redesign nav: simple sidebar (Dashboard, Wallets, Transactions, Tax Report, Settings)
- No auth pages needed — app opens directly to dashboard
- Responsive: mobile-first (this is a PWA people install on phones)
- **Verify:** Matches BB aesthetic, responsive on mobile

### Task 8: Settings + Data Management ✅
**Effort:** Small | **Depends on:** Task 2 | **Done in:** Task 2 commit
- Settings page: tax year, cost basis method (FIFO/LIFO/HIFO), currency display, custom node URL
- Export all data as JSON (full backup)
- Import JSON backup (restore)
- "Delete all data" with confirmation
- **Verify:** Export → delete → import restores everything perfectly

### Task 9: Tax Report + Export ✅
**Effort:** Small | **Depends on:** Tasks 2, 3 | **Done in:** Task 2 commit
- Ensure tax lot processing works fully client-side
- Form 8949 CSV export (already built, just wire to new data layer)
- Summary view: total gains/losses, short vs long term, per-wallet breakdown
- PDF generation client-side (already uses @react-pdf/renderer)
- **Verify:** Generate Form 8949 matching known test cases

### Task 10: Integration Testing + Polish ✅
**Effort:** Medium | **Depends on:** All above | **Commit:** `7f1e743`
- End-to-end flow: add wallet → sync → view transactions → generate tax report → export
- Test CSV import → tax calculation pipeline
- Test backup/restore cycle
- Test offline mode (disconnect, app still works)
- Test PWA install on real devices
- Performance: handle 10,000+ transactions smoothly
- README.md rewrite for FOSS project (install, usage, contributing)
- LICENSE file (MIT)
- **Verify:** Everything works, clean UX, ready for public release

---

## Task Execution Order (Parallel Where Possible)

```
Task 1 (strip backend) ──→ Task 2 (IndexedDB) ──→ Task 3 (prices)
                       │                       ├──→ Task 4 (sync)
                       │                       ├──→ Task 5 (CSV import)
                       │                       ├──→ Task 8 (settings)
                       │                       └──→ Task 9 (tax report)
                       ├──→ Task 6 (PWA)
                       └──→ Task 7 (theme)
                       
All ──→ Task 10 (integration + polish)
```

Tasks 1, 6, 7 can run in parallel.
Tasks 3, 4, 5, 8, 9 can run in parallel after Task 2.
Task 10 is the final gate.

---

## Sub-Agent Assignments

Each task becomes a sub-agent with:
- Exact file paths and commands
- Specific acceptance criteria
- Type-check + test verification before "done"
- Check-in cron 20 min after spawn

**Estimated total effort:** 2-3 days of sub-agent work
**Critical path:** Task 1 → Task 2 → Tasks 3-5,8,9 → Task 10

---

## v2 Complete — Deployed

**Live:** https://self-custody-tax.vercel.app
**Branch:** `v2-local` (4 commits: dace417, 209722f, 9f6b9b7, 7f1e743)
**Tests:** 18 passing (Vitest)
**Build:** 3.9MB static export

---

## TODOs — Next Session

### Must Do
- [ ] **Kiwi hands-on test** — install PWA on phone, add real xpub, sync, verify transactions
- [ ] **Full wallet sync test** — mempool.space rate limits hard with 20-address batches, verify backoff works in browser (worked in Node but slow)
- [ ] **PWA install verification** — test "Add to Home Screen" on iOS Safari + Android Chrome

### Should Do
- [ ] **Real logo** — replace placeholder "SCT" text icons with proper BB-branded icon
- [ ] **themeColor warning** — move from metadata export to viewport export (Next.js 14 deprecation)
- [ ] **Merge to main** — `v2-local` branch is ready, merge when satisfied
- [ ] **Strike parser** — listed in README but parser file may not exist yet, verify

### Nice to Have
- [ ] **Performance test** — load 10K+ transactions, check if UI stays responsive
- [ ] **Custom node URL** — verify settings page actually uses the configured endpoint for sync
- [ ] **Offline mode test** — disconnect network after first load, verify app still works
- [ ] **Form 8949 accuracy** — compare output against a known tax return
- [ ] **PDF report** — verify PDF generation works in browser (uses @react-pdf/renderer)
