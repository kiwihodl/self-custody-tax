import { Nav } from "@/components/nav";
import { SkeletonTaxPage } from "@/components/skeleton";

export default function TaxLoading() {
  return (
    <div className="min-h-screen">
      <Nav />
      <SkeletonTaxPage />
    </div>
  );
}
