"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname, useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { useState, useRef, useEffect } from "react";

// Account dropdown items
const accountItems = [
  { href: "/settings", label: "Settings", icon: "settings" },
  { href: "/help", label: "Help & FAQ", icon: "help" },
  { href: "/pricing", label: "Pricing", icon: "card" },
];

// Wallets dropdown items
const walletsItems = [
  { href: "/wallets", label: "All Wallets", icon: "wallet" },
  { href: "/transactions", label: "Transactions", icon: "list" },
];

const icons: Record<string, JSX.Element> = {
  grid: (
    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6A2.25 2.25 0 016 3.75h2.25A2.25 2.25 0 0110.5 6v2.25a2.25 2.25 0 01-2.25 2.25H6a2.25 2.25 0 01-2.25-2.25V6zM3.75 15.75A2.25 2.25 0 016 13.5h2.25a2.25 2.25 0 012.25 2.25V18a2.25 2.25 0 01-2.25 2.25H6A2.25 2.25 0 013.75 18v-2.25zM13.5 6a2.25 2.25 0 012.25-2.25H18A2.25 2.25 0 0120.25 6v2.25A2.25 2.25 0 0118 10.5h-2.25a2.25 2.25 0 01-2.25-2.25V6zM13.5 15.75a2.25 2.25 0 012.25-2.25H18a2.25 2.25 0 012.25 2.25V18A2.25 2.25 0 0118 20.25h-2.25A2.25 2.25 0 0113.5 18v-2.25z" />
    </svg>
  ),
  wallet: (
    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M21 12a2.25 2.25 0 00-2.25-2.25H15a3 3 0 11-6 0H5.25A2.25 2.25 0 003 12m18 0v6a2.25 2.25 0 01-2.25 2.25H5.25A2.25 2.25 0 013 18v-6m18 0V9M3 12V9m18 0a2.25 2.25 0 00-2.25-2.25H5.25A2.25 2.25 0 003 9m18 0V6a2.25 2.25 0 00-2.25-2.25H5.25A2.25 2.25 0 003 6v3" />
    </svg>
  ),
  list: (
    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 6.75h12M8.25 12h12m-12 5.25h12M3.75 6.75h.007v.008H3.75V6.75zm.375 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zM3.75 12h.007v.008H3.75V12zm.375 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm-.375 5.25h.007v.008H3.75v-.008zm.375 0a.375.375 0 11-.75 0 .375.375 0 01.75 0z" />
    </svg>
  ),
  file: (
    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
    </svg>
  ),
  settings: (
    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M9.594 3.94c.09-.542.56-.94 1.11-.94h2.593c.55 0 1.02.398 1.11.94l.213 1.281c.063.374.313.686.645.87.074.04.147.083.22.127.324.196.72.257 1.075.124l1.217-.456a1.125 1.125 0 011.37.49l1.296 2.247a1.125 1.125 0 01-.26 1.431l-1.003.827c-.293.24-.438.613-.431.992a6.759 6.759 0 010 .255c-.007.378.138.75.43.99l1.005.828c.424.35.534.954.26 1.43l-1.298 2.247a1.125 1.125 0 01-1.369.491l-1.217-.456c-.355-.133-.75-.072-1.076.124a6.57 6.57 0 01-.22.128c-.331.183-.581.495-.644.869l-.213 1.28c-.09.543-.56.941-1.11.941h-2.594c-.55 0-1.02-.398-1.11-.94l-.213-1.281c-.062-.374-.312-.686-.644-.87a6.52 6.52 0 01-.22-.127c-.325-.196-.72-.257-1.076-.124l-1.217.456a1.125 1.125 0 01-1.369-.49l-1.297-2.247a1.125 1.125 0 01.26-1.431l1.004-.827c.292-.24.437-.613.43-.992a6.932 6.932 0 010-.255c.007-.378-.138-.75-.43-.99l-1.004-.828a1.125 1.125 0 01-.26-1.43l1.297-2.247a1.125 1.125 0 011.37-.491l1.216.456c.356.133.751.072 1.076-.124.072-.044.146-.087.22-.128.332-.183.582-.495.644-.869l.214-1.281z" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
    </svg>
  ),
  help: (
    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M9.879 7.519c1.171-1.025 3.071-1.025 4.242 0 1.172 1.025 1.172 2.687 0 3.712-.203.179-.43.326-.67.442-.745.361-1.45.999-1.45 1.827v.75M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-9 5.25h.008v.008H12v-.008z" />
    </svg>
  ),
  card: (
    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 8.25h19.5M2.25 9h19.5m-16.5 5.25h6m-6 2.25h3m-3.75 3h15a2.25 2.25 0 002.25-2.25V6.75A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25v10.5A2.25 2.25 0 004.5 19.5z" />
    </svg>
  ),
  user: (
    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M17.982 18.725A7.488 7.488 0 0012 15.75a7.488 7.488 0 00-5.982 2.975m11.963 0a9 9 0 10-11.963 0m11.963 0A8.966 8.966 0 0112 21a8.966 8.966 0 01-5.982-2.275M15 9.75a3 3 0 11-6 0 3 3 0 016 0z" />
    </svg>
  ),
  signOut: (
    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 9V5.25A2.25 2.25 0 0013.5 3h-6a2.25 2.25 0 00-2.25 2.25v13.5A2.25 2.25 0 007.5 21h6a2.25 2.25 0 002.25-2.25V15M12 9l-3 3m0 0l3 3m-3-3h12.75" />
    </svg>
  ),
  chevron: (
    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 8.25l-7.5 7.5-7.5-7.5" />
    </svg>
  ),
};

