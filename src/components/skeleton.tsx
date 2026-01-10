"use client";

interface SkeletonProps {
  className?: string;
}

export function Skeleton({ className = "" }: SkeletonProps) {
  return (
    <div
      className={`animate-pulse bg-gray-700/50 rounded ${className}`}
      aria-hidden="true"
    />
  );
}

export function SkeletonCard() {
  return (
    <div className="card">
      <div className="flex items-center justify-between mb-4">
        <Skeleton className="h-6 w-32" />
        <Skeleton className="h-6 w-20" />
      </div>
      <Skeleton className="h-10 w-24 mb-2" />
      <Skeleton className="h-4 w-40" />
    </div>
  );
}

export function SkeletonWalletCard() {
  return (
    <div className="card">
      <div className="flex items-start justify-between mb-4">
        <div>
          <Skeleton className="h-6 w-40 mb-2" />
          <Skeleton className="h-4 w-24" />
        </div>
        <Skeleton className="h-6 w-16 rounded-full" />
      </div>
      <div className="space-y-2">
        <div className="flex justify-between">
          <Skeleton className="h-4 w-16" />
          <Skeleton className="h-4 w-24" />
        </div>
        <div className="flex justify-between">
          <Skeleton className="h-4 w-20" />
          <Skeleton className="h-4 w-20" />
        </div>
      </div>
      <div className="flex gap-2 mt-4">
        <Skeleton className="h-8 w-20 rounded-lg" />
        <Skeleton className="h-8 w-20 rounded-lg" />
      </div>
    </div>
  );
}

export function SkeletonTransactionRow() {
  return (
    <tr>
      <td className="px-4 py-3">
        <Skeleton className="h-4 w-24" />
      </td>
      <td className="px-4 py-3">
        <Skeleton className="h-6 w-16 rounded-full" />
      </td>
      <td className="px-4 py-3">
        <Skeleton className="h-4 w-20" />
      </td>
      <td className="px-4 py-3">
        <Skeleton className="h-4 w-24" />
      </td>
      <td className="px-4 py-3">
        <Skeleton className="h-4 w-32" />
      </td>
    </tr>
  );
}

export function SkeletonTable({ rows = 5 }: { rows?: number }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full">
        <thead>
          <tr className="text-left text-gray-400 text-sm border-b border-gray-800">
            <th className="px-4 py-3"><Skeleton className="h-4 w-16" /></th>
            <th className="px-4 py-3"><Skeleton className="h-4 w-12" /></th>
            <th className="px-4 py-3"><Skeleton className="h-4 w-16" /></th>
            <th className="px-4 py-3"><Skeleton className="h-4 w-12" /></th>
            <th className="px-4 py-3"><Skeleton className="h-4 w-20" /></th>
          </tr>
        </thead>
        <tbody>
          {Array.from({ length: rows }).map((_, i) => (
            <SkeletonTransactionRow key={i} />
          ))}
        </tbody>
      </table>
    </div>
  );
}

export function SkeletonDashboard() {
  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <Skeleton className="h-8 w-48 mb-2" />
          <Skeleton className="h-4 w-32" />
        </div>
        <Skeleton className="h-10 w-28 rounded-lg" />
      </div>

      {/* Portfolio Summary Cards */}
      <div className="grid md:grid-cols-3 gap-6 mb-8">
        <SkeletonCard />
        <SkeletonCard />
        <SkeletonCard />
      </div>

      {/* Wallets Section */}
      <div className="mb-8">
        <Skeleton className="h-6 w-32 mb-4" />
        <div className="grid md:grid-cols-2 gap-4">
          <SkeletonWalletCard />
          <SkeletonWalletCard />
        </div>
      </div>

      {/* Recent Transactions */}
      <div className="card">
        <div className="flex items-center justify-between mb-4">
          <Skeleton className="h-6 w-40" />
          <Skeleton className="h-4 w-16" />
        </div>
        <SkeletonTable rows={5} />
      </div>
    </div>
  );
}

export function SkeletonWalletList() {
  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="flex items-center justify-between mb-8">
        <div>
          <Skeleton className="h-8 w-32 mb-2" />
          <Skeleton className="h-4 w-48" />
        </div>
        <Skeleton className="h-10 w-28 rounded-lg" />
      </div>
      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
        <SkeletonWalletCard />
        <SkeletonWalletCard />
        <SkeletonWalletCard />
      </div>
    </div>
  );
}

export function SkeletonTaxPage() {
  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Header */}
      <div className="mb-8">
        <Skeleton className="h-8 w-40 mb-2" />
        <Skeleton className="h-4 w-64" />
      </div>

      {/* Controls */}
      <div className="flex gap-4 mb-8">
        <Skeleton className="h-10 w-32 rounded-lg" />
        <Skeleton className="h-10 w-40 rounded-lg" />
        <Skeleton className="h-10 w-36 rounded-lg" />
      </div>

      {/* Summary Cards */}
      <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <SkeletonCard />
        <SkeletonCard />
        <SkeletonCard />
        <SkeletonCard />
      </div>

      {/* Table */}
      <div className="card">
        <Skeleton className="h-6 w-40 mb-4" />
        <SkeletonTable rows={8} />
      </div>
    </div>
  );
}
