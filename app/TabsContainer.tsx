"use client";

import { useEffect, useRef, useState } from "react";
import { supabase as sb } from "../lib/supabase";
import WhaleTabs from "./WhaleTabs";
import RecentTradesView from "./RecentTradesView";

export type TradeRow = {
  ts: string; // ISO string
  wallet: string;
  side: "BUY" | "SELL";
  c3c_amount: number;
  sol_amount: number;
  price_sol_per_c3c: number;
  tx_signature: string;
  _loading?: boolean;
  _createdAt?: number;
};

export default function TabsContainer({
  whalesInit,
  tradesInit,
  lastPriceInitSOLperC3C,
}: {
  whalesInit: any[];
  tradesInit: TradeRow[];
  lastPriceInitSOLperC3C: number;
}) {
  const [tab, setTab] = useState<"rank" | "trades">("rank");
  const [whales, setWhales] = useState<any[]>(whalesInit || []);
  const [trades, setTrades] = useState<TradeRow[]>(tradesInit || []);
  const [lastPrice, setLastPrice] = useState<number>(lastPriceInitSOLperC3C || 0);
  const lastFetchRef = useRef<number>(0);
  const refreshTimerRef = useRef<number | null>(null);

  useEffect(() => {
    function mapRow(r: any): TradeRow {
      const priceSolPerC3C = Number(r?.price_sol_per_c3c) || (Number(r?.price_c3c_per_sol) ? 1 / Number(r?.price_c3c_per_sol) : 0);
      return {
        ts: r?.ts || "",
        wallet: r?.wallet || "",
        side: (r?.side === "BUY" ? "BUY" : "SELL") as "BUY" | "SELL",
        c3c_amount: Number(r?.c3c_amount ?? 0),
        sol_amount: Number(r?.sol_amount ?? 0),
        price_sol_per_c3c: Number(priceSolPerC3C || 0),
        tx_signature: r?.tx_signature || "",
      };
    }

    async function fetchLatestTrades() {
      try {
        const { data } = await sb
          .from("trade_events")
          .select("ts,wallet,side,c3c_amount,sol_amount,price_c3c_per_sol,price_sol_per_c3c,tx_signature")
          .order("ts", { ascending: false })
          .limit(15);
        const rows = (data ?? []).map(mapRow);
        setTrades(rows);
        const p = rows[0]?.price_sol_per_c3c;
        if (p > 0) setLastPrice(p);
      } catch {}
    }

    function schedule() {
      if (refreshTimerRef.current) window.clearTimeout(refreshTimerRef.current);
      refreshTimerRef.current = window.setTimeout(fetchLatestTrades, 250);
    }

    const ch = sb
      .channel("te_insert_tabs")
      .on("postgres_changes", { event: "*", schema: "public", table: "trade_events" }, schedule)
      .subscribe();

    return () => { sb.removeChannel(ch); if (refreshTimerRef.current) window.clearTimeout(refreshTimerRef.current); };
  }, []);

  return (
    <>
      {/* 카드/헤더는 심플 헤더 */}
      <header className="masthead">
        <div className="mast-left">
          <span className="mast-icon" aria-hidden>
            {/* 계기판 아이콘*/}
            <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
              <path d="M12 4a8 8 0 0 0-8 8h2a6 6 0 1 1 12 0h2a8 8 0 0 0-8-8Zm-1 8a1 1 0 0 0 2 0l4-4-6 3a1 1 0 0 0 0 2Z"/>
            </svg>
          </span>
          <h2 className="h1">대시보드</h2>
          <span className="kicker kicker-violet">LIVE</span>
        </div>
        <div className="tabs">
          <button
            className={`tab ${tab === "rank" ? "tab-rank-active" : ""}`}
            onClick={() => setTab("rank")}
          >
            고래 순위
          </button>
          <button
            className={`tab ${tab === "trades" ? "tab-trade-active" : ""}`}
            onClick={() => setTab("trades")}
          >
            최근 체결
          </button>
        </div>
      </header>

      {/* 본문 */}
      {tab === "rank" ? (
        <WhaleTabs whales={whales} lastPriceSOLperC3C={lastPrice} />
      ) : (
        <RecentTradesView rows={trades} />
      )}
    </>
  );
}
