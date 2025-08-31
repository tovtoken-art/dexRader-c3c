"use client";

import { useEffect, useRef, useState } from "react";
import { supabase as sb } from "../lib/supabase";
import WhaleTabs from "./WhaleTabs";
import RecentTradesView from "./RecentTradesView";

export type TradeRow = {
  시각: string;
  지갑: string;
  매수_매도: "매수" | "매도";
  C3C_수량: number;
  SOL_수량: number;
  가격_SOL_per_C3C: number;
  트랜잭션: string;
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

  useEffect(() => {
    const ch = sb
      .channel("te_insert_tabs")
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "trade_events" }, (p: any) => {
        const r = p?.new; if (!r) return;
        const priceSolPerC3C =
          Number(r.price_sol_per_c3c) ||
          (Number(r.price_c3c_per_sol) ? 1 / Number(r.price_c3c_per_sol) : 0);

        const row: TradeRow = {
          시각: r.ts,
          지갑: r.wallet,
          매수_매도: r.side === "BUY" ? "매수" : "매도",
          C3C_수량: r.c3c_amount,
          SOL_수량: r.sol_amount,
          가격_SOL_per_C3C: priceSolPerC3C,
          트랜잭션: r.tx_signature,
        };
        setTrades(prev => [row, ...prev].slice(0, 15));
        if (priceSolPerC3C > 0) setLastPrice(priceSolPerC3C);

        const now = Date.now();
        if (now - lastFetchRef.current > 10_000) {
          lastFetchRef.current = now;
          sb.from("whale_ranking").select("*").limit(200).then(({ data }) => data && setWhales(data));
        }
      })
      .subscribe();

    return () => { sb.removeChannel(ch); };
  }, []);

  return (
    <>
      {/* 카드/테두리 없는 심플 헤더 */}
      <header className="masthead">
        <div className="mast-left">
          <span className="mast-icon" aria-hidden>
            {/* 계기판 아이콘 */}
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

      {/* 탭 내용 */}
      {tab === "rank" ? (
        <WhaleTabs whales={whales} lastPriceSOLperC3C={lastPrice} />
      ) : (
        <RecentTradesView rows={trades} />
      )}
    </>
  );
}
