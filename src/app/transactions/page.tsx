"use client";

import { useState, useEffect, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import { Nav } from "@/components/nav";

interface Transaction {
  id: string;
  wallet_id: string;
  wallet_name?: string;
  txid: string;
  category: "receive" | "send" | "internal" | "fee" | "income" | "mining" | "interest" | "airdrop";
  amount: string;
  fee: string;
  block_height: number | null;
  block_timestamp: string | null;
  created_at: string;
  is_internal_transfer: boolean;
  linked_transaction_id: string | null;
}

interface Wallet {
  id: string;
  name: string;
}

type FilterCategory = "all" | "receive" | "send" | "internal" | "income";
type TxCategory = "receive" | "send" | "internal" | "income" | "mining" | "interest" | "airdrop";

const CATEGORY_OPTIONS: { value: TxCategory; label: string }[] = [
  { value: "receive", label: "Receive (Purchase)" },
  { value: "income", label: "Income (Payment)" },
  { value: "mining", label: "Mining Reward" },
  { value: "interest", label: "Interest/Yield" },
  { value: "airdrop", label: "Airdrop" },
  { value: "send", label: "Send" },
  { value: "internal", label: "Internal Transfer" },
];

export default function TransactionsPage() {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [wallets, setWallets] = useState<Wallet[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterCategory, setFilterCategory] = useState<FilterCategory>("all");
  const [filterWallet, setFilterWallet] = useState<string>("all");
  const [sortOrder, setSortOrder] = useState<"desc" | "asc">("desc");
  const [editingTx, setEditingTx] = useState<string | null>(null);
  const [detectingInternal, setDetectingInternal] = useState(false);
  const [detectResult, setDetectResult] = useState<string | null>(null);
  const [linkMode, setLinkMode] = useState(false);
  const [selectedForLink, setSelectedForLink] = useState<string[]>([]);
  const [linkingStatus, setLinkingStatus] = useState<string | null>(null);
  const supabase = createClient();

  const fetchData = useCallback(async () => {
    setLoading(true);

    // Get current user
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      setLoading(false);
      return;
    }

    // Fetch wallets first
    const { data: walletsData } = await supabase
      .from("wallets")
      .select("id, name")
      .eq("user_id", user.id)
      .eq("is_deleted", false);

    const walletMap = new Map<string, string>();
    if (walletsData) {
      setWallets(walletsData);
      walletsData.forEach((w) => walletMap.set(w.id, w.name));
    }

    // Fetch transactions
    let query = supabase
      .from("transactions")
      .select("*")
      .order("block_timestamp", { ascending: sortOrder === "asc", nullsFirst: true });

    // Filter by wallet if specified
    if (filterWallet !== "all") {
      query = query.eq("wallet_id", filterWallet);
    } else if (walletsData) {
      // Only get transactions for user's wallets
      query = query.in("wallet_id", walletsData.map((w) => w.id));
    }

    // Filter by category if specified
    if (filterCategory !== "all") {
      query = query.eq("category", filterCategory);
    }

    const { data: txData } = await query;

    if (txData) {
      // Add wallet names
      const txsWithNames = txData.map((tx) => ({
        ...tx,
        wallet_name: walletMap.get(tx.wallet_id) || "Unknown",
      }));
      setTransactions(txsWithNames);
    }

    setLoading(false);
  }, [supabase, filterCategory, filterWallet, sortOrder]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const detectInternalTransfers = async () => {
    setDetectingInternal(true);
    setDetectResult(null);

    try {
      const res = await fetch("/api/transactions/detect-internal", {
        method: "POST",
      });
      const data = await res.json();

      if (data.success) {
        setDetectResult(`Found ${data.detected} internal transfers, linked ${data.linked} pairs`);
        // Refresh transaction list
        fetchData();
      } else {
        setDetectResult(`Error: ${data.error}`);
      }
    } catch {
      setDetectResult("Failed to detect internal transfers");
    } finally {
      setDetectingInternal(false);
    }
  };

  const toggleSelectForLink = (txId: string) => {
    if (selectedForLink.includes(txId)) {
      setSelectedForLink(selectedForLink.filter((id) => id !== txId));
    } else if (selectedForLink.length < 2) {
      setSelectedForLink([...selectedForLink, txId]);
    }
  };

  const linkSelectedTransactions = async () => {
    if (selectedForLink.length !== 2) return;

    setLinkingStatus("Linking...");
    try {
      const res = await fetch("/api/transactions/link", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ txId1: selectedForLink[0], txId2: selectedForLink[1] }),
      });
      const data = await res.json();

      if (data.success) {
        setLinkingStatus("Transactions linked successfully");
        setSelectedForLink([]);
        setLinkMode(false);
        fetchData();
      } else {
        setLinkingStatus(`Error: ${data.error}`);
      }
    } catch {
      setLinkingStatus("Failed to link transactions");
    }
  };

  const unlinkTransaction = async (txId: string) => {
    setLinkingStatus("Unlinking...");
    try {
      const res = await fetch(`/api/transactions/link?txId=${txId}`, {
        method: "DELETE",
      });
      const data = await res.json();

      if (data.success) {
        setLinkingStatus("Transaction unlinked");
        fetchData();
      } else {
        setLinkingStatus(`Error: ${data.error}`);
      }
    } catch {
      setLinkingStatus("Failed to unlink transaction");
    }
  };

  const exitLinkMode = () => {
    setLinkMode(false);
    setSelectedForLink([]);
    setLinkingStatus(null);
  };

  const updateCategory = async (txId: string, newCategory: TxCategory) => {
    const { error } = await supabase
      .from("transactions")
      .update({ category: newCategory })
      .eq("id", txId);

    if (error) {
      console.error("Failed to update category:", error);
      return;
    }

    // Update local state
    setTransactions((prev) =>
      prev.map((tx) => (tx.id === txId ? { ...tx, category: newCategory } : tx))
    );
    setEditingTx(null);
  };

  const formatAmount = (amount: string, category: string) => {
    const num = parseFloat(amount);
    const prefix = category === "receive" ? "+" : category === "send" ? "-" : "";
    const color =
      category === "receive" || category === "income" || category === "mining"
        ? "text-success"
        : category === "send"
        ? "text-error"
        : "text-text-tertiary";
    return <span className={color}>{prefix}{num.toFixed(8)} BTC</span>;
  };

  const truncateTxid = (txid: string) => {
    return `${txid.slice(0, 8)}...${txid.slice(-8)}`;
  };

  const getCategoryBadge = (category: string, isEditing: boolean = false) => {
    const colors: Record<string, string> = {
      receive: "bg-success/10 text-success border-success/30",
      send: "bg-error/10 text-error border-error/30",
      internal: "bg-info/10 text-info border-info/30",
      income: "bg-purple-500/10 text-purple-400 border-purple-500/30",
      mining: "bg-warning/10 text-warning border-warning/30",
      interest: "bg-cyan-500/10 text-cyan-400 border-cyan-500/30",
      airdrop: "bg-pink-500/10 text-pink-400 border-pink-500/30",
      fee: "bg-bg-hover text-text-muted border-border",
    };
    return (
      <span className={`px-2.5 py-1 rounded-md text-xs capitalize border ${colors[category] || colors.fee} ${isEditing ? "ring-2 ring-primary" : "cursor-pointer hover:brightness-125"} transition-all`}>
        {category}
      </span>
    );
  };

  // Calculate totals
  const totals = transactions.reduce(
    (acc, tx) => {
      const amount = parseFloat(tx.amount);
      if (tx.category === "receive" || tx.category === "income" || tx.category === "mining") {
        acc.received += amount;
      } else if (tx.category === "send") {
        acc.sent += amount;
      }
      acc.fees += parseFloat(tx.fee || "0");
      return acc;
    },
    { received: 0, sent: 0, fees: 0 }
  );

  return (
    <div className="min-h-screen bg-bg-base">
      <Nav />
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="flex flex-col lg:flex-row lg:justify-between lg:items-center gap-4 mb-8">
          <div>
            <h1 className="text-3xl font-bold text-text-primary">Transactions</h1>
            <p className="text-text-secondary mt-1">
              All transactions across your wallets
            </p>
          </div>

          <div className="flex flex-wrap gap-3 items-center">
            {/* Wallet filter */}
            <select
              value={filterWallet}
              onChange={(e) => setFilterWallet(e.target.value)}
              className="input text-sm py-2"
            >
              <option value="all">All Wallets</option>
              {wallets.map((w) => (
                <option key={w.id} value={w.id}>
                  {w.name}
                </option>
              ))}
            </select>

            {/* Category filter */}
            <select
              value={filterCategory}
              onChange={(e) => setFilterCategory(e.target.value as FilterCategory)}
              className="input text-sm py-2"
            >
              <option value="all">All Types</option>
              <option value="receive">Received</option>
              <option value="send">Sent</option>
              <option value="income">Income</option>
              <option value="internal">Internal</option>
            </select>

            {/* Sort order */}
            <select
              value={sortOrder}
              onChange={(e) => setSortOrder(e.target.value as "desc" | "asc")}
              className="input text-sm py-2"
            >
              <option value="desc">Newest First</option>
              <option value="asc">Oldest First</option>
            </select>

            {/* Detect Internal Transfers */}
            <button
              onClick={detectInternalTransfers}
              disabled={detectingInternal || linkMode}
              className="btn-secondary text-sm disabled:opacity-50"
              title="Scan all transactions to detect transfers between your own wallets"
            >
              {detectingInternal ? (
                <span className="flex items-center gap-2">
                  <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                  </svg>
                  Scanning...
                </span>
              ) : "Detect Internal"}
            </button>

            {/* Manual Link Mode Toggle */}
            {linkMode ? (
              <button
                onClick={exitLinkMode}
                className="px-4 py-2 text-sm bg-error/10 text-error border border-error/30 rounded-lg hover:bg-error/20 transition-colors"
              >
                Cancel Link
              </button>
            ) : (
              <button
                onClick={() => setLinkMode(true)}
                className="btn-secondary text-sm"
                title="Manually link two transactions as internal transfer"
              >
                Link Manual
              </button>
            )}
          </div>
        </div>

        {/* Detection Result Banner */}
        {detectResult && (
          <div className={`mb-4 px-4 py-3 rounded-xl text-sm flex items-center justify-between ${detectResult.startsWith("Error") ? "bg-error/10 border border-error/30 text-error" : "bg-info/10 border border-info/30 text-info"}`}>
            <span>{detectResult}</span>
            <button onClick={() => setDetectResult(null)} className="text-xs opacity-60 hover:opacity-100 transition-opacity">Dismiss</button>
          </div>
        )}

        {/* Linking Status Banner */}
        {linkingStatus && (
          <div className={`mb-4 px-4 py-3 rounded-xl text-sm flex items-center justify-between ${linkingStatus.startsWith("Error") || linkingStatus.startsWith("Failed") ? "bg-error/10 border border-error/30 text-error" : "bg-success/10 border border-success/30 text-success"}`}>
            <span>{linkingStatus}</span>
            <button onClick={() => setLinkingStatus(null)} className="text-xs opacity-60 hover:opacity-100 transition-opacity">Dismiss</button>
          </div>
        )}

        {/* Link Mode Instructions */}
        {linkMode && (
          <div className="mb-4 px-4 py-3 rounded-xl text-sm bg-warning/10 border border-warning/30 text-warning">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
                </svg>
                <div>
                  <span className="font-medium">Link Mode:</span>{" "}
                  Select two transactions to link as internal transfer pair.
                  {selectedForLink.length > 0 && (
                    <span className="ml-2 font-mono">
                      ({selectedForLink.length}/2 selected)
                    </span>
                  )}
                </div>
              </div>
              {selectedForLink.length === 2 && (
                <button
                  onClick={linkSelectedTransactions}
                  className="px-4 py-1.5 bg-warning text-bg-base rounded-lg text-sm font-medium hover:brightness-110 transition-all"
                >
                  Link Selected
                </button>
              )}
            </div>
          </div>
        )}

        {/* Summary Cards */}
        <div className="grid md:grid-cols-4 gap-6 mb-8">
          <div className="card">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 rounded-lg bg-bg-hover flex items-center justify-center">
                <svg className="w-5 h-5 text-text-tertiary" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 6.75h12M8.25 12h12m-12 5.25h12M3.75 6.75h.007v.008H3.75V6.75zm.375 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zM3.75 12h.007v.008H3.75V12zm.375 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm-.375 5.25h.007v.008H3.75v-.008zm.375 0a.375.375 0 11-.75 0 .375.375 0 01.75 0z" />
                </svg>
              </div>
              <p className="text-text-secondary text-sm font-medium">Total Transactions</p>
            </div>
            <p className="text-2xl font-bold text-text-primary">{transactions.length}</p>
          </div>
          <div className="card">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 rounded-lg bg-success/10 flex items-center justify-center">
                <svg className="w-5 h-5 text-success" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M19 14l-7 7m0 0l-7-7m7 7V3" />
                </svg>
              </div>
              <p className="text-text-secondary text-sm font-medium">Total Received</p>
            </div>
            <p className="text-2xl font-bold text-success font-mono">
              +{totals.received.toFixed(8)}
            </p>
          </div>
          <div className="card">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 rounded-lg bg-error/10 flex items-center justify-center">
                <svg className="w-5 h-5 text-error" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 10l7-7m0 0l7 7m-7-7v18" />
                </svg>
              </div>
              <p className="text-text-secondary text-sm font-medium">Total Sent</p>
            </div>
            <p className="text-2xl font-bold text-error font-mono">
              -{totals.sent.toFixed(8)}
            </p>
          </div>
          <div className="card">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 rounded-lg bg-bg-hover flex items-center justify-center">
                <svg className="w-5 h-5 text-text-muted" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 18.75a60.07 60.07 0 0115.797 2.101c.727.198 1.453-.342 1.453-1.096V18.75M3.75 4.5v.75A.75.75 0 013 6h-.75m0 0v-.375c0-.621.504-1.125 1.125-1.125H20.25M2.25 6v9m18-10.5v.75c0 .414.336.75.75.75h.75m-1.5-1.5h.375c.621 0 1.125.504 1.125 1.125v9.75c0 .621-.504 1.125-1.125 1.125h-.375m1.5-1.5H21a.75.75 0 00-.75.75v.75m0 0H3.75m0 0h-.375a1.125 1.125 0 01-1.125-1.125V15m1.5 1.5v-.75A.75.75 0 003 15h-.75M15 10.5a3 3 0 11-6 0 3 3 0 016 0zm3 0h.008v.008H18V10.5zm-12 0h.008v.008H6V10.5z" />
                </svg>
              </div>
              <p className="text-text-secondary text-sm font-medium">Total Fees</p>
            </div>
            <p className="text-2xl font-bold text-text-muted font-mono">
              -{totals.fees.toFixed(8)}
            </p>
          </div>
        </div>

        {/* Transactions Table */}
        <div className="card">
          {loading ? (
            <div className="text-center py-16">
              <div className="w-16 h-16 rounded-full bg-bg-hover flex items-center justify-center mx-auto mb-4 animate-pulse">
                <svg className="w-8 h-8 text-text-muted" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 6.75h12M8.25 12h12m-12 5.25h12M3.75 6.75h.007v.008H3.75V6.75zm.375 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zM3.75 12h.007v.008H3.75V12zm.375 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm-.375 5.25h.007v.008H3.75v-.008zm.375 0a.375.375 0 11-.75 0 .375.375 0 01.75 0z" />
                </svg>
              </div>
              <p className="text-text-secondary">Loading transactions...</p>
            </div>
          ) : transactions.length === 0 ? (
            <div className="text-center py-20">
              <div className="w-20 h-20 rounded-full bg-bg-hover flex items-center justify-center mx-auto mb-6">
                <svg className="w-10 h-10 text-text-muted" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 6.75h12M8.25 12h12m-12 5.25h12M3.75 6.75h.007v.008H3.75V6.75zm.375 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zM3.75 12h.007v.008H3.75V12zm.375 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm-.375 5.25h.007v.008H3.75v-.008zm.375 0a.375.375 0 11-.75 0 .375.375 0 01.75 0z" />
                </svg>
              </div>
              <h2 className="text-xl font-semibold mb-2 text-text-primary">No Transactions</h2>
              <p className="text-text-secondary">
                Sync your wallets to see transactions here
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="data-table">
                <thead>
                  <tr>
                    {linkMode && <th className="w-10"></th>}
                    <th>Date</th>
                    <th>Type</th>
                    <th>Amount</th>
                    <th>Wallet</th>
                    <th>Transaction ID</th>
                    <th>Block</th>
                    <th>Linked</th>
                  </tr>
                </thead>
                <tbody>
                  {transactions.map((tx) => (
                    <tr
                      key={tx.id}
                      className={linkMode && selectedForLink.includes(tx.id) ? "!bg-warning/10" : ""}
                    >
                      {linkMode && (
                        <td>
                          <button
                            onClick={() => toggleSelectForLink(tx.id)}
                            className={`w-5 h-5 rounded border-2 ${
                              selectedForLink.includes(tx.id)
                                ? "bg-warning border-warning"
                                : "border-border hover:border-warning"
                            } flex items-center justify-center transition-colors`}
                          >
                            {selectedForLink.includes(tx.id) && (
                              <svg className="w-3 h-3 text-bg-base" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                              </svg>
                            )}
                          </button>
                        </td>
                      )}
                      <td className="text-sm text-text-secondary">
                        {tx.block_timestamp
                          ? new Date(tx.block_timestamp).toLocaleDateString("en-US", {
                              year: "numeric",
                              month: "short",
                              day: "numeric",
                            })
                          : "Pending"}
                      </td>
                      <td className="relative">
                        {editingTx === tx.id ? (
                          <select
                            value={tx.category}
                            onChange={(e) => updateCategory(tx.id, e.target.value as TxCategory)}
                            onBlur={() => setEditingTx(null)}
                            autoFocus
                            className="input text-sm py-1 px-2"
                          >
                            {CATEGORY_OPTIONS.map((opt) => (
                              <option key={opt.value} value={opt.value}>
                                {opt.label}
                              </option>
                            ))}
                          </select>
                        ) : (
                          <button onClick={() => setEditingTx(tx.id)}>
                            {getCategoryBadge(tx.category)}
                          </button>
                        )}
                      </td>
                      <td className="font-mono text-sm">
                        {formatAmount(tx.amount, tx.category)}
                      </td>
                      <td className="text-sm text-text-tertiary">{tx.wallet_name}</td>
                      <td>
                        <a
                          href={`https://mempool.space/tx/${tx.txid}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="font-mono text-sm text-primary hover:text-primary-glow transition-colors"
                        >
                          {truncateTxid(tx.txid)}
                        </a>
                      </td>
                      <td className="text-text-muted text-sm font-mono">
                        {tx.block_height || "Pending"}
                      </td>
                      <td>
                        {tx.linked_transaction_id ? (
                          <div className="flex items-center gap-2">
                            <span className="badge badge-info">
                              Linked
                            </span>
                            <button
                              onClick={() => unlinkTransaction(tx.id)}
                              className="text-xs text-text-muted hover:text-error transition-colors"
                              title="Unlink this transaction pair"
                            >
                              unlink
                            </button>
                          </div>
                        ) : tx.is_internal_transfer ? (
                          <span className="badge">
                            Internal
                          </span>
                        ) : null}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
