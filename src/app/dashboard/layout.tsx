import Nav from "@/components/nav";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-screen bg-gray-950 text-white">
      <Nav />
      <main className="flex-1 overflow-auto">
        {children}
      </main>
    </div>
  );
}
