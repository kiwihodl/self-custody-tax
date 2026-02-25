"use client";

import { useState } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import { db, type DBWallet } from "@/lib/db";
import { syncWalletClient, type SyncProgress } from "@/lib/bitcoin/clientSync";
import Link from "next/link";

export default function WalletsPage() {
  const wallets = useLiveQuery(() => db.wallets.where("is_deleted").equals(0).toArray()) ?? [];
  const [showAdd, setShowAdd] = useState(false);
  const [syncingId, setSyncingId] = useState<number | null>(null);
  const [syncProgress, setSyncProgress] = useState<SyncProgress | null>(null);

  const handleSync = async (walletId: number) => {
    setSyncingId(walletId);
    setSyncProgress(null);
    try {
      await syncWalletClient(walletId, (progress) => setSyncProgress(progress));
    } finally {
      setSyncingId(null);
      setSyncProgress(null);
    }
  };

  const handleDelete = async (walletId: number) => {
    if (!confirm("Delete this wallet? Transaction data will be preserved.")) return;
    await db.wallets.update(walletId, { is_deleted: true, updated_at: new Date().toISOString() });
  };

  return (
    <div className="max-w-4xl mx-auto p-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Wallets</h1>
        <button
          onClick={() => setShowAdd(true)}
          className="px-4 py-2 bg-[#FBDC7B] text-black font-semibold rounded-lg hover:bg-[#e5c86e] transition-colors"
        >
          + Add Wallet
        </button>
      </div>

      {wallets.length === 0 ? (
        <div className="text-center py-12 text-gray-400">
          <p className="mb-4">No wallets yet.</p>
          <button onClick={() => setShowAdd(true)} className="text-[#FBDC7B] hover:underline">
            Add your first wallet →
          </button>
        </div>
      ) : (
        <div className="space-y-3">
          {wallets.map((w) => (
            <div key={w.id} className="p-4 bg-gray-800 rounded-lg">
              <div className="flex justify-between items-start">
                <Link href={`/wallets/${w.id}`} className="hover:text-[#FBDC7B] transition-colors">
                  <h3 className="font-semibold">{w.name}</h3>
                  <p className="text-sm text-gray-400">{w.type} · {w.network}</p>
                  {w.xpub && <p className="text-xs text-gray-500 font-mono mt-1">{w.xpub.slice(0, 20)}...</p>}
                  {w.address && <p className="text-xs text-gray-500 font-mono mt-1">{w.address.slice(0, 20)}...</p>}
                </Link>
                <div className="text-right">
                  <p className="font-mono">{w.balance != null ? `${w.balance.toFixed(8)} BTC` : "—"}</p>
                  <p className="text-xs text-gray-500">
                    {w.last_synced_at ? `Synced ${new Date(w.last_synced_at).toLocaleDateString()}` : "Never synced"}
                  </p>
                </div>
              </div>
              <div className="flex gap-2 mt-3">
                <button
                  onClick={() => handleSync(w.id!)}
                  disabled={syncingId === w.id}
                  className="px-3 py-1 text-sm bg-gray-700 rounded hover:bg-gray-600 disabled:opacity-50 transition-colors"
                >
                  {syncingId === w.id ? (syncProgress?.message || "Syncing...") : "Sync"}
                </button>
                <button
                  onClick={() => handleDelete(w.id!)}
                  className="px-3 py-1 text-sm text-red-400 bg-gray-700 rounded hover:bg-gray-600 transition-colors"
                >
                  Delete
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {showAdd && <AddWalletModal onClose={() => setShowAdd(false)} />}
    </div>
  );
}

function AddWalletModal({ onClose }: { onClose: () => void }) {
  const [name, setName] = useState("");
  const [type, setType] = useState<"single_sig" | "exchange">("single_sig");
  const [xpub, setXpub] = useState("");
  const [address, setAddress] = useState("");
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    if (!name.trim()) return;
    setSaving(true);
    const now = new Date().toISOString();
    await db.wallets.add({
      name: name.trim(),
      type,
      network: "bitcoin",
      xpub: xpub.trim() || undefined,
      address: address.trim() || undefined,
      balance: null,
      last_synced_at: null,
      sync_status: "idle",
      is_deleted: false,
      created_at: now,
      updated_at: now,
    });
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4" onClick={onClose}>
      <div className="bg-gray-800 rounded-xl p-6 w-full max-w-md" onClick={(e) => e.stopPropagation()}>
        <h2 className="text-xl font-bold mb-4">Add Wallet</h2>

        <label className="block mb-3">
          <span className="text-sm text-gray-400">Name</span>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="w-full mt-1 px-3 py-2 bg-gray-700 rounded-lg border border-gray-600 focus:border-[#FBDC7B] focus:outline-none"
            placeholder="My Cold Storage"
          />
        </label>

        <label className="block mb-3">
          <span className="text-sm text-gray-400">Type</span>
          <select
            value={type}
            onChange={(e) => setType(e.target.value as "single_sig" | "exchange")}
            className="w-full mt-1 px-3 py-2 bg-gray-700 rounded-lg border border-gray-600 focus:border-[#FBDC7B] focus:outline-none"
          >
            <option value="single_sig">Self-Custody Wallet</option>
            <option value="exchange">Exchange Account</option>
          </select>
        </label>

        {type === "single_sig" && (
          <>
            <label className="block mb-3">
              <span className="text-sm text-gray-400">xpub / ypub / zpub (for HD wallets)</span>
              <input
                value={xpub}
                onChange={(e) => setXpub(e.target.value)}
                className="w-full mt-1 px-3 py-2 bg-gray-700 rounded-lg border border-gray-600 focus:border-[#FBDC7B] focus:outline-none font-mono text-sm"
                placeholder="xpub6..."
              />
            </label>
            <label className="block mb-3">
              <span className="text-sm text-gray-400">Or single address</span>
              <input
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                className="w-full mt-1 px-3 py-2 bg-gray-700 rounded-lg border border-gray-600 focus:border-[#FBDC7B] focus:outline-none font-mono text-sm"
                placeholder="bc1q..."
              />
            </label>
          </>
        )}

        <div className="flex gap-3 mt-6">
          <button
            onClick={handleSave}
            disabled={!name.trim() || saving}
            className="flex-1 py-2 bg-[#FBDC7B] text-black font-semibold rounded-lg hover:bg-[#e5c86e] disabled:opacity-50 transition-colors"
          >
            {saving ? "Saving..." : "Add Wallet"}
          </button>
          <button onClick={onClose} className="px-4 py-2 bg-gray-700 rounded-lg hover:bg-gray-600 transition-colors">
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}
