"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Nav } from "@/components/nav";
import { syncWalletClient } from "@/lib/bitcoin/clientSync";
import { syncEthereumWalletClient } from "@/lib/ethereum/clientSync";
import { SubscriptionTier, checkLimits } from "@/lib/stripe/tiers";
import type { Wallet, WalletType, Network, MultisigConfig } from "@/types";

type WalletFilter = "bitcoin" | "crypto" | "stablecoin" | null;

export default function WalletsPage() {
  const searchParams = useSearchParams();
  const filterParam = searchParams.get("filter") as WalletFilter;

  const [wallets, setWallets] = useState<Wallet[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const supabase = createClient();

  // Sort wallets based on filter - filtered type comes first
  const sortedWallets = [...wallets].sort((a, b) => {
    if (!filterParam) return 0;

    const getScore = (w: Wallet) => {
      if (filterParam === "bitcoin" && w.network === "bitcoin") return 0;
      if (filterParam === "crypto" && w.network === "ethereum" && w.type !== "stablecoin") return 0;
      if (filterParam === "stablecoin" && w.type === "stablecoin") return 0;
      return 1;
    };

    const scoreA = getScore(a);
    const scoreB = getScore(b);

    if (scoreA !== scoreB) return scoreA - scoreB;

    // Secondary sort: alphabetically by name
    return a.name.localeCompare(b.name);
  });

  const fetchWallets = useCallback(async () => {
    const { data, error } = await supabase
      .from("wallets")
      .select("*")
      .eq("is_deleted", false)
      .order("created_at", { ascending: false });

    if (!error && data) {
      setWallets(data);
      // Auto-open modal if no wallets exist
      if (data.length === 0) {
        setShowAddModal(true);
      }
    }
    setLoading(false);
  }, [supabase]);

  useEffect(() => {
    fetchWallets();
  }, [fetchWallets]);

  return (
    <div className="min-h-screen bg-bg-base">
      <Nav />
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="flex justify-end mb-8">
          <button onClick={() => setShowAddModal(true)} className="btn-primary px-6 py-3 text-base">
            <span className="flex items-center gap-2">
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
              </svg>
              Add Wallet
            </span>
          </button>
        </div>

        {/* Wallets Grid */}
        {loading ? (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="card animate-pulse">
                <div className="h-6 bg-bg-hover rounded w-32 mb-3" />
                <div className="h-4 bg-bg-hover rounded w-24 mb-6" />
                <div className="h-8 bg-bg-hover rounded w-full" />
              </div>
            ))}
          </div>
        ) : wallets.length === 0 ? (
          <div className="card text-center py-20">
            <div className="w-20 h-20 rounded-full bg-bg-hover flex items-center justify-center mx-auto mb-6">
              <svg className="w-10 h-10 text-text-muted" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M21 12a2.25 2.25 0 00-2.25-2.25H15a3 3 0 11-6 0H5.25A2.25 2.25 0 003 12m18 0v6a2.25 2.25 0 01-2.25 2.25H5.25A2.25 2.25 0 013 18v-6m18 0V9M3 12V9m18 0a2.25 2.25 0 00-2.25-2.25H5.25A2.25 2.25 0 003 9m18 0V6a2.25 2.25 0 00-2.25-2.25H5.25A2.25 2.25 0 003 6v3" />
              </svg>
            </div>
            <h2 className="text-xl font-semibold mb-2 text-text-primary">No wallets yet</h2>
            <p className="text-text-secondary mb-8 max-w-sm mx-auto">
              Add your first wallet to start tracking your portfolio
            </p>
            <button onClick={() => setShowAddModal(true)} className="btn-primary">
              Add Your First Wallet
            </button>
          </div>
        ) : (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {sortedWallets.map((wallet) => (
              <WalletCard key={wallet.id} wallet={wallet} onRefresh={fetchWallets} />
            ))}
          </div>
        )}

        {/* Add Wallet Modal */}
        {showAddModal && (
          <AddWalletModal
            onClose={() => setShowAddModal(false)}
            onSuccess={() => {
              setShowAddModal(false);
              fetchWallets();
            }}
          />
        )}
      </main>
    </div>
  );
}

