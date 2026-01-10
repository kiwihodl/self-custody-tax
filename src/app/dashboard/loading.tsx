import { Nav } from "@/components/nav";
import { SkeletonDashboard } from "@/components/skeleton";

export default function DashboardLoading() {
  return (
    <div className="min-h-screen">
      <Nav />
      <SkeletonDashboard />
    </div>
  );
}
