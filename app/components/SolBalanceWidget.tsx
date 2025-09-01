"use client";

import React, { useState, useEffect, useMemo, useRef } from "react";

// A drop‑in replacement for app/components/SolBalanceWidget.tsx
// - Glassmorphism card with gradient border
// - Live status dot + last updated timestamp
// - Manual refresh with loading state
// - Smooth number transition
// - Tiny sparkline from recent balances (keeps last 24 points)

const POLL_MS = 30_000; // 30s
const API_ENDPOINT = "/api/balance";

function formatSol(n: number) {
  return new Intl.NumberFormat(undefined, {
    minimumFractionDigits: 4,
    maximumFractionDigits: 4,
  }).format(n);
}

function useInterval(callback: () => void, delay: number) {
  const savedRef = useRef(callback);
  useEffect(() => {
    savedRef.current = callback;
  }, [callback]);
  useEffect(() => {
    if (delay === null) return;
    const id = setInterval(() => savedRef.current(), delay);
    return () => clearInterval(id);
  }, [delay]);
}

// Build a sparkline points string for <polyline>
function useSparklinePoints(values: number[], width = 140, height = 36, pad = 4) {
  return useMemo(() => {
    if (!values.length) return "";
    const min = Math.min(...values);
    const max = Math.max(...values);
    const span = max - min || 1; // avoid div-by-zero for flat line
    const stepX = (width - pad * 2) / Math.max(values.length - 1, 1);
    const points = values.map((v, i) => {
      const x = pad + i * stepX;
      const y = pad + (1 - (v - min) / span) * (height - pad * 2);
      return `${x.toFixed(1)},${y.toFixed(1)}`;
    });
    return points.join(" ");
  }, [values, width, height, pad]);
}

