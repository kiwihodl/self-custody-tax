import { Nav } from "@/components/nav";
import { SkeletonWalletList } from "@/components/skeleton";

export default function WalletsLoading() {
  return (
    <div className="min-h-screen">
      <Nav />
      <SkeletonWalletList />
    </div>
  );
}
