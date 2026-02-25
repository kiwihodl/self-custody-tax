"use client";

import { useLiveQuery } from "dexie-react-hooks";
import { db } from "@/lib/db";
import { useDashboardStats } from "@/lib/db/hooks";
import Link from "next/link";

export default function DashboardPage() {
  const wallets = useLiveQuery(() => db.wallets.where("is_deleted").equals(0).toArray()) ?? [];
  const recentTxs = useLiveQuery(() => db.transactions.orderBy("block_timestamp").reverse().limit(10).toArray()) ?? [];
  const stats = useDashboardStats();

  if (wallets.length === 0) {
    return (
      <div className="max-w-2xl mx-auto p-8 text-center">
        <h1 className="text-2xl font-bold mb-4">Welcome to Self Custody Tax</h1>
        <p className="text-gray-400 mb-6">
          Privacy-first Bitcoin tax tracking. All data stays on your device.
        </p>
        <Link
          href="/wallets"
          className="inline-block px-6 py-3 bg-[#FBDC7B] text-black font-semibold rounded-lg hover:bg-[#e5c86e] transition-colors"
        >
          Add Your First Wallet
        </Link>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto p-6">
      <h1 className="text-2xl font-bold mb-6">Dashboard</h1>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        <StatCard label="Wallets" value={stats?.walletCount ?? 0} />
        <StatCard label="Transactions" value={stats?.transactionCount ?? 0} />
        <StatCard label="Cost Basis" value={`$${(stats?.totalCostBasis ?? 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`} />
        <StatCard
          label="Realized Gain/Loss"
          value={`$${(stats?.totalGainLoss ?? 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
          color={(stats?.totalGainLoss ?? 0) >= 0 ? "text-green-400" : "text-red-400"}
        />
      </div>

      {/* Wallets */}
      <div className="mb-8">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-lg font-semibold">Wallets</h2>
          <Link href="/wallets" className="text-[#FBDC7B] text-sm hover:underline">Manage →</Link>
        </div>
        <div className="grid gap-3">
          {wallets.map((w) => (
            <Link key={w.id} href={`/wallets/detail?id=${w.id}`} className="block p-4 bg-gray-800 rounded-lg hover:bg-gray-700 transition-colors">
              <div className="flex justify-between items-center">
                <div>
                  <p className="font-medium">{w.name}</p>
                  <p className="text-sm text-gray-400">{w.type} · {w.network}</p>
                </div>
                <div className="text-right">
                  <p className="font-mono">{w.balance != null ? `${w.balance.toFixed(8)} BTC` : "—"}</p>
                  <p className="text-sm text-gray-400">
                    {w.last_synced_at ? `Synced ${new Date(w.last_synced_at).toLocaleDateString()}` : "Not synced"}
                  </p>
                </div>
              </div>
            </Link>
          ))}
        </div>
      </div>

      {/* Recent Transactions */}
      <div>
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-lg font-semibold">Recent Transactions</h2>
          <Link href="/transactions" className="text-[#FBDC7B] text-sm hover:underline">View All →</Link>
        </div>
        {recentTxs.length === 0 ? (
          <p className="text-gray-400 text-center py-8">No transactions yet. Sync a wallet to get started.</p>
        ) : (
          <div className="space-y-2">
            {recentTxs.map((tx) => (
              <div key={tx.id} className="p-3 bg-gray-800 rounded-lg flex justify-between items-center">
                <div>
                  <span className={`text-sm font-medium ${tx.category === "receive" ? "text-green-400" : tx.category === "send" ? "text-red-400" : "text-gray-400"}`}>
                    {tx.category.toUpperCase()}
                  </span>
                  <p className="text-xs text-gray-500 font-mono">{tx.txid.slice(0, 12)}...</p>
                </div>
                <div className="text-right">
                  <p className="font-mono text-sm">{parseFloat(tx.amount || "0").toFixed(8)} BTC</p>
                  <p className="text-xs text-gray-500">
                    {tx.block_timestamp ? new Date(tx.block_timestamp).toLocaleDateString() : "Pending"}
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function StatCard({ label, value, color }: { label: string; value: string | number; color?: string }) {
  return (
    <div className="p-4 bg-gray-800 rounded-lg">
      <p className="text-sm text-gray-400 mb-1">{label}</p>
      <p className={`text-xl font-semibold ${color || ""}`}>{value}</p>
    </div>
  );
}
