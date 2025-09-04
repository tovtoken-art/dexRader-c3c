"use client";

import React, { useState, useEffect, useMemo, useRef } from "react";

// Dual layout
// - Mobile: bottom ribbon full‑width
// - Desktop: floating card bottom‑right
// Unified style and single data source

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

// Sparkline points for desktop card
function useSparklinePoints(values: number[], width = 140, height = 36, pad = 4) {
  return useMemo(() => {
    if (!values.length) return "";
    const min = Math.min(...values);
    const max = Math.max(...values);
    const span = max - min || 1;
    const stepX = (width - pad * 2) / Math.max(values.length - 1, 1);
    const points = values.map((v, i) => {
      const x = pad + i * stepX;
      const y = pad + (1 - (v - min) / span) * (height - pad * 2);
      return `${x.toFixed(1)},${y.toFixed(1)}`;
    });
    return points.join(" ");
  }, [values, width, height, pad]);
}

const ChipInline: React.FC<{ label: string; value: number | null }> = ({ label, value }) => {
  if (value == null) return null;
  // Hide visually-zero changes that would round to 0.0000
  if (Math.abs(value) < 0.00005) return null;
  const sign = value > 0 ? "+" : value < 0 ? "-" : "±";
  const tone = value > 0 ? "text-emerald-600 dark:text-emerald-400" : value < 0 ? "text-rose-600 dark:text-rose-400" : "text-neutral-500 dark:text-neutral-400";
  return (
    <span className={`text-[10px] sm:text-xs ${tone}`}>{label} {sign}{formatSol(Math.abs(value))}</span>
  );
};

const ChipBadge: React.FC<{ value: number | null }> = ({ value }) => {
  if (value == null) return null;
  // Hide visually-zero changes that would round to 0.0000
  if (Math.abs(value) < 0.00005) return null;
  const sign = value > 0 ? "+" : value < 0 ? "-" : "±";
  const tone = value > 0 ? "emerald" : value < 0 ? "rose" : "neutral";
  const toneMap: Record<string, string> = {
    emerald: "bg-emerald-500/10 text-emerald-600 ring-emerald-500/30 dark:text-emerald-400",
    rose: "bg-rose-500/10 text-rose-600 ring-rose-500/30 dark:text-rose-400",
    neutral: "bg-neutral-500/10 text-neutral-600 ring-neutral-500/30 dark:text-neutral-300",
  };
  return (
    <span className={`rounded-full px-2.5 py-1 text-xs font-medium tracking-tight ring-1 ring-inset ${toneMap[tone]}`}>
      {sign}{formatSol(Math.abs(value))}
    </span>
  );
};

