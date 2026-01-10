"use client";

import { useState } from "react";
import { Nav } from "@/components/nav";

interface FAQItem {
  question: string;
  answer: string;
}

const faqs: FAQItem[] = [
  {
    question: "What is Self Custody Tax?",
    answer:
      "Self Custody Tax is a Bitcoin and stablecoin portfolio tracker designed for self-custody users. It helps you track your holdings across multiple wallets, monitor transactions, and generate tax reports.",
  },
  {
    question: "Do you have access to my private keys?",
    answer:
      "No, never. Self Custody Tax is a watch-only tracker. We only use public addresses and extended public keys (xpubs) to read blockchain data. We cannot move or spend your funds.",
  },
  {
    question: "What wallets are supported?",
    answer:
      "We support Bitcoin wallets (single addresses, xpub/ypub/zpub, and multisig descriptors) and Ethereum wallets for tracking USDT and USDC stablecoins.",
  },
  {
    question: "How do I add an xpub wallet?",
    answer:
      "Go to Wallets → Add Wallet → Select 'Extended Public Key (xpub)' → Paste your xpub/ypub/zpub. We'll automatically derive addresses and sync transactions.",
  },
  {
    question: "What exchanges can I import from?",
    answer:
      "We currently support CSV imports from Amber App, Coinbase, Kraken, and Gemini. Go to a wallet's detail page and click 'Import CSV' to upload your transaction history.",
  },
  {
    question: "How is cost basis calculated?",
    answer:
      "We support FIFO (First In, First Out), LIFO (Last In, First Out), and HIFO (Highest In, First Out) cost basis methods. You can select your preferred method in Settings.",
  },
  {
    question: "What tax reports can I generate?",
    answer:
      "We generate IRS Form 8949-compatible reports that separate short-term and long-term capital gains. You can export as CSV for use with tax software.",
  },
  {
    question: "How do internal transfers work?",
    answer:
      "When you move Bitcoin between your own wallets, we can detect these as internal transfers so they don't trigger taxable events. Use the 'Detect Internal Transfers' feature in the Transactions page.",
  },
];

const guides = [
  {
    title: "Getting Started",
    description: "Add your first wallet and start tracking",
    icon: (
      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M15.59 14.37a6 6 0 01-5.84 7.38v-4.8m5.84-2.58a14.98 14.98 0 006.16-12.12A14.98 14.98 0 009.631 8.41m5.96 5.96a14.926 14.926 0 01-5.841 2.58m-.119-8.54a6 6 0 00-7.381 5.84h4.8m2.581-5.84a14.927 14.927 0 00-2.58 5.84m2.699 2.7c-.103.021-.207.041-.311.06a15.09 15.09 0 01-2.448-2.448 14.9 14.9 0 01.06-.312m-2.24 2.39a4.493 4.493 0 00-1.757 4.306 4.493 4.493 0 004.306-1.758M16.5 9a1.5 1.5 0 11-3 0 1.5 1.5 0 013 0z" />
      </svg>
    ),
    color: "primary",
    steps: [
      "Create an account or sign in",
      "Click 'Add Wallet' on the Wallets page",
      "Choose Bitcoin or Stablecoins",
      "Enter your address or xpub",
      "Wait for the sync to complete",
    ],
  },
  {
    title: "Importing Exchange Data",
    description: "Import transactions from your exchange",
    icon: (
      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5" />
      </svg>
    ),
    color: "info",
    steps: [
      "Export your transaction history from your exchange as CSV",
      "Go to the wallet detail page",
      "Click 'Import CSV'",
      "Upload or paste your CSV data",
      "Review and confirm the import",
    ],
  },
  {
    title: "Generating Tax Reports",
    description: "Create reports for tax filing",
    icon: (
      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
      </svg>
    ),
    color: "warning",
    steps: [
      "Go to the Tax page",
      "Select your tax year",
      "Choose your cost basis method (FIFO/LIFO/HIFO)",
      "Click 'Process Transactions' to calculate gains",
      "Export your Form 8949 report",
    ],
  },
  {
    title: "Tracking Multisig Wallets",
    description: "Add 2-of-3 or other multisig setups",
    icon: (
      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 10.5V6.75a4.5 4.5 0 10-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 002.25-2.25v-6.75a2.25 2.25 0 00-2.25-2.25H6.75a2.25 2.25 0 00-2.25 2.25v6.75a2.25 2.25 0 002.25 2.25z" />
      </svg>
    ),
    color: "success",
    steps: [
      "Click 'Add Wallet' and select 'Multisig Descriptor'",
      "Paste your wallet descriptor or upload the JSON config",
      "We'll parse the quorum and derive addresses",
      "Sync to fetch all transactions",
    ],
  },
];

