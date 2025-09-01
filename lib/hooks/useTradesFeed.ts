"use client";

import { useEffect, useRef, useState } from "react";
import { supabase as sb } from "../supabase";
import { TradeRow } from "../types";
import { mapTradeRow } from "../mappers";

type Options = {
  initialRows?: TradeRow[];
  initialLastPrice?: number;
  limit?: number;
};

export function useTradesFeed(opts: Options = {}) {
  const { initialRows = [], initialLastPrice = 0, limit = 15 } = opts;
  const [rows, setRows] = useState<TradeRow[]>(initialRows);
  const [lastPrice, setLastPrice] = useState<number>(initialLastPrice || 0);

  const refreshTimerRef = useRef<number | null>(null);

  useEffect(() => {
    async function fetchLatestTrades() {
      try {
        const { data } = await sb
          .from("trade_events")
          .select("ts,wallet,side,c3c_amount,sol_amount,price_c3c_per_sol,price_sol_per_c3c,tx_signature")
          .order("ts", { ascending: false })
          .limit(limit);
        const mapped = (data ?? []).map(mapTradeRow);
        setRows(mapped);
        const p = mapped[0]?.price_sol_per_c3c;
        if (p > 0) setLastPrice(p);
      } catch {
        // ignore
      }
    }

    function schedule() {
      if (refreshTimerRef.current) window.clearTimeout(refreshTimerRef.current);
      refreshTimerRef.current = window.setTimeout(fetchLatestTrades, 250);
    }

    const ch = sb
      .channel("te_feed")
      .on("postgres_changes", { event: "*", schema: "public", table: "trade_events" }, schedule)
      .subscribe();

    // initial fetch if nothing provided
    if (!initialRows?.length) fetchLatestTrades();

    return () => {
      sb.removeChannel(ch);
      if (refreshTimerRef.current) window.clearTimeout(refreshTimerRef.current);
    };
  }, [limit]);

  return { rows, lastPrice } as const;
}

export default useTradesFeed;
