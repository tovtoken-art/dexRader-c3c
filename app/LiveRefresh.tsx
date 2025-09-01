"use client";

import { useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { supabase as sb } from "../lib/supabase";

export default function LiveRefresh() {
  const router = useRouter();

  const lastRefresh = useRef(0);
  const lastSeenTs = useRef<number>(0);

  const COOLDOWN_MS = 15_000;   // 최소 15초 간격
  const POLL_MS = 20_000;       // 보는 동안 20초마다 1회

  const visible = () => !document.hidden;
  const now = () => Date.now();

  function doRefresh(reason: string) {
    if (!visible()) return;
    const t = now();
    if (t - lastRefresh.current < COOLDOWN_MS) return;
    lastRefresh.current = t;
    // console.debug("refresh:", reason, new Date().toISOString());
    router.refresh(); // 서버 컴포넌트 재실행(랭킹·PnL·최신가 갱신)
  }

  useEffect(() => {
    // 최초 최신 ts 기억
    (async () => {
      const { data } = await sb
        .from("trade_events")
        .select("ts")
        .order("ts", { ascending: false })
        .limit(1);
      if (data?.[0]?.ts) lastSeenTs.current = new Date(data[0].ts).getTime();
    })();

    // 1) trade_events: INSERT+UPDATE 모두 구독 (UPSERT 대비)
    const ch1 = sb
      .channel("live_refresh_trade_events")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "trade_events" },
        (payload) => {
          const ts = (payload as any)?.new?.ts || (payload as any)?.record?.ts;
          if (ts) lastSeenTs.current = Math.max(lastSeenTs.current, new Date(ts).getTime());
          doRefresh("realtime:trade_events");
        }
      )
      .subscribe();

    // 2) whale_stats도 변하면 새로고침 (배치 업데이트 대비)
    const ch2 = sb
      .channel("live_refresh_whale_stats")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "whale_stats" },
        () => doRefresh("realtime:whale_stats")
      )
      .subscribe();

    // 3) 폴백: 보는 동안만 20초마다 최신 ts 확인
    const pollId = window.setInterval(async () => {
      if (!visible()) return;
      try {
        const { data } = await sb
          .from("trade_events")
          .select("ts")
          .order("ts", { ascending: false })
          .limit(1);
        const ts = data?.[0]?.ts ? new Date(data[0].ts).getTime() : 0;
        if (ts && ts > lastSeenTs.current) {
          lastSeenTs.current = ts;
          doRefresh("poll");
        }
      } catch { /* 무시 */ }
    }, POLL_MS);

    // 탭 다시 보이거나 포커스 오면 즉시 반영 시도
    const onVis = () => { if (visible()) doRefresh("visibility"); };
    const onFocus = () => doRefresh("focus");
    document.addEventListener("visibilitychange", onVis);
    window.addEventListener("focus", onFocus);

    return () => {
      sb.removeChannel(ch1);
      sb.removeChannel(ch2);
      clearInterval(pollId);
      document.removeEventListener("visibilitychange", onVis);
      window.removeEventListener("focus", onFocus);
    };
  }, []);

  return null;
}