const getColorClasses = (color: string) => {
  switch (color) {
    case "primary":
      return { bg: "bg-primary/10", text: "text-primary" };
    case "info":
      return { bg: "bg-info/10", text: "text-info" };
    case "warning":
      return { bg: "bg-warning/10", text: "text-warning" };
    case "success":
      return { bg: "bg-success/10", text: "text-success" };
    default:
      return { bg: "bg-text-muted/10", text: "text-text-muted" };
  }
};

export default function HelpPage() {
  const [openFaq, setOpenFaq] = useState<number | null>(null);

  return (
    <div className="min-h-screen bg-bg-base">
      <Nav />
      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="flex items-center gap-3 mb-8">
          <div className="w-10 h-10 rounded-lg bg-info/10 flex items-center justify-center">
            <svg className="w-5 h-5 text-info" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9.879 7.519c1.171-1.025 3.071-1.025 4.242 0 1.172 1.025 1.172 2.687 0 3.712-.203.179-.43.326-.67.442-.745.361-1.45.999-1.45 1.827v.75M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-9 5.25h.008v.008H12v-.008z" />
            </svg>
          </div>
          <div>
            <h1 className="text-2xl font-bold text-text-primary">Help Center</h1>
            <p className="text-text-secondary text-sm">
              Learn how to use Self Custody Tax to track your Bitcoin and stablecoin portfolio
            </p>
          </div>
        </div>

        {/* Quick Start Guides */}
        <section className="mb-12">
          <div className="flex items-center gap-2 mb-4">
            <svg className="w-5 h-5 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 6.042A8.967 8.967 0 006 3.75c-1.052 0-2.062.18-3 .512v14.25A8.987 8.987 0 016 18c2.305 0 4.408.867 6 2.292m0-14.25a8.966 8.966 0 016-2.292c1.052 0 2.062.18 3 .512v14.25A8.987 8.987 0 0018 18a8.967 8.967 0 00-6 2.292m0-14.25v14.25" />
            </svg>
            <h2 className="text-xl font-semibold text-text-primary">Quick Start Guides</h2>
          </div>
          <div className="grid md:grid-cols-2 gap-4">
            {guides.map((guide, index) => {
              const colors = getColorClasses(guide.color);
              return (
                <div key={index} className="card group hover:border-border-hover transition-colors">
                  <div className="flex items-start gap-3 mb-4">
                    <div className={`w-10 h-10 rounded-lg ${colors.bg} flex items-center justify-center flex-shrink-0`}>
                      <span className={colors.text}>{guide.icon}</span>
                    </div>
                    <div>
                      <h3 className="font-semibold text-text-primary">{guide.title}</h3>
                      <p className="text-text-secondary text-sm">{guide.description}</p>
                    </div>
                  </div>
                  <ol className="space-y-2 ml-2">
                    {guide.steps.map((step, stepIndex) => (
                      <li key={stepIndex} className="flex items-start gap-3 text-sm">
                        <span className={`w-5 h-5 rounded-full ${colors.bg} ${colors.text} flex items-center justify-center flex-shrink-0 text-xs font-medium`}>
                          {stepIndex + 1}
                        </span>
                        <span className="text-text-tertiary">{step}</span>
                      </li>
                    ))}
                  </ol>
                </div>
              );
            })}
          </div>
        </section>

        {/* FAQ */}
        <section className="mb-12">
          <div className="flex items-center gap-2 mb-4">
            <svg className="w-5 h-5 text-warning" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M8.625 12a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0H8.25m4.125 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0H12m4.125 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0h-.375M21 12c0 4.556-4.03 8.25-9 8.25a9.764 9.764 0 01-2.555-.337A5.972 5.972 0 015.41 20.97a5.969 5.969 0 01-.474-.065 4.48 4.48 0 00.978-2.025c.09-.457-.133-.901-.467-1.226C3.93 16.178 3 14.189 3 12c0-4.556 4.03-8.25 9-8.25s9 3.694 9 8.25z" />
            </svg>
            <h2 className="text-xl font-semibold text-text-primary">Frequently Asked Questions</h2>
          </div>
          <div className="space-y-2">
            {faqs.map((faq, index) => (
              <div key={index} className="card p-0 overflow-hidden">
                <button
                  onClick={() => setOpenFaq(openFaq === index ? null : index)}
                  className="w-full px-5 py-4 text-left flex justify-between items-center hover:bg-bg-hover transition-colors"
                >
                  <span className="font-medium text-text-primary pr-4">{faq.question}</span>
                  <span className={`w-6 h-6 rounded-full flex items-center justify-center transition-all ${
                    openFaq === index ? "bg-primary/10 text-primary rotate-45" : "bg-bg-elevated text-text-muted"
                  }`}>
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
                    </svg>
                  </span>
                </button>
                {openFaq === index && (
                  <div className="px-5 pb-4 text-text-secondary text-sm border-t border-border">
                    <p className="pt-4">{faq.answer}</p>
                  </div>
                )}
              </div>
            ))}
          </div>
        </section>

        {/* Supported Features */}
        <section className="mb-12">
          <div className="flex items-center gap-2 mb-4">
            <svg className="w-5 h-5 text-success" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12c0 1.268-.63 2.39-1.593 3.068a3.745 3.745 0 01-1.043 3.296 3.745 3.745 0 01-3.296 1.043A3.745 3.745 0 0112 21c-1.268 0-2.39-.63-3.068-1.593a3.746 3.746 0 01-3.296-1.043 3.745 3.745 0 01-1.043-3.296A3.745 3.745 0 013 12c0-1.268.63-2.39 1.593-3.068a3.745 3.745 0 011.043-3.296 3.746 3.746 0 013.296-1.043A3.746 3.746 0 0112 3c1.268 0 2.39.63 3.068 1.593a3.746 3.746 0 013.296 1.043 3.746 3.746 0 011.043 3.296A3.745 3.745 0 0121 12z" />
            </svg>
            <h2 className="text-xl font-semibold text-text-primary">Supported Features</h2>
          </div>
          <div className="grid md:grid-cols-3 gap-4">
            <div className="card text-center group hover:border-primary/30 transition-colors">
              <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center mx-auto mb-3">
                <svg className="w-6 h-6 text-primary" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M12.5 3.5c-3.6 0-6.5 2.9-6.5 6.5 0 2.6 1.5 4.8 3.7 5.8v4.7c0 .6.4 1 1 1h3.5c.6 0 1-.4 1-1v-4.7c2.2-1 3.8-3.2 3.8-5.8 0-3.6-2.9-6.5-6.5-6.5zm.5 6.5c0 .6-.4 1-1 1s-1-.4-1-1 .4-1 1-1 1 .4 1 1z"/>
                </svg>
              </div>
              <h3 className="font-semibold text-text-primary mb-1">Bitcoin</h3>
              <p className="text-text-secondary text-sm">
                Single addresses, xpub/ypub/zpub, multisig descriptors
              </p>
            </div>
            <div className="card text-center group hover:border-info/30 transition-colors">
              <div className="w-12 h-12 rounded-xl bg-info/10 flex items-center justify-center mx-auto mb-3">
                <svg className="w-6 h-6 text-info" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v12m-3-2.818l.879.659c1.171.879 3.07.879 4.242 0 1.172-.879 1.172-2.303 0-3.182C13.536 12.219 12.768 12 12 12c-.725 0-1.45-.22-2.003-.659-1.106-.879-1.106-2.303 0-3.182s2.9-.879 4.006 0l.415.33M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <h3 className="font-semibold text-text-primary mb-1">Stablecoins</h3>
              <p className="text-text-secondary text-sm">
                USDT and USDC on Ethereum
              </p>
            </div>
            <div className="card text-center group hover:border-warning/30 transition-colors">
              <div className="w-12 h-12 rounded-xl bg-warning/10 flex items-center justify-center mx-auto mb-3">
                <svg className="w-6 h-6 text-warning" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 013 19.875v-6.75zM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V8.625zM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V4.125z" />
                </svg>
              </div>
              <h3 className="font-semibold text-text-primary mb-1">Tax Reports</h3>
              <p className="text-text-secondary text-sm">
                Form 8949, FIFO/LIFO/HIFO methods
              </p>
            </div>
          </div>
        </section>

        {/* Exchange Import Support */}
        <section className="mb-12">
          <div className="flex items-center gap-2 mb-4">
            <svg className="w-5 h-5 text-info" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M7.5 21L3 16.5m0 0L7.5 12M3 16.5h13.5m0-13.5L21 7.5m0 0L16.5 12M21 7.5H7.5" />
            </svg>
            <h2 className="text-xl font-semibold text-text-primary">Exchange Import Support</h2>
          </div>
          <div className="card">
            <div className="grid md:grid-cols-2 gap-6">
              <div>
                <h3 className="font-semibold text-text-primary mb-3 flex items-center gap-2">
                  <svg className="w-4 h-4 text-success" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  Supported Exchanges
                </h3>
                <ul className="space-y-2">
                  {["Amber App", "Coinbase", "Kraken", "Gemini"].map((exchange) => (
                    <li key={exchange} className="flex items-center gap-2 text-text-secondary">
                      <span className="w-5 h-5 rounded-full bg-success/10 text-success flex items-center justify-center flex-shrink-0">
                        <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                        </svg>
                      </span>
                      {exchange}
                    </li>
                  ))}
                </ul>
              </div>
              <div>
                <h3 className="font-semibold text-text-primary mb-3 flex items-center gap-2">
                  <svg className="w-4 h-4 text-info" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M11.25 11.25l.041-.02a.75.75 0 011.063.852l-.708 2.836a.75.75 0 001.063.853l.041-.021M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-9-3.75h.008v.008H12V8.25z" />
                  </svg>
                  How to Export
                </h3>
                <p className="text-text-secondary text-sm leading-relaxed">
                  Each exchange has a different process for exporting transaction
                  history. Generally, look for &quot;Transaction History&quot; or &quot;Reports&quot;
                  in your account settings and download as CSV.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* Contact */}
        <section>
          <div className="flex items-center gap-2 mb-4">
            <svg className="w-5 h-5 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M21.75 6.75v10.5a2.25 2.25 0 01-2.25 2.25h-15a2.25 2.25 0 01-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25m19.5 0v.243a2.25 2.25 0 01-1.07 1.916l-7.5 4.615a2.25 2.25 0 01-2.36 0L3.32 8.91a2.25 2.25 0 01-1.07-1.916V6.75" />
            </svg>
            <h2 className="text-xl font-semibold text-text-primary">Need More Help?</h2>
          </div>
          <div className="card">
            <p className="text-text-secondary mb-5">
              If you have questions or need assistance, reach out to us:
            </p>
            <div className="flex flex-wrap gap-3">
              <a
                href="mailto:support@selfcustodytax.com"
                className="btn-primary inline-flex items-center gap-2"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M21.75 6.75v10.5a2.25 2.25 0 01-2.25 2.25h-15a2.25 2.25 0 01-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25m19.5 0v.243a2.25 2.25 0 01-1.07 1.916l-7.5 4.615a2.25 2.25 0 01-2.36 0L3.32 8.91a2.25 2.25 0 01-1.07-1.916V6.75" />
                </svg>
                Email Support
              </a>
              <a
                href="https://github.com/kiwihodl/self-custody-tax/issues"
                target="_blank"
                rel="noopener noreferrer"
                className="btn-secondary inline-flex items-center gap-2"
              >
                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                  <path fillRule="evenodd" d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z" clipRule="evenodd" />
                </svg>
                GitHub Issues
              </a>
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}
