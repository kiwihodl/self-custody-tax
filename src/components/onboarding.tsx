"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import { syncWalletClient } from "@/lib/bitcoin/clientSync";
import { syncEthereumWalletClient } from "@/lib/ethereum/clientSync";
import { SubscriptionTier, checkLimits, SUBSCRIPTION_TIERS } from "@/lib/stripe/tiers";
import type { Network, WalletType, Wallet } from "@/types";

interface OnboardingWizardProps {
  onComplete: () => void;
  onSkip: () => void;
}

type Step = "welcome" | "network" | "input" | "syncing" | "complete" | "upgrade";

export function OnboardingWizard({ onComplete, onSkip }: OnboardingWizardProps) {
  const [step, setStep] = useState<Step>("welcome");
  const [network, setNetwork] = useState<Network>("bitcoin");
  const [assetCategory, setAssetCategory] = useState<"bitcoin" | "crypto" | "stablecoin">("bitcoin");
  const [walletName, setWalletName] = useState("");
  const [inputValue, setInputValue] = useState("");
  const [inputType, setInputType] = useState<"address" | "xpub">("address");
  const [error, setError] = useState<string | null>(null);
  const [syncProgress, setSyncProgress] = useState<string | null>(null);
  const [userTier, setUserTier] = useState<SubscriptionTier>("free");
  const supabase = createClient();

  // Fetch user tier on mount
  useEffect(() => {
    const fetchTier = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { data: profile } = await supabase
          .from("user_profiles")
          .select("subscription_tier")
          .eq("id", user.id)
          .single();
        if (profile?.subscription_tier) {
          setUserTier(profile.subscription_tier as SubscriptionTier);
        }
      }
    };
    fetchTier();
  }, [supabase]);

  const tierInfo = SUBSCRIPTION_TIERS[userTier];

  const handleCategorySelect = (category: "bitcoin" | "crypto" | "stablecoin") => {
    setAssetCategory(category);
    setNetwork(category === "bitcoin" ? "bitcoin" : "ethereum");
    setStep("input");
    // Reset input when switching networks
    setInputValue("");
    setError(null);
  };

  const handleAddWallet = async () => {
    setError(null);

    if (!walletName.trim()) {
      setError("Please enter a wallet name");
      return;
    }

    if (!inputValue.trim()) {
      setError(network === "bitcoin" ? "Please enter an address or xpub" : "Please enter an Ethereum address");
      return;
    }

    // Basic validation
    if (network === "bitcoin") {
      if (inputType === "xpub" && !inputValue.match(/^(xpub|ypub|zpub|tpub)/)) {
        setError("Invalid extended public key format");
        return;
      }
      if (inputType === "address" && !inputValue.match(/^(bc1|[13])[a-zA-Z0-9]{25,}/)) {
        setError("Invalid Bitcoin address format");
        return;
      }
    } else if (network === "ethereum") {
      if (!inputValue.match(/^0x[a-fA-F0-9]{40}$/)) {
        setError("Invalid Ethereum address format");
        return;
      }
    }

    setStep("syncing");
    setSyncProgress("Creating wallet...");

    try {
      // Refresh session to ensure we have valid auth after email confirmation
      const { error: refreshError } = await supabase.auth.refreshSession();
      if (refreshError) {
        console.error("Session refresh failed:", refreshError);
      }

      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        setError("Not authenticated. Please sign in again.");
        setStep("input");
        return;
      }

      // Check subscription limits
      const { data: profile } = await supabase
        .from("user_profiles")
        .select("subscription_tier")
        .eq("id", user.id)
        .single();

      const { count: walletCount } = await supabase
        .from("wallets")
        .select("id", { count: "exact", head: true })
        .eq("user_id", user.id)
        .eq("is_deleted", false);

      const tier = (profile?.subscription_tier as SubscriptionTier) || "free";
      const { canAddWallet } = checkLimits(tier, walletCount || 0, 0);

      if (!canAddWallet) {
        // Show upgrade step instead of error
        setStep("upgrade");
        return;
      }

      const walletType: WalletType = assetCategory === "stablecoin" ? "stablecoin" : "single_sig";

      const { data: newWallet, error: insertError } = await supabase
        .from("wallets")
        .insert({
          user_id: user.id,
          name: walletName,
          type: walletType,
          network,
          xpub: network === "bitcoin" && inputType === "xpub" ? inputValue : null,
          address: (network === "bitcoin" && inputType === "address") || network === "ethereum" ? inputValue : null,
        })
        .select()
        .single();

      if (insertError) {
        setError(insertError.message);
        setStep("input");
        return;
      }

      setSyncProgress("Syncing transactions...");

      // Sync the wallet
      if (newWallet) {
        if (network === "bitcoin") {
          const result = await syncWalletClient(supabase, newWallet as Wallet);
          if (result.success) {
            setSyncProgress(`Found ${result.newTransactions} transactions`);
          }
        } else if (network === "ethereum") {
          const result = await syncEthereumWalletClient(supabase, newWallet as Wallet);
          if (result.success) {
            setSyncProgress(`Found ${result.transactionsAdded} transactions`);
          }
        }
      }

      // Show complete step
      setTimeout(() => {
        setStep("complete");
      }, 1000);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create wallet");
      setStep("input");
    }
  };

  return (
    <div className="fixed inset-0 bg-black/80 flex items-center justify-center p-4 z-50">
      <div className="bg-gray-900 border border-gray-800 rounded-xl p-8 w-full max-w-lg relative">
        {/* Tier badge - top left */}
        <div className="absolute top-4 left-4">
          <span className={`text-xs px-2 py-1 rounded-full font-medium ${
            userTier === "free" ? "bg-gray-700 text-gray-300" :
            userTier === "holder" ? "bg-primary/20 text-primary" :
            userTier === "sovereign" ? "bg-purple-500/20 text-purple-400" :
            "bg-blue-500/20 text-blue-400"
          }`}>
            {tierInfo.name} Plan
          </span>
        </div>

        {/* Close button - show on all steps except syncing */}
        {step !== "syncing" && (
          <button
            onClick={onSkip}
            className="absolute top-4 right-4 w-8 h-8 flex items-center justify-center rounded-lg text-text-muted hover:text-text-primary hover:bg-bg-hover transition-colors"
            aria-label="Close wizard"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        )}

        {/* Welcome Step */}
        {step === "welcome" && (
          <div className="text-center space-y-6 pt-4">
            <div className="w-16 h-16 bg-primary/20 rounded-full flex items-center justify-center mx-auto">
              <span className="text-3xl">&#8383;</span>
            </div>
            <div>
              <h2 className="text-2xl font-bold mb-2">Welcome to Self Custody Tax</h2>
              <p className="text-gray-400">
                Track your Bitcoin, crypto, and stablecoin portfolio with ease.
                Let&apos;s get you set up in just a few steps.
              </p>
            </div>
            {/* Tier-specific info */}
            <div className="bg-gray-800/50 rounded-lg p-4 text-left">
              <p className="text-sm text-gray-400 mb-2">Your {tierInfo.name} plan includes:</p>
              <ul className="text-sm text-gray-300 space-y-1">
                {tierInfo.features.slice(0, 3).map((feature, i) => (
                  <li key={i} className="flex items-center gap-2">
                    <span className="text-primary">&#10003;</span> {feature}
                  </li>
                ))}
              </ul>
            </div>
            <div className="space-y-3">
              <button
                onClick={() => setStep("network")}
                className="w-full btn-primary py-3"
              >
                Add Your First Wallet
              </button>
              <button
                onClick={onSkip}
                className="w-full text-gray-500 hover:text-gray-300 text-sm"
              >
                Skip for now
              </button>
            </div>
          </div>
        )}

        {/* Network Selection Step */}
        {step === "network" && (
          <div className="space-y-6">
            <div className="text-center">
              <h2 className="text-xl font-bold mb-2">What would you like to track?</h2>
              <p className="text-gray-400 text-sm">You can add more wallets later</p>
            </div>

            <div className="grid gap-4">
              <button
                onClick={() => handleCategorySelect("bitcoin")}
                className="p-6 border border-gray-700 rounded-xl hover:border-primary hover:bg-primary/5 transition-all text-left group"
              >
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-orange-500/20 rounded-full flex items-center justify-center">
                    <span className="text-2xl">&#8383;</span>
                  </div>
                  <div>
                    <h3 className="font-semibold group-hover:text-primary">Bitcoin</h3>
                    <p className="text-gray-400 text-sm">Track BTC holdings and transactions</p>
                  </div>
                </div>
              </button>

              <button
                onClick={() => handleCategorySelect("crypto")}
                className="p-6 border border-gray-700 rounded-xl hover:border-purple-500 hover:bg-purple-500/5 transition-all text-left group"
              >
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-purple-500/20 rounded-full flex items-center justify-center">
                    <svg className="w-6 h-6 text-purple-400" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M11.944 17.97L4.58 13.62 11.943 24l7.37-10.38-7.372 4.35h.003zM12.056 0L4.69 12.223l7.365 4.354 7.365-4.35L12.056 0z"/>
                    </svg>
                  </div>
                  <div>
                    <h3 className="font-semibold group-hover:text-purple-400">Crypto</h3>
                    <p className="text-gray-400 text-sm">Track ETH holdings and transactions</p>
                  </div>
                </div>
              </button>

              <button
                onClick={() => handleCategorySelect("stablecoin")}
                className="p-6 border border-gray-700 rounded-xl hover:border-blue-500 hover:bg-blue-500/5 transition-all text-left group"
              >
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-blue-500/20 rounded-full flex items-center justify-center">
                    <span className="text-xl text-blue-400">$</span>
                  </div>
                  <div>
                    <h3 className="font-semibold group-hover:text-blue-400">Stablecoins</h3>
                    <p className="text-gray-400 text-sm">Track USDT and USDC on Ethereum</p>
                  </div>
                </div>
              </button>
            </div>

            <button
              onClick={() => setStep("welcome")}
              className="w-full text-gray-500 hover:text-gray-300 text-sm"
            >
              Back
            </button>
          </div>
        )}

        {/* Input Step */}
        {step === "input" && (
          <div className="space-y-6">
            <div>
              <h2 className="text-xl font-bold mb-2">
                Add your {assetCategory === "bitcoin" ? "Bitcoin" : assetCategory === "crypto" ? "Crypto" : "Stablecoin"} wallet
              </h2>
              <p className="text-gray-400 text-sm">
                We only need read-only access to track your balance
              </p>
            </div>

            {error && (
              <div className="bg-red-500/10 border border-red-500/50 text-red-400 px-4 py-3 rounded-lg text-sm">
                {error}
              </div>
            )}

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">
                  Wallet Name
                </label>
                <input
                  type="text"
                  value={walletName}
                  onChange={(e) => setWalletName(e.target.value)}
                  className="w-full px-4 py-2 bg-gray-800 border border-gray-700 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent outline-none"
                  placeholder={assetCategory === "bitcoin" ? "My Cold Storage" : assetCategory === "crypto" ? "My Ethereum Wallet" : "My Stablecoin Wallet"}
                />
              </div>

              {network === "bitcoin" && (
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-1">
                    Input Type
                  </label>
                  <select
                    value={inputType}
                    onChange={(e) => setInputType(e.target.value as "address" | "xpub")}
                    className="w-full px-4 py-2 bg-gray-800 border border-gray-700 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent outline-none"
                  >
                    <option value="address">Single Address</option>
                    <option value="xpub">Extended Public Key (xpub)</option>
                  </select>
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">
                  {network === "bitcoin"
                    ? inputType === "xpub"
                      ? "Extended Public Key"
                      : "Bitcoin Address"
                    : "Ethereum Address"}
                </label>
                <textarea
                  value={inputValue}
                  onChange={(e) => setInputValue(e.target.value)}
                  rows={network === "bitcoin" && inputType === "xpub" ? 3 : 1}
                  className="w-full px-4 py-2 bg-gray-800 border border-gray-700 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent outline-none font-mono text-sm"
                  placeholder={
                    network === "bitcoin"
                      ? inputType === "xpub"
                        ? "xpub6... or ypub... or zpub..."
                        : "bc1q... or 1... or 3..."
                      : "0x..."
                  }
                />
                <p className="text-xs text-gray-500 mt-1">
                  Watch-only. We never have access to your private keys.
                </p>
              </div>
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => setStep("network")}
                className="flex-1 btn-secondary"
              >
                Back
              </button>
              <button
                onClick={handleAddWallet}
                className="flex-1 btn-primary"
              >
                Add Wallet
              </button>
            </div>
          </div>
        )}

        {/* Syncing Step */}
        {step === "syncing" && (
          <div className="text-center space-y-6 py-8">
            <div className="w-16 h-16 border-4 border-primary/30 border-t-primary rounded-full animate-spin mx-auto" />
            <div>
              <h2 className="text-xl font-bold mb-2">Setting up your wallet</h2>
              <p className="text-gray-400">{syncProgress || "Please wait..."}</p>
            </div>
          </div>
        )}

        {/* Complete Step */}
        {step === "complete" && (
          <div className="text-center space-y-6 pt-4">
            <div className="w-16 h-16 bg-green-500/20 rounded-full flex items-center justify-center mx-auto">
              <span className="text-3xl text-green-400">&#10003;</span>
            </div>
            <div>
              <h2 className="text-2xl font-bold mb-2">You&apos;re all set!</h2>
              <p className="text-gray-400">
                Your wallet has been added and synced. You can now view your
                portfolio, track transactions, and generate tax reports.
              </p>
            </div>
            <div className="space-y-3">
              <button
                onClick={onComplete}
                className="w-full btn-primary py-3"
              >
                Go to Dashboard
              </button>
              {userTier === "free" && (
                <a
                  href="/pricing"
                  className="block w-full text-primary hover:text-primary-glow text-sm"
                >
                  Upgrade for more wallets & features →
                </a>
              )}
            </div>
          </div>
        )}

        {/* Upgrade Step - shown when wallet limit reached */}
        {step === "upgrade" && (
          <div className="text-center space-y-6 pt-4">
            <div className="w-16 h-16 bg-primary/20 rounded-full flex items-center justify-center mx-auto">
              <svg className="w-8 h-8 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 13.5l10.5-11.25L12 10.5h8.25L9.75 21.75 12 13.5H3.75z" />
              </svg>
            </div>
            <div>
              <h2 className="text-2xl font-bold mb-2">Wallet Limit Reached</h2>
              <p className="text-gray-400">
                Your {tierInfo.name} plan includes {tierInfo.limits.wallets === Infinity ? "unlimited" : tierInfo.limits.wallets} wallet{tierInfo.limits.wallets !== 1 ? "s" : ""}.
                Upgrade to add more wallets and unlock additional features.
              </p>
            </div>
            <div className="bg-gray-800/50 rounded-lg p-4">
              <p className="text-sm text-gray-400 mb-3">Upgrade to Holder ($99/year) for:</p>
              <ul className="text-sm text-gray-300 space-y-1 text-left">
                <li className="flex items-center gap-2">
                  <span className="text-primary">&#10003;</span> 10 wallets
                </li>
                <li className="flex items-center gap-2">
                  <span className="text-primary">&#10003;</span> Unlimited transactions
                </li>
                <li className="flex items-center gap-2">
                  <span className="text-primary">&#10003;</span> Tax reports (Form 8949)
                </li>
                <li className="flex items-center gap-2">
                  <span className="text-primary">&#10003;</span> FIFO/LIFO/HIFO cost basis
                </li>
              </ul>
            </div>
            <div className="space-y-3">
              <a
                href="/pricing"
                className="block w-full btn-primary py-3 text-center"
              >
                View Plans & Upgrade
              </a>
              <button
                onClick={onComplete}
                className="w-full text-gray-500 hover:text-gray-300 text-sm"
              >
                Continue with current plan
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
