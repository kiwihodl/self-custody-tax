# Self Custody Tax

**Privacy-first Bitcoin tax tracking. All data stays on your device.**

Self Custody Tax is a free, open-source, installable PWA that tracks your Bitcoin transactions and calculates capital gains for tax reporting. No cloud, no accounts, no subscriptions. Your xpubs never leave your browser.

## Features

- **Bitcoin-only** — optimized for self-custody workflows, not altcoin bloat
- **Local-first** — all data stored in your browser (IndexedDB), nothing uploaded anywhere
- **Installable PWA** — add to home screen on mobile, install as app on desktop
- **Wallet tracking** — single addresses, xpub/ypub/zpub HD wallets
- **Auto-sync** — fetches transactions from Mempool.space (or your own node)
- **CSV import** — Coinbase, Kraken, Strike, River, Swan, Gemini, Amber
- **Tax lot accounting** — FIFO, LIFO, HIFO cost basis methods
- **Per-wallet tracking** — 2025 IRS compliant
- **Capital gains** — short-term vs long-term, automatic holding period calculation
- **Form 8949 export** — IRS-ready CSV download
- **PDF reports** — generate tax reports locally
- **Internal transfer detection** — auto-detect moves between your own wallets
- **Backup/restore** — export all data as JSON, import on any device
- **Own node support** — connect to your own Mempool/Electrum instance for maximum privacy
- **Offline capable** — works without internet after first load

## Quick Start

```bash
# Clone
git clone https://github.com/kiwihodl/self-custody-tax.git
cd self-custody-tax
git checkout v2-local

# Install
npm install

# Run
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

## Deploy

Self Custody Tax builds to static HTML/JS/CSS. Host it anywhere:

```bash
npm run build
# Output in /out — deploy to any static host
```

Works on: Vercel, Netlify, GitHub Pages, IPFS, your own server, or just open `index.html` locally.

## Privacy

- **No accounts** — no signup, no login, no email
- **No cloud** — zero server-side data storage
- **No telemetry** — no analytics, no tracking, no phone-home
- **Your xpubs stay local** — transaction lookups go directly from your browser to Mempool.space (or your own node)
- **Open source** — verify everything yourself

## Tech Stack

- Next.js 14 (static export)
- React 18
- TypeScript
- Dexie.js (IndexedDB)
- Geist Sans/Mono (fonts)
- Tailwind CSS

## Contributing

PRs welcome. Please:
1. Run `npm run type-check` before submitting
2. Run `npm test` and ensure all tests pass
3. Follow existing code conventions

## License

MIT — see [LICENSE](LICENSE)

## Part of Bitcoin Butlers

Self Custody Tax is part of the [Bitcoin Butlers](https://bitcoinbutlers.com) suite of self-custody tools. We help people hold their own keys.
