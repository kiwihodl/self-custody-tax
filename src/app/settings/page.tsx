"use client";

import { useState, useCallback } from "react";
import { useSettings } from "@/lib/db/hooks";
import { setSetting, exportAllData, importAllData, clearAllData, getSetting } from "@/lib/db";
import type { UserSettings } from "@/types";

export default function SettingsPage() {
  const settings = useSettings();
  const [importing, setImporting] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [nodeUrl, setNodeUrl] = useState("");

  // Load node URL on mount
  useState(() => {
    getSetting("mempoolApi", "https://mempool.space/api").then(setNodeUrl);
  });

  const updateSetting = useCallback(async (key: string, value: string) => {
    const current = await getSetting<UserSettings>("userSettings", settings);
    await setSetting("userSettings", { ...current, [key]: value });
  }, [settings]);

  const handleExport = useCallback(async () => {
    const data = await exportAllData();
    const blob = new Blob([data], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `sct-backup-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
    setMessage("Data exported successfully.");
  }, []);

  const handleImport = useCallback(async () => {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = ".json";
    input.onchange = async (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (!file) return;
      setImporting(true);
      try {
        const text = await file.text();
        const result = await importAllData(text);
        setMessage(`Imported ${result.wallets} wallets, ${result.transactions} transactions, ${result.taxLots} tax lots.`);
      } catch (err) {
        setMessage(`Import failed: ${err instanceof Error ? err.message : "Unknown error"}`);
      } finally {
        setImporting(false);
      }
    };
    input.click();
  }, []);

  const handleClear = useCallback(async () => {
    if (!confirm("Delete ALL data? This cannot be undone.")) return;
    if (!confirm("Are you absolutely sure? Export a backup first!")) return;
    await clearAllData();
    setMessage("All data cleared.");
  }, []);

  const handleSaveNode = useCallback(async () => {
    await setSetting("mempoolApi", nodeUrl.trim() || "https://mempool.space/api");
    setMessage("Node URL saved.");
  }, [nodeUrl]);

  return (
    <div className="max-w-2xl mx-auto p-6">
      <h1 className="text-2xl font-bold mb-6">Settings</h1>

      {message && (
        <div className="p-3 mb-6 bg-gray-800 rounded-lg text-sm">
          {message}
          <button onClick={() => setMessage(null)} className="ml-2 text-gray-400 hover:text-white">✕</button>
        </div>
      )}

      {/* Tax Settings */}
      <section className="mb-8">
        <h2 className="text-lg font-semibold mb-4">Tax Settings</h2>

        <label className="block mb-4">
          <span className="text-sm text-gray-400">Cost Basis Method</span>
          <select
            value={settings.cost_basis_method}
            onChange={(e) => updateSetting("cost_basis_method", e.target.value)}
            className="w-full mt-1 px-3 py-2 bg-gray-800 rounded-lg border border-gray-600"
          >
            <option value="FIFO">FIFO (First In, First Out)</option>
            <option value="LIFO">LIFO (Last In, First Out)</option>
            <option value="HIFO">HIFO (Highest In, First Out)</option>
          </select>
        </label>

        <label className="block mb-4">
          <span className="text-sm text-gray-400">Currency</span>
          <select
            value={settings.default_currency}
            onChange={(e) => updateSetting("default_currency", e.target.value)}
            className="w-full mt-1 px-3 py-2 bg-gray-800 rounded-lg border border-gray-600"
          >
            <option value="USD">USD</option>
            <option value="AUD">AUD</option>
          </select>
        </label>
      </section>

      {/* Node Connection */}
      <section className="mb-8">
        <h2 className="text-lg font-semibold mb-4">Bitcoin Node</h2>
        <p className="text-sm text-gray-400 mb-3">
          Connect to your own node for enhanced privacy. Default: mempool.space
        </p>
        <div className="flex gap-2">
          <input
            value={nodeUrl}
            onChange={(e) => setNodeUrl(e.target.value)}
            placeholder="https://mempool.space/api"
            className="flex-1 px-3 py-2 bg-gray-800 rounded-lg border border-gray-600 font-mono text-sm"
          />
          <button onClick={handleSaveNode} className="px-4 py-2 bg-gray-700 rounded-lg hover:bg-gray-600 transition-colors">
            Save
          </button>
        </div>
      </section>

      {/* Data Management */}
      <section className="mb-8">
        <h2 className="text-lg font-semibold mb-4">Data Management</h2>
        <p className="text-sm text-gray-400 mb-4">
          All data is stored locally on your device. Export regularly for backup.
        </p>
        <div className="flex gap-3 flex-wrap">
          <button onClick={handleExport} className="px-4 py-2 bg-[#FBDC7B] text-black font-semibold rounded-lg hover:bg-[#e5c86e] transition-colors">
            Export Backup
          </button>
          <button onClick={handleImport} disabled={importing} className="px-4 py-2 bg-gray-700 rounded-lg hover:bg-gray-600 disabled:opacity-50 transition-colors">
            {importing ? "Importing..." : "Import Backup"}
          </button>
          <button onClick={handleClear} className="px-4 py-2 bg-red-900/30 text-red-400 rounded-lg hover:bg-red-900/50 transition-colors">
            Delete All Data
          </button>
        </div>
      </section>

      {/* About */}
      <section>
        <h2 className="text-lg font-semibold mb-4">About</h2>
        <div className="text-sm text-gray-400 space-y-1">
          <p>Self Custody Tax — Privacy-first Bitcoin tax tracker</p>
          <p>All data stored locally via IndexedDB. Nothing leaves your device.</p>
          <p>Open source (MIT License)</p>
          <p className="text-[#FBDC7B]">Part of the Bitcoin Butlers suite</p>
        </div>
      </section>
    </div>
  );
}
