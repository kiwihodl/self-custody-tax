import Link from "next/link";
import Image from "next/image";

export default function Home() {
  return (
    <main className="min-h-screen bg-bg-base">
      {/* Header with Sign In */}
      <header className="absolute top-0 left-0 right-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex justify-end">
            <Link
              href="/auth/login"
              className="text-sm font-medium px-4 py-2 rounded-lg transition-all duration-150
                text-[#FBDC7B]/80 hover:text-[#FBDC7B] hover:bg-[#FBDC7B]/10"
            >
              Sign In
            </Link>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <div className="relative overflow-hidden">
        {/* Mesh gradient background */}
        <div className="absolute inset-0 mesh-gradient" />

        {/* Animated glow orbs */}
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-primary/20 rounded-full blur-3xl animate-pulse-slow" />
        <div className="absolute bottom-1/4 right-1/4 w-80 h-80 bg-info/10 rounded-full blur-3xl animate-pulse-slow" style={{ animationDelay: '1s' }} />

        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-24 md:py-32">
          <div className="text-center">
            {/* Logo */}
            <div className="mb-10 flex flex-col items-center gap-4">
              <Image
                src="/logo-icon.png"
                alt="Self Custody Tax"
                width={120}
                height={120}
                className="w-20 h-20 sm:w-24 sm:h-24 md:w-32 md:h-32 lg:w-40 lg:h-40"
                priority
              />
              <h1
                className="text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-bold tracking-tight"
                style={{
                  background: 'linear-gradient(180deg, #FBDC7B 0%, #996515 100%)',
                  WebkitBackgroundClip: 'text',
                  WebkitTextFillColor: 'transparent',
                  backgroundClip: 'text',
                }}
              >
                SELF CUSTODY TAX
              </h1>
            </div>

            {/* Tagline */}
            <p className="text-xl md:text-2xl text-text-secondary mb-6 max-w-2xl mx-auto font-light">
              Crypto tax tracking for self-custody users
            </p>

            {/* Problem Statement */}
            <p className="text-lg text-text-tertiary mb-12 max-w-3xl mx-auto">
              Tired of spreadsheets and guessing your cost basis? Self Custody Tax automatically tracks your wallets, calculates gains, and generates IRS-ready reports.
            </p>

            {/* CTA Buttons */}
            <div className="flex flex-col sm:flex-row gap-4 justify-center mb-8">
              <Link href="/auth/signup" className="btn-primary text-lg px-10 py-4 shadow-glow">
                Start Free Trial
              </Link>
              <Link href="/pricing" className="btn-secondary text-lg px-10 py-4">
                View Pricing
              </Link>
            </div>

            {/* Trust Signals */}
            <div className="flex flex-wrap justify-center gap-6 text-text-muted text-sm mb-16">
              <div className="flex items-center gap-2">
                <svg className="w-5 h-5 text-success" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                </svg>
                <span>No credit card required</span>
              </div>
              <div className="flex items-center gap-2">
                <svg className="w-5 h-5 text-success" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                </svg>
                <span>Watch-only (keys never leave your device)</span>
              </div>
              <div className="flex items-center gap-2">
                <svg className="w-5 h-5 text-success" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                </svg>
                <span>14-day free trial on all plans</span>
              </div>
            </div>

            {/* Value Props */}
            <div className="grid md:grid-cols-3 gap-6 max-w-4xl mx-auto">
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
                  Accurate Cost Basis
                </h3>
                <p className="text-text-tertiary text-sm leading-relaxed">
                  UTXO-level tracking for maximum accuracy. FIFO, LIFO, HIFO
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
                  Smart Transfer Detection
                </h3>
                <p className="text-text-tertiary text-sm leading-relaxed">
                  Auto-detect moves between your wallets. No more phantom
                  taxable events.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* How It Works Section */}
      <section className="py-24 relative bg-bg-raised/30">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold text-text-primary mb-4">
              How It Works
            </h2>
            <p className="text-text-secondary max-w-2xl mx-auto">
              Get your crypto taxes sorted in three simple steps
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8 max-w-4xl mx-auto">
            <div className="text-center">
              <div className="w-16 h-16 rounded-full bg-primary/10 border-2 border-primary/30 flex items-center justify-center mx-auto mb-6">
                <span className="text-2xl font-bold text-primary">1</span>
              </div>
              <h3 className="text-xl font-semibold text-text-primary mb-3">Connect Wallets</h3>
              <p className="text-text-secondary">
                Add your xpub, zpub, or wallet address. We only need read access - your keys stay with you.
              </p>
            </div>

            <div className="text-center">
              <div className="w-16 h-16 rounded-full bg-primary/10 border-2 border-primary/30 flex items-center justify-center mx-auto mb-6">
                <span className="text-2xl font-bold text-primary">2</span>
              </div>
              <h3 className="text-xl font-semibold text-text-primary mb-3">Auto-Sync History</h3>
              <p className="text-text-secondary">
                We fetch your complete transaction history and calculate cost basis automatically.
              </p>
            </div>

            <div className="text-center">
              <div className="w-16 h-16 rounded-full bg-primary/10 border-2 border-primary/30 flex items-center justify-center mx-auto mb-6">
                <span className="text-2xl font-bold text-primary">3</span>
              </div>
              <h3 className="text-xl font-semibold text-text-primary mb-3">Export Tax Reports</h3>
              <p className="text-text-secondary">
                Download IRS Form 8949, CSV, or TurboTax format. Ready for your accountant.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-24 relative">
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
                    leave your hardware wallet. Track everything without risk.
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
                  <h3 className="text-xl font-semibold mb-3 text-text-primary">IRS Form 8949 Ready</h3>
                  <p className="text-text-secondary leading-relaxed">
                    Generate complete tax reports with accurate cost basis.
                    Download CSV, TurboTax, or hand directly to your accountant.
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
                  <h3 className="text-xl font-semibold mb-3 text-text-primary">Multi-Asset Support</h3>
                  <p className="text-text-secondary leading-relaxed">
                    Track Bitcoin, Ethereum, USDT, and USDC. Combined portfolio
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
                    Import history from AmberApp, Coinbase, Kraken, Gemini, River, Swan and more.
                    Consolidate all your activity in one place.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Social Proof / Stats */}
      <section className="py-16 bg-bg-raised/50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8 text-center">
            <div>
              <p className="text-4xl font-bold text-primary mb-2">100%</p>
              <p className="text-text-secondary text-sm">Watch-Only Security</p>
            </div>
            <div>
              <p className="text-4xl font-bold text-primary mb-2">3</p>
              <p className="text-text-secondary text-sm">Cost Basis Methods</p>
            </div>
            <div>
              <p className="text-4xl font-bold text-primary mb-2">6+</p>
              <p className="text-text-secondary text-sm">Exchanges Supported</p>
            </div>
            <div>
              <p className="text-4xl font-bold text-primary mb-2">24/7</p>
              <p className="text-text-secondary text-sm">Auto-Sync</p>
            </div>
          </div>
        </div>
      </section>

      {/* Pricing Preview */}
      <section className="py-24 relative">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold text-text-primary mb-4">Simple Pricing</h2>
            <p className="text-text-secondary max-w-2xl mx-auto">
              Start free, upgrade when you need more wallets or advanced features.
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
                <p>1 wallet</p>
                <p>50 transactions</p>
                <p>$21 one-time to export</p>
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
                <p>Full tax reports</p>
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

          <div className="text-center mt-12">
            <Link href="/pricing" className="btn-primary px-8 py-3">
              Compare All Plans
            </Link>
          </div>
        </div>
      </section>

      {/* Final CTA */}
      <section className="py-24 relative">
        <div className="absolute inset-0 mesh-gradient opacity-50" />
        <div className="relative max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-4xl font-bold text-text-primary mb-6">
            Ready to simplify your crypto taxes?
          </h2>
          <p className="text-xl text-text-secondary mb-10">
            Join self-custody users who trust Self Custody Tax for accurate, IRS-ready reporting.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link href="/auth/signup" className="btn-primary text-lg px-10 py-4 shadow-glow">
              Start Free Trial
            </Link>
            <Link href="/help" className="btn-secondary text-lg px-10 py-4">
              Learn More
            </Link>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-border py-16 bg-bg-raised/30">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col md:flex-row justify-between items-center gap-6">
            <div className="flex items-center gap-3">
              <Image
                src="/logo-icon.png"
                alt="Self Custody Tax"
                width={40}
                height={40}
                className="w-10 h-10"
              />
              <span className="text-xl font-semibold text-text-primary">
                Self Custody Tax
              </span>
            </div>
            <p className="text-text-tertiary text-sm">
              Crypto tax tracking for self-custody users
            </p>
            <div className="flex items-center gap-6 text-text-muted text-sm">
              <Link href="/pricing" className="hover:text-text-primary transition-colors">Pricing</Link>
              <Link href="/help" className="hover:text-text-primary transition-colors">Help</Link>
              <Link href="/auth/login" className="hover:text-text-primary transition-colors">Sign In</Link>
            </div>
          </div>
          <div className="mt-8 pt-8 border-t border-border text-center text-text-muted text-xs">
            &copy; {new Date().getFullYear()} Self Custody Tax. All rights reserved.
          </div>
        </div>
      </footer>
    </main>
  );
}
