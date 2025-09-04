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
  const attemptsRef = useRef<Record<string, number>>({});

  useEffect(() => {
    function toTradeRow(r: any): TradeRow {
      const priceSolPerC3C =
        Number(r?.price_sol_per_c3c) ||
        (Number(r?.price_c3c_per_sol) ? 1 / Number(r?.price_c3c_per_sol) : 0);
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

    const isComplete = (row: TradeRow) =>
      !!row.ts && !!row.wallet && !!row.side &&
      (Number(row.c3c_amount) !== 0 || Number(row.sol_amount) !== 0) &&
      Number(row.price_sol_per_c3c) > 0;

    const applyRow = (row: TradeRow) => {
      const sig = row.tx_signature;
      if (!sig) return;
      setTrades(prev => {
        const arr = prev.slice();
        const idx = arr.findIndex((x: any) => x?.tx_signature === sig);
        if (idx >= 0) { arr[idx] = row; return arr; }
        return [row, ...arr].slice(0, 500);
      });
      if (row.price_sol_per_c3c > 0) setLastPrice(row.price_sol_per_c3c);
    };

    async function fetchAndUpsertBySig(sig: string) {
      if (!sig) return;
      try {
        const { data } = await sb
          .from("trade_events")
          .select("ts,wallet,side,c3c_amount,sol_amount,price_c3c_per_sol,price_sol_per_c3c,tx_signature")
          .eq("tx_signature", sig)
          .limit(1)
          .maybeSingle();
        if (data) {
          const row = toTradeRow(data);
          if (isComplete(row)) applyRow(row);
        }
      } catch {}
    }

    function upsertFromPayload(p: any) {
      const r = p?.new ?? p?.record ?? p; if (!r) return;
      const sig: string = r?.tx_signature;
      const row = toTradeRow(r);
      if (isComplete(row)) {
        applyRow(row);
      } else {
        // Defer: try to fetch the finalized row shortly (INSERT?’UPDATE latency)
        const tries = (attemptsRef.current[sig] || 0) + 1;
        attemptsRef.current[sig] = tries;
        const delay = Math.min(1500, 250 * tries);
        window.setTimeout(() => fetchAndUpsertBySig(sig), delay);
        // Do not show an incomplete placeholder row
      }

      const priceSolPerC3C = Number(r?.price_sol_per_c3c) || (Number(r?.price_c3c_per_sol) ? 1 / Number(r?.price_c3c_per_sol) : 0);
      if (priceSolPerC3C > 0) setLastPrice(priceSolPerC3C);

      const now = Date.now();
      if (now - lastFetchRef.current > 10_000) {
        lastFetchRef.current = now;
        sb.from("whale_ranking").select("*").limit(200).then(({ data }) => data && setWhales(data));
      }
    }

    const ch = sb
      .channel("te_insert_tabs")
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "trade_events" }, upsertFromPayload)
      .on("postgres_changes", { event: "UPDATE", schema: "public", table: "trade_events" }, upsertFromPayload)
      .subscribe();

    return () => { sb.removeChannel(ch); };
  }, []);

  return (
    <>
      {/* ì¹´ë“œ/?¤ë”???¬í”Œ ?¤ë” */}
      <header className="masthead">
        <div className="mast-left">
          <span className="mast-icon" aria-hidden>
            {/* ê³„ê¸°???„ì´ì½?/}
            <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
              <path d="M12 4a8 8 0 0 0-8 8h2a6 6 0 1 1 12 0h2a8 8 0 0 0-8-8Zm-1 8a1 1 0 0 0 2 0l4-4-6 3a1 1 0 0 0 0 2Z"/>
            </svg>
          </span>
          <h2 className="h1">?€?œë³´??/h2>
          <span className="kicker kicker-violet">LIVE</span>
        </div>
        <div className="tabs">
          <button
            className={`tab ${tab === "rank" ? "tab-rank-active" : ""}`}
            onClick={() => setTab("rank")}
          >
            ê³ ëž˜ ?œìœ„
          </button>
          <button
            className={`tab ${tab === "trades" ? "tab-trade-active" : ""}`}
            onClick={() => setTab("trades")}
          >
            ìµœê·¼ ì²´ê²°
          </button>
        </div>
      </header>

      {/* ë³¸ë¬¸ */}
      {tab === "rank" ? (
        <WhaleTabs whales={whales} lastPriceSOLperC3C={lastPrice} />
      ) : (
        <RecentTradesView rows={trades} />
      )}
    </>
  );
}

