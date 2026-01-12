"use client";

import { useState, useEffect, useCallback } from "react";

interface HarvestLot {
  id: string;
  walletId: string;
  walletName: string;
  amount: string;
  acquisitionDate: string;
  costBasisUsd: number;
  currentValueUsd: number;
  unrealizedLoss: number;
  holdingPeriod: number;
  isLongTerm: boolean;
}

interface HarvestableLotsResponse {
  currentBtcPrice: number;
  realizedGainsYtd: number;
  shortTermRealizedGains: number;
  longTermRealizedGains: number;
  harvestableLots: HarvestLot[];
  totalHarvestableLoss: number;
}

interface SimulationResult {
  selectedLots: HarvestLot[];
  summary: {
    totalLossToHarvest: number;
    shortTermLosses: number;
    longTermLosses: number;
    estimatedTaxSavings: number;
    realizedGainsYtd: number;
    netGainLossAfterHarvest: number;
  };
  washSaleWarning: {
    show: boolean;
    message: string;
    educationalNote: string;
  };
}

// Tax bracket options
const TAX_BRACKETS = [
  { label: "10%", value: 0.10 },
  { label: "12%", value: 0.12 },
  { label: "22%", value: 0.22 },
  { label: "24% (Default)", value: 0.24 },
  { label: "32%", value: 0.32 },
  { label: "35%", value: 0.35 },
  { label: "37%", value: 0.37 },
];

