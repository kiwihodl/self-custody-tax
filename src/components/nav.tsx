"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const NAV_ITEMS = [
  { href: "/dashboard", label: "Dashboard", icon: "📊" },
  { href: "/wallets", label: "Wallets", icon: "💰" },
  { href: "/transactions", label: "Transactions", icon: "📋" },
  { href: "/gains", label: "Gains", icon: "📈" },
  { href: "/tax", label: "Tax Report", icon: "📄" },
  { href: "/settings", label: "Settings", icon: "⚙️" },
];

export default function Nav() {
  const pathname = usePathname();

  return (
    <nav className="w-56 min-h-screen bg-gray-900 border-r border-gray-800 p-4 flex flex-col">
      <Link href="/dashboard" className="text-xl font-bold text-[#FBDC7B] mb-8 block">
        Self Custody Tax
      </Link>

      <div className="space-y-1 flex-1">
        {NAV_ITEMS.map((item) => {
          const active = pathname.startsWith(item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors ${
                active
                  ? "bg-[#FBDC7B]/10 text-[#FBDC7B]"
                  : "text-gray-400 hover:text-white hover:bg-gray-800"
              }`}
            >
              <span>{item.icon}</span>
              <span>{item.label}</span>
            </Link>
          );
        })}
      </div>

      <div className="text-xs text-gray-600 mt-4">
        <p>All data stored locally</p>
        <p className="text-[#FBDC7B]/50">Bitcoin Butlers</p>
      </div>
    </nav>
  );
}
