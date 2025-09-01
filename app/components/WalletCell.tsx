"use client";
import { useEffect, useState } from "react";

type Props = {
  addr: string;
  small?: boolean;
  label?: string;
  onEdit?: () => void;
  onWatchToggle?: () => void;
  watched?: boolean;
};

export default function WalletCell({
  addr,
  small = false,
  label,
  onEdit,
  onWatchToggle,
  watched = false,
}: Props) {
  const [copied, setCopied] = useState(false);

  // ✅ 마운트 전에는 항상 미관심으로 렌더 → SSR과 동일
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  const showWatched = mounted ? watched : false;

  const short = (x: string) =>
    x && x.length > 12 ? `${x.slice(0, 6)}…${x.slice(-6)}` : x || "";

  async function onCopy() {
    try {
      await navigator.clipboard.writeText(addr);
      setCopied(true);
      setTimeout(() => setCopied(false), 1200);
    } catch {}
  }

  const square = small ? "w-7 h-7" : "w-8 h-8";
  const pencilSquare = small ? "w-7 h-7" : "w-7 h-7";

  return (
    <div className="flex items-center gap-1.5 font-mono">
      {/* Favorite / Watch toggle */}
      {onWatchToggle && (
        <button
          type="button"
          onClick={onWatchToggle}
          aria-label="즐겨찾기 토글"
          aria-pressed={showWatched}
          className={`${square} inline-flex items-center justify-center rounded-md ${
            showWatched ? "text-yellow-300" : "text-neutral-400 hover:text-yellow-200"
          }`}
          title={showWatched ? "즐겨찾기 해제" : "즐겨찾기"}
        >
          {showWatched ? (
            // filled star
            <svg
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="currentColor"
              suppressHydrationWarning
            >
              <path d="M12 17.3 6.2 21l1.6-6.8L2 9.2l7-.6L12 2l3 6.6 7 .6-5.8 5 1.6 6.8L12 17.3Z" />
            </svg>
          ) : (
            // outline star
            <svg
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="currentColor"
              suppressHydrationWarning
            >
              <path d="M12 4.6 13.9 9l.3.6.7.1 4.8.4-3.6 3.1-.5.4.1.7 1 4.5-3.9-2.4-.6-.3-.6.3-3.9 2.4 1-4.5.1-.7-.5-.4L4.3 10l4.8-.4.7-.1.3-.6L12 4.6m0-3.3-3.1 6.8-7.6.7 5.6 4.8-1.5 6.7L12 17.3l6.6 4.2-1.5-6.7 5.6-4.8-7.6-.7L12 1.3Z" />
            </svg>
          )}
        </button>
      )}

      {/* Address */}
      <span className="truncate">{short(addr)}</span>

      {/* Copy */}
      <button
        type="button"
        onClick={onCopy}
        aria-label="지갑주소 복사"
        className={`iconbtn ${square} p-0 ${copied ? "text-emerald-300" : ""}`}
        title={copied ? "복사됨" : "복사"}
      >
        {copied ? (
          <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
            <path d="M20.3 5.7 9 17l-5.3-5.3 1.4-1.4L9 14.2l9.9-9.9 1.4 1.4Z" />
          </svg>
        ) : (
          <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
            <path d="M16 1H6a2 2 0 0 0-2 2v12h2V3h10V1ZM18 5H10a2 2 0 0 0-2 2v14h12a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2Zm0 16H10V7h8v14Z" />
          </svg>
        )}
      </button>

      {/* Solscan */}
      <a
        href={`https://solscan.io/account/${addr}`}
        target="_blank"
        rel="noopener noreferrer"
        aria-label="Solscan에서 열기"
        className={`iconbtn ${square} p-0`}
        title="Solscan"
      >
        <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
          <path d="M14 3h7v7h-2V6.4l-9.3 9.3-1.4-1.4L17.6 5H14V3Z" />
          <path d="M19 19H5V5h7V3H5a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7h-2v7Z" />
        </svg>
      </a>

      {/* Label + edit */}
      {label && <span className="badge badge-emerald whitespace-nowrap">{label}</span>}

      {onEdit && (
        <button
          type="button"
          onClick={onEdit}
          aria-label="라벨 편집"
          className={`${pencilSquare} inline-flex items-center justify-center rounded-md text-neutral-300 hover:text-neutral-100`}
          title={label ? "라벨 수정" : "라벨 추가"}
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
            <path d="M3 17.2V21h3.8l11-11.1-3.8-3.8L3 17.2Zm17.7-10.1c.4-.4.4-1 0-1.4l-2.4-2.4a1 1 0 0 0-1.4 0l-1.9 1.9 3.8 3.8 1.9-1.9Z" />
          </svg>
        </button>
      )}
    </div>
  );
}