const SolBalanceWidget: React.FC = () => {
  const [solBalance, setSolBalance] = useState<number | null>(null);
  const [prevBalance, setPrevBalance] = useState<number | null>(null);
  const [history, setHistory] = useState<number[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const points = useSparklinePoints(history);

  const fetchBalance = async () => {
    setIsRefreshing(true);
    try {
      const ctrl = new AbortController();
      const t = setTimeout(() => ctrl.abort(), 10_000);
      const res = await fetch(API_ENDPOINT, { signal: ctrl.signal, cache: "no-store" });
      clearTimeout(t);
      if (!res.ok) throw new Error("서버 응답 오류");
      const data: { sol: number } = await res.json();

      setPrevBalance((b) => (typeof b === "number" ? b : data.sol));
      setSolBalance(data.sol);
      setHistory((h) => {
        const next = [...h, data.sol];
        return next.slice(-24);
      });
      setLastUpdated(new Date());
      setError(null);
    } catch (e: any) {
      setError(e?.name === "AbortError" ? "요청 시간 초과" : e?.message || "오류" );
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    fetchBalance();
  }, []);

  useInterval(fetchBalance, POLL_MS);

  const trend = useMemo(() => {
    if (solBalance == null || prevBalance == null) return 0;
    const diff = solBalance - prevBalance;
    if (Math.abs(diff) < 0.00005) return 0; // ~0 change threshold
    return diff;
  }, [solBalance, prevBalance]);

  const statusText = useMemo(() => {
    if (isLoading) return "불러오는 중";
    if (error) return "오류";
    return "실시간";
  }, [isLoading, error]);

  const renderNumber = () => {
    if (isLoading)
      return (
        <div className="h-7 w-32 animate-pulse rounded-md bg-neutral-300/70 dark:bg-neutral-700/70" />
      );
    if (error)
      return (
        <div className="flex items-center gap-2 text-sm text-red-500">
          <svg viewBox="0 0 24 24" className="h-4 w-4" aria-hidden>
            <path fill="currentColor" d="M11 7h2v6h-2zm0 8h2v2h-2z" />
          </svg>
          {error}
        </div>
      );
    if (solBalance != null)
      return (
        <div className="flex items-baseline gap-2">
          <span className="text-2xl font-bold tracking-tight text-neutral-900 dark:text-neutral-100">
            {formatSol(solBalance)}
          </span>
          <span className="text-sm text-neutral-500 dark:text-neutral-400">SOL</span>
        </div>
      );
    return null;
  };

  return (
    <div className="fixed bottom-5 right-5 z-50">
      {/* gradient border wrapper */}
      <div className="rounded-2xl bg-gradient-to-br from-emerald-400/40 via-fuchsia-400/40 to-cyan-400/40 p-[1px] shadow-[0_10px_30px_-10px_rgba(0,0,0,0.35)]">
        <div className="flex w-[320px] max-w-[90vw] flex-col gap-3 rounded-2xl border border-white/30 bg-white/80 p-4 backdrop-blur-xl dark:border-white/10 dark:bg-neutral-900/70">
          {/* header */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="relative">
                {/* avatar circle */}
                <div className="grid h-8 w-8 place-items-center rounded-full bg-gradient-to-br from-neutral-900 to-neutral-700 text-white dark:from-emerald-500 dark:to-fuchsia-600">
                  {/* simple Solana‑style glyph */}
                  <svg viewBox="0 0 24 24" className="h-4 w-4" aria-hidden>
                    <path fill="currentColor" d="M7 6h12l-2 2H5zM7 11h12l-2 2H5zM7 16h12l-2 2H5z" />
                  </svg>
                </div>
                {/* live dot */}
                <span className="absolute -right-0.5 -top-0.5 inline-flex h-2.5 w-2.5 animate-pulse rounded-full bg-emerald-500 ring-2 ring-white dark:ring-neutral-900" />
              </div>
              <div>
                <div className="text-[13px] font-semibold text-neutral-800 dark:text-neutral-200">
                  봇 지갑 잔고
                </div>
                <div className="flex items-center gap-1 text-[11px] text-neutral-500 dark:text-neutral-400">
                  <span className="sr-only">상태</span>
                  <span>{statusText}</span>
                  {lastUpdated && !error && (
                    <>
                      <span aria-hidden>·</span>
                      <time dateTime={lastUpdated.toISOString()}>
                        {lastUpdated.toLocaleTimeString([], { hour12: false })}
                      </time>
                    </>
                  )}
                </div>
              </div>
            </div>

            <button
              type="button"
              onClick={fetchBalance}
              disabled={isRefreshing}
              aria-label="잔고 새로고침"
              className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-neutral-200 bg-white/70 text-neutral-700 shadow-sm transition active:scale-95 disabled:opacity-60 dark:border-neutral-700 dark:bg-neutral-800/80 dark:text-neutral-200"
              title="새로고침"
            >
              <svg
                viewBox="0 0 24 24"
                className={`h-4 w-4 ${isRefreshing ? "animate-spin" : ""}`}
                aria-hidden
              >
                <path
                  fill="currentColor"
                  d="M12 6V3L8 7l4 4V8a4 4 0 1 1-4 4H6a6 6 0 1 0 6-6z"
                />
              </svg>
            </button>
          </div>

          {/* number and trend */}
          <div className="flex items-end justify-between gap-4">
            {renderNumber()}
            {/* trend chip */}
            {trend !== 0 && !isLoading && !error && (
              <div
                className={`rounded-full px-2.5 py-1 text-xs font-medium tracking-tight ring-1 ring-inset ${
                  trend > 0
                    ? "bg-emerald-500/10 text-emerald-600 ring-emerald-500/30 dark:text-emerald-400"
                    : "bg-rose-500/10 text-rose-600 ring-rose-500/30 dark:text-rose-400"
                }`}
                aria-live="polite"
              >
                {trend > 0 ? "+" : ""}
                {formatSol(Math.abs(trend))}
              </div>
            )}
          </div>

          {/* sparkline */}
          <div className="relative h-10 w-full">
            <svg viewBox="0 0 140 36" className="h-10 w-full overflow-visible">
              <defs>
                <linearGradient id="grad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="currentColor" stopOpacity="0.4" />
                  <stop offset="100%" stopColor="currentColor" stopOpacity="0.0" />
                </linearGradient>
              </defs>
              {/* area fill */}
              {points && points.length > 0 && (
                <>
                  <path
                    d={`M 4 32 L ${points.replace(/ .*/, "")} ${points}
                      L 136 32 Z`}
                    className="translate-x-1 fill-current text-emerald-400/40 dark:text-emerald-400/30"
                  />
                  <polyline
                    points={points}
                    className="fill-none stroke-current text-emerald-600 dark:text-emerald-400"
                    strokeWidth="2"
                    strokeLinejoin="round"
                    strokeLinecap="round"
                  />
                </>
              )}
            </svg>
            {/* baseline */}
            <div className="pointer-events-none absolute inset-x-0 bottom-1 h-px bg-gradient-to-r from-transparent via-neutral-300/60 to-transparent dark:via-neutral-700/60" />
          </div>

          {/* footer help */}
          {error && (
            <div className="rounded-md border border-rose-500/30 bg-rose-500/10 p-2 text-xs text-rose-600 dark:text-rose-400">
              점검 후 다시 시도하세요.
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default SolBalanceWidget;
