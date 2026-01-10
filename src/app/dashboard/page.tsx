"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { OnboardingWizard } from "@/components/onboarding";
import type { Wallet } from "@/types";

interface Transaction {
  id: string;
  txid: string;
  category: "receive" | "send" | "internal";
  amount: string;
  block_timestamp: string | null;
  wallet_id: string;
  network: "bitcoin" | "ethereum";
}

interface WalletWithName extends Wallet {
  name: string;
}

export default function DashboardPage() {
  const [wallets, setWallets] = useState<WalletWithName[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [showOnboarding, setShowOnboarding] = useState(false);
  const router = useRouter();
  const supabase = createClient();

  const fetchData = useCallback(async () => {
    // Fetch wallets
    const { data: walletData } = await supabase
      .from("wallets")
      .select("*")
      .eq("is_deleted", false)
      .order("created_at", { ascending: false });

    if (walletData) {
      setWallets(walletData);

      // Check if onboarding should be shown (no wallets + hasn't been dismissed)
      if (walletData.length === 0) {
        const dismissed = localStorage.getItem("onboarding_dismissed");
        if (!dismissed) {
          setShowOnboarding(true);
        }
      }
    }

    // Fetch recent transactions (last 10)
    const { data: txData } = await supabase
      .from("transactions")
      .select("id, txid, category, amount, block_timestamp, wallet_id, network")
      .order("block_timestamp", { ascending: false, nullsFirst: true })
      .limit(10);

    if (txData) {
      setTransactions(txData);
    }

    setLoading(false);
  }, [supabase]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Calculate totals by network
  const btcWallets = wallets.filter((w) => w.network === "bitcoin");
  const ethWallets = wallets.filter((w) => w.network === "ethereum");

  const btcBalance = btcWallets.reduce((sum, w) => sum + (w.balance || 0), 0);
  const stablecoinBalance = ethWallets.reduce((sum, w) => sum + (w.balance || 0), 0);

  // Get wallet by ID
  const getWallet = (walletId: string) => {
    return wallets.find((w) => w.id === walletId);
  };

  // Get wallet name by ID
  const getWalletName = (walletId: string) => {
    const wallet = getWallet(walletId);
    return wallet?.name || "Unknown";
  };

  // Format amount with color based on network
  const formatAmount = (amount: string, category: string, network: "bitcoin" | "ethereum") => {
    const num = parseFloat(amount);
    const isBtc = network === "bitcoin";
    const formatted = isBtc ? num.toFixed(8) : `$${num.toFixed(2)}`;

    if (category === "receive") {
      return <span className="text-success">+{formatted}</span>;
    } else if (category === "send") {
      return <span className="text-error">-{formatted}</span>;
    }
    return <span className="text-text-tertiary">{formatted}</span>;
  };

  // Format wallet balance based on network
  const formatWalletBalance = (wallet: WalletWithName) => {
    if (wallet.balance === null) return "--";
    if (wallet.network === "ethereum") {
      return `$${wallet.balance.toFixed(2)}`;
    }
    return `${wallet.balance.toFixed(8)} BTC`;
  };

  if (loading) {
    return (
      <div className="space-y-8 animate-fade-in">
        <div>
          <h1 className="text-3xl font-bold text-text-primary">Dashboard</h1>
          <p className="text-text-secondary mt-1">Loading your portfolio...</p>
        </div>
        <div className="grid md:grid-cols-4 gap-6">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="card animate-pulse">
              <div className="h-4 bg-bg-hover rounded w-20 mb-3" />
              <div className="h-8 bg-bg-hover rounded w-32" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-fade-in">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-text-primary">Dashboard</h1>
        <p className="text-text-secondary mt-1">Your crypto portfolio at a glance</p>
      </div>

      {/* Portfolio Summary */}
      <div className="grid md:grid-cols-4 gap-6">
        {/* Bitcoin Balance */}
        <div className="card group hover:border-primary/30 transition-all duration-300">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
              <svg className="w-5 h-5 text-primary" viewBox="0 0 24 24" fill="currentColor">
                <path d="M12.5 3.5c-3.6 0-6.5 2.9-6.5 6.5 0 2.6 1.5 4.8 3.7 5.8v4.7c0 .6.4 1 1 1h3.5c.6 0 1-.4 1-1v-4.7c2.2-1 3.8-3.2 3.8-5.8 0-3.6-2.9-6.5-6.5-6.5zm.5 6.5c0 .6-.4 1-1 1s-1-.4-1-1 .4-1 1-1 1 .4 1 1z"/>
              </svg>
            </div>
            <p className="text-text-secondary text-sm font-medium">Bitcoin</p>
          </div>
          <p className="text-2xl font-bold font-mono text-text-primary">{btcBalance.toFixed(8)}</p>
          <p className="text-text-muted text-sm mt-2">
            {btcWallets.length} wallet{btcWallets.length !== 1 ? "s" : ""}
          </p>
        </div>

        {/* Stablecoin Balance */}
        <div className="card group hover:border-info/30 transition-all duration-300">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 rounded-lg bg-info/10 flex items-center justify-center">
              <svg className="w-5 h-5 text-info" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v12m-3-2.818l.879.659c1.171.879 3.07.879 4.242 0 1.172-.879 1.172-2.303 0-3.182C13.536 12.219 12.768 12 12 12c-.725 0-1.45-.22-2.003-.659-1.106-.879-1.106-2.303 0-3.182s2.9-.879 4.006 0l.415.33M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <p className="text-text-secondary text-sm font-medium">Stablecoins</p>
          </div>
          <p className="text-2xl font-bold font-mono text-text-primary">${stablecoinBalance.toFixed(2)}</p>
          <p className="text-text-muted text-sm mt-2">
            {ethWallets.length} wallet{ethWallets.length !== 1 ? "s" : ""} (USDT/USDC)
          </p>
        </div>

        {/* Total Wallets */}
        <div className="card group hover:border-success/30 transition-all duration-300">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 rounded-lg bg-success/10 flex items-center justify-center">
              <svg className="w-5 h-5 text-success" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M21 12a2.25 2.25 0 00-2.25-2.25H15a3 3 0 11-6 0H5.25A2.25 2.25 0 003 12m18 0v6a2.25 2.25 0 01-2.25 2.25H5.25A2.25 2.25 0 013 18v-6m18 0V9M3 12V9m18 0a2.25 2.25 0 00-2.25-2.25H5.25A2.25 2.25 0 003 9m18 0V6a2.25 2.25 0 00-2.25-2.25H5.25A2.25 2.25 0 003 6v3" />
              </svg>
            </div>
            <p className="text-text-secondary text-sm font-medium">Wallets</p>
          </div>
          <p className="text-2xl font-bold text-text-primary">{wallets.length}</p>
          <p className="text-text-muted text-sm mt-2">
            {wallets.filter((w) => w.sync_status === "idle").length} synced
          </p>
        </div>

        {/* Total Transactions */}
        <div className="card group hover:border-warning/30 transition-all duration-300">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 rounded-lg bg-warning/10 flex items-center justify-center">
              <svg className="w-5 h-5 text-warning" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 6.75h12M8.25 12h12m-12 5.25h12M3.75 6.75h.007v.008H3.75V6.75zm.375 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zM3.75 12h.007v.008H3.75V12zm.375 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm-.375 5.25h.007v.008H3.75v-.008zm.375 0a.375.375 0 11-.75 0 .375.375 0 01.75 0z" />
              </svg>
            </div>
            <p className="text-text-secondary text-sm font-medium">Transactions</p>
          </div>
          <p className="text-2xl font-bold text-text-primary">{transactions.length > 0 ? `${transactions.length}+` : "0"}</p>
          <p className="text-text-muted text-sm mt-2">Recent activity</p>
        </div>
      </div>

      {/* Quick Actions - only show if no wallets */}
      {wallets.length === 0 && (
        <div className="card">
          <h2 className="text-xl font-semibold mb-6 text-text-primary">Get Started</h2>
          <div className="grid md:grid-cols-3 gap-4">
            <a
              href="/wallets"
              className="p-5 rounded-xl border border-border bg-bg-elevated hover:border-primary/50 hover:bg-bg-hover transition-all duration-300 group"
            >
              <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center mb-4 group-hover:bg-primary/20 transition-colors">
                <span className="text-primary font-bold">1</span>
              </div>
              <h3 className="font-semibold text-text-primary group-hover:text-primary transition-colors">
                Add a Wallet
              </h3>
              <p className="text-text-tertiary text-sm mt-2 leading-relaxed">
                Import your xpub to start tracking
              </p>
            </a>

            <div className="p-5 rounded-xl border border-border bg-bg-surface opacity-50">
              <div className="w-10 h-10 rounded-lg bg-bg-hover flex items-center justify-center mb-4">
                <span className="text-text-muted font-bold">2</span>
              </div>
              <h3 className="font-semibold text-text-tertiary">Sync Transactions</h3>
              <p className="text-text-muted text-sm mt-2 leading-relaxed">
                Automatic after wallet is added
              </p>
            </div>

            <div className="p-5 rounded-xl border border-border bg-bg-surface opacity-50">
              <div className="w-10 h-10 rounded-lg bg-bg-hover flex items-center justify-center mb-4">
                <span className="text-text-muted font-bold">3</span>
              </div>
              <h3 className="font-semibold text-text-tertiary">Generate Tax Report</h3>
              <p className="text-text-muted text-sm mt-2 leading-relaxed">
                Available in the Tax section
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Wallets Overview */}
      <div className="card">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-xl font-semibold text-text-primary">Wallets</h2>
          <a href="/wallets" className="text-primary text-sm hover:text-primary-glow transition-colors font-medium">
            Manage Wallets →
          </a>
        </div>

        {wallets.length === 0 ? (
          <div className="text-center py-16">
            <div className="w-16 h-16 rounded-full bg-bg-hover flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-text-muted" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M21 12a2.25 2.25 0 00-2.25-2.25H15a3 3 0 11-6 0H5.25A2.25 2.25 0 003 12m18 0v6a2.25 2.25 0 01-2.25 2.25H5.25A2.25 2.25 0 013 18v-6m18 0V9M3 12V9m18 0a2.25 2.25 0 00-2.25-2.25H5.25A2.25 2.25 0 003 9m18 0V6a2.25 2.25 0 00-2.25-2.25H5.25A2.25 2.25 0 003 6v3" />
              </svg>
            </div>
            <p className="text-text-tertiary mb-4">No wallets added yet</p>
            <a href="/wallets" className="btn-primary inline-block">
              Add Your First Wallet
            </a>
          </div>
        ) : (
          <div className="space-y-2">
            {wallets.slice(0, 5).map((wallet) => (
              <a
                key={wallet.id}
                href={`/wallets/${wallet.id}`}
                className="flex justify-between items-center p-4 rounded-xl bg-bg-elevated hover:bg-bg-hover border border-transparent hover:border-border transition-all duration-200"
              >
                <div className="flex items-center gap-4">
                  <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                    wallet.network === "bitcoin" ? "bg-primary/10" : "bg-info/10"
                  }`}>
                    {wallet.network === "bitcoin" ? (
                      <svg className="w-5 h-5 text-primary" viewBox="0 0 24 24" fill="currentColor">
                        <path d="M12.5 3.5c-3.6 0-6.5 2.9-6.5 6.5 0 2.6 1.5 4.8 3.7 5.8v4.7c0 .6.4 1 1 1h3.5c.6 0 1-.4 1-1v-4.7c2.2-1 3.8-3.2 3.8-5.8 0-3.6-2.9-6.5-6.5-6.5zm.5 6.5c0 .6-.4 1-1 1s-1-.4-1-1 .4-1 1-1 1 .4 1 1z"/>
                      </svg>
                    ) : (
                      <svg className="w-5 h-5 text-info" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v12m-3-2.818l.879.659c1.171.879 3.07.879 4.242 0 1.172-.879 1.172-2.303 0-3.182C13.536 12.219 12.768 12 12 12c-.725 0-1.45-.22-2.003-.659-1.106-.879-1.106-2.303 0-3.182s2.9-.879 4.006 0l.415.33M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                    )}
                  </div>
                  <div>
                    <p className="font-medium text-text-primary">{wallet.name}</p>
                    <p className="text-sm text-text-tertiary capitalize">
                      {wallet.type.replace("_", " ")} • {wallet.network}
                    </p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="font-mono text-text-primary">
                    {formatWalletBalance(wallet)}
                  </p>
                  <span className={`badge ${
                    wallet.sync_status === "syncing"
                      ? "badge-warning"
                      : wallet.sync_status === "error"
                      ? "badge-error"
                      : "badge-success"
                  }`}>
                    {wallet.sync_status}
                  </span>
                </div>
              </a>
            ))}
            {wallets.length > 5 && (
              <p className="text-center text-text-muted text-sm pt-4">
                +{wallets.length - 5} more wallets
              </p>
            )}
          </div>
        )}
      </div>

      {/* Recent Transactions */}
      <div className="card">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-xl font-semibold text-text-primary">Recent Transactions</h2>
          <a
            href="/transactions"
            className="text-primary text-sm hover:text-primary-glow transition-colors font-medium"
          >
            View All →
          </a>
        </div>

        {transactions.length === 0 ? (
          <div className="text-center py-16">
            <div className="w-16 h-16 rounded-full bg-bg-hover flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-text-muted" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 6.75h12M8.25 12h12m-12 5.25h12M3.75 6.75h.007v.008H3.75V6.75zm.375 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zM3.75 12h.007v.008H3.75V12zm.375 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm-.375 5.25h.007v.008H3.75v-.008zm.375 0a.375.375 0 11-.75 0 .375.375 0 01.75 0z" />
              </svg>
            </div>
            <p className="text-text-tertiary">No transactions yet</p>
            <p className="text-text-muted text-sm mt-2">
              Transactions will appear here once you add and sync a wallet
            </p>
          </div>
        ) : (
          <div className="space-y-2">
            {transactions.map((tx) => {
              const wallet = getWallet(tx.wallet_id);
              const network = tx.network || wallet?.network || "bitcoin";
              return (
                <div
                  key={tx.id}
                  className="flex justify-between items-center p-4 rounded-xl bg-bg-elevated"
                >
                  <div className="flex items-center gap-4">
                    <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                      tx.category === "receive" ? "bg-success/10" : tx.category === "send" ? "bg-error/10" : "bg-bg-hover"
                    }`}>
                      {tx.category === "receive" ? (
                        <svg className="w-5 h-5 text-success" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M19 14l-7 7m0 0l-7-7m7 7V3" />
                        </svg>
                      ) : tx.category === "send" ? (
                        <svg className="w-5 h-5 text-error" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M5 10l7-7m0 0l7 7m-7-7v18" />
                        </svg>
                      ) : (
                        <svg className="w-5 h-5 text-text-tertiary" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M7.5 21L3 16.5m0 0L7.5 12M3 16.5h13.5m0-13.5L21 7.5m0 0L16.5 12M21 7.5H7.5" />
                        </svg>
                      )}
                    </div>
                    <div>
                      <p className="text-sm font-medium text-text-primary capitalize">{tx.category}</p>
                      <p className="text-xs text-text-muted">
                        {getWalletName(tx.wallet_id)}
                        {network === "ethereum" && <span className="ml-1 text-info">• ETH</span>}
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="font-mono text-sm">
                      {formatAmount(tx.amount, tx.category, network as "bitcoin" | "ethereum")}
                    </p>
                    <p className="text-xs text-text-muted">
                      {tx.block_timestamp
                        ? new Date(tx.block_timestamp).toLocaleDateString()
                        : "Pending"}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Onboarding Wizard */}
      {showOnboarding && (
        <OnboardingWizard
          onComplete={() => {
            setShowOnboarding(false);
            fetchData();
            router.refresh();
          }}
          onSkip={() => {
            localStorage.setItem("onboarding_dismissed", "true");
            setShowOnboarding(false);
          }}
        />
      )}
    </div>
  );
}