export function Nav() {
  const pathname = usePathname();
  const router = useRouter();
  const supabase = createClient();
  const [accountOpen, setAccountOpen] = useState(false);
  const [walletsOpen, setWalletsOpen] = useState(false);
  const accountRef = useRef<HTMLDivElement>(null);
  const walletsRef = useRef<HTMLDivElement>(null);

  // Close dropdowns when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (accountRef.current && !accountRef.current.contains(event.target as Node)) {
        setAccountOpen(false);
      }
      if (walletsRef.current && !walletsRef.current.contains(event.target as Node)) {
        setWalletsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    router.push("/auth/login");
  };

  // Check if current path is in account or wallets section
  const isAccountSection = accountItems.some(item => pathname === item.href);
  const isWalletsSection = walletsItems.some(item => pathname === item.href) || pathname.startsWith("/wallets/");

  return (
    <nav className="sticky top-0 z-50 glass border-b border-border">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <Link href="/dashboard" className="flex items-center gap-2 group">
            <Image
              src="/logo-icon.png"
              alt="Self Custody Tax"
              width={32}
              height={32}
              className="w-8 h-8"
            />
            <span className="text-lg font-semibold text-text-primary hidden sm:inline">
              Self Custody Tax
            </span>
          </Link>

          {/* Main Navigation Links */}
          <div className="hidden md:flex items-center gap-1">
            {/* Dashboard */}
            <Link
              href="/dashboard"
              className={`
                flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium
                transition-all duration-150
                ${pathname === "/dashboard"
                  ? "bg-bg-surface text-text-primary shadow-sm"
                  : "text-text-secondary hover:text-text-primary hover:bg-bg-hover"
                }
              `}
            >
              <span className={pathname === "/dashboard" ? "text-primary" : ""}>
                {icons.grid}
              </span>
              Dashboard
            </Link>

            {/* Wallets Dropdown */}
            <div className="relative" ref={walletsRef}>
              <button
                onClick={() => {
                  setWalletsOpen(!walletsOpen);
                  setAccountOpen(false);
                }}
                className={`
                  flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium
                  transition-all duration-150
                  ${isWalletsSection || walletsOpen
                    ? "bg-bg-surface text-text-primary shadow-sm"
                    : "text-text-secondary hover:text-text-primary hover:bg-bg-hover"
                  }
                `}
              >
                <span className={isWalletsSection ? "text-primary" : ""}>
                  {icons.wallet}
                </span>
                Wallets
                <span className={`transition-transform duration-150 ${walletsOpen ? "rotate-180" : ""}`}>
                  {icons.chevron}
                </span>
              </button>

              {walletsOpen && (
                <div className="absolute left-0 mt-2 w-48 bg-bg-elevated rounded-lg shadow-lg border border-border overflow-hidden">
                  {walletsItems.map((item, index) => {
                    const isActive = pathname === item.href;
                    const isFirst = index === 0;
                    const isLast = index === walletsItems.length - 1;
                    return (
                      <Link
                        key={item.href}
                        href={item.href}
                        onClick={() => setWalletsOpen(false)}
                        className={`
                          flex items-center gap-3 px-4 py-3 text-sm
                          transition-colors duration-150
                          ${isActive
                            ? "bg-bg-hover text-text-primary"
                            : "text-text-secondary hover:text-text-primary hover:bg-bg-hover"
                          }
                          ${isFirst ? "rounded-t-lg" : ""}
                          ${isLast ? "rounded-b-lg" : ""}
                        `}
                      >
                        <span className={isActive ? "text-primary" : ""}>
                          {icons[item.icon]}
                        </span>
                        {item.label}
                      </Link>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Tax */}
            <Link
              href="/tax"
              className={`
                flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium
                transition-all duration-150
                ${pathname === "/tax" || pathname === "/gains"
                  ? "bg-bg-surface text-text-primary shadow-sm"
                  : "text-text-secondary hover:text-text-primary hover:bg-bg-hover"
                }
              `}
            >
              <span className={pathname === "/tax" || pathname === "/gains" ? "text-primary" : ""}>
                {icons.file}
              </span>
              Tax
            </Link>
          </div>

          {/* Account Dropdown */}
          <div className="relative" ref={accountRef}>
            <button
              onClick={() => {
                setAccountOpen(!accountOpen);
                setWalletsOpen(false);
              }}
              className={`
                flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium
                transition-all duration-150
                ${isAccountSection || accountOpen
                  ? "bg-bg-surface text-text-primary shadow-sm"
                  : "text-text-secondary hover:text-text-primary hover:bg-bg-hover"
                }
              `}
            >
              <span className={isAccountSection ? "text-primary" : ""}>
                {icons.user}
              </span>
              <span className="hidden sm:inline">Account</span>
              <span className={`transition-transform duration-150 ${accountOpen ? "rotate-180" : ""}`}>
                {icons.chevron}
              </span>
            </button>

            {accountOpen && (
              <div className="absolute right-0 mt-2 w-48 bg-bg-elevated rounded-lg shadow-lg border border-border overflow-hidden">
                {accountItems.map((item, index) => {
                  const isActive = pathname === item.href;
                  const isFirst = index === 0;
                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      onClick={() => setAccountOpen(false)}
                      className={`
                        flex items-center gap-3 px-4 py-3 text-sm
                        transition-colors duration-150
                        ${isActive
                          ? "bg-bg-hover text-text-primary"
                          : "text-text-secondary hover:text-text-primary hover:bg-bg-hover"
                        }
                        ${isFirst ? "rounded-t-lg" : ""}
                      `}
                    >
                      <span className={isActive ? "text-primary" : ""}>
                        {icons[item.icon]}
                      </span>
                      {item.label}
                    </Link>
                  );
                })}

                <div className="border-t border-border" />

                <button
                  onClick={() => {
                    setAccountOpen(false);
                    handleSignOut();
                  }}
                  className="flex items-center gap-3 px-4 py-3 text-sm w-full text-left
                    text-text-secondary hover:text-text-primary hover:bg-bg-hover
                    transition-colors duration-150 rounded-b-lg"
                >
                  {icons.signOut}
                  Sign Out
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Mobile Navigation */}
      <div className="md:hidden border-t border-border overflow-x-auto">
        <div className="flex px-2 py-2 gap-1">
          {/* Dashboard */}
          <Link
            href="/dashboard"
            className={`
              flex flex-col items-center gap-1 px-4 py-2 rounded-lg text-xs font-medium min-w-[4.5rem]
              transition-all duration-150
              ${pathname === "/dashboard"
                ? "bg-bg-surface text-primary"
                : "text-text-tertiary hover:text-text-primary"
              }
            `}
          >
            {icons.grid}
            Dashboard
          </Link>

          {/* Wallets */}
          <Link
            href="/wallets"
            className={`
              flex flex-col items-center gap-1 px-4 py-2 rounded-lg text-xs font-medium min-w-[4.5rem]
              transition-all duration-150
              ${pathname === "/wallets" || pathname.startsWith("/wallets/")
                ? "bg-bg-surface text-primary"
                : "text-text-tertiary hover:text-text-primary"
              }
            `}
          >
            {icons.wallet}
            Wallets
          </Link>

          {/* Transactions */}
          <Link
            href="/transactions"
            className={`
              flex flex-col items-center gap-1 px-4 py-2 rounded-lg text-xs font-medium min-w-[4.5rem]
              transition-all duration-150
              ${pathname === "/transactions"
                ? "bg-bg-surface text-primary"
                : "text-text-tertiary hover:text-text-primary"
              }
            `}
          >
            {icons.list}
            Txns
          </Link>

          {/* Tax */}
          <Link
            href="/tax"
            className={`
              flex flex-col items-center gap-1 px-4 py-2 rounded-lg text-xs font-medium min-w-[4.5rem]
              transition-all duration-150
              ${pathname === "/tax" || pathname === "/gains"
                ? "bg-bg-surface text-primary"
                : "text-text-tertiary hover:text-text-primary"
              }
            `}
          >
            {icons.file}
            Tax
          </Link>

          {/* Account button for mobile */}
          <button
            onClick={() => setAccountOpen(!accountOpen)}
            className={`
              flex flex-col items-center gap-1 px-4 py-2 rounded-lg text-xs font-medium min-w-[4.5rem]
              transition-all duration-150
              ${isAccountSection
                ? "bg-bg-surface text-primary"
                : "text-text-tertiary hover:text-text-primary"
              }
            `}
          >
            {icons.user}
            Account
          </button>
        </div>
      </div>
    </nav>
  );
}
