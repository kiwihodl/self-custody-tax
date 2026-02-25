import type { Metadata } from "next";
import { GeistSans } from "geist/font/sans";
import { GeistMono } from "geist/font/mono";
import "@/styles/globals.css";
import { Providers } from "@/components/providers";

export const metadata: Metadata = {
  title: "Self Custody Tax — Bitcoin Tax Tracker",
  description:
    "Privacy-first Bitcoin tax tracking. All data stays on your device. FOSS.",
  keywords: [
    "bitcoin tax tracker",
    "self custody tax",
    "bitcoin cost basis",
    "FIFO LIFO HIFO",
    "form 8949",
    "privacy bitcoin",
  ],
  manifest: "/manifest.json",
  themeColor: "#FBDC7B",
  icons: {
    icon: [
      { url: "/icon-192.png", sizes: "192x192", type: "image/png" },
      { url: "/icon-512.png", sizes: "512x512", type: "image/png" },
    ],
    apple: "/icon-192.png",
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "SCT",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark">
      <body className={`${GeistSans.variable} ${GeistMono.variable} font-sans antialiased bg-bg-base text-text-primary`}>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