function WalletCard({ wallet, onRefresh }: { wallet: Wallet; onRefresh: () => void }) {
  const [syncing, setSyncing] = useState(false);
  const [syncError, setSyncError] = useState<string | null>(null);
  const [syncResult, setSyncResult] = useState<string | null>(null);
  const supabase = createClient();

  const handleSync = async () => {
    setSyncing(true);
    setSyncError(null);
    setSyncResult(null);

    try {
      if (wallet.network === "bitcoin") {
        // Use client-side sync to bypass server auth issues
        const result = await syncWalletClient(supabase, wallet);

        if (!result.success) {
          setSyncError(result.error || "Sync failed");
        } else {
          // Show sync result summary
          const parts = [];
          if (result.addressCount) parts.push(`${result.addressCount} addresses`);
          parts.push(`${result.newTransactions} new txs`);
          parts.push(`${result.balance.toFixed(8)} BTC`);
          setSyncResult(parts.join(" | "));
        }
      } else if (wallet.network === "ethereum") {
        const result = await syncEthereumWalletClient(supabase, wallet);

        if (!result.success) {
          setSyncError(result.error || "Sync failed");
        } else {
          const parts = [];
          parts.push(`${result.transactionsAdded} new txs`);
          result.balances.forEach((b) => {
            parts.push(`${parseFloat(b.balance).toFixed(2)} ${b.token}`);
          });
          setSyncResult(parts.join(" | "));
        }
      }
    } catch (err) {
      setSyncError(err instanceof Error ? err.message : "Sync failed");
    } finally {
      setSyncing(false);
      onRefresh();
    }
  };

  // Format balance based on network
  const formatBalance = (balance: number | null) => {
    if (balance === null || balance === undefined) {
      return wallet.network === "ethereum" ? "-- USD" : "-- BTC";
    }
    if (wallet.network === "ethereum") {
      return `$${balance.toFixed(2)}`;
    }
    return `${balance.toFixed(8)} BTC`;
  };

  // Get quorum display for multisig wallets
  const getQuorumBadge = () => {
    if (wallet.type !== "multisig" && wallet.type !== "collaborative") return null;
    const config = wallet.multisig_config as MultisigConfig | null;
    if (!config) return null;
    return `${config.quorum_required}/${config.total_keys}`;
  };

  const quorumBadge = getQuorumBadge();

  return (
    <div className="card group hover:border-border-hover transition-all duration-300">
      <div className="flex justify-between items-start mb-4">
        <div className="flex items-start gap-3">
          <div className={`w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0 ${
            wallet.network === "bitcoin"
              ? "bg-primary/10"
              : wallet.type === "stablecoin"
                ? "bg-info/10"
                : "bg-purple-500/10"
          }`}>
            {wallet.network === "bitcoin" ? (
              // Bitcoin icon - orange
              <svg className="w-5 h-5 text-primary" viewBox="0 0 24 24" fill="currentColor">
                <path d="M12.5 3.5c-3.6 0-6.5 2.9-6.5 6.5 0 2.6 1.5 4.8 3.7 5.8v4.7c0 .6.4 1 1 1h3.5c.6 0 1-.4 1-1v-4.7c2.2-1 3.8-3.2 3.8-5.8 0-3.6-2.9-6.5-6.5-6.5zm.5 6.5c0 .6-.4 1-1 1s-1-.4-1-1 .4-1 1-1 1 .4 1 1z"/>
              </svg>
            ) : wallet.type === "stablecoin" ? (
              // Stablecoin icon - blue
              <svg className="w-5 h-5 text-info" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v12m-3-2.818l.879.659c1.171.879 3.07.879 4.242 0 1.172-.879 1.172-2.303 0-3.182C13.536 12.219 12.768 12 12 12c-.725 0-1.45-.22-2.003-.659-1.106-.879-1.106-2.303 0-3.182s2.9-.879 4.006 0l.415.33M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            ) : (
              // Crypto/ETH icon - purple
              <svg className="w-5 h-5 text-purple-400" viewBox="0 0 24 24" fill="currentColor">
                <path d="M11.944 17.97L4.58 13.62 11.943 24l7.37-10.38-7.372 4.35h.003zM12.056 0L4.69 12.223l7.365 4.354 7.365-4.35L12.056 0z"/>
              </svg>
            )}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="font-semibold text-lg text-text-primary">{wallet.name}</h3>
              {quorumBadge && (
                <span className="px-2 py-0.5 text-xs font-mono bg-primary/10 text-primary rounded-md">
                  {quorumBadge}
                </span>
              )}
            </div>
            <p className="text-sm text-text-tertiary capitalize">
              {wallet.type.replace("_", " ")} • {
                wallet.network === "bitcoin"
                  ? "Bitcoin"
                  : wallet.type === "stablecoin"
                    ? "Stablecoin"
                    : "Crypto"
              }
            </p>
            {wallet.xpub && !wallet.address && (() => {
              // Always show truncated xpub
              const truncatedXpub = wallet.xpub.slice(0, 8) + "..." + wallet.xpub.slice(-4);
              return (
                <p
                  className="text-xs text-text-muted mt-1 font-mono cursor-help"
                  title={wallet.xpub}
                >
                  {truncatedXpub}
                </p>
              );
            })()}
            {wallet.address && !wallet.xpub && (
              <p className="text-xs text-text-muted mt-1 font-mono truncate max-w-[180px]">
                {wallet.address}
              </p>
            )}
          </div>
        </div>
        {wallet.sync_status !== "idle" && (
          <span className={`badge ${
            wallet.sync_status === "syncing"
              ? "badge-warning"
              : wallet.sync_status === "error"
              ? "badge-error"
              : "badge-success"
          }`}>
            {wallet.sync_status}
          </span>
        )}
      </div>

      {syncError && (() => {
        const truncated = syncError.length > 50 ? syncError.slice(0, 50) + "..." : syncError;
        return (
          <div
            className="bg-error/10 border border-error/30 text-error px-3 py-2 rounded-lg text-xs mb-4 cursor-help"
            title={syncError}
          >
            {truncated}
          </div>
        );
      })()}

      {syncResult && !syncError && (
        <div className="bg-success/10 border border-success/30 text-success px-3 py-2 rounded-lg text-xs mb-4">
          {syncResult}
        </div>
      )}

      <div className="space-y-3 mb-5 py-4 border-t border-b border-border">
        <div className="flex justify-between text-sm">
          <span className="text-text-tertiary">Balance</span>
          <span className="font-mono text-text-primary">{formatBalance(wallet.balance)}</span>
        </div>
        <div className="flex justify-between text-sm">
          <span className="text-text-tertiary">Last synced</span>
          <span className="text-text-muted">
            {wallet.last_synced_at
              ? new Date(wallet.last_synced_at).toLocaleString()
              : "Never"}
          </span>
        </div>
      </div>

      <div className="flex gap-2">
        <button
          onClick={handleSync}
          disabled={syncing || wallet.sync_status === "syncing"}
          className="flex-1 btn-secondary text-sm disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {syncing || wallet.sync_status === "syncing" ? (
            <span className="flex items-center justify-center gap-2">
              <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
              </svg>
              Syncing...
            </span>
          ) : "Sync"}
        </button>
        <a href={`/wallets/${wallet.id}`} className="flex-1 btn-secondary text-sm text-center">
          Details
        </a>
      </div>
    </div>
  );
}

