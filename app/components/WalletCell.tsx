"use client";
import { useState } from "react";

export default function WalletCell({
  addr,
  small = false,
}: {
  addr: string;
  small?: boolean;
}) {
  const [copied, setCopied] = useState(false);

  const short = (x: string) =>
    x && x.length > 12 ? `${x.slice(0, 6)}…${x.slice(-6)}` : x || "";

  async function onCopy() {
    try {
      await navigator.clipboard.writeText(addr);
      setCopied(true);
      setTimeout(() => setCopied(false), 1200);
    } catch {}
  }

  const size = small ? "h-7 px-2" : "h-8 px-2.5";

  return (
    <div className="flex items-center gap-2 font-mono">
      <span className="truncate">{short(addr)}</span>

      {/* 복사 */}
      <button
        onClick={onCopy}
        aria-label="지갑주소 복사"
        className={`iconbtn ${size} ${copied ? "text-emerald-300" : ""}`}
        title={copied ? "복사됨" : "복사"}
      >
        {/* copy icon */}
        {copied ? (
          /* check icon */
          <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
            <path d="M20.3 5.7 9 17l-5.3-5.3 1.4-1.4L9 14.2l9.9-9.9 1.4 1.4Z" />
          </svg>
        ) : (
          <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
            <path d="M16 1H6a2 2 0 0 0-2 2v12h2V3h10V1ZM18 5H10a2 2 0 0 0-2 2v14h12a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2Zm0 16H10V7h8v14Z" />
          </svg>
        )}
      </button>

      {/* Solscan 이동 */}
      <a
        href={`https://solscan.io/account/${addr}`}
        target="_blank"
        rel="noopener noreferrer"
        aria-label="Solscan에서 열기"
        className={`iconbtn ${size}`}
        title="Solscan"
      >
        <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
          <path d="M14 3h7v7h-2V6.4l-9.3 9.3-1.4-1.4L17.6 5H14V3Z" />
          <path d="M19 19H5V5h7V3H5a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7h-2v7Z" />
        </svg>
      </a>
    </div>
  );
}
