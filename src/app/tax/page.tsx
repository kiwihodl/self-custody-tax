"use client";

import { useState, useEffect, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import { Nav } from "@/components/nav";
import type { TaxSummary } from "@/lib/tax/reporting";
import type { TaxLot } from "@/lib/tax/lots";

export default function TaxPage() {
  const [summary, setSummary] = useState<TaxSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [year, setYear] = useState(2026);
  const [method, setMethod] = useState<"FIFO" | "LIFO" | "HIFO">("FIFO");
  const [message, setMessage] = useState<{ type: "success" | "error" | "info"; text: string } | null>(null);
  const supabase = createClient();

  const fetchSummary = useCallback(async () => {
    setLoading(true);
    setMessage(null);

    try {
      const { getTaxSummary } = await import("@/lib/tax/reporting");
      const { data: { user } } = await supabase.auth.getUser();

      if (!user) {
        setMessage({ type: "error", text: "Please log in to view tax summary" });
        setLoading(false);
        return;
      }

      const data = await getTaxSummary(supabase, user.id, year, method);
      setSummary(data);
    } catch (err) {
      console.error("Failed to fetch tax summary:", err);
      setMessage({ type: "error", text: "Failed to load tax summary" });
    } finally {
      setLoading(false);
    }
  }, [supabase, year, method]);

  useEffect(() => {
    fetchSummary();
  }, [fetchSummary]);

  const handleProcessTaxLots = async () => {
    setProcessing(true);
    setMessage(null);

    try {
      const { processAllWallets } = await import("@/lib/tax/clientProcessing");
      const { data: { user } } = await supabase.auth.getUser();

      if (!user) {
        setMessage({ type: "error", text: "Please log in to process tax lots" });
        return;
      }

      const result = await processAllWallets(supabase, user.id, method);

      if (result.errors.length > 0) {
        console.warn("Processing warnings:", result.errors);
      }

      setMessage({ type: "success", text: `Created ${result.created} tax lots, processed ${result.processed} disposals` });
      fetchSummary();
    } catch (err) {
      console.error("Failed to process tax lots:", err);
      setMessage({ type: "error", text: "Failed to process tax lots" });
    } finally {
      setProcessing(false);
    }
  };

  const downloadCSV = (content: string, filename: string) => {
    const blob = new Blob([content], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const fetchDisposedLots = async (): Promise<TaxLot[]> => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return [];

    const startDate = `${year}-01-01T00:00:00Z`;
    const endDate = `${year}-12-31T23:59:59Z`;

    const { data, error } = await supabase
      .from("tax_lots")
      .select("*")
      .eq("user_id", user.id)
      .eq("is_disposed", true)
      .gte("disposal_date", startDate)
      .lte("disposal_date", endDate)
      .order("disposal_date", { ascending: true });

    if (error) {
      console.error("Failed to fetch disposed lots:", error.message);
      return [];
    }

    return (data || []) as TaxLot[];
  };

  const handleExport8949 = async () => {
    setExporting(true);
    setMessage(null);

    try {
      const lots = await fetchDisposedLots();

      if (lots.length === 0) {
        setMessage({ type: "info", text: "No disposed tax lots found for this year" });
        return;
      }

      const { formatAs8949CSV } = await import("@/lib/tax/reporting");
      const csv = formatAs8949CSV(lots);
      downloadCSV(csv, `form-8949-${year}.csv`);
      setMessage({ type: "success", text: `Exported ${lots.length} transactions to Form 8949 CSV` });
    } catch (err) {
      console.error("Failed to export 8949:", err);
      setMessage({ type: "error", text: "Failed to export Form 8949" });
    } finally {
      setExporting(false);
    }
  };

  const handleExportCSV = async () => {
    setExporting(true);
    setMessage(null);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        setMessage({ type: "error", text: "Please log in to export" });
        return;
      }

      const startDate = `${year}-01-01T00:00:00Z`;
      const endDate = `${year}-12-31T23:59:59Z`;

      const { data: lots, error } = await supabase
        .from("tax_lots")
        .select("*")
        .eq("user_id", user.id)
        .or(`and(acquisition_date.gte.${startDate},acquisition_date.lte.${endDate}),and(disposal_date.gte.${startDate},disposal_date.lte.${endDate})`)
        .order("acquisition_date", { ascending: true });

      if (error) {
        setMessage({ type: "error", text: `Failed to fetch tax lots: ${error.message}` });
        return;
      }

      if (!lots || lots.length === 0) {
        setMessage({ type: "info", text: "No tax lots found for this year" });
        return;
      }

      const { formatTransactionsCSV } = await import("@/lib/tax/reporting");
      const csv = formatTransactionsCSV(lots as TaxLot[]);
      downloadCSV(csv, `satsat-tax-lots-${year}.csv`);
      setMessage({ type: "success", text: `Exported ${lots.length} tax lots to CSV` });
    } catch (err) {
      console.error("Failed to export CSV:", err);
      setMessage({ type: "error", text: "Failed to export CSV" });
    } finally {
      setExporting(false);
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
      minimumFractionDigits: 2,
    }).format(amount);
  };

  const formatGainLoss = (amount: number) => {
    const formatted = formatCurrency(Math.abs(amount));
    if (amount >= 0) {
      return <span className="text-success">+{formatted}</span>;
    }
    return <span className="text-error">-{formatted}</span>;
  };

  return (
    <div className="min-h-screen bg-bg-base">
      <Nav />
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="flex flex-col lg:flex-row lg:justify-between lg:items-center gap-6 mb-8">
          <div>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-warning/10 flex items-center justify-center">
                <svg className="w-5 h-5 text-warning" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 14.25l6-6m4.5-3.493V21.75l-3.75-1.5-3.75 1.5-3.75-1.5-3.75 1.5V4.757c0-1.108.806-2.057 1.907-2.185a48.507 48.507 0 0111.186 0c1.1.128 1.907 1.077 1.907 2.185zM9.75 9h.008v.008H9.75V9zm.375 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm4.125 4.5h.008v.008h-.008V13.5zm.375 0a.375.375 0 11-.75 0 .375.375 0 01.75 0z" />
                </svg>
              </div>
              <div>
                <h1 className="text-2xl font-bold text-text-primary">Tax Center</h1>
                <p className="text-text-secondary text-sm">
                  Capital gains, income, and tax lot tracking
                </p>
              </div>
            </div>
          </div>

          <div className="flex flex-wrap gap-3 items-center">
            {/* Year selector */}
            <select
              value={year}
              onChange={(e) => setYear(parseInt(e.target.value))}
              className="input pr-10 appearance-none cursor-pointer"
              style={{
                backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 24 24' stroke='%236B7280'%3E%3Cpath stroke-linecap='round' stroke-linejoin='round' stroke-width='2' d='M19 9l-7 7-7-7'%3E%3C/path%3E%3C/svg%3E")`,
                backgroundRepeat: "no-repeat",
                backgroundPosition: "right 0.75rem center",
                backgroundSize: "1rem",
              }}
            >
              {[2026, 2025, 2024, 2023, 2022, 2021].map((y) => (
                <option key={y} value={y}>{y}</option>
              ))}
            </select>

            {/* Method selector */}
            <select
              value={method}
              onChange={(e) => setMethod(e.target.value as "FIFO" | "LIFO" | "HIFO")}
              className="input pr-10 appearance-none cursor-pointer"
              style={{
                backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 24 24' stroke='%236B7280'%3E%3Cpath stroke-linecap='round' stroke-linejoin='round' stroke-width='2' d='M19 9l-7 7-7-7'%3E%3C/path%3E%3C/svg%3E")`,
                backgroundRepeat: "no-repeat",
                backgroundPosition: "right 0.75rem center",
                backgroundSize: "1rem",
              }}
            >
              <option value="FIFO">FIFO</option>
              <option value="LIFO">LIFO</option>
              <option value="HIFO">HIFO</option>
            </select>

            {/* Process button */}
            <button
              onClick={handleProcessTaxLots}
              disabled={processing}
              className="btn-primary disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
            >
              {processing ? (
                <>
                  <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                  </svg>
                  Processing...
                </>
              ) : (
                <>
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                  </svg>
                  Process Tax Lots
                </>
              )}
            </button>
          </div>
        </div>

        {/* Message */}
        {message && (
          <div className={`mb-6 p-4 rounded-xl flex items-center gap-3 ${
            message.type === "success" ? "bg-success/10 border border-success/30 text-success" :
            message.type === "error" ? "bg-error/10 border border-error/30 text-error" :
            "bg-info/10 border border-info/30 text-info"
          }`}>
            {message.type === "success" && (
              <svg className="w-5 h-5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            )}
            {message.type === "error" && (
              <svg className="w-5 h-5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
              </svg>
            )}
            {message.type === "info" && (
              <svg className="w-5 h-5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M11.25 11.25l.041-.02a.75.75 0 011.063.852l-.708 2.836a.75.75 0 001.063.853l.041-.021M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-9-3.75h.008v.008H12V8.25z" />
              </svg>
            )}
            <span>{message.text}</span>
          </div>
        )}

        {/* Loading */}
        {loading ? (
          <div className="card text-center py-16">
            <div className="w-12 h-12 rounded-full bg-bg-elevated flex items-center justify-center mx-auto mb-4 animate-pulse">
              <svg className="w-6 h-6 text-text-muted" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 14.25l6-6m4.5-3.493V21.75l-3.75-1.5-3.75 1.5-3.75-1.5-3.75 1.5V4.757c0-1.108.806-2.057 1.907-2.185a48.507 48.507 0 0111.186 0c1.1.128 1.907 1.077 1.907 2.185z" />
              </svg>
            </div>
            <p className="text-text-secondary">Loading tax summary...</p>
          </div>
        ) : !summary ? (
          <div className="card text-center py-16">
            <div className="w-16 h-16 rounded-full bg-bg-elevated flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-text-muted" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 18.75a60.07 60.07 0 0115.797 2.101c.727.198 1.453-.342 1.453-1.096V18.75M3.75 4.5v.75A.75.75 0 013 6h-.75m0 0v-.375c0-.621.504-1.125 1.125-1.125H20.25M2.25 6v9m18-10.5v.75c0 .414.336.75.75.75h.75m-1.5-1.5h.375c.621 0 1.125.504 1.125 1.125v9.75c0 .621-.504 1.125-1.125 1.125h-.375m1.5-1.5H21a.75.75 0 00-.75.75v.75m0 0H3.75m0 0h-.375a1.125 1.125 0 01-1.125-1.125V15m1.5 1.5v-.75A.75.75 0 003 15h-.75M15 10.5a3 3 0 11-6 0 3 3 0 016 0zm3 0h.008v.008H18V10.5zm-12 0h.008v.008H6V10.5z" />
              </svg>
            </div>
            <h2 className="text-xl font-semibold text-text-primary mb-2">No Tax Data</h2>
            <p className="text-text-secondary mb-6">
              Sync your wallets and click &quot;Process Tax Lots&quot; to calculate gains
            </p>
          </div>
        ) : (
          <>
            {/* Summary Cards */}
            <div className="grid md:grid-cols-3 gap-6 mb-8">
              {/* Short-term */}
              <div className="card group hover:border-warning/30 transition-colors">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-10 h-10 rounded-lg bg-warning/10 flex items-center justify-center">
                    <svg className="w-5 h-5 text-warning" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </div>
                  <h3 className="text-lg font-semibold text-text-primary">Short-Term Gains</h3>
                </div>
                <div className="space-y-3">
                  <div className="flex justify-between">
                    <span className="text-text-secondary">Proceeds</span>
                    <span className="text-text-primary font-mono">{formatCurrency(summary.shortTerm.proceeds)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-text-secondary">Cost Basis</span>
                    <span className="text-text-primary font-mono">{formatCurrency(summary.shortTerm.costBasis)}</span>
                  </div>
                  <div className="flex justify-between border-t border-border pt-3">
                    <span className="font-medium text-text-primary">Gain/Loss</span>
                    <span className="font-medium font-mono">
                      {formatGainLoss(summary.shortTerm.gainLoss)}
                    </span>
                  </div>
                  <div className="text-xs text-text-muted">
                    {summary.shortTerm.transactionCount} transactions
                  </div>
                </div>
              </div>

              {/* Long-term */}
              <div className="card group hover:border-success/30 transition-colors">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-10 h-10 rounded-lg bg-success/10 flex items-center justify-center">
                    <svg className="w-5 h-5 text-success" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 012.25-2.25h13.5A2.25 2.25 0 0121 7.5v11.25m-18 0A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75m-18 0v-7.5A2.25 2.25 0 015.25 9h13.5A2.25 2.25 0 0121 11.25v7.5" />
                    </svg>
                  </div>
                  <h3 className="text-lg font-semibold text-text-primary">Long-Term Gains</h3>
                </div>
                <div className="space-y-3">
                  <div className="flex justify-between">
                    <span className="text-text-secondary">Proceeds</span>
                    <span className="text-text-primary font-mono">{formatCurrency(summary.longTerm.proceeds)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-text-secondary">Cost Basis</span>
                    <span className="text-text-primary font-mono">{formatCurrency(summary.longTerm.costBasis)}</span>
                  </div>
                  <div className="flex justify-between border-t border-border pt-3">
                    <span className="font-medium text-text-primary">Gain/Loss</span>
                    <span className="font-medium font-mono">
                      {formatGainLoss(summary.longTerm.gainLoss)}
                    </span>
                  </div>
                  <div className="text-xs text-text-muted">
                    {summary.longTerm.transactionCount} transactions
                  </div>
                </div>
              </div>

              {/* Total */}
              <div className="card bg-primary/5 border-primary/30 group hover:border-primary/50 transition-colors">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                    <svg className="w-5 h-5 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 013 19.875v-6.75zM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V8.625zM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V4.125z" />
                    </svg>
                  </div>
                  <h3 className="text-lg font-semibold text-text-primary">Total {year}</h3>
                </div>
                <div className="space-y-3">
                  <div className="flex justify-between">
                    <span className="text-text-secondary">Capital Gains</span>
                    <span className="font-mono">
                      {formatGainLoss(summary.shortTerm.gainLoss + summary.longTerm.gainLoss)}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-text-secondary">Income</span>
                    <span className="text-text-primary font-mono">{formatCurrency(summary.income.total)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-text-secondary">Fees Paid</span>
                    <span className="text-error font-mono">-{formatCurrency(summary.feesPaid)}</span>
                  </div>
                  <div className="flex justify-between border-t border-border pt-3">
                    <span className="font-medium text-text-primary">Net Taxable</span>
                    <span className="font-medium text-lg font-mono">
                      {formatGainLoss(
                        summary.shortTerm.gainLoss +
                          summary.longTerm.gainLoss +
                          summary.income.total
                      )}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Income Breakdown */}
            {summary.income.total > 0 && (
              <div className="card mb-8">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-10 h-10 rounded-lg bg-info/10 flex items-center justify-center">
                    <svg className="w-5 h-5 text-info" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v12m-3-2.818l.879.659c1.171.879 3.07.879 4.242 0 1.172-.879 1.172-2.303 0-3.182C13.536 12.219 12.768 12 12 12c-.725 0-1.45-.22-2.003-.659-1.106-.879-1.106-2.303 0-3.182s2.9-.879 4.006 0l.415.33M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </div>
                  <h3 className="text-lg font-semibold text-text-primary">Income Breakdown</h3>
                </div>
                <div className="grid md:grid-cols-4 gap-4">
                  {Object.entries(summary.income.byType).map(([type, amount]) => (
                    <div key={type} className="p-4 bg-bg-elevated rounded-xl">
                      <p className="text-text-secondary text-sm capitalize">{type}</p>
                      <p className="text-xl font-semibold text-text-primary font-mono">
                        {formatCurrency(amount)}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Unrealized */}
            <div className="card mb-8">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 rounded-lg bg-text-muted/10 flex items-center justify-center">
                  <svg className="w-5 h-5 text-text-muted" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M20.25 6.375c0 2.278-3.694 4.125-8.25 4.125S3.75 8.653 3.75 6.375m16.5 0c0-2.278-3.694-4.125-8.25-4.125S3.75 4.097 3.75 6.375m16.5 0v11.25c0 2.278-3.694 4.125-8.25 4.125s-8.25-1.847-8.25-4.125V6.375m16.5 0v3.75m-16.5-3.75v3.75m16.5 0v3.75C20.25 16.153 16.556 18 12 18s-8.25-1.847-8.25-4.125v-3.75m16.5 0c0 2.278-3.694 4.125-8.25 4.125s-8.25-1.847-8.25-4.125" />
                  </svg>
                </div>
                <h3 className="text-lg font-semibold text-text-primary">Unrealized Holdings</h3>
              </div>
              <div className="flex justify-between items-center">
                <div>
                  <p className="text-text-secondary text-sm">Total Cost Basis</p>
                  <p className="text-2xl font-semibold text-text-primary font-mono">
                    {formatCurrency(summary.unrealizedCostBasis)}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-text-secondary text-sm">Unrealized Gain</p>
                  <p className="text-text-muted text-sm">
                    Requires current price data
                  </p>
                </div>
              </div>
            </div>

            {/* Export */}
            <div className="flex justify-end gap-3">
              <button
                onClick={handleExportCSV}
                disabled={exporting}
                className="btn-secondary disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
              >
                {exporting ? (
                  <>
                    <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                    </svg>
                    Exporting...
                  </>
                ) : (
                  <>
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5M16.5 12L12 16.5m0 0L7.5 12m4.5 4.5V3" />
                    </svg>
                    Export CSV
                  </>
                )}
              </button>
              <button
                onClick={handleExport8949}
                disabled={exporting}
                className="btn-primary disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
              >
                {exporting ? (
                  <>
                    <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                    </svg>
                    Exporting...
                  </>
                ) : (
                  <>
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
                    </svg>
                    Export Form 8949
                  </>
                )}
              </button>
            </div>
          </>
        )}
      </main>
    </div>
  );
}
