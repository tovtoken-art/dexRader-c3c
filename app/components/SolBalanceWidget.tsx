"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import { PublicKey } from "@solana/web3.js";
import { supabase as sb } from "../../lib/supabase";

const COOLDOWN_MS = 30_000;
const BAL_POLL_MS = 8_000;
const API_ENDPOINT = "/api/balance";
const DELTA_MIN = 0.000005;
const MAX_POINTS = 24;

const fmt = (n: number) =>
  new Intl.NumberFormat(undefined, { minimumFractionDigits: 6, maximumFractionDigits: 6 }).format(n);

const Chip = ({ v, inline, label }: { v: number | null; inline?: boolean; label?: string }) => {
  if (v == null) return null;
  const sign = v > 0 ? "+" : v < 0 ? "-" : "±";
  const abs = fmt(Math.abs(v));
  if (inline) {
    const tone =
      v > 0
        ? "text-emerald-600 dark:text-emerald-400"
        : v < 0
        ? "text-rose-600 dark:text-rose-400"
        : "text-neutral-500 dark:text-neutral-400";
    return (
      <span className={`text-[10px] sm:text-xs ${tone}`}>
        {label} {sign}
        {abs}
      </span>
    );
  }
  const tone =
    v > 0
      ? "bg-emerald-500/10 text-emerald-600 ring-emerald-500/30 dark:text-emerald-400"
      : v < 0
      ? "bg-rose-500/10 text-rose-600 ring-rose-500/30 dark:text-rose-400"
      : "bg-neutral-500/10 text-neutral-600 ring-neutral-500/30 dark:text-neutral-300";
  return (
    <span className={`rounded-full px-2.5 py-1 text-xs font-medium tracking-tight ring-1 ring-inset ${tone}`}>
      {sign}
      {abs}
    </span>
  );
};

const Ring = ({ size = 24, stroke = 3, p = 0 }) => {
  const r = (size - stroke) / 2;
  const C = 2 * Math.PI * r;
  const d = Math.max(0, Math.min(1, p)) * C;
  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="absolute -top-1 -right-1 pointer-events-none">
      <circle
        cx={size / 2}
        cy={size / 2}
        r={r}
        stroke="currentColor"
        strokeWidth={stroke}
        fill="none"
        className="text-neutral-300/60 dark:text-neutral-700/60"
      />
      <circle
        cx={size / 2}
        cy={size / 2}
        r={r}
        stroke="currentColor"
        strokeWidth={stroke}
        fill="none"
        strokeDasharray={`${d} ${C - d}`}
        strokeLinecap="round"
        transform={`rotate(-90 ${size / 2} ${size / 2})`}
        className="text-emerald-500 dark:text-emerald-400"
      />
    </svg>
  );
};

// ───────────────────────────────────────────────────────────────────────────────
// helpers
const approxEq = (a?: number | null, b?: number | null, eps = DELTA_MIN) =>
  a != null && b != null && Math.abs(a - b) < eps;

