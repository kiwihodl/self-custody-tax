"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useParams, useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Nav } from "@/components/nav";
import { syncWalletClient } from "@/lib/bitcoin/clientSync";
import { syncEthereumWalletClient } from "@/lib/ethereum/clientSync";
import { deriveAddressesWithMetadata, type DerivedAddress } from "@/lib/bitcoin/derivation";
import { importCSV, detectExchange, type ImportResult, type SupportedExchange } from "@/lib/import";
import type { Wallet } from "@/types";

interface Transaction {
  id: string;
  txid: string;
  category: "receive" | "send" | "internal";
  amount: string;
  fee: string;
  block_height: number | null;
  block_timestamp: string | null;
  created_at: string;
}

export default function WalletDetailPage() {
  const params = useParams();
  const router = useRouter();
  const walletId = params.id as string;

  const [wallet, setWallet] = useState<Wallet | null>(null);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [syncError, setSyncError] = useState<string | null>(null);
  const [derivedAddresses, setDerivedAddresses] = useState<DerivedAddress[]>([]);
  const [showAddresses, setShowAddresses] = useState(false);
  const [showImportModal, setShowImportModal] = useState(false);
  const supabase = createClient();

  const fetchWallet = useCallback(async () => {
    const { data, error } = await supabase
      .from("wallets")
      .select("*")
      .eq("id", walletId)
      .eq("is_deleted", false)
      .single();

    if (error || !data) {
      router.push("/wallets");
      return;
    }

    setWallet(data);
  }, [supabase, walletId, router]);

  const fetchTransactions = useCallback(async () => {
    const { data } = await supabase
      .from("transactions")
      .select("*")
      .eq("wallet_id", walletId)
      .order("block_timestamp", { ascending: false, nullsFirst: true });

    if (data) {
      setTransactions(data);
    }
  }, [supabase, walletId]);

  useEffect(() => {
    const load = async () => {
      await fetchWallet();
      await fetchTransactions();
      setLoading(false);
    };
    load();
  }, [fetchWallet, fetchTransactions]);

  // Derive addresses when wallet loads with xpub
  useEffect(() => {
    if (wallet?.xpub && !wallet.address) {
      try {
        const addresses = deriveAddressesWithMetadata(wallet.xpub, 20, true);
        setDerivedAddresses(addresses);
      } catch (err) {
        console.error("Failed to derive addresses:", err);
      }
    }
  }, [wallet?.xpub, wallet?.address]);

  const handleSync = async () => {
    if (!wallet) return;
    setSyncing(true);
    setSyncError(null);

    try {
      let result;
      if (wallet.network === "ethereum") {
        result = await syncEthereumWalletClient(supabase, wallet);
      } else {
        result = await syncWalletClient(supabase, wallet);
      }

      if (!result.success) {
        setSyncError(result.error || "Sync failed");
      } else {
        await fetchWallet();
        await fetchTransactions();
      }
    } catch (err) {
      setSyncError(err instanceof Error ? err.message : "Sync failed");
    } finally {
      setSyncing(false);
    }
  };

  const handleDelete = async () => {
    if (!wallet) return;
    if (!confirm("Are you sure you want to delete this wallet?")) return;

    await supabase
      .from("wallets")
      .update({ is_deleted: true })
      .eq("id", wallet.id);

    router.push("/wallets");
  };

  const isEthereum = wallet?.network === "ethereum";

  const formatBalance = (balance: number | null) => {
    if (balance === null || balance === undefined) {
      return isEthereum ? "-- USD" : "-- BTC";
    }
    return isEthereum ? `$${balance.toFixed(2)}` : `${balance.toFixed(8)} BTC`;
  };

  const formatAmount = (amount: string, category: string) => {
    const num = parseFloat(amount);
    const prefix = category === "receive" ? "+" : category === "send" ? "-" : "";
    const formatted = isEthereum ? `$${num.toFixed(2)}` : `${num.toFixed(8)} BTC`;
    const color =
      category === "receive"
        ? "text-green-400"
        : category === "send"
        ? "text-red-400"
        : "text-gray-400";
    return <span className={color}>{prefix}{formatted}</span>;
  };

  // Get explorer URL based on network
  const getExplorerUrl = (type: "tx" | "address", value: string) => {
    if (isEthereum) {
      return type === "tx"
        ? `https://etherscan.io/tx/${value}`
        : `https://etherscan.io/address/${value}`;
    }
    return type === "tx"
      ? `https://mempool.space/tx/${value}`
      : `https://mempool.space/address/${value}`;
  };

  const truncateTxid = (txid: string) => {
    return `${txid.slice(0, 8)}...${txid.slice(-8)}`;
  };

  if (loading) {
    return (
      <div className="min-h-screen">
        <Nav />
        <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="text-center py-12 text-gray-400">Loading wallet...</div>
        </main>
      </div>
    );
  }

  if (!wallet) {
    return null;
  }

  return (
    <div className="min-h-screen">
      <Nav />
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="flex justify-between items-start mb-8">
          <div>
            <a href="/wallets" className="text-gray-400 hover:text-white text-sm mb-2 inline-block">
              ← Back to Wallets
            </a>
            <h1 className="text-3xl font-bold">{wallet.name}</h1>
            <p className="text-gray-400 mt-1 capitalize">
              {wallet.type.replace("_", " ")} • {wallet.network}
            </p>
          </div>
          <div className="flex gap-2">
            <button
              onClick={handleSync}
              disabled={syncing}
              className="btn-primary disabled:opacity-50"
            >
              {syncing ? "Syncing..." : "Sync Now"}
            </button>
            <button
              onClick={() => setShowImportModal(true)}
              className="btn-secondary"
            >
              Import CSV
            </button>
            <button
              onClick={handleDelete}
              className="btn-secondary text-red-400 hover:text-red-300"
            >
              Delete
            </button>
          </div>
        </div>

        {syncError && (
          <div className="bg-red-500/10 border border-red-500/50 text-red-400 px-4 py-3 rounded-lg text-sm mb-6">
            {syncError}
          </div>
        )}

        {/* Wallet Info */}
        <div className="grid md:grid-cols-3 gap-6 mb-8">
          <div className="card">
            <p className="text-gray-400 text-sm">Balance</p>
            <p className="text-2xl font-bold font-mono">{formatBalance(wallet.balance)}</p>
          </div>
          <div className="card">
            <p className="text-gray-400 text-sm">Transactions</p>
            <p className="text-2xl font-bold">{transactions.length}</p>
          </div>
          <div className="card">
            <p className="text-gray-400 text-sm">Last Synced</p>
            <p className="text-lg">
              {wallet.last_synced_at
                ? new Date(wallet.last_synced_at).toLocaleString()
                : "Never"}
            </p>
          </div>
        </div>

        {/* Address/Xpub Info */}
        <div className="card mb-8">
          <h2 className="font-semibold mb-4">Wallet Details</h2>
          {wallet.address && (
            <div className="mb-4">
              <p className="text-gray-400 text-sm mb-1">Address</p>
              <a
                href={getExplorerUrl("address", wallet.address)}
                target="_blank"
                rel="noopener noreferrer"
                className="font-mono text-sm break-all text-primary hover:underline"
              >
                {wallet.address}
              </a>
            </div>
          )}
          {wallet.xpub && (
            <div>
              <p className="text-gray-400 text-sm mb-1">Extended Public Key</p>
              <p className="font-mono text-xs break-all text-gray-500">{wallet.xpub}</p>
            </div>
          )}
        </div>

        {/* Derived Addresses (for xpub wallets) */}
        {derivedAddresses.length > 0 && (
          <div className="card mb-8">
            <button
              onClick={() => setShowAddresses(!showAddresses)}
              className="w-full flex justify-between items-center"
            >
              <h2 className="font-semibold">Derived Addresses ({derivedAddresses.length})</h2>
              <span className="text-gray-400">{showAddresses ? "▲" : "▼"}</span>
            </button>
            {showAddresses && (
              <div className="mt-4 space-y-2 max-h-96 overflow-y-auto">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-gray-400 mb-2">External (Receiving)</p>
                    {derivedAddresses
                      .filter((a) => a.type === "external")
                      .map((addr) => (
                        <div key={addr.path} className="flex items-center gap-2 py-1">
                          <span className="text-xs text-gray-500 w-12">{addr.index}</span>
                          <a
                            href={`https://mempool.space/address/${addr.address}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="font-mono text-xs text-primary hover:underline truncate"
                          >
                            {addr.address}
                          </a>
                        </div>
                      ))}
                  </div>
                  <div>
                    <p className="text-sm text-gray-400 mb-2">Change</p>
                    {derivedAddresses
                      .filter((a) => a.type === "change")
                      .map((addr) => (
                        <div key={addr.path} className="flex items-center gap-2 py-1">
                          <span className="text-xs text-gray-500 w-12">{addr.index}</span>
                          <a
                            href={`https://mempool.space/address/${addr.address}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="font-mono text-xs text-gray-500 hover:text-primary hover:underline truncate"
                          >
                            {addr.address}
                          </a>
                        </div>
                      ))}
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Transactions */}
        <div className="card">
          <h2 className="font-semibold mb-4">Transactions</h2>
          {transactions.length === 0 ? (
            <p className="text-gray-400 text-center py-8">
              No transactions found. Click Sync to fetch transactions.
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="text-left text-gray-400 text-sm border-b border-gray-800">
                    <th className="pb-3">Type</th>
                    <th className="pb-3">Amount</th>
                    <th className="pb-3">Transaction ID</th>
                    <th className="pb-3">Block</th>
                    <th className="pb-3">Date</th>
                  </tr>
                </thead>
                <tbody>
                  {transactions.map((tx) => (
                    <tr key={tx.id} className="border-b border-gray-800/50">
                      <td className="py-3 capitalize">{tx.category}</td>
                      <td className="py-3 font-mono">{formatAmount(tx.amount, tx.category)}</td>
                      <td className="py-3">
                        <a
                          href={getExplorerUrl("tx", tx.txid)}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="font-mono text-sm text-primary hover:underline"
                        >
                          {truncateTxid(tx.txid)}
                        </a>
                      </td>
                      <td className="py-3 text-gray-400">
                        {tx.block_height || "Pending"}
                      </td>
                      <td className="py-3 text-gray-400 text-sm">
                        {tx.block_timestamp
                          ? new Date(tx.block_timestamp).toLocaleDateString()
                          : "Pending"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Import CSV Modal */}
        {showImportModal && wallet && (
          <ImportCSVModal
            wallet={wallet}
            onClose={() => setShowImportModal(false)}
            onSuccess={() => {
              setShowImportModal(false);
              fetchWallet();
              fetchTransactions();
            }}
          />
        )}
      </main>
    </div>
  );
}

function ImportCSVModal({
  wallet,
  onClose,
  onSuccess,
}: {
  wallet: Wallet;
  onClose: () => void;
  onSuccess: () => void;
}) {
  const [csvContent, setCsvContent] = useState("");
  const [detectedExchange, setDetectedExchange] = useState<SupportedExchange | null>(null);
  const [importing, setImporting] = useState(false);
  const [result, setResult] = useState<ImportResult | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const supabase = createClient();

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const text = await file.text();
      setCsvContent(text);

      // Auto-detect exchange
      const detected = detectExchange(text);
      setDetectedExchange(detected);
    } catch {
      setCsvContent("");
      setDetectedExchange(null);
    }

    // Reset file input
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const handleTextChange = (text: string) => {
    setCsvContent(text);
    if (text.trim()) {
      const detected = detectExchange(text);
      setDetectedExchange(detected);
    } else {
      setDetectedExchange(null);
    }
  };

  const handleImport = async () => {
    if (!csvContent.trim()) return;

    setImporting(true);
    setResult(null);

    try {
      const importResult = await importCSV(supabase, wallet, csvContent);
      setResult(importResult);

      if (importResult.success && importResult.transactionsImported > 0) {
        // Auto-close after success with delay
        setTimeout(() => {
          onSuccess();
        }, 2000);
      }
    } catch (err) {
      setResult({
        success: false,
        transactionsImported: 0,
        transactionsSkipped: 0,
        taxLotsCreated: 0,
        errors: [err instanceof Error ? err.message : "Import failed"],
      });
    } finally {
      setImporting(false);
    }
  };

  const exchangeNames: Record<SupportedExchange, string> = {
    amber: "Amber App",
    coinbase: "Coinbase",
    kraken: "Kraken",
    gemini: "Gemini",
    river: "River",
    swan: "Swan Bitcoin",
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
      <div className="bg-gray-900 border border-gray-800 rounded-xl p-6 w-full max-w-lg max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-xl font-semibold">Import Transactions</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-white">
            ✕
          </button>
        </div>

        <div className="space-y-4">
          {/* Result display */}
          {result && (
            <div
              className={`p-4 rounded-lg ${
                result.success
                  ? "bg-green-500/10 border border-green-500/50"
                  : "bg-red-500/10 border border-red-500/50"
              }`}
            >
              {result.success ? (
                <div className="text-green-400">
                  <p className="font-medium">Import Complete</p>
                  <p className="text-sm mt-1">
                    {result.transactionsImported} transactions imported
                    {result.transactionsSkipped > 0 && `, ${result.transactionsSkipped} skipped (duplicates)`}
                  </p>
                  {result.taxLotsCreated > 0 && (
                    <p className="text-sm">{result.taxLotsCreated} tax lots created</p>
                  )}
                </div>
              ) : (
                <div className="text-red-400">
                  <p className="font-medium">Import Failed</p>
                  {result.errors.map((err, i) => (
                    <p key={i} className="text-sm mt-1">
                      {err}
                    </p>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Info */}
          <div className="bg-gray-800/50 p-4 rounded-lg text-sm text-gray-400">
            <p className="font-medium text-gray-300 mb-2">Supported Exchanges</p>
            <ul className="list-disc list-inside space-y-1">
              <li>Amber App (Australian exchange)</li>
              <li>Coinbase (Transaction History export)</li>
              <li>Kraken (Ledger export)</li>
              <li>Gemini (Transaction History export)</li>
              <li>River (Account Activity CSV)</li>
              <li>Swan Bitcoin (Deposits/Purchases CSV)</li>
            </ul>
            <p className="mt-3 text-xs">
              Only {wallet.network === "bitcoin" ? "BTC" : "USDT/USDC"} transactions will be imported.
            </p>
          </div>

          {/* File upload */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Upload CSV File
            </label>
            <input
              ref={fileInputRef}
              type="file"
              accept=".csv"
              onChange={handleFileUpload}
              className="w-full text-sm text-gray-400 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-medium file:bg-primary file:text-white hover:file:bg-primary/80 cursor-pointer"
            />
          </div>

          {/* Or paste */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Or Paste CSV Content
            </label>
            <textarea
              value={csvContent}
              onChange={(e) => handleTextChange(e.target.value)}
              rows={6}
              className="w-full px-4 py-2 bg-gray-800 border border-gray-700 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent outline-none font-mono text-xs"
              placeholder="Date,Type,Asset,Amount,Fee,..."
            />
          </div>

          {/* Detected exchange */}
          {detectedExchange && (
            <div className="bg-primary/10 border border-primary/50 text-primary px-4 py-2 rounded-lg text-sm">
              Detected format: <strong>{exchangeNames[detectedExchange]}</strong>
            </div>
          )}

          {csvContent && !detectedExchange && (
            <div className="bg-yellow-500/10 border border-yellow-500/50 text-yellow-400 px-4 py-2 rounded-lg text-sm">
              Could not detect exchange format. Please ensure you are using a supported CSV format.
            </div>
          )}

          {/* Actions */}
          <div className="flex gap-3 pt-2">
            <button type="button" onClick={onClose} className="flex-1 btn-secondary">
              Cancel
            </button>
            <button
              onClick={handleImport}
              disabled={importing || !csvContent.trim() || !detectedExchange}
              className="flex-1 btn-primary disabled:opacity-50"
            >
              {importing ? "Importing..." : "Import"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
