import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "@/styles/globals.css";
import { Providers } from "@/components/providers";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
});

export const metadata: Metadata = {
  title: "Self Custody Tax - Bitcoin Tax Tracking for Self-Custody Users",
  description:
    "Track your Bitcoin portfolio with multisig support, UTXO-level cost basis, and accurate tax reporting.",
  keywords: [
    "bitcoin portfolio tracker",
    "bitcoin tax calculator",
    "multisig tax tracking",
    "crypto cost basis calculator",
    "UTXO tracking",
  ],
  icons: {
    icon: [
      { url: "/logo-icon.png", type: "image/png" },
    ],
    apple: "/logo-icon.png",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark">
      <body className={`${inter.variable} font-sans antialiased`}>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
