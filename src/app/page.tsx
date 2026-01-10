import Link from "next/link";

export default function Home() {
  return (
    <main className="min-h-screen bg-bg-base">
      {/* Hero Section */}
      <div className="relative overflow-hidden">
        {/* Mesh gradient background */}
        <div className="absolute inset-0 mesh-gradient" />

        {/* Animated glow orbs */}
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-primary/20 rounded-full blur-3xl animate-pulse-slow" />
        <div className="absolute bottom-1/4 right-1/4 w-80 h-80 bg-info/10 rounded-full blur-3xl animate-pulse-slow" style={{ animationDelay: '1s' }} />

        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-32">
          <div className="text-center">
            {/* Logo with glow */}
            <div className="mb-8">
              <h1 className="text-5xl md:text-7xl font-bold tracking-tight">
                <span className="text-primary drop-shadow-[0_0_30px_rgba(251,220,123,0.5)]">Self Custody</span>
                <span className="text-text-primary"> Tax</span>
              </h1>
              <div className="h-1 w-24 mx-auto mt-4 bg-gradient-to-r from-transparent via-primary to-transparent rounded-full" />
            </div>

            {/* Tagline */}
            <p className="text-xl md:text-2xl text-text-secondary mb-12 max-w-2xl mx-auto font-light">
              Bitcoin tax tracking for self-custody users
            </p>

            {/* Value Props */}
            <div className="grid md:grid-cols-3 gap-6 max-w-4xl mx-auto mb-16">
              <div className="glass rounded-xl p-6 group hover:border-primary/30 transition-all duration-300 hover:shadow-glow">
                <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center mb-4 mx-auto group-hover:bg-primary/20 transition-colors">
                  <svg className="w-6 h-6 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 10.5V6.75a4.5 4.5 0 10-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 002.25-2.25v-6.75a2.25 2.25 0 00-2.25-2.25H6.75a2.25 2.25 0 00-2.25 2.25v6.75a2.25 2.25 0 002.25 2.25z" />
                  </svg>
                </div>
                <h3 className="text-lg font-semibold mb-2 text-text-primary">
                  Multisig Native
                </h3>
                <p className="text-text-tertiary text-sm leading-relaxed">
                  2-of-3, 3-of-5 wallets tracked as single entities. Works with
                  Unchained, Casa, Sparrow.
                </p>
              </div>

              <div className="glass rounded-xl p-6 group hover:border-primary/30 transition-all duration-300 hover:shadow-glow">
                <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center mb-4 mx-auto group-hover:bg-primary/20 transition-colors">
                  <svg className="w-6 h-6 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 3v11.25A2.25 2.25 0 006 16.5h2.25M3.75 3h-1.5m1.5 0h16.5m0 0h1.5m-1.5 0v11.25A2.25 2.25 0 0118 16.5h-2.25m-7.5 0h7.5m-7.5 0l-1 3m8.5-3l1 3m0 0l.5 1.5m-.5-1.5h-9.5m0 0l-.5 1.5m.75-9l3-3 2.148 2.148A12.061 12.061 0 0116.5 7.605" />
                  </svg>
                </div>
                <h3 className="text-lg font-semibold mb-2 text-text-primary">
                  UTXO Cost Basis
                </h3>
                <p className="text-text-tertiary text-sm leading-relaxed">
                  Per-output tracking for maximum tax accuracy. FIFO, LIFO, HIFO
                  methods supported.
                </p>
              </div>

              <div className="glass rounded-xl p-6 group hover:border-primary/30 transition-all duration-300 hover:shadow-glow">
                <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center mb-4 mx-auto group-hover:bg-primary/20 transition-colors">
                  <svg className="w-6 h-6 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M7.5 21L3 16.5m0 0L7.5 12M3 16.5h13.5m0-13.5L21 7.5m0 0L16.5 12M21 7.5H7.5" />
                  </svg>
                </div>
                <h3 className="text-lg font-semibold mb-2 text-text-primary">
                  Internal Transfers
                </h3>
                <p className="text-text-tertiary text-sm leading-relaxed">
                  Auto-detect moves between your own wallets. No more phantom
                  taxable events.
                </p>
              </div>
            </div>

            {/* CTA Buttons */}
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link href="/auth/signup" className="btn-primary text-lg px-10 py-4 shadow-glow">
                Get Started Free
              </Link>
              <Link
                href="/auth/login"
                className="btn-secondary text-lg px-10 py-4"
              >
                Sign In
              </Link>
            </div>

            {/* Social Proof */}
            <p className="text-text-muted text-sm mt-10">
              Free tier includes 3 wallets and 100 transactions
            </p>
          </div>
        </div>
      </div>

      {/* Features Section */}
      <section className="py-32 relative">
        <div className="absolute inset-0 bg-gradient-to-b from-transparent via-bg-raised/50 to-transparent" />

        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold text-text-primary mb-4">
              Built for Self-Custody
            </h2>
            <p className="text-text-secondary max-w-2xl mx-auto">
              Enterprise-grade tracking without compromising your sovereignty
            </p>
          </div>

          <div className="grid md:grid-cols-2 gap-8">
            <div className="card group">
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 rounded-lg bg-success/10 flex items-center justify-center flex-shrink-0 group-hover:bg-success/20 transition-colors">
                  <svg className="w-6 h-6 text-success" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75m-3-7.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285z" />
                  </svg>
                </div>
                <div>
                  <h3 className="text-xl font-semibold mb-3 text-text-primary">Watch-Only Security</h3>
                  <p className="text-text-secondary leading-relaxed">
                    We only use extended public keys (xpubs). Your private keys never
                    leave your hardware wallet. Track everything without compromising
                    security.
                  </p>
                </div>
              </div>
            </div>

            <div className="card group">
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 rounded-lg bg-info/10 flex items-center justify-center flex-shrink-0 group-hover:bg-info/20 transition-colors">
                  <svg className="w-6 h-6 text-info" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
                  </svg>
                </div>
                <div>
                  <h3 className="text-xl font-semibold mb-3 text-text-primary">Tax Report Generation</h3>
                  <p className="text-text-secondary leading-relaxed">
                    Generate IRS Form 8949 with accurate cost basis calculations.
                    Download CSV or TurboTax format. Designed for long-term holders.
                  </p>
                </div>
              </div>
            </div>

            <div className="card group">
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 rounded-lg bg-warning/10 flex items-center justify-center flex-shrink-0 group-hover:bg-warning/20 transition-colors">
                  <svg className="w-6 h-6 text-warning" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v12m-3-2.818l.879.659c1.171.879 3.07.879 4.242 0 1.172-.879 1.172-2.303 0-3.182C13.536 12.219 12.768 12 12 12c-.725 0-1.45-.22-2.003-.659-1.106-.879-1.106-2.303 0-3.182s2.9-.879 4.006 0l.415.33M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <div>
                  <h3 className="text-xl font-semibold mb-3 text-text-primary">Stablecoin Support</h3>
                  <p className="text-text-secondary leading-relaxed">
                    Track USDT and USDC alongside your Bitcoin. Combined portfolio
                    view with accurate accounting for each asset.
                  </p>
                </div>
              </div>
            </div>

            <div className="card group">
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0 group-hover:bg-primary/20 transition-colors">
                  <svg className="w-6 h-6 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5" />
                  </svg>
                </div>
                <div>
                  <h3 className="text-xl font-semibold mb-3 text-text-primary">Exchange Import</h3>
                  <p className="text-text-secondary leading-relaxed">
                    Import transaction history from Amber, Coinbase, Kraken, and more.
                    Consolidate all your activity in one place.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Pricing Preview */}
      <section className="py-32 relative">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold text-text-primary mb-4">Simple Pricing</h2>
            <p className="text-text-secondary max-w-2xl mx-auto">
              Start free, upgrade when you need more wallets or multisig support.
            </p>
          </div>

          <div className="grid md:grid-cols-4 gap-6 max-w-5xl mx-auto">
            {/* Free */}
            <div className="card text-center hover:border-border-hover transition-all duration-300">
              <div className="mb-6">
                <span className="text-text-tertiary text-sm uppercase tracking-wider">Free</span>
              </div>
              <p className="text-4xl font-bold text-text-primary mb-2">$0</p>
              <p className="text-text-muted text-sm mb-6">forever</p>
              <div className="space-y-3 text-sm text-text-secondary">
                <p>3 wallets</p>
                <p>100 transactions</p>
                <p>Basic reports</p>
              </div>
            </div>

            {/* Holder */}
            <div className="card text-center hover:border-border-hover transition-all duration-300">
              <div className="mb-6">
                <span className="text-text-tertiary text-sm uppercase tracking-wider">Holder</span>
              </div>
              <p className="text-4xl font-bold text-text-primary mb-2">
                $99<span className="text-lg font-normal text-text-muted">/yr</span>
              </p>
              <p className="text-text-muted text-sm mb-6">billed annually</p>
              <div className="space-y-3 text-sm text-text-secondary">
                <p>10 wallets</p>
                <p>Unlimited transactions</p>
                <p>Tax reports</p>
              </div>
            </div>

            {/* Sovereign - Featured */}
            <div className="relative">
              <div className="absolute -inset-px bg-gradient-to-b from-primary/50 to-primary/10 rounded-xl blur-sm" />
              <div className="relative card text-center border-primary/50 bg-bg-elevated">
                <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                  <span className="bg-primary text-bg-base text-xs font-semibold px-3 py-1 rounded-full">
                    Most Popular
                  </span>
                </div>
                <div className="mb-6 mt-2">
                  <span className="text-primary text-sm uppercase tracking-wider font-semibold">Sovereign</span>
                </div>
                <p className="text-4xl font-bold text-text-primary mb-2">
                  $249<span className="text-lg font-normal text-text-muted">/yr</span>
                </p>
                <p className="text-text-muted text-sm mb-6">billed annually</p>
                <div className="space-y-3 text-sm text-text-secondary">
                  <p>Unlimited wallets</p>
                  <p>Multisig support</p>
                  <p>Priority support</p>
                </div>
              </div>
            </div>

            {/* Advisor */}
            <div className="card text-center hover:border-border-hover transition-all duration-300">
              <div className="mb-6">
                <span className="text-text-tertiary text-sm uppercase tracking-wider">Advisor</span>
              </div>
              <p className="text-4xl font-bold text-text-primary mb-2">
                $499<span className="text-lg font-normal text-text-muted">/yr</span>
              </p>
              <p className="text-text-muted text-sm mb-6">billed annually</p>
              <div className="space-y-3 text-sm text-text-secondary">
                <p>Multi-client</p>
                <p>API access</p>
                <p>White-label reports</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-border py-16 bg-bg-raised/30">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col md:flex-row justify-between items-center gap-6">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                <svg className="w-6 h-6 text-primary" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M12.5 3.5c-3.6 0-6.5 2.9-6.5 6.5 0 2.6 1.5 4.8 3.7 5.8v4.7c0 .6.4 1 1 1h3.5c.6 0 1-.4 1-1v-4.7c2.2-1 3.8-3.2 3.8-5.8 0-3.6-2.9-6.5-6.5-6.5zm.5 6.5c0 .6-.4 1-1 1s-1-.4-1-1 .4-1 1-1 1 .4 1 1z"/>
                </svg>
              </div>
              <span className="text-2xl font-bold tracking-tight">
                <span className="text-primary">SCT</span>
              </span>
            </div>
            <p className="text-text-tertiary text-sm">
              Bitcoin tax tracking for self-custody users
            </p>
            <div className="flex items-center gap-6 text-text-muted text-sm">
              <Link href="/help" className="hover:text-text-primary transition-colors">Help</Link>
              <Link href="/settings" className="hover:text-text-primary transition-colors">Settings</Link>
            </div>
          </div>
        </div>
      </footer>
    </main>
  );
}
