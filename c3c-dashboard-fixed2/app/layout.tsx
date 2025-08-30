import "./globals.css";

export const metadata = { title: "C3C Dashboard" };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ko">
      <body className="min-h-screen">
        <main className="max-w-6xl mx-auto p-6">{children}</main>
      </body>
    </html>
  );
}
