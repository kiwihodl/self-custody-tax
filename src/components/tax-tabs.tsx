"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const tabs = [
  { href: "/tax", label: "Realized Gains", description: "Completed sales & Form 8949" },
  { href: "/gains", label: "Unrealized Gains", description: "Current holdings & cost basis" },
];

export function TaxTabs() {
  const pathname = usePathname();

  return (
    <div className="flex gap-2 mb-6">
      {tabs.map((tab) => {
        const isActive = pathname === tab.href;
        return (
          <Link
            key={tab.href}
            href={tab.href}
            className={`
              px-4 py-2 rounded-lg text-sm font-medium transition-all duration-150
              ${isActive
                ? "bg-primary text-white shadow-sm"
                : "bg-bg-surface text-text-secondary hover:text-text-primary hover:bg-bg-hover border border-border"
              }
            `}
          >
            {tab.label}
          </Link>
        );
      })}
    </div>
  );
}
