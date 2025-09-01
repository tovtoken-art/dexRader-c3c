"use client";

import { useState } from "react";
import WhaleTabs from "./WhaleTabs";
import RecentTradesView from "./RecentTradesView";
import { TradeRow } from "../lib/types";
import { useTradesFeed } from "../lib/hooks/useTradesFeed";

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
  const [whales] = useState<any[]>(whalesInit || []);
  const { rows: trades, lastPrice } = useTradesFeed({ initialRows: tradesInit, initialLastPrice: lastPriceInitSOLperC3C, limit: 15 });

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
