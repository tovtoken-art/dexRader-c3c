export const metadata = { title: "C3C Dashboard", description: "C3C whales and trades" };

import "./globals.css";

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ko">
      <body>
        <header className="header">
          <div className="container flex items-center justify-between h-14">
            <div className="brand">C3C 대시보드</div>
            <div className="text-xs text-neutral-400">실시간 스트림 · Supabase</div>
          </div>
        </header>
        <main className="container py-6 space-y-6">{children}</main>
      </body>
    </html>
  );
}
