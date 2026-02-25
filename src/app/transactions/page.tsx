"use client";

import { useState } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import { db } from "@/lib/db";

export default function TransactionsPage() {
  const [walletFilter, setWalletFilter] = useState<number | "all">("all");
  const [categoryFilter, setCategoryFilter] = useState<string>("all");

  const wallets = useLiveQuery(() => db.wallets.where("is_deleted").equals(0).toArray()) ?? [];

  const transactions = useLiveQuery(() => {
    let query = db.transactions.toCollection();
    if (walletFilter !== "all") {
      query = db.transactions.where("wallet_id").equals(walletFilter);
    }
    return query.reverse().sortBy("block_timestamp");
  }, [walletFilter]) ?? [];

  const filtered = categoryFilter === "all"
    ? transactions
    : transactions.filter((tx) => tx.category === categoryFilter);

  const walletNames = new Map(wallets.map((w) => [w.id!, w.name]));

  return (
    <div className="max-w-6xl mx-auto p-6">
      <h1 className="text-2xl font-bold mb-6">Transactions</h1>

      {/* Filters */}
      <div className="flex gap-3 mb-6 flex-wrap">
        <select
          value={walletFilter}
          onChange={(e) => setWalletFilter(e.target.value === "all" ? "all" : parseInt(e.target.value))}
          className="px-3 py-2 bg-gray-800 rounded-lg border border-gray-600 text-sm"
        >
          <option value="all">All Wallets</option>
          {wallets.map((w) => (
            <option key={w.id} value={w.id}>{w.name}</option>
          ))}
        </select>

        <select
          value={categoryFilter}
          onChange={(e) => setCategoryFilter(e.target.value)}
          className="px-3 py-2 bg-gray-800 rounded-lg border border-gray-600 text-sm"
        >
          <option value="all">All Types</option>
          <option value="receive">Receive</option>
          <option value="send">Send</option>
          <option value="internal">Internal</option>
        </select>

        <span className="text-sm text-gray-400 self-center">
          {filtered.length} transaction{filtered.length !== 1 ? "s" : ""}
        </span>
      </div>

      {/* Table */}
      {filtered.length === 0 ? (
        <p className="text-center text-gray-400 py-12">No transactions found.</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-gray-400 border-b border-gray-700">
                <th className="pb-3">Date</th>
                <th className="pb-3">Type</th>
                <th className="pb-3">Amount</th>
                <th className="pb-3">Wallet</th>
                <th className="pb-3">TXID</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((tx) => (
                <tr key={tx.id} className="border-b border-gray-800 hover:bg-gray-800/50">
                  <td className="py-3">
                    {tx.block_timestamp ? new Date(tx.block_timestamp).toLocaleDateString() : "Pending"}
                  </td>
                  <td className="py-3">
                    <span className={`px-2 py-1 rounded text-xs font-medium ${
                      tx.category === "receive" ? "bg-green-900/30 text-green-400" :
                      tx.category === "send" ? "bg-red-900/30 text-red-400" :
                      "bg-gray-700 text-gray-400"
                    }`}>
                      {tx.category}
                    </span>
                  </td>
                  <td className="py-3 font-mono">{parseFloat(tx.amount || "0").toFixed(8)} BTC</td>
                  <td className="py-3 text-gray-400">{walletNames.get(tx.wallet_id) || "Unknown"}</td>
                  <td className="py-3">
                    <a
                      href={`https://mempool.space/tx/${tx.txid}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="font-mono text-xs text-[#FBDC7B] hover:underline"
                    >
                      {tx.txid.slice(0, 12)}...
                    </a>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
