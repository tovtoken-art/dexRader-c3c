// app/layout.tsx
import "./globals.css";
import type { Metadata, Viewport } from "next";
import dynamic from "next/dynamic";

export const metadata: Metadata = {
  title: "DEX_Rader",
  description: "C3C whales and trades",
};

// iOS 안전영역까지 고려
export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

const SolBalanceWidget = dynamic(() => import("./components/SolBalanceWidget"), { ssr: false });

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ko">
      <body>
        <main className="container py-6 space-y-6">{children}</main>
        <SolBalanceWidget />
      </body>
    </html>
  );
}