export function HarvestSimulation() {
  const [data, setData] = useState<HarvestableLotsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedLots, setSelectedLots] = useState<Set<string>>(new Set());
  const [taxBracket, setTaxBracket] = useState(0.24);
  const [simulating, setSimulating] = useState(false);
  const [simulation, setSimulation] = useState<SimulationResult | null>(null);

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const res = await fetch("/api/tax/harvest-simulation");
      const json = await res.json();

      if (!res.ok) {
        setError(json.error || "Failed to fetch harvestable lots");
        return;
      }

      setData(json);
    } catch {
      setError("Failed to fetch harvestable lots");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(value);
  };

  const formatBtc = (value: string | number) => {
    const num = typeof value === "string" ? parseFloat(value) : value;
    return num.toFixed(8);
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  };

  const handleToggleLot = (lotId: string) => {
    const newSelected = new Set(selectedLots);
    if (newSelected.has(lotId)) {
      newSelected.delete(lotId);
    } else {
      newSelected.add(lotId);
    }
    setSelectedLots(newSelected);
    setSimulation(null); // Clear simulation when selection changes
  };

  const handleSelectAll = () => {
    if (!data) return;

    if (selectedLots.size === data.harvestableLots.length) {
      setSelectedLots(new Set());
    } else {
      setSelectedLots(new Set(data.harvestableLots.map((l) => l.id)));
    }
    setSimulation(null);
  };

  const runSimulation = async () => {
    if (selectedLots.size === 0 || !data) return;

    setSimulating(true);
    setError(null);

    try {
      const res = await fetch("/api/tax/harvest-simulation", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          lotIds: Array.from(selectedLots),
          taxBracket,
          realizedGainsYtd: data.realizedGainsYtd,
        }),
      });

      const json = await res.json();

      if (!res.ok) {
        setError(json.error || "Simulation failed");
        return;
      }

      setSimulation(json);
    } catch {
      setError("Simulation failed");
    } finally {
      setSimulating(false);
    }
  };

  // Calculate selected totals
  const selectedTotal = data
    ? data.harvestableLots
        .filter((l) => selectedLots.has(l.id))
        .reduce((sum, l) => sum + l.unrealizedLoss, 0)
    : 0;

  if (loading) {
    return (
      <div className="card text-center py-16">
        <div className="w-12 h-12 rounded-full bg-bg-elevated flex items-center justify-center mx-auto mb-4 animate-pulse">
          <svg
            className="w-6 h-6 text-text-muted"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={1.5}
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z"
            />
          </svg>
        </div>
        <p className="text-text-secondary">Loading tax-loss harvesting data...</p>
      </div>
    );
  }

  if (!data || data.harvestableLots.length === 0) {
    return (
      <div className="card text-center py-16">
        <div className="w-16 h-16 rounded-full bg-success/10 flex items-center justify-center mx-auto mb-4">
          <svg
            className="w-8 h-8 text-success"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={1.5}
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
            />
          </svg>
        </div>
        <p className="text-text-primary font-medium mb-1">No Harvestable Losses</p>
        <p className="text-text-secondary text-sm max-w-md mx-auto">
          All your holdings are currently in profit. Tax-loss harvesting is only
          applicable when you have positions with unrealized losses.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {error && (
        <div className="p-4 rounded-xl bg-error/10 border border-error/30 text-error flex items-center gap-3">
          <svg
            className="w-5 h-5 flex-shrink-0"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2}
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z"
            />
          </svg>
          {error}
        </div>
      )}

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="card border-l-4 border-l-primary">
          <p className="text-text-secondary text-sm mb-1">BTC Price</p>
          <p className="text-xl font-bold font-mono text-text-primary">
            {formatCurrency(data.currentBtcPrice)}
          </p>
        </div>

        <div className="card border-l-4 border-l-success">
          <p className="text-text-secondary text-sm mb-1">Realized Gains YTD</p>
          <p className="text-xl font-bold font-mono text-success">
            {formatCurrency(data.realizedGainsYtd)}
          </p>
          <div className="text-xs text-text-muted mt-1">
            ST: {formatCurrency(data.shortTermRealizedGains)} | LT:{" "}
            {formatCurrency(data.longTermRealizedGains)}
          </div>
        </div>

        <div className="card border-l-4 border-l-error">
          <p className="text-text-secondary text-sm mb-1">Total Harvestable</p>
          <p className="text-xl font-bold font-mono text-error">
            {formatCurrency(data.totalHarvestableLoss)}
          </p>
          <div className="text-xs text-text-muted mt-1">
            {data.harvestableLots.length} lots with losses
          </div>
        </div>

        <div className="card border-l-4 border-l-warning bg-warning/5">
          <p className="text-text-secondary text-sm mb-1">Selected to Harvest</p>
          <p className="text-xl font-bold font-mono text-warning">
            {formatCurrency(selectedTotal)}
          </p>
          <div className="text-xs text-text-muted mt-1">
            {selectedLots.size} lots selected
          </div>
        </div>
      </div>

      {/* Tax Bracket Selector */}
      <div className="card">
        <div className="flex flex-col sm:flex-row sm:items-center gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-info/10 flex items-center justify-center">
              <svg
                className="w-5 h-5 text-info"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={1.5}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M15.75 15.75V18m-7.5-6.75h.008v.008H8.25v-.008zm0 2.25h.008v.008H8.25V13.5zm0 2.25h.008v.008H8.25v-.008zm0 2.25h.008v.008H8.25V18zm2.498-6.75h.007v.008h-.007v-.008zm0 2.25h.007v.008h-.007V13.5zm0 2.25h.007v.008h-.007v-.008zm0 2.25h.007v.008h-.007V18zm2.504-6.75h.008v.008h-.008v-.008zm0 2.25h.008v.008h-.008V13.5zm0 2.25h.008v.008h-.008v-.008zm0 2.25h.008v.008h-.008V18zm2.498-6.75h.008v.008h-.008v-.008zm0 2.25h.008v.008h-.008V13.5zM8.25 6h7.5v2.25h-7.5V6zM12 2.25c-1.892 0-3.758.11-5.593.322C5.307 2.7 4.5 3.65 4.5 4.757V19.5a2.25 2.25 0 002.25 2.25h10.5a2.25 2.25 0 002.25-2.25V4.757c0-1.108-.806-2.057-1.907-2.185A48.507 48.507 0 0012 2.25z"
                />
              </svg>
            </div>
            <div>
              <p className="text-text-primary font-medium">Your Tax Bracket</p>
              <p className="text-xs text-text-muted">
                Used to estimate tax savings from harvesting losses
              </p>
            </div>
          </div>

          <div className="flex-1" />

          <select
            value={taxBracket}
            onChange={(e) => {
              setTaxBracket(parseFloat(e.target.value));
              setSimulation(null);
            }}
            className="input w-48 pr-10 appearance-none cursor-pointer"
            style={{
              backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 24 24' stroke='%236B7280'%3E%3Cpath stroke-linecap='round' stroke-linejoin='round' stroke-width='2' d='M19 9l-7 7-7-7'%3E%3C/path%3E%3C/svg%3E")`,
              backgroundRepeat: "no-repeat",
              backgroundPosition: "right 0.75rem center",
              backgroundSize: "1rem",
            }}
          >
            {TAX_BRACKETS.map((b) => (
              <option key={b.value} value={b.value}>
                {b.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Harvestable Lots Table */}
      <div className="card">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-error/10 flex items-center justify-center">
              <svg
                className="w-5 h-5 text-error"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={1.5}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M2.25 6L9 12.75l4.286-4.286a11.948 11.948 0 014.306 6.43l.776 2.898m0 0l3.182-5.511m-3.182 5.51l-5.511-3.181"
                />
              </svg>
            </div>
            <h2 className="text-lg font-semibold text-text-primary">
              Lots with Unrealized Losses
            </h2>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={handleSelectAll}
              className="btn-secondary text-sm"
            >
              {selectedLots.size === data.harvestableLots.length
                ? "Deselect All"
                : "Select All"}
            </button>
            <button
              onClick={runSimulation}
              disabled={selectedLots.size === 0 || simulating}
              className="btn-primary flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {simulating ? (
                <>
                  <svg
                    className="animate-spin h-4 w-4"
                    fill="none"
                    viewBox="0 0 24 24"
                  >
                    <circle
                      className="opacity-25"
                      cx="12"
                      cy="12"
                      r="10"
                      stroke="currentColor"
                      strokeWidth="4"
                    />
                    <path
                      className="opacity-75"
                      fill="currentColor"
                      d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                    />
                  </svg>
                  Simulating...
                </>
              ) : (
                <>
                  <svg
                    className="w-4 h-4"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    strokeWidth={2}
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M15.75 15.75V18m-7.5-6.75h.008v.008H8.25v-.008zm0 2.25h.008v.008H8.25V13.5zm0 2.25h.008v.008H8.25v-.008zm0 2.25h.008v.008H8.25V18zm2.498-6.75h.007v.008h-.007v-.008zm0 2.25h.007v.008h-.007V13.5zm0 2.25h.007v.008h-.007v-.008zm0 2.25h.007v.008h-.007V18zm2.504-6.75h.008v.008h-.008v-.008zm0 2.25h.008v.008h-.008V13.5zm0 2.25h.008v.008h-.008v-.008zm0 2.25h.008v.008h-.008V18zm2.498-6.75h.008v.008h-.008v-.008zm0 2.25h.008v.008h-.008V13.5zM8.25 6h7.5v2.25h-7.5V6zM12 2.25c-1.892 0-3.758.11-5.593.322C5.307 2.7 4.5 3.65 4.5 4.757V19.5a2.25 2.25 0 002.25 2.25h10.5a2.25 2.25 0 002.25-2.25V4.757c0-1.108-.806-2.057-1.907-2.185A48.507 48.507 0 0012 2.25z"
                    />
                  </svg>
                  Simulate Harvest
                </>
              )}
            </button>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="data-table">
            <thead>
              <tr>
                <th className="w-12">
                  <input
                    type="checkbox"
                    checked={selectedLots.size === data.harvestableLots.length}
                    onChange={handleSelectAll}
                    className="w-4 h-4 rounded border-border bg-bg-elevated text-primary focus:ring-primary/50"
                  />
                </th>
                <th>Acquired</th>
                <th>Wallet</th>
                <th className="text-right">Amount</th>
                <th className="text-right">Cost Basis</th>
                <th className="text-right">Current Value</th>
                <th className="text-right">Unrealized Loss</th>
                <th className="text-center">Term</th>
              </tr>
            </thead>
            <tbody>
              {data.harvestableLots.map((lot) => (
                <tr
                  key={lot.id}
                  className={`cursor-pointer transition-colors ${
                    selectedLots.has(lot.id)
                      ? "bg-primary/5 hover:bg-primary/10"
                      : "hover:bg-bg-elevated"
                  }`}
                  onClick={() => handleToggleLot(lot.id)}
                >
                  <td onClick={(e) => e.stopPropagation()}>
                    <input
                      type="checkbox"
                      checked={selectedLots.has(lot.id)}
                      onChange={() => handleToggleLot(lot.id)}
                      className="w-4 h-4 rounded border-border bg-bg-elevated text-primary focus:ring-primary/50"
                    />
                  </td>
                  <td className="text-text-primary">
                    {formatDate(lot.acquisitionDate)}
                  </td>
                  <td className="text-text-secondary">{lot.walletName}</td>
                  <td className="text-right font-mono text-text-primary">
                    {formatBtc(lot.amount)}
                  </td>
                  <td className="text-right font-mono text-text-secondary">
                    {formatCurrency(lot.costBasisUsd)}
                  </td>
                  <td className="text-right font-mono text-text-primary">
                    {formatCurrency(lot.currentValueUsd)}
                  </td>
                  <td className="text-right font-mono text-error">
                    {formatCurrency(lot.unrealizedLoss)}
                  </td>
                  <td className="text-center">
                    <span
                      className={`badge ${
                        lot.isLongTerm ? "badge-success" : "badge-warning"
                      }`}
                    >
                      {lot.isLongTerm ? "Long" : "Short"}
                    </span>
                    <div className="text-xs text-text-muted mt-1">
                      {lot.holdingPeriod}d
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Simulation Results */}
      {simulation && (
        <div className="card border-2 border-primary/30 bg-primary/5">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
              <svg
                className="w-5 h-5 text-primary"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={1.5}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M9 12.75L11.25 15 15 9.75m-3-7.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285z"
                />
              </svg>
            </div>
            <h2 className="text-lg font-semibold text-text-primary">
              Harvest Simulation Results
            </h2>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
            <div className="p-4 rounded-lg bg-bg-base">
              <p className="text-text-secondary text-sm mb-1">Short-Term Losses</p>
              <p className="text-lg font-bold font-mono text-error">
                {formatCurrency(simulation.summary.shortTermLosses)}
              </p>
            </div>
            <div className="p-4 rounded-lg bg-bg-base">
              <p className="text-text-secondary text-sm mb-1">Long-Term Losses</p>
              <p className="text-lg font-bold font-mono text-error">
                {formatCurrency(simulation.summary.longTermLosses)}
              </p>
            </div>
            <div className="p-4 rounded-lg bg-bg-base">
              <p className="text-text-secondary text-sm mb-1">Total to Harvest</p>
              <p className="text-lg font-bold font-mono text-error">
                {formatCurrency(simulation.summary.totalLossToHarvest)}
              </p>
            </div>
            <div className="p-4 rounded-lg bg-success/10 border border-success/30">
              <p className="text-success text-sm mb-1">Est. Tax Savings</p>
              <p className="text-lg font-bold font-mono text-success">
                {formatCurrency(simulation.summary.estimatedTaxSavings)}
              </p>
            </div>
          </div>

          {/* Net Position */}
          <div className="p-4 rounded-lg bg-bg-base mb-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-text-secondary text-sm">YTD Realized Gains</p>
                <p className="text-lg font-bold font-mono text-success">
                  {formatCurrency(simulation.summary.realizedGainsYtd)}
                </p>
              </div>
              <div className="text-text-muted text-2xl">+</div>
              <div>
                <p className="text-text-secondary text-sm">Harvested Losses</p>
                <p className="text-lg font-bold font-mono text-error">
                  {formatCurrency(simulation.summary.totalLossToHarvest)}
                </p>
              </div>
              <div className="text-text-muted text-2xl">=</div>
              <div>
                <p className="text-text-secondary text-sm">Net After Harvest</p>
                <p
                  className={`text-lg font-bold font-mono ${
                    simulation.summary.netGainLossAfterHarvest >= 0
                      ? "text-success"
                      : "text-error"
                  }`}
                >
                  {formatCurrency(simulation.summary.netGainLossAfterHarvest)}
                </p>
              </div>
            </div>
          </div>

          {/* Wash Sale Warning */}
          {simulation.washSaleWarning.show && (
            <div className="p-4 rounded-lg bg-warning/10 border border-warning/30">
              <div className="flex items-start gap-3">
                <svg
                  className="w-5 h-5 text-warning flex-shrink-0 mt-0.5"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={2}
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z"
                  />
                </svg>
                <div>
                  <p className="text-warning font-medium mb-1">
                    {simulation.washSaleWarning.message}
                  </p>
                  <p className="text-text-secondary text-sm">
                    {simulation.washSaleWarning.educationalNote}
                  </p>
                </div>
              </div>
            </div>
          )}

          <div className="mt-6 text-center text-text-muted text-sm">
            This is a simulation only. To actually harvest these losses, you would
            need to sell these positions through your wallet or exchange.
          </div>
        </div>
      )}
    </div>
  );
}
