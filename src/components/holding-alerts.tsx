"use client";

import { useState, useEffect, useCallback } from "react";

interface ApproachingLot {
  id: string;
  walletId: string;
  walletName: string;
  amount: string;
  acquisitionDate: string;
  daysUntilLongTerm: number;
  longTermDate: string;
  costBasisUsd: number;
  currentValueUsd: number;
  unrealizedGainLoss: number;
}

interface HoldingAlertsData {
  currentBtcPrice: number;
  approachingLots: ApproachingLot[];
  recentlyLongTerm: ApproachingLot[]; // Became long-term in last 7 days
  totalApproachingValue: number;
}

interface HoldingAlertsProps {
  daysThreshold?: number; // Default 30 days
  compact?: boolean; // For dashboard widget
  limit?: number; // Limit number of items shown
}

export function HoldingAlerts({
  daysThreshold = 30,
  compact = false,
  limit,
}: HoldingAlertsProps) {
  const [data, setData] = useState<HoldingAlertsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const res = await fetch(`/api/tax/holding-alerts?threshold=${daysThreshold}`);
      const json = await res.json();

      if (!res.ok) {
        setError(json.error || "Failed to fetch holding alerts");
        return;
      }

      setData(json);
    } catch {
      setError("Failed to fetch holding alerts");
    } finally {
      setLoading(false);
    }
  }, [daysThreshold]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
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

  if (loading) {
    if (compact) {
      return (
        <div className="animate-pulse flex items-center gap-2 py-2">
          <div className="w-6 h-6 bg-bg-elevated rounded-lg"></div>
          <div className="h-4 bg-bg-elevated rounded w-32"></div>
        </div>
      );
    }
    return (
      <div className="card text-center py-8">
        <div className="w-8 h-8 rounded-full bg-bg-elevated flex items-center justify-center mx-auto mb-3 animate-pulse">
          <svg
            className="w-4 h-4 text-text-muted"
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
        <p className="text-text-secondary text-sm">Loading alerts...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className={`${compact ? "py-2" : "card"} text-error text-sm`}>
        {error}
      </div>
    );
  }

  if (!data || data.approachingLots.length === 0) {
    if (compact) {
      return (
        <div className="flex items-center gap-2 py-2 text-text-muted text-sm">
          <svg
            className="w-4 h-4"
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
          No lots approaching long-term
        </div>
      );
    }
    return (
      <div className="card text-center py-8">
        <div className="w-12 h-12 rounded-full bg-success/10 flex items-center justify-center mx-auto mb-3">
          <svg
            className="w-6 h-6 text-success"
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
        <p className="text-text-primary font-medium mb-1">All Clear</p>
        <p className="text-text-secondary text-sm">
          No holdings approaching long-term status in the next {daysThreshold} days.
        </p>
      </div>
    );
  }

  const displayLots = limit
    ? data.approachingLots.slice(0, limit)
    : data.approachingLots;

  // Compact mode for dashboard widget
  if (compact) {
    return (
      <div className="space-y-2">
        {displayLots.map((lot) => (
          <div
            key={lot.id}
            className="flex items-center justify-between p-2 bg-bg-elevated rounded-lg"
          >
            <div className="flex items-center gap-2">
              <div
                className={`w-6 h-6 rounded-lg flex items-center justify-center ${
                  lot.daysUntilLongTerm <= 7
                    ? "bg-success/10"
                    : "bg-warning/10"
                }`}
              >
                <svg
                  className={`w-3 h-3 ${
                    lot.daysUntilLongTerm <= 7
                      ? "text-success"
                      : "text-warning"
                  }`}
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={2}
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z"
                  />
                </svg>
              </div>
              <div>
                <p className="text-xs font-mono text-text-primary">
                  {formatBtc(lot.amount)} BTC
                </p>
                <p className="text-xs text-text-muted">{lot.walletName}</p>
              </div>
            </div>
            <div className="text-right">
              <p
                className={`text-xs font-medium ${
                  lot.daysUntilLongTerm <= 7
                    ? "text-success"
                    : "text-warning"
                }`}
              >
                {lot.daysUntilLongTerm}d
              </p>
            </div>
          </div>
        ))}
        {data.approachingLots.length > (limit || 0) && limit && (
          <a
            href="/gains"
            className="text-xs text-primary hover:underline block text-center mt-2"
          >
            View all {data.approachingLots.length} lots
          </a>
        )}
      </div>
    );
  }

  // Full card mode
  return (
    <div className="card">
      <div className="flex items-center gap-3 mb-4">
        <div className="w-10 h-10 rounded-lg bg-warning/10 flex items-center justify-center">
          <svg
            className="w-5 h-5 text-warning"
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
        <div>
          <h2 className="text-lg font-semibold text-text-primary">
            Approaching Long-Term Status
          </h2>
          <p className="text-xs text-text-muted">
            Holdings becoming long-term eligible in the next {daysThreshold} days
          </p>
        </div>
      </div>

      {/* Info banner about transaction date vs purchase date */}
      <div className="p-3 bg-info/5 border border-info/20 rounded-lg mb-4">
        <div className="flex items-start gap-2">
          <svg
            className="w-4 h-4 text-info flex-shrink-0 mt-0.5"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2}
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M11.25 11.25l.041-.02a.75.75 0 011.063.852l-.708 2.836a.75.75 0 001.063.853l.041-.021M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-9-3.75h.008v.008H12V8.25z"
            />
          </svg>
          <div className="text-xs text-text-secondary">
            <p className="font-medium text-info mb-1">
              Transaction Date vs Purchase Date
            </p>
            <p>
              If you purchased on an exchange before transferring to self-custody,
              your actual holding period may be longer. The dates shown are based
              on on-chain transaction dates. You can edit acquisition dates in the{" "}
              <a href="/gains" className="text-primary hover:underline">
                unrealized gains
              </a>{" "}
              section.
            </p>
          </div>
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="data-table text-sm">
          <thead>
            <tr>
              <th>Wallet</th>
              <th className="text-right">Amount</th>
              <th>Acquired</th>
              <th>Long-Term Date</th>
              <th className="text-center">Days Left</th>
              <th className="text-right">Value</th>
              <th className="text-right">Gain/Loss</th>
            </tr>
          </thead>
          <tbody>
            {displayLots.map((lot) => (
              <tr key={lot.id}>
                <td className="text-text-secondary">{lot.walletName}</td>
                <td className="text-right font-mono text-text-primary">
                  {formatBtc(lot.amount)}
                </td>
                <td className="text-text-secondary">
                  {formatDate(lot.acquisitionDate)}
                </td>
                <td className="text-text-primary">
                  {formatDate(lot.longTermDate)}
                </td>
                <td className="text-center">
                  <span
                    className={`badge ${
                      lot.daysUntilLongTerm <= 7
                        ? "badge-success"
                        : lot.daysUntilLongTerm <= 14
                        ? "badge-warning"
                        : "bg-bg-elevated text-text-secondary"
                    }`}
                  >
                    {lot.daysUntilLongTerm}d
                  </span>
                </td>
                <td className="text-right font-mono text-text-primary">
                  {formatCurrency(lot.currentValueUsd)}
                </td>
                <td
                  className={`text-right font-mono ${
                    lot.unrealizedGainLoss >= 0 ? "text-success" : "text-error"
                  }`}
                >
                  {lot.unrealizedGainLoss >= 0 ? "+" : ""}
                  {formatCurrency(lot.unrealizedGainLoss)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Summary */}
      <div className="mt-4 pt-4 border-t border-border flex justify-between items-center text-sm">
        <span className="text-text-secondary">
          {data.approachingLots.length} lot
          {data.approachingLots.length !== 1 ? "s" : ""} approaching long-term
        </span>
        <span className="font-mono text-text-primary">
          {formatCurrency(data.totalApproachingValue)} total value
        </span>
      </div>
    </div>
  );
}
