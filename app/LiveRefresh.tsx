"use client";

import { useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { supabase as sb } from "../lib/supabase";

export default function LiveRefresh() {
  const router = useRouter();
  const lastRefresh = useRef(0);
  const scheduled = useRef<number | null>(null);
  const hasPending = useRef(false);

  function refreshIfVisible() {
    if (document.hidden) return;                  // 보고 있을 때만
    const now = Date.now();
    if (now - lastRefresh.current < 15000) return; // 15초 쿨다운
    lastRefresh.current = now;
    router.refresh();                              // 서버컴포넌트 재실행(고래 랭킹 최신화)
  }

  function scheduleRefresh() {
    hasPending.current = true;
    if (scheduled.current != null) return;
    scheduled.current = window.setTimeout(() => {
      scheduled.current = null;
      if (hasPending.current) {
        hasPending.current = false;
        refreshIfVisible();
      }
    }, 8000); // 8초 모아서 한 번에
  }

  useEffect(() => {
    // 새 거래 INSERT 구독
    const ch = sb
      .channel("te_insert_refresh")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "trade_events" },
        () => scheduleRefresh()
      )
      .subscribe();

    // 탭이 다시 보이면 바로 반영
    const onVis = () => {
      if (!document.hidden && hasPending.current) {
        hasPending.current = false;
        refreshIfVisible();
      }
    };
    // 포커스 가져오면 한 번 새로고침
    const onFocus = () => refreshIfVisible();

    document.addEventListener("visibilitychange", onVis);
    window.addEventListener("focus", onFocus);

    return () => {
      sb.removeChannel(ch);
      document.removeEventListener("visibilitychange", onVis);
      window.removeEventListener("focus", onFocus);
      if (scheduled.current != null) clearTimeout(scheduled.current);
    };
  }, []);

  return null;
}
