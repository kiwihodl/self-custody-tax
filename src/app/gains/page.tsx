"use client";

import { useState, useEffect, useCallback } from "react";
import { Nav } from "@/components/nav";
import { TaxTabs } from "@/components/tax-tabs";

interface UnrealizedLot {
  id: string;
  walletId: string;
  walletName: string;
  amount: string;
  acquisitionDate: string;
  acquisitionPriceUsd: number;
  costBasisUsd: number;
  acquisitionType: string;
  currentValueUsd: number;
  unrealizedGainLoss: number;
  unrealizedGainLossPercent: number;
  holdingPeriod: number;
  isLongTerm: boolean;
  isCostBasisOverride?: boolean;
  costBasisNotes?: string;
}

interface UnrealizedGainsSummary {
  currentBtcPrice: number;
  totalBtc: number;
  totalCostBasis: number;
  totalCurrentValue: number;
  totalUnrealizedGainLoss: number;
  totalUnrealizedPercent: number;
  shortTermGainLoss: number;
  longTermGainLoss: number;
  lots: UnrealizedLot[];
}

type SortField = "date" | "amount" | "costBasis" | "gainLoss" | "percent";
type FilterTerm = "all" | "short" | "long";

export default function GainsPage() {
  const [data, setData] = useState<UnrealizedGainsSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [sortField, setSortField] = useState<SortField>("date");
  const [sortAsc, setSortAsc] = useState(true);
  const [filterTerm, setFilterTerm] = useState<FilterTerm>("all");
  const [editingLotId, setEditingLotId] = useState<string | null>(null);
  const [editingPrice, setEditingPrice] = useState<string>("");
  const [savingLotId, setSavingLotId] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const res = await fetch("/api/gains/unrealized");
      const json = await res.json();

      if (!res.ok) {
        setError(json.error || "Failed to fetch gains");
        return;
      }

      setData(json);
    } catch {
      setError("Failed to fetch unrealized gains");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleEditCostBasis = (lot: UnrealizedLot) => {
    setEditingLotId(lot.id);
    setEditingPrice(lot.acquisitionPriceUsd.toString());
  };

  const handleSaveCostBasis = async (lotId: string) => {
    const newPrice = parseFloat(editingPrice);
    if (isNaN(newPrice) || newPrice < 0) {
      setError("Invalid price value");
      return;
    }

    setSavingLotId(lotId);
    setError(null);

    try {
      const res = await fetch(`/api/tax-lots/${lotId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ acquisition_price_usd: newPrice }),
      });

      if (!res.ok) {
        const json = await res.json();
        setError(json.error || "Failed to update cost basis");
        return;
      }

      // Refresh data to get updated calculations
      await fetchData();
      setEditingLotId(null);
      setEditingPrice("");
    } catch {
      setError("Failed to update cost basis");
    } finally {
      setSavingLotId(null);
    }
  };

  const handleCancelEdit = () => {
    setEditingLotId(null);
    setEditingPrice("");
  };

  const handleKeyDown = (e: React.KeyboardEvent, lotId: string) => {
    if (e.key === "Enter") {
      handleSaveCostBasis(lotId);
    } else if (e.key === "Escape") {
      handleCancelEdit();
    }
  };

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

  const formatPercent = (value: number) => {
    const prefix = value >= 0 ? "+" : "";
    return `${prefix}${value.toFixed(2)}%`;
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  };

  const getGainLossColor = (value: number) => {
    if (value > 0) return "text-success";
    if (value < 0) return "text-error";
    return "text-text-secondary";
  };

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortAsc(!sortAsc);
    } else {
      setSortField(field);
      setSortAsc(true);
    }
  };

  const getSortedLots = () => {
    if (!data) return [];

    let filtered = data.lots;

    if (filterTerm === "short") {
      filtered = filtered.filter((l) => !l.isLongTerm);
    } else if (filterTerm === "long") {
      filtered = filtered.filter((l) => l.isLongTerm);
    }

    return [...filtered].sort((a, b) => {
      let cmp = 0;
      switch (sortField) {
        case "date":
          cmp = new Date(a.acquisitionDate).getTime() - new Date(b.acquisitionDate).getTime();
          break;
        case "amount":
          cmp = parseFloat(a.amount) - parseFloat(b.amount);
          break;
        case "costBasis":
          cmp = a.costBasisUsd - b.costBasisUsd;
          break;
        case "gainLoss":
          cmp = a.unrealizedGainLoss - b.unrealizedGainLoss;
          break;
        case "percent":
          cmp = a.unrealizedGainLossPercent - b.unrealizedGainLossPercent;
          break;
      }
      return sortAsc ? cmp : -cmp;
    });
  };

  const sortedLots = getSortedLots();

  return (
    <div className="min-h-screen bg-bg-base">
      <Nav />
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Tabs */}
        <TaxTabs />

        {/* Header */}
        <div className="flex flex-col lg:flex-row lg:justify-between lg:items-center gap-6 mb-8">
          <div>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-success/10 flex items-center justify-center">
                <svg className="w-5 h-5 text-success" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 18L9 11.25l4.306 4.307a11.95 11.95 0 015.814-5.519l2.74-1.22m0 0l-5.94-2.28m5.94 2.28l-2.28 5.941" />
                </svg>
              </div>
              <div>
                <h1 className="text-2xl font-bold text-text-primary">Unrealized Gains</h1>
                <p className="text-text-secondary text-sm">
                  Current holdings and potential gains/losses if sold today
                </p>
              </div>
            </div>
          </div>

          <div className="flex gap-3 items-center">
            {/* Term filter */}
            <select
              value={filterTerm}
              onChange={(e) => setFilterTerm(e.target.value as FilterTerm)}
              className="input pr-10 appearance-none cursor-pointer"
              style={{
                backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 24 24' stroke='%236B7280'%3E%3Cpath stroke-linecap='round' stroke-linejoin='round' stroke-width='2' d='M19 9l-7 7-7-7'%3E%3C/path%3E%3C/svg%3E")`,
                backgroundRepeat: "no-repeat",
                backgroundPosition: "right 0.75rem center",
                backgroundSize: "1rem",
              }}
            >
              <option value="all">All Holdings</option>
              <option value="short">Short-Term (&lt;1 year)</option>
              <option value="long">Long-Term (&gt;1 year)</option>
            </select>

            {/* Refresh */}
            <button
              onClick={fetchData}
              disabled={loading}
              className="btn-secondary disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
            >
              {loading ? (
                <>
                  <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                  </svg>
                  Loading...
                </>
              ) : (
                <>
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0l3.181 3.183a8.25 8.25 0 0013.803-3.7M4.031 9.865a8.25 8.25 0 0113.803-3.7l3.181 3.182m0-4.991v4.99" />
                  </svg>
                  Refresh
                </>
              )}
            </button>
          </div>
        </div>

        {error && (
          <div className="mb-6 p-4 rounded-xl bg-error/10 border border-error/30 text-error flex items-center gap-3">
            <svg className="w-5 h-5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
            </svg>
            {error}
          </div>
        )}

        {loading ? (
          <div className="card text-center py-16">
            <div className="w-12 h-12 rounded-full bg-bg-elevated flex items-center justify-center mx-auto mb-4 animate-pulse">
              <svg className="w-6 h-6 text-text-muted" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 18L9 11.25l4.306 4.307a11.95 11.95 0 015.814-5.519l2.74-1.22m0 0l-5.94-2.28m5.94 2.28l-2.28 5.941" />
              </svg>
            </div>
            <p className="text-text-secondary">Loading unrealized gains...</p>
          </div>
        ) : data ? (
          <>
            {/* Summary Cards */}
            <div className="grid grid-cols-2 lg:grid-cols-5 gap-4 mb-8">
              <div className="card group hover:border-primary/30 transition-colors">
                <div className="flex items-center gap-2 mb-2">
                  <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
                    <svg className="w-4 h-4 text-primary" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M12.5 3.5c-3.6 0-6.5 2.9-6.5 6.5 0 2.6 1.5 4.8 3.7 5.8v4.7c0 .6.4 1 1 1h3.5c.6 0 1-.4 1-1v-4.7c2.2-1 3.8-3.2 3.8-5.8 0-3.6-2.9-6.5-6.5-6.5zm.5 6.5c0 .6-.4 1-1 1s-1-.4-1-1 .4-1 1-1 1 .4 1 1z"/>
                    </svg>
                  </div>
                  <p className="text-text-secondary text-sm">BTC Price</p>
                </div>
                <p className="text-xl font-bold font-mono text-text-primary">
                  {formatCurrency(data.currentBtcPrice)}
                </p>
              </div>

              <div className="card group hover:border-info/30 transition-colors">
                <div className="flex items-center gap-2 mb-2">
                  <div className="w-8 h-8 rounded-lg bg-info/10 flex items-center justify-center">
                    <svg className="w-4 h-4 text-info" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M20.25 6.375c0 2.278-3.694 4.125-8.25 4.125S3.75 8.653 3.75 6.375m16.5 0c0-2.278-3.694-4.125-8.25-4.125S3.75 4.097 3.75 6.375m16.5 0v11.25c0 2.278-3.694 4.125-8.25 4.125s-8.25-1.847-8.25-4.125V6.375m16.5 0v3.75m-16.5-3.75v3.75m16.5 0v3.75C20.25 16.153 16.556 18 12 18s-8.25-1.847-8.25-4.125v-3.75m16.5 0c0 2.278-3.694 4.125-8.25 4.125s-8.25-1.847-8.25-4.125" />
                    </svg>
                  </div>
                  <p className="text-text-secondary text-sm">Holdings</p>
                </div>
                <p className="text-xl font-bold font-mono text-text-primary">
                  {formatBtc(data.totalBtc)} <span className="text-text-muted text-sm">BTC</span>
                </p>
              </div>

              <div className="card group hover:border-text-secondary/30 transition-colors">
                <div className="flex items-center gap-2 mb-2">
                  <div className="w-8 h-8 rounded-lg bg-text-muted/10 flex items-center justify-center">
                    <svg className="w-4 h-4 text-text-muted" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 18.75a60.07 60.07 0 0115.797 2.101c.727.198 1.453-.342 1.453-1.096V18.75M3.75 4.5v.75A.75.75 0 013 6h-.75m0 0v-.375c0-.621.504-1.125 1.125-1.125H20.25M2.25 6v9m18-10.5v.75c0 .414.336.75.75.75h.75m-1.5-1.5h.375c.621 0 1.125.504 1.125 1.125v9.75c0 .621-.504 1.125-1.125 1.125h-.375m1.5-1.5H21a.75.75 0 00-.75.75v.75m0 0H3.75m0 0h-.375a1.125 1.125 0 01-1.125-1.125V15m1.5 1.5v-.75A.75.75 0 003 15h-.75M15 10.5a3 3 0 11-6 0 3 3 0 016 0zm3 0h.008v.008H18V10.5zm-12 0h.008v.008H6V10.5z" />
                    </svg>
                  </div>
                  <p className="text-text-secondary text-sm">Cost Basis</p>
                </div>
                <p className="text-xl font-bold font-mono text-text-primary">
                  {formatCurrency(data.totalCostBasis)}
                </p>
              </div>

              <div className="card group hover:border-primary/30 transition-colors">
                <div className="flex items-center gap-2 mb-2">
                  <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
                    <svg className="w-4 h-4 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v12m-3-2.818l.879.659c1.171.879 3.07.879 4.242 0 1.172-.879 1.172-2.303 0-3.182C13.536 12.219 12.768 12 12 12c-.725 0-1.45-.22-2.003-.659-1.106-.879-1.106-2.303 0-3.182s2.9-.879 4.006 0l.415.33M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </div>
                  <p className="text-text-secondary text-sm">Current Value</p>
                </div>
                <p className="text-xl font-bold font-mono text-text-primary">
                  {formatCurrency(data.totalCurrentValue)}
                </p>
              </div>

              <div className="card col-span-2 lg:col-span-1 bg-primary/5 border-primary/30 group hover:border-primary/50 transition-colors">
                <div className="flex items-center gap-2 mb-2">
                  <div className="w-8 h-8 rounded-lg bg-success/10 flex items-center justify-center">
                    <svg className="w-4 h-4 text-success" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 18L9 11.25l4.306 4.307a11.95 11.95 0 015.814-5.519l2.74-1.22m0 0l-5.94-2.28m5.94 2.28l-2.28 5.941" />
                    </svg>
                  </div>
                  <p className="text-text-secondary text-sm">Unrealized</p>
                </div>
                <p className={`text-xl font-bold font-mono ${getGainLossColor(data.totalUnrealizedGainLoss)}`}>
                  {data.totalUnrealizedGainLoss >= 0 ? "+" : ""}
                  {formatCurrency(data.totalUnrealizedGainLoss)}
                </p>
                <p className={`text-sm font-mono ${getGainLossColor(data.totalUnrealizedGainLoss)}`}>
                  {formatPercent(data.totalUnrealizedPercent)}
                </p>
              </div>
            </div>

            {/* Short vs Long Term Breakdown */}
            <div className="grid md:grid-cols-2 gap-6 mb-8">
              <div className="card border-l-4 border-l-warning group hover:border-warning/30 transition-colors">
                <div className="flex justify-between items-start mb-3">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-warning/10 flex items-center justify-center">
                      <svg className="w-5 h-5 text-warning" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                    </div>
                    <div>
                      <p className="text-text-primary font-medium">Short-Term Unrealized</p>
                      <p className="text-xs text-text-muted">Holdings &lt; 1 year</p>
                    </div>
                  </div>
                  <span className="badge badge-warning">Ordinary Income Rate</span>
                </div>
                <p className={`text-2xl font-bold font-mono ${getGainLossColor(data.shortTermGainLoss)}`}>
                  {data.shortTermGainLoss >= 0 ? "+" : ""}
                  {formatCurrency(data.shortTermGainLoss)}
                </p>
              </div>

              <div className="card border-l-4 border-l-success group hover:border-success/30 transition-colors">
                <div className="flex justify-between items-start mb-3">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-success/10 flex items-center justify-center">
                      <svg className="w-5 h-5 text-success" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 012.25-2.25h13.5A2.25 2.25 0 0121 7.5v11.25m-18 0A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75m-18 0v-7.5A2.25 2.25 0 015.25 9h13.5A2.25 2.25 0 0121 11.25v7.5" />
                      </svg>
                    </div>
                    <div>
                      <p className="text-text-primary font-medium">Long-Term Unrealized</p>
                      <p className="text-xs text-text-muted">Holdings &gt; 1 year</p>
                    </div>
                  </div>
                  <span className="badge badge-success">Lower Cap Gains Rate</span>
                </div>
                <p className={`text-2xl font-bold font-mono ${getGainLossColor(data.longTermGainLoss)}`}>
                  {data.longTermGainLoss >= 0 ? "+" : ""}
                  {formatCurrency(data.longTermGainLoss)}
                </p>
              </div>
            </div>

            {/* Holdings Table */}
            <div className="card">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-10 h-10 rounded-lg bg-info/10 flex items-center justify-center">
                  <svg className="w-5 h-5 text-info" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 12h16.5m-16.5 3.75h16.5M3.75 19.5h16.5M5.625 4.5h12.75a1.875 1.875 0 010 3.75H5.625a1.875 1.875 0 010-3.75z" />
                  </svg>
                </div>
                <h2 className="text-lg font-semibold text-text-primary">Holdings by Tax Lot</h2>
              </div>

              {sortedLots.length === 0 ? (
                <div className="text-center py-16">
                  <div className="w-16 h-16 rounded-full bg-bg-elevated flex items-center justify-center mx-auto mb-4">
                    <svg className="w-8 h-8 text-text-muted" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M20.25 6.375c0 2.278-3.694 4.125-8.25 4.125S3.75 8.653 3.75 6.375m16.5 0c0-2.278-3.694-4.125-8.25-4.125S3.75 4.097 3.75 6.375m16.5 0v11.25c0 2.278-3.694 4.125-8.25 4.125s-8.25-1.847-8.25-4.125V6.375m16.5 0v3.75m-16.5-3.75v3.75m16.5 0v3.75C20.25 16.153 16.556 18 12 18s-8.25-1.847-8.25-4.125v-3.75m16.5 0c0 2.278-3.694 4.125-8.25 4.125s-8.25-1.847-8.25-4.125" />
                    </svg>
                  </div>
                  <p className="text-text-primary font-medium mb-1">No holdings found</p>
                  <p className="text-text-secondary text-sm">Sync your wallets and generate tax lots to see unrealized gains.</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="data-table">
                    <thead>
                      <tr>
                        <th
                          className="cursor-pointer hover:text-text-primary transition-colors"
                          onClick={() => handleSort("date")}
                        >
                          <span className="flex items-center gap-1">
                            Acquired
                            {sortField === "date" && (
                              <svg className={`w-3 h-3 transition-transform ${sortAsc ? "" : "rotate-180"}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                <path strokeLinecap="round" strokeLinejoin="round" d="M5 15l7-7 7 7" />
                              </svg>
                            )}
                          </span>
                        </th>
                        <th>Wallet</th>
                        <th>Type</th>
                        <th
                          className="text-right cursor-pointer hover:text-text-primary transition-colors"
                          onClick={() => handleSort("amount")}
                        >
                          <span className="flex items-center justify-end gap-1">
                            Amount
                            {sortField === "amount" && (
                              <svg className={`w-3 h-3 transition-transform ${sortAsc ? "" : "rotate-180"}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                <path strokeLinecap="round" strokeLinejoin="round" d="M5 15l7-7 7 7" />
                              </svg>
                            )}
                          </span>
                        </th>
                        <th
                          className="text-right cursor-pointer hover:text-text-primary transition-colors"
                          onClick={() => handleSort("costBasis")}
                        >
                          <span className="flex items-center justify-end gap-1">
                            Cost Basis
                            {sortField === "costBasis" && (
                              <svg className={`w-3 h-3 transition-transform ${sortAsc ? "" : "rotate-180"}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                <path strokeLinecap="round" strokeLinejoin="round" d="M5 15l7-7 7 7" />
                              </svg>
                            )}
                          </span>
                        </th>
                        <th className="text-right">Current Value</th>
                        <th
                          className="text-right cursor-pointer hover:text-text-primary transition-colors"
                          onClick={() => handleSort("gainLoss")}
                        >
                          <span className="flex items-center justify-end gap-1">
                            Gain/Loss
                            {sortField === "gainLoss" && (
                              <svg className={`w-3 h-3 transition-transform ${sortAsc ? "" : "rotate-180"}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                <path strokeLinecap="round" strokeLinejoin="round" d="M5 15l7-7 7 7" />
                              </svg>
                            )}
                          </span>
                        </th>
                        <th
                          className="text-right cursor-pointer hover:text-text-primary transition-colors"
                          onClick={() => handleSort("percent")}
                        >
                          <span className="flex items-center justify-end gap-1">
                            %
                            {sortField === "percent" && (
                              <svg className={`w-3 h-3 transition-transform ${sortAsc ? "" : "rotate-180"}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                <path strokeLinecap="round" strokeLinejoin="round" d="M5 15l7-7 7 7" />
                              </svg>
                            )}
                          </span>
                        </th>
                        <th className="text-center">Term</th>
                      </tr>
                    </thead>
                    <tbody>
                      {sortedLots.map((lot) => (
                        <tr key={lot.id}>
                          <td className="text-text-primary">
                            {formatDate(lot.acquisitionDate)}
                          </td>
                          <td className="text-text-secondary">
                            {lot.walletName}
                          </td>
                          <td>
                            <span className="badge capitalize">
                              {lot.acquisitionType}
                            </span>
                          </td>
                          <td className="text-right font-mono text-text-primary">
                            {formatBtc(lot.amount)}
                          </td>
                          <td className="text-right">
                            {editingLotId === lot.id ? (
                              <div className="flex items-center justify-end gap-1">
                                <span className="text-text-muted">$</span>
                                <input
                                  type="number"
                                  value={editingPrice}
                                  onChange={(e) => setEditingPrice(e.target.value)}
                                  onKeyDown={(e) => handleKeyDown(e, lot.id)}
                                  className="input w-24 text-right font-mono py-1 px-2"
                                  autoFocus
                                  disabled={savingLotId === lot.id}
                                />
                                <button
                                  onClick={() => handleSaveCostBasis(lot.id)}
                                  disabled={savingLotId === lot.id}
                                  className="p-1 text-success hover:bg-success/10 rounded"
                                  title="Save"
                                >
                                  {savingLotId === lot.id ? (
                                    <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                                    </svg>
                                  ) : (
                                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                                    </svg>
                                  )}
                                </button>
                                <button
                                  onClick={handleCancelEdit}
                                  disabled={savingLotId === lot.id}
                                  className="p-1 text-error hover:bg-error/10 rounded"
                                  title="Cancel"
                                >
                                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                                  </svg>
                                </button>
                              </div>
                            ) : (
                              <button
                                onClick={() => handleEditCostBasis(lot)}
                                className="group inline-flex items-center gap-1 font-mono text-text-secondary hover:text-text-primary transition-colors"
                                title="Click to edit cost basis"
                              >
                                {formatCurrency(lot.costBasisUsd)}
                                {lot.isCostBasisOverride && (
                                  <span className="badge badge-warning text-xs py-0">Override</span>
                                )}
                                <svg className="w-3 h-3 opacity-0 group-hover:opacity-50 transition-opacity" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                  <path strokeLinecap="round" strokeLinejoin="round" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                                </svg>
                              </button>
                            )}
                          </td>
                          <td className="text-right font-mono text-text-primary">
                            {formatCurrency(lot.currentValueUsd)}
                          </td>
                          <td className={`text-right font-mono ${getGainLossColor(lot.unrealizedGainLoss)}`}>
                            {lot.unrealizedGainLoss >= 0 ? "+" : ""}
                            {formatCurrency(lot.unrealizedGainLoss)}
                          </td>
                          <td className={`text-right font-mono ${getGainLossColor(lot.unrealizedGainLossPercent)}`}>
                            {formatPercent(lot.unrealizedGainLossPercent)}
                          </td>
                          <td className="text-center">
                            <span className={`badge ${lot.isLongTerm ? "badge-success" : "badge-warning"}`}>
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
              )}
            </div>
          </>
        ) : null}
      </main>
    </div>
  );
}