const SolBalanceWidget: React.FC = () => {
  const [solBalance, setSolBalance] = useState<number | null>(null);
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
      setSolBalance(data.sol);
      setHistory((h) => {
        const next = [...h, data.sol];
        return next.slice(-24);
      });
      setLastUpdated(new Date());
      setError(null);
    } catch (e: any) {
      setError(e?.name === "AbortError" ? "요청 시간 초과" : e?.message || "오류");
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    fetchBalance();
  }, []);

  useInterval(fetchBalance, POLL_MS);

  const { d1, d2 } = useMemo(() => {
    if (!history.length) return { d1: null as number | null, d2: null as number | null };
    const last = history[history.length - 1];
    const one = history[history.length - 2];
    const two = history[history.length - 3];
    const diff1 = one == null ? null : last - one; // 1 ago
    const diff2 = two == null ? null : last - two; // 2 ago
    return { d1: diff1, d2: diff2 };
  }, [history]);

  const StatusTime = (
    <span className="text-[10px] text-neutral-500 dark:text-neutral-400">
      {isLoading ? "불러오는 중" : error ? "오류" : lastUpdated ? lastUpdated.toLocaleTimeString([], { hour12: false }) : ""}
    </span>
  );

  // Desktop card view
  const DesktopCard = (
    <div className="hidden sm:block fixed bottom-5 right-5 z-50">
      <div className="rounded-2xl bg-gradient-to-br from-emerald-400/40 via-fuchsia-400/40 to-cyan-400/40 p-[1px] shadow-[0_10px_30px_-10px_rgba(0,0,0,0.35)]">
        <div className="flex w-[320px] max-w-[90vw] flex-col gap-3 rounded-2xl border border-white/30 bg-white/80 p-4 backdrop-blur-xl dark:border-white/10 dark:bg-neutral-900/70">
          {/* header */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="relative">
                <div className="grid h-8 w-8 place-items-center rounded-full bg-gradient-to-br from-neutral-900 to-neutral-700 text-white dark:from-emerald-500 dark:to-fuchsia-600">
                  <svg viewBox="0 0 24 24" className="h-4 w-4" aria-hidden>
                    <path fill="currentColor" d="M7 6h12l-2 2H5zM7 11h12l-2 2H5zM7 16h12l-2 2H5z" />
                  </svg>
                </div>
                <span className="absolute -right-0.5 -top-0.5 inline-flex h-2.5 w-2.5 animate-pulse rounded-full bg-emerald-500 ring-2 ring-white dark:ring-neutral-900" />
              </div>
              <div>
                <div className="text-[13px] font-semibold text-neutral-800 dark:text-neutral-200">봇 지갑 잔고</div>
                <div className="flex items-center gap-1 text-[11px] text-neutral-500 dark:text-neutral-400">{StatusTime}</div>
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
              <svg viewBox="0 0 24 24" className={`h-4 w-4 ${isRefreshing ? "animate-spin" : ""}`} aria-hidden>
                <path fill="currentColor" d="M12 6V3L8 7l4 4V8a4 4 0 1 1-4 4H6a6 6 0 1 0 6-6z" />
              </svg>
            </button>
          </div>
          {/* number + chips */}
          <div className="flex items-end justify-between gap-4">
            {isLoading ? (
              <div className="h-7 w-32 animate-pulse rounded-md bg-neutral-300/70 dark:bg-neutral-700/70" />
            ) : error ? (
              <div className="text-sm text-rose-600 dark:text-rose-400">{error}</div>
            ) : solBalance != null ? (
              <div className="flex items-baseline gap-2">
                <span className="text-2xl font-bold tracking-tight text-neutral-900 dark:text-neutral-100">{formatSol(solBalance)}</span>
                <span className="text-sm text-neutral-500 dark:text-neutral-400">SOL</span>
              </div>
            ) : null}
            {!isLoading && !error && (
              <div className="flex items-center gap-1.5">
                <ChipBadge value={d1} />
                <ChipBadge value={d2} />
              </div>
            )}
          </div>
          {/* sparkline */}
          <div className="relative h-10 w-full">
            <svg viewBox="0 0 140 36" className="h-10 w-full overflow-visible">
              {points && points.length > 0 && (
                <polyline
                  points={points}
                  className="fill-none stroke-current text-emerald-600 dark:text-emerald-400"
                  strokeWidth="2"
                  strokeLinejoin="round"
                  strokeLinecap="round"
                />
              )}
            </svg>
            <div className="pointer-events-none absolute inset-x-0 bottom-1 h-px bg-gradient-to-r from-transparent via-neutral-300/60 to-transparent dark:via-neutral-700/60" />
          </div>
          {error && (
            <div className="rounded-md border border-rose-500/30 bg-rose-500/10 p-2 text-xs text-rose-600 dark:text-rose-400">점검 후 다시 시도하세요</div>
          )}
        </div>
      </div>
    </div>
  );

  // Mobile ribbon view
  const MobileRibbon = (
    <div className="sm:hidden fixed inset-x-0 bottom-0 z-50 pointer-events-none" style={{ paddingBottom: "env(safe-area-inset-bottom, 0px)" }}>
      <div className="pointer-events-auto border-t border-white/30 bg-white/85 backdrop-blur-xl shadow-[0_-12px_30px_-16px_rgba(0,0,0,0.35)] dark:border-white/10 dark:bg-neutral-900/70">
        <div className="h-px w-full bg-gradient-to-r from-emerald-400/60 via-fuchsia-400/60 to-cyan-400/60" />
        <div className="mx-auto flex h-12 max-w-screen-2xl items-center justify-between gap-2 px-3">
          <div className="flex min-w-0 items-center gap-2">
            <div className="flex flex-col">
              <span className="text-[11px] font-semibold text-neutral-800 dark:text-neutral-200">봇 지갑 잔고</span>
              {StatusTime}
            </div>
          </div>
          <div className="min-w-0 flex-1 text-center">
            {isLoading ? (
              <div className="mx-auto h-5 w-28 animate-pulse rounded-md bg-neutral-300/70 dark:bg-neutral-700/70" />
            ) : error ? (
              <span className="text-[13px] text-rose-600 dark:text-rose-400">{error}</span>
            ) : solBalance != null ? (
              <div className="inline-flex items-baseline gap-1">
                <span className="text-lg font-bold tracking-tight text-neutral-900 dark:text-neutral-100">{formatSol(solBalance)}</span>
                <span className="text-xs text-neutral-500 dark:text-neutral-400">SOL</span>
              </div>
            ) : null}
          </div>
          <div className="flex min-w-0 items-center justify-end gap-2">
            {!isLoading && !error && (
              <div className="flex items-center gap-1">
                <ChipInline label="1tx" value={d1} />
                {/* <span className="text-[10px] text-neutral-400">·</span>
                <ChipInline label="2tx" value={d2} /> */}
              </div>
            )}
            <button
              type="button"
              onClick={fetchBalance}
              disabled={isRefreshing}
              aria-label="잔고 새로고침"
              className="inline-flex h-7 w-7 items-center justify-center rounded-full border border-neutral-200 bg-white/70 text-neutral-700 shadow-sm transition active:scale-95 disabled:opacity-60 dark:border-neutral-700 dark:bg-neutral-800/80 dark:text-neutral-200"
              title="새로고침"
            >
              <svg viewBox="0 0 24 24" className={`h-3.5 w-3.5 ${isRefreshing ? "animate-spin" : ""}`} aria-hidden>
                <path fill="currentColor" d="M12 6V3L8 7l4 4V8a 4 4 0 1 1-4 4H6a6 6 0 1 0 6-6z" />
              </svg>
            </button>
          </div>
        </div>
      </div>
    </div>
  );

  return (
    <>
      {DesktopCard}
      {MobileRibbon}
    </>
  );
};

export default SolBalanceWidget;