function AddWalletModal({
  onClose,
  onSuccess,
}: {
  onClose: () => void;
  onSuccess: () => void;
}) {
  const [name, setName] = useState("");
  const [type, setType] = useState<WalletType>("single_sig");
  const [network, setNetwork] = useState<Network>("bitcoin");
  const [inputMode, setInputMode] = useState<"address" | "xpub" | "descriptor">("address");
  const [xpub, setXpub] = useState("");
  const [address, setAddress] = useState("");
  const [descriptor, setDescriptor] = useState("");
  const [descriptorInfo, setDescriptorInfo] = useState<{ quorum: string; valid: boolean; error?: string } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const supabase = createClient();

  // Validate descriptor when it changes
  const handleDescriptorChange = async (value: string) => {
    setDescriptor(value);
    setDescriptorInfo(null);

    if (!value.trim()) return;

    try {
      const { validateDescriptor } = await import("@/lib/bitcoin/descriptors");
      const result = validateDescriptor(value);

      if (result.valid && result.parsed) {
        const quorum = result.parsed.quorum
          ? `${result.parsed.quorum.required}-of-${result.parsed.quorum.total}`
          : "Single-sig";
        setDescriptorInfo({ quorum, valid: true });
        // Auto-set type to multisig if detected
        if (result.parsed.isMultisig) {
          setType("multisig");
        }
      } else {
        setDescriptorInfo({ quorum: "", valid: false, error: result.error });
      }
    } catch {
      setDescriptorInfo({ quorum: "", valid: false, error: "Failed to parse descriptor" });
    }
  };

  // Handle JSON file upload
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const text = await file.text();
      const { parseMultisigJSON } = await import("@/lib/bitcoin/descriptors");
      const config = parseMultisigJSON(text);

      if (config) {
        setDescriptor(config.descriptor);
        setDescriptorInfo({
          quorum: `${config.quorum_required}-of-${config.total_keys}`,
          valid: true,
        });
        setType("multisig");
        // Auto-fill name from filename if empty
        if (!name) {
          setName(file.name.replace(/\.(json|txt)$/i, ""));
        }
      } else {
        setError("Could not parse wallet file. Supported formats: Caravan, Coldcard, Sparrow JSON");
      }
    } catch {
      setError("Failed to read file");
    }

    // Reset file input
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    // Validation
    if (network === "bitcoin") {
      if (inputMode === "address" && !address) {
        setError("Bitcoin address is required");
        setLoading(false);
        return;
      }
      if (inputMode === "xpub" && !xpub) {
        setError("Extended public key is required");
        setLoading(false);
        return;
      }
      if (inputMode === "descriptor" && !descriptor) {
        setError("Wallet descriptor is required");
        setLoading(false);
        return;
      }
      if (inputMode === "descriptor" && descriptorInfo && !descriptorInfo.valid) {
        setError(descriptorInfo.error || "Invalid descriptor");
        setLoading(false);
        return;
      }
    }

    if (network === "ethereum" && !address) {
      setError("Address is required for Ethereum wallets");
      setLoading(false);
      return;
    }

    // Basic xpub validation
    if (inputMode === "xpub" && xpub && !xpub.match(/^(xpub|ypub|zpub|tpub)/)) {
      setError("Invalid xpub format. Must start with xpub, ypub, zpub, or tpub");
      setLoading(false);
      return;
    }

    // Basic bitcoin address validation
    if (inputMode === "address" && network === "bitcoin" && address && !address.match(/^(bc1|[13])[a-zA-Z0-9]{25,}/)) {
      setError("Invalid Bitcoin address format");
      setLoading(false);
      return;
    }

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      window.location.href = "/auth/login";
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
    const { canAddWallet, message } = checkLimits(tier, walletCount || 0, 0);

    if (!canAddWallet) {
      setError(message || "Wallet limit reached. Upgrade your plan to add more wallets.");
      setLoading(false);
      return;
    }

    // Prepare multisig config if descriptor mode
    let multisigConfig = null;
    if (inputMode === "descriptor" && descriptor) {
      try {
        const { extractMultisigConfig } = await import("@/lib/bitcoin/descriptors");
        multisigConfig = extractMultisigConfig(descriptor);
      } catch (err) {
        console.warn("Failed to extract multisig config:", err);
      }
    }

    // Determine wallet type
    let walletType: WalletType;
    if (network === "ethereum") {
      walletType = "stablecoin";
    } else if (inputMode === "descriptor") {
      walletType = "multisig";
    } else {
      walletType = type;
    }

    const { data: newWallet, error: insertError } = await supabase
      .from("wallets")
      .insert({
        user_id: user.id,
        name,
        type: walletType,
        network,
        xpub: network === "bitcoin" && inputMode === "xpub" ? xpub : null,
        address: (network === "bitcoin" && inputMode === "address") || network === "ethereum" ? address : null,
        multisig_config: multisigConfig,
      })
      .select()
      .single();

    if (insertError) {
      setError(insertError.message);
      setLoading(false);
      return;
    }

    // Auto-sync the new wallet
    if (newWallet) {
      // Set status to syncing immediately so UI shows it
      await supabase
        .from("wallets")
        .update({ sync_status: "syncing" })
        .eq("id", newWallet.id);

      // Close modal and refresh list (will show "syncing" status)
      onSuccess();

      // Run sync in background based on network
      if (network === "bitcoin") {
        syncWalletClient(supabase, newWallet as Wallet)
          .then((result) => {
            if (!result.success) {
              console.warn("Auto-sync failed:", result.error);
            }
          })
          .catch((syncErr) => {
            console.warn("Auto-sync error:", syncErr);
          });
      } else if (network === "ethereum") {
        syncEthereumWalletClient(supabase, newWallet as Wallet)
          .then((result) => {
            if (!result.success) {
              console.warn("Auto-sync failed:", result.error);
            }
          })
          .catch((syncErr) => {
            console.warn("Auto-sync error:", syncErr);
          });
      }
    }
  };

  return (
    <div className="fixed inset-0 bg-bg-base/80 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-fade-in">
      <div className="glass rounded-2xl p-6 w-full max-w-md max-h-[90vh] overflow-y-auto animate-scale-in">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-xl font-semibold text-text-primary">Add Wallet</h2>
          <button onClick={onClose} className="text-text-muted hover:text-text-primary transition-colors p-1">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">
          {error && (
            <div className="bg-error/10 border border-error/30 text-error px-4 py-3 rounded-lg text-sm flex items-center gap-2">
              <svg className="w-4 h-4 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
              {error}
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-text-secondary mb-2">
              Wallet Name
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              className="input w-full"
              placeholder="My Cold Storage"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-text-secondary mb-2">
              Network
            </label>
            <select
              value={network}
              onChange={(e) => setNetwork(e.target.value as Network)}
              className="input w-full"
            >
              <option value="bitcoin">Bitcoin</option>
              <option value="ethereum">Ethereum (USDT/USDC)</option>
            </select>
          </div>

          {network === "bitcoin" && (
            <>
              <div>
                <label className="block text-sm font-medium text-text-secondary mb-2">
                  Track By
                </label>
                <select
                  value={inputMode}
                  onChange={(e) => setInputMode(e.target.value as "address" | "xpub" | "descriptor")}
                  className="input w-full"
                >
                  <option value="address">Single Address</option>
                  <option value="xpub">Extended Public Key (xpub)</option>
                  <option value="descriptor">Multisig Descriptor</option>
                </select>
              </div>

              {inputMode === "address" && (
                <div>
                  <label className="block text-sm font-medium text-text-secondary mb-2">
                    Bitcoin Address
                  </label>
                  <input
                    type="text"
                    value={address}
                    onChange={(e) => setAddress(e.target.value)}
                    className="input w-full font-mono text-sm"
                    placeholder="bc1q... or 1... or 3..."
                  />
                  <p className="text-xs text-text-muted mt-2">
                    Watch-only. We never have access to your private keys.
                  </p>
                </div>
              )}

              {inputMode === "xpub" && (
                <div>
                  <label className="block text-sm font-medium text-text-secondary mb-2">
                    Extended Public Key
                  </label>
                  <textarea
                    value={xpub}
                    onChange={(e) => setXpub(e.target.value)}
                    rows={3}
                    className="input w-full font-mono text-sm resize-none"
                    placeholder="xpub6... or ypub... or zpub..."
                  />
                  <p className="text-xs text-text-muted mt-2">
                    Watch-only. Tracks all addresses derived from this key.
                  </p>
                </div>
              )}

              {inputMode === "descriptor" && (
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-text-secondary mb-2">
                      Wallet Descriptor
                    </label>
                    <textarea
                      value={descriptor}
                      onChange={(e) => handleDescriptorChange(e.target.value)}
                      rows={4}
                      className="input w-full font-mono text-xs resize-none"
                      placeholder="wsh(sortedmulti(2,[fingerprint/path]xpub...,[fingerprint/path]xpub...))#checksum"
                    />
                    {descriptorInfo && (
                      <div className={`mt-2 text-sm flex items-center gap-2 ${descriptorInfo.valid ? "text-success" : "text-error"}`}>
                        {descriptorInfo.valid ? (
                          <>
                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                              <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                            </svg>
                            <span>Detected: {descriptorInfo.quorum} multisig</span>
                          </>
                        ) : (
                          <>
                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                            </svg>
                            <span>{descriptorInfo.error}</span>
                          </>
                        )}
                      </div>
                    )}
                  </div>

                  <div className="flex items-center gap-3">
                    <span className="text-sm text-text-tertiary">Or import from file:</span>
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept=".json,.txt"
                      onChange={handleFileUpload}
                      className="hidden"
                    />
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      className="btn-ghost text-sm"
                    >
                      <span className="flex items-center gap-2">
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                        </svg>
                        Upload JSON
                      </span>
                    </button>
                  </div>

                  <p className="text-xs text-text-muted">
                    Export from Sparrow, Coldcard, Caravan, or Casa and paste the descriptor
                    or upload the wallet config file.
                  </p>
                </div>
              )}
            </>
          )}

          {network === "ethereum" && (
            <div>
              <label className="block text-sm font-medium text-text-secondary mb-2">
                Ethereum Address
              </label>
              <input
                type="text"
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                required
                className="input w-full font-mono text-sm"
                placeholder="0x..."
              />
            </div>
          )}

          {inputMode !== "descriptor" && network === "bitcoin" && (
            <div>
              <label className="block text-sm font-medium text-text-secondary mb-2">
                Wallet Type
              </label>
              <select
                value={type}
                onChange={(e) => setType(e.target.value as WalletType)}
                className="input w-full"
              >
                <option value="single_sig">Single Signature</option>
                <option value="multisig">Multisig</option>
                <option value="collaborative">Collaborative (Unchained/Casa)</option>
                <option value="exchange">Exchange Account</option>
              </select>
            </div>
          )}

          <div className="flex gap-3 pt-4">
            <button type="button" onClick={onClose} className="flex-1 btn-secondary">
              Cancel
            </button>
            <button type="submit" disabled={loading} className="flex-1 btn-primary disabled:opacity-50">
              {loading ? (
                <span className="flex items-center justify-center gap-2">
                  <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                  </svg>
                  Adding...
                </span>
              ) : "Add Wallet"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