export default function SolBalanceWidget() {
  const [bal, setBal] = useState<number | null>(null);
  const [hist, setHist] = useState<number[]>([]);
  const [deltas, setDeltas] = useState<number[]>([]);
  const [err, setErr] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [touchedAt, setTouchedAt] = useState<Date | null>(null);
  const [spinning, setSpinning] = useState(false);

  const [wallet, setWallet] = useState<string | null>(null);
  const [label, setLabel] = useState("");

  const [nextAt, setNextAt] = useState(0);
  const [now, setNow] = useState(Date.now());
  const remain = Math.max(0, nextAt - now);
  const remainSec = Math.ceil(remain / 1000);
  const locked = remain > 0;
  const ringP = Math.min(1, (COOLDOWN_MS - remain) / COOLDOWN_MS);

  // refs for robust diff logic
  const lastBalRef = useRef<number | null>(null);      // 마지막으로 처리한 잔고
  const inflightRef = useRef(false);                   // 병렬 fetch 차단
  const pendingTradeSumRef = useRef(0);                // 최근 balance 처리 이후 누적된 트레이드 합(서명있는 이벤트 합)
  const lastTradeAt = useRef<number>(0);               // (정보용) 마지막 트레이드 시각

  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);

  const points = useMemo(() => {
    if (!hist.length) return "";
    const min = Math.min(...hist);
    const max = Math.max(...hist);
    const span = max - min || 1;
    const w = 140,
      h = 36,
      pad = 4;
    const stepX = (w - pad * 2) / Math.max(hist.length - 1, 1);
    return hist
      .map((v, i) => `${(pad + i * stepX).toFixed(1)},${(pad + (1 - (v - min) / span) * (h - pad * 2)).toFixed(1)}`)
      .join(" ");
  }, [hist]);

  // ── API: 잔고 읽기 (+중복/누적 방지)
  const fetchBalance = async () => {
    if (inflightRef.current) return lastBalRef.current;
    inflightRef.current = true;
    setSpinning(true);
    try {
      const ctrl = new AbortController();
      const tm = setTimeout(() => ctrl.abort(), 10_000);
      const url = wallet ? `${API_ENDPOINT}?addr=${encodeURIComponent(wallet)}` : API_ENDPOINT;
      const res = await fetch(url, { signal: ctrl.signal, cache: "no-store" });
      clearTimeout(tm);
      if (!res.ok) throw new Error("서버 응답 오류");
      const data: { sol: number; address?: string } = await res.json();

      // 기본 봇 주소 자동 설정
      if (!wallet && data?.address) setWallet(data.address);

      const prev = lastBalRef.current;
      const next = data.sol;

      // ⚠️ 먼저 ref를 갱신해 중복 diff를 원천 차단
      lastBalRef.current = next;

      // 상태 갱신
      setBal(next);
      setHist((h) => (h[h.length - 1] === next ? h : [...h, next].slice(-MAX_POINTS)));
      setTouchedAt(new Date());
      setErr(null);

      // 외부 입출금 등 "잔고 변화"를 이벤트화하되,
      // 직전 balance 이후 누적된 트레이드 합으로 설명 가능한 부분은 제거
      if (prev != null) {
        const diff = next - prev;                       // 관측된 전체 변화
        const explained = pendingTradeSumRef.current;   // 트레이드로 설명되는 합
        let residual = diff - explained;                // 남는 변화 = 입출금/기타
        // 미세 노이즈 컷
        if (Math.abs(residual) < DELTA_MIN) residual = 0;

        // 잔고 변화 칩에 반영(중복/동일값 연속 방지)
        if (residual !== 0) {
          setDeltas((prevD) => {
            const top = prevD?.[0];
            if (approxEq(top, residual)) return prevD;
            return [residual, ...(prevD || [])].slice(0, 2);
          });
        }

        // balance를 통해 반영 완료 → 보류 중 합계 초기화
        pendingTradeSumRef.current = 0;
      }

      return next;
    } catch (e: any) {
      setErr(e?.name === "AbortError" ? "요청 시간 초과" : e?.message || "오류");
    } finally {
      setLoading(false);
      setSpinning(false);
      inflightRef.current = false;
    }
    return lastBalRef.current;
  };

  // ── trade_events → 서명 있는 "단일 이벤트" 델타 산출
  const signedDelta = (row: any): number | null => {
    const s = Number(row?.sol_amount);
    if (!Number.isFinite(s) || Math.abs(s) < DELTA_MIN) return null;
    return row?.side === "BUY" ? -Math.abs(s) : +Math.abs(s);
  };

  // ── 초기 시드: 최근 거래 200건으로 deltas/hist 구성
  const seedFromTrades = async (w: string | null, baseBalance?: number | null) => {
    try {
      if (!w) return;
      const { data } = await sb
        .from("trade_events")
        .select("wallet,side,sol_amount")
        .eq("wallet", w)
        .order("ts", { ascending: false })
        .limit(200);

      const list = (data ?? []).map(signedDelta).filter((n): n is number => n != null);
      setDeltas(list.slice(0, 2));

      const current = baseBalance ?? bal ?? lastBalRef.current;
      if (current != null) {
        const balances: number[] = [current];
        for (const d of list) {
          const prev = balances[0] - d; // 과거로 역누적
          balances.unshift(prev);
          if (balances.length >= MAX_POINTS) break;
        }
        setHist(balances);
      }

      // 과거 이벤트는 잔고 반영이 이미 끝난 상태 → 보류 합계 클리어
      pendingTradeSumRef.current = 0;
    } catch {
      /* no-op */
    }
  };

  // 초기: 설정값 → 잔고 → 거래 시드
  useEffect(() => {
    (async () => {
      try {
        const { data } = await sb
          .from("app_settings")
          .select("value,updated_at")
          .eq("key", "balance_wallet")
          .maybeSingle();
        const v = (data as any)?.value as string | undefined;
        if (v) setWallet(v);
        const upd = (data as any)?.updated_at as string | undefined;
        if (upd) setNextAt(new Date(upd).getTime() + COOLDOWN_MS);
      } catch {
        const ls = localStorage.getItem("balance_wallet");
        if (ls) setWallet(ls);
      }
      const s = await fetchBalance();
      if (wallet) await seedFromTrades(wallet, s ?? undefined);
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // app_settings 실시간 반영
  useEffect(() => {
    const ch = sb
      .channel("app-settings-balance-wallet")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "app_settings", filter: "key=eq.balance_wallet" },
        (p: any) => {
          const v = p?.new?.value as string | undefined;
          const upd = p?.new?.updated_at as string | undefined;
          if (typeof v === "string") {
            setWallet(v.length ? v : null);
            try {
              v.length ? localStorage.setItem("balance_wallet", v) : localStorage.removeItem("balance_wallet");
            } catch {}
          }
          if (upd) setNextAt(new Date(upd).getTime() + COOLDOWN_MS);
        }
      )
      .subscribe();
    return () => {
      sb.removeChannel(ch);
    };
  }, []);

  // 라벨
  useEffect(() => {
    let cancel = false;
    if (!wallet) return setLabel("");
    (async () => {
      try {
        const { data } = await sb.from("wallet_labels").select("label").eq("wallet", wallet).maybeSingle();
        if (!cancel) setLabel(((data as any)?.label) || "");
      } catch {
        if (!cancel) setLabel("");
      }
    })();
    return () => {
      cancel = true;
    };
  }, [wallet]);

  // 지갑 변경 시 상태 리셋 후 재시드
  useEffect(() => {
    (async () => {
      if (!wallet) return;
      if (!loading) {
        setHist([]);
        setBal(null);
        setDeltas([]);
      }
      // 잔고 ref/보류합 초기화
      lastBalRef.current = null;
      pendingTradeSumRef.current = 0;

      const s = await fetchBalance();
      await seedFromTrades(wallet, s ?? undefined);
      lastTradeAt.current = 0;
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [wallet]);

  // 거래 실시간 구독 (지갑 필터 필수)
  useEffect(() => {
    if (!wallet) return;
    const ch = sb
      .channel(`trade-events-${wallet}`)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "trade_events", filter: `wallet=eq.${wallet}` },
        async (p: any) => {
          const d = signedDelta(p?.new);
          if (d != null) {
            lastTradeAt.current = Date.now();
            // 보류 합계에 누적(해당 이벤트는 balance 갱신 시 explained 처리)
            pendingTradeSumRef.current += d;

            // 칩엔 "이벤트 자체"를 즉시 반영 (중복 방지)
            setDeltas((prevD) => {
              const top = prevD?.[0];
              if (approxEq(top, d)) return prevD;
              return [d, ...(prevD || [])].slice(0, 2);
            });
          }
          await fetchBalance();
        }
      )
      .subscribe();
    return () => {
      sb.removeChannel(ch);
    };
  }, [wallet]);

  // 외부 변화 감지용 폴링(8초)
  useEffect(() => {
    const id = setInterval(() => {
      if (wallet) fetchBalance();
    }, BAL_POLL_MS);
    return () => clearInterval(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [wallet]);

  const onEdit = async () => {
    const cur = wallet || "";
    const val = (window.prompt("지갑 주소 입력 (빈칸: 봇 지갑)", cur) ?? cur).trim();
    if (val === "") {
      setWallet(null);
      try {
        const { error } = await sb.from("app_settings").upsert({ key: "balance_wallet", value: "" });
        if (error) throw error;
        setNextAt(Date.now() + COOLDOWN_MS);
      } catch {
        await refreshCooldown();
      }
      try {
        localStorage.removeItem("balance_wallet");
      } catch {}
      return;
    }
    try {
      const addr = new PublicKey(val).toBase58();
      setWallet(addr);
      try {
        const { error } = await sb.from("app_settings").upsert({ key: "balance_wallet", value: addr });
        if (error) throw error;
        setNextAt(Date.now() + COOLDOWN_MS);
      } catch {
        await refreshCooldown();
        alert("30초 쿨다운 중입니다.");
      }
      try {
        localStorage.setItem("balance_wallet", addr);
      } catch {}
    } catch {
      alert("유효한 Solana 지갑 주소가 아닙니다.");
    }
  };

  const refreshCooldown = async () => {
    try {
      const { data } = await sb.from("app_settings").select("updated_at").eq("key", "balance_wallet").maybeSingle();
      const upd = (data as any)?.updated_at as string | undefined;
      if (upd) setNextAt(new Date(upd).getTime() + COOLDOWN_MS);
    } catch {}
  };

  const StatusTime = (
    <span className="text-[10px] text-neutral-500 dark:text-neutral-400">
      {loading ? "불러오는 중" : err ? "오류" : touchedAt ? touchedAt.toLocaleTimeString([], { hour12: false }) : ""}
    </span>
  );

  const Desktop = (
    <div className="hidden sm:block fixed bottom-5 right-5 z-50">
      <div className="rounded-2xl bg-gradient-to-br from-emerald-400/40 via-fuchsia-400/40 to-cyan-400/40 p-[1px] shadow-[0_10px_30px_-10px_rgba(0,0,0,0.35)]">
        <div className="flex w-[320px] max-w-[90vw] flex-col gap-3 rounded-2xl border border-white/30 bg-white/80 p-4 backdrop-blur-xl dark:border-white/10 dark:bg-neutral-900/70">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="relative">
                <div className="grid h-8 w-8 place-items-center rounded-full bg-gradient-to-br from-neutral-900 to-neutral-700 text-white dark:from-emerald-500 dark:to-fuchsia-600">
                  <svg viewBox="0 0 24 24" className="h-4 w-4">
                    <path fill="currentColor" d="M7 6h12l-2 2H5zM7 11h12l-2 2H5zM7 16h12l-2 2H5z" />
                  </svg>
                </div>
                <span className="absolute -right-0.5 -top-0.5 inline-flex h-2.5 w-2.5 animate-pulse rounded-full bg-emerald-500 ring-2 ring-white dark:ring-neutral-900" />
              </div>
              <div>
                <div className="text-[13px] font-semibold text-neutral-800 dark:text-neutral-200">
                  지갑 잔고 추적{label ? ` · ${label}` : ""}
                </div>
                <div className="flex items-center gap-1 text-[11px] text-neutral-500 dark:text-neutral-400">{StatusTime}</div>
              </div>
            </div>
            <div className="relative">
              {locked && <Ring p={ringP} />}
              <button
                type="button"
                onClick={onEdit}
                disabled={locked}
                aria-label="지갑 주소 설정"
                className="relative inline-flex h-8 w-8 items-center justify-center rounded-full text-neutral-600 hover:text-neutral-900 disabled:opacity-60 dark:text-neutral-300 dark:hover:text-white"
                title={locked ? `${remainSec}s 후 변경 가능` : "지갑 주소 설정"}
              >
                <svg viewBox="0 0 24 24" className="h-4 w-4">
                  <path fill="currentColor" d="M3 17.2V21h3.8l11-11.1-3.8-3.8L3 17.2Zm17.7-10.1c.4-.4.4-1 0-1.4l-2.4-2.4a1 1 0 0 0-1.4 0l-1.9 1.9 3.8 3.8 1.9-1.9Z" />
                </svg>
              </button>
            </div>
          </div>

          <div className="flex items-end justify-between gap-4">
            {loading ? (
              <div className="h-7 w-32 animate-pulse rounded-md bg-neutral-300/70 dark:bg-neutral-700/70" />
            ) : err ? (
              <div className="text-sm text-rose-600 dark:text-rose-400">{err}</div>
            ) : bal != null ? (
              <div className="flex items-baseline gap-2">
                <span className="text-2xl font-bold tracking-tight text-neutral-900 dark:text-neutral-100">{fmt(bal)}</span>
                <span className="text-sm text-neutral-500 dark:text-neutral-400">SOL</span>
              </div>
            ) : null}
            {!loading && !err && (
              <div className="flex items-center gap-1.5">
                <Chip v={deltas[0] ?? null} />
                <Chip v={deltas[1] ?? null} />
              </div>
            )}
          </div>

          <div className="relative h-10 w-full">
            <svg viewBox="0 0 140 36" className="h-10 w-full overflow-visible">
              {points && (
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

          {err && (
            <div className="rounded-md border border-rose-500/30 bg-rose-500/10 p-2 text-xs text-rose-600 dark:text-rose-400">
              점검 후 다시 시도하세요
            </div>
          )}
        </div>
      </div>
    </div>
  );

  const Mobile = (
    <div
      className="sm:hidden fixed inset-x-0 bottom-0 z-50 pointer-events-none"
      style={{ paddingBottom: "env(safe-area-inset-bottom, 0px)" }}
    >
      <div className="pointer-events-auto border-t border-white/30 bg-white/85 backdrop-blur-xl shadow-[0_-12px_30px_-16px_rgba(0,0,0,0.35)] dark:border-white/10 dark:bg-neutral-900/70">
        <div className="h-px w-full bg-gradient-to-r from-emerald-400/60 via-fuchsia-400/60 to-cyan-400/60" />
        <div className="mx-auto flex h-12 max-w-screen-2xl items-center justify-between gap-2 px-3">
          <div className="flex min-w-0 items-center gap-2">
            <div className="flex flex-col">
              <span className="text-[11px] font-semibold text-neutral-800 dark:text-neutral-200">
                지갑 잔고 추적{label ? ` · ${label}` : ""}
              </span>
              <span className="text-[10px] text-neutral-500 dark:text-neutral-400">
                {loading ? "불러오는 중" : err ? "오류" : touchedAt ? touchedAt.toLocaleTimeString([], { hour12: false }) : ""}
              </span>
            </div>
          </div>

          <div className="min-w-0 flex-1 text-center">
            {loading ? (
              <div className="mx-auto h-5 w-28 animate-pulse rounded-md bg-neutral-300/70 dark:bg-neutral-700/70" />
            ) : err ? (
              <span className="text-[13px] text-rose-600 dark:text-rose-400">{err}</span>
            ) : bal != null ? (
              <div className="inline-flex items-baseline gap-1">
                <span className="text-lg font-bold tracking-tight text-neutral-900 dark:text-neutral-100">{fmt(bal)}</span>
                <span className="text-xs text-neutral-500 dark:text-neutral-400">SOL</span>
              </div>
            ) : null}
          </div>

          <div className="flex min-w-0 items-center justify-end gap-2">
            {!loading && !err && <Chip v={deltas[0] ?? null} inline label="" />}
            <div className="relative">
              {locked && <Ring size={22} stroke={2.5} p={ringP} />}
              <button
                type="button"
                onClick={onEdit}
                disabled={locked}
                aria-label="지갑 주소 설정"
                className="inline-flex h-7 w-7 items-center justify-center rounded-full text-neutral-600 hover:text-neutral-900 disabled:opacity-60 dark:text-neutral-300 dark:hover:text-white"
                title={locked ? `${remainSec}s 후 변경 가능` : "지갑 주소 설정"}
              >
                <svg viewBox="0 0 24 24" className="h-3.5 w-3.5">
                  <path fill="currentColor" d="M3 17.2V21h3.8l11-11.1-3.8-3.8L3 17.2Zm17.7-10.1c.4-.4.4-1 0-1.4l-2.4-2.4a1 1 0 0 0-1.4 0l-1.9 1.9 3.8 3.8 1.9-1.9Z" />
                </svg>
              </button>
            </div>
            <button
              type="button"
              onClick={fetchBalance}
              disabled={spinning}
              aria-label="잔고 새로고침"
              className="inline-flex h-7 w-7 items-center justify-center rounded-full border border-neutral-200 bg-white/70 text-neutral-700 shadow-sm transition active:scale-95 disabled:opacity-60 dark:border-neutral-700 dark:bg-neutral-800/80 dark:text-neutral-200"
              title="새로고침"
            >
              <svg viewBox="0 0 24 24" className={`h-3.5 w-3.5 ${spinning ? "animate-spin" : ""}`}>
                <path fill="currentColor" d="M12 6V3L8 7l4 4V8a4 4 0 1 1-4 4H6a6 6 0 1 0 6-6z" />
              </svg>
            </button>
          </div>
        </div>
      </div>
    </div>
  );

  return (
    <>
      {Desktop}
      {Mobile}
    </>
  );
}
