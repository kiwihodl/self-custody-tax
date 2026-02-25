import Nav from "@/components/nav";
import { Skeleton, SkeletonCard, SkeletonTable } from "@/components/skeleton";

export default function GainsLoading() {
  return (
    <div className="min-h-screen">
      <Nav />
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <Skeleton className="h-8 w-48 mb-2" />
          <Skeleton className="h-4 w-80" />
        </div>

        {/* Summary Cards */}
        <div className="grid md:grid-cols-3 gap-4 mb-8">
          <SkeletonCard />
          <SkeletonCard />
          <SkeletonCard />
        </div>

        {/* Holdings Table */}
        <div className="card">
          <Skeleton className="h-6 w-32 mb-4" />
          <SkeletonTable rows={6} />
        </div>
      </main>
    </div>
  );
}
