"use client";

import { useState, useCallback } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import { db } from "@/lib/db";
import { useSettings } from "@/lib/db/hooks";
import { processAllWallets } from "@/lib/tax/lots";
import { getTaxSummary, getDisposedLots, formatAs8949CSV } from "@/lib/tax/reporting";
import type { TaxSummary } from "@/lib/tax/reporting";

export default function TaxPage() {
  const settings = useSettings();
  const [year, setYear] = useState(new Date().getFullYear());
  const [summary, setSummary] = useState<TaxSummary | null>(null);
  const [processing, setProcessing] = useState(false);
  const [processResult, setProcessResult] = useState<string | null>(null);

  const taxLotCount = useLiveQuery(() => db.taxLots.count()) ?? 0;
  const currentYear = new Date().getFullYear();
  const years = Array.from({ length: 10 }, (_, i) => currentYear - i);

  const handleProcess = useCallback(async () => {
    setProcessing(true);
    setProcessResult(null);
    try {
      const result = await processAllWallets(settings.cost_basis_method);
      setProcessResult(`Created ${result.created} lots, processed ${result.processed} disposals${result.errors.length ? `, ${result.errors.length} errors` : ""}`);
      const s = await getTaxSummary(year, settings.cost_basis_method);
      setSummary(s);
    } catch (err) {
      setProcessResult(`Error: ${err instanceof Error ? err.message : "Unknown"}`);
    } finally {
      setProcessing(false);
    }
  }, [settings.cost_basis_method, year]);

  const handleLoadSummary = useCallback(async () => {
    const s = await getTaxSummary(year, settings.cost_basis_method);
    setSummary(s);
  }, [year, settings.cost_basis_method]);

  const handleExport8949 = useCallback(async () => {
    const lots = await getDisposedLots(year);
    if (lots.length === 0) { alert("No disposals found for this year."); return; }
    const csv = formatAs8949CSV(lots);
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `form-8949-${year}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }, [year]);

  return (
    <div className="max-w-4xl mx-auto p-6">
      <h1 className="text-2xl font-bold mb-6">Tax Report</h1>

      {/* Controls */}
      <div className="flex gap-4 items-center mb-6 flex-wrap">
        <select
          value={year}
          onChange={(e) => setYear(parseInt(e.target.value))}
          className="px-3 py-2 bg-gray-800 rounded-lg border border-gray-600"
        >
          {years.map((y) => <option key={y} value={y}>{y}</option>)}
        </select>

        <span className="text-sm text-gray-400">Method: {settings.cost_basis_method}</span>

        <button
          onClick={handleProcess}
          disabled={processing}
          className="px-4 py-2 bg-[#FBDC7B] text-black font-semibold rounded-lg hover:bg-[#e5c86e] disabled:opacity-50 transition-colors"
        >
          {processing ? "Processing..." : "Process Tax Lots"}
        </button>

        <button
          onClick={handleLoadSummary}
          className="px-4 py-2 bg-gray-700 rounded-lg hover:bg-gray-600 transition-colors"
        >
          Load Summary
        </button>

        <button
          onClick={handleExport8949}
          className="px-4 py-2 bg-gray-700 rounded-lg hover:bg-gray-600 transition-colors"
        >
          Export Form 8949
        </button>
      </div>

      {processResult && (
        <div className="p-3 mb-6 bg-gray-800 rounded-lg text-sm">{processResult}</div>
      )}

      <p className="text-sm text-gray-400 mb-6">{taxLotCount} total tax lots in database</p>

      {/* Summary */}
      {summary && (
        <div className="space-y-6">
          {/* Short-Term */}
          <div className="p-4 bg-gray-800 rounded-lg">
            <h3 className="font-semibold mb-3">Short-Term Capital Gains (≤ 1 year)</h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
              <div><span className="text-gray-400">Proceeds</span><p className="font-mono">${summary.shortTerm.proceeds.toFixed(2)}</p></div>
              <div><span className="text-gray-400">Cost Basis</span><p className="font-mono">${summary.shortTerm.costBasis.toFixed(2)}</p></div>
              <div>
                <span className="text-gray-400">Gain/Loss</span>
                <p className={`font-mono ${summary.shortTerm.gainLoss >= 0 ? "text-green-400" : "text-red-400"}`}>
                  ${summary.shortTerm.gainLoss.toFixed(2)}
                </p>
              </div>
              <div><span className="text-gray-400">Disposals</span><p>{summary.shortTerm.transactionCount}</p></div>
            </div>
          </div>

          {/* Long-Term */}
          <div className="p-4 bg-gray-800 rounded-lg">
            <h3 className="font-semibold mb-3">Long-Term Capital Gains (&gt; 1 year)</h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
              <div><span className="text-gray-400">Proceeds</span><p className="font-mono">${summary.longTerm.proceeds.toFixed(2)}</p></div>
              <div><span className="text-gray-400">Cost Basis</span><p className="font-mono">${summary.longTerm.costBasis.toFixed(2)}</p></div>
              <div>
                <span className="text-gray-400">Gain/Loss</span>
                <p className={`font-mono ${summary.longTerm.gainLoss >= 0 ? "text-green-400" : "text-red-400"}`}>
                  ${summary.longTerm.gainLoss.toFixed(2)}
                </p>
              </div>
              <div><span className="text-gray-400">Disposals</span><p>{summary.longTerm.transactionCount}</p></div>
            </div>
          </div>

          {/* Income */}
          {summary.income.total > 0 && (
            <div className="p-4 bg-gray-800 rounded-lg">
              <h3 className="font-semibold mb-3">Income</h3>
              <p className="font-mono">${summary.income.total.toFixed(2)}</p>
              {Object.entries(summary.income.byType).map(([type, amount]) => (
                <p key={type} className="text-sm text-gray-400">{type}: ${(amount as number).toFixed(2)}</p>
              ))}
            </div>
          )}

          {/* Unrealized */}
          <div className="p-4 bg-gray-800 rounded-lg">
            <h3 className="font-semibold mb-3">Unrealized</h3>
            <p className="text-sm text-gray-400">Cost Basis: <span className="font-mono">${summary.unrealizedCostBasis.toFixed(2)}</span></p>
          </div>
        </div>
      )}
    </div>
  );
}
