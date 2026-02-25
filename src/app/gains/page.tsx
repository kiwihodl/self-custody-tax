"use client";

import { useLiveQuery } from "dexie-react-hooks";
import { db } from "@/lib/db";

export default function GainsPage() {
  const lots = useLiveQuery(() => db.taxLots.toArray()) ?? [];

  const undisposed = lots.filter((l) => !l.is_disposed);
  const disposed = lots.filter((l) => l.is_disposed);

  const totalCostBasis = undisposed.reduce((sum, l) => sum + l.cost_basis_usd, 0);
  const totalRealized = disposed.reduce((sum, l) => sum + (l.gain_loss_usd ?? 0), 0);

  return (
    <div className="max-w-6xl mx-auto p-6">
      <h1 className="text-2xl font-bold mb-6">Capital Gains</h1>

      <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-8">
        <div className="p-4 bg-gray-800 rounded-lg">
          <p className="text-sm text-gray-400">Unrealized Cost Basis</p>
          <p className="text-xl font-mono">${totalCostBasis.toLocaleString(undefined, { minimumFractionDigits: 2 })}</p>
        </div>
        <div className="p-4 bg-gray-800 rounded-lg">
          <p className="text-sm text-gray-400">Realized Gain/Loss</p>
          <p className={`text-xl font-mono ${totalRealized >= 0 ? "text-green-400" : "text-red-400"}`}>
            ${totalRealized.toLocaleString(undefined, { minimumFractionDigits: 2 })}
          </p>
        </div>
        <div className="p-4 bg-gray-800 rounded-lg">
          <p className="text-sm text-gray-400">Total Lots</p>
          <p className="text-xl">{undisposed.length} open / {disposed.length} closed</p>
        </div>
      </div>

      {/* Open lots */}
      <h2 className="text-lg font-semibold mb-3">Open Tax Lots</h2>
      {undisposed.length === 0 ? (
        <p className="text-gray-400 text-center py-6">No open tax lots.</p>
      ) : (
        <div className="overflow-x-auto mb-8">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-gray-400 border-b border-gray-700">
                <th className="pb-2">Acquired</th>
                <th className="pb-2">Amount</th>
                <th className="pb-2">Price</th>
                <th className="pb-2">Cost Basis</th>
                <th className="pb-2">Type</th>
              </tr>
            </thead>
            <tbody>
              {undisposed.slice(0, 50).map((lot) => (
                <tr key={lot.id} className="border-b border-gray-800">
                  <td className="py-2">{new Date(lot.acquisition_date).toLocaleDateString()}</td>
                  <td className="py-2 font-mono">{parseFloat(lot.amount).toFixed(8)}</td>
                  <td className="py-2 font-mono">${lot.acquisition_price_usd.toFixed(2)}</td>
                  <td className="py-2 font-mono">${lot.cost_basis_usd.toFixed(2)}</td>
                  <td className="py-2 text-gray-400">{lot.acquisition_type}</td>
                </tr>
              ))}
            </tbody>
          </table>
          {undisposed.length > 50 && <p className="text-sm text-gray-400 mt-2">Showing 50 of {undisposed.length}</p>}
        </div>
      )}

      {/* Closed lots */}
      <h2 className="text-lg font-semibold mb-3">Closed Tax Lots</h2>
      {disposed.length === 0 ? (
        <p className="text-gray-400 text-center py-6">No closed tax lots.</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-gray-400 border-b border-gray-700">
                <th className="pb-2">Acquired</th>
                <th className="pb-2">Sold</th>
                <th className="pb-2">Amount</th>
                <th className="pb-2">Cost Basis</th>
                <th className="pb-2">Proceeds</th>
                <th className="pb-2">Gain/Loss</th>
                <th className="pb-2">Term</th>
              </tr>
            </thead>
            <tbody>
              {disposed.slice(0, 50).map((lot) => (
                <tr key={lot.id} className="border-b border-gray-800">
                  <td className="py-2">{new Date(lot.acquisition_date).toLocaleDateString()}</td>
                  <td className="py-2">{lot.disposal_date ? new Date(lot.disposal_date).toLocaleDateString() : "—"}</td>
                  <td className="py-2 font-mono">{parseFloat(lot.amount).toFixed(8)}</td>
                  <td className="py-2 font-mono">${lot.cost_basis_usd.toFixed(2)}</td>
                  <td className="py-2 font-mono">${(lot.proceeds_usd ?? 0).toFixed(2)}</td>
                  <td className={`py-2 font-mono ${(lot.gain_loss_usd ?? 0) >= 0 ? "text-green-400" : "text-red-400"}`}>
                    ${(lot.gain_loss_usd ?? 0).toFixed(2)}
                  </td>
                  <td className="py-2 text-gray-400">{lot.is_long_term ? "Long" : "Short"}</td>
                </tr>
              ))}
            </tbody>
          </table>
          {disposed.length > 50 && <p className="text-sm text-gray-400 mt-2">Showing 50 of {disposed.length}</p>}
        </div>
      )}
    </div>
  );
}
