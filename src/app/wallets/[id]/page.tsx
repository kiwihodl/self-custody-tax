"use client";

import { useState, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import { useLiveQuery } from "dexie-react-hooks";
import { db } from "@/lib/db";
import { syncWalletClient, type SyncProgress } from "@/lib/bitcoin/clientSync";
import { importCSV, detectExchange } from "@/lib/import";
import Link from "next/link";

export default function WalletDetailPage() {
  const { id } = useParams();
  const walletId = parseInt(id as string);
  const router = useRouter();

  const wallet = useLiveQuery(() => db.wallets.get(walletId), [walletId]);
  const transactions = useLiveQuery(
    () => db.transactions.where("wallet_id").equals(walletId).reverse().sortBy("block_timestamp"),
    [walletId]
  ) ?? [];

  const [syncing, setSyncing] = useState(false);
  const [syncProgress, setSyncProgress] = useState<SyncProgress | null>(null);
  const [importMsg, setImportMsg] = useState<string | null>(null);

  const handleSync = useCallback(async () => {
    setSyncing(true);
    try {
      const result = await syncWalletClient(walletId, (p) => setSyncProgress(p));
      if (result.success) {
        setImportMsg(`Synced: ${result.newTransactions} new transactions, balance: ${result.balance} BTC`);
      } else {
        setImportMsg(`Sync failed: ${result.error}`);
      }
    } finally {
      setSyncing(false);
      setSyncProgress(null);
    }
  }, [walletId]);

  const handleCSVImport = useCallback(() => {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = ".csv";
    input.onchange = async (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (!file) return;
      const text = await file.text();
      const exchange = detectExchange(text);
      if (!exchange) {
        setImportMsg("Could not detect exchange format.");
        return;
      }
      const result = await importCSV(walletId, text, exchange);
      setImportMsg(`Imported ${result.transactionsImported} transactions from ${exchange}${result.transactionsSkipped ? `, ${result.transactionsSkipped} skipped` : ""}`);
    };
    input.click();
  }, [walletId]);

  if (!wallet) {
    return <div className="p-6 text-center text-gray-400">Wallet not found</div>;
  }

  return (
    <div className="max-w-4xl mx-auto p-6">
      <Link href="/wallets" className="text-[#FBDC7B] text-sm hover:underline mb-4 block">← Back to Wallets</Link>

      <div className="flex justify-between items-start mb-6">
        <div>
          <h1 className="text-2xl font-bold">{wallet.name}</h1>
          <p className="text-gray-400">{wallet.type} · {wallet.network}</p>
          {wallet.xpub && <p className="text-xs text-gray-500 font-mono mt-1">{wallet.xpub.slice(0, 30)}...</p>}
          {wallet.address && <p className="text-xs text-gray-500 font-mono mt-1">{wallet.address}</p>}
        </div>
        <div className="text-right">
          <p className="text-2xl font-mono">{wallet.balance != null ? `${wallet.balance.toFixed(8)} BTC` : "—"}</p>
          <p className="text-sm text-gray-400">
            {wallet.last_synced_at ? `Last synced: ${new Date(wallet.last_synced_at).toLocaleString()}` : "Never synced"}
          </p>
        </div>
      </div>

      {/* Actions */}
      <div className="flex gap-3 mb-6 flex-wrap">
        <button
          onClick={handleSync}
          disabled={syncing || wallet.type === "exchange"}
          className="px-4 py-2 bg-[#FBDC7B] text-black font-semibold rounded-lg hover:bg-[#e5c86e] disabled:opacity-50 transition-colors"
        >
          {syncing ? (syncProgress?.message || "Syncing...") : "Sync from Blockchain"}
        </button>
        <button
          onClick={handleCSVImport}
          className="px-4 py-2 bg-gray-700 rounded-lg hover:bg-gray-600 transition-colors"
        >
          Import CSV
        </button>
      </div>

      {importMsg && (
        <div className="p-3 mb-6 bg-gray-800 rounded-lg text-sm">
          {importMsg}
          <button onClick={() => setImportMsg(null)} className="ml-2 text-gray-400">✕</button>
        </div>
      )}

      {/* Transactions */}
      <h2 className="text-lg font-semibold mb-3">Transactions ({transactions.length})</h2>
      {transactions.length === 0 ? (
        <p className="text-gray-400 text-center py-8">No transactions yet. Sync or import to get started.</p>
      ) : (
        <div className="space-y-2">
          {transactions.slice(0, 100).map((tx) => (
            <div key={tx.id} className="p-3 bg-gray-800 rounded-lg flex justify-between items-center">
              <div>
                <span className={`text-sm font-medium ${
                  tx.category === "receive" ? "text-green-400" :
                  tx.category === "send" ? "text-red-400" : "text-gray-400"
                }`}>
                  {tx.category.toUpperCase()}
                </span>
                <a
                  href={`https://mempool.space/tx/${tx.txid}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="block text-xs text-gray-500 font-mono hover:text-[#FBDC7B]"
                >
                  {tx.txid.slice(0, 16)}...
                </a>
              </div>
              <div className="text-right">
                <p className="font-mono text-sm">{parseFloat(tx.amount || "0").toFixed(8)} BTC</p>
                <p className="text-xs text-gray-500">
                  {tx.block_timestamp ? new Date(tx.block_timestamp).toLocaleDateString() : "Pending"}
                </p>
              </div>
            </div>
          ))}
          {transactions.length > 100 && <p className="text-sm text-gray-400 text-center">Showing 100 of {transactions.length}</p>}
        </div>
      )}
    </div>
  );
}
